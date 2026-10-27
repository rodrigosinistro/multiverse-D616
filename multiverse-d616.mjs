/**
 * Extend the base Roll document by defining a pool for evaluating rolls with the Marvel DiceTerms.
 * @extends {Roll}
 * A type of Roll specific to a mmrpg check, challenge, or attack roll in the mmrpg system.
 * @param {string} formula                       The string formula to parse
 * @param {object} data                          The data object against which to parse attributes within the formula
 * @param {object} [options={}]                  Extra optional arguments which describe or modify the MarvelMultiverseRoll
 * @param {number} [options.edgeMode]            What edge modifier to apply to the roll (none, edge,
 *                                               trouble)
 * @param {number} [options.fantastic=1]         The value of dM result which represents a fantastic success
 * @param {(number)} [options.targetValue]       Assign a target value against which the result of this roll should be
 *
 */
import { isRicochetPower, ricoOriginalContext, registerRicoShieldHooks } from "./scripts/rico-shield-chain.mjs";
import { getPowerVfxConfig, playPowerVfx, registerPowerVfxSettings, registerPowerVfxLifecycleHooks } from "./scripts/power-vfx.mjs";
import { openPowerVfxBrowser } from "./scripts/power-vfx-browser.mjs";
import { originalRepeatContext, installRepeatPowerHooks } from "./scripts/repeat-power-attacks.mjs";
import { registerHeldConcentrationHooks } from "./scripts/held-concentration.mjs";
import { casterTokenForItem } from "./scripts/combat-preflight.mjs";
import { registerAutomationSettings, automationEnabled } from "./scripts/automation-settings.mjs";
import { prepareD616Movement } from "./scripts/movement-calculator.mjs";
import { chooseD616Dialog, promptD616FocusExtra } from "./scripts/dialog-v14.mjs";
import { growPowerLevel, promptGrowChoice, applyGrowChoice } from "./scripts/grow-size.mjs";
import { shrinkPowerLevel, promptShrinkChoice, applyShrinkChoice } from "./scripts/shrink-size.mjs";
import { isResizeOtherPower, promptResizeOtherChoice, requestResizeOther, registerResizeOtherSocket } from "./scripts/resize-other.mjs";
import { registerPowerGrabbedHooks } from "./scripts/power-grabbed.mjs";
import { syncActorTokenSize, registerTokenSizeHooks, RESIZE_SKIP_OPTION } from "./scripts/token-size.mjs";
import { handleConcentrationOnUse } from "./scripts/concentration.js";
import { parseFocusCost, focusAvailable, focusSpendLimit, validateFocusSpend } from "./scripts/focus-cost.mjs";
import { beginFocusMaintenance, registerFocusMaintenanceHooks } from "./scripts/focus-maintenance.mjs";
import { registerPowerConditionHooks, getMarvelOutcome, normalizeConditionDefense } from "./scripts/power-conditions.mjs";
import {adjudicateTargetOutcome, targetResultsReady, filterHitTargets, rollSignature, MULTI_TARGET_DECISION_KEY} from "./scripts/multi-target-combat.mjs";
import { registerPowerEscapeHooks } from "./scripts/power-escapes.mjs";
import { registerConditionRecoveryHooks } from "./scripts/condition-actions.mjs";
import { registerPoisonTurnHooks } from "./scripts/poisoned-turn.mjs";
import { registerOngoingPowerHooks } from "./scripts/ongoing-power-effects.mjs";
import { registerSmartTargetSettings, migrateSmartTargetSettings, chooseSmartTargets, shouldPromptForTargets } from "./scripts/smart-targets.mjs";
import { confirmAttackPreflight, registerCombatIntelligenceSettings } from "./scripts/combat-preflight.mjs";
import { findCrossingElementalBarrier, guardTargetDefense } from "./scripts/elemental-shields.mjs";
import { resolveConditionEdges, localTargetActors, resolveConditionReroll, registerConditionEdgeHooks } from "./scripts/condition-edge.mjs";
import { isAdvancedElementalPower, areaPowerProtection, resolvedAdvancedFocusItem, validateAdvancedElementalTargets, registerElementalAdvancedHooks, advancedNeedsDamage } from "./scripts/elemental-advanced.mjs";
import { hasActiveBodySheet, isAttackItem } from "./scripts/activated-movement-powers.mjs";
import { calculateD616Damage } from "./scripts/damage-calculation.js";
import { hasAdamantiumEffect, weaponAdamantiumValue, adamantiumEffectData, applyAdamantiumToHealthDr } from "./scripts/adamantium.mjs";
import { normalizeItemEffectDurations } from "./scripts/active-effect-v14-compat.mjs";
import { getAttachedPowers, supportsAttachedPowers, attachPower, detachPower, editAttachedPower, attachedPowerUsable, activateAttachedPower } from "./scripts/item-attached-powers.mjs";
import {resolveEquipmentPermanentEffects,hasEquipmentPermanentPower} from "./scripts/equipment-permanent-effects.mjs";
import { calculatePowerDamage } from "./scripts/power-fantastic-damage.mjs";
import { buildItemRollFormula } from "./scripts/roll-formula.mjs";
import { resolvePowerRoll, checkPowerOutcome, hasNaturalUltimateFantastic, powerDamageReductionCategory } from "./scripts/power-rolls.mjs";
import {
  canUseShieldBearerPower,
  markShieldThrown,
  maybeRequestUltimateFantastic,
} from "./scripts/secret-wars-rules.mjs";
import {
  getElementalFantasticMetadata,
  hasElementalHalfMovement,
  registerElementalFantasticHooks,
} from "./scripts/elemental-fantastic.mjs";

function mmGetMessageMode() {
  try {
    return game.settings.get("core", "messageMode") ?? "public";
  } catch (_error) {
    return "public";
  }
}

function mmApplyMessageMode(chatData, messageMode = mmGetMessageMode()) {
  if (typeof ChatMessage.applyMode === "function") {
    return ChatMessage.applyMode(chatData, messageMode);
  }
  return chatData;
}

/**
 * Return an informational badge for a Power/Weapon configured with an intrinsic
 * Attack Edge Mode. This is display-only: it does not change Edge/Trouble rules.
 * NORMAL and blank values intentionally render nothing.
 */
function mmAttackEdgeModeCardHtml(itemOrSystem) {
  const system = itemOrSystem?.system ?? itemOrSystem ?? {};
  const mode = String(system.attackEdgeMode ?? "").trim().toLowerCase();
  if (mode !== "edge" && mode !== "trouble") return "";
  const text = mode === "edge"
    ? "Esse Ataque tem 1 EDGE (Vantagem)"
    : "Esse Ataque tem 1 TROUBLE (Desvantagem)";
  return `<div class="mm-attack-edge-mode mm-attack-edge-mode-${mode}">${text}</div>`;
}

