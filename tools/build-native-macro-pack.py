"""Rebuild registered Macro references from the REAL Powers compendium.
Safe offline build only: existing Packs, Source Items and README are untouched.
"""
from pathlib import Path
import importlib.util,hashlib,json

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('d616ldb',ROOT/'tools/d616-leveldb.py')
ldb=importlib.util.module_from_spec(spec);spec.loader.exec_module(ldb)

source=ldb.read_entries(ROOT/'packs/mmc-powers-v0186/000002.log')
powers={v['_id']:v for k,v in source.items() if k.startswith('!items!')}
folders={v['name']:v for k,v in source.items() if k.startswith('!folders!')}
assert len(powers)==398 and len(folders)==27
SELECTED={('Basic','Anger'):('native-active','anger','internal-dispatch'),
  ('Basic','Energy Absorption'):('reference-existing','energy-absorption','existing-pre-roll'),
  ('Super-Speed','Lightning Actions'):('requires-configuration','lightning-actions','central-passive-power'),
  **{('Elemental Control',f'Elemental Protection {i}'):('reference-existing','elemental-protection','existing-concentration-guard') for i in range(1,5)}}
# Bounded registration of native and audited existing controllers.
# Macros are INSPECTION references, not code to execute as GM.
SELECTED.update({('Basic',f'{family} {tier}'):
  ('reference-existing','passive-active-effect','existing-transfer-effect')
  for family in ('Accuracy','Brilliance','Discipline','Mighty','Sturdy','Uncanny')
  for tier in range(1,5)})
SELECTED.update({('Basic',name):('reference-existing','defense-swap','existing-defense-selection')
  for name in ('Brawling','Evasion','Integrity','Wisdom')})
SELECTED.update({
  ('Sixth Sense','Danger Sense'):('reference-existing','danger-sense','existing-bonus-round'),
  ('Basic','Healing Factor'):('requires-configuration','healing-factor','existing-turn-healing'),
  ('Luck','Real Jinx'):('native-active','real-jinx','native-attack-trouble'),
})
# v0.2.186: two scoped versions of Do This All Day plus Regain Focus
# are NEW internal handlers, while three established passives are references.
SELECTED.update({
  ('Martial Arts','Regain Focus'):('native-active','regain-focus','internal-resource-recovery'),
  ('Martial Arts','Do This All Day'):('native-active','do-this-all-day','internal-resource-recovery'),
  ('Shield Bearer','Do This All Day'):('native-active','do-this-all-day','internal-resource-recovery'),
  ('Basic','Reinforced Skeleton'):('reference-existing','passive-active-effect','existing-transfer-effect'),
  ('Super-Speed','Speed Run 1'):('reference-existing','passive-movement','existing-movement-effects'),
  ('Super-Speed','Speed Run 2'):('reference-existing','passive-movement','existing-movement-effects'),
})


# v0.2.187: Martial Arts stance. Unflappable Poise's first Trouble is
# automatic; a second Trouble plus expiry on successful hits still involves
# Narrator arbitration (status intentionally native-partial, not fully active).
SELECTED.update({
  ('Martial Arts','Attack Stance'):('native-active','attack-stance','existing-concentration-native-damage'),
  ('Martial Arts','Unflappable Poise'):('native-partial','unflappable-poise','native-target-trouble-with-gm-stacking'),
})
# Movement items already supported by the permanent-power effect/movement
# machinery. Register only, do not reapply extra multipliers.
SELECTED.update({
  ('Basic','Flight 1'):('reference-existing','passive-movement','existing-movement-effects'),
  ('Basic','Flight 2'):('reference-existing','passive-movement','existing-movement-effects'),
  ('Super-Strength','Jump 2'):('reference-existing','passive-movement','existing-movement-effects'),
  ('Super-Strength','Jump 3'):('reference-existing','passive-movement','existing-movement-effects'),
  ('Super-Speed','Speed Swim'):('reference-existing','passive-movement','existing-movement-effects'),
})

