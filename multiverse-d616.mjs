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
import { handleConcentrationOnUse } from "./scripts/concentration.js";

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
    // biome-ignore lint/complexity/noThisInStatic: <explanation>
    const newRoll = super.fromTerms(terms);
    Object.assign(newRoll, roll);
    return newRoll;
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

  /** @inheritdoc */
  async toMessage(messageData = {}, options = {}) {
    // Evaluate the roll now so we have the results available to determine edge mode
    if (!this._evaluated) await this.evaluate({});

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

    if (this.hasEdge)
      messageData.flavor += ` (${game.i18n.localize(
        "MULTIVERSE_D616.edge"
      )})`;
    else if (this.hasTrouble)
      messageData.flavor += ` (${game.i18n.localize(
        "MULTIVERSE_D616.trouble"
      )})`;
    // Record the preferred rollMode
    options.rollMode = options.rollMode ?? this.options.rollMode;
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
  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /**
   * @override
   * Augment the actor source data with additional dynamic data that isn't
   * handled by the actor's DataModel. Data calculated in this step should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    this.flags.MarvelMultiverse || {};
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
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    // Build the formula
    this.formula =
      this.system.ability && this.formula
        ? `${this.formula} + @${this.system.ability}.value`
        : "";
  }

  /**
   * Prepare a data object which defines the data schema used by dice roll commands against this Item
   * @override
   */
  getRollData() {
    // Starts off by populating the roll data with `this.system`
    const rollData = { ...super.getRollData() };

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
    // Concentração: incrementa condição no token até o Rank (mmrpg.concentration.X)
    const __okConc = await handleConcentrationOnUse(this.actor, this);
    if (!__okConc) return;

    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get("core", "rollMode");
    let label = `ability: ${
      CONFIG.MULTIVERSE_D616.damageAbility[this.system.ability]
    }<br/>${this.type}: ${this.name}`;
    label = this.system.damageType
      ? `${label}<br/>damagetype: ${this.system.damageType}`
      : label;

    console.log(
      `damageType: ${this.system.damageType} item.roll() : label: ${label}`
    );

    ChatMessage.create({
      speaker: speaker,
      rollMode: rollMode,
      flavor: label,
      content: `<div>${this.system.description}</div><div>${
        this.system.effect ? this.system.effect : ""
      }</div>`,
    });

    if (this.system.formula && this.system.ability) {
      // Retrieve roll data.
      const rollData = this.getRollData();
      // Invoke the roll and submit it to chat.
      const roll = new CONFIG.Dice.MarvelMultiverseRoll(
        rollData.formula,
        rollData.actor
      );
      // If you need to store the value first, uncomment the next line.
      // const result = await roll.evaluate();
      const modLabel = `${label}, [ability] ${this.system.ability}`;

      // Damage Multiplier context.
      // IMPORTANT (book rule): weapon Damage Multiplier bonuses DO NOT STACK with any other DM *bonus*.
      // We use the GREATER of (weapon bonus) and (other bonus). Penalties (negative deltas) still apply.
      // IMPORTANT (system rule): weapon bonus applies ONLY when rolling THIS weapon AND it is equipped.
      const abilityKey = this.system.ability;
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
        damageMultiplier: {
          base: baseDamageMultiplier,
          otherBonus,
          otherPenalty,
          weaponBonus,
          effectiveBonus,
          finalDM: finalDamageMultiplier,
        },
      };

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
        rollMode: rollMode,
        flavor: modLabel,
	        flags: { "multiverse-d616": systemFlags },
      };

      roll.toMessage(msgData, { rollMode: rollMode, itemId: this._id });

      if (this.system.attack) {
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
    flags: {},
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
    flags: {},
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
    flags: {},
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
      {
        key: "prototypeToken.width",
        mode: 1,
        value: 0.25,
      },
      {
        key: "prototypeToken.height",
        mode: 1,
        value: 0.25,
      },
    ],
    description: "",
    transfer: true,
    statuses: [],
    flags: {},
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
      {
        key: "system.movement.run.value",
        mode: 2,
        value: -1,
      },
    ],
    description: "",
    transfer: true,
    statuses: [],
    flags: {},
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
    flags: {},
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
      {
        key: "system.reach",
        mode: 5,
        value: 2,
      },
      {
        key: "system.movement.run.value",
        mode: 2,
        value: 1,
      },
    ],
    description: "",
    transfer: true,
    statuses: [],
    flags: {},
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
        key: "system.reach",
        mode: 5,
        value: 5,
      },
      {
        key: "system.movement.run.value",
        mode: 1,
        value: 5,
      },
      {
        key: "system.abilities.mle.damageMultiplier",
        mode: 2,
        value: 2,
      },
      {
        key: "prototypeToken.width",
        mode: 1,
        value: 5,
      },
      {
        key: "prototypeToken.height",
        mode: 1,
        value: 5,
      },
    ],
    description: "",
    transfer: true,
    statuses: [],
    flags: {},
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
        key: "system.reach",
        mode: 5,
        value: 20,
      },
      {
        key: "system.movement.run.value",
        mode: 1,
        value: 20,
      },
      {
        key: "system.abilities.mle.damageMultiplier",
        mode: 2,
        value: 4,
      },
      {
        key: "prototypeToken.width",
        mode: 1,
        value: 20,
      },
      {
        key: "prototypeToken.height",
        mode: 1,
        value: 20,
      },
    ],
    description: "",
    transfer: true,
    statuses: [],
    flags: {},
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
        key: "system.reach",
        mode: 5,
        value: 80,
      },
      {
        key: "system.movement.run.value",
        mode: 1,
        value: 80,
      },
      {
        key: "system.abilities.mle.damageMultiplier",
        mode: 2,
        value: 6,
      },
      {
        key: "prototypeToken.width",
        mode: 1,
        value: 80,
      },
      {
        key: "prototypeToken.height",
        mode: 1,
        value: 80,
      },
    ],
    description: "",
    transfer: true,
    statuses: [],
    flags: {},
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
        key: "system.reach",
        mode: 5,
        value: 320,
      },
      {
        key: "system.movement.run.value",
        mode: 1,
        value: 320,
      },
      {
        key: "system.abilities.mle.damageMultiplier",
        mode: "2",
        value: "8",
      },
      {
        key: "prototypeToken.width",
        mode: 1,
        value: 320,
      },
      {
        key: "prototypeToken.height",
        mode: 1,
        value: 320,
      },
    ],
    description: "",
    transfer: true,
    statuses: [],
    flags: {},
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
  const raw = String(costText ?? "").trim();
  const lower = raw.toLowerCase();
  if (!raw) return { hasFocus: false, raw };
  if (!lower.includes("focus")) return { hasFocus: false, raw };
  const m = lower.match(/(\d+)/);
  const n = m ? Number.parseInt(m[1], 10) : 0;
  const variable = /(or\s+more|ou\s+mais|\+|minimum|minimo|mínimo)/i.test(lower);
  if (variable) {
    return {
      hasFocus: n > 0,
      type: "variable",
      min: Math.max(0, Number.isFinite(n) ? n : 0),
      raw,
    };
  }
  return {
    hasFocus: n > 0,
    type: "fixed",
    fixed: Math.max(0, Number.isFinite(n) ? n : 0),
    min: Math.max(0, Number.isFinite(n) ? n : 0),
    raw,
  };
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
      out.push({ uuid, name, img });
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