function mmCleanEdgeModeFlavor(flavor) {
  return String(flavor ?? "")
    .replace(/\s*\((?:MULTIVERSE_D616\.(?:edge|trouble|edgeMode\.(?:edge|trouble))|EDGE|TROUBLE|Edge|Trouble)\)\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function mmEdgeModeLabel(mode) {
  const isEdge = Number(mode) > 0;
  const key = isEdge
    ? "MULTIVERSE_D616.edgeMode.edge"
    : "MULTIVERSE_D616.edgeMode.trouble";
  const translated = game.i18n.localize(key);
  return translated === key ? (isEdge ? "EDGE" : "TROUBLE") : translated;
}

function mmApplyEdgeModeFlavor(flavor, mode = 0) {
  const clean = mmCleanEdgeModeFlavor(flavor);
  if (!mode) return clean;
  const marker = `(${mmEdgeModeLabel(mode)})`;
  return clean ? `${clean} ${marker}` : marker;
}

class MarvelMultiverseRoll extends Roll {
  constructor(formula, data, options) {
    super(formula, data, options);
    if (!this.options.configured) this.configureModifiers();
  }

  /* -------------------------------------------- */

  /**
   * Create a MarvelMultiverseRoll from a standard Roll instance.
   * @param {Roll} roll
   * @returns {MarvelMultiverseRoll}
   */
  static fromRoll(roll) {
    // biome-ignore lint/complexity/noThisInStatic: <explanation>
    const newRoll = new this(roll.formula, roll.data, roll.options);
    Object.assign(newRoll, roll);
    return newRoll;
  }

  /**
   * Create a MarvelMultiverseRoll from a standard Roll Terms.
   * @param {RollTerm[]} terms
   * @returns {MarvelMultiverseRoll}
   */
  static fromTerms(terms) {
    return super.fromTerms(terms);
  }

  /* -------------------------------------------- */

  /**
   * Determine whether a d616 roll should be fast-forwarded, and whether edge or trouble should be applied.
   * @param {object} [options]
   * @param {Event} [options.event]                               The Event that triggered the roll.
   * @param {boolean} [options.edge]                         Is something granting this roll edge?
   * @param {boolean} [options.trouble]                      Is something granting this roll trouble?
   * @param {boolean} [options.fastForward]                       Should the roll dialog be skipped?
   * @returns {{edgeMode: MarvelMultiverseRoll.EDGE_MODE, isFF: boolean}}  Whether the roll is fast-forwarded, and its edge
   *                                                              mode.
   */
  static determineEdgeMode({
    event,
    edge = false,
    trouble = false,
    fastForward,
  } = {}) {
    const isFF =
      fastForward ??
      (event?.shiftKey || event?.altKey || event?.ctrlKey || event?.metaKey);
    // biome-ignore lint/complexity/noThisInStatic: <explanation>
    let edgeMode = this.EDGE_MODE.NORMAL;
    // biome-ignore lint/complexity/noThisInStatic: <explanation>
    if (edge || event?.altKey) edgeMode = this.EDGE_MODE.EDGE;
    else if (trouble || event?.ctrlKey || event?.metaKey)
      // biome-ignore lint/complexity/noThisInStatic: <explanation>
      edgeMode = this.EDGE_MODE.TROUBLE;
    return { isFF: !!isFF, edgeMode };
  }

  /* -------------------------------------------- */

  /**
   * Edge mode of a mmrpg d616 roll
   * @enum {number}
   */
  static EDGE_MODE = {
    NORMAL: 0,
    EDGE: 1,
    TROUBLE: -1,
  };

  /* -------------------------------------------- */

  /**
   * The HTML template path used to configure evaluation of this Roll
   * @type {string}
   */
  static EVALUATION_TEMPLATE =
    "systems/multiverse-d616/templates/chat/roll-dialog.hbs";

  /**
   * The HTML template path used to configure evaluation of this Roll
   * @type {string}
   */
  static DAMAGE_EVALUATION_TEMPLATE =
    "systems/multiverse-d616/templates/chat/damage-roll-dialog.hbs";

  /**
   * The  template path used to Roll in chat
   * @type {string}
   */
  static CHAT_TEMPLATE = "systems/multiverse-d616/templates/dice/roll.hbs";
  /* -------------------------------------------- */

  /**
   * Does this roll start with a d6 or dM?
   * @type {boolean}
   */
  get validD616Roll() {
    // return this.dice.length === 3 && this.dice[0].faces === 6 && this.dice[1] instanceof game.MarvelMultiverse.dice.MarvelDie && this.dice[2].faces === 6
    return (
      this.dice.length === 3 &&
      this.terms[0] instanceof foundry.dice.terms.PoolTerm
    );
  }

  /* -------------------------------------------- */

  /**
   * A convenience reference for whether this marvel or d6 Roll has edge
   * @type {boolean}
   */
  get hasEdge() {
    return this.options.edgeMode === MarvelMultiverseRoll.EDGE_MODE.EDGE;
  }

  /* -------------------------------------------- */

  /**
   * A convenience reference for whether this marvel or d6 Roll has trouble
   * @type {boolean}
   */
  get hasTrouble() {
    return this.options.edgeMode === MarvelMultiverseRoll.EDGE_MODE.TROUBLE;
  }

  /**
   * Is this roll a fantastic result? Returns undefined if roll isn't evaluated.
   * @type {boolean|void}
   */
  get isFantastic() {
    if (!this._evaluated) return undefined;
    return this.dice[1].result === 1;
  }

  /* -------------------------------------------- */
  /*  D616 Roll Methods                            */
  /* -------------------------------------------- */

  /**
   * Apply optional modifiers which customize the behavior of the d616term
   * @private
   */
  configureModifiers() {
    const valid616 = this.validD616Roll;
    if (!valid616) return;
    this.options.fantastic = 1;

    if (this.isFantastic) {
      this.dice[1].results.map((r) => {
        if (r.result === 1) {
          r.discarded = false;
          r.active = true;
        } else {
          r.discarded = true;
          r.active = false;
        }
      });
      this.dice[1].total = 6;
    }

    // Mark configuration as complete
    this.options.configured = true;
  }

  /**
   * Secret Wars: Ultimate Fantastic Initiative (6M6) can turn the Marvel die
   * to M on one action check during the bonus round.
   */
  applyForcedMarvelM() {
    if (!this._evaluated || !this.options?.forceMarvelM || !this.validD616Roll) return false;
    const marvelDie = this.dice?.[1];
    if (!marvelDie) return false;
    const active = marvelDie.results?.find((result) => result.active && !result.discarded) ??
      marvelDie.results?.find((result) => !result.discarded) ??
      marvelDie.results?.[0];
    if (!active) return false;

    const oldValue = active.result === 1 ? 6 : Number(active.count ?? active.result ?? 0);
    const oldTotal = Number(this.total ?? 0);
    active.result = 1;
    active.count = 6;
    active.active = true;
    active.discarded = false;
    marvelDie._total = 6;

    const delta = 6 - oldValue;
    const pool = this.terms?.[0] instanceof foundry.dice.terms.PoolTerm
      ? this.terms[0]
      : this.terms?.[0]?.roll?.terms?.[0] instanceof foundry.dice.terms.PoolTerm
        ? this.terms[0].roll.terms[0]
        : null;
    if (pool && Number.isFinite(Number(pool.total))) pool._total = Number(pool.total) + delta;
    if (Number.isFinite(oldTotal)) this._total = oldTotal + delta;
    this.options.ultimateFantasticApplied = true;
    return true;
  }

  /** @inheritdoc */
  async toMessage(messageData = {}, options = {}) {
    // Evaluate the roll now so we have the results available to determine edge mode
    if (!this._evaluated) await this.evaluate({});
    this.applyForcedMarvelM();

    // Add appropriate edge mode message flavor and mmrpg roll flags
    messageData.flavor = messageData.flavor || this.options.flavor;
    messageData.fantastic = this.isFantastic;
    if (options.itemId) {
      foundry.utils.setProperty(
        messageData,
        "flags.multiverse-d616.itemId",
        options.itemId
      );
    }


    // Capture local targets on the author client so EVERYONE can see which targets were used for this roll.
    // Records ONLY the targets marked by the rolling user at the moment the message is created.
    try {
      const existingTargets = foundry.utils.getProperty(
        messageData,
        "flags.multiverse-d616.targets"
      );
      if (!existingTargets?.length) {
        const localTargets = mmD616CollectLocalTargets();
        if (localTargets?.length) {
          foundry.utils.setProperty(
            messageData,
            "flags.multiverse-d616.targets",
            localTargets
          );
        }
      }
    } catch (e) {
      console.warn(
        "[multiverse-d616] Failed to capture targets for roll message",
        e
      );
    }

    // Keep Edge/Trouble flavor idempotent. Retro rerolls re-render the same
    // ChatMessage; without cleaning first the marker was appended repeatedly.
    messageData.flavor = mmApplyEdgeModeFlavor(
      messageData.flavor,
      this.hasEdge ? 1 : this.hasTrouble ? -1 : 0
    );
    // Foundry v14 uses messageMode instead of the deprecated rollMode option.
    options.messageMode =
      options.messageMode ?? this.options.messageMode ?? mmGetMessageMode();
    return super.toMessage(messageData, options);
  }

  /* -------------------------------------------- */
  /*  Configuration Dialog                        */
  /* -------------------------------------------- */

  /**
   * Create a Dialog prompt used to configure evaluation of an existing MarvelMultiverseRoll instance.
   * @param {object} data                     Dialog configuration data
   * @param {string} [data.title]             The title of the shown dialog window
   * @param {boolean} [data.chooseModifier]   Choose which ability modifier should be applied to the roll?
   * @param {string} [data.defaultAbility]    For tool rolls, the default ability modifier applied to the roll
   * @param {string} [data.template]          A custom path to an HTML template to use instead of the default
   * @param {object} options                  Additional Dialog customization options
   * @returns {Promise<MarvelMultiverseRoll|null>}         A resulting MarvelMultiverseRoll object constructed with the dialog, or null if the
   *                                          dialog was closed
   */
  async configureDialog(
    { title, chooseModifier = false, defaultAbility, template } = {},
    options = {}
  ) {
    // Render the Dialog inner HTML
    const content = await renderTemplate(
      template ?? this.constructor.EVALUATION_TEMPLATE,
      {
        formulas: [{ formula: `${this.formula} + @bonus` }],
        chooseModifier,
        defaultAbility,
        abilities: Object.fromEntries(
          Object.entries(CONFIG.MULTIVERSE_D616.abilities).map((abl) => [
            abl[0],
            game.i18n.localize(abl[1]),
          ])
        ),
      }
    );

    const defaultButton = "normal";

    // Create the Dialog window and await submission of the form
    return new Promise((resolve) => {
      new Dialog(
        {
          title,
          content,
          buttons: {
            normal: {
              label: "Roll",
              callback: (html) => resolve(this._onDamageDialogSubmit(html)),
            },
          },
          default: defaultButton,
          close: () => resolve(null),
        },
        options
      ).render(true);
    });
  }

  /* -------------------------------------------- */

  /**
   * Handle submission of the Roll evaluation configuration Dialog
   * @param {jQuery} html            The submitted dialog content
   * @returns {MarvelMultiverseRoll}              This damage roll.
   * @private
   */

  _onDialogSubmit(html) {
    const form = html[0].querySelector("form");

    // Append a situational bonus term
    if (form.bonus.value) {
      const bonus = new Roll(form.bonus.value, this.data);
      if (!(bonus.terms[0] instanceof foundry.dice.terms.OperatorTerm))
        this.terms.push(new foundry.dice.terms.OperatorTerm({ operator: "+" }));
      this.terms = this.terms.concat(bonus.terms);
    }

    // Customize the modifier
    if (form.ability?.value) {
      const abl = this.data.abilities[form.ability.value];
      this.terms = this.terms.flatMap((t) => {
        if (t.term === "@mod")
          return new foundry.dice.terms.NumericTerm({ number: abl.value });
        if (t.term === "@abilityCheckBonus") {
          const bonus = abl.bonuses?.check;
          if (bonus) return new Roll(bonus, this.data).terms;
          return new foundry.dice.terms.NumericTerm({ number: 0 });
        }
        return t;
      });
      this.options.flavor += ` (${
        CONFIG.MULTIVERSE_D616.abilities[form.ability.value]?.label ?? ""
      })`;
    }

    // Apply advantage or disadvantage
    this.configureModifiers();
    return this;
  }
}

/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
class MarvelMultiverseActor extends Actor {
  /** Foundry V14 processes these alongside ordinary transferred Item effects.
   * Only equipment-borne Permanent powers participate in this override. */
  *allApplicableEffects() {
    const effects=resolveEquipmentPermanentEffects(this,super.allApplicableEffects(),
      data=>new CONFIG.ActiveEffect.documentClass(data,{parent:this}));
    yield* effects;
  }

  /**
   *
   * @override
   * Augment the actor's default getRollData() method by appending the data object
   * generated by the its DataModel's getRollData(), or null. This polymorphic
   * approach is useful when you have actors & items that share a parent Document,
   * but have slightly different data preparation needs.
   */
  getRollData() {
    const data = {};

    // Copy the ability scores to the top rank, so that rolls can use
    // formulas like `@mle.value + 4`.
    if (this.system.abilities) {
      for (const [k, v] of Object.entries(this.system.abilities)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    data.rank = this.system.attributes.rank.value;

    return { ...super.getRollData(), ...data };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async rollInitiative(options = {}, rollOptions = {}) {
    const combat = await super.rollInitiative(options);
    return combat;
  }

  /* -------------------------------------------- */

  /**
   * Get an un-evaluated MarvelMultiverseRoll instance used to roll initiative for this Actor.
   * @param {object} [options]                        Options which modify the roll
   * @param {MarvelMultiverseRoll.edgeMode} [options.edgeMode]    A specific edge mode to apply
   * @param {string} [options.flavor]                     Special flavor text to apply
   * @returns {MarvelMultiverseRoll}                               The constructed but unevaluated MarvelMultiverseRoll
   */
  getInitiativeRoll(options = {}) {
    // Use a temporarily cached initiative roll
    if (this._cachedInitiativeRoll) return this._cachedInitiativeRoll.clone();

    this.system.attributes?.init;
    const data = this.getRollData();
    // Create the initiative roll

    const parts = ["{1d6,1dm,1d6}"];
    const formula = parts.join(" + ");

    return new CONFIG.Dice.MarvelMultiverseRoll(formula, data, options);
  }
}

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
let MarvelMultiverseItem$1 = class MarvelMultiverseItem extends Item {
  /**
   * Prepare a data object which defines the data schema used by dice roll commands against this Item
   * @override
   */
  getRollData() {
    // Starts off by populating the roll data with `this.system`
    const rollData = { ...super.getRollData() };

    // Foundry v14 keeps DataModel fields under Item.system. Build the effective
    // attack formula explicitly so the selected ability is present in both the
    // formula rendered on the chat card and the evaluated total.
    rollData.formula = buildItemRollFormula(
      this.system.formula ?? rollData.formula,
      resolvePowerRoll(this).ability ?? this.system.ability
    );

    // Quit early if there's no parent actor
    if (!this.actor) return rollData;

    // If present, add the actor's roll data
    rollData.actor = this.actor.getRollData();

    return rollData;
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async roll() {
    // Smart targeting is shared by weapons and targeted powers. Cancel before
    // Focus, Concentration, effects or chat; self-use powers are never prompted.
    if (shouldPromptForTargets(this,resolvePowerRoll(this))) {
      try {
        const confirmed=await chooseSmartTargets(this);
        if(!confirmed)return;
      } catch(error) {
        console.error('[D616] Falha na seleção inteligente de alvos',error);
        ui.notifications?.warn?.('Não foi possível confirmar os alvos. A ação foi cancelada.');
        return;
      }
    }
    // Rico-Shield makes one attack per ricochet, never a multi-target roll.
    // Check before paying Focus and recording a Standard Action.
    if (isRicochetPower(this) &&
        mmD616CollectLocalTargets().length !== 1) {
      ui.notifications?.warn?.('Ricochete: marque exatamente um alvo antes do ataque.');
      return;
    }
    // v0.2.24: Warn about reliably-detectable out-of-range attacks and sight
    // walls before any Focus, Concentration, turn use or chat is committed.
    // Override is deliberate and recorded on the originating roll card.
    let preflight = { ok: true, results: [], overridden: [] };
    try { preflight = await confirmAttackPreflight(this, resolvePowerRoll(this)); }
    catch(error) {
      console.error('[D616] Verificação de alcance/visão falhou:',error);
      // A broken validator must never silently consume an action/Focus.
      ui.notifications?.warn?.('Falha na verificação do combate. A ação foi cancelada.');
      return;
    }
    if (!preflight.ok) return;
    // Grow 1–4: prompt BEFORE spending Focus/Concentration or announcing use.
    // Cancel keeps the actor and combat state unchanged.
    let growSelection;
    if (growPowerLevel(this)) {
      try {
        growSelection = await promptGrowChoice(this, this.actor);
      } catch (error) {
        console.error('[multiverse-d616] Falha ao selecionar Crescimento:', error);
        ui.notifications?.error?.('Não foi possível abrir a seleção de Crescimento.');
        return;
      }
      if (growSelection === null) return;
    }
    // Shrink 1–4 has the same deliberate, size-limited choice workflow as Grow.
    // This includes use from the native POWERS shortcuts (item.roll()).
    let shrinkSelection;
    if (shrinkPowerLevel(this)) {
      try {
        shrinkSelection = await promptShrinkChoice(this, this.actor);
      } catch (error) {
        console.error('[multiverse-d616] Falha ao selecionar Encolhimento:', error);
        ui.notifications?.error?.('Não foi possível abrir a seleção de Encolhimento.');
        return;
      }
      if (shrinkSelection === null) return;
    }
    // Resize Other uses a targeted, non-damaging size choice. A resistant target
    // must already be grabbed; cancel or invalid targeting spends no Focus.
    let resizeOtherSelection;
    if (isResizeOtherPower(this)) {
      try { resizeOtherSelection = await promptResizeOtherChoice(this, this.actor); }
      catch (error) {
        console.warn('[multiverse-d616] Resize Other:', error);
        ui.notifications?.warn?.(String(error?.message ?? error));
        return;
      }
      if (!resizeOtherSelection) return;
    }
    // Advanced Elemental Control: validate prerequisites and immutable intended
    // targets BEFORE Focus or Concentration. Area/shape placement stays with the
    // Narrator; only the targets intentionally marked when casting are checked.
    let advancedSelection = null;
    if (isAdvancedElementalPower(this.name)) {
      const targets = Array.from(game.user?.targets??[]).map(t=>t.document??t);
      const check = validateAdvancedElementalTargets(this.name,this.actor,targets);
      if (!check.ok) { ui.notifications?.warn?.(check.reason); return; }
      const protection = areaPowerProtection(this.name,this.actor);
      if (['Elemental Prison','Elemental Sphere','Telekinetic Sphere','Elemental Barrier','Telekinetic Barrier'].includes(this.name)) {
        const names=targets.length?targets.map(t=>foundry.utils.escapeHTML(t.name??'Alvo')).join(', '):'nenhum alvo hostil';
        const confirmed=await foundry.applications.api.DialogV2.confirm({
          window:{title:`${this.name} — Alvos e proteção`},rejectClose:false,
          content:`<p><b>Alvos afetados:</b> ${names}.</p><p>${this.name.endsWith('Barrier')?'Parede de até 2 espaços por Rank dentro de 10 espaços por Rank.':'Esfera de até 5 espaços por Rank ao redor do conjurador, ou prisão centrada no ponto escolhido.'}</p><p><b>Absorção:</b> ${protection.threshold} de dano por ataque; custo ${protection.cost} Focus.</p><p>A estrutura será mantida por Concentração e desenhada pelo Mestre como Região editável.</p>`,
        });
        if(!confirmed)return;
      }
      advancedSelection={name:this.name,protection:protection??null};
    }
    const powerRoll = resolvePowerRoll(this);
    // Some powers only require a check against unwilling targets or under a
    // particular circumstance. Ask before spending Focus/Concentration so an
    // unused optional check never causes an unintended resource change.
    let requestPowerRoll = true;
    if (powerRoll.optional && powerRoll.canRoll) {
      requestPowerRoll = await chooseD616Dialog({
        title: `${this.name} — Teste situacional`,
        content: '<p>Este poder só exige um teste em situações específicas. Deseja rolar ou usar o poder sem teste?</p>',
        buttons: [
          {action:'roll',label:'Rolar teste',value:true},
          {action:'noRoll',label:'Usar sem teste',value:false},
          {action:'cancel',label:'Cancelar',value:null},
        ],
        defaultAction:'roll',width:440,className:'m616-power-check-dialog',
      });
      if (requestPowerRoll === null || requestPowerRoll === undefined) return;
    }
    const isCombatTrickery = mmD616IsCombatTrickeryItem(this);
    if (isCombatTrickery) {
      const check = mmD616CanArmCombatTrickery(this.actor);
      if (!check.ok) {
        ui.notifications?.warn?.(check.message);
        return;
      }
    }

    // While Body Sheet is maintained, the character cannot make attacks.
    if (hasActiveBodySheet(this.actor) && isAttackItem(this)) {
      ui.notifications?.warn?.("Body Sheet ativo: o personagem não pode realizar ataques enquanto mantiver essa Concentração.");
      return;
    }

    // Secret Wars: a shield that was hurled is unavailable until the start of
    // this character's next turn.
    if (!canUseShieldBearerPower(this.actor, this)) return;

    // v0.2.9: resolve Focus selection and availability BEFORE making any
    // Concentration changes. Cancelling an expenditure never replaces an
    // existing Concentration. The deduction commits only after acceptance.
    const preFocus = await mmPreSpendFocusForPowerUse(this.actor, advancedSelection ? resolvedAdvancedFocusItem(this,this.actor) : this);
    if (preFocus === null) return;
    const __okConc = await handleConcentrationOnUse(this.actor, this);
    if (!__okConc) return;
    const focusCommitted = await mmCommitFocusForPowerUse(this.actor, preFocus);
    if (!focusCommitted) return;
    let resizeOtherFeedback = '';
    if (resizeOtherSelection) {
      try {
        const result = await requestResizeOther(this.actor,this,resizeOtherSelection);
        resizeOtherFeedback = `<p><strong>Resize Other:</strong> ${result.label} — ${result.range}.</p>`;
      } catch(error) {
        console.error('[multiverse-d616] Resize Other não pôde ser aplicado:',error);
        // The target was not modified (or GM could not be reached), so refund
        // this activation. Concentration is not used by this Permanent power.
        if (Number(preFocus?.spent??0)>0) {
          try { await this.actor.update({'system.focus.value':focusAvailable(this.actor)+Number(preFocus.spent)}); }
          catch(refundError){console.error('[multiverse-d616] Falha ao estornar Focus de Resize Other:',refundError);}
        }
        ui.notifications?.error?.(String(error?.message ?? error));
        return;
      }
    }

    // An Active Effect holds ongoing upkeep across Foundry reloads. For
    // Concentration powers, reuse the already-created power-specific effect.
    try {
      await beginFocusMaintenance(this.actor, this);
    } catch (error) {
      console.error('[multiverse-d616] Falha ao iniciar manutenção de Focus:', error);
      ui.notifications?.error?.('Não foi possível iniciar a manutenção de Focus deste poder.');
      return;
    }

    let growFeedback = '';
    if (growSelection !== undefined) {
      try {
        const result = await applyGrowChoice(this.actor, this, growSelection, CONFIG.MULTIVERSE_D616);
        growFeedback = `<p><strong>Tamanho escolhido:</strong> ${result.label} — ${result.range}.</p>`;
      } catch (error) {
        console.error('[multiverse-d616] Falha ao aplicar Crescimento:', error);
        ui.notifications?.error?.('Não foi possível aplicar o tamanho escolhido.');
        return;
      }
    }

    if (shrinkSelection !== undefined) {
      try {
        const result = await applyShrinkChoice(this.actor, this, shrinkSelection, CONFIG.MULTIVERSE_D616);
        growFeedback = `<p><strong>Tamanho escolhido:</strong> ${result.label} — ${result.range}.</p>`;
      } catch (error) {
        console.error('[multiverse-d616] Falha ao aplicar Encolhimento:', error);
        ui.notifications?.error?.('Não foi possível aplicar o tamanho escolhido.');
        return;
      }
    }

    // Assisted turn tracking must never prevent an Item from being used.
    try {
      await game.multiverseD616?.turnTracker?.trackItemUse?.(this);
    } catch (error) {
      console.warn("[multiverse-d616] Turn Tracker could not record Item use", error);
    }

    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const messageMode = mmGetMessageMode();
    const abilityLabel =
      CONFIG.MULTIVERSE_D616.damageAbility[powerRoll.ability] ??
      powerRoll.ability ??
      "";
    let label = abilityLabel
      ? `ability: ${abilityLabel}<br/>${this.type}: ${this.name}`
      : `${this.type}: ${this.name}`;
    label = this.system.damageType
      ? `${label}<br/>damagetype: ${this.system.damageType}`
      : label;
    const preflightNotes = preflight.overridden.length
      ? `<div class="m616-combat-preflight-chat"><strong>Verificação de combate (aviso aceito):</strong> ${
          preflight.overridden.map(r=>`${foundry.utils.escapeHTML(r.name)}: ${r.warning.map(w=>foundry.utils.escapeHTML(w)).join('; ')}`).join(' | ')
        }</div>` : '';

    ChatMessage.create(mmApplyMessageMode({
      speaker: speaker,
      flavor: label,
      ...(advancedSelection && ['Elemental Sphere','Elemental Prison','Telekinetic Sphere','Elemental Barrier','Telekinetic Barrier'].includes(this.name)
        ? {flags:{'multiverse-d616':{itemId:this.id,elementalAreaPower:this.name}}}
        : {}),
      content: `<div>${this.system.description}</div><div>${
        this.system.effect ? this.system.effect : ""
      }</div>${growFeedback}${resizeOtherFeedback}${preflightNotes}${mmAttackEdgeModeCardHtml(this)}`,
    }, messageMode));

    // Fire-and-forget optional visual effect AFTER validation, Focus and turn use.
    // This does not mutate rules, and a missing Sequencer must never stop rolling.
    void playPowerVfx(this).catch(error=>console.warn('[D616] VFX:',error));

    // The throw itself makes the shield unavailable even if the attack misses.
    await markShieldThrown(this.actor, this);

    // Combat Trickery is a Reaction that modifies the character's NEXT valid attack.
    // Clicking the power spends its normal Focus cost and arms a one-shot actor flag.
    if (isCombatTrickery) {
      await mmD616ArmCombatTrickery(this.actor, this);
      return this;
    }

    if (this.system.formula && powerRoll.canRoll && requestPowerRoll) {
      // Retrieve roll data.
      const rollData = this.getRollData();
      // Invoke the roll and submit it to chat.
      const combatTrickery = mmD616CombatTrickeryAttackContext(this.actor, this);
      if (combatTrickery.armed && !combatTrickery.apply && combatTrickery.warning) {
        ui.notifications?.warn?.(combatTrickery.warning);
      }

      // If Combat Trickery already guarantees M, do not ask to consume an Ultimate
      // Fantastic Initiative use for the same roll.
      const useUltimateFantastic = combatTrickery.apply
        ? false
        : await maybeRequestUltimateFantastic(this.actor);
      // Base item Edge/Trouble is separate from temporary Force; the latter
      // is counted by the condition resolver exactly once.
      const itemEdgeMode = String(powerRoll.edgeMode || this.system.attackEdgeMode || '').toLowerCase();
      const elementalEdgeMode = itemEdgeMode==='edge'?1:itemEdgeMode==='trouble'?-1:0;
      const rollOptions = useUltimateFantastic ? { forceMarvelM: true } : {};
      if (combatTrickery.apply) {
        rollOptions.forceMarvelM = true;
        rollOptions.combatTrickery = true;
        rollOptions.lockMarvelTrouble = true;
      }
      // Condition Edge/Trouble is computed from active statuses at the instant
      // of the roll, without changing the original power's static Edge mode.
      // Only one identical target modifier is valid for a shared multi-target roll.
      const conditionEdges = resolveConditionEdges({
        actor: this.actor, targetActors: localTargetActors(),
        ability: powerRoll.ability, attack: powerRoll.attack,
        kind: this.system.attackKind,
        action: this.system.action || 'standard',
        targeted: Boolean(game.user?.targets?.size),
        baseMode: elementalEdgeMode,
      });
      if (conditionEdges.edgeMode) rollOptions.edgeMode = conditionEdges.edgeMode;
      const roll = new CONFIG.Dice.MarvelMultiverseRoll(
        rollData.formula,
        rollData.actor,
        rollOptions
      );
      // If you need to store the value first, uncomment the next line.
      // const result = await roll.evaluate();
      const modLabel = `${label}, [ability] ${powerRoll.ability}${preflight.overridden.length ? '<br/>Aviso de alcance/visão aceito pelo jogador' : ''}`;

      // Damage Multiplier context.
      // IMPORTANT (book rule): weapon Damage Multiplier bonuses DO NOT STACK with any other DM *bonus*.
      // We use the GREATER of (weapon bonus) and (other bonus). Penalties (negative deltas) still apply.
      // IMPORTANT (system rule): weapon bonus applies ONLY when rolling THIS weapon AND it is equipped.
      const abilityKey = powerRoll.ability;
      const dmgCtx = mmGetDamageMultiplierContext(this.actor, abilityKey);
      const weaponBonus =
        this.type === "weapon" && this.system.equipped
          ? Number(this.system.damageMultiplierBonus ?? 0) || 0
          : 0;
      const otherBonus = Number(dmgCtx.otherBonus ?? 0) || 0;
      const otherPenalty = Number(dmgCtx.otherPenalty ?? 0) || 0;
      const effectiveBonus = Math.max(weaponBonus, otherBonus);
      const baseDamageMultiplier = Number(dmgCtx.base ?? 0) || 0;
      const finalDamageMultiplier = baseDamageMultiplier + otherPenalty + effectiveBonus;

      // Capture current targets for attack rolls so the chat card can show HIT/MISS.
      // We store token UUID + defense at the moment of the roll.
      const systemFlags = {
        actorId: this.actor?.id ?? null,
        itemId: this._id,
        ability: abilityKey,
        // The attack ability and the defense targeted by a power/weapon are
        // independent in Marvel Multiverse (e.g. Logic vs Agility). Persist
        // both so HIT/MISS always compares against the defense configured on
        // the item, including after Edge/Trouble re-renders.
        attackTarget: powerRoll.attackTarget ?? null,
        powerCheck: powerRoll.checkOnly,
        fantasticDamageOnly: powerRoll.fantasticDamage,
        powerTargetNumber: powerRoll.targetNumber || null,
        combatPreflight: preflight.overridden.length ? {
          warningAccepted:true,
          affected:preflight.overridden.map(r=>({name:r.name,warnings:r.warning})),
        } : null,
        damageType:
          String(powerRoll.damageType ?? "").toLowerCase() === "focus"
            ? "focus"
            : "health",
        // Adamantium is a property of the ATTACKING weapon, not its bearer.
        // Snapshot it now, before any future equipment or effect changes.
        adamantiumHealthDrIgnore: this.type === 'weapon' && this.system.equipped
          ? weaponAdamantiumValue(this)
          : 0,
        damageMultiplier: {
          base: baseDamageMultiplier,
          otherBonus,
          otherPenalty,
          weaponBonus,
          effectiveBonus,
          finalDM: finalDamageMultiplier,
        },
      };

      if(['Unstoppable Assault','Unrelenting Smash'].includes(this.name)){
        const scene=canvas?.scene;
        const token=scene?casterTokenForItem(this.actor,scene,canvas.tokens?.placeables??[]):null;
        const targets=Array.from(game.user?.targets??[]).map(t=>t?.document??t).filter(t=>t?.uuid);
        const repeat=originalRepeatContext(this,this.actor,targets,token);
        if(repeat)systemFlags.repeatAttack=repeat;
      }
      if(['Hellfire Chains','Coiling Crush'].includes(this.name)&&game.combat?.started){
        systemFlags.repeatInitial={combatId:game.combat.id,round:Number(game.combat.round),
          turn:Number(game.combat.turn),combatantId:game.combat.combatant?.id??null};
      }
      if(isRicochetPower(this)){
        const targets=mmD616CollectLocalTargets();
        const scene=canvas?.scene;
        const token=scene?casterTokenForItem(this.actor,scene,canvas.tokens?.placeables??[]):null;
        systemFlags.ricoShield=ricoOriginalContext(this,this.actor,targets,token,scene,canvas?.grid);
      }

      if (conditionEdges.sources.length || conditionEdges.ambiguousTargets || conditionEdges.targetSourcesDiffer) {
        systemFlags.conditionEdges = conditionEdges;
      }
      if(conditionEdges.ambiguousTargets || conditionEdges.targetSourcesDiffer){
        // Snapshot each target's own sources. This also covers equivalent net
        // modifiers from DIFFERENT conditions, without asking for a GM ruling.
        // Statuses may change while the GM is adjudicating the same card.
        const separate={};
        for(const token of Array.from(game.user?.targets??[])){
          const tokenDoc=token?.document??token;
          const targetActor=token?.actor??tokenDoc?.actor;
          if(!tokenDoc?.uuid||!targetActor)continue;
          const perTarget=resolveConditionEdges({
            actor:this.actor,targetActors:[targetActor],
            ability:powerRoll.ability,attack:powerRoll.attack,
            kind:this.system.attackKind,action:this.system.action||'standard',
            targeted:true,baseMode:elementalEdgeMode,
          });
          separate[tokenDoc.uuid]={net:perTarget.net,sources:perTarget.sources,
            edgeMode:perTarget.edgeMode};
        }
        systemFlags.targetConditionEdges=separate;
      }

      const elementalFantastic = getElementalFantasticMetadata(this, this.actor);
      if (elementalFantastic) systemFlags.elementalFantastic = elementalFantastic;
      if (advancedSelection) systemFlags.advancedElemental=advancedSelection;

      if (combatTrickery.apply) {
        systemFlags.combatTrickery = {
          applied: true,
          noMarvelTrouble: true,
          sourceItemId: combatTrickery.state?.sourceItemId ?? null,
          attackerRank: combatTrickery.attackerRank,
          targetRanks: combatTrickery.targetRanks,
        };
      }

      // Persist Focus spending on the roll card so it survives Edge/Trouble retro rolls.
      // Also hides the old "Focus" button (auto workflow).
      if (preFocus && Number(preFocus.spent ?? 0) > 0) {
        systemFlags.focusAuto = true;
        systemFlags.focusSpent = Number(preFocus.spent ?? 0);
        systemFlags.focusDamageBonus = Number(preFocus.bonus ?? 0);
        systemFlags.focusRule = String(preFocus.summary ?? "").trim();
      }

            try {
        const targets = mmD616CollectLocalTargets();
        // Store lightweight target refs so EVERY client can render the target list.
        // IMPORTANT: We only store the targets marked by THE ROLLING USER.
        if (targets?.length) systemFlags.targets = targets;
      } catch (e) {
        console.warn(
          "[multiverse-d616] Failed to capture local targets for roll message",
          e
        );
      }

	const msgData = {
        title: this.name,
        speaker: speaker,
        flavor: modLabel,
	        flags: { "multiverse-d616": systemFlags },
      };

      // Await message creation so any downstream code that depends on flags can rely on it.
      const createdRollMessage = await roll.toMessage(msgData, {
        messageMode,
        itemId: this._id,
      });
      // A mandatory single Trouble rerolls the best die. Edge lets the
      // player choose which die using the existing EDGE buttons on the card.
      if (conditionEdges.sources.length && conditionEdges.autoCount) {
        await resolveConditionReroll(createdRollMessage, conditionEdges);
      }

      if (combatTrickery.apply) {
        await mmD616ConsumeCombatTrickery(this.actor);
        ui.notifications?.info?.(
          "Combat Trickery aplicado: dado Marvel transformado em MARVEL (1)."
        );
      }

      if (powerRoll.attack) {
        Hooks.callAll("multiverse-d616.rollAttack", this, roll);
        Hooks.callAll("multiverse-d616.calcDamage", this, roll);
      }
      return roll;
    }
  }
};

const MULTIVERSE_D616 = {};
/**
 * The set of Ability Scores used within the system.
 * @type {Object}
 */
MULTIVERSE_D616.abilities = {
  mle: "MULTIVERSE_D616.Ability.Mel.long",
  agl: "MULTIVERSE_D616.Ability.Agl.long",
  res: "MULTIVERSE_D616.Ability.Res.long",
  vig: "MULTIVERSE_D616.Ability.Vig.long",
  ego: "MULTIVERSE_D616.Ability.Ego.long",
  log: "MULTIVERSE_D616.Ability.Log.long",
};

MULTIVERSE_D616.damageAbilityAbr = {
  Melee: "mle",
  Agility: "agl",
  Ego: "ego",
  Logic: "log",
};

MULTIVERSE_D616.damageAbility = Object.fromEntries(
  Object.keys(MULTIVERSE_D616.damageAbilityAbr).map((k) => [
    MULTIVERSE_D616.damageAbilityAbr[k],
    k,
  ])
);

MULTIVERSE_D616.MARVEL_RESULTS = {
  1: {
    label: "MULTIVERSE_D616.MarvelResult.M",
    image: `systems/multiverse-d616/icons/marvel-1.svg`,
  },
  2: {
    label: "MULTIVERSE_D616.MarvelResult.2",
    image: `systems/multiverse-d616/icons/marvel-2.svg`,
  },
  3: {
    label: "MULTIVERSE_D616.MarvelResult.3",
    image: `systems/multiverse-d616/icons/marvel-3.svg`,
  },
  4: {
    label: "MULTIVERSE_D616.MarvelResult.4",
    image: `systems/multiverse-d616/icons/marvel-4.svg`,
  },
  5: {
    label: "MULTIVERSE_D616.MarvelResult.5",
    image: `systems/multiverse-d616/icons/marvel-5.svg`,
  },
  6: {
    label: "MULTIVERSE_D616.MarvelResult.6",
    image: `systems/multiverse-d616/icons/marvel-6.svg`,
  },
};

MULTIVERSE_D616.DICE_RESULTS = {
  1: {
    label: "MULTIVERSE_D616.DiceResult.1",
    image: `systems/multiverse-d616/icons/1.svg`,
  },
  2: {
    label: "MULTIVERSE_D616.DiceResult.2",
    image: `systems/multiverse-d616/icons/2.svg`,
  },
  3: {
    label: "MULTIVERSE_D616.DiceResult.3",
    image: `systems/multiverse-d616/icons/3.svg`,
  },
  4: {
    label: "MULTIVERSE_D616.DiceResult.4",
    image: `systems/multiverse-d616/icons/4.svg`,
  },
  5: {
    label: "MULTIVERSE_D616.DiceResult.5",
    image: `systems/multiverse-d616/icons/5.svg`,
  },
  6: {
    label: "MULTIVERSE_D616.DiceResult.6",
    image: `systems/multiverse-d616/icons/6.svg`,
  },
};

MULTIVERSE_D616.sizes = {
  microscopic: {
    label: "MULTIVERSE_D616.Size.Microscopic",
    sizeMultiplier: 0,
  },
  miniature: { label: "MULTIVERSE_D616.Size.Miniature", sizeMultiplier: 0 },
  tiny: { label: "MULTIVERSE_D616.Size.Tiny", sizeMultiplier: 0 },
  little: { label: "MULTIVERSE_D616.Size.Little", sizeMultiplier: 0.25 },
  small: { label: "MULTIVERSE_D616.Size.Small", sizeMultiplier: 0 },
  average: { label: "MULTIVERSE_D616.Size.Average", sizeMultiplier: 0 },
  big: { label: "MULTIVERSE_D616.Size.Big", sizeMultiplier: 0 },
  huge: { label: "MULTIVERSE_D616.Size.Huge", sizeMultiplier: 5 },
  gigantic: { label: "MULTIVERSE_D616.Size.Gigantic", sizeMultiplier: 20 },
  titanic: { label: "MULTIVERSE_D616.Size.Titanic", sizeMultiplier: 80 },
  gargantuan: {
    label: "MULTIVERSE_D616.Size.Gargantuan",
    sizeMultiplier: 320,
  },
};

MULTIVERSE_D616.powersets = {
  basic: { label: "Basic" },
  elementalControl: { label: "Elemental Control" },
  healing: { label: "Healing" },
  illusion: { label: "Illusion" },
  luck: { label: "Luck" },
  magic: { label: "Magic" },
  martialArts: { label: "Martial Arts" },
  meleeWeapons: { label: "Melee Weapons" },
  narrative: { label: "Narrative" },
  omniversalTravel: { label: "Omniversal Travel" },
  phasing: { label: "Phasing" },
  plasticity: { label: "Plasticity" },
  powerControl: { label: "Power Control" },
  rangedWeapons: { label: "Ranged Weapons" },
  resize: { label: "Resize" },
  shieldBearer: { label: "Shield Bearer" },
  sixthSense: { label: "Sixth Sense" },
  spiderPowers: { label: "Spider-Powers" },
  superSpeed: { label: "Super-Speed" },
  superStrength: { label: "Super-Strength" },
  tactics: { label: "Tactics" },
  telekinesis: { label: "Telekinesis" },
  telepathy: { label: "Telepathy" },
  teleportation: { label: "Teleportation" },
  translation: { label: "Translation" },
  weatherControl: { label: "Weather Control" },
};

MULTIVERSE_D616.reverseSetList = Object.fromEntries(
  Object.keys(MULTIVERSE_D616.powersets).map((k) => [
    MULTIVERSE_D616.powersets[k].label,
    k,
  ])
);

MULTIVERSE_D616.movementTypes = {
  run: { label: "MULTIVERSE_D616.Movement.Run", active: true },
  climb: { label: "MULTIVERSE_D616.Movement.Climb", active: true },
  swim: { label: "MULTIVERSE_D616.Movement.Swim", active: true },
  jump: { label: "MULTIVERSE_D616.Movement.Jump", active: true },
  flight: { label: "MULTIVERSE_D616.Movement.Flight", active: false },
  glide: { label: "MULTIVERSE_D616.Movement.Glide", active: false },
  swingline: { label: "MULTIVERSE_D616.Movement.Swingline", active: false },
  levitation: { label: "MULTIVERSE_D616.Movement.Levitation", active: false },
};

MULTIVERSE_D616.elements = {
  plants: {
    label: "Plants",
    fantasticEffect: "Target is grabbed.",
  },
  air: {
    label: "Air",
    fantasticEffect: "Target is knocked prone for one round.",
  },
  earth: {
    label: "Earth",
    fantasticEffect: "Target moves at half speed for one round.",
  },
  electricity: {
    label: "Electricity",
    fantasticEffect: "Stuns target for one round.",
  },
  energy: { label: "Energy", fantasticEffect: "Blinds target for one round." },
  fire: { label: "Fire", fantasticEffect: "Sets target ablaze." },
  force: {
    label: "Force",
    fantasticEffect: "Target has trouble on all actions for one round.",
  },
  hellfire: {
    label: "Hellfire",
    fantasticEffect: "Splits damage equally between Health and Focus.",
  },
  ice: { label: "Ice", fantasticEffect: "Paralyzes target for one round." },
  iron: { label: "Iron", fantasticEffect: "Pins target for one round." },
  sound: { label: "Sound", fantasticEffect: "Deafens target for one round." },
  water: {
    label: "Water",
    fantasticEffect: "Surprises target until the end of the next round.",
  },
  toxin: { label: "Toxin", fantasticEffect: "The target is poisoned." },
  chemical: { label: "Chemical", fantasticEffect: "The target is corroding." },
  swarm: { label: "Swarm", fantasticEffect: "The target is frightened." },
};

MULTIVERSE_D616.teamManeuvers = [
  {
    maneuverType: "Offensive",
    levels: [
      {
        level: 1,
        cost: "5 focus, each",
        rankAvg: [1, 2],
        description:
          "The team members all get an edge on any attack they make this round.",
      },
      {
        level: 2,
        cost: "10 focus, each",
        rankAvg: [3, 4],
        description:
          "The team members can each reroll all their dice on any attack they make this round. They get to use the better result.",
      },
      {
        level: 3,
        cost: "15 focus, each",
        rankAvg: [5, 6],
        description:
          "The team members can each turn their Marvel die to a Fantastic success on any attack roll they make this round against targets of equal or highter rank.",
      },
    ],
  },
  {
    maneuverType: "Defensive",
    levels: [
      {
        level: 1,
        cost: "5 focus, each",
        rankAvg: [1, 2],
        description:
          "The team members all have Damage Reduction 2 for this round",
      },
      {
        level: 2,
        cost: "10 focus, each",
        rankAvg: [3, 4],
        description:
          "The team members all have Damage Reduction 4 for this round",
      },
      {
        level: 3,
        cost: "15 focus, each",
        rankAvg: [5, 6],
        description:
          "The team members all have Damage Reduction 8 for this round",
      },
    ],
  },
  {
    maneuverType: "Rally",
    levels: [
      {
        level: 1,
        cost: "5 focus, each",
        rankAvg: [1, 2],
        description:
          "All actions taken against team members have trouble this round.",
      },
      {
        level: 2,
        cost: "10 focus, each",
        rankAvg: [3, 4],
        description:
          "Each member of the team can make a speedy recovery roll for either Health or Focus, as if they had spent a point of Karma",
      },
      {
        level: 3,
        cost: "15 focus, each",
        rankAvg: [5, 6],
        description:
          "A single member of the team who has been killed or shattered in battle is healed to at least Health: 0 and Focus: 0",
      },
    ],
  },
];

MULTIVERSE_D616.sizeEffects = {
  microscopic: {
    name: "Microscopic Effects",
    disabled: false,
    changes: [
      {
        key: "system.size",
        mode: 5,
        value: "microscopic",
      },
      {
        key: "system.abilities.mle.defense",
        mode: 2,
        value: 5,
      },
      {
        key: "system.abilities.agl.defense",
        mode: 2,
        value: 5,
      },
    ],
    description: "",
    transfer: true,
    statuses: [],
    flags: { "multiverse-d616": { managedSize: true, version: "0.2.0" } },
  },
  miniature: {
    name: "Miniature Effects",
    disabled: false,
    changes: [
      {
        key: "system.size",
        mode: 5,
        value: "miniature",
      },
      {
        key: "system.abilities.mle.defense",
        mode: 2,
        value: 4,
      },
      {
        key: "system.abilities.agl.defense",
        mode: 2,
        value: 4,
      },
    ],
    description: "",
    transfer: true,
    statuses: [],
    flags: { "multiverse-d616": { managedSize: true, version: "0.2.0" } },
  },
  tiny: {
    name: "Tiny Effects",
    disabled: false,
    changes: [
      {
        key: "system.size",
        mode: 5,
        value: "tiny",
      },
      {
        key: "system.abilities.mle.defense",
        mode: 2,
        value: 3,
      },
      {
        key: "system.abilities.agl.defense",
        mode: 2,
        value: 3,
      },
    ],
    description: "",
    transfer: true,
    statuses: [],
    flags: { "multiverse-d616": { managedSize: true, version: "0.2.0" } },
  },
  little: {
    name: "Little Effects",
    disabled: false,
    changes: [
      {
        key: "system.size",
        mode: 5,
        value: "little",
      },
      {
        key: "system.abilities.mle.defense",
        mode: 2,
        value: 2,
      },
      {
        key: "system.abilities.agl.defense",
        mode: 2,
        value: 2,
      },
    ],
    description: "",
    transfer: true,
    statuses: [],
    flags: { "multiverse-d616": { managedSize: true, version: "0.2.0" } },
  },
  small: {
    name: "Small Effects",
    disabled: false,
    changes: [
      {
        key: "system.size",
        mode: 5,
        value: "small",
      },
      {
        key: "system.abilities.mle.defense",
        mode: 2,
        value: 1,
      },
      {
        key: "system.abilities.agl.defense",
        mode: 2,
        value: 1,
      },
    ],
    description: "",
    transfer: true,
    statuses: [],
    flags: { "multiverse-d616": { managedSize: true, version: "0.2.0" } },
  },
  average: {
    name: "Average Effects",
    disabled: false,
    changes: [
      {
        key: "system.size",
        mode: 5,
        value: "average",
      },
    ],
    description: "",
    transfer: true,
    statuses: [],
    flags: { "multiverse-d616": { managedSize: true, version: "0.2.0" } },
  },
  big: {
    name: "Big Effects",
    disabled: false,
    changes: [
      {
        key: "system.size",
        mode: 5,
        value: "big",
      },
      {
        key: "system.abilities.mle.defense",
        mode: 2,
        value: -1,
      },
      {
        key: "system.abilities.agl.defense",
        mode: 2,
        value: -1,
      },
    ],
    description: "",
    transfer: true,
    statuses: [],
    flags: { "multiverse-d616": { managedSize: true, version: "0.2.0" } },
  },
  huge: {
    name: "Huge Effects",
    disabled: false,
    changes: [
      {
        key: "system.size",
        mode: 5,
        value: "huge",
      },
      {
        key: "system.abilities.mle.defense",
        mode: 2,
        value: -2,
      },
      {
        key: "system.abilities.agl.defense",
        mode: 2,
        value: -2,
      },
      {
        key: "system.abilities.mle.damageMultiplier",
        mode: 2,
        value: 2,
      },
    ],
    description: "",
    transfer: true,
    statuses: [],
    flags: { "multiverse-d616": { managedSize: true, version: "0.2.0" } },
  },
  gigantic: {
    name: "Gigantic Effects",
    disabled: false,
    changes: [
      {
        key: "system.size",
        mode: 5,
        value: "gigantic",
      },
      {
        key: "system.abilities.mle.defense",
        mode: 2,
        value: -3,
      },
      {
        key: "system.abilities.agl.defense",
        mode: 2,
        value: -3,
      },
      {
        key: "system.abilities.mle.damageMultiplier",
        mode: 2,
        value: 4,
      },
    ],
    description: "",
    transfer: true,
    statuses: [],
    flags: { "multiverse-d616": { managedSize: true, version: "0.2.0" } },
  },
  titanic: {
    name: "Titanic Effects",
    disabled: false,
    changes: [
      {
        key: "system.size",
        mode: 5,
        value: "titanic",
      },
      {
        key: "system.abilities.mle.defense",
        mode: 2,
        value: -4,
      },
      {
        key: "system.abilities.agl.defense",
        mode: 2,
        value: -4,
      },
      {
        key: "system.abilities.mle.damageMultiplier",
        mode: 2,
        value: 6,
      },
    ],
    description: "",
    transfer: true,
    statuses: [],
    flags: { "multiverse-d616": { managedSize: true, version: "0.2.0" } },
  },
  gargantuan: {
    name: "Gargantuan Effects",
    disabled: false,
    changes: [
      {
        key: "system.size",
        mode: 5,
        value: "gargantuan",
      },
      {
        key: "system.abilities.mle.defense",
        mode: 2,
        value: -5,
      },
      {
        key: "system.abilities.agl.defense",
        mode: 2,
        value: -5,
      },
      {
        key: "system.abilities.mle.damageMultiplier",
        mode: "2",
        value: "8",
      },
    ],
    description: "",
    transfer: true,
    statuses: [],
    flags: { "multiverse-d616": { managedSize: true, version: "0.2.0" } },
  },
};

// ASCII Artwork
MULTIVERSE_D616.ASCII = `
=ccccc,      ,cccc       ccccc      ,cccc,  ?$$$$$$$,  ,ccc,   -ccc
:::"$$$$bc    $$$$$     ::'$$$$$c,  : $$$$$c':"$$$$???''."$$$$c,:'?$$c
'::::"?$$$$c,z$$$$F     ':: ?$$$$$c,':'$$$$$h':'?$$$,' :::'$$$$$$c,"$$h,
  '::::."$$$$$$$$$'    ..,,,:"$$$$$$h, ?$$$$$$c':"$$$$$$$b':"$$$$$$$$$$$c
    '::::"?$$$$$$    :"$$$$c:'$$$$$$$$d$$$P$$$b':'?$$$c : ::'?$$c "?$$$$h,
      ':::.$$$$$$$c,'::'????":'?$$$E"?$$$$h ?$$$.':?$$$h..,,,:"$$$,:."?$$$c
        ': $$$$$$$$$c, ::''  :::"$$$b '"$$$ :"$$$b':'?$$$$$$$c''?$F ':: "::
          .,$$$$$"?$$$$$c,    ':::"$$$$.::"$.:: ?$$$.:.???????" ':::  ' '''
          'J$$$$P'::"?$$$$h,   ':::'?$$$c'::'':: .:: : :::::''   '
        :,$$$$$':::::'?$$$$$c,  ::: "::  ::  ' ::'   ''
        .'J$$$$F  '::::: .::::    ' :::'  '
      .: ???):     ':: :::::
      : :::::'        '
        ''
`;

function mmStripHtml(value) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mmParseFocusCost(costText) {
  return parseFocusCost(costText);
}

/**
 * Prepare Focus spending without mutating the actor. This lets a user cancel
 * variable-cost choices or Concentration replacement without paying anything.
 * Returns { spent, bonus, summary } or null on cancellation/invalid input.
 */
async function mmPreSpendFocusForPowerUse(actor, item) {
  try {
    if (!actor || !item) return { spent: 0, bonus: 0, summary: "" };
    if ((item.type ?? "").toLowerCase() !== "power") return { spent: 0, bonus: 0, summary: "" };

    const cost = mmParseFocusCost(item.system?.cost ?? "");
    if (!cost.hasFocus || (cost.min ?? 0) <= 0) return { spent: 0, bonus: 0, summary: "" };

    const rank = Number(actor.system?.attributes?.rank?.value ?? 1);
    const maxSpend = Math.max(0, 5 * (Number.isFinite(rank) ? rank : 1));
    const actorFocus = Number(actor.system?.focus?.value ?? 0);
    const available = Number.isFinite(actorFocus) ? actorFocus : 0;

    if (maxSpend <= 0) {
      ui.notifications?.warn?.("Rank inválido para calcular o limite de gasto de Focus.");
      return null;
    }

    // FIXED
    if (cost.type === "fixed") {
      const spend = Math.max(0, Number(cost.fixed ?? cost.min ?? 0) || 0);
      if (spend <= 0) return { spent: 0, bonus: 0, summary: "" };
      if (spend > maxSpend) {
        ui.notifications?.warn?.(
          `Este poder exige ${spend} Focus, mas o limite por uso é ${maxSpend} (5×Rank).`
        );
        return null;
      }
      if (available < spend) {
        ui.notifications?.warn?.(`Focus insuficiente: precisa de ${spend}, mas tem ${available}.`);
        return null;
      }
      const { bonus, summary } = mmComputeFocusDamageBonus(item.system?.effect ?? "", spend);
      return { spent: spend, bonus: bonus ?? 0, summary: summary ?? "" };
    }

    // VARIABLE ("X or more Focus")
    const min = Math.max(0, Number(cost.min ?? 0) || 0);
    const maxTotal = Math.min(maxSpend, available);
    if (maxTotal < min) {
      ui.notifications?.warn?.(
        `Focus insuficiente. Mínimo ${min}, disponível ${available}, limite ${maxSpend}.`
      );
      return null;
    }

    const maxExtra = Math.max(0, maxTotal - min);
    const scaling = mmParseFocusScaling(item.system?.effect ?? "");
    const scalingHelp = scaling
      ? `Este poder escala: +${scaling.per} bônus de dano${scaling.ability ? ` ${scaling.ability}` : ""} a cada ${scaling.step} Focus gasto.`
      : "Não consegui identificar automaticamente o escalonamento no campo EFEITO.";

    const chosen = await promptD616FocusExtra({
      title:`Gastar Focus — ${item.name}`,
      min,maxTotal,available,maxSpend,currentExtra:0,scalingHelp,
    });

    if (chosen === null) return null;

    const spend = Math.max(0, Number(chosen ?? 0) || 0);
    if (spend < min) {
      ui.notifications?.warn?.(`Você deve gastar pelo menos ${min} Focus para usar este poder.`);
      return null;
    }
    if (spend > maxSpend) {
      ui.notifications?.warn?.(`Limite excedido: máximo ${maxSpend} Focus (5×Rank).`);
      return null;
    }
    if (spend > available) {
      ui.notifications?.warn?.(`Focus insuficiente: quer gastar ${spend}, mas só tem ${available}.`);
      return null;
    }

    const { bonus, summary } = mmComputeFocusDamageBonus(item.system?.effect ?? "", spend);
    return { spent: spend, bonus: bonus ?? 0, summary: summary ?? "" };
  } catch (e) {
    console.error("[multiverse-d616] mmPreSpendFocusForPowerUse error", e);
    return null;
  }
}

/** Commit the validated Focus amount exactly once, after Concentration prompts. */
async function mmCommitFocusForPowerUse(actor, prepared) {
  const spent = Number(prepared?.spent ?? 0);
  const check = validateFocusSpend(actor, spent);
  if (!check.ok) {
    ui.notifications?.warn?.(check.reason);
    return false;
  }
  if (!spent) return true;
  try {
    await actor.update({ "system.focus.value": focusAvailable(actor) - spent });
    return true;
  } catch (error) {
    console.error('[multiverse-d616] Falha ao descontar Focus:', error);
    ui.notifications?.error?.('Não foi possível descontar o Focus. O poder não foi usado.');
    return false;
  }
}

function mmParseFocusScaling(effectHtml) {
  const t = mmStripHtml(effectHtml);
  if (!t) return null;

  const patterns = [
    // PT: Para cada X pontos de Focus gastos, adiciona +Y ao bônus de dano ...
    /para\s+cada\s+(?<step>\d+)\s+pontos?\s+de\s+focus\s+gastos?,?\s*(?:ele\s*)?(?:adicione|adiciona|adicionar)\s*\+?\s*(?<per>\d+)\s+ao\s+b[oô]nus\s+de\s+dano(?:\s+de\s+(?<ability>[\wÀ-ÿ-]+))?/i,
    // PT: Adicione +Y ao bônus de dano ... para cada X pontos de Focus gastos
    /adicione\s*\+?\s*(?<per>\d+)\s+ao\s+b[oô]nus\s+de\s+dano(?:\s+de\s+(?<ability>[\wÀ-ÿ-]+))?[^.]{0,200}?para\s+cada\s+(?<step>\d+)\s+pontos?\s+de\s+focus\s+gastos?/i,
    // EN: For every X Focus spent, add +Y to the damage bonus
    /for\s+(?:each|every)\s+(?<step>\d+)\s+(?:points?\s+of\s+)?focus\s+(?:spent|used)[^.]{0,200}?(?:add|gain)\s*\+?\s*(?<per>\d+)\s+(?:to\s+)?(?:the\s+)?(?:damage\s+bonus|damage)/i,
  ];

  for (const re of patterns) {
    const m = re.exec(t);
    if (!m?.groups) continue;
    const step = Number.parseInt(m.groups.step ?? "0", 10);
    const per = Number.parseInt(m.groups.per ?? "0", 10);
    const ability = (m.groups.ability ?? "").trim() || null;
    if (Number.isFinite(step) && step > 0 && Number.isFinite(per) && per !== 0) {
      return { step, per, ability };
    }
  }
  return null;
}

function mmComputeFocusDamageBonus(effectHtml, totalFocus) {
  const total = Number(totalFocus ?? 0);
  if (!Number.isFinite(total) || total <= 0) {
    return { bonus: 0, summary: "", rule: null };
  }
  const rule = mmParseFocusScaling(effectHtml);
  if (!rule) return { bonus: 0, summary: "", rule: null };

  const steps = Math.floor(total / rule.step);
  const bonus = steps * rule.per;
  const abilityText = rule.ability ? ` ${rule.ability}` : "";
  const summary = `+${rule.per} bônus de dano${abilityText} a cada ${rule.step} Focus (gasto ${total} → +${bonus})`;
  return { bonus, summary, rule };
}

function mmClampNumber(n, min, max) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, v));
}

/**
 * Compute Damage Multiplier context for an ability.
 *
 * NOTE:
 * - `actor.system.abilities[abilityKey].damageMultiplier` can include modifiers from Active Effects.
 * - The weapon bonus must NOT stack with any other *bonus* to damage multiplier.
 * - Penalties (negative deltas) should still apply.
 */
function mmGetDamageMultiplierContext(actor, abilityKey) {
  const rank = Number(actor?.system?.attributes?.rank?.value ?? 0);
  const raw = foundry.utils.getProperty(
    actor?._source,
    `system.abilities.${abilityKey}.damageMultiplier`
  );
  const base = (Number(raw ?? 0) || 0) + (Number.isFinite(rank) ? rank : 0);

  const derived = Number(
    actor?.system?.abilities?.[abilityKey]?.damageMultiplier ?? base
  );
  const delta = (Number.isFinite(derived) ? derived : base) - base;
  const otherBonus = Math.max(0, delta);
  const otherPenalty = Math.min(0, delta);

  return { base, derived, delta, otherBonus, otherPenalty };
}

// ---------------------------------------------------------------------------
// Shared Targets Collection (Socket) — makes target list visible to ALL users.
// Rule: GM sees HIT/MISS; Players see only "ALVO".
// ---------------------------------------------------------------------------

const MM_D616_SOCKET = "system.multiverse-d616";
const MM_D616_TARGET_SCOPE = "mm-d616-targets";
const MM_D616_TARGET_REQUESTS = new Map();

/**
 * Register socket listeners (idempotent).
 */
function mmD616RegisterTargetsSocket() {
  const g = (game.multiverseD616 = game.multiverseD616 || {});
  if (g._targetsSocketRegistered) return;
  g._targetsSocketRegistered = true;

  game.socket.on(MM_D616_SOCKET, (data) => {
    try {
      if (!data || data.scope !== MM_D616_TARGET_SCOPE) return;

      if (data.type === "REQUEST_TARGETS") {
        const targets = mmD616CollectLocalTargets();
        game.socket.emit(MM_D616_SOCKET, {
          scope: MM_D616_TARGET_SCOPE,
          type: "TARGETS_RESPONSE",
          requestId: data.requestId,
          from: game.user?.id,
          targets,
        });
        return;
      }

      if (data.type === "TARGETS_RESPONSE") {
        const req = MM_D616_TARGET_REQUESTS.get(data.requestId);
        if (!req) return;
        if (data?.from) req.from.add(data.from);
        if (Array.isArray(data.targets)) req.targets.push(...data.targets);
      }
    } catch (err) {
      console.warn("[multiverse-d616] Targets socket handler error", err);
    }
  });
}

/**
 * Collect targets for the CURRENT user only.
 * Returns lightweight target refs (uuid, name, img).
 */

/**
 * Check if a Token is targeted by a specific User (without leaking other users' targets).
 * Token.targeted can be a Set of Users or User IDs depending on Foundry version/modules.
 */
function mmD616IsTargetedByUser(token, user) {
  try {
    if (!token || !user) return false;
    const targeted = token.targeted;
    if (!targeted) return false;

    if (typeof targeted.has === "function") {
      if (targeted.has(user)) return true;
      if (targeted.has(user.id)) return true;
    }

    for (const u of targeted) {
      if (u === user) return true;
      if (typeof u === "string" && u === user.id) return true;
      if (u?.id && u.id === user.id) return true;
    }
  } catch (e) {
    // ignore
  }
  return false;
}

const M616_COMBAT_TRICKERY_FLAG = "combatTrickery";

function mmD616NormalizeRuleName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function mmD616IsCombatTrickeryItem(item) {
  if (!item || item.type !== "power") return false;
  const name = mmD616NormalizeRuleName(item.name);
  return name === "combat trickery" || name === "ardil de combate";
}

function mmD616CurrentBattleId() {
  const combat = game.combat;
  if (!combat) return null;
  const started = combat.started ?? (Number(combat.round ?? 0) > 0);
  return started ? combat.id : null;
}

function mmD616GetCombatTrickeryState(actor) {
  try {
    return actor?.getFlag?.(M616_SYSTEM_ID, M616_COMBAT_TRICKERY_FLAG) ?? null;
  } catch (_error) {
    return null;
  }
}

function mmD616CanArmCombatTrickery(actor) {
  const state = mmD616GetCombatTrickeryState(actor);
  const battleId = mmD616CurrentBattleId();

  // An armed use from the current battle (or from outside combat) is already waiting
  // for the next valid attack and must not spend Focus a second time.
  if (state?.armed && state.battleId === battleId) {
    return {
      ok: false,
      message: "Combat Trickery já está preparado para o próximo ataque válido.",
    };
  }

  // The power is explicitly once per battle. Outside an active Combat encounter we
  // still allow it so worlds can test/use the automation without a Combat Tracker.
  if (battleId && state?.usedBattleId === battleId) {
    return {
      ok: false,
      message: "Combat Trickery já foi usado nesta batalha.",
    };
  }

  return { ok: true, battleId };
}

async function mmD616ArmCombatTrickery(actor, item) {
  if (!actor) return false;
  const battleId = mmD616CurrentBattleId();
  const previous = mmD616GetCombatTrickeryState(actor) ?? {};
  const next = {
    ...previous,
    armed: true,
    battleId,
    // Only an active Combat has a persistent once-per-battle scope. Outside combat,
    // a consumed test can be armed again normally.
    usedBattleId: battleId ?? previous.usedBattleId ?? null,
    sourceItemId: item?.id ?? null,
    armedAt: Date.now(),
    consumedAt: null,
  };
  await actor.setFlag(M616_SYSTEM_ID, M616_COMBAT_TRICKERY_FLAG, next);
  ui.notifications?.info?.(
    "Combat Trickery preparado! Faça agora um ataque contra alvo(s) de Rank igual ou maior: o dado Marvel desse ataque será MARVEL (1). A rolagem anterior não é alterada."
  );
  return true;
}

function mmD616LocalTargetActors() {
  const tokens = Array.from(game.user?.targets ?? []);
  if (!tokens.length && canvas?.tokens?.placeables) {
    tokens.push(
      ...canvas.tokens.placeables.filter((token) =>
        mmD616IsTargetedByUser(token, game.user)
      )
    );
  }

  return tokens
    .map((token) => token?.actor ?? token?.document?.actor ?? null)
    .filter(Boolean);
}

function mmD616CombatTrickeryAttackContext(actor, item) {
  const state = mmD616GetCombatTrickeryState(actor);
  // Many legacy offensive powers (for example Double Tap) have attack:false
  // in their compendium records, even though they roll against a defense.
  // Use the shared semantic attack classifier instead of the stale flag.
  if (!state?.armed || !isAttackItem(item) || mmD616IsCombatTrickeryItem(item)) {
    return { armed: false, apply: false, state };
  }

  const targets = mmD616LocalTargetActors();
  if (!targets.length) {
    return {
      armed: true,
      apply: false,
      state,
      warning:
        "Combat Trickery está preparado, mas o ataque precisa ter pelo menos um alvo marcado para validar o Rank.",
    };
  }

  const attackerRank = Number(actor?.system?.attributes?.rank?.value ?? NaN);
  const targetRanks = targets.map((target) =>
    Number(target?.system?.attributes?.rank?.value ?? NaN)
  );
  if (!Number.isFinite(attackerRank) || targetRanks.some((rank) => !Number.isFinite(rank))) {
    return {
      armed: true,
      apply: false,
      state,
      warning:
        "Combat Trickery está preparado, mas não foi possível determinar o Rank de todos os envolvidos.",
    };
  }

  if (targetRanks.some((rank) => rank < attackerRank)) {
    return {
      armed: true,
      apply: false,
      state,
      warning:
        "Combat Trickery não foi consumido: todos os alvos precisam ter Rank igual ou superior ao atacante.",
    };
  }

  return {
    armed: true,
    apply: true,
    state,
    attackerRank,
    targetRanks,
  };
}

async function mmD616ConsumeCombatTrickery(actor) {
  if (!actor) return false;
  const state = mmD616GetCombatTrickeryState(actor);
  if (!state?.armed) return false;
  await actor.setFlag(M616_SYSTEM_ID, M616_COMBAT_TRICKERY_FLAG, {
    ...state,
    armed: false,
    consumedAt: Date.now(),
  });
  return true;
}

function mmD616CollectLocalTargets() {
  const out = [];
  try {
    const tokens = Array.from(game.user?.targets ?? []);

    // Fallback: some modules may not populate game.user.targets consistently.
    if (!tokens.length && canvas?.tokens?.placeables) {
      tokens.push(...canvas.tokens.placeables.filter((t) => mmD616IsTargetedByUser(t, game.user)));
    }

    for (const t of tokens) {
      const tokenDoc = t.document ?? t;
      const a = t.actor ?? tokenDoc?.actor;
      const uuid = tokenDoc?.uuid ?? "";
      if (!uuid) continue;
      const name = t.name ?? tokenDoc?.name ?? a?.name ?? "Target";
      const img = tokenDoc?.texture?.src ?? a?.img ?? "";
      const actorUuid = a?.uuid ?? "";
      out.push({ uuid, actorUuid, name, img });
    }
  } catch (e) {
    console.warn("[multiverse-d616] Failed to collect local targets", e);
  }

  // Deduplicate by uuid
  const map = new Map();
  for (const t of out) if (t?.uuid && !map.has(t.uuid)) map.set(t.uuid, t);
  return Array.from(map.values());
}

/**
 * Collect targets from ALL connected clients (best-effort).
 * We request each client to report their local targets and union them.
 */
async function mmD616CollectSharedTargets({ timeoutMs = 250 } = {}) {
  mmD616RegisterTargetsSocket();

  const requestId =
    typeof foundry?.utils?.randomID === "function"
      ? foundry.utils.randomID()
      : randomID();

  const req = { targets: [], from: new Set() };
  MM_D616_TARGET_REQUESTS.set(requestId, req);

  // Include our own targets immediately
  req.targets.push(...mmD616CollectLocalTargets());
  req.from.add(game.user?.id);

  try {
    game.socket.emit(MM_D616_SOCKET, {
      scope: MM_D616_TARGET_SCOPE,
      type: "REQUEST_TARGETS",
      requestId,
      from: game.user?.id,
    });
  } catch (e) {
    console.warn("[multiverse-d616] Failed to emit REQUEST_TARGETS", e);
  }

  await new Promise((r) => setTimeout(r, timeoutMs));
  MM_D616_TARGET_REQUESTS.delete(requestId);

  // Deduplicate by uuid
  const map = new Map();
  for (const t of req.targets) {
    if (!t?.uuid) continue;
    if (!map.has(t.uuid)) map.set(t.uuid, t);
  }
  return Array.from(map.values());
}


const M616_SYSTEM_ID = "multiverse-d616";
const M616_INITIATIVE_FLAG = "initiative";

function mmNormalizeInitiativeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function mmInitiativeContext(message) {
  const context = message?.getFlag?.(M616_SYSTEM_ID, M616_INITIATIVE_FLAG);
  return context && typeof context === "object" ? context : null;
}

function mmIsInitiativeMessage(message, flavorElement = null) {
  if (mmInitiativeContext(message)) return true;
  const flavor = flavorElement?.textContent ?? message?.flavor ?? "";
  const normalized = mmNormalizeInitiativeText(flavor);
  return /\binitiative\b|\biniciativa\b/.test(normalized);
}

function mmCombatantsArray(combat) {
  return Array.from(combat?.combatants?.values?.() ?? combat?.combatants ?? []);
}

function mmResolveInitiativeCombatant(message) {
  const context = mmInitiativeContext(message);
  const combat =
    game.combats?.get?.(context?.combatId) ??
    game.combat ??
    null;
  if (!combat) return { combat: null, combatant: null, context };

  let combatant = context?.combatantId
    ? combat.combatants?.get?.(context.combatantId) ?? null
    : null;
  if (combatant) return { combat, combatant, context };

  const speaker = message?.speaker ?? {};
  if (speaker.token) {
    combatant = mmCombatantsArray(combat).find(
      (candidate) => (candidate.tokenId ?? candidate.token?.id) === speaker.token
    );
    if (combatant) return { combat, combatant, context };
  }

  if (speaker.actor) {
    const actorMatches = mmCombatantsArray(combat).filter(
      (candidate) => candidate.actorId === speaker.actor
    );
    if (actorMatches.length === 1) {
      return { combat, combatant: actorMatches[0], context };
    }
  }

  const speakerActor = message?.speakerActor ?? null;
  if (speakerActor) {
    const exactMatches = mmCombatantsArray(combat).filter((candidate) => {
      const actor = candidate.actor ?? candidate.token?.actor ?? null;
      return (
        actor === speakerActor ||
        (actor?.uuid && speakerActor?.uuid && actor.uuid === speakerActor.uuid)
      );
    });
    if (exactMatches.length === 1) {
      return { combat, combatant: exactMatches[0], context };
    }
  }

  const alias = String(message?.alias ?? "").trim();
  if (alias) {
    const nameMatches = mmCombatantsArray(combat).filter((candidate) => {
      const actor = candidate.actor ?? candidate.token?.actor ?? null;
      return candidate.name === alias || actor?.name === alias;
    });
    if (nameMatches.length === 1) {
      return { combat, combatant: nameMatches[0], context };
    }
  }

  return { combat, combatant: null, context };
}

function mmCanAdjustInitiativeMessage(message) {
  if (game.user?.isGM || message?.author?.id === game.user?.id) return true;
  const { combatant } = mmResolveInitiativeCombatant(message);
  const actor = combatant?.actor ?? combatant?.token?.actor ?? message?.speakerActor ?? null;
  const ownerLevel = CONST.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
  return !!actor?.testUserPermission?.(game.user, ownerLevel);
}

async function mmResolveInitiativeResult(message, initiative = null) {
  const { combat, combatant } = mmResolveInitiativeCombatant(message);
  if (!combat || !combatant) {
    console.warn(
      `[${M616_SYSTEM_ID}] Could not resolve the Combatant for an initiative Edge/Trouble result`,
      { messageId: message?.id, alias: message?.alias }
    );
    ui.notifications?.warn?.(
      "O resultado do dado foi atualizado, mas o combatente da iniciativa não foi localizado."
    );
    return false;
  }

  const api = game.multiverseD616?.turnTracker?.resolveInitiative;
  if (typeof api === "function") {
    return api({
      combatId: combat.id,
      combatantId: combatant.id,
      initiative:
        initiative === null || initiative === undefined
          ? null
          : Number(initiative),
      messageId: message?.id ?? null,
    });
  }

  if (initiative !== null && initiative !== undefined && Number.isFinite(Number(initiative))) {
    await combat.setInitiative(combatant.id, Number(initiative));
  }
  return true;
}


class ChatMessageMarvel extends ChatMessage {
  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async renderHTML(options = {}) {
    const html = await super.renderHTML(options);
    this._displayChatActionButtons(html);

    this._enrichChatCard(html);
    await this._enrichAttackTargets(html);

    /**
     * A hook event that fires after multiverse-d616-specific chat message modifications have completed.
     * @function multiverse-d616.renderChatMessage
     * @memberof hookEvents
     * @param {ChatMessageMarvel} message  Chat message being rendered.
     * @param {HTMLElement} html       HTML contents of the message.
     */
    Hooks.callAll("multiverse-d616.renderChatMessage", this, html);

    return html;
  }

  /**
   * Optionally hide the display of chat card action buttons which cannot be performed by the user
   * @param {HTMLElement} html     Rendered contents of the message.
   * @protected
   */
  _displayChatActionButtons(html) {
    const chatCard = html?.querySelector?.(".multiverse-d616.chat-card");
    if (!chatCard) return;

    const flavor = html.querySelector(".flavor-text");
    const itemName = html.querySelector(".item-name");
    if (flavor?.textContent === itemName?.textContent) flavor.remove();

    if (this.shouldDisplayChallenge) chatCard.dataset.displayChallenge = "";

    const authorId = this.author?.id ?? null;

    // Conceal effects that the user cannot apply.
    for (const el of chatCard.querySelectorAll(".effects-tray .effect")) {
      if (
        !game.user.isGM &&
        (el.dataset.transferred === "false" || authorId !== game.user.id)
      ) {
        el.remove();
      }
    }

    // If the user is the message author or the actor owner, proceed.
    const actor = game.actors.get(this.speaker.actor);
    if (game.user.isGM || actor?.isOwner || authorId === game.user.id) {
      const summonsButton = chatCard.querySelector(
        'button[data-action="summon"]'
      );
      if (summonsButton && !SummonsData.canSummon)
        summonsButton.style.display = "none";
      const template = chatCard.querySelector(
        'button[data-action="placeTemplate"]'
      );
      if (template && !game.user.can("TEMPLATE_CREATE"))
        template.style.display = "none";
      return;
    }

    // Otherwise conceal action buttons except for saving throw.
    for (const btn of chatCard.querySelectorAll(
      "button[data-action]:not(.apply-effect)"
    )) {
      if (
        ["save", "rollRequest", "concentration"].includes(btn.dataset.action)
      ) {
        continue;
      }
      btn.style.display = "none";
    }
  }

  /* -------------------------------------------- */

  /**
   * Augment the chat card markup for additional styling.
   * @param {HTMLElement} html  The chat card markup.
   * @protected
   */
  _enrichChatCard(html) {
    // Header matter
    const { scene: sceneId, token: tokenId, actor: actorId } = this.speaker;
    game.scenes.get(sceneId)?.tokens.get(tokenId)?.actor ??
      game.actors.get(actorId);
    // let img;
    let nameText;
    if (this.isContentVisible) {
      nameText = this.alias;
    } else {
      nameText = this.author?.name ?? game.user?.name ?? "";
    }

    const avatar = document.createElement("div");
    const name = document.createElement("span");
    name.classList.add("name-stacked");
    name.innerHTML = `<span class="title">${nameText}</span>`;

    const sender = html.querySelector(".message-sender");
    sender?.replaceChildren(avatar, name);
    html.querySelector(".whisper-to")?.remove();

    // Context menu
    const metadata = html.querySelector(".message-metadata");
    if (metadata) {
      metadata.querySelector(".message-delete")?.remove();
      const anchor = document.createElement("a");
      anchor.setAttribute(
        "aria-label",
        game.i18n.localize("MULTIVERSE_D616.AdditionalControls")
      );
      anchor.classList.add("chat-control");
      anchor.dataset.contextMenu = "";
      anchor.innerHTML = '<i class="fas fa-ellipsis-vertical fa-fw"></i>';
      metadata.appendChild(anchor);
    }

    // SVG icons
    for (const el of html.querySelectorAll("i.multiverse-d616-icon")) {
      const icon = document.createElement("multiverse-d616-icon");
      icon.src = el.dataset.src;
      el.replaceWith(icon);
    }

    // Enriched roll flavor
    this.rolls;

    if (this.isContentVisible) {
      const chatCard = document.createElement("div");
      chatCard.classList.add("multiverse-d616", "chat-card");
      chatCard.innerHTML = `
        <section class="card-header description">
          <header class="summary">
            <div class="name-stacked">
              <span class="title">${this.title ?? ""}</span>
            </div>
          </header>
        </section>
      `;
      html
        .querySelector(".message-content")
        .insertAdjacentElement("afterbegin", chatCard);

      const flavorText = html.querySelector("span.flavor-text");
      const initiativeContext = mmInitiativeContext(this);
      const isInitiative = mmIsInitiativeMessage(this, flavorText);
      const initiativeModifier = String(initiativeContext?.modifier ?? "");
      const initiativeResolved = initiativeContext?.resolved === true;
      const canAdjustInitiative = mmCanAdjustInitiativeMessage(this);

      const combatTrickeryFlag = this.getFlag(M616_SYSTEM_ID, "combatTrickery");
      for (const el of html.querySelectorAll("button.retroEdgeMode")) {
        const action = String(el.dataset.retroAction ?? "");
        const dieIndex = Number(el.dataset.index ?? -1);
        if (
          combatTrickeryFlag?.noMarvelTrouble &&
          action === "trouble" &&
          dieIndex === 1
        ) {
          el.hidden = true;
          el.disabled = true;
          continue;
        }

        if (isInitiative) {
          el.setAttribute("data-initiative", "true");
        }

        if (isInitiative && initiativeContext) {
          const action = String(el.dataset.retroAction ?? "");
          const allowed =
            canAdjustInitiative &&
            !initiativeResolved &&
            !!initiativeModifier &&
            action === initiativeModifier;
          el.hidden = !allowed;
          el.disabled = !allowed;
          if (!allowed) continue;
        }

        el.addEventListener("click", this._onClickRetroButton.bind(this));
      }

      if (
        isInitiative &&
        initiativeContext &&
        initiativeModifier &&
        !initiativeResolved &&
        canAdjustInitiative
      ) {
        const actionRow = html.querySelector(".mm-roll-actions");
        if (actionRow && !actionRow.querySelector(".m616-initiative-keep")) {
          const keepButton = document.createElement("button");
          keepButton.type = "button";
          keepButton.className = "m616-initiative-keep";
          keepButton.title = "Manter o resultado atual e finalizar a iniciativa";
          keepButton.innerHTML = "<span>Manter iniciativa</span>";
          keepButton.addEventListener("click", async (event) => {
            event.preventDefault();
            event.stopPropagation();
            keepButton.disabled = true;
            try {
              const message = game.messages.get(this.id) ?? this;
              const now = Date.now();
              const updated =
                (await message.update({
                  [`flags.${M616_SYSTEM_ID}.${M616_INITIATIVE_FLAG}.resolved`]: true,
                  [`flags.${M616_SYSTEM_ID}.${M616_INITIATIVE_FLAG}.resolution`]: "kept",
                  [`flags.${M616_SYSTEM_ID}.${M616_INITIATIVE_FLAG}.resolvedAt`]: now,
                })) ?? message;
              await mmResolveInitiativeResult(updated, null);
            } catch (error) {
              console.error(
                `[${M616_SYSTEM_ID}] Could not keep the current initiative result`,
                error
              );
              ui.notifications?.error?.("Não foi possível finalizar esta iniciativa.");
              keepButton.disabled = false;
            }
          });
          actionRow.appendChild(keepButton);
        }
      }
      let damageButton = html.querySelector("button.damage");
      // Follow-up rolls must have their own independent DAMAGE action, even
      // when the original roll template does not render that button.
      const repeatedOrHeld = Boolean(this.getFlag(M616_SYSTEM_ID,'repeatAttack')?.step ||
        this.getFlag(M616_SYSTEM_ID,'heldFollowUp'));
      if (!damageButton && repeatedOrHeld) {
        const row = html.querySelector('.mm-roll-actions') ?? html.querySelector('.message-content');
        if(row){
          damageButton=document.createElement('button');
          damageButton.className='damage';damageButton.type='button';
          damageButton.textContent='DAMAGE';row.appendChild(damageButton);
        }
      }
      // Power checks often render without a DAMAGE button in the base template.
      // Create it explicitly on a Fantastic roll; the handler still verifies
      // the target's defense and filters out normal successes/failures.
      const pendingFantastic = this.getFlag("multiverse-d616", "fantasticDamageOnly") === true &&
        getMarvelOutcome(this.rolls?.[0],1)?.fantastic === true;
      if (!damageButton && pendingFantastic) {
        const row = html.querySelector('.mm-roll-actions') ?? html.querySelector('.message-content');
        if (row) {
          damageButton = document.createElement('button');
          damageButton.className = 'damage';
          damageButton.type = 'button';
          damageButton.textContent = 'DAMAGE';
          row.appendChild(damageButton);
        }
      }
      const isPowerCheck = this.getFlag("multiverse-d616", "powerCheck") === true;
      const fantasticDamageOnly = this.getFlag("multiverse-d616", "fantasticDamageOnly") === true;
      const fantasticRoll = getMarvelOutcome(this.rolls?.[0],1)?.fantastic === true;
      // Jinx You and Flare cause damage ONLY on Fantastic success; preserve
      // their action then, with an explicit reminder of that rule.
      if (isInitiative || (isPowerCheck && !(fantasticDamageOnly && fantasticRoll))) {
        // Initiative and non-damaging power checks never generate a damage action.
        damageButton?.remove();
      } else {
        if (isPowerCheck && damageButton) {
          damageButton.title = "Aplicar dano apenas com Sucesso Fantástico, conforme a descrição do poder";
        }
        damageButton?.addEventListener(
          "click",
          this._onClickDamageButton.bind(this)
        );
      }

      html
        .querySelector("button.spend-focus")
        ?.addEventListener("click", this._onClickSpendFocusButton.bind(this));

      // Show/hide focus controls + render focus spend info (persists across re-renders).
      this._enrichFocusControls(html);
    }
  }

  /**
   * Show/hide the spend focus button and render focus spend summary on the roll card.
   * @param {HTMLLIElement} html
   */
  _enrichFocusControls(html) {
    const focusBtn = html.querySelector("button.spend-focus");
    const info = html.querySelector(".mm-focus-info");
    if (!focusBtn || !info) return;

    // Resolve actor and item (synchronously where possible).
    const { scene: sceneId, token: tokenId, actor: actorId } = this.speaker;
    const actor =
      game.scenes.get(sceneId)?.tokens.get(tokenId)?.actor ??
      game.actors.get(actorId);
    const itemId = this.getFlag("multiverse-d616", "itemId");
    const item = actor?.items?.get?.(itemId) ?? null;

    const costText = item?.system?.cost ?? "";
    const cost = mmParseFocusCost(costText);

    // New workflow: when the power auto-spends Focus on use, hide the button.
    const focusAuto = Boolean(this.getFlag("multiverse-d616", "focusAuto"));

    // Default hidden unless the message is associated to an item with Focus cost.
    const show = Boolean(item && cost.hasFocus && (cost.min ?? 0) > 0 && !focusAuto);
    focusBtn.style.display = show ? "" : "none";

    // Render info line when Focus has been spent.
    const spent = Number(this.getFlag("multiverse-d616", "focusSpent") ?? 0);
    const bonus = Number(
      this.getFlag("multiverse-d616", "focusDamageBonus") ?? 0
    );
    const ruleSummary = String(
      this.getFlag("multiverse-d616", "focusRule") ?? ""
    ).trim();

    if (spent > 0) {
      info.style.display = "";
      const parts = [`FOCUS: ${spent}`];
      if (bonus) parts.push(`BÔNUS: +${bonus}`);
      if (ruleSummary) parts.push(ruleSummary);
      info.textContent = parts.join(" | ");
    } else {
      info.style.display = "none";
      info.textContent = "";
    }
  }

  /* -------------------------------------------- */

  /**
   * Augment attack cards with additional information.
   * @param {HTMLLIElement} html   The chat card.
   * @protected
   */
  async _enrichAttackTargets(html) {
    // Remove any prior evaluation block (re-renders happen after retro Edge/Trouble).
    for (const el of html.querySelectorAll("ul.multiverse-d616.evaluation, .m616-power-check-tn")) {
      el.remove();
    }

    const [attackRoll] = this.rolls ?? [];
    if (!attackRoll) return;

    // Attack ability and configured target defense are separate values.
    // Example: Telekinetic Barrier rolls Logic but explicitly targets Agility.
    let abilityAbr = this.getFlag("multiverse-d616", "ability") ?? null;
    let attackTargetAbr = this.getFlag("multiverse-d616", "attackTarget") ?? null;
    const flavorText = this.flavor ?? "";

    const mmD616NormalizeAbilityKey = (value) => {
      const key = String(value ?? "").trim().toLowerCase();
      const aliases = {
        mle: "mle", melee: "mle",
        agl: "agl", agility: "agl",
        res: "res", resilience: "res",
        vig: "vig", vigilance: "vig",
        ego: "ego",
        log: "log", logic: "log",
      };
      return aliases[key] ?? null;
    };

    // Hidden marker we add in flavor for roll messages
    if (!abilityAbr) {
      const abbr = /\[ability\]\s(?<abbr>[\w-]+)/i.exec(flavorText)?.groups?.abbr;
      if (abbr) abilityAbr = abbr;
    }

    // Visible label fallback: "ability: Agility"
    if (!abilityAbr) {
      const name = /ability:\s*(?<name>[^<\n,]+)/i
        .exec(flavorText)
        ?.groups?.name?.trim();
      if (name) {
        abilityAbr =
          MULTIVERSE_D616?.damageAbilityAbr?.[name] ??
          MULTIVERSE_D616?.damageAbilityAbr?.[name.toLowerCase()] ??
          null;
      }
    }

    abilityAbr = mmD616NormalizeAbilityKey(abilityAbr);
    attackTargetAbr = mmD616NormalizeAbilityKey(attackTargetAbr);

    // Backward compatibility for cards created before attackTarget was persisted:
    // recover the defense configured on the original Power/Weapon when possible.
    if (!attackTargetAbr) {
      try {
        const { scene: sceneId, token: tokenId, actor: actorId } = this.speaker ?? {};
        const sourceActor =
          game.scenes.get(sceneId)?.tokens.get(tokenId)?.actor ??
          game.actors.get(actorId);
        const itemId = this.getFlag("multiverse-d616", "itemId");
        const sourceItem = sourceActor?.items?.get?.(itemId) ?? null;
        attackTargetAbr = mmD616NormalizeAbilityKey(sourceItem?.system?.attackTarget);
      } catch (e) {
        // Keep the legacy fallback below if the source item no longer exists.
      }
    }

    // Unopposed power checks (fixed TN or Narrator-defined difficulty) must
    // NEVER be measured against an unrelated marked target's ability defense.
    // Preserve the old same-ability fallback only for real attacks.
    const powerCheckOnly = this.getFlag("multiverse-d616", "powerCheck") === true;
    if (!attackTargetAbr && !powerCheckOnly) attackTargetAbr = abilityAbr;

    // Determine targets: always use the targets saved on the message (set at roll time by the rolling user).
    // If missing, ONLY the message author will auto-capture their current local targets and persist them,
    // so every client sees the same target list.
    let targets = powerCheckOnly && !attackTargetAbr
      ? []
      : (this.getFlag("multiverse-d616", "targets") ?? []);

    if (!targets?.length && (!powerCheckOnly || attackTargetAbr)) {
      const authorId = this.author?.id ?? null;
      if (authorId && game.user?.id === authorId) {
        const localTargets = mmD616CollectLocalTargets();
        if (localTargets?.length) {
          try {
            await this.setFlag("multiverse-d616", "targets", localTargets);
          } catch (e) {
            console.warn(
              "[multiverse-d616] Failed to persist targets on chat message",
              e
            );
          }
          targets = localTargets;
        }
      }
    }

    const fixedTN = Number(this.getFlag("multiverse-d616", "powerTargetNumber") ?? 0);
    if (!targets?.length && !(fixedTN > 0)) return;

    // Determine whether the *kept* Marvel die result is Fantastic (after retro Edge/Trouble).
    let isFantastic = false;
    try {
      const firstTerm = attackRoll?.terms?.[0];
      let pool = null;
      if (
        firstTerm instanceof foundry.dice.terms.ParentheticalTerm &&
        firstTerm.roll?.terms?.[0] instanceof foundry.dice.terms.PoolTerm
      ) {
        pool = firstTerm.roll.terms[0];
      } else if (firstTerm instanceof foundry.dice.terms.PoolTerm) {
        pool = firstTerm;
      }
      const marvelRoll = pool?.rolls?.[1];
      const marvelDie =
        marvelRoll?.dice?.find(
          (d) => d instanceof game.MarvelMultiverse.dice.MarvelDie
        ) ??
        marvelRoll?.terms?.find?.(
          (t) => t instanceof game.MarvelMultiverse.dice.MarvelDie
        );

      const activeResults =
        marvelDie?.results?.filter((r) => r.active && !r.discarded) ?? [];
      isFantastic = activeResults.some((r) => r.result === 1);
    } catch (e) {
      // If something goes wrong, fall back to the roll property.
      isFantastic = !!attackRoll.isFantastic;
    }

    const total = Number.isFinite(attackRoll.total) ? attackRoll.total : 0;
    const naturalUltimate = hasNaturalUltimateFantastic(attackRoll, isFantastic);
    const isCheck = this.getFlag("multiverse-d616", "powerCheck") === true;
    const esc = foundry.utils.escapeHTML;
    const fixedTNResult = fixedTN > 0
      ? checkPowerOutcome(total, fixedTN, {fantastic: isFantastic, ultimate: naturalUltimate})
      : null;
    if (fixedTNResult) {
      const info = document.createElement("div");
      info.classList.add("m616-power-check-tn");
      info.textContent = `TESTE — TN ${fixedTN} | Total ${total} | ${fixedTNResult.label}`;
      html.querySelector(".message-content")?.appendChild(info);
    }
    const isGM = !!game.user?.isGM;
    const hitText = game.i18n.localize("MULTIVERSE_D616.hit");
    const missText = game.i18n.localize("MULTIVERSE_D616.miss");
    const targetText = "ALVO";
    const evaluation = document.createElement("ul");
    evaluation.classList.add("multiverse-d616", "evaluation");

    const resolveTokenDocFromUuid = async (uuid) => {
      try {
        if (!uuid) return null;
        const doc = await fromUuid(uuid);
        // TokenDocument has documentName "Token"
        return doc?.documentName === "Token" ? doc : null;
      } catch (e) {
        return null;
      }
    };


    // Trait-based defense swaps (Marvel Multiverse rules) applied on the *target*.
    // IMPORTANT: these swaps are keyed to the DEFENSE being targeted by the attack,
    // not to the ability used to make the roll. This matters for powers such as
    // Telekinetic Grab (Logic vs Melee): a target with Evasion defends with Agility.
    // Brawling: attacks targeting Agility are defended with Melee.
    // Evasion: attacks targeting Melee are defended with Agility.
    // Wisdom: attacks targeting Logic are defended with Ego.
    // Integrity: attacks targeting Ego are defended with Logic.
    const mmD616Norm = (s) => String(s ?? "").trim().toLowerCase();

    const mmD616HasNamedTrait = (actor, traitName) => {
      const want = mmD616Norm(traitName);
      const items = actor?.items?.contents ?? (actor?.items ? Array.from(actor.items) : []);
      for (const it of items) {
        if (!it) continue;
        const t = it.type ?? "";
        if (t && !["trait", "power"].includes(t)) continue;
        const n = mmD616Norm(it.name);
        if (n === want || n.startsWith(`${want} `) || n.startsWith(`${want} (`)) return true;
      }
      return hasEquipmentPermanentPower(actor,traitName);
    };

    const mmD616ResolveDefenseAbility = (attackAbr, configuredDefenseAbr, actor) => {
      // The Power/Weapon's attackTarget is the defense the incoming attack actually
      // challenges. Defensive Basic powers therefore react to that targeted defense,
      // even when the roll itself uses a different ability (for example Logic vs Melee).
      let def = configuredDefenseAbr || attackAbr;
      if (!actor || !def) return def;
      if (def === "agl" && mmD616HasNamedTrait(actor, "Brawling")) def = "mle";
      else if (def === "mle" && mmD616HasNamedTrait(actor, "Evasion")) def = "agl";
      else if (def === "log" && mmD616HasNamedTrait(actor, "Wisdom")) def = "ego";
      else if (def === "ego" && mmD616HasNamedTrait(actor, "Integrity")) def = "log";
      return def;
    };

        const decisionSignature=this.getFlag('multiverse-d616','multiTargetDecisionRollSignature');
    const targetDecisions=decisionSignature===rollSignature(attackRoll)
      ?(this.getFlag("multiverse-d616",MULTI_TARGET_DECISION_KEY)??{}):{};
    const mixedConditions=this.getFlag("multiverse-d616","conditionEdges")?.ambiguousTargets===true;
    const resolved = await Promise.all(
      targets.map(async (t) => {
        const tokenDoc = await resolveTokenDocFromUuid(t.uuid);
        const a = tokenDoc?.actor ?? null;
        const defenseAbr = isGM && (abilityAbr || attackTargetAbr)
          ? mmD616ResolveDefenseAbility(abilityAbr, attackTargetAbr, a) : null;
        const currentAc = isGM && defenseAbr && a?.system?.abilities?.[defenseAbr]?.defense != null
          ? a.system.abilities[defenseAbr].defense : null;
        const crossing = isGM && tokenDoc
          ? findCrossingElementalBarrier(tokenDoc.parent,
            game.scenes?.get?.(this.speaker?.scene)?.tokens?.get?.(this.speaker?.token),tokenDoc)
          : null;
        const name=tokenDoc?.name??t.name??a?.name??'Target';
        const shownName=crossing?`${name} — ${crossing.guard.name}`:name;
        const img=tokenDoc?.texture?.src??t.img??a?.img??'';
        const defense=crossing?guardTargetDefense(crossing.actor,crossing.guard)
          :(currentAc==null?null:Number(currentAc));
        const calculated=isGM && defense!=null
          ? checkPowerOutcome(total,defense,{fantastic:isFantastic,ultimate:naturalUltimate}):null;
        const result=calculated?adjudicateTargetOutcome(calculated,{
          requiresReview:mixedConditions&&!crossing,
          decision:targetDecisions[t.uuid],
        }):null;
        const resultText=result
          ?(result.pending?'REVISAR EDGE/TROUBLE':isCheck?result.label:result.success?hitText:missText)
          :targetText;
        const outcomeClass=result&&!result.pending?(result.success?'hit':'miss'):'';
        const perTargetEdges=this.getFlag('multiverse-d616','targetConditionEdges')?.[t.uuid];
        const separateModifier=perTargetEdges
          ? `<small class="m616-target-condition-note">${perTargetEdges.net>0?`${perTargetEdges.net} Edge`:
              perTargetEdges.net<0?`${Math.abs(perTargetEdges.net)} Trouble`:'Edge/Trouble cancelados'} — ${esc((perTargetEdges.sources??[]).map(x=>x.source).join(', ')||'Poder/condições')}</small>`:'';
        const decisionNote=mixedConditions&&targetDecisions[t.uuid]&&isGM
          ? `<span class="m616-target-decided">Mestre: ${esc(targetDecisions[t.uuid])}</span>`:'';
        const reviewControls=result?.pending && isGM
          ? `${separateModifier}<div class="m616-target-review"> <button type="button" data-target-decision="hit" data-target-uuid="${esc(t.uuid)}">Confirmar acerto</button><button type="button" data-target-decision="miss" data-target-uuid="${esc(t.uuid)}">Confirmar falha</button></div>`
          : `${separateModifier}${decisionNote}`;
        return `<li data-uuid="${esc(t.uuid??'')}" class="target ${outcomeClass}">
          <img src="${esc(img??'')}" alt="${esc(name)}">
          <div class="name-stacked"><span class="title">${esc(shownName)}</span>${reviewControls}</div>
          <div class="result">${esc(resultText)}</div>
        </li>`;
      })
    );
    evaluation.innerHTML = resolved.join("");

    // The GM must resolve target-specific Edge/Trouble before applying damage.
    // Buttons are bound to this message only; no extra attack or Focus is spent.
    if(isGM)for(const button of evaluation.querySelectorAll('[data-target-decision]')){
      button.addEventListener('click',async (event)=>{
        event.preventDefault();event.stopPropagation();button.disabled=true;
        try{
          const uuid=button.dataset.targetUuid;
          const decision=button.dataset.targetDecision;
          if(!['hit','miss'].includes(decision)||!uuid)return;
          const signature=rollSignature(this.rolls?.[0]);
          const current=this.getFlag('multiverse-d616','multiTargetDecisionRollSignature')===signature
            ?(this.getFlag('multiverse-d616',MULTI_TARGET_DECISION_KEY)??{}):{};
          await this.update({'flags.multiverse-d616.multiTargetDecisionRollSignature':signature,
            'flags.multiverse-d616.multiTargetDecisions':{...current,[uuid]:decision}});
        }catch(error){console.error('[D616] Falha ao decidir resultado individual',error);ui.notifications?.error?.('Não foi possível registrar a decisão do Mestre.');button.disabled=false;}
      });
    }

    const messageContent = html.querySelector(".message-content");
    messageContent?.appendChild(evaluation);

    const elementalFantastic = this.getFlag("multiverse-d616", "elementalFantastic");
    if (isFantastic && elementalFantastic?.key && elementalFantastic?.text) {
      html.querySelector(".m616-elemental-fantastic")?.remove();
      const elemental = document.createElement("div");
      elemental.className = "m616-elemental-fantastic";
      elemental.innerHTML = `<b>EFEITO ELEMENTAL — ${esc(String(elementalFantastic.label ?? elementalFantastic.key).toUpperCase())}</b><br>${esc(elementalFantastic.text)}`;
      messageContent?.appendChild(elemental);
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle dice roll expansion.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  _onClickDiceRoll(event) {
    event.stopPropagation();
    const eventTarget = event.currentTarget;
    eventTarget.classList.toggle("expanded");
  }

  /**
   * Handle clicking damage button.
   * @param {PointerEvent} event      The initiating click event.
   */
  async _onClickDamageButton(event) {
    event.preventDefault();
    event.stopPropagation();
    const eventTarget = event.currentTarget;
    const messageId =
      eventTarget.closest("[data-message-id]")?.dataset?.messageId;
    const messageHeader = eventTarget.closest("li.chat-message");
    const flavorText =
      messageHeader?.querySelector("span.flavor-text")?.innerHTML ??
      this.flavor ??
      "";

    await this._handleDamageChatButton(messageId, flavorText);
  }

  /**
   * Handle clicking the spend Focus button.
   * @param {PointerEvent} event
   */
  _onClickSpendFocusButton(event) {
    event.stopPropagation();
    const eventTarget = event.currentTarget;
    const messageId =
      eventTarget.closest("[data-message-id]").dataset.messageId;

    this._handleSpendFocusChatButton(messageId);
  }

  /**
   * Spend Focus for a Power roll card (fixed or variable) and persist the result on the chat message.
   * Rule: A character can spend up to 5×Rank Focus on a single power use.
   *
   * Stores:
   * - flags.multiverse-d616.focusSpent
   * - flags.multiverse-d616.focusDamageBonus
   * - flags.multiverse-d616.focusRule
   */
  async _handleSpendFocusChatButton(messageId) {
    const chatMessage = game.messages.get(messageId);
    if (!chatMessage) return;

    // Resolve actor (supports unlinked tokens).
    const { scene: sceneId, token: tokenId, actor: actorId } = chatMessage.speaker;
    let actor = game.scenes.get(sceneId)?.tokens.get(tokenId)?.actor;
    if (!actor && sceneId && tokenId) {
      try {
        const tokenDoc = await fromUuid(`Scene.${sceneId}.Token.${tokenId}`);
        actor = tokenDoc?.actor;
      } catch (e) {
        // ignore
      }
    }
    actor ??= game.actors.get(actorId);
    if (!actor) {
      ui.notifications?.warn("Nenhum Actor encontrado para gastar Focus.");
      return;
    }

    const itemId = chatMessage.getFlag("multiverse-d616", "itemId");
    const item = actor.items?.get?.(itemId) ?? null;
    if (!item) {
      ui.notifications?.warn("Nenhum Poder associado a este card.");
      return;
    }

    const cost = mmParseFocusCost(item.system?.cost ?? "");
    if (!cost.hasFocus || (cost.min ?? 0) <= 0) {
      ui.notifications?.info("Este poder não possui custo de Focus.");
      return;
    }

    const rank = Number(actor.system?.attributes?.rank?.value ?? 1);
    const maxSpend = Math.max(0, 5 * (Number.isFinite(rank) ? rank : 1));

    const prevSpent = Number(chatMessage.getFlag("multiverse-d616", "focusSpent") ?? 0);
    const actorFocus = Number(actor.system?.focus?.value ?? 0);
    const available = actorFocus + (Number.isFinite(prevSpent) ? prevSpent : 0);

    // Determine desired total spend.
    let newSpent = 0;

    if (cost.type === "fixed") {
      newSpent = cost.fixed ?? cost.min ?? 0;
    } else {
      const min = cost.min ?? 0;
      const maxTotal = Math.min(maxSpend, available);

      if (maxTotal < min) {
        ui.notifications?.warn(
          `Focus insuficiente. Mínimo ${min}, disponível ${available}, limite ${maxSpend}.`
        );
        return;
      }

      const currentTotal = prevSpent > 0 ? mmClampNumber(prevSpent, min, maxTotal) : min;
      const currentExtra = Math.max(0, currentTotal - min);
      const maxExtra = Math.max(0, maxTotal - min);
      const scaling = mmParseFocusScaling(item.system?.effect ?? "");
      const scalingHelp = scaling
        ? `Este poder escala: +${scaling.per} bônus de dano${scaling.ability ? ` ${scaling.ability}` : ""} a cada ${scaling.step} Focus gasto.`
        : "Não consegui identificar automaticamente o escalonamento no campo EFEITO."
      ;

      // Ask "extra" beyond minimum.
      newSpent = await promptD616FocusExtra({
        title:`Gastar Focus — ${item.name}`,
        min,maxTotal,available,maxSpend,currentExtra,scalingHelp,
      });

      if (newSpent === null) return;
    }

    newSpent = Math.max(0, Number(newSpent ?? 0));

    // Enforce max spend.
    if (newSpent > maxSpend) {
      ui.notifications?.warn(
        `Limite excedido: máximo ${maxSpend} Focus (5×Rank).`
      );
      return;
    }

    // Ensure available (considering possible previous spend).
    if (newSpent > available) {
      ui.notifications?.warn(
        `Focus insuficiente: quer gastar ${newSpent}, mas só tem ${available} disponível.`
      );
      return;
    }

    // Apply delta (supports re-adjusting).
    const delta = newSpent - (Number.isFinite(prevSpent) ? prevSpent : 0);
    const newActorFocus = actorFocus - delta;
    if (newActorFocus < 0) {
      ui.notifications?.warn(
        `Focus insuficiente: faltam ${Math.abs(newActorFocus)} Focus.`
      );
      return;
    }

    const { bonus, summary } = mmComputeFocusDamageBonus(item.system?.effect ?? "", newSpent);

    await actor.update({ "system.focus.value": newActorFocus });
    await chatMessage.update({
      "flags.multiverse-d616.focusSpent": newSpent,
      "flags.multiverse-d616.focusDamageBonus": bonus ?? 0,
      "flags.multiverse-d616.focusRule": summary ?? "",
    });

    ui.notifications?.info(
      `Focus aplicado: ${newSpent} (−${delta >= 0 ? delta : 0}${delta < 0 ? `, reembolsou ${Math.abs(delta)}` : ""}).`
    );
  }

  /**
   * Handles the damage from the chat log
   * @param {string} messageId
   * @param {string} ability
   * @param {string} fantastic
   */

  async _handleDamageChatButton(messageId, flavorText) {
    const chatMessage = game.messages.get(messageId);
    if (!chatMessage) {
      ui.notifications?.warn(
        "[multiverse-d616] O card de ataque não foi encontrado."
      );
      return;
    }

    // Prefer structured flags written when the attack was rolled. Flavor parsing
    // remains only for legacy cards.
    let abilityAbr = String(
      chatMessage.getFlag("multiverse-d616", "ability") ?? ""
    ).toLowerCase();
    let ability =
      MULTIVERSE_D616.damageAbility[abilityAbr] ??
      /ability:\s*(?<ability>[^<,\n]+)/i
        .exec(flavorText ?? "")
        ?.groups?.ability?.trim() ??
      "";

    if (!abilityAbr) {
      const abilityEntry = Object.entries(
        MULTIVERSE_D616.damageAbilityAbr
      ).find(([name]) => name.toLowerCase() === ability.toLowerCase());
      abilityAbr = abilityEntry?.[1] ?? ability.toLowerCase();
    }

    if (!Object.prototype.hasOwnProperty.call(
      MULTIVERSE_D616.damageAbility,
      abilityAbr
    )) {
      ui.notifications?.error(
        `[multiverse-d616] Não foi possível identificar a habilidade do ataque (${ability || "sem habilidade"}).`
      );
      return;
    }

    ability = MULTIVERSE_D616.damageAbility[abilityAbr] ?? abilityAbr;

    const legacyDamageType =
      /damagetype:\s*(?<damageType>[\w-]+)/i
        .exec(flavorText ?? "")
        ?.groups?.damageType ?? "";
    const damageType =
      String(
        chatMessage.getFlag("multiverse-d616", "damageType") ??
          legacyDamageType
      ).toLowerCase() === "focus"
        ? "focus"
        : "health";

    // Focus spend (optional) recorded on the originating roll card.
    const focusBonus = Number(
      chatMessage.getFlag("multiverse-d616", "focusDamageBonus") ?? 0
    );
    const focusSpent = Number(
      chatMessage.getFlag("multiverse-d616", "focusSpent") ?? 0
    );

    // Resolve the 616 pool term robustly (supports ParentheticalTerm wrappers)
    const [roll] = chatMessage.rolls ?? [];
    const firstRollTerm = roll?.terms?.[0];
    let sixOneSixPool;

    if (
      firstRollTerm instanceof foundry.dice.terms.ParentheticalTerm &&
      firstRollTerm.roll?.terms?.[0] instanceof foundry.dice.terms.PoolTerm
    ) {
      sixOneSixPool = firstRollTerm.roll.terms[0];
    } else if (firstRollTerm instanceof foundry.dice.terms.PoolTerm) {
      sixOneSixPool = firstRollTerm;
    } else {
      sixOneSixPool = firstRollTerm;
    }

    const marvelRoll = sixOneSixPool?.rolls?.[1];
    const marvelDie =
      marvelRoll?.dice?.find(
        (d) => d instanceof game.MarvelMultiverse.dice.MarvelDie
      ) ??
      marvelRoll?.terms?.find?.(
        (t) => t instanceof game.MarvelMultiverse.dice.MarvelDie
      );

    // Determine the kept Marvel Die result (after Edge/Trouble retro rolls)
    const activeMarvelResults =
      marvelDie?.results?.filter((r) => r.active && !r.discarded) ?? [];
    let marvelTotal = 0;
    let isFantastic = false;

    if (activeMarvelResults.length) {
      marvelTotal = activeMarvelResults.reduce((sum, r) => {
        if (r.result === 1) {
          isFantastic = true;
          return sum + 6;
        }
        const v = r.count ?? r.result ?? 0;
        return sum + v;
      }, 0);
    } else if (marvelDie) {
      // Fallback for older messages: rely on term total
      marvelTotal = marvelDie.total ?? 0;
      isFantastic =
        (marvelDie.results ?? []).some(
          (r) => r.active && !r.discarded && r.result === 1
        ) ?? false;
    }

    // Resolve the attacker actor robustly.
    // IMPORTANT: when rolling from an *unlinked token*, chatMessage.alias is the *token name*
    // (often different from the Actor name). If we look up the Actor by alias, we can get undefined.
    let actor;
    if (chatMessage?.speaker?.scene && chatMessage?.speaker?.token) {
      const tokenDoc = await fromUuid(
        `Scene.${chatMessage.speaker.scene}.Token.${chatMessage.speaker.token}`
      );
      actor = tokenDoc?.actor;
    }
    actor ??= chatMessage?.speaker?.actor
      ? game.actors.get(chatMessage.speaker.actor)
      : null;
    actor ??=
      game.actors.getName?.(chatMessage.alias) ??
      game.actors.contents.find((a) => a.name === chatMessage.alias);

    if (!actor) {
      ui.notifications?.error(
        `[multiverse-d616] Não foi possível localizar o Ator do atacante para calcular o dano (alias: ${chatMessage.alias}).`
      );
      return;
    }

    // Damage Multiplier context (stored on the originating roll card).
    // Weapon bonuses MUST NOT apply passively; they only apply to the attack/item
    // that created this chat message. The greater bonus wins; penalties still apply.
    const dmFlags =
      chatMessage.getFlag("multiverse-d616", "damageMultiplier") ?? {};
    const itemId = chatMessage.getFlag("multiverse-d616", "itemId");
    const item = itemId ? actor.items?.get?.(itemId) ?? null : null;
    const weaponBonusFromItem =
      item?.type === "weapon" && item.system?.equipped
        ? Number(item.system?.damageMultiplierBonus ?? 0) || 0
        : 0;

    let baseDamageMultiplier = Number(dmFlags.base ?? NaN);
    let otherBonus = Number(dmFlags.otherBonus ?? NaN);
    let otherPenalty = Number(dmFlags.otherPenalty ?? 0);
    let weaponBonus = Number(dmFlags.weaponBonus ?? NaN);

    // Backward-compatible fallback for cards created before the context flags.
    if (!Number.isFinite(baseDamageMultiplier)) {
      const ctx = mmGetDamageMultiplierContext(actor, abilityAbr);
      baseDamageMultiplier = Number(ctx.base ?? 0) || 0;
      otherBonus = Number(ctx.otherBonus ?? 0) || 0;
      otherPenalty = Number(ctx.otherPenalty ?? 0) || 0;
    }
    if (!Number.isFinite(otherBonus)) otherBonus = 0;
    if (!Number.isFinite(otherPenalty)) otherPenalty = 0;
    if (!Number.isFinite(weaponBonus)) weaponBonus = weaponBonusFromItem;

    const effectiveBonus = Number.isFinite(Number(dmFlags.effectiveBonus))
      ? Number(dmFlags.effectiveBonus)
      : Math.max(weaponBonus, otherBonus);

    const damageMultiplier = Number.isFinite(Number(dmFlags.finalDM))
      ? Number(dmFlags.finalDM)
      : baseDamageMultiplier + otherPenalty + effectiveBonus;

    const abilityValue =
      Number(actor.system?.abilities?.[abilityAbr]?.value ?? 0) || 0;

    // The authoritative targets are the UUIDs captured on the attack message.
    // Only legacy cards without saved targets may capture the author's current
    // targets, and those targets are immediately persisted on the old card.
    let targetRefs = chatMessage.getFlag("multiverse-d616", "targets") ?? [];
    targetRefs = (Array.isArray(targetRefs) ? targetRefs : [])
      .map((target) =>
        typeof target === "string" ? { uuid: target } : { ...target }
      )
      .filter((target) => target?.uuid);

    if (!targetRefs.length && chatMessage.isAuthor) {
      targetRefs = mmD616CollectLocalTargets();
      if (targetRefs.length) {
        await chatMessage.setFlag(
          "multiverse-d616",
          "targets",
          targetRefs
        );
        ui.notifications?.warn(
          "[multiverse-d616] Card antigo sem alvos salvos: os alvos atuais do autor foram registrados neste card."
        );
      }
    }

    const resolvedTargets = [];
    const seenTargetUuids = new Set();
    for (const ref of targetRefs) {
      if (!ref?.uuid || seenTargetUuids.has(ref.uuid)) continue;
      seenTargetUuids.add(ref.uuid);

      let targetDocument = null;
      let targetActor = null;
      try {
        targetDocument = await fromUuid(ref.uuid);
        targetActor =
          targetDocument?.actor ??
          (targetDocument?.documentName === "Actor" ? targetDocument : null);
      } catch (error) {
        console.warn(
          "[multiverse-d616] Failed to resolve saved target UUID",
          ref.uuid,
          error
        );
      }

      if (!targetActor && ref.actorUuid) {
        try {
          const actorDocument = await fromUuid(ref.actorUuid);
          targetActor =
            actorDocument?.actor ??
            (actorDocument?.documentName === "Actor" ? actorDocument : null);
        } catch (error) {
          console.warn(
            "[multiverse-d616] Failed to resolve saved target actor UUID",
            ref.actorUuid,
            error
          );
        }
      }

      if (!targetActor) continue;
      resolvedTargets.push({ ref, document: targetDocument, actor: targetActor });
    }

    if (targetRefs.length && resolvedTargets.length !== targetRefs.length) {
      ui.notifications?.warn(
        "[multiverse-d616] Um ou mais alvos salvos não existem mais ou não puderam ser acessados."
      );
    }

    const esc = foundry.utils.escapeHTML;
    const focusExplain =
      focusSpent > 0
        ? ` + Focus bonus ${focusBonus} (spent ${focusSpent})`
        : "";
    const advanced = chatMessage.getFlag("multiverse-d616", "advancedElemental");
    const attackTarget=chatMessage.getFlag("multiverse-d616","attackTarget")??item?.system?.attackTarget??abilityAbr;
    const fixedTargetNumber=Number(chatMessage.getFlag("multiverse-d616","powerTargetNumber")??0)||0;
    const mixedConditions=chatMessage.getFlag("multiverse-d616","conditionEdges")?.ambiguousTargets===true;
    const decisions=chatMessage.getFlag('multiverse-d616','multiTargetDecisionRollSignature')===rollSignature(roll)
      ?(chatMessage.getFlag("multiverse-d616",MULTI_TARGET_DECISION_KEY)??{}):{};
    const attackerToken=chatMessage.speaker?.scene&&chatMessage.speaker?.token
      ?game.scenes?.get?.(chatMessage.speaker.scene)?.tokens?.get?.(chatMessage.speaker.token):null;
    const outcomes=new Map();
    for(const {ref,document,actor:target} of resolvedTargets){
      const boundary=attackerToken&&document?.documentName==='Token'
        ?findCrossingElementalBarrier(document.parent,attackerToken,document):null;
      const key=normalizeConditionDefense(attackTarget,target);
      const defense=boundary?guardTargetDefense(boundary.actor,boundary.guard)
        :fixedTargetNumber||Number(target.system?.abilities?.[key]?.defense??0);
      const base=getMarvelOutcome(roll,defense);
      const outcome=adjudicateTargetOutcome(base,{
        requiresReview:mixedConditions&&!boundary,
        decision:decisions[ref.uuid],
      });
      outcomes.set(ref.uuid,outcome);
    }
    if(!targetResultsReady([...outcomes.values()])){
      ui.notifications?.warn?.('Há alvos com Edge/Trouble diferentes. O Mestre deve confirmar seus resultados no card do ataque antes de calcular dano.');
      return;
    }
    let damageTargets=resolvedTargets.length?filterHitTargets(resolvedTargets,outcomes):resolvedTargets;
    if(advanced?.name && isAdvancedElementalPower(advanced.name)){
      damageTargets=damageTargets.filter(({ref,document})=>advancedNeedsDamage(advanced.name,outcomes.get(ref.uuid),{
        displaced:Boolean(chatMessage.getFlag('multiverse-d616',`elementalMoved_${document?.id??''}`)),
      }));
    }
    if(resolvedTargets.length&&!damageTargets.length){
      ui.notifications?.warn?.('Nenhum alvo marcado foi atingido ou cumpriu a condição de dano deste poder.');
      return;
    }
    // Venom Burst only knocks targets down on an ordinary success. It deals
    // half normal Health damage exclusively on a successful Fantastic hit.
    // Do not create an ordinary DAMAGE card for a nondamaging hit.
    if (item?.name === 'Coiling Crush' && automationEnabled('fantasticDamage') &&
        !chatMessage.getFlag('multiverse-d616','heldFollowUp') &&
        !damageTargets.some(({ref})=>outcomes.get(ref.uuid)?.fantastic)) {
      ui.notifications?.info?.('Coiling Crush: a imobilização inicial não causa dano em sucesso comum.');
      return;
    }
    if (item?.name === 'Venom Burst' && automationEnabled('fantasticDamage') &&
        !damageTargets.some(({ref})=>outcomes.get(ref.uuid)?.fantastic)) {
      ui.notifications?.info?.('Venom Burst: sucesso comum derruba o alvo; dano somente no Sucesso Fantástico.');
      return;
    }
    const damageEntries = [];
    const damageContent = damageTargets.map(({ ref, document, actor: target }) => {
      // Suppressive/Covering/Return Fire damage Focus but subtract HEALTH
      // Damage Reduction, as explicitly required by their descriptions.
      const drCategory=powerDamageReductionCategory(item?.type==='power'?item.name:null,damageType);
      const rawDamageReduction=drCategory==='focus'
        ?target.system?.focusDamageReduction
        :target.system?.healthDamageReduction;
      const piercing=applyAdamantiumToHealthDr(
        rawDamageReduction,
        chatMessage.getFlag('multiverse-d616','adamantiumHealthDrIgnore') ?? 0,
        drCategory, item?.type,
      );
      const targetFantastic=Boolean(outcomes.get(ref.uuid)?.fantastic);
      const {
        damage, rawDamage, damageReduction, effectiveDamageMultiplier,
        powerDamageFactor, specialDamage,
      } = calculatePowerDamage({
        powerName:chatMessage.getFlag('multiverse-d616','heldFollowUp')?.name==='Coiling Crush'
          ?null:(item?.type==='power'?item.name:null),
        marvelDie:marvelTotal,
        damageMultiplier,damageReduction:piercing.effectiveDr,
        ability:abilityValue,bonus:focusBonus,
        fantastic:targetFantastic,
        suppressFantastic:Boolean(advanced?.name && advanced.name!=="Elemental Suffocation"),
      });

      const targetName =
        document?.name ?? ref.name ?? target.name ?? "Target";
      const targetUuid = ref.uuid;
      const actorUuid = target.uuid ?? ref.actorUuid ?? "";

      // Shield powers compare the incoming raw attack before ordinary DR.
      // The target still receives the DR-adjusted value if not protected.

      damageEntries.push({
        rawDamage,
        targetUuid,
        actorUuid,
        name: targetName,
        category: damageType,
        damage,
        damageReduction,
        originalDamageReduction: piercing.originalDr,
        adamantiumIgnored: piercing.ignored,
        effectiveDamageMultiplier,
        hit: true,
        fantastic: targetFantastic,
        damageFactor: powerDamageFactor,
        specialDamage,
        defense: Number(outcomes.get(ref.uuid)?.targetNumber ?? 0) || undefined,
      });

      return `<p><b>${esc(targetName)}</b> takes <b>${damage} ${
        isFantastic ? "Fantastic" : ""
      } </b> ${esc(damageType)} damage.<br/> re: MarvelDie: ${
        marvelTotal
      } &#42; damage multiplier: &#40; ${baseDamageMultiplier} + bonus: ${effectiveBonus} &#61; ${damageMultiplier} - damageReduction: ${damageReduction} &#61; ${effectiveDamageMultiplier} &#41;${piercing.ignored ? ` <strong>Adamantium:</strong> RD Health ${piercing.originalDr} - ${piercing.ignored} = ${piercing.effectiveDr}.` : ''} + ${esc(
        ability
      )} score ${abilityValue} of damage${esc(focusExplain)}${specialDamage
        ? `; regra especial de ${esc(item.name)}: ${powerDamageFactor}× dano normal`
        : ''}.</p>`;
    });

    if (damageContent.length === 0) {
      const {
        damage: dmg,
        effectiveDamageMultiplier,
      } = calculateD616Damage({
        marvelDie: marvelTotal,
        damageMultiplier,
        ability: abilityValue,
        bonus: focusBonus,
        fantastic: isFantastic,
      });
      damageContent.push(
        `<p>target(s) take <b>${dmg} ${
          isFantastic ? "Fantastic" : ""
        } </b> ${esc(damageType)} damage.<br/> re: MarvelDie: ${
          marvelTotal
        } &#42; damage multiplier: ${effectiveDamageMultiplier} + ${esc(
          ability
        )} score ${abilityValue} of damage${esc(focusExplain)}.</p>`
      );
    }

    const preservedTargets = damageTargets.map(({ ref, actor: target }) => ({
      uuid: ref.uuid,
      actorUuid: target.uuid ?? ref.actorUuid ?? "",
      name: ref.name ?? target.name ?? "Target",
      img: ref.img ?? target.img ?? "",
    }));

    const msgData = {
      // Keep the same speaker so the damage message matches the token/actor used to roll.
      speaker: chatMessage.speaker ?? ChatMessageMarvel.getSpeaker({ actor: actor }),
      // The damage card is a calculation/application card, not a new roll.
      // Do not carry Edge/Trouble roll markers into it.
      flavor: mmCleanEdgeModeFlavor(flavorText),
      content: damageContent.join(""),
      flags: {
        "multiverse-d616": {
          sourceMessageId: chatMessage.id,
          targets: preservedTargets,
          authorTargets: preservedTargets.map((target) => target.uuid),
          ability: abilityAbr,
          damageType,
          damageApplication: {
            version: 1,
            sourceMessageId: chatMessage.id,
            isFantastic,
            rollSignature: rollSignature(roll),
            targetDecisionSignature: JSON.stringify(decisions),
            entries: damageEntries,
          },
          elementalFantastic: chatMessage.getFlag("multiverse-d616", "elementalFantastic") ?? null,
        },
      },
    };
    return ChatMessageMarvel.create(mmApplyMessageMode(msgData));
  }


  /**
   * Handle clicking a retro button.
   * @param {PointerEvent} event      The initiating click event.
   */
  async _onClickRetroButton(event) {
    event.preventDefault();
    event.stopPropagation();
    const eventTarget = event.currentTarget;

    const action = eventTarget.dataset.retroAction;
    const isInit = eventTarget.dataset.initiative;
    const dieIndex = Math.round(eventTarget.dataset.index);
    const messageId =
      eventTarget.closest("[data-message-id]")?.dataset.messageId;

    const messageHeader = eventTarget.closest("li.chat-message");
    const flavorText =
      messageHeader?.querySelector("span.flavor-text")?.innerHTML;

    eventTarget.disabled = true;
    try {
      await this._handleChatButton(action, messageId, dieIndex, isInit, flavorText);
    } catch (error) {
      console.error(`[${M616_SYSTEM_ID}] Edge/Trouble reroll failed`, error);
      ui.notifications?.error?.("Não foi possível aplicar Edge/Trouble à rolagem.");
      eventTarget.disabled = false;
    }
  }

  async _handleEdge(active, rollResult) {
    if (active) {
      rollResult.active = true;
      rollResult.discarded = undefined;
    } else {
      rollResult.active = false;
      rollResult.discarded = true;
    }
  }

  /**
   * Handles our button clicks from the chat log
   * @param {string} action
   * @param {string} messageId
   * @param {number} dieIndex
   */
  async _handleChatButton(action, messageId, dieIndex, isInit, flavor) {
    if (!action || !messageId) throw new Error("Missing Information");

    const chatMessage = game.messages.get(messageId);
    if (!chatMessage) throw new Error("Chat message not found");

    const combatTrickeryFlag = chatMessage.getFlag(
      M616_SYSTEM_ID,
      "combatTrickery"
    );
    if (
      combatTrickeryFlag?.noMarvelTrouble &&
      action === "trouble" &&
      Number(dieIndex) === 1
    ) {
      ui.notifications?.info?.(
        "Combat Trickery: o dado Marvel não pode ser afetado por Trouble."
      );
      return false;
    }

    const initiativeContext = mmInitiativeContext(chatMessage);
    const isInitiative = !!isInit || mmIsInitiativeMessage(chatMessage);
    if (isInitiative) {
      if (!mmCanAdjustInitiativeMessage(chatMessage)) {
        ui.notifications?.warn?.("Você não pode alterar a iniciativa deste combatente.");
        return false;
      }
      if (initiativeContext?.resolved === true) {
        ui.notifications?.info?.("O Edge/Trouble desta iniciativa já foi resolvido.");
        return false;
      }
      if (
        initiativeContext &&
        String(initiativeContext.modifier ?? "") !== String(action)
      ) {
        ui.notifications?.warn?.("Este combatente não possui esse modificador na iniciativa.");
        return false;
      }
    }

    const modifier = action === "edge" ? "kh" : "kl";
    const [roll] = chatMessage.rolls;
    const firstRollTerm = roll.terms[0];

    let rollTerm;

    if (
      firstRollTerm instanceof foundry.dice.terms.ParentheticalTerm &&
      firstRollTerm.roll.terms[0] instanceof foundry.dice.terms.PoolTerm
    ) {
      rollTerm = firstRollTerm.roll.terms[0];
    } else if (firstRollTerm instanceof foundry.dice.terms.PoolTerm) {
      rollTerm = firstRollTerm;
    }

    if (
      !(
        rollTerm.rolls.length === 3 &&
        rollTerm.rolls[1].terms[0] instanceof
          game.MarvelMultiverse.dice.MarvelDie
      )
    )
      return;

    const targetRoll = rollTerm.rolls[dieIndex];
    const targetDie = targetRoll.terms[0];
    const targetIsMarvel =
      targetDie instanceof game.MarvelMultiverse.dice.MarvelDie;
    const formulaReg = /(?<number>\d)d(?<dieType>\d|m).*/;
    const formulaGroups = formulaReg.exec(targetRoll._formula)?.groups;
    if (!formulaGroups?.dieType) throw new Error(`Unsupported reroll formula: ${targetRoll._formula}`);

    const formulaDie = formulaGroups.dieType;

    // Retro Edge/Trouble is one additional die. Roll exactly one replacement
    // result and compare it with the currently-kept result. The previous
    // implementation rolled 2 dice and then stored only results[0], which
    // could leave multiple active Marvel results (especially when M appeared).
    const previousRollTotal = Number(roll.total ?? 0);
    const previousPoolTotal = Number(rollTerm.total ?? 0);
    const oldRollResult =
      targetDie.results.find((r) => r.active && !r.discarded) ??
      targetDie.results.find((r) => !r.discarded) ??
      targetDie.results[targetDie.results.length - 1];
    if (!oldRollResult) throw new Error("Could not identify kept die result");

    const resultValue = (result) => {
      if (!result) return 0;
      if (targetIsMarvel && Number(result.result) === 1) return 6;
      return Number(result.count ?? result.result ?? 0) || 0;
    };
    const isMarvelResult = (result) =>
      targetIsMarvel && Number(result?.result) === 1;

    const oldResult = resultValue(oldRollResult);
    const oldFantastic = isMarvelResult(oldRollResult);

    const rerollFormula = `1d${formulaDie}`;
    const newRoll = new MarvelMultiverseRoll(rerollFormula, { ...targetRoll.data });
    await newRoll.roll();
    const rerollDie =
      newRoll.dice?.[0] ??
      newRoll.terms?.find?.((term) => term instanceof foundry.dice.terms.Die);
    const sourceNewResult =
      rerollDie?.results?.find((r) => r.active && !r.discarded) ??
      rerollDie?.results?.[0];
    if (!sourceNewResult) throw new Error("Edge/Trouble reroll produced no die result");

    const newRollResult = foundry.utils.deepClone(sourceNewResult);
    newRollResult.active = false;
    newRollResult.discarded = true;
    const newResult = resultValue(newRollResult);
    const newFantastic = isMarvelResult(newRollResult);

    let useNew = false;
    if (modifier === "kh") {
      // A Marvel result is always the preferred Edge result because it is
      // Fantastic. Otherwise keep the numerically higher result.
      if (newFantastic && !oldFantastic) useNew = true;
      else if (!newFantastic && oldFantastic) useNew = false;
      else useNew = newResult > oldResult;
    } else {
      // Trouble keeps the worse result. A Marvel result is beneficial, so it
      // loses against any ordinary result; otherwise keep the lower value.
      if (newFantastic && !oldFantastic) useNew = false;
      else if (!newFantastic && oldFantastic) useNew = true;
      else useNew = newResult < oldResult;
    }

    targetDie.results.push(newRollResult);
    for (const result of targetDie.results) {
      result.active = false;
      result.discarded = true;
    }
    const keptResult = useNew ? newRollResult : oldRollResult;
    keptResult.active = true;
    keptResult.discarded = false;

    targetDie.number = targetDie.results.length;
    targetDie.modifiers = [modifier];
    targetRoll._formula = `${targetDie.number}d${formulaDie}${modifier}`;
    const keptValue = resultValue(keptResult);
    const delta = keptValue - oldResult;
    targetDie._total = keptValue;
    targetRoll._total = keptValue;
    if (Number.isFinite(previousPoolTotal)) rollTerm._total = previousPoolTotal + delta;
    if (Number.isFinite(previousRollTotal)) roll._total = previousRollTotal + delta;

    const re = /(\(?{)(\d+d6(?:kh|kl)?),(\d+dm(?:kh|kl)?),(\d+d6(?:kh|kl)?)(}.*)/;

    let replacedFormula;
    switch (dieIndex) {
      case 0: {
        replacedFormula = roll.formula.replace(
          re,
          `$1${targetDie.number}d6${modifier},$3,$4$5`
        );
        break;
      }
      case 1: {
        replacedFormula = roll.formula.replace(
          re,
          `$1$2,${targetDie.number}dm${modifier},$4$5`
        );
        break;
      }
      case 2: {
        replacedFormula = roll.formula.replace(
          re,
          `$1$2,$3,${targetDie.number}d6${modifier}$5`
        );
        break;
      }
    }

    if (replacedFormula) roll._formula = replacedFormula;

    // IMPORTANT:
    // Updating via a full merge can clobber custom system flags (ex.: itemId/focusSpent),
    // which breaks Focus controls and other enrichments after retro Edge/Trouble.
    // Only update the roll payload + rendered content/flavor, preserving flags.
    const rerollMode = action === "edge" ? 1 : -1;
    const rerollFlavor = mmApplyEdgeModeFlavor(flavor ?? chatMessage.flavor, rerollMode);
    const update = await roll.toMessage({ flavor: rerollFlavor }, { create: false });

    const messageUpdate = {
      content: update?.content ?? chatMessage.content,
      flavor: update?.flavor ?? flavor ?? chatMessage.flavor,
      rolls: update?.rolls ?? chatMessage.rolls,
    };

    if (isInitiative) {
      const now = Date.now();
      foundry.utils.setProperty(
        messageUpdate,
        `flags.${M616_SYSTEM_ID}.${M616_INITIATIVE_FLAG}.resolved`,
        true
      );
      foundry.utils.setProperty(
        messageUpdate,
        `flags.${M616_SYSTEM_ID}.${M616_INITIATIVE_FLAG}.resolution`,
        action
      );
      foundry.utils.setProperty(
        messageUpdate,
        `flags.${M616_SYSTEM_ID}.${M616_INITIATIVE_FLAG}.resolvedAt`,
        now
      );
    }

    const updatedMessage = (await chatMessage.update(messageUpdate)) ?? chatMessage;

    if (isInitiative) {
      await mmResolveInitiativeResult(updatedMessage, Number(roll.total));
    }

    return updatedMessage;
  }

  /* -------------------------------------------- */
  /**
   * Wait to apply appropriate element heights until after the chat log has completed its initial batch render.
   * @param {jQuery} html  The chat log HTML.
   */
  static onRenderChatLog(html) {
  }
}

/**
 * Manage Active Effect instances through an Actor or Item Sheet via effect control buttons.
 * @param {MouseEvent} event      The left-click event on the effect control
 * @param {Actor|Item} owner      The owning document which manages this effect
 */
function onManageActiveEffect(event, owner) {
  event.preventDefault();
  const a = event.currentTarget;
  const li = a.closest('li');
  const effect = li.dataset.effectId
    ? owner.effects.get(li.dataset.effectId)
    : null;
  switch (a.dataset.effectAction ?? a.dataset.action) {
    case 'create':
      return owner.createEmbeddedDocuments('ActiveEffect', [
        {
          name: game.i18n.format('DOCUMENT.New', {
            type: game.i18n.localize('DOCUMENT.ActiveEffect'),
          }),
          img: 'icons/svg/aura.svg',
          origin: owner.uuid,
          type: 'base',
          system: { changes: [] },
          duration: {
            value: li.dataset.effectType === 'temporary' ? 1 : null,
            units: 'rounds',
            expiry: li.dataset.effectType === 'temporary' ? 'turnStart' : null,
            expired: false,
          },
          disabled: li.dataset.effectType === 'inactive',
        },
      ]);
    case 'edit':
      return effect.sheet.render(true);
    case 'delete':
      return effect.delete();
    case 'toggle':
      return effect.update({ disabled: !effect.disabled });
  }
}

/**
 * Prepare the data structure for Active Effects which are currently embedded in an Actor or Item.
 * @param {ActiveEffect[]} effects    A collection or generator of Active Effect documents to prepare sheet data for
 * @return {object}                   Data for rendering
 */
function prepareActiveEffectCategories(effects) {
  // Define effect header categories
  const categories = {
    temporary: {
      type: 'temporary',
      label: game.i18n.localize('MULTIVERSE_D616.Effect.Temporary'),
      effects: [],
    },
    passive: {
      type: 'passive',
      label: game.i18n.localize('MULTIVERSE_D616.Effect.Passive'),
      effects: [],
    },
    inactive: {
      type: 'inactive',
      label: game.i18n.localize('MULTIVERSE_D616.Effect.Inactive'),
      effects: [],
    },
  };

  // Iterate over active effects, classifying them into categories
  for (let e of effects) {
    if (e.disabled) categories.inactive.effects.push(e);
    else if (e.isTemporary) categories.temporary.effects.push(e);
    else categories.passive.effects.push(e);
  }
  return categories;
}

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
function actorHasOpenCombat(actor) {
  if (!actor) return false;
  try {
    if (actor.combatant) return true;
  } catch (_) {}
  const combats = Array.from(game.combats ?? []);
  return combats.some((combat) => {
    const combatants = Array.from(combat?.combatants ?? []);
    return combatants.some((c) => c?.actor?.id === actor.id || c?.actorId === actor.id);
  });
}

function rerenderOpenD616ActorSheets() {
  const apps = new Set([...Object.values(ui.windows ?? {}),
    ...(MarvelMultiverseCharacterSheet.instances?.values?.() ?? []),
    ...(MarvelMultiverseNPCSheet.instances?.values?.() ?? [])]);
  for (const app of apps) {
    if (
      app instanceof MarvelMultiverseCharacterSheet ||
      app instanceof MarvelMultiverseNPCSheet
    ) {
      app.render(false);
    }
  }
}

class LegacyMarvelMultiverseCharacterSheet extends foundry.appv1.sheets.ActorSheet {
  /** @override */
  static get defaultOptions() {
    // biome-ignore lint/complexity/noThisInStatic: <explanation>
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["multiverse-d616", "sheet", "actor"],
      width: 690,
      height: 980,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "traits",
        },
      ],
    });
  }

  /** @override */
  get template() {
    const ownership = this.actor?.ownership ?? {};
    const level =
      ownership[game.userId] ??
      ownership[game.user?.id] ??
      ownership.default ??
      CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;

    // LIMITED: show only portrait art.
    if (!game.user.isGM && level === CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED) {
      return "systems/multiverse-d616/templates/actor/actor-limited-sheet.hbs";
    }

    return "systems/multiverse-d616/templates/actor/actor-character-sheet.hbs";
  }


/** @override */
render(force = false, options = {}) {
  const ownership = this.actor?.ownership ?? {};
  const level =
    ownership[game.userId] ??
    ownership[game.user?.id] ??
    ownership.default ??
    CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;

  // LIMITED: show large portrait in an ImagePopout (like "Show Players" image).
  if (!game.user.isGM && level === CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED) {
    if (force) {
      const src = this.actor?.img;
      if (src) {
        if (this._mmLimitedArtPopout?.rendered) {
          this._mmLimitedArtPopout.bringToTop();
        } else {
          this._mmLimitedArtPopout = new ImagePopout(src, {
            title: this.actor.name,
            shareable: false,
          });
          this._mmLimitedArtPopout.render(true);
        }
      } else {
        ui.notifications?.warn?.("Imagem do personagem não encontrada.");
      }
    }
    return this;
  }

  return super.render(force, options);
}

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = context.data;

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    // Prepare character data and items.
    this._prepareItems(context);
    this._prepareData(context);
    context.showCombatMovement = actorHasOpenCombat(this.actor);

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    context.sizes = CONFIG.MULTIVERSE_D616.sizes;

    context.sizeSelection = Object.fromEntries(
      Object.keys(CONFIG.MULTIVERSE_D616.sizes).map((key) => [
        key,
        game.i18n.localize(CONFIG.MULTIVERSE_D616.sizes[key].label),
      ])
    );

    context.teamManeuverTypes = Object.fromEntries(
      CONFIG.MULTIVERSE_D616.teamManeuvers.map((teamMan) => [
        teamMan.maneuverType.toLowerCase(),
        teamMan.maneuverType,
      ])
    );
    context.teamManeuverLevels = Object.fromEntries(
      [1, 2, 3].map((tml) => [tml, tml.toString()])
    );

    context.elements = Object.fromEntries(
      Object.keys(CONFIG.MULTIVERSE_D616.elements).map((k) => [
        k,
        CONFIG.MULTIVERSE_D616.elements[k].label,
      ])
    );

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(
      // A generator that returns all effects stored on the actor
      // as well as any items
      this.actor.allApplicableEffects()
    );

    return context;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareItems(context) {
    // Initialize containers.
    const gear = [];
    const origins = [];
    const occupations = [];
    const weapons = [];
    const traits = [];
    const tags = [];
    const powers = Object.fromEntries(
      Object.keys(CONFIG.MULTIVERSE_D616.reverseSetList).map((ps) => [ps, []])
    );

    // Iterate through items, allocating to containers
    for (const i of context.items) {
      i.img = i.img || Item.DEFAULT_ICON;

      // Append to origin tags traits and powers as well as origins.
      if (i.type === "origin") {
        origins.push(i);
      }
      // Append to origin tags traits and powers as well as origins.
      if (i.type === "occupation") {
        occupations.push(i);
      } else if (i.type === "item") {
        gear.push(i);
      } else if (i.type === "weapon") {
        weapons.push(i);
      } else if (i.type === "trait") {
        traits.push(i);
      } else if (i.type === "tag") {
        tags.push(i);
      } else if (i.type === "power") {
        const powersets = (i.system.powerSet ?? "Basic").split(",");
        const powerSetLabel = (powersets[0] ?? "Basic").trim() || "Basic";
        if (!powers[powerSetLabel]) powers[powerSetLabel] = [];
        powers[powerSetLabel].push(i);
      }

      // Assign and return
      context.gear = gear;
      context.origins = origins;
      context.occupations = occupations;
      context.weapons = weapons;
      context.traits = traits;
      context.tags = tags;
      context.powers = powers;
    }
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareData(context) {
    // Handle ability scores.
    for (const [k, v] of Object.entries(context.system.abilities)) {
      v.label = game.i18n.localize(CONFIG.MULTIVERSE_D616.abilities[k]) ?? k;
    }

    for (const i of context.items.filter((item) => item.type === "power")) {
      const powersets = (i.system.powerSet ?? "Basic").split(",");
      const powerSetLabel = (powersets[0] ?? "Basic").trim() || "Basic";
      const powerSetKey =
        CONFIG.MULTIVERSE_D616.reverseSetList[powerSetLabel] ??
        (foundry.utils?.camelize
          ? foundry.utils.camelize(powerSetLabel)
          : powerSetLabel
              .toLowerCase()
              .replace(/[^a-z0-9]+(.)/g, (_m, chr) => chr.toUpperCase())
              .replace(/[^a-z0-9]/g, ""));
      try {
        if (!Array.isArray(context.system.powers[powerSetKey])) {
          context.system.powers[powerSetKey] = [];
        }
        context.system.powers[powerSetKey].push(i);
      } catch (_err) {
        // If the system data model is strict and doesn't allow dynamic keys, just skip.
      }
    }

    for (const i of context.items.filter((item) => item.type === "origin")) {
      context.system.origins.push(i);
    }
  }
  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // OBSERVADOR (e abaixo): visualiza apenas. Sem edicao, sem rolagens, sem acoes.
    if (!this.isEditable) return;

    // Render the item sheet for viewing/editing prior to the editable check.
    html.on("click", ".item-edit", (ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    // if (!this.isEditable) return;

    // Add Inventory Item
    html.on("click", ".item-create", this._onItemCreate.bind(this));

    // Delete Inventory Item
    html.on("click", ".item-delete", (ev) => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.items.get(li.data("itemId"));
      this.actor.deleteEmbeddedDocuments("Item", [li.data("itemId")]);
      li.slideUp(200, () => this.render(false));
    });

    // Active Effect management
    html.on("click", ".effect-control", (ev) => {
      const row = ev.currentTarget.closest("li");
      const document =
        row.dataset.parentId === this.actor.id
          ? this.actor
          : this.actor.items.get(row.dataset.parentId);
      onManageActiveEffect(ev, document);
    });

    // Rollable abilities.
    html.on("click", ".rollable", this._onRoll.bind(this));

    html.on(
      "change",
      'select[name="system.size"]',
      this._onSizeChange.bind(this)
    );

    html.on("click", ".roll-initiative", (ev) => {
      this.actor.rollInitiative({ createCombatants: true });
    });

    // Drag events for macros.
    if (this.actor.isOwner) {
      const handler = (ev) => this._onDragStart(ev);
      html.find("li.item").each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
  }

  /**
   * Handle changes to actor size
   * @param {Event} event   The originating click event
   * @private
   */
  async _onSizeChange(event) {
    event.preventDefault();
    const selected = event.target.value;
    await this._changeSizeEffect(selected);
  }

  async _changeSizeEffect(effectKey) {
    if (!Object.hasOwn(CONFIG.MULTIVERSE_D616.sizeEffects, effectKey)) return;
    const knownNames = new Set(Object.values(CONFIG.MULTIVERSE_D616.sizeEffects).map(e => e.name));
    const current = this.actor.effects.contents.filter(effect => {
      if (effect.flags?.["multiverse-d616"]?.managedSize || effect.flags?.["multiverse-d616"]?.growChoice || effect.flags?.["multiverse-d616"]?.shrinkChoice) return true;
      const changes = effect.system?.changes ?? effect.changes ?? [];
      return knownNames.has(effect.name) && changes.some(c => c.key === "system.size");
    });
    if (current.length) await this.actor.deleteEmbeddedDocuments("ActiveEffect", current.map(e => e.id), {[RESIZE_SKIP_OPTION]:true});
    // Persist the natural size for Unusual Size. Temporary Resize effects do
    // not change the saved natural size; they only override it while active.
    await this.actor.update({ "system.size": effectKey }, {[RESIZE_SKIP_OPTION]:true});
    const effect = foundry.utils.deepClone(CONFIG.MULTIVERSE_D616.sizeEffects[effectKey]);
    await this.actor.createEmbeddedDocuments("ActiveEffect", [effect], {[RESIZE_SKIP_OPTION]:true});
    await syncActorTokenSize(this.actor, effectKey);
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = foundry.utils.duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data,
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    // biome-ignore lint/complexity/useLiteralKeys: <explanation>
    itemData.system["type"] = undefined;

    // Finally, create the item!
    return await Item.create(itemData, { parent: this.actor });
  }

  async _createTrait(traitData) {
    if (
      !this.actor.items.map((item) => item.name).includes(traitData.name) &&
      !traitData.multiple
    ) {
      super._onDropItemCreate(traitData);
    }
  }

  async _createTag(tagData) {
    if (
      !this.actor.items.map((item) => item.name).includes(tagData.name) &&
      !tagData.multiple
    ) {
      super._onDropItemCreate(tagData);
    }
  }

  /** Fired whenever an embedded document is created.
   */
  async _onDropItemCreate(itemData) {
    if (!this.actor.items.map((item) => item.name).includes(itemData.name)) {
      if (
        itemData.type === "power" &&
        itemData.system.powerSet === "Elemental Control"
      ) {
        if (!itemData.system.element) {
          itemData.system.element = this.actor.system.defaultElement;
        }
      }

      if (itemData.type === "occupation") {
        // biome-ignore lint/complexity/noForEach: <explanation>
        itemData.system.tags.forEach(async (tag) => {
          this._createTag(tag);
        });
        // biome-ignore lint/complexity/noForEach: <explanation>
        itemData.system.traits.forEach(async (trait) => {
          this._createTrait(trait);
        });
        // create the occupation
        return super._onDropItemCreate(itemData);
        // biome-ignore lint/style/noUselessElse: <explanation>
      } else if (itemData.type === "origin") {
        // biome-ignore lint/complexity/noForEach: <explanation>
        itemData.system.tags.forEach(async (tag) => {
          this._createTag(tag);
        });
        // biome-ignore lint/complexity/noForEach: <explanation>
        itemData.system.traits.forEach(async (trait) => {
          this._createTrait(trait);
        });
        // biome-ignore lint/complexity/noForEach: <explanation>
        itemData.system.powers.forEach(async (power) => {
          const newItemData = {
            name: power.name,
            type: "power",
            data: power.system,
          };
          if (this.actor.system.defaultElement) {
            Object.assign(newItemData, {
              element: this.actor.system.defaultElement,
            });
          }
          await Item.create(newItemData, { parent: this.actor });
        });
        // create the origin
        return super._onDropItemCreate(itemData);
        // biome-ignore lint/style/noUselessElse: <explanation>
      } else if (
        itemData.type === "trait" &&
        ["Big", "Small"].includes(itemData.name)
      ) {
        await this._changeSizeEffect(itemData.name.toLowerCase());
        return super._onDropItemCreate(itemData);
        // biome-ignore lint/style/noUselessElse: <explanation>
      } else {
        return super._onDropItemCreate(itemData);
      }
    }
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    const itemId = element.closest(".item")?.dataset?.itemId;
    const item = this.actor.items.get(itemId);

    // Powers and weapons must always use Item.roll() so Focus, Concentration,
    // targets, damage context, hooks, and turn tracking share one workflow.
    if (item && ["power", "weapon"].includes(item.type)) {
      return item.roll();
    }

    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType === "item") {
        if (item) return item.roll();
      }
    }
    if (dataset.formula) {
      const ability =
        CONFIG.MULTIVERSE_D616.damageAbility[dataset.label] ?? dataset.label;
      let label = `ability: ${ability}<br/>${item?.type}: ${item?.name}`;
      const title = dataset.power ? `[power] ${dataset.power}` : "";

      label = dataset.damagetype
        ? `${label}<br/>damagetype: ${dataset.damagetype}`
        : label;

      const speaker = ChatMessage.getSpeaker({ actor: this.actor });
      const messageMode = mmGetMessageMode();

      if (item?.system?.description) {
        ChatMessage.create(mmApplyMessageMode({
          speaker: speaker,
          flavor: label,
          content: `<div>${item.system.description}</div><div>${
            item.system.effect ? item.system.effect : ""
          }</div>${mmAttackEdgeModeCardHtml(item)}`,
        }, messageMode));
      }

      const useUltimateFantastic = await maybeRequestUltimateFantastic(this.actor);
      const actorEdgeMode = 0; // Force is included by resolveConditionEdges
      const conditionEdges = resolveConditionEdges({actor:this.actor, ability:dataset.label,
        action:'standard', baseMode:actorEdgeMode});
      const rollOptions = useUltimateFantastic ? { forceMarvelM: true } : {};
      if (conditionEdges.edgeMode) rollOptions.edgeMode = conditionEdges.edgeMode;
      const roll = new CONFIG.Dice.MarvelMultiverseRoll(
        dataset.formula,
        this.actor.getRollData(),
        rollOptions
      );

      const message = await roll.toMessage(
        {
          speaker: speaker,
          flavor: label,
          title: title,
          flags:{'multiverse-d616':{conditionEdges}},
        },
        { messageMode, itemId: itemId }
      );
      if(conditionEdges.sources.length && conditionEdges.autoCount)
        await resolveConditionReroll(message,conditionEdges);
      return roll;
    }
  }
}

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
class LegacyMarvelMultiverseNPCSheet extends foundry.appv1.sheets.ActorSheet {
  /** @override */
  static get defaultOptions() {
    // biome-ignore lint/complexity/noThisInStatic: <explanation>
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["multiverse-d616", "sheet", "actor"],
      width: 690,
      height: 500,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "traits",
        },
      ],
    });
  }

  /** @override */
  get template() {
    const ownership = this.actor?.ownership ?? {};
    const level =
      ownership[game.userId] ??
      ownership[game.user?.id] ??
      ownership.default ??
      CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;

    // LIMITED: show only portrait art.
    if (!game.user.isGM && level === CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED) {
      return "systems/multiverse-d616/templates/actor/actor-limited-sheet.hbs";
    }

    return "systems/multiverse-d616/templates/actor/actor-npc-sheet.hbs";
  }


