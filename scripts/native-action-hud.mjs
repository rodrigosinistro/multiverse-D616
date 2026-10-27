import { resolveConditionEdges, resolveConditionReroll } from "./condition-edge.mjs";
/**
 * Multiverse-D616 — native Token Action HUD
 *
 * Replaces token-action-hud-core + token-action-hud-multiverse-d616 with a
 * small system-owned HUD containing the two actions used by this system:
 * ABILITIES and actionable POWERS, plus equipped weapons as attack shortcuts.
 * Includes manually usable Permanent powers such as Grow/Shrink and Resize.
 */

import { growPowerLevel } from "./grow-size.mjs";
import { shrinkPowerLevel } from "./shrink-size.mjs";
import { listPowerEscapes, choosePowerEscape } from "./power-escapes.mjs";
import { listConditionRecoveryActions, attemptConditionRecovery } from "./condition-actions.mjs";
import { hasFaltineFlames, extinguishFaltine, hasHealingFactor, nextHealingHealth, healOutsideCombat } from "./ongoing-power-effects.mjs";
import { availableHeldPowers, useHeldFollowUp } from "./repeat-power-attacks.mjs";
import { getAttachedPowers, attachedPowerUsable, activateAttachedPower } from "./item-attached-powers.mjs";

const SYSTEM_ID = "multiverse-d616";
const LEGACY_HUD_MODULE_ID = "token-action-hud-multiverse-d616";
const LEGACY_CORE_MODULE_ID = "token-action-hud-core";
const SETTING_ENABLED = "nativeActionHudEnabled";
const SETTING_POSITION = "nativeActionHudPosition";
const SETTING_WIDTH = "nativeActionHudWidth";
// 280px power shortcuts + 5px padding on each side + the HUD borders.
const HUD_DEFAULT_WIDTH = 294;
const SETTING_COLLAPSED = "nativeActionHudCollapsed";
const SETTING_TAB = "nativeActionHudTab";
// Optional PF2e HUD-inspired presentation (original D616 implementation).
const SETTING_PERSISTENT = "nativeActionHudPersistent";
const SETTING_PINNED_ACTOR = "nativeActionHudPinnedActor";
const SETTING_PERSISTENT_SIZE = "nativeActionHudPersistentSize";
const PERSISTENT_PROFILE_WIDTH = 426;
const PERSISTENT_SLOT = 39;
const PERSISTENT_GAP = 4;
const PERSISTENT_CHROME = 10;
const PERSISTENT_MIN_HEIGHT = 225;
const PERSISTENT_DEFAULT_HEIGHT = 252;
const persistentMode = () => Boolean(setting(SETTING_PERSISTENT, false));
const HUD_ID = "mmrpg-native-action-hud";

const ABILITY_ORDER = ["mle", "agl", "res", "vig", "ego", "log"];
const ABILITY_LABELS = {
  mle: "Melee",
  agl: "Agility",
  res: "Resilience",
  vig: "Vigilance",
  ego: "Ego",
  log: "Logic",
};

const FALLBACK_TEXT = {
  "MULTIVERSE_D616.ActionHud.Settings.EnabledName": "HUD de Ações nativo",
  "MULTIVERSE_D616.ActionHud.Settings.EnabledHint": "Exibe ABILITIES e POWERS (com armas equipadas) ao selecionar um token.",
  "MULTIVERSE_D616.ActionHud.Abilities": "ABILITIES",
  "MULTIVERSE_D616.ActionHud.Powers": "POWERS",
  "MULTIVERSE_D616.ActionHud.NoPowers": "Nenhum poder acionável ou arma equipada.",
  "MULTIVERSE_D616.ActionHud.EquippedWeapons": "ARMAS EQUIPADAS",
  "MULTIVERSE_D616.ActionHud.AttachedItemPowers": "PODERES DOS ITENS",
  "MULTIVERSE_D616.ActionHud.NoPermission": "Você não tem permissão para usar as ações deste ator.",
  "MULTIVERSE_D616.ActionHud.Collapse": "Minimizar HUD",
  "MULTIVERSE_D616.ActionHud.Expand": "Expandir HUD",
  "MULTIVERSE_D616.ActionHud.Drag": "Arraste para mover",
  "MULTIVERSE_D616.ActionHud.Resize": "Arraste para aumentar ou diminuir a largura",
};

function localize(key) {
  const translated = game.i18n?.localize?.(key);
  return translated && translated !== key
    ? translated
    : FALLBACK_TEXT[key] ?? key;
}

function setting(key, fallback) {
  try {
    const value = game.settings.get(SYSTEM_ID, key);
    return value ?? fallback;
  } catch (_error) {
    return fallback;
  }
}

/** Preserve the player's preferred width, but keep the HUD visible on small screens. */
function normalizeHudWidth(value, viewportWidth = 1024, preferredMinimum = HUD_DEFAULT_WIDTH) {
  const available = Math.max(140, Number(viewportWidth || 1024) - 16);
  const minValue = Number(preferredMinimum);
  const minimum = Math.min(available, Math.max(140,
    Number.isFinite(minValue) ? minValue : HUD_DEFAULT_WIDTH));
  const requested = Number(value);
  return Math.round(Math.max(minimum, Math.min(available,
    Number.isFinite(requested) ? requested : HUD_DEFAULT_WIDTH)));
}

/**
 * The grid adds 5px of padding per side and the HUD adds two 1px borders.
 * Avoid leaving unused space to the right of a single column: while the
 * preferred width is below what two columns need, show the exact content width.
 * Do not stretch the buttons or overwrite the saved width on actor changes.
 */
function snapHudWidthToPowerColumns(value, cellWidth, viewportWidth = 1024) {
  const cell = Number(cellWidth);
  if (!Number.isFinite(cell) || cell <= 0) return normalizeHudWidth(value, viewportWidth);
  const oneColumn = Math.ceil(cell) + 12;
  const twoColumns = Math.ceil(cell) * 2 + 16; // 2 cells + 4px grid gap + 12px chrome
  const requested = normalizeHudWidth(value, viewportWidth, oneColumn);
  return requested < twoColumns
    ? normalizeHudWidth(oneColumn, viewportWidth, oneColumn)
    : requested;
}

/**
 * Power shortcuts retain their natural width, based on the longest displayed
 * line. The common width is shared by ALL power/weapon shortcuts in this HUD.
 * Attached powers are measured by their two separate lines rather than by an
 * artificially concatenated label. Their original full names remain in tooltips.
 */
function calculateUniformPowerWidth(lines, measure = text => String(text).length * 7, viewportWidth = 1024) {
  const longest = Math.max(0, ...lines.map(line => Number(measure(String(line ?? ""))) || 0));
  const maxWidth = Math.max(100, Number(viewportWidth || 1024) - 28);
  return Math.round(Math.min(maxWidth, Math.max(185, Math.ceil(longest + 53))));
}