# v0.2.189: typed Focus-to-damage for two different official Melee powers.
# Focused Strike's Fantastic stun already belongs to the existing condition engine.
# Focused Fury's built-in Edge uses the existing manual selection; the weapon's
# special effect on a Fantastic is intentionally not represented as automated.
SELECTED.update({
  ('Martial Arts','Focused Strike'):('native-active','focused-strike','native-focus-damage-on-roll'),
  ('Melee Weapons','Focused Fury'):('native-partial','focused-fury','native-focus-damage-existing-edge'),
})

# v0.2.190: real, owner-authenticated support automations.  Healing/HUD
# activations are processed by a single GM-authoritative dispatcher, not by
# running untrusted Macros as GM.  Some Tactics voice/movement adjudication
# remains with the Narrator and is conservatively classified partial.
SELECTED.update({
  ('Healing','Healing Hands'):('native-active','heal','native-support-gm-transaction'),
  ('Healing','Soothing Touch'):('native-active','heal','native-support-gm-transaction'),
  ('Tactics','Keep Moving'):('native-partial','clear','native-support-status-with-gm-context'),
  ('Tactics','On Your Feet'):('native-partial','stand','native-support-status-with-gm-context'),
  ('Tactics','Rally on Me'):('native-partial','rally','native-support-recovery-after-manual-movement'),
  ('Basic','Inspiration'):('native-partial','edge','native-support-temporary-edge-voice'),
  ('Tactics','Battle Plan'):('native-partial','edge','native-support-temporary-edge-voice'),
  ('Luck','Lucky Me'):('native-active','lucky-me','existing-concentration-native-edge'),
  ('Shield Bearer','Shield Wall'):('native-partial','shield-wall','existing-concentration-native-trouble'),
})

# v0.2.197: 7 OFFICIAL Luck/Tactics concentration target effects.
# All are bounded by the v196 GM-authoritative atomic request protocol.
# LOS, hearing and Jinx You's successful touch are still Narrator-verified,
# so these are explicitly PARTIAL (not merely macros, not claimed complete).
SELECTED.update({
  ('Luck','Lucky You'):('native-partial','fortune','native-fortune-atomic-concentration'),
  ('Luck','Wish You Luck'):('native-partial','fortune','native-fortune-atomic-concentration'),
  ('Luck','Lucky Us'):('native-partial','fortune','native-fortune-atomic-concentration'),
  ('Luck','Evil Eye'):('native-partial','fortune','native-fortune-atomic-concentration'),
  ('Luck','Jinx You'):('native-partial','fortune','native-fortune-atomic-concentration-touch-check'),
  ('Luck','Jinx You All'):('native-partial','fortune','native-fortune-atomic-concentration'),
  ('Tactics','Focus Fire'):('native-partial','fortune','native-fortune-targeted-enemy-attack'),
  ('Tactics','Operations Center'):('native-partial','fortune','native-fortune-edge-movement-interruption'),
})

# v0.2.203: GM-authorized one-shot ally action checks. A single ActiveEffect
# is consumed after a real roll card; both official powers still depend on
# hearing/trigger confirmation by the Narrator, so classification is PARTIAL.
SELECTED.update({
  ('Tactics','Change of Plans'):('native-partial','tactical-once','native-atomic-next-roll-edge'),
  ('Tactics','Combat Support'):('native-partial','tactical-once','native-atomic-next-roll-marvel-m'),
  ('Luck','Charmed Life'):('native-partial','charmed-life','native-manual-arm-one-edge-per-round'),
})