/** @override */
render(force = false, options = {}) {
  const ownership = this.actor?.ownership ?? {};
  const level =
    ownership[game.userId] ??
    ownership[game.user?.id] ??
    ownership.default ??
    CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;

  // LIMITED: show large portrait in an ImagePopout (like "Show Players" image).
  if (!game.user.isGM && level === CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED) {
    if (force) {
      const src = this.actor?.img;
      if (src) {
        if (this._mmLimitedArtPopout?.rendered) {
          this._mmLimitedArtPopout.bringToTop();
        } else {
          this._mmLimitedArtPopout = new ImagePopout(src, {
            title: this.actor.name,
            shareable: false,
          });
          this._mmLimitedArtPopout.render(true);
        }
      } else {
        ui.notifications?.warn?.("Imagem do personagem não encontrada.");
      }
    }
    return this;
  }

  return super.render(force, options);
}

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = context.data;

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    // Prepare character data and items.
    if (actorData.type === "character") {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }

    // Prepare NPC data and items.
    if (actorData.type === "npc") {
      this._prepareItems(context);
    }

    context.showCombatMovement = actorHasOpenCombat(this.actor);

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    context.sizes = CONFIG.MULTIVERSE_D616.sizes;

    context.sizeSelection = Object.fromEntries(
      Object.keys(CONFIG.MULTIVERSE_D616.sizes).map((key) => [
        key,
        game.i18n.localize(CONFIG.MULTIVERSE_D616.sizes[key].label),
      ])
    );

    context.teamManeuverTypes = Object.fromEntries(
      CONFIG.MULTIVERSE_D616.teamManeuvers.map((teamMan) => [
        teamMan.maneuverType.toLowerCase(),
        teamMan.maneuverType,
      ])
    );
    context.teamManeuverLevels = Object.fromEntries(
      [1, 2, 3].map((tml) => [tml, tml.toString()])
    );

    context.elements = Object.fromEntries(
      Object.keys(CONFIG.MULTIVERSE_D616.elements).map((k) => [
        k,
        CONFIG.MULTIVERSE_D616.elements[k].label,
      ])
    );

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(
      // A generator that returns all effects stored on the actor
      // as well as any items
      this.actor.allApplicableEffects()
    );

    return context;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareItems(context) {
    // Initialize containers.
    const gear = [];
    const traits = [];
    const origins = [];
    const occupations = [];
    const tags = [];
    const weapons = [];
    const powers = Object.fromEntries(
      Object.keys(CONFIG.MULTIVERSE_D616.reverseSetList).map((ps) => [ps, []])
    );

    // Iterate through items, allocating to containers
    for (const i of context.items) {
      i.img = i.img || Item.DEFAULT_ICON;

      // Append to origin tags traits and powers as well as origins.
      if (i.type === "origin") {
        origins.push(i);
      }
      // Append to origin tags traits and powers as well as origins.
      if (i.type === "occupation") {
        occupations.push(i);
      }
      // Append to traits.
      else if (i.type === "trait") {
        traits.push(i);
      } else if (i.type === "tag") {
        tags.push(i);
      }
      // Append to  power.
      else if (i.type === "power") {
        const powersets = (i.system.powerSet ?? "Basic").split(",");
        const powerSetLabel = (powersets[0] ?? "Basic").trim() || "Basic";
        if (!powers[powerSetLabel]) powers[powerSetLabel] = [];
        powers[powerSetLabel].push(i);
      } else if (i.type === "item") {
        gear.push(i);
      } else if (i.type === "weapon") {
        weapons.push(i);
      }

      // Assign and return
      context.gear = gear;
      context.traits = traits;
      context.tags = tags;
      context.powers = powers;
      context.origins = origins;
      context.occupations = occupations;
      context.weapons = weapons;
    }
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterData(context) {
    // Handle ability scores.
    for (const [k, v] of Object.entries(context.system.abilities)) {
      v.label = game.i18n.localize(CONFIG.MULTIVERSE_D616.abilities[k]) ?? k;
    }

    for (const i of context.items.filter((item) => item.type === "power")) {
      const powersets = (i.system.powerSet ?? "Basic").split(",");
      const powerSetLabel = (powersets[0] ?? "Basic").trim() || "Basic";
      const powerSetKey =
        CONFIG.MULTIVERSE_D616.reverseSetList[powerSetLabel] ??
        (foundry.utils?.camelize
          ? foundry.utils.camelize(powerSetLabel)
          : powerSetLabel
              .toLowerCase()
              .replace(/[^a-z0-9]+(.)/g, (_m, chr) => chr.toUpperCase())
              .replace(/[^a-z0-9]/g, ""));
      try {
        if (!Array.isArray(context.system.powers[powerSetKey])) {
          context.system.powers[powerSetKey] = [];
        }
        context.system.powers[powerSetKey].push(i);
      } catch (_err) {
        // If the system data model is strict and doesn't allow dynamic keys, just skip.
      }
    }

    for (const i of context.items.filter((item) => item.type === "origin")) {
      context.system.origins.push(i);
    }
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // OBSERVADOR (e abaixo): visualiza apenas. Sem edicao, sem rolagens, sem acoes.
    if (!this.isEditable) return;

    // Render the item sheet for viewing/editing prior to the editable check.
    html.on("click", ".item-edit", (ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    // if (!this.isEditable) return;

    // Add Inventory Item
    html.on("click", ".item-create", this._onItemCreate.bind(this));

    // Delete Inventory Item
    html.on("click", ".item-delete", (ev) => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.items.get(li.data("itemId"));
      this.actor.deleteEmbeddedDocuments("Item", [li.data("itemId")]);
      li.slideUp(200, () => this.render(false));
    });

    // Active Effect management
    html.on("click", ".effect-control", (ev) => {
      const row = ev.currentTarget.closest("li");
      const document =
        row.dataset.parentId === this.actor.id
          ? this.actor
          : this.actor.items.get(row.dataset.parentId);
      onManageActiveEffect(ev, document);
    });

    // Rollable abilities.
    html.on("click", ".rollable", this._onRoll.bind(this));

    html.on(
      "change",
      'select[name="system.size"]',
      this._onSizeChange.bind(this)
    );

    html.on("click", ".roll-initiative", (ev) => {
      this.actor.rollInitiative({ createCombatants: true });
    });

    // Drag events for macros.
    if (this.actor.isOwner) {
      const handler = (ev) => this._onDragStart(ev);
      html.find("li.item").each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
  }

  /**
   * Handle changes to actor size
   * @param {Event} event   The originating click event
   * @private
   */
  async _onSizeChange(event) {
    event.preventDefault();
    const selected = event.target.value;
    await this._changeSizeEffect(selected);
  }

  async _changeSizeEffect(effectKey) {
    if (!Object.hasOwn(CONFIG.MULTIVERSE_D616.sizeEffects, effectKey)) return;
    const knownNames = new Set(Object.values(CONFIG.MULTIVERSE_D616.sizeEffects).map(e => e.name));
    const current = this.actor.effects.contents.filter(effect => {
      if (effect.flags?.["multiverse-d616"]?.managedSize || effect.flags?.["multiverse-d616"]?.growChoice || effect.flags?.["multiverse-d616"]?.shrinkChoice) return true;
      const changes = effect.system?.changes ?? effect.changes ?? [];
      return knownNames.has(effect.name) && changes.some(c => c.key === "system.size");
    });
    if (current.length) await this.actor.deleteEmbeddedDocuments("ActiveEffect", current.map(e => e.id), {[RESIZE_SKIP_OPTION]:true});
    // Persist the natural size for Unusual Size. Temporary Resize effects do
    // not change the saved natural size; they only override it while active.
    await this.actor.update({ "system.size": effectKey }, {[RESIZE_SKIP_OPTION]:true});
    const effect = foundry.utils.deepClone(CONFIG.MULTIVERSE_D616.sizeEffects[effectKey]);
    await this.actor.createEmbeddedDocuments("ActiveEffect", [effect], {[RESIZE_SKIP_OPTION]:true});
    await syncActorTokenSize(this.actor, effectKey);
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = foundry.utils.duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data,
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    itemData.system.type = undefined;

    // Finally, create the item!
    return await Item.create(itemData, { parent: this.actor });
  }

  async _createTrait(traitData) {
    if (
      !this.actor.items.map((item) => item.name).includes(traitData.name) &&
      !traitData.multiple
    ) {
      super._onDropItemCreate(traitData);
    }
  }

  async _createTag(tagData) {
    if (
      !this.actor.items.map((item) => item.name).includes(tagData.name) &&
      !tagData.multiple
    ) {
      super._onDropItemCreate(tagData);
    }
  }

  /** Fired whenever an embedded document is created.
   */
  async _onDropItemCreate(itemData) {
    if (!this.actor.items.map((item) => item.name).includes(itemData.name)) {
      if (
        itemData.type === "power" &&
        itemData.system.powerSet === "Elemental Control"
      ) {
        if (!itemData.system.element) {
          itemData.system.element = this.actor.system.defaultElement;
        }
      }

      if (itemData.type === "occupation") {
        for (const tag of itemData.system.tags) {
          this._createTag(tag);
        }
        for (const trait of itemData.system.traits) {
          this._createTrait(trait);
        }
        // create the occupation
        return super._onDropItemCreate(itemData);
        // biome-ignore lint/style/noUselessElse: <explanation>
      } else if (itemData.type === "origin") {
        for (const tag of itemData.system.tags) {
          this._createTag(tag);
        }
        for (const trait of itemData.system.traits) {
          this._createTrait(trait);
        }
        for (const power of itemData.system.powers) {
          const newItemData = {
            name: power.name,
            type: "power",
            data: power.system,
          };
          if (this.actor.system.defaultElement) {
            Object.assign(newItemData, {
              element: this.actor.system.defaultElement,
            });
          }
          await Item.create(newItemData, { parent: this.actor });
        }
        // create the origin
        return super._onDropItemCreate(itemData);
        // biome-ignore lint/style/noUselessElse: <explanation>
      } else if (
        itemData.type === "trait" &&
        ["Big", "Small"].includes(itemData.name)
      ) {
        await this._changeSizeEffect(itemData.name.toLowerCase());
        return super._onDropItemCreate(itemData);
        // biome-ignore lint/style/noUselessElse: <explanation>
      } else {
        return super._onDropItemCreate(itemData);
      }
    }
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType === "item") {
        const itemId = element.closest(".item").dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
    }

    // Handle rolls that supply the formula directly.
    if (dataset.formula) {
      const ability =
        CONFIG.MULTIVERSE_D616.damageAbility[dataset.label] ?? dataset.label;
      let label = `[ability] ${ability}`;
      const title = dataset.power ? `[power] ${dataset.power}` : "";
      label = dataset.damageType
        ? `${label} [damageType] ${dataset.damageType}`
        : label;

      const useUltimateFantastic = await maybeRequestUltimateFantastic(this.actor);
      const actorEdgeMode = 0; // Force is included by resolveConditionEdges
      const conditionEdges = resolveConditionEdges({actor:this.actor, ability:dataset.label,
        action:'standard', baseMode:actorEdgeMode});
      const rollOptions = useUltimateFantastic ? { forceMarvelM: true } : {};
      if (conditionEdges.edgeMode) rollOptions.edgeMode = conditionEdges.edgeMode;
      const roll = new CONFIG.Dice.MarvelMultiverseRoll(
        dataset.formula,
        this.actor.getRollData(),
        rollOptions
      );

      const message = await roll.toMessage(
        {
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          flavor: label,
          title: title,
          flags:{'multiverse-d616':{conditionEdges}},
        },
        { messageMode: mmGetMessageMode() }
      );
      if(conditionEdges.sources.length && conditionEdges.autoCount)
        await resolveConditionReroll(message,conditionEdges);
      return roll;
    }
  }
}


/* -------------------------------------------------------------------------- */
/* D616 Actor Sheets — Foundry VTT v14 ApplicationV2                          */
/* -------------------------------------------------------------------------- */
/* Keep existing Handlebars layouts and combat handlers. The old sheet classes
 * remain unregistered as behavior references while the sheet lifecycle,
 * forms, drag/drop and tabs use the native ActorSheetV2 API. */
const D616ActorSheetV2Base = foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2
);