class ChatMessageMarvel extends ChatMessage {
  /** @inheritDoc */
  _initialize(options = {}) {
    super._initialize(options);
    Object.defineProperty(this, "user", {
      value: this.author,
      configurable: true,
    });
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async getHTML(...args) {
    const html = await super.getHTML();
    this._displayChatActionButtons(html);

    this._enrichChatCard(html[0]);
    await this._enrichAttackTargets(html[0]);

    /**
     * A hook event that fires after multiverse-d616-specific chat message modifications have completed.
     * @function multiverse-d616.renderChatMessage
     * @memberof hookEvents
     * @param {ChatMessageMarvel} message  Chat message being rendered.
     * @param {HTMLElement} html       HTML contents of the message.
     */
    Hooks.callAll("multiverse-d616.renderChatMessage", this, html[0]);

    return html;
  }

  /**
   * Optionally hide the display of chat card action buttons which cannot be performed by the user
   * @param {jQuery} html     Rendered contents of the message.
   * @protected
   */
  _displayChatActionButtons(html) {
    const chatCard = html.find(
      ".multiverse-d616.chat-card, .multiverse-d616.chat-card"
    );
    if (chatCard.length > 0) {
      const flavor = html.find(".flavor-text");
      if (flavor.text() === html.find(".item-name").text()) flavor.remove();

      if (this.shouldDisplayChallenge)
        chatCard[0].dataset.displayChallenge = "";

      // Conceal effects that the user cannot apply.
      chatCard.find(".effects-tray .effect").each((i, el) => {
        if (
          !game.user.isGM &&
          (el.dataset.transferred === "false" || this.user.id !== game.user.id)
        )
          el.remove();
      });

      // If the user is the message author or the actor owner, proceed
      const actor = game.actors.get(this.speaker.actor);
      if (game.user.isGM || actor?.isOwner || this.user.id === game.user.id) {
        const summonsButton = chatCard[0].querySelector(
          'button[data-action="summon"]'
        );
        if (summonsButton && !SummonsData.canSummon)
          summonsButton.style.display = "none";
        const template = chatCard[0].querySelector(
          'button[data-action="placeTemplate"]'
        );
        if (template && !game.user.can("TEMPLATE_CREATE"))
          template.style.display = "none";
        return;
      }

      // Otherwise conceal action buttons except for saving throw
      const buttons = chatCard.find("button[data-action]:not(.apply-effect)");
      buttons.each((i, btn) => {
        if (
          ["save", "rollRequest", "concentration"].includes(btn.dataset.action)
        )
          return;
        btn.style.display = "none";
      });
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
      nameText = this.user.name;
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
      const isInitiative = flavorText?.innerHTML.includes("Initiative");
      for (const el of html.querySelectorAll("button.retroEdgeMode")) {
        if (isInitiative) {
          el.setAttribute("data-initiative", true);
        }
        el.addEventListener("click", this._onClickRetroButton.bind(this));
      }
      html
        .querySelector("button.damage")
        ?.addEventListener("click", this._onClickDamageButton.bind(this));

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

    // Default hidden unless the message is associated to an item with Focus cost.
    const show = Boolean(item && cost.hasFocus && (cost.min ?? 0) > 0);
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
    for (const el of html.querySelectorAll("ul.multiverse-d616.evaluation")) {
      el.remove();
    }

    const [attackRoll] = this.rolls ?? [];
    if (!attackRoll) return;

    // Ability key used to fetch target defense
    let abilityAbr = this.getFlag("multiverse-d616", "ability") ?? null;
    const flavorText = this.flavor ?? "";

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

    // Determine targets: always use the targets saved on the message (set at roll time by the rolling user).
    // If missing, ONLY the message author will auto-capture their current local targets and persist them,
    // so every client sees the same target list.
    let targets = this.getFlag("multiverse-d616", "targets") ?? [];

    if (!targets?.length) {
      const authorId = this.author?.id ?? this.user?.id ?? null;
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

    if (!targets?.length) return;

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
    const esc = foundry.utils.escapeHTML;
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
    // Brawling: Agility attacks are defended with Melee.
    // Evasion: Melee attacks are defended with Agility.
    // Wisdom: Logic attacks are defended with Ego.
    // Integrity: Ego attacks are defended with Logic.
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
      return false;
    };

    const mmD616ResolveDefenseAbility = (attackAbr, actor) => {
      let def = attackAbr;
      if (!actor || !attackAbr) return def;
      if (attackAbr === "agl" && mmD616HasNamedTrait(actor, "Brawling")) def = "mle";
      else if (attackAbr === "mle" && mmD616HasNamedTrait(actor, "Evasion")) def = "agl";
      else if (attackAbr === "log" && mmD616HasNamedTrait(actor, "Wisdom")) def = "ego";
      else if (attackAbr === "ego" && mmD616HasNamedTrait(actor, "Integrity")) def = "log";
      return def;
    };

        const resolved = await Promise.all(
      targets.map(async (t) => {
        const tokenDoc = await resolveTokenDocFromUuid(t.uuid);
        const a = tokenDoc?.actor ?? null;

        // Defense value is only computed for GM to avoid leaking defenses.
        // Apply trait-based defense swaps (Brawling/Evasion/Wisdom/Integrity) on the target.
        const defenseAbr = isGM && abilityAbr ? mmD616ResolveDefenseAbility(abilityAbr, a) : null;
        const currentAc =
          isGM && defenseAbr && a?.system?.abilities?.[defenseAbr]?.defense != null
            ? a.system.abilities[defenseAbr].defense
            : isGM && abilityAbr && a?.system?.abilities?.[abilityAbr]?.defense != null
              ? a.system.abilities[abilityAbr].defense
              : null;

        const name = tokenDoc?.name ?? t.name ?? a?.name ?? "Target";
        const img = tokenDoc?.texture?.src ?? t.img ?? a?.img ?? "";
        const targetValue = Number(currentAc ?? 0);
        const isHit = isGM ? (isFantastic || total >= targetValue) : false;

        const resultText = isGM ? (isHit ? hitText : missText) : targetText;
        const outcomeClass = isGM ? (isHit ? "hit" : "miss") : "";

        return `
        <li data-uuid="${esc(t.uuid ?? "")}" class="target ${outcomeClass}">
          <img src="${esc(img ?? "")}" alt="${esc(name ?? "Target")}">
          <div class="name-stacked">
            <span class="title">${esc(name ?? "Target")}</span>
          </div>
          <div class="result">${esc(resultText)}</div>
        </li>`;
      })
    );

    evaluation.innerHTML = resolved.join("");

    html.querySelector(".message-content")?.appendChild(evaluation);
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
  _onClickDamageButton(event) {
    event.stopPropagation();
    const eventTarget = event.currentTarget;
    const messageId =
      eventTarget.closest("[data-message-id]").dataset.messageId;
    const messageHeader = eventTarget.closest("li.chat-message");
    const flavorText =
      messageHeader.querySelector("span.flavor-text").innerHTML;

    this._handleDamageChatButton(messageId, flavorText);
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
      newSpent = await new Promise((resolve) => {
        new Dialog(
          {
            title: `Gastar Focus — ${item.name}`,
            content: `
              <form>
                <p><strong>Custo mínimo:</strong> ${min} Focus</p>
                <p><strong>Limite por uso:</strong> ${maxSpend} (5×Rank)</p>
                <p><strong>Disponível:</strong> ${available} Focus</p>
                <hr/>
                <div class="form-group">
                  <label>Quanto a mais você quer gastar além do mínimo? (0–${maxExtra})</label>
                  <input type="number" name="extra" value="${currentExtra}" min="0" max="${maxExtra}" step="1"/>
                </div>
                <p style="margin-top:8px">${scalingHelp}</p>
              </form>
            `,
            buttons: {
              ok: {
                label: "Aplicar",
                callback: (html) => {
                  const form = html[0].querySelector("form");
                  const extra = Number.parseInt(form?.extra?.value ?? "0", 10);
                  const extraClamped = mmClampNumber(extra, 0, maxExtra);
                  resolve(min + extraClamped);
                },
              },
              cancel: {
                label: "Cancelar",
                callback: () => resolve(null),
              },
            },
            default: "ok",
            close: () => resolve(null),
          },
          { width: 420 }
        ).render(true);
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
    const re = /ability:\s(?<ability>\w*)/;
    const dmgTypeRe = /damagetype:\s(?<damageType>\w*)/;
    const ability = re.exec(flavorText).groups.ability;
    const damageType =
      dmgTypeRe.exec(flavorText)?.groups?.damageType ?? "health";
    const abilityAbr = MULTIVERSE_D616.damageAbilityAbr[ability] ?? ability;
    const chatMessage = game.messages.get(messageId);

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
	    // Weapon bonuses MUST NOT apply passively; they only apply to the attack/item that created this chat message.
	    // Book rule: Weapon DM bonus does NOT stack with any other DM *bonus*. Use the GREATER. Penalties still apply.
	    const dmFlags = chatMessage.getFlag("multiverse-d616", "damageMultiplier") ?? {};
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
	
	    // Backward/forward compatible fallback (older cards or missing flags)
	    if (!Number.isFinite(baseDamageMultiplier)) {
	      const ctx = mmGetDamageMultiplierContext(actor, abilityAbr);
	      baseDamageMultiplier = Number(ctx.base ?? 0) || 0;
	      otherBonus = Number(ctx.otherBonus ?? 0) || 0;
	      otherPenalty = Number(ctx.otherPenalty ?? 0) || 0;
	    }
	    if (!Number.isFinite(otherBonus)) otherBonus = 0;
	    if (!Number.isFinite(weaponBonus)) weaponBonus = weaponBonusFromItem;

	    const effectiveBonus = Number.isFinite(Number(dmFlags.effectiveBonus))
	      ? Number(dmFlags.effectiveBonus)
	      : Math.max(weaponBonus, otherBonus);
	
	    const damageMultiplier = Number.isFinite(Number(dmFlags.finalDM))
	      ? Number(dmFlags.finalDM)
	      : baseDamageMultiplier + otherPenalty + effectiveBonus;

    const targetTokens = Array.from(game.user?.targets ?? []);

    // Fallback for any modules that don't populate game.user.targets
    if (!targetTokens.length && canvas?.tokens?.placeables) {
      targetTokens.push(...canvas.tokens.placeables.filter((t) => mmD616IsTargetedByUser(t, game.user)));
    }

    const abilityValue = actor.system.abilities[abilityAbr].value;

    const targets = targetTokens.map((t) => t.actor);

    const damageContent = targets.map((t) => {
      const damageReduction =
        damageType && damageType === "focus"
          ? t.system.focusDamageReduction
          : t.system.healthDamageReduction;
      const dmgMultiplier = damageMultiplier - damageReduction;
      let dmg =
        dmgMultiplier === 0
          ? 0
          : marvelTotal * dmgMultiplier + abilityValue + focusBonus;
      if (isFantastic) {
        dmg = dmg * 2;
      }
      const focusExplain =
        focusSpent > 0
          ? ` + Focus bonus ${focusBonus} (spent ${focusSpent})`
          : "";
      return `<p><b>${t.name}</b> takes <b>${dmg} ${
        isFantastic ? "Fantastic" : ""
      } </b> ${damageType} damage.<br/> re: MarvelDie: ${
        marvelTotal
	      } &#42; damage multiplier: &#40; ${baseDamageMultiplier} + bonus: ${effectiveBonus} &#61; ${damageMultiplier} - damageReduction: ${damageReduction} &#61; ${dmgMultiplier} &#41; + ${ability} score ${abilityValue} of damage${focusExplain}.</p>`;
    });

    if (damageContent.length === 0) {
      let dmg = marvelTotal * damageMultiplier + abilityValue + focusBonus;
      if (isFantastic) {
        dmg = dmg * 2;
      }
      const focusExplain =
        focusSpent > 0
          ? ` + Focus bonus ${focusBonus} (spent ${focusSpent})`
          : "";
      damageContent.push(
        `<p>target(s) take <b>${dmg} ${
          isFantastic ? "Fantastic" : ""
        } </b> ${damageType} damage.<br/> re: MarvelDie: ${
          marvelTotal
        } &#42; damage multiplier: ${damageMultiplier} + ${ability} score ${abilityValue} of damage${focusExplain}.</p>`
      );
    }

    const msgData = {
      // Keep the same speaker so the damage message matches the token/actor used to roll.
      speaker: chatMessage.speaker ?? ChatMessageMarvel.getSpeaker({ actor: actor }),
      rollMode: game.settings.get("core", "rollMode"),
      flavor: flavorText,
      content: damageContent.join(""),
    };
    ChatMessageMarvel.create(msgData);
  }


  /**
   * Handle clicking a retro button.
   * @param {PointerEvent} event      The initiating click event.
   */
  _onClickRetroButton(event) {
    event.stopPropagation();
    const eventTarget = event.currentTarget;

    const action = eventTarget.dataset.retroAction;
    const isInit = eventTarget.dataset.initiative;
    const dieIndex = Math.round(eventTarget.dataset.index);
    const messageId =
      eventTarget.closest("[data-message-id]").dataset.messageId;

    const messageHeader = eventTarget.closest("li.chat-message");
    const flavorText =
      messageHeader.querySelector("span.flavor-text")?.innerHTML;
    this._handleChatButton(action, messageId, dieIndex, isInit, flavorText);
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

    const formulaDie = formulaGroups.dieType;

    targetDie.number = 2;

    const targetFormula = `${targetDie.number}d${formulaDie}`;

    targetRoll._formula = `${targetFormula}${modifier}`;

    rollTerm.terms[dieIndex] = targetRoll._formula;

    targetDie.modifiers = [modifier];

    const oldRollResult = targetDie.results.find((r) => r.active);
    const oldFantastic = targetIsMarvel && oldRollResult.result === 1;
    const oldResult =
      targetIsMarvel && oldRollResult.result === 1 ? 6 : oldRollResult.result;

    const newRoll = new MarvelMultiverseRoll(targetRoll._formula, {
      ...targetRoll.data,
    });
    await newRoll.roll();

    const newRollResult = newRoll.terms[0].results[0];
    const newFantastic = targetIsMarvel && newRollResult.result === 1;
    const newResult =
      targetIsMarvel && newRollResult.result === 1 ? 6 : newRollResult.result;

    if (modifier === "kh") {
      if (newFantastic || newResult >= oldResult) {
        this._handleEdge(false, oldRollResult);
        this._handleEdge(true, newRollResult);
      } else if (oldFantastic || oldResult >= newResult) {
        this._handleEdge(false, newRollResult);
      }
    } else if (modifier === "kl") {
      if (newFantastic) {
        this._handleEdge(false, newRollResult);
        this._handleEdge(true, oldRollResult);
      } else if (newResult <= oldResult) {
        this._handleEdge(false, oldRollResult);
        this._handleEdge(true, newRollResult);
      } else if (newResult > oldResult) {
        this._handleEdge(false, newRollResult);
        this._handleEdge(true, oldRollResult);
      }
    }

    targetDie.results.push(newRollResult);

    // Recalculate the die total after retro Edge/Trouble so downstream logic (like damage) reflects the kept result.
    const keptDieResults = targetDie.results.filter(
      (r) => r.active && !r.discarded
    );
    const calcDieResults = keptDieResults.length
      ? keptDieResults
      : targetDie.results.filter((r) => r.active);
    const dieResultsForTotal = calcDieResults.length
      ? calcDieResults
      : [targetDie.results[targetDie.results.length - 1]];
    const computedDieTotal = dieResultsForTotal.reduce((sum, r) => {
      if (targetIsMarvel && r.result === 1) return sum + 6;
      const v = r.count ?? r.result ?? 0;
      return sum + v;
    }, 0);
    targetDie._total = computedDieTotal;

    const re = /(\(?{)(\dd\d),(\ddm),(\dd\d)(}.*)/;

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

    roll._formula = replacedFormula;

    if (newRollResult.active) {
      roll._total = roll.total - oldResult + newResult;
    }

    let update = await roll.toMessage({ flavor: flavor }, { create: false });
    update = foundry.utils.mergeObject(chatMessage.toJSON(), update);

    if (isInit) {
      const actorId = game.actors.contents.find(
        (a) => a.name === chatMessage.alias
      )._id;
      const combatant = game.combat.combatants.contents.find(
        (combatant) => combatant.actorId === actorId
      );
      await combatant.update({ initiative: roll.total });
    }

    return chatMessage.update(update);
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
  switch (a.dataset.action) {
    case 'create':
      return owner.createEmbeddedDocuments('ActiveEffect', [
        {
          name: game.i18n.format('DOCUMENT.New', {
            type: game.i18n.localize('DOCUMENT.ActiveEffect'),
          }),
          img: 'icons/svg/aura.svg',
          origin: owner.uuid,
          'duration.rounds':
            li.dataset.effectType === 'temporary' ? 1 : undefined,
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
class MarvelMultiverseCharacterSheet extends ActorSheet {
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
    this._changeSizeEffect(selected);
  }

  async _changeSizeEffect(effectKey) {
    const sizeEffectNames = Object.keys(
      CONFIG.MULTIVERSE_D616.sizeEffects
    ).map((key) => CONFIG.MULTIVERSE_D616.sizeEffects[key].name);

    const currentSizeEffects = this.actor.effects.contents.filter((effect) =>
      sizeEffectNames.includes(effect.name)
    );
    const currentSizeEffectIds = currentSizeEffects.map((ae) => ae._id);

    if (currentSizeEffectIds.length > 0) {
      this.actor.deleteEmbeddedDocuments("ActiveEffect", currentSizeEffectIds);
    }
    const effect = CONFIG.MULTIVERSE_D616.sizeEffects[effectKey];
    ActiveEffect.create(effect, { parent: this.actor });
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
  _onDropItemCreate(itemData) {
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
        this._changeSizeEffect(itemData.name.toLowerCase());
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
  _onRoll(event) {
    event.preventDefault();
    game.settings.get("core", "rollMode");
    const element = event.currentTarget;
    const dataset = element.dataset;

    const itemId = element.closest(".item")?.dataset?.itemId;
    const item = this.actor.items.get(itemId);

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
      const rollMode = game.settings.get("core", "rollMode");

      if (item?.system?.description) {
        ChatMessage.create({
          speaker: speaker,
          rollMode: rollMode,
          flavor: label,
          content: `<div>${item.system.description}</div><div>${
            item.system.effect ? item.system.effect : ""
          }</div>`,
        });
      }

      const roll = new CONFIG.Dice.MarvelMultiverseRoll(
        dataset.formula,
        this.actor.getRollData()
      );

      roll.toMessage(
        {
          speaker: speaker,
          flavor: label,
          rollMode: rollMode,
          title: title,
        },
        { rollMode: rollMode, itemId: itemId }
      );
      return roll;
    }
  }
}

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
class MarvelMultiverseNPCSheet extends ActorSheet {
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
    this._changeSizeEffect(selected);
  }

  async _changeSizeEffect(effectKey) {
    const sizeEffectNames = Object.keys(
      CONFIG.MULTIVERSE_D616.sizeEffects
    ).map((key) => CONFIG.MULTIVERSE_D616.sizeEffects[key].name);

    const currentSizeEffects = this.actor.effects.contents.filter((effect) =>
      sizeEffectNames.includes(effect.name)
    );
    const currentSizeEffectIds = currentSizeEffects.map((ae) => ae._id);

    if (currentSizeEffectIds.length > 0) {
      this.actor.deleteEmbeddedDocuments("ActiveEffect", currentSizeEffectIds);
    }
    const effect = CONFIG.MULTIVERSE_D616.sizeEffects[effectKey];
    ActiveEffect.create(effect, { parent: this.actor });
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
        this._changeSizeEffect(itemData.name.toLowerCase());
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
  _onRoll(event) {
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

      const roll = new CONFIG.Dice.MarvelMultiverseRoll(
        dataset.formula,
        this.actor.getRollData()
      );

      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get("core", "rollMode"),
        title: title,
      });
      return roll;
    }
  }
}

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
class MarvelMultiverseItemSheet extends ItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(ItemSheet.defaultOptions, {
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

/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
const preloadHandlebarsTemplates = async () =>
  loadTemplates([
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
    schema.defaultElement = new fields.StringField({
      required: true,
      blank: true,
    });

    return schema;
  }

  prepareDerivedData() {
    // Loop through ability scores, and add their modifiers to our sheet output.
    for (const key in this.abilities) {
      // Caclulate the defense score using mmrpg rules.
      this.abilities[key].defense += this.abilities[key].value + 10;
      // Damage Multiplier rank to apply effect changes.
      this.abilities[key].damageMultiplier += this.attributes.rank.value;
      // Non-combat checks base to apply effect changes.
      this.abilities[key].noncom += this.abilities[key].value;
      // Handle ability label localization.
      this.abilities[key].label =
        game.i18n.localize(CONFIG.MULTIVERSE_D616.abilities[key]) ?? key;
    }

    this.movement.climb.value = Math.ceil(this.movement.run.value * 0.5);
    this.movement.jump.value = Math.ceil(this.movement.run.value * 0.5);
    this.movement.swim.value = Math.ceil(this.movement.run.value * 0.5);

    this.attributes.init.value += this.abilities.vig.value;

    for (const key in this.movement) {
      this.movement[key].label =
        game.i18n.localize(CONFIG.MULTIVERSE_D616.movementTypes[key].label) ??
        key;
      switch (this.movement[key].calc) {
        case "half": {
          this.movement[key].value = Math.ceil(this.movement[key].value * 0.5);
          break;
        }
        case "double": {
          this.movement[key].value *= 2;
          break;
        }
        case "triple":
          this.movement[key].value *= 3;
          break;
        case "runspeed":
          this.movement[key].value = this.movement.run.value;
          break;
        case "rank": {
          // Flight in MMRPG is based on current Run Speed (which can itself be modified),
          // then scaled by character Rank.
          // This also keeps backward compatibility with older content that attempted to set
          // flight.calc twice (runspeed then rank) via Active Effects.
          const base =
            key === "flight" ? this.movement.run.value : this.movement[key].value;
          const val = base === 0 ? 1 : base;
          this.movement[key].value = val * this.attributes.rank.value;
          break;
        }
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
  prepareDerivedData() {
    // Loop through ability scores, and add their modifiers to our sheet output.
    for (const key in this.abilities) {
      // Caclulate the defense score using mmrpg rules.
      this.abilities[key].defense += this.abilities[key].value + 10;
      // Damage Multiplier rank to apply effect changes.
      this.abilities[key].damageMultiplier += this.attributes.rank.value;
      // Non-combat checks base to apply effect changes.
      this.abilities[key].noncom += this.abilities[key].value;
      // Handle ability label localization.
      this.abilities[key].label =
        game.i18n.localize(CONFIG.MULTIVERSE_D616.abilities[key]) ?? key;
    }

    this.movement.climb.value = Math.ceil(this.movement.run.value * 0.5);
    this.movement.jump.value = Math.ceil(this.movement.run.value * 0.5);
    this.movement.swim.value = Math.ceil(this.movement.run.value * 0.5);

    this.attributes.init.value += this.abilities.vig.value;

    for (const key in this.movement) {
      this.movement[key].label =
        game.i18n.localize(CONFIG.MULTIVERSE_D616.movementTypes[key].label) ??
        key;
      switch (this.movement[key].calc) {
        case "half": {
          this.movement[key].value = Math.ceil(this.movement[key].value * 0.5);
          break;
        }
        case "double": {
          this.movement[key].value *= 2;
          break;
        }
        case "triple":
          this.movement[key].value *= 3;
          break;
        case "runspeed":
          this.movement[key].value = this.movement.run.value;
          break;
        case "rank": {
          // Flight in MMRPG is based on current Run Speed (which can itself be modified),
          // then scaled by character Rank.
          // This also keeps backward compatibility with older content that attempted to set
          // flight.calc twice (runspeed then rank) via Active Effects.
          const base =
            key === "flight" ? this.movement.run.value : this.movement[key].value;
          const val = base === 0 ? 1 : base;
          this.movement[key].value = val * this.attributes.rank.value;
          break;
        }
      }
    }
  }
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

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("multiverse-d616", MarvelMultiverseCharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "MULTIVERSE_D616.SheetLabels.Actor",
  });
  Actors.registerSheet("multiverse-d616", MarvelMultiverseNPCSheet, {
    types: ["npc"],
    makeDefault: true,
    label: "MULTIVERSE_D616.SheetLabels.NPC",
  });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("multiverse-d616", MarvelMultiverseItemSheet, {
    makeDefault: true,
    label: "MULTIVERSE_D616.SheetLabels.Item",
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
          <a href="https://github.com/mjording/multiverse-d616/releases/latest" target="_blank">
            Multiverse-D616 RPG
          </a>
        </li>
        <li>
          <a href="https://github.com/mjording/multiverse-d616/issues" target="_blank">${game.i18n.localize(
            "MULTIVERSE_D616.Issues"
          )}</a>
        </li>
        <li>
          <a href="https://github.com/mjording/multiverse-d616/wiki" target="_blank">${game.i18n.localize(
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
    infoSection.insertAdjacentElement("beforeend", heading);
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
//# sourceMappingURL=multiverse-d616-compiled.mjs.map