function updatePowerCellWidth(body) {
  const shortcuts = [...(body.querySelectorAll?.(".mmrpg-native-action-hud__action.power") ?? [])];
  let context = null;
  try { context = document.createElement("canvas")?.getContext?.("2d") ?? null; }
  catch (_error) { /* text fallback remains available when no canvas exists */ }
  if (context) {
    const label = shortcuts[0]?.querySelector?.(".name");
    const style = label && typeof getComputedStyle === "function" ? getComputedStyle(label) : null;
    context.font = style?.font || '12px "Roboto Condensed", sans-serif';
  }
  const lines = shortcuts.flatMap(shortcut => {
    const attachedLines = shortcut.querySelectorAll?.(".power-name, .equipment-name") ?? [];
    if (attachedLines.length) return [...attachedLines].map(el => el.textContent);
    return [shortcut.querySelector?.(".name")?.textContent ?? ""];
  });
  const width = calculateUniformPowerWidth(lines,
    text => context ? context.measureText(text).width : String(text).length * 7,
    window.innerWidth);
  body.style?.setProperty?.("--mmrpg-power-cell-width", `${width}px`);
  // A 1-column HUD should never crop its widest shortcut, even if the user
  // selects an actor with longer power names than the previously selected one.
  const minimumWindowWidth = Math.min(window.innerWidth - 16, width + 12);
  body.parentElement?.style?.setProperty?.("--mmrpg-action-hud-min-width", `${minimumWindowWidth}px`);
  return width;
}