const D616_SHEET_TEMPLATES = Object.freeze({
  character: 'systems/multiverse-d616/templates/actor/actor-character-sheet.hbs',
  npc: 'systems/multiverse-d616/templates/actor/actor-npc-sheet.hbs',
});

async function d616ActorSheetContext(sheet, context, legacy) {
  const actor = sheet.actor;
  // A snapshot prevents the legacy display helpers from mutating a live
  // DataModel while maintaining the original template contract.
  const snapshot = actor.toObject(false);
  context.actor = actor;
  context.data = snapshot;
  context.items = actor.items.map(item => item.toObject(false));
  context.system = foundry.utils.deepClone(actor.system.toObject?.(false) ?? snapshot.system);
  context.flags = snapshot.flags ?? {};
  context.editable = sheet.isEditable;
  context.cssClass = sheet.isEditable ? 'editable' : 'locked';
  context.showCombatMovement = actorHasOpenCombat(actor);
  context.rollData = actor.getRollData();
  context.sizes = CONFIG.MULTIVERSE_D616.sizes;
  context.sizeSelection = Object.fromEntries(
    Object.entries(CONFIG.MULTIVERSE_D616.sizes).map(([key, size]) =>
      [key, game.i18n.localize(size.label)]));
  context.teamManeuverTypes = Object.fromEntries(
    CONFIG.MULTIVERSE_D616.teamManeuvers.map(t => [t.maneuverType.toLowerCase(), t.maneuverType]));
  context.teamManeuverLevels = {1:'1',2:'2',3:'3'};
  context.elements = Object.fromEntries(Object.entries(CONFIG.MULTIVERSE_D616.elements)
    .map(([key, element]) => [key, element.label]));
  context.effects = prepareActiveEffectCategories(actor.allApplicableEffects());
  legacy._prepareItems.call(sheet, context);
  // Keep the add-item controls available on newly created, empty Actors.
  context.gear ??= [];
  context.origins ??= [];
  context.occupations ??= [];
  context.weapons ??= [];
  context.traits ??= [];
  context.tags ??= [];
  context.powers ??= Object.fromEntries(Object.keys(CONFIG.MULTIVERSE_D616.reverseSetList)
    .map(key => [key, []]));
  if (actor.type === 'character') {
    if (legacy === LegacyMarvelMultiverseNPCSheet.prototype)
      legacy._prepareCharacterData.call(sheet, context);
    else legacy._prepareData.call(sheet, context);
  }
  // Display biography from the stored Actor data, never from a form editor
  // that may be inactive when ApplicationV2 re-renders the sheet.
  if (actor.type === 'character') {
    const editor = foundry.applications?.ux?.TextEditor?.implementation ?? globalThis.TextEditor;
    context.enrichedBiography = {};
    for (const field of ['history', 'personality', 'distinguishingFeatures']) {
      const raw = String(context.system[field] ?? '');
      try {
        context.enrichedBiography[field] = typeof editor?.enrichHTML === 'function'
          ? await editor.enrichHTML(raw, {secrets:actor.isOwner,relativeTo:actor})
          : (foundry.utils.escapeHTML?.(raw) ?? raw);
      } catch (error) {
        console.warn(`[multiverse-d616] Erro ao preparar Biografia (${field}):`,error);
        context.enrichedBiography[field] = foundry.utils.escapeHTML?.(raw) ?? '';
      }
    }
  }
  // The original actor templates use data.*, system.*, items and editable.
  return context;
}