# v0.2.202: 27-power audit (Healing 7, Illusion 14, Basic 6).
# Four explicit conditional sense/stealth sources were implemented. On an
# untyped Vig/Agility ability card the skill cannot be inferred: the card
# DISPLAYS the applicable source and the player/GM chooses the manual reroll.
# Heightened Senses tiers do not stack; Invisibility/Silence Self reuse the
# ORIGINAL Concentration (no new Focus or AE). These remain PARTIAL.
SELECTED.update({
  ('Basic','Heightened Senses 1'):('native-partial','sense-stealth','native-conditional-perception-manual-edge'),
  ('Basic','Heightened Senses 2'):('native-partial','sense-stealth','native-conditional-perception-manual-double-edge'),
  ('Illusion','Invisibility'):('native-partial','sense-stealth','native-concentration-conditional-stealth-edge'),
  ('Illusion','Silence Self'):('native-partial','sense-stealth','native-concentration-conditional-stealth-edge'),
})
# EXISTING engine already resolves Ego vs Vigilance, Fantastic-only normal
# damage and temporary blinded/deafened statuses. Register as references;
# do not add duplicate status/damage resolution.
SELECTED.update({
  ('Illusion','Dazzle'):('reference-existing','power-roll-condition','existing-vig-test-and-blinded'),
  ('Illusion','Deafen'):('reference-existing','power-roll-condition','existing-vig-test-and-deafened'),
  ('Illusion','Flare'):('reference-existing','power-roll-condition','existing-area-test-and-blinded'),
  ('Healing','Cure-All'):('reference-existing','power-roll-only','existing-ego-tn12-check-only-no-cure-automation'),
  ('Healing','Restore'):('reference-existing','power-roll-only','existing-ego-tn20-check-only-no-focus-restore'),
})

# Audited damage-scaling powers already handled by the existing generic Focus
# parser; these are REFERENCES, not newly implemented capabilities.
SELECTED.update({
  ('Elemental Control','Elemental Blast'):('reference-existing','generic-focus-damage','existing-focus-damage-parser'),
  ('Elemental Control','Supernova'):('native-partial','generic-focus-damage','existing-damage-with-narrator-area-half'),
  ('Magic','Bolts of Balthakk'):('reference-existing','generic-focus-damage','existing-focus-damage-parser'),
  ('Super-Strength','Smash'):('reference-existing','generic-focus-damage','existing-focus-damage-parser'),
})

# v0.2.198: native physical passives (no duplicated ActiveEffect writes),
# plus movement/DR/combat controllers demonstrably present since earlier builds.
# These REFERENCES are not counted as newly implemented abilities.
SELECTED.update({
  ('Basic','Additional Limbs'):('native-active','physical-edge','native-passive-roll-edge'),
  ('Super-Speed','Blazing Fast Fists'):('native-active','physical-edge','native-passive-close-attack-edge'),
  ('Spider-Powers','Spider Sense'):('native-partial','spider-sense','native-agility-vigilance-trouble-existing-initiative-and-defense'),
  ('Plasticity','Flexible Bones 1'):('reference-existing','passive-active-effect','existing-health-dr'),
  ('Plasticity','Flexible Bones 2'):('reference-existing','passive-active-effect','existing-health-dr'),
  ('Plasticity','Extended Reach 1'):('reference-existing','passive-movement','existing-movement-effects'),
  ('Plasticity','Extended Reach 2'):('reference-existing','passive-movement','existing-movement-effects'),
  ('Plasticity','Stilt Steps'):('reference-existing','passive-movement','existing-movement-effects'),
  ('Spider-Powers','Jump 1'):('reference-existing','passive-movement','existing-movement-effects'),
  ('Spider-Powers','Jump 2'):('reference-existing','passive-movement','existing-movement-effects'),
  ('Spider-Powers','Jump 3'):('reference-existing','passive-movement','existing-movement-effects'),
  ('Spider-Powers','Wallcrawling'):('reference-existing','passive-movement','existing-movement-effects'),
  ('Basic','Combat Trickery'):('reference-existing','combat-trickery','existing-combat-trickery'),
  ('Basic','Wisecracker'):('reference-existing','power-roll-existing','existing-ego-attack-conditions'),
})


