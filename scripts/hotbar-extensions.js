/**
 * Multiverse-D616 (Foundry VTT v14)
 * Hotbar improvements:
 *  - Show MMHT tooltips on hotbar item macros (Powers / Traits / Tags).
 *  - Allow dragging Abilities (Melee, Agility, Resilience, Vigilance, Ego, Logic) to the hotbar.
 */

const SYSTEM_ID = "multiverse-d616";
const ABILITY_LABELS = {
  mle: "Melee",
  agl: "Agility",
  res: "Resilience",
  vig: "Vigilance",
  ego: "Ego",
  log: "Logic",
};

function upFirst(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function extractItemUuidFromMacro(macro) {
  if (!macro) return null;

  // Prefer a proper module flag (new macros).
  const flagUuid = macro.getFlag?.(SYSTEM_ID, "itemUuid") ?? macro.flags?.[SYSTEM_ID]?.itemUuid;
  if (typeof flagUuid === "string" && flagUuid.length) return flagUuid;

  // Back-compat: parse the command (old macros).
  const cmd = String(macro.command || "");
  const m = cmd.match(/rollItemMacro\((?:"|')(.+?)(?:"|')\)/);
  return m?.[1] ?? null;
}

async function loadItemFromUuid(uuid) {
  if (!uuid) return null;
  try {
    // Item.fromDropData is resilient for embedded items (Actor/Token).
    return await Item.fromDropData({ type: "Item", uuid });
  } catch (_e) {
    try {
      return await fromUuid(uuid);
    } catch (_e2) {
      return null;
    }
  }
}

function getItemTooltipData(item) {
  if (!item) return null;

  const sys = item.system ?? {};
  const type = upFirst(item.type || "Item");
  const title = item.name ?? "";

  const cost = sys?.cost?.value ?? sys?.cost ?? "";
  const range = sys?.range ?? sys?.distance ?? "";
  const action = sys?.action ?? sys?.activation ?? "";
  const trigger = sys?.trigger ?? "";
  const duration = sys?.duration ?? "";
  const desc = sys?.description ?? sys?.desc ?? sys?.details ?? "";
  const effect = sys?.effect ?? sys?.effects ?? "";

  return { type, title, cost, range, action, trigger, duration, desc, effect };
}

function applyMmhtDataset(el, data) {
  if (!el || !data) return;

  el.dataset.mmhtType = data.type;
  el.dataset.mmhtTitle = data.title;

  if (data.cost) el.dataset.mmhtCost = String(data.cost);
  if (data.range) el.dataset.mmhtRange = String(data.range);
  if (data.action) el.dataset.mmhtAction = String(data.action);
  if (data.trigger) el.dataset.mmhtTrigger = String(data.trigger);
  if (data.duration) el.dataset.mmhtDuration = String(data.duration);
  if (data.desc) el.dataset.mmhtDesc = String(data.desc);

  // effect can be object or string
  if (data.effect)
    el.dataset.mmhtEffect =
      typeof data.effect === "string" ? data.effect : JSON.stringify(data.effect);

  // Avoid a double tooltip (Foundry's default + MMHT)
  el.removeAttribute("data-tooltip");
  el.removeAttribute("title");
}

async function resolveActorFromUuid(uuid) {
  if (!uuid) return null;
  const doc = await fromUuid(uuid);
  if (!doc) return null;

  // TokenDocument / Token
  if (doc?.actor instanceof Actor) return doc.actor;

  // Actor
  if (doc instanceof Actor) return doc;

  return null;
}

async function rollAbilityMacro(actorUuid, abilityKey, mode = "value") {
  const actor = await resolveActorFromUuid(actorUuid);
  if (!actor) {
    return ui.notifications.warn(
      "Could not find the actor for this macro. You may need to delete and recreate it."
    );
  }

  // Safety: don't allow rolls if the user isn't at least an OWNER.
  // (Prevents bypassing OBSERVER restrictions.)
  const hasOwner = actor.testUserPermission?.(game.user, "OWNER");
  if (!hasOwner && !game.user.isGM) {
    return ui.notifications.warn(
      game.i18n?.localize?.("MULTIVERSE_D616.PermissionDenied") ||
        "You do not have permission to perform this action."
    );
  }

  const key = String(abilityKey || "").toLowerCase();
  if (!ABILITY_LABELS[key]) {
    return ui.notifications.warn(
      `Unknown ability '${abilityKey}'. You may need to delete and recreate this macro.`
    );
  }

  const safeMode = mode === "noncom" ? "noncom" : "value";
  const formula = `{1d6,1dm,1d6}+@abilities.${key}.${safeMode}`;
  const label = ABILITY_LABELS[key];

  const speaker = ChatMessage.getSpeaker({ actor });
  const messageMode = game.settings.get("core", "messageMode");

  const roll = new CONFIG.Dice.MarvelMultiverseRoll(formula, actor.getRollData());
  await roll.toMessage(
    {
      speaker,
      flavor: `ability: ${label}`,
      title: safeMode === "noncom" ? `${label} (Non-Combat)` : label,
    },
    { messageMode }
  );

  return roll;
}

async function createAbilityMacro(data, slot) {
  if (!data || data.type !== "MMAbility") return;

  const actorUuid = String(data.actorUuid || "");
  const abilityKey = String(data.abilityKey || "").toLowerCase();
  const mode = data.mode === "noncom" ? "noncom" : "value";

  if (!actorUuid || !ABILITY_LABELS[abilityKey]) return;

  const name = mode === "noncom" ? `${ABILITY_LABELS[abilityKey]} (Non-Combat)` : ABILITY_LABELS[abilityKey];
  const command = `game.MarvelMultiverse.rollAbilityMacro("${actorUuid}", "${abilityKey}", "${mode}");`;

  const img =
    abilityKey === "mle"
      ? "systems/multiverse-d616/icons/melee.svg"
      : "systems/multiverse-d616/icons/d6-white.svg";

  let macro = game.macros.find((m) => m.name === name && m.command === command);
  if (!macro) {
    macro = await Macro.create({
      name,
      type: "script",
      img,
      command,
      flags: {
        [SYSTEM_ID]: {
          abilityMacro: true,
          actorUuid,
          abilityKey,
          mode,
        },
      },
    });
  }

  game.user.assignHotbarMacro(macro, slot);

  // Ensure MMHT tooltips are applied to the newly assigned hotbar slot
  setTimeout(() => {
    try {
      if (ui?.hotbar?.element) patchHotbarTooltips(ui.hotbar, ui.hotbar.element);
    } catch (_e) { /* ignore */ }
  }, 50);
  return false;
}

function enableAbilityDrag(app, html) {
  // Only on editable sheets (owners). Observers shouldn't be able to create roll macros.
  const isEditable = !!(app?.isEditable ?? app?.options?.editable);
  if (!isEditable) return;

  const root = html?.[0] ?? html;
  if (!root?.querySelectorAll) return;

  const abilityEls = root.querySelectorAll(".mm-ability-name.rollable");
  for (const el of abilityEls) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.dataset.mmAbilityDragReady === "1") continue;

    // Parse ability key from its roll formula.
    const formula = el.dataset.formula || "";
    const m = String(formula).match(/@abilities\.([a-z]{3})\./i);
    const abilityKey = (m?.[1] || "").toLowerCase();
    if (!ABILITY_LABELS[abilityKey]) continue;

    el.dataset.mmAbilityDragReady = "1";
    el.setAttribute("draggable", "true");

    el.addEventListener(
      "dragstart",
      (ev) => {
        try {
          const actorUuid = app?.actor?.uuid;
          if (!actorUuid) return;

          const payload = {
            type: "MMAbility",
            actorUuid,
            abilityKey,
            mode: "value",
          };

          ev.dataTransfer?.setData("text/plain", JSON.stringify(payload));
          ev.dataTransfer?.setData("application/json", JSON.stringify(payload));
        } catch (_e) {
          // ignore
        }
      },
      { passive: true }
    );
  }
}

function patchHotbarTooltips(app, html) {
  const root = html?.[0] ?? html;
  if (!root?.querySelectorAll) return;

  // NOTE (Foundry v13): the element that stores data-macro-id has changed across
  // builds/modules. The most stable identifier is the SLOT number, which exists
  // for every macro button.
  const hotbarMap = game.user?.hotbar ?? {};
  const entries = Object.entries(hotbarMap);
  if (!entries.length) return;

  // Cache item lookups per UUID to avoid repeated fromUuid calls.
  const cache = new Map(); // uuid -> tooltipData|null

  const findSlotRoot = (slot) => {
    // Most common: <li class="macro" data-slot="1"> ...
    const sel = `[data-slot="${slot}"]`;
    let el = root.querySelector(sel);
    if (!el) el = document.querySelector(`#hotbar ${sel}`);
    return el instanceof HTMLElement ? el : null;
  };

  const applyToSlotAndIcon = (slotEl, data) => {
    if (!slotEl || !data) return;

    // Apply to the slot container and the icon itself (different builds attach
    // hover listeners on different children).
    const targets = [slotEl];
    const icon = slotEl.querySelector(".macro-icon, img, a, button");
    if (icon instanceof HTMLElement) targets.push(icon);

    for (const t of targets) {
      applyMmhtDataset(t, data);
      t.classList.add("mmht-hotbar");
    }
  };

  (async () => {
    let patched = 0;
    for (const [slot, macroId] of entries) {
      try {
        if (!macroId) continue;

        const slotEl = findSlotRoot(slot);
        if (!slotEl) continue;

        const macro = game.macros?.get?.(macroId);
        if (!macro) continue;

        const itemUuid = extractItemUuidFromMacro(macro);
        if (!itemUuid) continue;

        let data = cache.get(itemUuid);
        if (data === undefined) {
          const item = await loadItemFromUuid(itemUuid);
          data = item ? getItemTooltipData(item) : null;
          cache.set(itemUuid, data);
        }
        if (!data) continue;

        applyToSlotAndIcon(slotEl, data);
        patched++;
      } catch (e) {
        console.warn("[multiverse-d616] Hotbar tooltip patch failed", e);
      }
    }
    if (patched) console.debug?.(`[multiverse-d616] Hotbar tooltips patched: ${patched}`);
  })();
}

Hooks.on("renderActorSheet", (app, html) => {
  try {
    enableAbilityDrag(app, html);
  } catch (_e) {
    // ignore
  }
});


// Enable hotbar drop for abilities
Hooks.on("hotbarDrop", (bar, data, slot) => {
  if (data?.type !== "MMAbility") return;
  void createAbilityMacro(data, slot);
  return false;
});


// Re-apply MMHT tooltips shortly after any hotbar drop that may assign/update a macro
Hooks.on("hotbarDrop", (bar, data, slot) => {
  const t = data?.type;
  if (t !== "Item" && t !== "MMAbility") return;
  setTimeout(() => {
    try {
      if (ui?.hotbar?.element) patchHotbarTooltips(ui.hotbar, ui.hotbar.element);
    } catch (_e) { /* ignore */ }
  }, 150);
});

// Add MMHT dataset to hotbar item macros (powers / traits / tags)
Hooks.on("renderHotbar", (app, html) => {
  try {
    patchHotbarTooltips(app, html);
  } catch (_e) {
    // ignore
  }
});

Hooks.once("ready", () => {
  // Expose macro roller
  if (game?.MarvelMultiverse) {
    game.MarvelMultiverse.rollAbilityMacro = rollAbilityMacro;
  }

  // Patch already-rendered hotbar (first load)
  try {
    if (ui?.hotbar?.element) patchHotbarTooltips(ui.hotbar, ui.hotbar.element);
  } catch (_e) {
    // ignore
  }
});