function d616GetLimitedActor(sheet) {
  if (game.user?.isGM) return false;
  const ownership = sheet.actor?.ownership ?? {};
  const level = ownership[game.userId] ?? ownership[game.user?.id]
    ?? ownership.default ?? CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;
  return level === CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED;
}

async function d616LimitedArtwork(sheet) {
  if (!sheet.actor?.img) return ui.notifications?.warn?.('Imagem do personagem não encontrada.');
  if (sheet._mmLimitedArtPopout?.rendered) return sheet._mmLimitedArtPopout.bringToTop();
  sheet._mmLimitedArtPopout = new ImagePopout(sheet.actor.img,
    {title:sheet.actor.name,shareable:false});
  return sheet._mmLimitedArtPopout.render(true);
}


/** Attach the metadata consumed by the existing global D616 hover-tooltip
 * listener. Supports every rendered Item, including powers on NPC sheets. */
function d616ActivateSheetTooltips(sheet, root) {
  const capitalize = value => value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Item';
  for (const row of root.querySelectorAll('[data-item-id]')) {
    const item = sheet.actor?.items?.get?.(row.dataset.itemId);
    if (!item) continue;
    const sys = item.system ?? {};
    row.dataset.mmhtType = capitalize(item.type ?? 'item');
    row.dataset.mmhtTitle = item.name ?? '';
    for (const [attribute, value] of Object.entries({
      cost:sys.cost?.value ?? sys.cost,
      range:sys.range ?? sys.distance,
      action:sys.action ?? sys.activation,
      trigger:sys.trigger,
      duration:sys.duration,
      desc:sys.description ?? sys.desc ?? sys.details,
      effect:sys.effect ?? sys.effects
    })) {
      const key = 'mmht' + attribute[0].toUpperCase() + attribute.slice(1);
      if (value != null && value !== '') row.dataset[key] = typeof value === 'string' ? value : JSON.stringify(value);
      else delete row.dataset[key];
    }
  }
}

