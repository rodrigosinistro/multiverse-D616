/**
 * Multiverse-D616 — native Token Action HUD
 *
 * Replaces token-action-hud-core + token-action-hud-multiverse-d616 with a
 * small system-owned HUD containing the two actions used by this system:
 * ABILITIES and non-permanent POWERS.
 */

const SYSTEM_ID = "multiverse-d616";
const LEGACY_HUD_MODULE_ID = "token-action-hud-multiverse-d616";
const LEGACY_CORE_MODULE_ID = "token-action-hud-core";
const SETTING_ENABLED = "nativeActionHudEnabled";
const SETTING_POSITION = "nativeActionHudPosition";
const SETTING_COLLAPSED = "nativeActionHudCollapsed";
const SETTING_TAB = "nativeActionHudTab";
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
  "MULTIVERSE_D616.ActionHud.Settings.EnabledHint": "Exibe ABILITIES e POWERS ao selecionar um token.",
  "MULTIVERSE_D616.ActionHud.Abilities": "ABILITIES",
  "MULTIVERSE_D616.ActionHud.Powers": "POWERS",
  "MULTIVERSE_D616.ActionHud.NoPowers": "Nenhum Power acionável.",
  "MULTIVERSE_D616.ActionHud.NoPermission": "Você não tem permissão para usar as ações deste ator.",
  "MULTIVERSE_D616.ActionHud.Collapse": "Minimizar HUD",
  "MULTIVERSE_D616.ActionHud.Expand": "Expandir HUD",
  "MULTIVERSE_D616.ActionHud.Drag": "Arraste para mover",
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
  const roll = new RollClass(formula, actor.getRollData());
  await roll.toMessage(
    {
      author: game.user?.id,
      speaker,
      flavor: `ability: ${label}`,
      title: label,
    },
    { messageMode }
  );
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

    Hooks.on("controlToken", () => this.scheduleRender(true));
    Hooks.on("canvasReady", () => this.scheduleRender(true));
    Hooks.on("canvasTearDown", () => this.remove());
    Hooks.on("updateActor", (actor) => {
      if (this.isSelectedActor(actor)) this.scheduleRender(true);
    });
    Hooks.on("createItem", (item) => this.onItemChange(item));
    Hooks.on("updateItem", (item) => this.onItemChange(item));
    Hooks.on("deleteItem", (item) => this.onItemChange(item));
    Hooks.on("updateToken", (token) => {
      if (this.isSelectedToken(token)) this.scheduleRender(true);
    });
    Hooks.on("updateSetting", (changed) => {
      if (String(changed?.key ?? "").startsWith(`${SYSTEM_ID}.nativeActionHud`)) {
        this.scheduleRender(true);
      }
    });
    window.addEventListener("resize", () => this.positionWithinViewport());
  }

  get selectedToken() {
    return canvas?.tokens?.controlled?.[0] ?? null;
  }

  get selectedActor() {
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

    const body = document.createElement("div");
    body.className = "mmrpg-native-action-hud__body";

    root.append(header, tabs, body);
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
      actor.uuid ?? actor.id,
      actor.name,
      tab,
      collapsed,
      userCanUseActor(actor),
      abilities,
      powers,
    ]);
  }

  async render({ force = false } = {}) {
    if (!setting(SETTING_ENABLED, true) || legacyHudActive()) {
      this.remove();
      return;
    }
    const actor = this.selectedActor;
    if (!actor) {
      this.remove();
      return;
    }

    const tabSetting = String(setting(SETTING_TAB, "abilities"));
    const tab = this._activeTab ?? (tabSetting === "powers" ? "powers" : "abilities");
    const collapsed = Boolean(setting(SETTING_COLLAPSED, false));
    const signature = this.signature(actor, tab, collapsed);
    if (!force && signature === this._lastSignature && this.root?.isConnected) {
      this.positionWithinViewport();
      return;
    }
    this._lastSignature = signature;

    const root = this.root?.isConnected ? this.root : this.createRoot();
    root.classList.toggle("is-collapsed", collapsed);
    root.querySelector(".mmrpg-native-action-hud__actor").textContent = actor.name ?? "";
    const collapseButton = root.querySelector("[data-action='collapse']");
    collapseButton.innerHTML = collapsed
      ? '<i class="fas fa-chevron-down" aria-hidden="true"></i>'
      : '<i class="fas fa-chevron-up" aria-hidden="true"></i>';
    collapseButton.title = localize(
      collapsed
        ? "MULTIVERSE_D616.ActionHud.Expand"
        : "MULTIVERSE_D616.ActionHud.Collapse"
    );

    for (const button of root.querySelectorAll("[data-tab]")) {
      const active = button.dataset.tab === tab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    }

    const body = root.querySelector(".mmrpg-native-action-hud__body");
    body.replaceChildren();
    if (tab === "powers") this.renderPowers(body, actor);
    else this.renderAbilities(body, actor);
    this.applyStoredPosition();
    requestAnimationFrame(() => this.positionWithinViewport());
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
      .filter((item) => item?.type === "power" && !isPermanentPower(item))
      .sort((left, right) => compareNames(left.name, right.name));
    if (!powers.length) {
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
  }

  async onClick(event) {
    const collapseButton = event.target.closest?.("[data-action='collapse']");
    if (collapseButton) {
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

    const actionButton = event.target.closest?.("[data-action='ability'], [data-action='power']");
    if (!actionButton || actionButton.disabled) return;
    const actor = this.selectedActor;
    if (!actor) return;
    actionButton.disabled = true;
    actionButton.classList.add("is-busy");
    try {
      if (actionButton.dataset.action === "ability") {
        await rollAbility(actor, actionButton.dataset.ability);
      } else {
        const item = actor.items?.get?.(actionButton.dataset.itemId);
        if (item?.type === "power") await item.roll();
      }
    } catch (error) {
      console.error(`[${SYSTEM_ID}] Native Action HUD action failed`, error);
      ui.notifications.error(error?.message ?? "Falha ao executar a ação.");
    } finally {
      actionButton.classList.remove("is-busy");
      actionButton.disabled = !userCanUseActor(actor);
    }
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
  game.settings.register(SYSTEM_ID, SETTING_ENABLED, {
    name: "MULTIVERSE_D616.ActionHud.Settings.EnabledName",
    hint: "MULTIVERSE_D616.ActionHud.Settings.EnabledHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
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
  isPermanentPower,
  nativeActionHud,
  rollAbility,
};