# v0.2.199: 29-power attack/defense audit (15 Ranged Weapons, 9 Melee
# Weapons, 5 Martial Arts). Only actual new behavior is marked native.
# Attack damage/conditions listed as references do NOT claim that the full
# power (range, follow-up, special weapon effects) has been automated.
SELECTED.update({
  ('Martial Arts','Untouchable Position'):('native-partial','untouchable-position','native-attack-received-gm-marker-next-turn'),
  ('Ranged Weapons','Sniping'):('native-partial','sniping','native-fantastic-triple-and-range-preflight'),
  ('Ranged Weapons','Snap Shooting'):('native-partial','snap-shooting','native-half-full-damage-existing-bleeding'),
  ('Melee Weapons','Furious Attacks'):('native-partial','furious-attacks','native-focus-damage-and-half-full'),
})
SELECTED.update({(set_name,power_name):('reference-existing','attack-existing','existing-power-roll-damage-or-condition')
  for set_name,power_name in [
    ('Ranged Weapons','Dance of Death'),('Ranged Weapons','Orchestra of Overkill'),
    ('Ranged Weapons','Double Tap'),('Ranged Weapons','Suppressive Fire'),
    ('Ranged Weapons','Covering Fire'),('Ranged Weapons','Return Fire'),
    ('Ranged Weapons','Headshot'),('Ranged Weapons','Weapons Blazing'),
    ('Ranged Weapons','Slow-Motion Shoot-Dodge'),
    ('Melee Weapons','Whirling Frenzy'),('Melee Weapons','Unstoppable Assault'),
    ('Melee Weapons','Fast Attacks'),('Melee Weapons','Vicious Attack'),
    ('Martial Arts','Grappling Technique'),('Martial Arts','Leg Sweep'),
    ('Martial Arts','Chain Strikes'),('Martial Arts','Defense Stance'),
    ('Martial Arts','Fast Strikes'),
  ]})

# v0.2.200: 27 audited reactions/defenses/support powers. Only three
# add actual functionality; 24 remain unregistered when unverified.
SELECTED.update({
  ('Super-Speed','Blur'):('native-partial','blur','native-1-round-defensive-trouble'),
  ('Tactics','Hit the Dirt'):('native-partial','prone','native-atomic-voluntary-prone'),
  ('Tactics','Scatter'):('native-partial','prone','native-atomic-voluntary-prone-after-manual-move'),
})

# v0.2.204 — exactly scoped next batch (Spider-Powers 15, Basic 8, Super-Speed 4).
# v205: these trigger AFTER an attack is announced/rolled, not as a
# prepared defense. Text-only official Item cards; the attacker or GM clicks
# TROUBLE on the original roll; no AEs, auto-rerolls or second dice rolls.
# Spider-Pheromones is situational Ego social Edge while Concentrating.
SELECTED.update({
  ('Basic','Slow-Motion Dodge'):('native-partial','reactive-dodge','native-post-attack-manual-trouble'),
  ('Spider-Powers','Spider-Dodge'):('native-partial','reactive-dodge','native-post-attack-manual-trouble'),
  ('Spider-Powers','Spider-Pheromones'):('native-partial','spider-pheromones','native-concentration-conditional-ego-edge'),
})
# Existing roll/damage/status engines handle only the listed attack mechanics.
# They are documentation REFERENCES, not claims of complete native automation.
SELECTED.update({('Spider-Powers',name):('reference-existing','power-roll-condition','existing-attack-roll-condition-only')
  for name in ('Razorwebs','Spider-Strike','Venom Bash','Venom Blast',
               'Webcasting','Webgrabbing','Venom Burst')})
SELECTED.update({('Super-Speed','Speed Blast'):
  ('reference-existing','power-roll-condition','existing-attack-roll-condition-only')})