function d616ActivateTab(sheet, tab) {
  if (!['abilities','biography','gear'].includes(tab)) return;
  sheet.tabGroups.primary = tab;
  const root = sheet.element;
  if (!root) return;
  root.querySelectorAll('.sheet-tabs [data-tab]').forEach(node => {
    const active = node.dataset.tab === tab;
    node.classList.toggle('active',active);
    node.setAttribute('aria-selected',String(active));
  });
  root.querySelectorAll('.sheet-body > .tab[data-tab]').forEach(node => {
    const active = node.dataset.tab === tab;
    node.classList.toggle('active',active);
    node.hidden = !active;
    node.style.display = active ? '' : 'none';
  });
}

async function d616DropActorItem(sheet, item) {
  if (!sheet.isEditable || !item) return null;
  const data = normalizeItemEffectDurations(item.toObject(false));
  if (sheet.actor.items.some(existing => existing.name === data.name)) return null;
  if (data.type === 'power' && data.system?.powerSet === 'Elemental Control') {
    data.system ??= {};
    data.system.element ||= sheet.actor.system.defaultElement;
  }
  if (['origin','occupation'].includes(data.type)) {
    const embedded = [];
    for (const type of ['tags','traits',...(data.type === 'origin' ? ['powers'] : [])]) {
      for (const child of data.system?.[type] ?? []) {
        if (!child?.name) continue;
        const childType = {tags:'tag',traits:'trait',powers:'power'}[type];
        if (sheet.actor.items.some(it => it.type === childType && it.name === child.name && !child.system?.multiple)) continue;
        const record = {...foundry.utils.deepClone(child),type:childType};
        if (childType === 'power' && record.system?.powerSet === 'Elemental Control')
          record.system.element ||= sheet.actor.system.defaultElement;
        embedded.push(record);
      }
    }
    if (embedded.length) await sheet.actor.createEmbeddedDocuments('Item',embedded);
  }
  if (data.type === 'trait' && ['Big','Small'].includes(data.name))
    await sheet._changeSizeEffect(data.name.toLowerCase());
  const [created] = await sheet.actor.createEmbeddedDocuments('Item',[data]);
  return created ?? null;
}

class D616ActorSheetV2Common extends D616ActorSheetV2Base {
  static DEFAULT_OPTIONS = {
    classes:['multiverse-d616','sheet','actor','mm-actor-v2'],
    position:{width:690,height:980},
    window:{resizable:true},
    // Unlike V1, the legacy nested Handlebars <form> does not automatically
    // submit through ActorSheetV2. Each field is saved independently below.
    // Never submit the complete stale form: it can revert Health/Focus after
    // damage or accidentally overwrite a rich biography editor.
    form:{submitOnChange:false,closeOnSubmit:false},
  };
  tabGroups = {primary:'abilities'};
  _d616ScrollTop = null;

  async render(options={}, additionalOptions={}) {
    if (d616GetLimitedActor(this)) {
      if (options === true || options?.force) await d616LimitedArtwork(this);
      return this;
    }
    return super.render(options,additionalOptions);
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return d616ActorSheetContext(this,context,this._d616LegacyPrototype);
  }

  async _onRender(context, options) {
    await super._onRender(context,options);
    const root = this.element;
    if (!root) return;
    const scrollArea = root.querySelector('.window-content');
    if (scrollArea && Number.isFinite(this._d616ScrollTop))
      scrollArea.scrollTop = this._d616ScrollTop;
    // Old templates use V1 tab markup without data-action=tab.
    root.querySelectorAll('.sheet-tabs [data-tab]').forEach(link => {
      link.addEventListener('click',event => {
        event.preventDefault();
        d616ActivateTab(this,link.dataset.tab);
      });
    });
    d616ActivateTab(this,this.tabGroups.primary || 'abilities');
    // V14 ActorSheetV2 does not invoke the legacy renderActorSheet hook used by
    // hover-tooltips.js. Populate the same attributes directly after rendering.
    d616ActivateSheetTooltips(this, root);
    if (this.isEditable) {
      // ActorSheetV2 uses separate render parts; its V1-like form markup is not
      // implicitly submitted. Persist one scalar value per change (PC + NPC).
      // Exclude size, which requires the token-size/Active Effect workflow.
      root.querySelectorAll('form input[name], form select[name], form textarea[name]').forEach(control => {
        if (control.type === 'hidden' || control.name === 'system.size') return;
        control.addEventListener('change',event => this._d616SaveActorField(event));
      });
      root.querySelectorAll('form').forEach(form => form.addEventListener('submit',event => {
        event.preventDefault(); // no outdated full-form submissions
      }));
      root.querySelectorAll('.mm-actor-bio-edit').forEach(button =>
        button.addEventListener('click',event => {
          event.preventDefault();
          this._d616OpenBiography(button.closest('.mm-actor-bio-panel'));
        }));
      root.querySelectorAll('.mm-actor-bio-cancel').forEach(button =>
        button.addEventListener('click',event => {
          event.preventDefault();
          this._d616CancelBiography(button.closest('.mm-actor-bio-panel'));
        }));
      root.querySelectorAll('.mm-actor-bio-save').forEach(button =>
        button.addEventListener('click',async event => {
          event.preventDefault();
          try {
            await this._d616SaveBiography(button.closest('.mm-actor-bio-panel'));
          } catch (error) {
            console.error('[multiverse-d616] Falha ao salvar Biografia:',error);
            ui.notifications?.error?.('Não foi possível salvar a Biografia. Veja o console.');
          }
        }));
      root.querySelectorAll('.item-edit').forEach(link => link.addEventListener('click',event => {
        event.preventDefault();
        const id = event.currentTarget.closest('.item')?.dataset.itemId;
        this.actor.items.get(id)?.sheet.render(true);
      }));
      root.querySelectorAll('.item-create').forEach(link => link.addEventListener('click',
        event => this._onItemCreate(event)));
      root.querySelectorAll('.item-delete').forEach(link => link.addEventListener('click',async event => {
        event.preventDefault();
        const id = event.currentTarget.closest('.item')?.dataset.itemId;
        if (id) await this.actor.deleteEmbeddedDocuments('Item',[id]);
      }));
      root.querySelectorAll('.effect-control').forEach(link => link.addEventListener('click',event => {
        event.preventDefault();
        const row = event.currentTarget.closest('li');
        const parent = row?.dataset.parentId;
        const document = parent === this.actor.id ? this.actor : this.actor.items.get(parent);
        if (document) onManageActiveEffect(event,document);
      }));
      root.querySelectorAll('.rollable').forEach(link => link.addEventListener('click',
        event => this._onRoll(event)));
      root.querySelectorAll('select[name="system.size"]').forEach(select =>
        select.addEventListener('change',event => this._onSizeChange(event)));
      root.querySelectorAll('.roll-initiative').forEach(link => link.addEventListener('click',event => {
        event.preventDefault();
        this.actor.rollInitiative({createCombatants:true});
      }));
      root.querySelectorAll('li.item:not(.inventory-header)').forEach(li => {
        li.setAttribute('draggable','true');
        // Native ActorSheetV2 provides the document drag-and-drop lifecycle.
      });
      root.querySelectorAll('img[data-edit="img"]').forEach(img => img.addEventListener('click',event => {
        event.preventDefault();
        const Picker = foundry.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
        if (!Picker) return;
        new Picker({type:'image',current:this.actor.img,
          callback:path => this.actor.update({img:path})}).render(true);
      }));
    }
    // The v1 getActorSheetHeaderButtons hook no longer runs on V2 sheets.
    const header = root.querySelector('.window-header');
    if (header && this.actor.type === 'character' &&
        !header.querySelector('.m616-export-inline') && typeof globalThis.multiverseD616ExportPDF === 'function') {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'm616-export-inline';
      button.title = 'Exportar PDF (M616)';
      button.innerHTML = '<i class="fas fa-file-pdf"></i> PDF (M616)';
      button.addEventListener('click',event=>{
        event.preventDefault();
        globalThis.multiverseD616ExportPDF(this.actor).catch(err=>{
          console.error('[M616] exportação PDF falhou',err);
          ui.notifications?.error('Export PDF falhou. Veja o console.');
        });
      });
      header.querySelector('.window-title')?.after(button);
    }
  }

  // The same persistence strategy already proven by ItemSheetV2 is used for
  // Actors. Keep data changes isolated; never submit untouched fields.
  async _d616SaveActorField(event) {
    if (!this.isEditable) return;
    const control = event?.currentTarget;
    const field = String(control?.name ?? '');
    if (field !== 'name' && !/^system\.[a-zA-Z][a-zA-Z0-9_.]*$/.test(field)) return;
    if (['system.size','system.history','system.personality',
         'system.distinguishingFeatures','system.karma.max'].includes(field)) return;
    let value = control.type === 'checkbox' ? !!control.checked : control.value;
    if (control.type === 'number' || control.dataset?.dtype === 'Number' ||
        field === 'system.teamManeuver.level') {
      value = value === '' ? null : Number(value);
      if (value !== null && !Number.isFinite(value)) return;
    }
    try {
      this._d616ScrollTop = this.element?.querySelector('.window-content')?.scrollTop ?? null;
      await this.actor.update({[field]:value});
    } catch (error) {
      console.error(`[multiverse-d616] Falha ao salvar ${field}:`,error);
      ui.notifications?.error?.(`Não foi possível salvar ${field}.`);
    }
  }

  _d616OpenBiography(panel) {
    if (!this.isEditable || !panel) return;
    const box = panel.querySelector('.mm-actor-bio-editor');
    const content = panel.querySelector('.mm-actor-bio-content');
    const preview = panel.querySelector('.mm-actor-bio-preview');
    if (!box || !content || !preview) return;
    content.innerHTML = preview.innerHTML;
    box.hidden = false;
    panel.dataset.editing = 'true';
    panel.querySelector('.mm-actor-bio-edit')?.setAttribute('aria-expanded','true');
    content.focus();
  }

  _d616CancelBiography(panel) {
    if (!panel) return;
    const box = panel.querySelector('.mm-actor-bio-editor');
    if (box) box.hidden = true;
    delete panel.dataset.editing;
    panel.querySelector('.mm-actor-bio-edit')?.setAttribute('aria-expanded','false');
  }

  async _d616SaveBiography(panel) {
    if (!this.isEditable || !panel || panel.dataset.editing !== 'true') return;
    const field = String(panel.dataset.field ?? '');
    if (!['history','personality','distinguishingFeatures'].includes(field)) return;
    const editable = panel.querySelector('.mm-actor-bio-content');
    if (!editable) return;
    const value = editable.innerHTML;
    if (value !== String(this.actor.system?.[field] ?? '')) {
      this._d616ScrollTop = this.element?.querySelector('.window-content')?.scrollTop ?? null;
      await this.actor.update({[`system.${field}`]:value});
    }
    const preview = panel.querySelector('.mm-actor-bio-preview');
    if (preview) {
      const editor = foundry.applications?.ux?.TextEditor?.implementation ?? globalThis.TextEditor;
      preview.innerHTML = typeof editor?.enrichHTML === 'function'
        ? await editor.enrichHTML(value,{secrets:this.actor.isOwner,relativeTo:this.actor})
        : value;
    }
    this._d616CancelBiography(panel);
  }

  async _preClose(options) {
    if (this.isEditable) {
      for (const panel of this.element?.querySelectorAll?.('.mm-actor-bio-panel[data-editing="true"]') ?? [])
        await this._d616SaveBiography(panel);
    }
    return super._preClose?.(options);
  }

  // Foundry v14 dispatches drops from the directory through _onDropDocument.
  // Intercept BEFORE it constructs a new embedded Item, since malformed
  // v14 ActiveEffect duration data fails schema validation before hooks run.
  async _onDropDocument(event, document) {
    if (document?.documentName === 'Item' || document?.type && typeof document?.toObject === 'function' && document?.constructor?.documentName === 'Item') {
      if (document?.parent?.id !== this.actor.id) return d616DropActorItem(this, document);
    }
    return super._onDropDocument(event, document);
  }

  async _onDropItem(event,item) {
    if (item?.parent?.id === this.actor.id) return super._onDropItem(event,item);
    return d616DropActorItem(this,item);
  }

  async _onItemCreate(event) {
    const proto = this._d616LegacyPrototype;
    return proto._onItemCreate.call(this,event);
  }
  _onRoll(event) { return this._d616LegacyPrototype._onRoll.call(this,event); }
  _onSizeChange(event) { return this._d616LegacyPrototype._onSizeChange.call(this,event); }
  _changeSizeEffect(size) { return this._d616LegacyPrototype._changeSizeEffect.call(this,size); }
  _prepareItems(context) { return this._d616LegacyPrototype._prepareItems.call(this,context); }
}

class MarvelMultiverseCharacterSheet extends D616ActorSheetV2Common {
  static DEFAULT_OPTIONS = {position:{width:690,height:980}};
  static PARTS = {sheet:{template:D616_SHEET_TEMPLATES.character}};
  get _d616LegacyPrototype() {return LegacyMarvelMultiverseCharacterSheet.prototype;}
}