function getActorItems(actor) {
  if (!actor?.items) return [];
  if (typeof actor.items.filter === "function") {
    return actor.items.filter(() => true);
  }
  return Array.from(actor.items);
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function durationValues(duration, depth = 0) {
  if (duration == null || depth > 2) return [];
  if (["string", "number", "boolean"].includes(typeof duration)) {
    return [String(duration)];
  }
  if (Array.isArray(duration)) {
    return duration.flatMap((value) => durationValues(value, depth + 1));
  }
  if (typeof duration !== "object") return [];
  const preferredKeys = ["value", "label", "name", "type", "duration"];
  const preferred = preferredKeys.flatMap((key) =>
    durationValues(duration[key], depth + 1)
  );
  if (preferred.length) return preferred;
  return Object.values(duration).flatMap((value) =>
    durationValues(value, depth + 1)
  );
}

function isPermanentPower(item) {
  return durationValues(item?.system?.duration)
    .map(normalizeText)
    .some((value) => value === "permanent" || value === "permanente");
}

/**
 * The compendium marks some usable actions as Permanent because their RESULTS
 * persist. Those powers still require a deliberate click (and often an action,
 * a target and/or a Logic roll). Keep an explicit allowlist instead of matching
 * arbitrary Standard/Reaction text: e.g. Lightning Actions, Stilt Steps and
 * passive movement/defense powers should NOT clutter the HUD.
 *
 * This list only changes shortcut visibility. item.roll() continues to own
 * rolls, Focus, turn tracking and chat cards; there is no new automation here.
 */
const ACTIONABLE_PERMANENT_POWERS = new Set([
  "charmed life",      // choose when to announce the once-per-round Edge
  "disguise",          // choose a disguise (Standard)
  "domination",        // Logic check against target
  "edit memory",       // Logic check against target
  "flexible fingers",  // open locks / form a tool (Standard in effect text)
  "levitation",        // deliberate movement (Standard)
  "memory blip",       // Logic check against target
  "orders",            // Logic check against target
  "resize object",     // deliberate size change and Focus cost
  "resize other",      // compendium spelling; touch target and Focus cost
  "resize others",     // alias used by some imported character sheets
  "rubberneck",        // extend head to gain line of sight
  "shape shift",       // change shape (Standard or Reaction)
  "teleport object",   // deliberate teleport and Focus cost
]);

function canonicalPowerName(name) {
  return normalizeText(name)
    .replace(/[‐‑‒–—-]/g, " ")
    .replace(/\s+/g, " ");
}

/** Weapon shortcuts are owned attacks, not independent powers. */
function isEquippedWeaponForHud(item) {
  return item?.type === "weapon" && item.system?.equipped === true;
}

/** Only explicitly actionable Permanent powers bypass the standard filter. */
function isPowerAvailableForHud(item) {
  if (item?.type !== "power") return false;
  if (!isPermanentPower(item)) return true;
  return growPowerLevel(item) > 0 || shrinkPowerLevel(item) > 0 ||
    ACTIONABLE_PERMANENT_POWERS.has(canonicalPowerName(item.name));
}

/** Apply the same HUD visibility rule to owned Powers and to the independent
 * Power snapshots stored on equipment. A passive Permanent power remains active
 * through the equipment effect pipeline; it simply has no use shortcut. */
function actionableAttachedPowers(carrier) {
  return getAttachedPowers(carrier).filter(entry => isPowerAvailableForHud({
    type: "power",
    name: entry.data?.name ?? entry.name,
    system: entry.data?.system ?? {},
  }));
}

/** Five rows at natural size; when columns shrink, grow downward and scroll. */
function persistentGridShape(shortcutCount, visibleColumns) {
  const count = Math.max(0, Math.floor(Number(shortcutCount) || 0));
  const columns = Math.max(1, Math.floor(Number(visibleColumns) || 1));
  const rows = Math.max(5, Math.ceil(count / columns));
  return {columns, rows, usedColumns: Math.max(1, Math.ceil(count / rows))};
}

function compareNames(left, right) {
  return String(left ?? "").localeCompare(
    String(right ?? ""),
    game.i18n?.lang ?? "pt-BR",
    { sensitivity: "base", numeric: true }
  );
}

function userCanUseActor(actor) {
  if (!actor) return false;
  if (game.user?.isGM) return true;
  const owner = CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
  return Boolean(actor.testUserPermission?.(game.user, owner));
}

function legacyHudActive() {
  return (
    game.modules?.get?.(LEGACY_HUD_MODULE_ID)?.active === true ||
    game.modules?.get?.(LEGACY_CORE_MODULE_ID)?.active === true
  );
}

function applyPowerTooltip(button, item) {
  const system = item?.system ?? {};
  const type = String(item?.type || "Item");
  button.dataset.mmhtType = type
    ? type.charAt(0).toUpperCase() + type.slice(1)
    : "Item";
  button.dataset.mmhtTitle = item?.name ?? "";

  const fields = {
    Cost: system?.cost?.value ?? system?.cost ?? "",
    Range: system?.range ?? system?.distance ?? "",
    Action: system?.action ?? system?.activation ?? "",
    Trigger: system?.trigger ?? "",
    Duration: system?.duration ?? "",
    Desc: system?.description ?? system?.desc ?? system?.details ?? "",
    Effect: system?.effect ?? system?.effects ?? "",
  };
  for (const [suffix, value] of Object.entries(fields)) {
    if (value === "" || value == null) continue;
    const key = `mmht${suffix}`;
    button.dataset[key] = typeof value === "string" ? value : JSON.stringify(value);
  }
  button.removeAttribute("data-tooltip");
  button.removeAttribute("title");
}

async function rollAbility(actor, abilityKey) {
  if (!userCanUseActor(actor)) {
    ui.notifications.warn(localize("MULTIVERSE_D616.ActionHud.NoPermission"));
    return null;
  }
  const key = String(abilityKey ?? "").toLowerCase();
  if (!ABILITY_LABELS[key]) return null;
  const ability = actor.system?.abilities?.[key];
  const label = ability?.label ?? ABILITY_LABELS[key];
  const formula = `{1d6,1dm,1d6}+@abilities.${key}.value`;
  const speaker = ChatMessage.getSpeaker({ actor });
  const messageMode = game.settings.get("core", "messageMode");
  const RollClass = CONFIG.Dice?.MarvelMultiverseRoll ?? Roll;
  const conditionEdges=resolveConditionEdges({actor,ability:key,action:'standard'});
  const roll=new RollClass(formula,actor.getRollData(),conditionEdges.edgeMode?{edgeMode:conditionEdges.edgeMode}:{});
  const message=await roll.toMessage(
    {
      author: game.user?.id,
      speaker,
      flavor: `ability: ${label}`,
      title: label,
      flags:{'multiverse-d616':{conditionEdges}},
    },
    { messageMode }
  );
  if(conditionEdges.sources.length&&conditionEdges.autoCount)
    await resolveConditionReroll(message,conditionEdges);
  return roll;
}

class NativeActionHud {
  constructor() {
    this.root = null;
    this._renderQueued = false;
    this._forceRender = false;
    this._lastSignature = "";
    this._activeTab = null;
    this._drag = null;
    this._resize = null;
    this._persistentResize = null;
    this._currentTab = null;
    this._powerCellWidth = null;
    this._mode = null;

    Hooks.on("controlToken", () => this.scheduleRender(true));
    Hooks.on("canvasReady", () => this.scheduleRender(true));
    // Hold conditions live on the TARGET, not on the selected caster.
    Hooks.on("updateCombat", () => this.scheduleRender(true));
    for(const hook of ['createActiveEffect','updateActiveEffect','deleteActiveEffect']){
      Hooks.on(hook, () => this.scheduleRender(true));
    }
    Hooks.on('updateChatMessage', () => this.scheduleRender(true));
    Hooks.on("canvasTearDown", () => this.remove());
    Hooks.on("updateActor", (actor) => {
      if (this.isSelectedActor(actor)) this.scheduleRender(true);
    });
    Hooks.on("createItem", (item) => this.onItemChange(item));
    Hooks.on("updateItem", (item) => this.onItemChange(item));
    Hooks.on("deleteItem", (item) => this.onItemChange(item));
    for (const kind of ["createActiveEffect", "deleteActiveEffect", "updateActiveEffect"]) {
      Hooks.on(kind, (effect) => {
        const parent = effect?.parent;
        // Effects may be on the Actor or embedded in one of its Items.
        if (this.isSelectedActor(parent?.actor ?? parent)) this.scheduleRender(true);
      });
    }
    Hooks.on("updateToken", (token) => {
      if (this.isSelectedToken(token)) this.scheduleRender(true);
    });
    Hooks.on("updateSetting", (changed) => {
      if (String(changed?.key ?? "").startsWith(`${SYSTEM_ID}.nativeActionHud`)) {
        this.scheduleRender(true);
      }
    });
    window.addEventListener("resize", () => this.scheduleRender(true));
  }

  get selectedToken() {
    return canvas?.tokens?.controlled?.[0] ?? null;
  }

  get selectedActor() {
    if (persistentMode()) {
      // The GM's persistent HUD only exists while a token is explicitly selected.
      // This allows native Foundry hotbar macros when no token is controlled.
      // Players retain their assigned-character fallback as before.
      if (game.user?.isGM) return this.selectedToken?.actor ?? null;
      return this.selectedToken?.actor ?? (userCanUseActor(game.user?.character) ? game.user.character : null);
    }
    return this.selectedToken?.actor ?? null;
  }

  isSelectedActor(actor) {
    const selected = this.selectedActor;
    return Boolean(
      actor && selected &&
      (actor === selected || actor.uuid === selected.uuid || actor.id === selected.id)
    );
  }

  isSelectedToken(tokenDocument) {
    const selected = this.selectedToken?.document;
    return Boolean(
      tokenDocument && selected &&
      (tokenDocument === selected ||
        tokenDocument.uuid === selected.uuid ||
        tokenDocument.id === selected.id)
    );
  }

  onItemChange(item) {
    if (this.isSelectedActor(item?.parent)) this.scheduleRender(true);
  }

  scheduleRender(force = false) {
    this._forceRender ||= force;
    if (this._renderQueued) return;
    this._renderQueued = true;
    requestAnimationFrame(() => {
      this._renderQueued = false;
      const shouldForce = this._forceRender;
      this._forceRender = false;
      this.render({ force: shouldForce }).catch((error) =>
        console.error(`[${SYSTEM_ID}] Native Action HUD render failed`, error)
      );
    });
  }

  remove() {
    this.root?.remove?.();
    document.body?.style?.removeProperty?.('--mmrpg-d616-player-offset');
    this.root = null;
    this._lastSignature = "";
  }

  createRoot() {
    const root = document.createElement("section");
    root.id = HUD_ID;
    root.className = "mmrpg-native-action-hud";
    root.setAttribute("aria-label", "Multiverse-D616 Action HUD");

    const header = document.createElement("header");
    header.className = "mmrpg-native-action-hud__header";

    const dragHandle = document.createElement("div");
    dragHandle.className = "mmrpg-native-action-hud__drag";
    dragHandle.title = localize("MULTIVERSE_D616.ActionHud.Drag");
    const logo = document.createElement("img");
    logo.src = `systems/${SYSTEM_ID}/icons/m.svg`;
    logo.alt = "M";
    dragHandle.appendChild(logo);

    const actorName = document.createElement("span");
    actorName.className = "mmrpg-native-action-hud__actor";

    const collapse = document.createElement("button");
    collapse.type = "button";
    collapse.className = "mmrpg-native-action-hud__collapse";
    collapse.dataset.action = "collapse";
    // In the persistent dock this same header control becomes a diagonal resize grip.
    collapse.addEventListener("pointerdown", event => {
      if (persistentMode()) this.startPersistentResize(event);
    });

    header.append(dragHandle, actorName, collapse);

    const tabs = document.createElement("nav");
    tabs.className = "mmrpg-native-action-hud__tabs";
    for (const tabId of ["abilities", "powers"]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "mmrpg-native-action-hud__tab";
      button.dataset.tab = tabId;
      button.textContent = localize(
        tabId === "abilities"
          ? "MULTIVERSE_D616.ActionHud.Abilities"
          : "MULTIVERSE_D616.ActionHud.Powers"
      );
      tabs.appendChild(button);
    }

    const profile = document.createElement("section");
    profile.className = "mmrpg-native-action-hud__profile";
    // Text values are populated using textContent, not dynamic HTML.
    profile.innerHTML = `<button type="button" class="mmrpg-native-action-hud__portrait" data-action="portrait" title="Abrir ficha"><img alt="Retrato"></button>
      <div class="mmrpg-native-action-hud__identity"><strong class="mmrpg-native-action-hud__profile-name"></strong>
      <span class="mmrpg-native-action-hud__profile-rank"></span>
      <div class="mmrpg-native-action-hud__resource health"><span>HEALTH</span><b></b><div class="track"><div class="fill"></div></div></div>
      <div class="mmrpg-native-action-hud__resource focus"><span>FOCUS</span><b></b><div class="track"><div class="fill"></div></div></div>
      <div class="mmrpg-native-action-hud__profile-karma"></div>
      <div class="mmrpg-native-action-hud__quick-abilities" aria-label="Testes de atributos do personagem"></div></div>`;

    const body = document.createElement("div");
    body.className = "mmrpg-native-action-hud__body";
    body.setAttribute("aria-label", "Hotbar de ações do personagem");

    // Separate grip, so resizing cannot trigger a power or drag the window.
    const resizeHandle = document.createElement("div");
    resizeHandle.className = "mmrpg-native-action-hud__resize";
    resizeHandle.title = localize("MULTIVERSE_D616.ActionHud.Resize");
    resizeHandle.setAttribute("aria-label", localize("MULTIVERSE_D616.ActionHud.Resize"));
    resizeHandle.textContent = "↔ Largura";

    root.append(header, profile, tabs, body, resizeHandle);
    resizeHandle.addEventListener("pointerdown", (event) => this.startResize(event));
    root.addEventListener("click", (event) => this.onClick(event));
    dragHandle.addEventListener("pointerdown", (event) => this.startDrag(event));
    document.body.appendChild(root);
    this.root = root;
    return root;
  }

  signature(actor, tab, collapsed) {
    const abilities = ABILITY_ORDER.map((key) => {
      const ability = actor.system?.abilities?.[key];
      return [key, ability?.label ?? "", ability?.value ?? null];
    });
    const powers = getActorItems(actor)
      .filter((item) => item?.type === "power")
      .map((item) => [
        item.id ?? item._id,
        item.name,
        item.img,
        item.system?.duration,
      ]);
    return JSON.stringify([
      persistentMode(),
      actor.uuid ?? actor.id,
      actor.name,
      tab,
      collapsed,
      userCanUseActor(actor),
      abilities,
      powers,
      getActorItems(actor)
        .filter((item) => item?.type === "weapon")
        .map((item) => [item.id ?? item._id, item.name, item.img, item.system?.equipped === true,
          getAttachedPowers(item).map(p=>[p.id,p.name,p.img,p.data?.name,p.data?.system?.duration])]),
      getActorItems(actor).filter(item=>item?.type==='item' && getAttachedPowers(item).length)
        .map(item=>[item.id??item._id,item.name,getAttachedPowers(item).map(p=>[p.id,p.name,p.img,p.data?.name,p.data?.system?.duration])]),
      listPowerEscapes(actor).map(e=>e.id),
      availableHeldPowers(actor),
    ]);
  }

  async render({ force = false } = {}) {
    if (!setting(SETTING_ENABLED, true) || legacyHudActive()) {
      this.remove();
      return;
    }
    const persistent = persistentMode();
    const actor = this.selectedActor;
    // In persistent mode, keep the dock visible even before choosing an actor.
    if (!actor && (!persistent || game.user?.isGM)) {
      // Removing this node restores Foundry's #hotbar through the CSS :has() rule.
      this.remove();
      return;
    }
    if (!actor) {
      const root = this.root?.isConnected ? this.root : this.createRoot();
      root.classList.add("is-persistent");
      this._mode = "persistent";
      root.querySelector(".mmrpg-native-action-hud__actor").textContent = "MULTIVERSE D616";
      root.querySelector(".mmrpg-native-action-hud__body").textContent = "Selecione um token do seu personagem ou atribua um personagem ao usuário para começar.";
      this.updatePersistentProfile(root, null);
      this.decoratePersistentHotbar(root.querySelector(".mmrpg-native-action-hud__body"));
      this.applyPersistentSize();
      this.reflowPersistentHotbar(root.querySelector(".mmrpg-native-action-hud__body"));
      this.applyPersistentPosition();
      this._lastSignature = "";
      return;
    }

    const tabSetting = String(setting(SETTING_TAB, "abilities"));
    // Persistent layout offers only power slots; attributes are clickable on the left.
    // The classic HUD still uses the saved tab, unchanged.
    const tab = persistent ? "powers" : (this._activeTab ?? (tabSetting === "powers" ? "powers" : "abilities"));
    const collapsed = Boolean(setting(SETTING_COLLAPSED, false));
    const signature = this.signature(actor, tab, collapsed);
    if (!force && signature === this._lastSignature && this.root?.isConnected) {
      if (persistent) {
        this.updatePersistentProfile(this.root, actor);
        this.applyPersistentSize();
        this.reflowPersistentHotbar(this.root.querySelector(".mmrpg-native-action-hud__body"));
      } else this.positionWithinViewport();
      return;
    }
    this._lastSignature = signature;

    const root = this.root?.isConnected ? this.root : this.createRoot();
    root.classList.toggle("is-persistent", persistent);
    this._mode = persistent ? "persistent" : "normal";
    if (persistent) {
      this.updatePersistentProfile(root, actor);
      this.applyPersistentPosition();
    } else {
      this.applyStoredWidth();
      root.style.removeProperty("bottom");
      root.style.removeProperty("right");
      root.style.removeProperty("transform");
    }
    // The persistent HUD can be resized but no longer minimized. Classic mode
    // preserves the original collapsed setting and button behavior.
    root.classList.toggle("is-collapsed", !persistent && collapsed);
    root.querySelector(".mmrpg-native-action-hud__actor").textContent = actor.name ?? "";
    const collapseButton = root.querySelector("[data-action='collapse']");
    collapseButton.innerHTML = persistent
      ? '<span aria-hidden="true">⤢</span>'
      : collapsed
        ? '<i class="fas fa-chevron-down" aria-hidden="true"></i>'
        : '<i class="fas fa-chevron-up" aria-hidden="true"></i>';
    collapseButton.title = persistent
      ? "Arraste para aumentar ou diminuir o HUD (largura e altura)"
      : localize(collapsed
        ? "MULTIVERSE_D616.ActionHud.Expand"
        : "MULTIVERSE_D616.ActionHud.Collapse");
    collapseButton.setAttribute("aria-label", collapseButton.title);

    for (const button of root.querySelectorAll("[data-tab]")) {
      const active = button.dataset.tab === tab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    }

    const body = root.querySelector(".mmrpg-native-action-hud__body");
    // Preserve scroll when another client updates the selected Actor, or a
    // combat status changes mid-turn. Do not throw the player's list to top.
    const previousScroll = body.scrollTop;
    const previousTab = body.dataset.currentTab;
    body.replaceChildren();
    body.dataset.currentTab = tab;
    this._currentTab = tab;
    if (tab === "powers") {
      this.renderPowers(body, actor);
      this._powerCellWidth = updatePowerCellWidth(body);
      // Even if a saved width is wider, a one-column list fits tightly around
      // its longest shortcut. Preserve the saved preference for other actors.
      if (!persistent) this.fitPowerWidthToContent();
    } else {
      this._powerCellWidth = null;
      this.renderAbilities(body, actor);
      root.style.removeProperty?.("--mmrpg-action-hud-min-width");
    }
    if (persistent) {
      this.decoratePersistentHotbar(body);
      this.applyPersistentSize();
      this.reflowPersistentHotbar(body);
    }
    if (previousTab === tab) body.scrollTop = previousScroll;
    if (!persistent) {
      this.applyStoredPosition();
      requestAnimationFrame(() => this.positionWithinViewport());
    }
  }

  updatePersistentProfile(root, actor) {
    const profile = root.querySelector(".mmrpg-native-action-hud__profile");
    if (!profile) return;
    const portrait = profile.querySelector(".mmrpg-native-action-hud__portrait img");
    portrait.src = actor?.img || `systems/${SYSTEM_ID}/icons/m.svg`;
    portrait.alt = actor?.name ?? "Sem personagem";
    profile.querySelector(".mmrpg-native-action-hud__profile-name").textContent = actor?.name ?? "Nenhum personagem";
    profile.querySelector(".mmrpg-native-action-hud__profile-rank").textContent = actor
      ? `RANK ${actor.system?.attributes?.rank?.value ?? "—"}` : "Selecione um token";
    for (const resource of ["health", "focus"]) {
      const current = Math.max(0, Number(actor?.system?.[resource]?.value ?? 0) || 0);
      const maximum = Math.max(0, Number(actor?.system?.[resource]?.max ?? 0) || 0);
      const element = profile.querySelector(`.mmrpg-native-action-hud__resource.${resource}`);
      element.querySelector("b").textContent = `${current} / ${maximum}`;
      element.querySelector(".fill").style.width = `${maximum ? Math.max(0, Math.min(100, 100 * current / maximum)) : 0}%`;
    }
    profile.querySelector(".mmrpg-native-action-hud__profile-karma").textContent =
      `Karma ${actor?.system?.karma?.value ?? "—"}`;
    const quick = profile.querySelector(".mmrpg-native-action-hud__quick-abilities");
    if (quick) {
      quick.replaceChildren();
      // Read the exact same ability values used by the actor sheet, not a
      // separate set of permanent combat bonuses.
      for (const key of ABILITY_ORDER) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "mmrpg-native-action-hud__quick-ability";
        chip.dataset.action = "ability";
        chip.dataset.ability = key;
        chip.disabled = !userCanUseActor(actor);
        const label = document.createElement("span");
        label.className = "ability-label";
        label.textContent = ABILITY_LABELS[key];
        const value = document.createElement("strong");
        value.className = "ability-value";
        const score = actor?.system?.abilities?.[key]?.value;
        value.textContent = score == null ? "—" : `${Number(score) >= 0 ? "+" : ""}${score}`;
        chip.title = `Rolar ${ABILITY_LABELS[key]} (${value.textContent})`;
        chip.setAttribute("aria-label", chip.title);
        chip.append(label, value);
        quick.appendChild(chip);
      }
    }
  }

  /** Present existing, fully automated shortcuts as a two-row, ten-slot hotbar.
   * The extra shortcuts remain available by scrolling; no actions are discarded.
   * All clicks still use the normal native HUD onClick and Item.roll pipeline.
   */
  decoratePersistentHotbar(body) {
    if (!body) return;
    const buttons = [...body.querySelectorAll(".mmrpg-native-action-hud__action")];
    const rows = 5;
    const getLabel = button => {
      const name = button.querySelector(".name");
      const powerName = name?.querySelector?.(".power-name")?.textContent?.trim?.();
      const equipmentName = name?.querySelector?.(".equipment-name")?.textContent?.trim?.();
      return powerName
        ? `${powerName} ${equipmentName ?? ""}`.trim()
        : (name?.textContent?.trim() || button.dataset.ability || "Ação");
    };
    buttons.sort((left, right) => compareNames(getLabel(left), getLabel(right)));
    for (const button of buttons) {
      button.classList.add("is-hotbar-slot");
      const label = getLabel(button);
      button.setAttribute("aria-label", label);
      // Attached/borrowed powers stay visually distinct from native powers.
      if (button.classList.contains("attached-power") || button.classList.contains("weapon")) {
        button.classList.add("is-item-shortcut");
      }
      // Ensure the item name remains easy to identify on hover for equipment- and weapon-based shortcuts.
      if (button.classList.contains("attached-power")) {
        const sourceName = button.dataset.itemId ? (button.querySelector('.equipment-name')?.textContent?.replace(/[()]/g,'').trim() || "") : "";
        if (sourceName) {
          button.dataset.mmhtTitle = `${label} — ${sourceName}`;
          button.setAttribute("title", `${label} — ${sourceName}`);
        }
      } else if (button.classList.contains("weapon")) {
        const weaponName = button.querySelector(".name")?.textContent?.trim?.();
        if (weaponName) {
          button.dataset.mmhtTitle = weaponName;
          button.setAttribute("title", weaponName);
        }
      }
      // Keep existing D616 rich tooltip metadata and show a native fallback for synthetic shortcuts.
      if (!button.dataset.mmhtTitle) button.title = label;
      if (!button.querySelector("img")) {
        const symbol = document.createElement("span");
        symbol.className = "mmrpg-native-action-hud__slot-symbol";
        symbol.setAttribute("aria-hidden", "true");
        symbol.textContent = label.slice(0,2).toUpperCase();
        button.insertBefore(symbol, button.firstChild);
      }
      body.appendChild(button);
    }
    const columns = Math.max(1, Math.ceil(buttons.length / rows));
    const totalSlots = columns * rows;
    for (let i = buttons.length; i < totalSlots; i++) {
      const placeholder = document.createElement("span");
      placeholder.className = "mmrpg-native-action-hud__slot-empty";
      placeholder.setAttribute("aria-hidden", "true");
      body.appendChild(placeholder);
    }
    body.classList.toggle("has-overflow-shortcuts", buttons.length > totalSlots);
    body.dataset.shortcuts = String(buttons.length);
    body.style.setProperty("--mmrpg-persistent-body-columns", String(columns));
    body.style.setProperty("--mmrpg-persistent-body-rows", String(rows));
    this.root?.style?.setProperty?.("--mmrpg-persistent-body-columns", String(columns));
    this.root?.style?.setProperty?.("--mmrpg-persistent-body-rows", String(rows));
  }

  /** Client-side size is independent of the classic draggable action HUD. */
  persistentSizeLimit() {
    const viewportWidth = Math.max(500, Number(window.innerWidth) || 1280);
    const viewportHeight = Math.max(400, Number(window.innerHeight) || 800);
    const profile = viewportWidth <= 860 ? Math.max(295, viewportWidth * .49) : PERSISTENT_PROFILE_WIDTH;
    return {
      minWidth: Math.min(viewportWidth - 6, Math.ceil(profile) + PERSISTENT_SLOT + PERSISTENT_CHROME + 2),
      maxWidth: viewportWidth - 6,
      minHeight: Math.min(PERSISTENT_MIN_HEIGHT, viewportHeight - 36),
      maxHeight: Math.max(PERSISTENT_MIN_HEIGHT, viewportHeight - 36),
    };
  }

  applyPersistentSize() {
    if (!this.root || !persistentMode() || this._persistentResize) return;
    const count = Number(this.root.querySelector('.mmrpg-native-action-hud__body')?.dataset.shortcuts ?? 0);
    const naturalCols = Math.max(1, Math.ceil(count / 5));
    const saved = setting(SETTING_PERSISTENT_SIZE, {});
    const constraints = this.persistentSizeLimit();
    const defaultWidth = PERSISTENT_PROFILE_WIDTH +
      naturalCols * PERSISTENT_SLOT + (naturalCols - 1) * PERSISTENT_GAP + PERSISTENT_CHROME;
    const rawWidth = Number(saved?.width) > 0 ? Number(saved.width) : defaultWidth;
    const rawHeight = Number(saved?.height) > 0 ? Number(saved.height) : PERSISTENT_DEFAULT_HEIGHT;
    const width = Math.max(constraints.minWidth, Math.min(constraints.maxWidth, Math.round(rawWidth)));
    const height = Math.max(constraints.minHeight, Math.min(constraints.maxHeight, Math.round(rawHeight)));
    this.setPersistentSize(width, height);
  }

  setPersistentSize(width, height) {
    if (!this.root) return;
    this.root.style.setProperty('--mmrpg-persistent-user-width', `${width}px`);
    this.root.style.setProperty('--mmrpg-persistent-user-height', `${height}px`);
    document.body?.style?.setProperty?.('--mmrpg-d616-player-offset', `${height + 23}px`);
  }

  /** Reflow only DOM cells (never activate or copy a power). More columns fit
   * at larger widths; a smaller width grows the vertical list and adds a
   * scrollbar. The source order remains alphabetical, top-to-bottom first. */
  reflowPersistentHotbar(body) {
    if (!body || !this.root) return;
    const buttons = [...body.querySelectorAll('.mmrpg-native-action-hud__action')];
    const rootWidth = this.root.getBoundingClientRect?.().width ?? 0;
    const profileWidth = this.root.querySelector('.mmrpg-native-action-hud__profile')?.getBoundingClientRect?.().width ?? PERSISTENT_PROFILE_WIDTH;
    const bodyWidth = body.clientWidth || Math.max(0, rootWidth - profileWidth);
    const cols = Math.max(1, Math.floor((bodyWidth - PERSISTENT_CHROME + PERSISTENT_GAP) / (PERSISTENT_SLOT + PERSISTENT_GAP)));
    // Keep five icons per column in the natural size. If the player narrows
    // the panel, pack the same shortcuts into fewer columns and more rows.
    const {rows, usedColumns} = persistentGridShape(buttons.length, cols);
    for (const node of body.querySelectorAll('.mmrpg-native-action-hud__slot-empty')) node.remove();
    buttons.forEach((button, i) => {
      button.style.gridColumn = String(Math.floor(i / rows) + 1);
      button.style.gridRow = String((i % rows) + 1);
    });
    const actualCols = usedColumns;
    // Cosmetic empty cells: never clickable, no action dataset.
    for (let i = buttons.length; i < actualCols * rows; i++) {
      const placeholder = document.createElement('span');
      placeholder.className = 'mmrpg-native-action-hud__slot-empty';
      placeholder.setAttribute('aria-hidden', 'true');
      placeholder.style.gridColumn = String(Math.floor(i / rows) + 1);
      placeholder.style.gridRow = String((i % rows) + 1);
      body.appendChild(placeholder);
    }
    body.style.setProperty('--mmrpg-persistent-body-columns', String(cols));
    body.style.setProperty('--mmrpg-persistent-body-rows', String(rows));
    body.dataset.visibleColumns = String(cols);
    body.dataset.visibleRows = String(rows);
  }

  /** Resize from the header's top-right corner; bottom-left stays anchored. */
  startPersistentResize(event) {
    if (event.button !== 0 || !this.root || !persistentMode() || this._persistentResize) return;
    event.preventDefault();
    event.stopPropagation?.();
    const rect = this.root.getBoundingClientRect();
    this._persistentResize = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      width: rect.width,
      height: rect.height,
    };
    this.root.classList.add('is-resizing');
    const move = e => this.resizePersistent(e);
    const end = e => {
      if (e.pointerId !== this._persistentResize?.pointerId) return;
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', end);
      document.removeEventListener('pointercancel', end);
      void this.endPersistentResize();
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
  }

  resizePersistent(event) {
    const state = this._persistentResize;
    if (!state || !this.root || event.pointerId !== state.pointerId) return;
    const limit = this.persistentSizeLimit();
    const width = Math.round(Math.max(limit.minWidth, Math.min(limit.maxWidth, state.width + event.clientX - state.startX)));
    const height = Math.round(Math.max(limit.minHeight, Math.min(limit.maxHeight, state.height + state.startY - event.clientY)));
    this.setPersistentSize(width, height);
    this.reflowPersistentHotbar(this.root.querySelector('.mmrpg-native-action-hud__body'));
  }

  async endPersistentResize() {
    const state = this._persistentResize;
    this._persistentResize = null;
    this.root?.classList.remove('is-resizing');
    if (!state || !this.root) return;
    const rect = this.root.getBoundingClientRect();
    await game.settings.set(SYSTEM_ID, SETTING_PERSISTENT_SIZE, {
      width: Math.round(rect.width), height: Math.round(rect.height),
    });
  }

  applyPersistentPosition() {
    if (!this.root) return;
    // Absolute corner anchor: no user-selectable positions or empty gutters.
    this.root.style.top = "auto";
    this.root.style.bottom = "0px";
    this.root.style.right = "auto";
    this.root.style.left = "0px";
    this.root.style.transform = "none";
    this.root.style.width = "";
  }

  renderAbilities(body, actor) {
    body.classList.remove("is-powers");
    body.classList.add("is-abilities");
    const canUse = userCanUseActor(actor);
    for (const key of ABILITY_ORDER) {
      const ability = actor.system?.abilities?.[key];
      if (!ability) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "mmrpg-native-action-hud__action ability";
      button.dataset.action = "ability";
      button.dataset.ability = key;
      button.disabled = !canUse;
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = ability.label ?? ABILITY_LABELS[key];
      const value = document.createElement("span");
      value.className = "value";
      const numericValue = Number(ability.value ?? 0);
      value.textContent = `${numericValue >= 0 ? "+" : ""}${numericValue}`;
      button.append(name, value);
      body.appendChild(button);
    }
  }

  renderPowers(body, actor) {
    body.classList.remove("is-abilities");
    body.classList.add("is-powers");
    const canUse = userCanUseActor(actor);
    const powers = getActorItems(actor)
      .filter(isPowerAvailableForHud)
      .sort((left, right) => compareNames(left.name, right.name));
    const weapons = getActorItems(actor)
      .filter(isEquippedWeaponForHud)
      .sort((left, right) => compareNames(left.name, right.name));
    const itemPowers = getActorItems(actor)
      .filter(item=>item?.type==='item' && actionableAttachedPowers(item).length)
      .sort((a,b)=>compareNames(a.name,b.name));
    const escapes=listPowerEscapes(actor);
    const recoveries=listConditionRecoveryActions(actor);
    const naturalHealing=hasHealingFactor(actor)&&!game.combat?.started &&
      nextHealingHealth(actor)>Number(actor.system?.health?.value??0);
    if(naturalHealing){
      const button=document.createElement('button');button.type='button';
      button.className='mmrpg-native-action-hud__action power';
      button.dataset.action='healing-factor-outside';button.disabled=!canUse;
      const img=document.createElement('img');img.src=`systems/${SYSTEM_ID}/icons/m.svg`;img.alt='';
      const label=document.createElement('span');label.className='name';
      label.textContent='Healing Factor: recuperar';
      button.title='Fora de combate: recuperar Health igual a Resilience por turno narrativo, sob controle do Mestre.';
      button.append(img,label);body.appendChild(button);
    }
    const burning=hasFaltineFlames(actor);
    if(burning){
      const button=document.createElement('button');button.type='button';
      button.className='mmrpg-native-action-hud__action power';
      button.dataset.action='extinguish-faltine';button.disabled=!canUse;
      const img=document.createElement('img');img.src=`systems/${SYSTEM_ID}/icons/four-elements.svg`;img.alt='';
      const label=document.createElement('span');label.className='name';label.textContent='Apagar: Chamas de Faltine';
      button.title='Ação Padrão para apagar as chamas. Fora de combate, o Mestre define o tempo necessário.';
      button.append(img,label);body.appendChild(button);
    }
    for(const name of availableHeldPowers(actor)){
      const button=document.createElement('button');button.type='button';
      button.className='mmrpg-native-action-hud__action power';
      button.dataset.action='held-follow-up';button.dataset.powerName=name;button.disabled=!canUse;
      const img=document.createElement('img');img.src=`systems/${SYSTEM_ID}/icons/m.svg`;img.alt='';
      const label=document.createElement('span');label.className='name';
      label.textContent=name==='Hellfire Chains'?'Atacar: Correntes Infernais':'Esmagar: Coiling Crush';
      button.title=name==='Hellfire Chains'
        ?'Rodadas seguintes: escolha alvo agarrado, teste Ego vs Resilience; Health e Focus no mesmo ataque.'
        :'Turnos seguintes: gasta Movimento, teste Melee vs Resilience, dano Health.';
      button.append(img,label);body.appendChild(button);
    }
    for(const escape of escapes){
      const button=document.createElement('button');button.type='button';
      button.className='mmrpg-native-action-hud__action power';
      button.dataset.action='escape';button.dataset.escapeId=escape.id;
      button.disabled=!canUse;
      const img=document.createElement('img');img.src=`systems/${SYSTEM_ID}/icons/m.svg`;img.alt='';
      const label=document.createElement('span');label.className='name';
      label.textContent=`Escapar: ${escape.power}`;
      button.title=`Escolher Ação Padrão ou Reação — Melee contra ${escape.tn ? 'TN '+escape.tn : 'Melee do controlador'}`;
      button.append(img,label);body.appendChild(button);
    }
    for(const recovery of recoveries){
      const button=document.createElement('button');button.type='button';
      button.className='mmrpg-native-action-hud__action power';
      button.dataset.action='condition-recovery';button.dataset.conditionId=recovery.id;
      button.disabled=!canUse;
      const img=document.createElement('img');img.src=`systems/${SYSTEM_ID}/icons/m.svg`;img.alt='';
      const label=document.createElement('span');label.className='name';
      label.textContent=`Remover: ${recovery.label}`;
      button.title=`Ação Padrão — ${recovery.abilityLabel} TN ${recovery.tn}`;
      button.append(img,label);body.appendChild(button);
    }
    if (!powers.length && !weapons.length && !itemPowers.length && !escapes.length && !recoveries.length && !burning && !naturalHealing && !availableHeldPowers(actor).length) {
      const empty = document.createElement("p");
      empty.className = "mmrpg-native-action-hud__empty";
      empty.textContent = localize("MULTIVERSE_D616.ActionHud.NoPowers");
      body.appendChild(empty);
      return;
    }
    for (const item of powers) {
      const itemId = item.id ?? item._id;
      if (!itemId) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "mmrpg-native-action-hud__action power";
      button.dataset.action = "power";
      button.dataset.itemId = itemId;
      button.disabled = !canUse;
      const image = document.createElement("img");
      image.src = item.img || `systems/${SYSTEM_ID}/icons/super-powers.svg`;
      image.alt = "";
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = item.name ?? "(Power)";
      button.append(image, name);
      applyPowerTooltip(button, item);
      body.appendChild(button);
    }
    if (weapons.length) {
      const heading = document.createElement("div");
      heading.className = "mmrpg-native-action-hud__group-title";
      heading.textContent = localize("MULTIVERSE_D616.ActionHud.EquippedWeapons");
      body.appendChild(heading);
      for (const item of weapons) {
        const itemId = item.id ?? item._id;
        if (!itemId) continue;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "mmrpg-native-action-hud__action power weapon";
        button.dataset.action = "weapon";
        button.dataset.itemId = itemId;
        button.disabled = !canUse;
        const image = document.createElement("img");
        image.src = item.img || `systems/${SYSTEM_ID}/icons/weapons.svg`;
        image.alt = "";
        const name = document.createElement("span");
        name.className = "name";
        name.textContent = item.name ?? "(Weapon)";
        button.append(image, name);
        applyPowerTooltip(button, item);
        body.appendChild(button);
        this.renderAttachedPowerButtons(body,item,canUse);
      }
    }
    if(itemPowers.length) {
      const heading=document.createElement('div');
      heading.className='mmrpg-native-action-hud__group-title';
      heading.textContent=localize('MULTIVERSE_D616.ActionHud.AttachedItemPowers');
      body.appendChild(heading);
      for(const item of itemPowers) this.renderAttachedPowerButtons(body,item,canUse);
    }
  }

  renderAttachedPowerButtons(body,carrier,canUse) {
    for(const entry of actionableAttachedPowers(carrier)) {
      const button=document.createElement('button');
      button.type='button';
      button.className='mmrpg-native-action-hud__action power attached-power';
      button.dataset.action='attached-power';
      button.dataset.itemId=carrier.id??carrier._id;
      button.dataset.powerId=entry.id;
      button.disabled=!canUse || !attachedPowerUsable(carrier);
      const img=document.createElement('img');
      img.src=entry.img || `systems/${SYSTEM_ID}/icons/super-powers.svg`;
      img.alt='';
      const label=document.createElement('span');label.className='name';
      const powerName=document.createElement('span');powerName.className='power-name';
      powerName.textContent=entry.name || '(Power)';
      const equipmentName=document.createElement('span');equipmentName.className='equipment-name';
      equipmentName.textContent=`(${carrier.name})`;
      label.append(powerName,equipmentName);
      button.title=`${entry.name} (${carrier.name})`;
      button.append(img,label);
      applyPowerTooltip(button,{type:'power',name:entry.name,system:entry.data?.system??{}});
      body.appendChild(button);
    }
  }

  async onClick(event) {
    if (event.target.closest?.("[data-action='portrait']")) {
      const actor = this.selectedActor;
      actor?.sheet?.render?.(true);
      return;
    }
    const collapseButton = event.target.closest?.("[data-action='collapse']");
    if (collapseButton) {
      if (persistentMode()) return; // resized by pointer drag, not minimized
      const collapsed = !Boolean(setting(SETTING_COLLAPSED, false));
      await game.settings.set(SYSTEM_ID, SETTING_COLLAPSED, collapsed);
      this.scheduleRender(true);
      return;
    }

    const tabButton = event.target.closest?.("[data-tab]");
    if (tabButton) {
      const tab = tabButton.dataset.tab === "powers" ? "powers" : "abilities";
      this._activeTab = tab;
      await game.settings.set(SYSTEM_ID, SETTING_TAB, tab);
      this.scheduleRender(true);
      return;
    }

    const actionButton = event.target.closest?.("[data-action='ability'], [data-action='power'], [data-action='weapon'], [data-action='attached-power'], [data-action='escape'], [data-action='condition-recovery'], [data-action='extinguish-faltine'], [data-action='healing-factor-outside'], [data-action='held-follow-up']");
    if (!actionButton || actionButton.disabled) return;
    const actor = this.selectedActor;
    if (!actor) return;
    // Keep D616's existing item.roll() and automated combat engine. Resolve the
    // pinned actor to its real token when one is present on the current scene.
    if (persistentMode() && actor !== this.selectedToken?.actor) {
      const token = canvas?.tokens?.placeables?.find?.(t =>
        (t?.actor?.uuid === actor.uuid || (!actor.uuid && t?.actor?.id === actor.id)) &&
        (game.user?.isGM || t.isOwner));
      token?.control?.({ releaseOthers: true });
    }
    actionButton.disabled = true;
    actionButton.classList.add("is-busy");
    try {
      if (actionButton.dataset.action === "ability") {
        await rollAbility(actor, actionButton.dataset.ability);
      } else if(actionButton.dataset.action === 'escape') {
        await choosePowerEscape(actor,actionButton.dataset.escapeId);
      } else if(actionButton.dataset.action === 'condition-recovery') {
        await attemptConditionRecovery(actor,actionButton.dataset.conditionId);
      } else if(actionButton.dataset.action === 'extinguish-faltine') {
        await extinguishFaltine(actor);
      } else if(actionButton.dataset.action === 'healing-factor-outside') {
        await healOutsideCombat(actor);
      } else if(actionButton.dataset.action === 'held-follow-up') {
        await useHeldFollowUp(actor,actionButton.dataset.powerName);
      } else if(actionButton.dataset.action === 'attached-power') {
        const carrier=actor.items?.get?.(actionButton.dataset.itemId);
        if (carrier && attachedPowerUsable(carrier,actor) &&
            actionableAttachedPowers(carrier).some(entry=>entry.id===actionButton.dataset.powerId)) {
          await activateAttachedPower(carrier,actionButton.dataset.powerId,actor);
        }
      } else {
        const item = actor.items?.get?.(actionButton.dataset.itemId);
        if (item?.type === "power" || isEquippedWeaponForHud(item)) await item.roll();
      }
    } catch (error) {
      console.error(`[${SYSTEM_ID}] Native Action HUD action failed`, error);
      ui.notifications.error(error?.message ?? "Falha ao executar a ação.");
    } finally {
      actionButton.classList.remove("is-busy");
      if(actionButton.dataset.action==='attached-power') {
        const carrier=actor.items?.get?.(actionButton.dataset.itemId);
        actionButton.disabled=!userCanUseActor(actor)||!attachedPowerUsable(carrier,actor)||
          !actionableAttachedPowers(carrier).some(entry=>entry.id===actionButton.dataset.powerId);
      } else actionButton.disabled = !userCanUseActor(actor);
    }
  }

  applyStoredWidth() {
    if (persistentMode() || !this.root || this._resize) return;
    const saved = setting(SETTING_WIDTH, HUD_DEFAULT_WIDTH);
    this.root.style.width = `${normalizeHudWidth(saved, window.innerWidth)}px`;
  }

  fitPowerWidthToContent() {
    if (!this.root || this._resize || this._currentTab !== "powers" || !this._powerCellWidth) return;
    const saved = setting(SETTING_WIDTH, HUD_DEFAULT_WIDTH);
    const fitted = snapHudWidthToPowerColumns(saved, this._powerCellWidth, window.innerWidth);
    this.root.style.width = `${fitted}px`;
  }

  startResize(event) {
    if (persistentMode()) return;
    if (event.button !== 0 || !this.root || this._drag) return;
    event.preventDefault();
    event.stopPropagation?.();
    this._resize = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: this.root.getBoundingClientRect().width,
    };
    this.root.classList.add("is-resizing");
    const onMove = (moveEvent) => this.resize(moveEvent);
    const onEnd = (endEvent) => {
      if (endEvent.pointerId !== this._resize?.pointerId) return;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onEnd);
      document.removeEventListener("pointercancel", onEnd);
      this.endResize();
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onEnd);
    document.addEventListener("pointercancel", onEnd);
  }

  resize(event) {
    if (!this._resize || event.pointerId !== this._resize.pointerId || !this.root) return;
    const minimum = this._currentTab === "powers" && this._powerCellWidth
      ? this._powerCellWidth + 12 : HUD_DEFAULT_WIDTH;
    const width = normalizeHudWidth(
      this._resize.startWidth + event.clientX - this._resize.startX, window.innerWidth, minimum
    );
    this.root.style.width = `${width}px`;
    this.positionWithinViewport();
  }

  async endResize() {
    const root = this.root;
    this._resize = null;
    root?.classList.remove("is-resizing");
    if (!root) return;
    const requested = root.getBoundingClientRect().width;
    const width = this._currentTab === "powers" && this._powerCellWidth
      ? snapHudWidthToPowerColumns(requested, this._powerCellWidth, window.innerWidth)
      : normalizeHudWidth(requested, window.innerWidth);
    root.style.width = `${width}px`;
    this.positionWithinViewport();
    // Width is per-user, like the existing draggable position of the HUD.
    await game.settings.set(SYSTEM_ID, SETTING_WIDTH, width);
  }

  applyStoredPosition() {
    if (!this.root) return;
    const position = setting(SETTING_POSITION, { left: 78, top: 82 });
    const left = Number(position?.left);
    const top = Number(position?.top);
    this.root.style.left = `${Number.isFinite(left) ? left : 78}px`;
    this.root.style.top = `${Number.isFinite(top) ? top : 82}px`;
  }

  positionWithinViewport() {
    if (persistentMode()) return;
    const root = this.root;
    if (!root?.isConnected) return;
    const rectangle = root.getBoundingClientRect();
    const left = Math.min(
      Math.max(8, rectangle.left),
      Math.max(8, window.innerWidth - rectangle.width - 8)
    );
    const top = Math.min(
      Math.max(8, rectangle.top),
      Math.max(8, window.innerHeight - Math.min(rectangle.height, 48) - 8)
    );
    root.style.left = `${Math.round(left)}px`;
    root.style.top = `${Math.round(top)}px`;
  }

  startDrag(event) {
    if (persistentMode()) return;
    if (event.button !== 0 || !this.root) return;
    event.preventDefault();
    const rectangle = this.root.getBoundingClientRect();
    this._drag = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rectangle.left,
      offsetY: event.clientY - rectangle.top,
    };
    this.root.classList.add("is-dragging");
    const onMove = (moveEvent) => this.drag(moveEvent);
    const onUp = (upEvent) => {
      if (upEvent.pointerId !== this._drag?.pointerId) return;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      this.endDrag();
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }

  drag(event) {
    if (!this._drag || event.pointerId !== this._drag.pointerId || !this.root) return;
    const left = event.clientX - this._drag.offsetX;
    const top = event.clientY - this._drag.offsetY;
    this.root.style.left = `${Math.round(left)}px`;
    this.root.style.top = `${Math.round(top)}px`;
    this.positionWithinViewport();
  }

  async endDrag() {
    const root = this.root;
    this._drag = null;
    root?.classList.remove("is-dragging");
    if (!root) return;
    const rectangle = root.getBoundingClientRect();
    await game.settings.set(SYSTEM_ID, SETTING_POSITION, {
      left: Math.round(rectangle.left),
      top: Math.round(rectangle.top),
    });
  }
}