# v0.2.206 — 28-power audit: Shield Bearer (12), Martial Arts (9),
# Melee Weapons (3), Ranged Weapons (4). Seven bounded post-trigger
# defensive reaction cards: the existing tracker consumes one Reaction,
# caster Focus is spent only when applicable, and an official chat card
# requests manual TROUBLE/Health RD/knockback handling. Never pre-arm an
# effect or create a new attack roll. These remain PARTIAL until the
# Narrator resolves the trigger and original attack card.
SELECTED.update({(power_set,name):('native-partial','reactive-guard','native-post-trigger-official-card-manual-effect')
  for power_set,name in [
    ('Shield Bearer','Shield Deflection'),
    ('Shield Bearer','Hurled Shield Deflection'),
    ('Shield Bearer','Hurled Shield Block'),
    ('Shield Bearer','Immovable'),
    ('Super-Strength','Immovable'),
    ('Shield Bearer','Brace for Impact'),
    ('Martial Arts','Brace for Impact'),
  ]})
# v0.2.207: this one Reaction now marks the ally's token Actor through the
# authenticated GM support transaction; MMDR consumes the one-shot Shield RD.
SELECTED[('Shield Bearer','Hurled Shield Block')]=(
  'native-partial','reactive-guard','native-gm-atomic-shield-health-dr-once')
# Shield 1–4 already confer upgraded Health DR only while concentrating via
# shieldConcentrationChanges(). Catalog as EXISTING, not new protection.
SELECTED.update({('Shield Bearer',f'Shield {i}'):
  ('reference-existing','shield-concentration-dr','existing-concentration-health-dr')
  for i in range(1,5)})

# v0.2.208: class-restricted extra Reactions; the GM checks the actual
# power used on every spend and keeps each extra slot separate per round.
SELECTED.update({
  ('Martial Arts','Always Ready'):('native-active','scoped-reaction','native-martial-extra-reaction-gm-turn-tracker'),
  ('Ranged Weapons','Fast Hands'):('native-active','scoped-reaction','native-ranged-extra-reaction-gm-turn-tracker'),
})

# v0.2.213: exact scoped post-trigger reactions. These commit their own
# Reaction/Focus and official chat card; Trouble and any return ATTACK remain
# manual. Never present Riposte/Point-Blank Parry as automatic damage.
SELECTED.update({
  ('Resize','Shrinking Dodge'):('native-partial','reactive-guard','native-trigger-reaction-focus-manual-trouble'),
  ('Melee Weapons','Riposte'):('native-partial','reactive-guard','native-missed-melee-reaction-manual-riposte'),
  ('Ranged Weapons','Point-Blank Parry'):('native-partial','reactive-guard','native-close-missed-reaction-manual-ranged-attack'),
})

# v214: Stopping Power earns a real second ranged dice card ONLY after
# the GM confirms Fantastic damage; Hit n Run has automatic attack Edge.
# Both retain human-controlled movement/weapon/special adjudication.
SELECTED.update({
  ('Ranged Weapons','Stopping Power'):('native-partial','stopping-power','native-fantastic-confirmed-free-extra-ranged-attack'),
  ('Melee Weapons','Hit n Run'):('native-partial','hit-n-run','native-attack-edge-manual-free-half-movement'),
})

# v0.2.215: these Elemental powers were ALREADY supported by bounded
# mechanics; add truthful references instead of duplicating their damage,
# concentration or condition handlers. Ricochet is partial because the
# optional attack depends on a real confirmed Fantastic hit and line of sight.
SELECTED.update({
  ('Elemental Control','Elemental Barrage'):('reference-existing','elemental-damage-factor','existing-area-half-to-full-damage'),
  ('Elemental Control','Elemental Burst'):('reference-existing','elemental-attack','existing-attack-fantastic-elemental-effect'),
  ('Elemental Control','Elemental Grab'):('reference-existing','elemental-grab','existing-concentration-grab-escape'),
  ('Elemental Control','Elemental Prison'):('reference-existing','elemental-prison','existing-area-prison-concentration'),
  ('Elemental Control','Elemental Push'):('reference-existing','elemental-push','existing-attack-fantastic-movement'),
  ('Elemental Control','Elemental Suffocation'):('reference-existing','elemental-suffocation','existing-grab-requirement-attack'),
  ('Elemental Control','Elemental Ricochet'):('native-partial','elemental-ricochet','native-existing-fantastic-gm-confirmed-chain'),
})