class MarvelMultiverseNPCSheet extends D616ActorSheetV2Common {
  static DEFAULT_OPTIONS = {position:{width:900,height:760}};
  static PARTS = {sheet:{template:D616_SHEET_TEMPLATES.npc}};
  get _d616LegacyPrototype() {return LegacyMarvelMultiverseNPCSheet.prototype;}
}

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
class LegacyMarvelMultiverseItemSheet extends foundry.appv1.sheets.ItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["multiverse-d616", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "description",
        },
      ],
    });
  }

  /** @override */
  async _onDrop(event) {
    // Occupation: handle Trait/Tag drops specifically for our drop zones.
    if (this.item?.type === "occupation") {
      const dropZone = event?.target?.closest?.(".mm-occ-drop");
      if (dropZone) {
        // Provide a wrapper compatible with our internal handler.
        return this._onOccupationDrop({ originalEvent: event, currentTarget: dropZone });
      }
    }

    return super._onDrop(event);
  }

  /** @override */
  get template() {
    const path = "systems/multiverse-d616/templates/item";
    // Return a single sheet for all item types.
    // return `${path}/item-sheet.hbs`;

    // Alternatively, you could use the following return statement to do a
    // unique item sheet by type, like `weapon-sheet.hbs`.
    const itemSheet = `${path}/item-${this.item.type}-sheet.hbs`;
    console.log(
      `Loading item sheet template: ${itemSheet} for type ${this.item.type}`
    );
    return itemSheet;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve base data structure.
    const context = super.getData();

    // Use a safe clone of the item data for further operations.
    const itemData = context.data;

    // Retrieve the roll data for TinyMCE editors.
    context.rollData = this.item.getRollData();

    // Add the item's data to context.data for easier access, as well as flags.
    context.system = itemData.system;
    context.flags = itemData.flags;

    // Prepare active effects for easier access
    context.effects = prepareActiveEffectCategories(this.item.effects);

    // Prepare data and items.
    if (itemData.type === "power" || itemData.type === "weapon") {
      context.elements = Object.fromEntries(
        Object.keys(CONFIG.MULTIVERSE_D616.elements).map((k) => [
          k,
          CONFIG.MULTIVERSE_D616.elements[k].label,
        ])
      );
      context.selectedElement = context.system.element;

      context.damageTypes = {
        health: { label: "Health" },
        focus: { label: "Focus" },
      };

      context.attackKinds = {
        ranged: { label: "Ranged" },
        close: { label: "Close" },
      };
      context.attackEdgeModes = {
        edge: { label: "Edge" },
        normal: { label: "Normal" },
        trouble: { label: "Trouble" },
      };
      context.abilities = {
        mle: {
          label: game.i18n.localize(CONFIG.MULTIVERSE_D616.abilities.mle),
        },
        agl: {
          label: game.i18n.localize(CONFIG.MULTIVERSE_D616.abilities.agl),
        },
        res: {
          label: game.i18n.localize(CONFIG.MULTIVERSE_D616.abilities.res),
        },
        vig: {
          label: game.i18n.localize(CONFIG.MULTIVERSE_D616.abilities.vig),
        },
        ego: {
          label: game.i18n.localize(CONFIG.MULTIVERSE_D616.abilities.ego),
        },
        log: {
          label: game.i18n.localize(CONFIG.MULTIVERSE_D616.abilities.log),
        },
      };
    }
    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // -------------------------------------------------------------
    // Occupation: Traits & Tags helpers (view, remove, drag & drop)
    // NOTE: We register dragover/drop even on read-only sheets so the
    // browser cursor isn't "prohibited". The drop handler itself still
    // enforces edit permission and will warn if not editable.
    if (this.item.type === "occupation") {
      html.on("click", ".mm-occ-view", (ev) => this._onOccupationView(ev));
      html.on("click", ".mm-occ-add", (ev) => this._onOccupationAdd(ev));

      // Ensure browser drop is permitted over our custom drop zones.
      html.on("dragenter dragover", ".mm-occ-drop", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const e = ev.originalEvent ?? ev;
        try {
          if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
        } catch (_err) {}
      });

      // Handle drop directly on the drop zones to avoid bubbling into
      // Foundry's generic drop handler.
      html.on("drop", ".mm-occ-drop", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const e = ev.originalEvent ?? ev;
        return this._onOccupationDrop({ originalEvent: e, currentTarget: ev.currentTarget });
      });

      if (this.isEditable) {
        html.on("click", ".mm-occ-remove", (ev) => this._onOccupationRemove(ev));
      }
    }

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Roll handlers, click handlers, etc. would go here.

    // Active Effect management
    html.on("click", ".effect-control", (ev) =>
      onManageActiveEffect(ev, this.item)
    );

  }

  /**
   * Handle dragging a Trait/Tag onto an Occupation item sheet.
   * We store a *copy* of the dropped Item data into the Occupation system.
   */
  async _onOccupationDrop(ev) {
    const event = ev?.originalEvent ?? ev;
    event.preventDefault();

    // Identify which list the user dropped onto (traits/tags)
    const dropZone = ev.currentTarget ?? event.currentTarget;
    const listKind = dropZone?.dataset?.kind; // "traits" | "tags"
    if (!listKind || !["traits", "tags"].includes(listKind)) return;

    if (!this.isEditable) {
      ui.notifications?.warn?.(
        "This Occupation is not editable. Unlock the compendium pack or import the entry to the world before editing Traits/Tags."
      );
      return;
    }

    // Parse drag data (robust across v13 sources and modules)
    let data;
    try {
      data = TextEditor.getDragEventData(event);
    } catch (_err) {
      data = null;
    }

    // Fallbacks for cases where the drag source provides raw text or a UUID link
    if (!data) {
      const raw =
        event?.dataTransfer?.getData?.("text/plain") ||
        event?.dataTransfer?.getData?.("application/json") ||
        "";

      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch (_err) {
          const m = raw.match(/@UUID\[([^\]]+)\]/);
          if (m?.[1]) data = { uuid: m[1] };
        }
      }
    }

    if (!data) return;

    // Resolve dropped document
    let dropped = null;
    try {
      // Foundry v13+ convenience
      if (Item?.implementation?.fromDropData) {
        dropped = await Item.implementation.fromDropData(data);
      }
    } catch (_err) {
      dropped = null;
    }

    if (!dropped && data?.uuid) {
      dropped = await fromUuid(data.uuid);
    }
    if (!dropped && data?.type === "Item" && data?.id) {
      // World Items
      dropped = game.items.get(data.id) ?? null;
      // Compendium Items
      if (!dropped && data?.pack) {
        try {
          const pack = game.packs.get(data.pack);
          dropped = (await pack?.getDocument?.(data.id)) ?? null;
        } catch (_err) {
          dropped = null;
        }
      }
    }

    if (!dropped || dropped.documentName !== "Item") return;
    if (!dropped.isOwner && dropped.pack) {
      // Compendium items are fine; permission checks are handled by Foundry
    }

    // Only Trait/Tag items can be attached
    const expectedType = listKind === "traits" ? "trait" : "tag";
    if (dropped.type !== expectedType) {
      ui.notifications?.warn?.(
        `Drop a ${expectedType} item here (you dropped: ${dropped.type}).`
      );
      return;
    }

    const current = foundry.utils.duplicate(this.item.system?.[listKind] ?? []);
    const multiple = !!dropped.system?.multiple;

    // De-duplicate by uuid (preferred) or name
    const droppedUuid = dropped.uuid;
    const alreadyHas = current.some((e) => {
      if (droppedUuid && e?.uuid) return e.uuid === droppedUuid;
      return (e?.name ?? "").trim() === (dropped.name ?? "").trim();
    });

    if (alreadyHas && !multiple) {
      ui.notifications?.info?.(`${dropped.name} is already in this list.`);
      return;
    }

    // Store a copy, but also keep a uuid pointer when possible
    const stored = dropped.toObject();
    stored.uuid = droppedUuid;
    current.push(stored);

    await this.item.update({ [`system.${listKind}`]: current });
  }

  /**
   * Open a picker dialog to add Traits/Tags to an Occupation.
   * This is a reliable alternative to drag & drop (some module stacks block native DnD).
   */
  async _onOccupationAdd(ev) {
    ev.preventDefault();
    ev.stopPropagation();

    const kind = ev.currentTarget?.dataset?.kind;
    if (!kind || !["traits", "tags"].includes(kind)) return;

    if (!this.isEditable) {
      ui.notifications?.warn?.(
        "This Occupation is not editable. Unlock the compendium pack or import the entry to the world before editing Traits/Tags."
      );
      return;
    }

    const expectedType = kind === "traits" ? "trait" : "tag";
    const kindLabel = kind === "traits" ? "Trait" : "Tag";

    // Collect candidates from World + any Item compendiums (system or world)
    const candidates = [];
    const seen = new Set();

    const isTypeMatch = (t, expected) => {
      if (!t) return false;
      if (t === expected) return true;
      if (t === `${expected}s`) return true; // tolerate plural
      // extra tolerance
      if (expected === "trait" && t === "traits") return true;
      if (expected === "tag" && t === "tags") return true;
      return false;
    };

    const addCandidate = (name, uuid, source) => {
      if (!name || !uuid) return;
      if (seen.has(uuid)) return;
      seen.add(uuid);
      candidates.push({ name, uuid, source });
    };

    // World items
    for (const it of game.items) {
      if (!isTypeMatch(it?.type, expectedType)) continue;
      addCandidate(
        it.name,
        it.uuid,
        game.i18n?.localize?.("DOCUMENT.World") ??
          game.i18n?.localize?.("WORLD") ??
          "World"
      );
    }

    // Any compendium packs that contain Items
    for (const pack of game.packs) {
      try {
        if (pack?.documentName !== "Item") continue;
        // Index only what we need for filtering and display
        const index = await pack.getIndex({ fields: ["type", "name"] });
        for (const e of index) {
          if (!isTypeMatch(e?.type, expectedType)) continue;
          const uuid =
            e?.uuid ?? `Compendium.${pack.collection}.${e._id ?? e.id}`;
          addCandidate(
            e.name,
            uuid,
            pack.metadata?.label ?? pack.collection
          );
        }
      } catch (_err) {
        // ignore pack indexing errors
      }
    }

    if (!candidates.length) {
      ui.notifications?.warn?.(`No ${expectedType} items found in the World or any Item compendium packs.`);
      return;
    }

    candidates.sort((a, b) =>
      (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base" })
    );

    // Foundry v13: TextEditor.encodeHTML is no longer available.
    // Use the supported helper under foundry.utils.
    const esc = foundry?.utils?.escapeHTML ?? ((s) => {
      const str = String(s ?? "");
      return str
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    });

    const rows = candidates
      .map((c) => {
        const safeName = esc(c.name ?? "");
        const safeSource = esc(c.source ?? "");
        return `
          <label class="mm-occ-picker-row" style="display:flex; align-items:center; gap:8px; padding:4px 2px;">
            <input class="mm-occ-pick" type="checkbox" data-uuid="${c.uuid}" />
            <span style="flex:1;">${safeName}</span>
            <span style="opacity:.7; font-size:11px;">${safeSource}</span>
          </label>
        `;
      })
      .join("");

    const content = `
      <div class="flexcol" style="gap:.5rem;">
        <p style="margin:0; opacity:.85;">Select one or more <strong>${kindLabel}</strong> entries to add.</p>
        <input class="mm-occ-picker-search" type="text" placeholder="Search..." style="width:100%;" />
        <div class="mm-occ-picker-list" style="max-height: 320px; overflow:auto; border:1px solid rgba(255,255,255,.15); padding:6px; border-radius:6px;">
          ${rows}
        </div>
        <p style="margin:0; opacity:.7; font-size: 11px;">Tip: You can still try drag & drop — this picker is here because some module stacks block DnD.</p>
      </div>
    `;

    const dlg = new Dialog(
      {
        title: `Add ${kindLabel}(s)`,
        content,
        buttons: {
          add: {
            icon: '<i class="fas fa-plus"></i>',
            label: "Add Selected",
            callback: async (html) => {
              const picked = Array.from(html[0].querySelectorAll("input.mm-occ-pick:checked"))
                .map((i) => i.getAttribute("data-uuid"))
                .filter(Boolean);

              if (!picked.length) {
                ui.notifications?.info?.("Nothing selected.");
                return;
              }

              const current = foundry.utils.duplicate(this.item.system?.[kind] ?? []);
              const added = [];
              const skipped = [];

              for (const uuid of picked) {
                let doc = null;
                try {
                  doc = await fromUuid(uuid);
                } catch (_err) {
                  doc = null;
                }
                if (!doc || doc.documentName !== "Item") continue;
                if (doc.type !== expectedType) continue;

                const multiple = !!doc.system?.multiple;
                const alreadyHas = current.some((e) => {
                  if (uuid && e?.uuid) return e.uuid === uuid;
                  return (e?.name ?? "").trim() === (doc.name ?? "").trim();
                });

                if (alreadyHas && !multiple) {
                  skipped.push(doc.name);
                  continue;
                }

                const stored = doc.toObject();
                stored.uuid = uuid;
                current.push(stored);
                added.push(doc.name);
              }

              await this.item.update({ [`system.${kind}`]: current });
              if (added.length) ui.notifications?.info?.(`Added: ${added.join(", ")}`);
              if (skipped.length) ui.notifications?.info?.(`Skipped (already present): ${skipped.join(", ")}`);
            },
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
          },
        },
        default: "add",
      },
      { width: 520 }
    );

    dlg.render(true);

    // Wire up search filtering after render
    setTimeout(() => {
      const root = dlg.element?.[0];
      if (!root) return;
      const input = root.querySelector("input.mm-occ-picker-search");
      const rows = Array.from(root.querySelectorAll("label.mm-occ-picker-row"));
      if (!input || !rows.length) return;

      input.addEventListener("input", () => {
        const q = (input.value ?? "").toLowerCase().trim();
        for (const r of rows) {
          const text = (r.textContent ?? "").toLowerCase();
          r.style.display = !q || text.includes(q) ? "flex" : "none";
        }
      });
    }, 0);
  }

  async _onOccupationRemove(ev) {
    ev.preventDefault();
    const kind = ev.currentTarget?.dataset?.kind;
    const index = Number(ev.currentTarget?.dataset?.index ?? -1);
    if (!kind || !["traits", "tags"].includes(kind) || !Number.isFinite(index) || index < 0) return;

    const current = foundry.utils.duplicate(this.item.system?.[kind] ?? []);
    if (index >= current.length) return;
    current.splice(index, 1);
    await this.item.update({ [`system.${kind}`]: current });
  }

  _onOccupationView(ev) {
    ev.preventDefault();
    const kind = ev.currentTarget?.dataset?.kind;
    const index = Number(ev.currentTarget?.dataset?.index ?? -1);
    if (!kind || !["traits", "tags"].includes(kind) || !Number.isFinite(index) || index < 0) return;

    const entry = (this.item.system?.[kind] ?? [])[index];
    if (!entry) return;

    const title = entry.name ?? "";
    const description = entry.system?.description ?? entry.description ?? "";
    const restriction = entry.system?.restriction ?? "";
    const rarity = entry.system?.rarity ?? "";

    const esc = foundry?.utils?.escapeHTML ?? ((s) => {
      const str = String(s ?? "");
      return str
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    });

    const content = `
      <div class="flexcol" style="gap: .5rem;">
        ${restriction ? `<p><strong>Restriction:</strong> ${esc(restriction)}</p>` : ""}
        ${rarity ? `<p><strong>Rarity:</strong> ${esc(rarity)}</p>` : ""}
        <hr />
        <div>${description || "<em>No description.</em>"}</div>
      </div>
    `;

    new Dialog({
      title,
      content,
      buttons: {
        ok: { icon: '<i class="fas fa-check"></i>', label: "OK" },
      },
      default: "ok",
    }).render(true);
  }
}


/* -------------------------------------------------------------------------- */
/* D616 ItemSheetV2 — Foundry 14                                              */
/* -------------------------------------------------------------------------- */
/* Preserve the original power, weapon, occupation, origin, trait and tag
 * template contracts; modernize the document sheet lifecycle instead of
 * rewriting fields or Active Effects. The V1 sheet remains opt-in. */
const D616ItemSheetV2Base = foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ItemSheetV2
);
const D616_ITEM_TEMPLATE_DIR = 'systems/multiverse-d616/templates/item';
const D616_ITEM_TYPES = new Set(['power','weapon','trait','tag','origin','occupation','item']);

function d616ItemSheetInitialTab(type) {
  return ['power','weapon','trait'].includes(type) ? 'attributes' : 'description';
}

function d616ItemSheetTemplate(type) {
  const safeType = D616_ITEM_TYPES.has(type) ? type : 'item';
  return `${D616_ITEM_TEMPLATE_DIR}/item-${safeType}-sheet.hbs`;
}

function d616ActivateItemTab(sheet,tab) {
  const root = sheet.element;
  if (!root) return;
  const tabs = [...root.querySelectorAll('.sheet-tabs [data-tab]')];
  if (tabs.length && !tabs.some(el=>el.dataset.tab===tab))
    tab = tabs[0].dataset.tab;
  sheet.tabGroups.primary = tab;
  for (const el of tabs) {
    const active = el.dataset.tab === tab;
    el.classList.toggle('active',active);
    el.setAttribute('aria-selected',String(active));
  }
  root.querySelectorAll('.sheet-body > .tab[data-tab]').forEach(el=>{
    const active = el.dataset.tab===tab;
    el.classList.toggle('active',active);
    el.hidden = !active;
    el.style.display = active ? '' : 'none';
  });
}

class MarvelMultiverseItemSheet extends D616ItemSheetV2Base {
  static DEFAULT_OPTIONS = {
    classes: ['multiverse-d616','sheet','item','mm-item-v2'],
    position: {width:600,height:680},
    window: {resizable:true},
    form: {submitOnChange:false,closeOnSubmit:false},
  };
  static PARTS = {sheet:{template:`${D616_ITEM_TEMPLATE_DIR}/item-item-sheet.hbs`}};
  tabGroups = {primary:null};

  async _prepareContext(options) {
    const context=await super._prepareContext(options);
    const snapshot=this.item.toObject(false);
    context.item=this.item;
    context.document=this.item;
    context.data=snapshot;
    context.system=foundry.utils.deepClone(this.item.system.toObject?.(false) ?? snapshot.system ?? {});
    // Preserve the DocumentSheetV2 `source` contract supplied by super.
    // The item's raw HTML is kept separately from its enriched read-only view:
    // showing it must never depend on whether ProseMirror has been activated.
    context.richTextSource=foundry.utils.deepClone(this.item._source?.system ?? snapshot.system ?? {});
    context.enriched={};
    const editor=foundry.applications?.ux?.TextEditor?.implementation ?? globalThis.TextEditor;
    for (const key of ['description','effect']) {
      const html=String(context.richTextSource[key] ?? '');
      try {
        context.enriched[key]=typeof editor?.enrichHTML==='function'
          ? await editor.enrichHTML(html,{secrets:this.item.isOwner,relativeTo:this.item})
          : (foundry.utils.escapeHTML?.(html) ?? html);
      } catch (error) {
        console.warn(`[multiverse-d616] Could not enrich Item ${key}:`,error);
        context.enriched[key]=foundry.utils.escapeHTML?.(html) ?? '';
      }
    }
    context.flags=snapshot.flags ?? {};
    context.rollData=this.item.getRollData();
    context.editable=this.isEditable;
    context.owner=this.item.isOwner;
    context.cssClass=this.isEditable ? 'editable' : 'locked';
    context.effects=prepareActiveEffectCategories(this.item.effects);
    if (supportsAttachedPowers(this.item)) {
      context.attachedPowers=getAttachedPowers(this.item);
      context.canActivateAttachedPowers=attachedPowerUsable(this.item) && (this.item.actor?.isOwner===true || game.user?.isGM===true);
      context.attachedPowersUnequipped=this.item.type==='weapon' && this.item.system?.equipped!==true;
    }
    if (this.item.type === 'weapon') {
      context.adamantiumConfigured = hasAdamantiumEffect(this.item);
      context.adamantiumValue = weaponAdamantiumValue(this.item);
    }
    if (['power','weapon'].includes(this.item.type)) {
      context.powerVfx=getPowerVfxConfig(this.item);
      context.vfxModes={auto:'Automático',projectile:'Projétil (do portador até o alvo)',target:'Impacto no alvo',self:'Sobre o portador'};
      context.vfxLayers={above:'Acima do token (escudos e auras)',below:'Abaixo do token (efeito no solo)'};
      context.elements=Object.fromEntries(Object.entries(CONFIG.MULTIVERSE_D616.elements)
        .map(([id,el])=>[id,el.label]));
      context.selectedElement=context.system.element;
      context.damageTypes={health:{label:'Health'},focus:{label:'Focus'}};
      context.attackKinds={ranged:{label:'Ranged'},close:{label:'Close'}};
      context.attackEdgeModes={edge:{label:'Edge'},normal:{label:'Normal'},trouble:{label:'Trouble'}};
      context.abilities=Object.fromEntries(Object.entries(CONFIG.MULTIVERSE_D616.abilities)
        .map(([id,label])=>[id,{label:game.i18n.localize(label)}]));
    }
    return context;
  }


  async _onRender(context,options) {
    await super._onRender(context,options);
    const root=this.element;
    if (!root) return;
    root.querySelectorAll('.sheet-tabs [data-tab]').forEach(tab=>
      tab.addEventListener('click',event=>{
        event.preventDefault();
        d616ActivateItemTab(this,tab.dataset.tab);
      }));
    d616ActivateItemTab(this,this.tabGroups.primary ?? d616ItemSheetInitialTab(this.item.type));

    if (this.isEditable) {
      // Deliberately do not submit the entire form on change: a rich-text
      // editor may still contain an inactive/empty form value and otherwise
      // overwrite the stored description/effect (v0.2.37 regression).
      root.querySelectorAll('input[name], select[name], textarea[name]').forEach(control=>{
        control.addEventListener('change',event=>this._d616SaveSimpleField(event));
      });
      // Explicit, always-visible rich-text controls avoid ProseMirror form
      // lifecycle issues. Every field saves independently on its own Item.
      root.querySelectorAll('.mm-vfx-field').forEach(control=>control.addEventListener('change',async event=>{
        const key=event.currentTarget.dataset.vfxField;
        if(!['enabled','file','mode','scale','persistent','layer'].includes(key))return;
        const current=getPowerVfxConfig(this.item);
        let value=event.currentTarget.type==='checkbox'?event.currentTarget.checked:event.currentTarget.value;
        if(key==='scale')value=Math.max(0.25,Math.min(5,Number(value)||1));
        try{await this.item.update({'flags.multiverse-d616.vfx':{...current,[key]:value}});}
        catch(error){console.warn('[D616] VFX configuration:',error);ui.notifications?.error?.('Falha ao salvar a animação.');}
      }));
      root.querySelectorAll('.mm-vfx-browse').forEach(button=>button.addEventListener('click',event=>{
        event.preventDefault();
        const input=root.querySelector('.mm-vfx-field[data-vfx-field="file"]');
        void openPowerVfxBrowser({initial:input?.value??'',onSelect:async path=>{
          const current=getPowerVfxConfig(this.item);
          await this.item.update({'flags.multiverse-d616.vfx':{...current,file:path}});
          if(input)input.value=path;
        }});
      }));
      root.querySelectorAll('.mm-vfx-preview').forEach(button=>button.addEventListener('click',event=>{
        event.preventDefault();
        void playPowerVfx(this.item,{preview:true});
      }));
      root.querySelectorAll('.mm-item-richtext-edit').forEach(button=>
        button.addEventListener('click',event=>{
          event.preventDefault();
          this._d616OpenRichText(button.closest('.mm-item-richtext'));
        }));
      root.querySelectorAll('.mm-item-cancel-richtext').forEach(button=>
        button.addEventListener('click',event=>{
          event.preventDefault();
          this._d616CancelRichText(button.closest('.mm-item-richtext'));
        }));
      root.querySelectorAll('.mm-item-save-richtext').forEach(button=>
        button.addEventListener('click',async event=>{
          event.preventDefault();
          const panel=button.closest('.mm-item-richtext');
          try {
            await this._d616SaveRichTextPanel(panel);
            ui.notifications?.info?.(`${panel?.dataset.field === 'effect' ? 'Efeito' : 'Descrição'} salvo(a).`);
          } catch(error) {
            console.error('[multiverse-d616] Item rich-text save failed:',error);
            ui.notifications?.error?.('Não foi possível salvar o texto do poder. Veja o console.');
          }
        }));
      root.querySelectorAll('img[data-edit="img"]').forEach(img=>
        img.addEventListener('click',event=>{
          event.preventDefault();
          const Picker=foundry.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
          if (Picker) new Picker({type:'image',current:this.item.img,
            callback:path=>this.item.update({img:path})}).render(true);
        }));
      root.querySelectorAll('.effect-control').forEach(link=>
        link.addEventListener('click',event=>onManageActiveEffect(event,this.item)));
      if (supportsAttachedPowers(this.item)) {
        root.querySelectorAll('.mm-attached-power-edit').forEach(button=>
          button.addEventListener('click',async event=>{
            event.preventDefault();
            const id=button.closest('[data-attached-power-id]')?.dataset.attachedPowerId;
            if (!id) return;
            button.disabled=true;
            try { await editAttachedPower(this.item,id); this.render(); }
            catch(error) {
              console.error('[multiverse-d616] Falha ao editar poder associado:',error);
              ui.notifications?.error?.(error?.message ?? 'Não foi possível editar o poder.');
            } finally { button.disabled=false; }
          }));
        root.querySelectorAll('.mm-attached-power-remove').forEach(button=>
          button.addEventListener('click',async event=>{
            event.preventDefault();
            const id=button.closest('[data-attached-power-id]')?.dataset.attachedPowerId;
            if (!id) return;
            try { await detachPower(this.item,id); this.render(); }
            catch(error) {
              console.error('[multiverse-d616] Falha ao remover poder de equipamento:',error);
              ui.notifications?.error?.('Não foi possível remover o poder.');
            }
          }));
      }
      if (this.item.type === 'weapon') {
        root.querySelectorAll('.mm-add-adamantium-effect').forEach(button=>
          button.addEventListener('click',async event=>{
            event.preventDefault();
            if (hasAdamantiumEffect(this.item)) {
              ui.notifications?.warn?.('A arma já possui Adamantium. Edite o efeito existente para alterar o valor.');
              return;
            }
            try {
              await this.item.createEmbeddedDocuments('ActiveEffect',[adamantiumEffectData(this.item)]);
              ui.notifications?.info?.('Adamantium 1 adicionado à arma. Ative Equipado para usar.');
              this.render();
            } catch(error) {
              console.error('[multiverse-d616] Não foi possível adicionar Adamantium:',error);
              ui.notifications?.error?.('Não foi possível criar o efeito Adamantium. Confira o console.');
            }
          }));
      }
    }
    if (supportsAttachedPowers(this.item)) {
      root.querySelectorAll('.mm-attached-power-use').forEach(button=>
        button.addEventListener('click',async event=>{
          event.preventDefault();
          if (button.disabled) return;
          const id=button.closest('[data-attached-power-id]')?.dataset.attachedPowerId;
          if (!id) return;
          button.disabled=true;
          try { await activateAttachedPower(this.item,id); }
          catch(error) {
            console.error('[multiverse-d616] Erro ao ativar poder de equipamento:',error);
            ui.notifications?.error?.(error?.message ?? 'Falha ao usar poder.');
          } finally { button.disabled=!attachedPowerUsable(this.item); }
        }));
    }
    if (this.item.type!=='occupation') return;
    root.querySelectorAll('.mm-occ-view').forEach(el=>el.addEventListener('click',event=>
      LegacyMarvelMultiverseItemSheet.prototype._onOccupationView.call(this,event)));
    root.querySelectorAll('.mm-occ-add').forEach(el=>el.addEventListener('click',event=>
      LegacyMarvelMultiverseItemSheet.prototype._onOccupationAdd.call(this,event)));
    if (this.isEditable) root.querySelectorAll('.mm-occ-remove').forEach(el=>
      el.addEventListener('click',event=>
        LegacyMarvelMultiverseItemSheet.prototype._onOccupationRemove.call(this,event)));
    for (const zone of root.querySelectorAll('.mm-occ-drop')) {
      for (const type of ['dragenter','dragover']) zone.addEventListener(type,event=>{
        event.preventDefault(); event.stopPropagation();
        if (event.dataTransfer) event.dataTransfer.dropEffect='copy';
      });
      zone.addEventListener('drop',event=>{
        event.preventDefault();event.stopPropagation();
        this._onOccupationDrop({originalEvent:event,currentTarget:zone});
      });
    }
  }

  async _d616SaveSimpleField(event) {
    if (!this.isEditable) return;
    const control=event.currentTarget;
    const field=String(control?.name ?? '');
    if (field !== 'name' && !/^system\.[a-zA-Z][a-zA-Z0-9_.]*$/.test(field)) return;
    // Rich-text saves are handled only by the editor's explicit save event.
    if (['system.description','system.effect'].includes(field)) return;
    let value=control.type==='checkbox' ? !!control.checked : control.value;
    if (control.type==='number' || control.dataset.dtype==='Number') {
      value = value === '' ? null : Number(value);
      if (value !== null && !Number.isFinite(value)) return;
    }
    try {
      await this.item.update({[field]:value});
    } catch(error) {
      console.error(`[multiverse-d616] Item field ${field} save failed:`,error);
      ui.notifications?.error?.(`Não foi possível salvar ${field}.`);
    }
  }

  _d616OpenRichText(panel) {
    if (!this.isEditable || !panel) return;
    const edit=panel.querySelector('.mm-item-richtext-editor');
    const content=panel.querySelector('.mm-item-richtext-editable');
    const preview=panel.querySelector('.mm-item-richtext-readonly');
    if (!edit || !content || !preview) return;
    // The visible text was enriched/sanitized by Foundry when rendered.
    // Reuse that safe HTML in a simple inline WYSIWYG editing surface.
    content.innerHTML=preview.innerHTML;
    edit.hidden=false;
    panel.dataset.editing='true';
    panel.querySelector('.mm-item-richtext-edit')?.setAttribute('aria-expanded','true');
    content.focus();
  }

  _d616CancelRichText(panel) {
    if (!panel) return;
    const edit=panel.querySelector('.mm-item-richtext-editor');
    if (edit) edit.hidden=true;
    delete panel.dataset.editing;
    panel.querySelector('.mm-item-richtext-edit')?.setAttribute('aria-expanded','false');
  }

  async _d616SaveRichTextPanel(panel) {
    if (!this.isEditable || !panel || panel.dataset.editing!=='true') return;
    const field=String(panel.dataset.field ?? '');
    if (!['description','effect'].includes(field)) return;
    const content=panel.querySelector('.mm-item-richtext-editable');
    if (!content) return;
    // Persist this one field only: other text fields and Element are untouched.
    const value=content.innerHTML;
    if (value !== String(this.item.system?.[field] ?? ''))
      await this.item.update({[`system.${field}`]:value});
    const preview=panel.querySelector('.mm-item-richtext-readonly');
    if (preview) {
      const editor=foundry.applications?.ux?.TextEditor?.implementation ?? globalThis.TextEditor;
      preview.innerHTML=typeof editor?.enrichHTML==='function'
        ? await editor.enrichHTML(value,{secrets:this.item.isOwner,relativeTo:this.item})
        : value;
    }
    this._d616CancelRichText(panel);
  }

  async _preClose(options) {
    // A close through X also commits any actively edited content.
    if (this.isEditable) for (const panel of this.element?.querySelectorAll?.('.mm-item-richtext[data-editing="true"]') ?? []) {
      await this._d616SaveRichTextPanel(panel);
    }
    return super._preClose?.(options);
  }

  async _onDropDocument(event, document) {
    if (!supportsAttachedPowers(this.item) || document?.type !== 'power')
      return super._onDropDocument(event,document);
    if (!this.isEditable) {
      ui.notifications?.warn?.('Sem permissão para adicionar poderes a este equipamento.');
      return null;
    }
    try {
      const result=await attachPower(this.item,document);
      if (result.added) {
        ui.notifications?.info?.(`Poder ${result.entry.name} associado a ${this.item.name}.`);
        this.tabGroups.primary='powers';
        this.render();
      } else ui.notifications?.warn?.(result.reason);
      return result.added ? document : null;
    } catch(error) {
      console.error('[multiverse-d616] Não foi possível associar Poder ao equipamento:',error);
      ui.notifications?.error?.(error?.message ?? 'Erro ao adicionar Poder.');
      return null;
    }
  }