function registerSettings() {
  game.settings.register(SYSTEM_ID, SETTING_PERSISTENT_SIZE, {
    scope: "client", config: false, type: Object, default: {},
  });
  game.settings.register(SYSTEM_ID, SETTING_PERSISTENT, {
    name: "D616 — HUD persistente experimental",
    hint: "Mostra um painel fixo com retrato, Health, Focus, Karma e os mesmos atalhos do HUD nativo. Desative para voltar imediatamente ao HUD tradicional.",
    scope: "client", config: true, type: Boolean, default: false,
  });
  // Legacy preference registration: not displayed or consulted by the compact dock.
  game.settings.register(SYSTEM_ID, SETTING_PINNED_ACTOR, {
    scope: "client", config: false, type: String, default: "",
  });
  game.settings.register(SYSTEM_ID, SETTING_ENABLED, {
    name: "MULTIVERSE_D616.ActionHud.Settings.EnabledName",
    hint: "MULTIVERSE_D616.ActionHud.Settings.EnabledHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
  });
  game.settings.register(SYSTEM_ID, SETTING_WIDTH, {
    scope: "client",
    config: false,
    type: Number,
    default: HUD_DEFAULT_WIDTH,
  });
  game.settings.register(SYSTEM_ID, SETTING_POSITION, {
    scope: "client",
    config: false,
    type: Object,
    default: { left: 78, top: 82 },
  });
  game.settings.register(SYSTEM_ID, SETTING_COLLAPSED, {
    scope: "client",
    config: false,
    type: Boolean,
    default: false,
  });
  game.settings.register(SYSTEM_ID, SETTING_TAB, {
    scope: "client",
    config: false,
    type: String,
    default: "abilities",
  });
}

const nativeActionHud = new NativeActionHud();

Hooks.once("init", registerSettings);
Hooks.once("ready", () => {
  if (legacyHudActive() && game.user?.isGM) {
    ui.notifications.warn(
      "O Token Action HUD agora é nativo. Desative Token Action HUD Multiverse-D616 e Token Action HUD Core, depois recarregue o mundo."
    );
  }
  nativeActionHud.scheduleRender(true);
});

export {
  ABILITY_ORDER,
  NativeActionHud,
  normalizeHudWidth,
  snapHudWidthToPowerColumns,
  calculateUniformPowerWidth,
  persistentGridShape,
  isPermanentPower,
  isPowerAvailableForHud,
  isEquippedWeaponForHud,
  nativeActionHud,
  rollAbility,
};