# v0.2.211: source-bound Counterstrike Technique. GM computes from the
# confirmed original Melee attack and creates a native one-use MMDR damage card;
# manual Narrator confirmation of the return hit remains required.
SELECTED[('Martial Arts','Counterstrike Technique')]=(
  'native-partial','counterstrike-technique','native-atomic-confirmed-melee-gm-damage-card')

makeid=lambda s:hashlib.sha256(s.encode('utf-8')).hexdigest()[:16]
entries=[]
folder_ids={}
for name in sorted(folders):
    fid=makeid('m616-macro-folder:'+name)
    folder_ids[name]=fid
    # The source folder has a historical typo ('Placticity'), although every
    # official item records Power Set 'Plasticity'. Keep the folder ID stable
    # but display the correct official Power Set in Macros_D616.
    display_name='Plasticity' if name=='Placticity' else name
    folder_ids[display_name]=fid
    entries.append((f'!folders!{fid}',{
      'name':display_name,'type':'Macro','folder':None,'flags':{},'color':'#3e2b73',
      'description':'Power Set oficial — referências de automações D616',
      'sorting':'a','sort':0,'_id':fid}))
macros=[]
for (power_set,name),(mode,handler,execution_mode) in sorted(SELECTED.items()):
    found=[p for p in powers.values() if p['name']==name and p['system'].get('powerSet')==power_set]
    assert len(found)==1,(power_set,name)
    power=found[0];power_id=power['_id'];macro_id=makeid('m616-macro:'+power_id)
    ref={'schemaVersion':1,'powerId':power_id,'powerSet':power_set,
      'powerName':name,'sourceUuid':f'Compendium.multiverse-d616.powers.Item.{power_id}',
      'macroId':macro_id,'handlerId':handler,
      'status':mode,'executionMode':execution_mode}
    macro={'_id':macro_id,'name':name,'type':'script','scope':'global','img':power['img'],
      'command':f'game.multiverseD616?.nativePowerAutomations?.showMacroInfo("{macro_id}");',
      'author':None,'sort':0,'folder':folder_ids[power_set],
      'flags':{'multiverse-d616':{'nativeAutomation':ref}},
      'ownership':{'default':1}}
    macros.append(macro)
    entries.append((f'!macros!{macro_id}',macro))

path=ROOT/'packs/macros-d616'
path.mkdir(exist_ok=True)
(path/'CURRENT').write_text('MANIFEST-000001\n')
(path/'MANIFEST-000001').write_bytes((ROOT/'packs/mmc-powers-v0186/MANIFEST-000001').read_bytes())
# The WAL is a fresh database, not a copy of mutable source data.
ldb.write_log(path/'000002.log',[ldb.make_batch(entries)])
actual=ldb.read_entries(path/'000002.log')
assert len(actual)==len(entries) and len(macros)==len(SELECTED)==162
registry=[m['flags']['multiverse-d616']['nativeAutomation'] for m in macros]
(ROOT/'scripts/native-power-registry-data.mjs').write_text(
  '// GENERATED by tools/build-native-macro-pack.py from the source Powers LevelDB.\n'+
  'export const REGISTERED_AUTOMATIONS = Object.freeze('+json.dumps(registry,ensure_ascii=False,indent=2)+');\n',encoding='utf-8')
assert all(actual[f'!macros!{m["_id"]}']['img']==m['img'] for m in macros)
print(f'OK: {len(macros)} macro references, {len(folders)} power-set folders')