  async _onDrop(event) {
    const zone=event?.target?.closest?.('.mm-occ-drop');
    if (this.item.type==='occupation' && zone)
      return this._onOccupationDrop({originalEvent:event,currentTarget:zone});
    return super._onDrop(event);
  }

  _onOccupationDrop(event) {
    return LegacyMarvelMultiverseItemSheet.prototype._onOccupationDrop.call(this,event);
  }
}

// One registered subclass per template: no shared static state when players
// keep different Item sheets open simultaneously.
class D616PowerItemSheet extends MarvelMultiverseItemSheet {
  static PARTS={sheet:{template:d616ItemSheetTemplate('power')}};
}
class D616WeaponItemSheet extends MarvelMultiverseItemSheet {
  static PARTS={sheet:{template:d616ItemSheetTemplate('weapon')}};
}
class D616TraitItemSheet extends MarvelMultiverseItemSheet {
  static PARTS={sheet:{template:d616ItemSheetTemplate('trait')}};
}
class D616TagItemSheet extends MarvelMultiverseItemSheet {
  static PARTS={sheet:{template:d616ItemSheetTemplate('tag')}};
}
class D616OriginItemSheet extends MarvelMultiverseItemSheet {
  static PARTS={sheet:{template:d616ItemSheetTemplate('origin')}};
}
class D616OccupationItemSheet extends MarvelMultiverseItemSheet {
  static PARTS={sheet:{template:d616ItemSheetTemplate('occupation')}};
}
class D616BasicItemSheet extends MarvelMultiverseItemSheet {
  static PARTS={sheet:{template:d616ItemSheetTemplate('item')}};
}
const D616ItemSheetsByType={
  power:D616PowerItemSheet,weapon:D616WeaponItemSheet,trait:D616TraitItemSheet,
  tag:D616TagItemSheet,origin:D616OriginItemSheet,
  occupation:D616OccupationItemSheet,item:D616BasicItemSheet
};

/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
const preloadHandlebarsTemplates = async () =>
  foundry.applications.handlebars.loadTemplates([
    // Actor partials.
    "systems/multiverse-d616/templates/actor/parts/actor-biography.hbs",
    "systems/multiverse-d616/templates/actor/parts/actor-details.hbs",
    "systems/multiverse-d616/templates/actor/parts/actor-effects.hbs",
    "systems/multiverse-d616/templates/actor/parts/actor-items.hbs",
    "systems/multiverse-d616/templates/actor/parts/actor-occupation.hbs",
    "systems/multiverse-d616/templates/actor/parts/actor-origin.hbs",
    "systems/multiverse-d616/templates/actor/parts/actor-powers.hbs",
    "systems/multiverse-d616/templates/actor/parts/actor-tags.hbs",
    "systems/multiverse-d616/templates/actor/parts/actor-traits.hbs",
    "systems/multiverse-d616/templates/actor/parts/actor-weapons.hbs",
    "systems/multiverse-d616/templates/actor/actor-limited-sheet.hbs",
    // Item partials
    "systems/multiverse-d616/templates/item/parts/item-effects.hbs",
    "systems/multiverse-d616/templates/item/parts/item-attached-powers.hbs",
    "systems/multiverse-d616/templates/item/parts/item-power-vfx.hbs",
  ]);

class MarvelMultiverseActorBase extends foundry.abstract
  .TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = {};

    schema.attributes = new fields.SchemaField({
      init: new fields.SchemaField({
        value: new fields.NumberField({
          ...requiredInteger,
          initial: 0,
          min: 0,
        }),
        edge: new fields.BooleanField({ required: true, initial: false }),
        trouble: new fields.BooleanField({ required: true, initial: false }),
      }),

      rank: new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 1 }),
      }),
    });

    // Iterate over ability names and create a new SchemaField for each.
    schema.abilities = new fields.SchemaField(
      Object.keys(CONFIG.MULTIVERSE_D616.abilities).reduce((obj, ability) => {
        obj[ability] = new fields.SchemaField({
          value: new fields.NumberField({
            required: true,
            nullable: false,
            initial: 0,
            min: -3,
          }),
          defense: new fields.NumberField({
            required: true,
            nullable: false,
            initial: 0,
          }),
          noncom: new fields.NumberField({
            required: true,
            nullable: false,
            initial: 0,
            min: 0,
          }),
          edge: new fields.BooleanField({ required: true, initial: false }),
          damageMultiplier: new fields.NumberField({
            ...requiredInteger,
            initial: 0,
            min: 0,
          }),
          label: new fields.StringField({ required: true, blank: true }),
        });
        return obj;
      }, {})
    );

    schema.health = new fields.SchemaField({
      value: new fields.NumberField({
        required: true,
        nullable: false,
        initial: 0,
        min: -300,
      }),
      max: new fields.NumberField({
        required: true,
        nullable: false,
        initial: 0,
      }),
    });

    schema.healthDamageReduction = new fields.NumberField({
      ...requiredInteger,
      initial: 0,
    });
    schema.focus = new fields.SchemaField({
      value: new fields.NumberField({
        required: true,
        nullable: false,
        initial: 0,
        min: -300,
      }),
      max: new fields.NumberField({
        required: true,
        nullable: false,
        initial: 0,
      }),
    });

    schema.focusDamageReduction = new fields.NumberField({
      ...requiredInteger,
      initial: 0,
    });

    schema.karma = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 0 }),
    });

    schema.codename = new fields.StringField({ required: true, blank: true }); // equivalent to passing ({initial: ""}) for StringFields
    schema.realname = new fields.StringField({ required: true, blank: true }); // equivalent to passing ({initial: ""}) for StringFields
    schema.height = new fields.StringField({ required: true, blank: true }); // equivalent to passing ({initial: ""}) for StringFields
    schema.weight = new fields.StringField({ required: true, blank: true }); // equivalent to passing ({initial: ""}) for StringFields
    schema.gender = new fields.StringField({ required: true, blank: true }); // equivalent to passing ({initial: ""}) for StringFields
    schema.eyes = new fields.StringField({ required: true, blank: true }); // equivalent to passing ({initial: ""}) for StringFields
    schema.hair = new fields.StringField({ required: true, blank: true }); // equivalent to passing ({initial: ""}) for StringFields
    schema.size = new fields.StringField({
      required: true,
      initial: "average",
    });
    schema.distinguishingFeatures = new fields.StringField({
      required: true,
      blank: true,
    }); // equivalent to passing ({initial: ""}) for StringFields
    schema.teams = new fields.StringField({ required: true, blank: true }); // equivalent to passing ({initial: ""}) for StringFields
    schema.history = new fields.StringField({ required: true, blank: true }); // equivalent to passing ({initial: ""}) for StringFields
    schema.personality = new fields.StringField({
      required: true,
      blank: true,
    }); // equivalent to passing ({initial: ""}) for StringFields

    schema.actorSizes = new fields.SchemaField(
      Object.keys(CONFIG.MULTIVERSE_D616.sizes).reduce((obj, size) => {
        obj[size] = new fields.SchemaField({
          label: new fields.StringField({
            required: true,
            initial: CONFIG.MULTIVERSE_D616.sizes[size].label,
          }),
        });
        return obj;
      }, {})
    );

    schema.movement = new fields.SchemaField(
      Object.keys(CONFIG.MULTIVERSE_D616.movementTypes).reduce(
        (obj, movement) => {
          obj[movement] = new fields.SchemaField({
            label: new fields.StringField({
              required: true,
              initial: CONFIG.MULTIVERSE_D616.movementTypes[movement].label,
            }),
            value: new fields.NumberField({
              ...requiredInteger,
              initial: 5,
              min: 0,
            }),
            noncom: new fields.NumberField({
              ...requiredInteger,
              initial: 5,
              min: 0,
            }),
            // Strongest power's out-of-combat factor; never multiply tiers.
            noncomFactor: new fields.NumberField({
              ...requiredInteger,
              initial: 1,
              min: 0,
            }),
            active: new fields.BooleanField({
              required: true,
              initial: CONFIG.MULTIVERSE_D616.movementTypes[movement].active,
            }),
            rankMode: new fields.StringField({ required: true, blank: true }),
            calc: new fields.StringField({ blank: true }),
          });
          return obj;
        },
        {}
      )
    );

    schema.base = new fields.StringField({ required: true, blank: true });
    schema.occupations = new fields.ArrayField(new fields.ObjectField());
    schema.weapons = new fields.ArrayField(new fields.ObjectField());
    schema.origins = new fields.ArrayField(new fields.ObjectField());
    schema.gear = new fields.ArrayField(new fields.ObjectField());
    schema.tags = new fields.ArrayField(new fields.ObjectField());
    schema.traits = new fields.ArrayField(new fields.ObjectField());
    schema.powers = new fields.SchemaField(
      Object.keys(CONFIG.MULTIVERSE_D616.powersets).reduce(
        (obj, powerset) => {
          obj[powerset] = new fields.ArrayField(new fields.ObjectField());
          return obj;
        },
        {}
      )
    );
    schema.reach = new fields.NumberField({
      ...requiredInteger,
      initial: 1,
      min: 0,
    });
    // Highest permanent Extended Reach level (x4 or x10); never compound.
    schema.reachFactor = new fields.NumberField({
      ...requiredInteger,
      initial: 1,
      min: 1,
    });
    schema.defaultElement = new fields.StringField({
      required: true,
      blank: true,
    });

    return schema;
  }

  prepareDerivedData() {
    // Shared PC/NPC calculation (v0.2.0); retain established ability math.
    for (const key in this.abilities) {
      this.abilities[key].defense += this.abilities[key].value + 10;
      this.abilities[key].damageMultiplier += this.attributes.rank.value;
      this.abilities[key].noncom += this.abilities[key].value;
      this.abilities[key].label = game.i18n.localize(CONFIG.MULTIVERSE_D616.abilities[key]) ?? key;
    }
    this.attributes.init.value += this.abilities.vig.value;

    const movementLabels = Object.fromEntries(Object.entries(CONFIG.MULTIVERSE_D616.movementTypes)
      .map(([key, config]) => [key, game.i18n.localize(config.label) ?? key]));
    prepareD616Movement(this, this.parent, movementLabels);

    // Earth elemental effect halves every actual speed, including non-combat.
    if (hasElementalHalfMovement(this.parent)) {
      for (const movement of Object.values(this.movement)) {
        movement.value = Math.ceil((Number(movement.value) || 0) / 2);
        movement.noncom = Math.ceil((Number(movement.noncom) || 0) / 2);
      }
    }
  }
}

class MarvelMultiverseCharacter extends MarvelMultiverseActorBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = MarvelMultiverseActorBase.defineSchema();

    schema.teamManeuver = new fields.SchemaField({
      maneuverType: new fields.StringField({ required: true, blank: true }),
      level: new fields.NumberField({ min: 1, max: 3, integer: true }),
    });

    return schema;
  }
}

class MarvelMultiverseNPC extends MarvelMultiverseActorBase {
  // Inherit exactly the same size, movement, and derived data rules as PCs.
}

class MarvelMultiverseItemBase extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = {};

    schema.description = new fields.StringField({ required: true, blank: true });

    
    schema.size = new fields.StringField({ blank: true });
    schema.quantity = new fields.NumberField({ ...requiredInteger, initial: 1, min: 1 });
    
    schema.ability = new fields.StringField({required: true, blank: true});
    schema.attack = new fields.BooleanField({ required: true, initial: false });
    schema.formula = new fields.StringField({required: true,  initial: "{1d6,1dm,1d6}" });
    
    return schema;
  }
}

class MarvelMultiverseItem extends MarvelMultiverseItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;

    const schema = MarvelMultiverseItemBase.defineSchema();

    schema.weight = new fields.NumberField({
      required: true,
      nullable: false,
      initial: 0,
      min: 0,
    });

    return schema;
  }
}

class MarvelMultiverseWeapon extends MarvelMultiverseItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = MarvelMultiverseItemBase.defineSchema();

    schema.kind = new fields.StringField({ required: true, initial: "close" });
    schema.range = new fields.StringField({ required: true, initial: "Reach" });
    schema.damageMultiplierBonus = new fields.StringField({
      required: true,
      initial: "0",
    });
    schema.rule = new fields.StringField({ blank: true });
    schema.recommendedRank = new fields.StringField({ blank: true });
    schema.category = new fields.StringField({ blank: true });
    schema.reach = new fields.StringField({ blank: true });
    schema.history = new fields.StringField({ blank: true });
    schema.commentary = new fields.StringField({ blank: true });

    schema.equipped = new fields.BooleanField({
      required: true,
      initial: false,
    });
    schema.attackTarget = new fields.StringField({
      required: true,
      initial: "mle",
    });
    schema.attackRange = new fields.NumberField({
      ...requiredInteger,
      initial: 0,
      min: 0,
    });
    schema.attackKind = new fields.StringField({
      required: true,
      initial: "close",
    });
    schema.damageType = new fields.StringField({
      required: true,
      initial: "health",
    });
    schema.attackEdgeMode = new fields.StringField({ blank: true });
    schema.attackMultiplier = new fields.NumberField({
      ...requiredInteger,
      initial: 0,
      min: 0,
    });
    return schema;
  }
}

class MarvelMultiverseOccupation extends MarvelMultiverseItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = MarvelMultiverseItemBase.defineSchema();

    schema.examples = new fields.StringField({ required: true, blank: true });

    schema.tags = new fields.ArrayField(new fields.ObjectField());
    schema.traits = new fields.ArrayField(new fields.ObjectField());

    return schema;
  }
}

class MarvelMultiverseOrigin extends MarvelMultiverseItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = MarvelMultiverseItemBase.defineSchema();

    schema.examples = new fields.StringField({ required: true, blank: true });
    schema.suggestedOccupation = new fields.StringField({
      required: true,
      blank: true,
    });
    schema.suggestedTags = new fields.ArrayField(new fields.ObjectField());
    (schema.minimumRank = new fields.NumberField({
      ...requiredInteger,
      initial: 0,
      min: 0,
    })),
      (schema.tags = new fields.ArrayField(new fields.ObjectField()));
    schema.traits = new fields.ArrayField(new fields.ObjectField());
    schema.powers = new fields.ArrayField(new fields.ObjectField());
    schema.limitation = new fields.StringField({ required: true, blank: true });

    return schema;
  }
}

class MarvelMultiverseTag extends MarvelMultiverseItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = MarvelMultiverseItemBase.defineSchema();

    schema.restriction = new fields.StringField({
      required: true,
      blank: true,
    });
    schema.rarity = new fields.StringField({ required: true, blank: true });
    schema.multiple = new fields.BooleanField({
      required: true,
      initial: false,
    });

    return schema;
  }
}

class MarvelMultiverseTrait extends MarvelMultiverseItemBase {
    static defineSchema() {
        const fields = foundry.data.fields;
        const schema = super.defineSchema();

        schema.restriction = new fields.StringField({ required: true, blank: true });
        schema.multiple = new fields.BooleanField({ required: true, initial: false });
    
        return schema;
    }
}

class MarvelMultiversePower extends MarvelMultiverseItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    // biome-ignore lint/complexity/noThisInStatic: <explanation>
    const schema = super.defineSchema();
    const requiredInteger = { required: true, nullable: false, integer: true };

    schema.powerSet = new fields.StringField({
      required: true,
      initial: "Basic",
    });
    schema.prerequisites = new fields.StringField({ blank: true });
    schema.action = new fields.StringField({ blank: true });
    schema.trigger = new fields.StringField({ blank: true });
    schema.duration = new fields.StringField({ blank: true });
    schema.range = new fields.StringField({ blank: true });
    schema.cost = new fields.StringField({ blank: true });
    schema.effect = new fields.StringField({ blank: true });
    schema.modifiers = new fields.ArrayField(new fields.ObjectField());
    schema.numbered = new fields.NumberField({
      ...requiredInteger,
      initial: 0,
      min: 0,
    });
    // Explicit non-damaging power check and optional fixed target number.
    schema.powerCheck = new fields.BooleanField({ required: true, initial: false });
    schema.rollTargetNumber = new fields.NumberField({ required: true, initial: 0, min: 0 });
    schema.attackTarget = new fields.StringField({ blank: true });
    schema.attackRange = new fields.NumberField({
      ...requiredInteger,
      initial: 0,
      min: 0,
    });
    schema.attackKind = new fields.StringField({ blank: true });
    schema.damageType = new fields.StringField({ blank: true });
    schema.attackEdgeMode = new fields.StringField({ blank: true });
    schema.attackMultiplier = new fields.NumberField({
      ...requiredInteger,
      initial: 0,
      min: 0,
    });
    (schema.isElemental = new fields.BooleanField({
      required: true,
      initial: false,
    })),
      (schema.element = new fields.StringField({ blank: true }));

    return schema;
  }

  static migrateData(source) {
    // Migrate attackAbility to ability.
    if (source.attackAbility) {
      source.ability = source.attackAbility;
      source.attackAbility = undefined;
    }
    return super.migrateData(source);
  }
}

// Export Actors

var models = /*#__PURE__*/Object.freeze({
  __proto__: null,
  MarvelMultiverseActorBase: MarvelMultiverseActorBase,
  MarvelMultiverseCharacter: MarvelMultiverseCharacter,
  MarvelMultiverseItem: MarvelMultiverseItem,
  MarvelMultiverseItemBase: MarvelMultiverseItemBase,
  MarvelMultiverseNPC: MarvelMultiverseNPC,
  MarvelMultiverseOccupation: MarvelMultiverseOccupation,
  MarvelMultiverseOrigin: MarvelMultiverseOrigin,
  MarvelMultiversePower: MarvelMultiversePower,
  MarvelMultiverseTag: MarvelMultiverseTag,
  MarvelMultiverseTrait: MarvelMultiverseTrait,
  MarvelMultiverseWeapon: MarvelMultiverseWeapon
});

/**
 * Establish each MMRPG dice type here as extensions of DiceTerm.
 * @extends {foundry.dice.terms.Die}
 */
class MarvelDie extends foundry.dice.terms.Die {
  static DENOMINATION = "m";

  constructor(termData) {
    super({ ...termData, faces: 6 });
  }

  /**
   * CSS classes to apply based on the result of the die.
   * @param {DiceTermResult} result
   */
  getResultCSS(result) {
    const resultStyles = ["marvel-roll", "die", "d6"];

    if (result.result === 1) {
      resultStyles.push("fantastic");
    } else if (result.result === 6) {
      resultStyles.push("max");
    }

    if (result.discarded) {
      resultStyles.push("discarded");
    }
    return resultStyles;
  }

  /**
   * Returns an 'M' in place of a roll of 1.
   *
   * @param {DiceTermResult} result
   * @returns {string}
   */
  getResultLabel(result) {
    if (result.result === 1) {
      return "m";
    }

    return result.result.toString();
  }

  /**
   * Override default roll behavior for this die to make an 'm' result (1) count as a value of 6.
   */
  roll({ minimize = false, maximize = false } = {}) {
    const roll = super.roll({ minimize, maximize });

    if (roll.result === 1) {
      this.results[this.results.length - 1].count = 6;
    }

    return roll;
  }

  get total() {
    const total = super.total;
    return total === 1 ? 6 : total;
  }
}

var dice = /*#__PURE__*/Object.freeze({
  __proto__: null,
  MarvelDie: MarvelDie,
  MarvelMultiverseRoll: MarvelMultiverseRoll
});

// Import document classes.

globalThis.MarvelMultiverse = {
  MarvelMultiverseActor,
  MarvelMultiverseItem: MarvelMultiverseItem$1,
  rollItemMacro,
  config: MULTIVERSE_D616,
  dice,
  models,
  MarvelMultiverseCharacterSheet,
  MarvelMultiverseNPCSheet,
  MarvelMultiverseItemSheet,
  ChatMessageMarvel,
};

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once("init", () => {
  registerSmartTargetSettings();
  registerCombatIntelligenceSettings();
  registerAutomationSettings();
  registerPowerVfxSettings();
  registerPowerVfxLifecycleHooks();
  game.multiverseD616 = game.multiverseD616 ?? {};
  game.multiverseD616.automationEnabled = automationEnabled;
  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  globalThis.MarvelMultiverse = game.MarvelMultiverse = Object.assign(
    game.system,
    globalThis.MarvelMultiverse
  );

  console.log(
    `Multiverse-D616 RPG 1e | Initializing the Multiverse-D616 Role Playing Game System - Version  ${MarvelMultiverse.version}\n${MULTIVERSE_D616.ASCII}`
  );

  // Record Configuration Values
  CONFIG.MULTIVERSE_D616 = MULTIVERSE_D616;
  registerElementalFantasticHooks();

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "{1d6,1dm,1d6} + @attributes.init.value",
    decimals: 2,
  };

  // Define custom Document and DataModel classes
  CONFIG.Actor.documentClass = MarvelMultiverseActor;

  // Note that you don't need to declare a DataModel
  // for the base actor/item classes - they are included
  // with the Character/NPC as part of super.defineSchema()
  CONFIG.Actor.dataModels = {
    character: MarvelMultiverseCharacter,
    npc: MarvelMultiverseNPC,
  };
  CONFIG.ChatMessage.documentClass = ChatMessageMarvel;
  CONFIG.Item.documentClass = MarvelMultiverseItem$1;
  CONFIG.Item.dataModels = {
    item: MarvelMultiverseItem,
    weapon: MarvelMultiverseWeapon,
    trait: MarvelMultiverseTrait,
    origin: MarvelMultiverseOrigin,
    occupation: MarvelMultiverseOccupation,
    tag: MarvelMultiverseTag,
    power: MarvelMultiversePower,
  };

  // Active Effects are never copied to the Actor,
  // but will still apply to the Actor from within the Item
  // if the transfer property on the Active Effect is true.
  CONFIG.ActiveEffect.legacyTransferral = false;

  CONFIG.Dice.MarvelDie = MarvelDie;
  CONFIG.Dice.types.push(MarvelDie);

  Roll.TOOLTIP_TEMPLATE =
    "systems/multiverse-d616/templates/chat/roll-breakdown.hbs";
  Roll.CHAT_TEMPLATE = "systems/multiverse-d616/templates/dice/roll.hbs";
  CONFIG.Dice.MarvelMultiverseRoll = MarvelMultiverseRoll;
  // Register Roll Extensions
  CONFIG.Dice.rolls.push(MarvelMultiverseRoll);
  CONFIG.Dice.terms.m = MarvelDie;

  // Add fonts
  _configureFonts();

  // Register sheet application classes. Prefer the v14 document collection namespace,
  // while retaining a safe fallback for older compatible runtimes.
  const ActorsCollection = foundry.documents?.collections?.Actors ?? globalThis.Actors;
  const ItemsCollection = foundry.documents?.collections?.Items ?? globalThis.Items;

  // Actor sheets use the v14 DocumentSheetConfig registration API.
  const sheetConfig = foundry.applications.apps.DocumentSheetConfig;
  sheetConfig.unregisterSheet(foundry.documents.Actor,"core",foundry.appv1.sheets.ActorSheet);
  sheetConfig.registerSheet(foundry.documents.Actor,"multiverse-d616",MarvelMultiverseCharacterSheet,{
    types:["character"],makeDefault:true,label:"MULTIVERSE_D616.SheetLabels.Actor"
  });
  sheetConfig.registerSheet(foundry.documents.Actor,"multiverse-d616",MarvelMultiverseNPCSheet,{
    types:["npc"],makeDefault:true,label:"MULTIVERSE_D616.SheetLabels.NPC"
  });
  // Emergency compatibility option: selectable per sheet, never the default.
  // This allows a GM to keep a game running if a third-party module does not
  // yet support ActorSheetV2. Remove only after real-world migration tests.
  sheetConfig.registerSheet(foundry.documents.Actor,"multiverse-d616-legacy",LegacyMarvelMultiverseCharacterSheet,{
    types:["character"],makeDefault:false,label:"D616 Personagem (compatibilidade)"
  });
  sheetConfig.registerSheet(foundry.documents.Actor,"multiverse-d616-legacy",LegacyMarvelMultiverseNPCSheet,{
    types:["npc"],makeDefault:false,label:"D616 NPC (compatibilidade)"
  });
  // Item sheets now use the same V14 sheet registry as Actor sheets.
  sheetConfig.unregisterSheet(foundry.documents.Item,"core",foundry.appv1.sheets.ItemSheet);
  for (const [type,ItemSheetClass] of Object.entries(D616ItemSheetsByType)) {
    sheetConfig.registerSheet(foundry.documents.Item,"multiverse-d616",ItemSheetClass,{
      types:[type],makeDefault:true,label:"MULTIVERSE_D616.SheetLabels.Item"
    });
  }
  sheetConfig.registerSheet(foundry.documents.Item,"multiverse-d616-legacy",LegacyMarvelMultiverseItemSheet,{
    makeDefault:false,label:"D616 Item (compatibilidade)"
  });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here is a useful example:
Handlebars.registerHelper("toLowerCase", (mle) => mle.toLowerCase());

/* -------------------------------------------- */

/**
 * Configure additional system fonts.
 */
function _configureFonts() {
  Object.assign(CONFIG.fontDefinitions, {
    Roboto: {
      editor: true,
      fonts: [
        {
          urls: ["systems/multiverse-d616/fonts/roboto/Roboto-Regular.woff2"],
        },
        {
          urls: ["systems/multiverse-d616/fonts/roboto/Roboto-Bold.woff2"],
          weight: "bold",
        },
        {
          urls: ["systems/multiverse-d616/fonts/roboto/Roboto-Italic.woff2"],
          style: "italic",
        },
        {
          urls: [
            "systems/multiverse-d616/fonts/roboto/Roboto-BoldItalic.woff2",
          ],
          weight: "bold",
          style: "italic",
        },
      ],
    },
    "Roboto Condensed": {
      editor: true,
      fonts: [
        {
          urls: [
            "systems/multiverse-d616/fonts/roboto-condensed/RobotoCondensed-Regular.woff2",
          ],
        },
        {
          urls: [
            "systems/multiverse-d616/fonts/roboto-condensed/RobotoCondensed-Bold.woff2",
          ],
          weight: "bold",
        },
        {
          urls: [
            "systems/multiverse-d616/fonts/roboto-condensed/RobotoCondensed-Italic.woff2",
          ],
          style: "italic",
        },
        {
          urls: [
            "systems/multiverse-d616/fonts/roboto-condensed/RobotoCondensed-BoldItalic.woff2",
          ],
          weight: "bold",
          style: "italic",
        },
      ],
    },
    "Roboto Slab": {
      editor: true,
      fonts: [
        {
          urls: [
            "systems/multiverse-d616/fonts/roboto-slab/RobotoSlab-Regular.ttf",
          ],
        },
        {
          urls: [
            "systems/multiverse-d616/fonts/roboto-slab/RobotoSlab-Bold.ttf",
          ],
          weight: "bold",
        },
      ],
    },
  });
}

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", () => {
  void migrateSmartTargetSettings();
  registerTokenSizeHooks();
  registerResizeOtherSocket();
  registerFocusMaintenanceHooks();
  registerPowerConditionHooks();
  registerPowerGrabbedHooks();
  registerPowerEscapeHooks();
registerConditionRecoveryHooks();
registerPoisonTurnHooks();
registerOngoingPowerHooks();
  registerRicoShieldHooks();
  installRepeatPowerHooks();
  registerHeldConcentrationHooks();
  registerConditionEdgeHooks();
  registerElementalAdvancedHooks();
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => {
    const uuid = data?.uuid;
    const isOwnedItem =
      data?.type === "Item" &&
      typeof uuid === "string" &&
      (uuid.includes("Actor.") || uuid.includes("Token."));
    if (!isOwnedItem) return;
    // Create the macro asynchronously but block the default Foundry behavior immediately.
    void createItemMacro(data, slot);
    return false;
  });

  const refreshSheetHooks = [
    "createCombat",
    "deleteCombat",
    "combatStart",
    "createCombatant",
    "deleteCombatant",
    "updateCombatant",
    "updateCombat",
  ];
  for (const hook of refreshSheetHooks) {
    Hooks.on(hook, () => rerenderOpenD616ActorSheets());
  }
});
/* -------------------------------------------- */
/*  Render Settings Hook                                  */
/* -------------------------------------------- */

Hooks.on("renderSettings", (app, html) => {
  const heading = document.createElement("div");
  heading.classList.add("mmrpg", "sidebar-heading");
  heading.innerHTML = `
    <h2 class='mmrpg-game-title'>${game.system.title}
      <ul class="links mmrpg-ul">
        <li>
          <a href="https://github.com/rodrigosinistro/multiverse-D616/releases/latest" target="_blank">
            Multiverse-D616 RPG
          </a>
        </li>
        <li>
          <a href="https://github.com/rodrigosinistro/multiverse-D616/issues" target="_blank">${game.i18n.localize(
            "MULTIVERSE_D616.Issues"
          )}</a>
        </li>
        <li>
          <a href="https://github.com/rodrigosinistro/multiverse-D616/wiki" target="_blank">${game.i18n.localize(
            "MULTIVERSE_D616.Wiki"
          )}</a>
        </li>
      </ul>
    </h2>
  `;
  const badge = document.createElement("div");
  badge.classList.add("mmrpg", "system-badge");
  badge.innerHTML = `
    <img src="systems/multiverse-d616/ui/official/mmrpg-badge-32.webp" data-tooltip="${game.system.title}" alt="${game.system.title}">
    <span class="system-info">${game.system.version}</span>
  `;
  if (game.release.generation < 13) {
    const details = html[0].querySelector("#game-details");
    const pip = details.querySelector(".system-info .update");
    // details.querySelector(".system").remove();
    if (pip)
      badge
        .querySelector(".system-info")
        .insertAdjacentElement("beforeend", pip);
    heading.insertAdjacentElement("afterend", badge);
    details.insertAdjacentElement("afterend", heading);
  } else {
    const infoSection = html.querySelector("section.info");
    infoSection?.insertAdjacentElement("beforeend", heading);
  }
});

Hooks.on("renderChatLog", (app, html, data) => {
  ChatMessageMarvel.onRenderChatLog(html);
});

Hooks.once("diceSoNiceReady", (dice3d) => {
  // Register the custom die face for the Marvel Die
  dice3d.addDicePreset({
    type: "dm",
    labels: ["m", "2", "3", "4", "5", "6"],
    colorset: "red",
    system: "standard",
  });
  dice3d.addDicePreset({
    type: "d6",
    labels: ["1", "2", "3", "4", "5", "6"],
    colorset: "white",
    system: "standard",
  });
});
/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (!data || data.type !== "Item") return;
  const uuid = data.uuid;
  if (typeof uuid !== "string") return;
  if (!uuid.includes("Actor.") && !uuid.includes("Token.")) {
    return ui.notifications.warn(
      "You can only create macro buttons for owned Items"
    );
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);
// Create the macro command using the uuid.
  const command = `game.MarvelMultiverse.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "multiverse-d616": { itemMacro: true, itemUuid: data.uuid }, "multiverse-d616.itemMacro": true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: "Item",
    uuid: itemUuid,
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then((item) => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }

    // Trigger the item roll
    item.roll();
  });
}

export { ChatMessageMarvel, MULTIVERSE_D616, MarvelMultiverseActor, MarvelMultiverseCharacterSheet, MarvelMultiverseItem$1 as MarvelMultiverseItem, MarvelMultiverseItemSheet, MarvelMultiverseNPCSheet, dice, models, rollItemMacro };
