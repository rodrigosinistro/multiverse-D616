/**
 * D616 VFX Bridge — optional, visual-only Sequencer integration.
 * No roll, damage, action, focus, target or concentration state is modified.
 * Per-power settings are stored on Item flags (including equipment copies).
 */
export const VFX_NS = 'multiverse-d616';
export const VFX_FIELD = 'vfx';
export const VFX_GLOBAL_SETTING = 'powerVfxEnabled';
const MODES = new Set(['auto','projectile','target','self']);
const LAYERS = new Set(['above','below']);
const isSeraphim = item => /^Shield of the Seraphim$/i.test(String(item?.name ?? '').trim());
const AUTO_PRESETS = Object.freeze({
  // These paths are documented Sequencer/JB2A database keys, not bundled media.
  'Elemental Blast:fire': {file:'jb2a.fire_bolt.orange', mode:'projectile'},
  'Teleport 1': {file:'jb2a.misty_step.02.blue', mode:'self'},
  'Teleport 2': {file:'jb2a.misty_step.02.blue', mode:'self'},
  'Teleport Blind': {file:'jb2a.misty_step.02.blue', mode:'self'},
  'Blink': {file:'jb2a.misty_step.02.blue', mode:'self'},
});

export function getPowerVfxConfig(item) {
  const flags=item?.flags?.[VFX_NS]?.[VFX_FIELD] ?? item?.getFlag?.(VFX_NS,VFX_FIELD) ?? {};
  return {
    enabled: flags?.enabled !== false,
    file: String(flags?.file ?? '').trim(),
    mode: MODES.has(flags?.mode) ? flags.mode : 'auto',
    scale: Math.max(0.25,Math.min(5,Number(flags?.scale)||1)),
    persistent: flags?.persistent === true || (flags?.persistent !== false && isSeraphim(item)),
    layer: LAYERS.has(flags?.layer) ? flags.layer : 'above',
  };
}

export function resolvePowerVfx(item) {
  const config=getPowerVfxConfig(item);
  if (!config.enabled) return null;
  let file=config.file;
  let mode=config.mode;
  if (!file && item?.type==='power') {
    const name=String(item.name??'').trim();
    const element=String(item.system?.element??item.actor?.system?.element??'').trim().toLowerCase();
    const preset=AUTO_PRESETS[`${name}:${element}`] ?? AUTO_PRESETS[name];
    if (preset) {file=preset.file; if(mode==='auto')mode=preset.mode;}
  }
  if (!file) return null;
  if (mode==='auto') mode = item?.type==='weapon' || item?.system?.attack ? 'projectile':'self';
  return {file,mode,scale:config.scale,
    ...(config.persistent ? {persistent:true} : {}),
    ...(config.layer==='below' ? {layer:'below'} : {})};
}

export function registerPowerVfxSettings() {
  game.settings.register(VFX_NS,VFX_GLOBAL_SETTING,{
    name:'D616 — Animações dos Poderes (Sequencer)',
    hint:'Integração visual opcional. Desligar não altera Focus, dano, condições, movimento ou automações. Requer Sequencer e arquivos de animação instalados.',
    scope:'world',config:true,type:Boolean,default:true,
    onChange: enabled => {
      if(enabled===false && typeof globalThis.Sequencer?.EffectManager?.endEffects==='function') {
        void Promise.resolve(globalThis.Sequencer.EffectManager.endEffects({name:'d616-concentration-vfx-*'}))
          .catch(error=>console.warn('[multiverse-d616] Falha ao encerrar VFX:',error));
      }
    },
  });
}

export function sequencerReady() {
  return Boolean(game?.modules?.get?.('sequencer')?.active && typeof globalThis.Sequence==='function');
}

/** Find exactly the transient Concentration Effect created for this Power.
 * Avoid borrowing another power's Concentration or creating orphaned VFX.
 */
export function concentrationForVfx(item) {
  if(!item?.actor || !item?.id) return null;
  return Array.from(item.actor.effects ?? []).find(effect =>
    !effect?.disabled &&
    String(effect?.flags?.[VFX_NS]?.concentrationPower?.itemId ?? '') === String(item.id) &&
    effect?.flags?.[VFX_NS]?.concentrationPower?.transient === true
  ) ?? null;
}

export function persistentVfxName(effect) {
  return `d616-concentration-vfx-${effect?.uuid ?? effect?.id ?? ''}`;
}

/** Ending Concentration cleans up its own visual, never somebody else's.
 * Sequencer's tieToDocuments separately guards deletion and token removal.
 */
export function registerPowerVfxLifecycleHooks() {
  if(typeof Hooks?.on !== 'function') return;
  const cleanup = effect => {
    if (!effect?.flags?.[VFX_NS]?.concentrationPower?.transient) return;
    const manager=globalThis.Sequencer?.EffectManager;
    if(typeof manager?.endEffects !== 'function') return;
    // Only the initiating client should broadcast cleanup on document changes.
    void Promise.resolve(manager.endEffects({name:persistentVfxName(effect)})).catch(
      error=>console.warn('[multiverse-d616] VFX persistente: falha ao encerrar:',error));
  };
  Hooks.on('deleteActiveEffect',(effect,_options,userId)=>{
    if(userId && game?.user?.id && userId!==game.user.id)return;
    cleanup(effect);
  });
  Hooks.on('updateActiveEffect',(effect,changes,_options,userId)=>{
    if(userId && game?.user?.id && userId!==game.user.id)return;
    if(changes?.disabled===true)cleanup(effect);
  });
}

export function sourceTokenForVfx(actor) {
  if (!actor || !canvas?.ready) return null;
  const owned = Array.from(canvas.tokens?.controlled??[]).find(t=>t.actor?.id===actor.id);
  return owned || Array.from(canvas.tokens?.placeables??[]).find(t=>t.actor?.id===actor.id && t.isVisible!==false) || null;
}

/** Render once, only on the activating client. Sequencer broadcasts playback.
 * A missing module/asset is never a reason to fail an actual power activation.
 */
export async function playPowerVfx(item,{preview=false,token=null,targets=null}={}) {
  const def=resolvePowerVfx(item);
  if (!def) {if(preview)ui?.notifications?.warn?.('Configure uma animação na ficha do poder.'); return false;}
  if (!preview && game?.settings?.get && game.settings.get(VFX_NS,VFX_GLOBAL_SETTING)===false) return false;
  if (!sequencerReady()) {
    if(preview)ui?.notifications?.warn?.('Ative o módulo Sequencer para reproduzir animações.');
    return false;
  }
  const source=token ?? sourceTokenForVfx(item?.actor);
  if (!source) {if(preview)ui?.notifications?.warn?.('Selecione um token deste personagem em uma cena ativa.');return false;}
  const marked=targets ?? Array.from(game?.user?.targets??[]);
  const destinations=(def.mode==='self')?[source]:marked.filter(t=>t&&t!==source).slice(0,6);
  if (destinations.length===0) {
    if(preview)ui?.notifications?.warn?.('Marque pelo menos um alvo para esta animação.');
    return false;
  }
  // A persisted animation must be bound to a real, active Power Concentration
  // effect. Never leave an unmanaged infinite-duration graphic on the canvas.
  const persist=def.persistent===true && def.mode==='self' && !preview;
  const concentration = persist ? concentrationForVfx(item) : null;
  if(persist && !concentration) {
    ui?.notifications?.warn?.(`${item?.name ?? 'Poder'}: VFX persistente requer Concentração ativa; nenhum efeito permanente foi criado.`);
    return false;
  }
  // Database names are case-sensitive (older copied A-A keys may be uppercase).
  const file=/^jb2a\./i.test(def.file) ? def.file.toLowerCase() : def.file;
  const db=globalThis.Sequencer?.Database;
  if(/^jb2a\./i.test(file) && typeof db?.entryExists==='function' && !db.entryExists(file)) {
    if(preview)ui?.notifications?.warn?.(`Animação não encontrada na biblioteca: ${file}. Instale a biblioteca ou escolha outro caminho.`);
    return false;
  }
  try {
    const sequence=new globalThis.Sequence();
    if(persist) {
      const manager=globalThis.Sequencer?.EffectManager;
      if(typeof manager?.endEffects==='function') await manager.endEffects({name:persistentVfxName(concentration)});
    }
    for(const destination of destinations) {
      let effect=sequence.effect().file(file);
      if(persist) {
        effect=effect.attachTo(source,{bindVisibility:true});
        // Default to above-token layer for protective shields; optionally let
        // the author display the animation under the token instead.
        if(typeof effect.belowTokens==='function')effect=effect.belowTokens(def.layer==='below');
        if(def.layer!=='below' && typeof effect.zIndex==='function')effect=effect.zIndex(1000);
        effect=effect.scaleToObject(def.scale);
        effect=effect.name(persistentVfxName(concentration)).persist();
        if(typeof effect.tieToDocuments==='function')effect=effect.tieToDocuments(concentration);
        if(typeof effect.fadeIn==='function')effect=effect.fadeIn(200);
        if(typeof effect.fadeOut==='function')effect=effect.fadeOut(250);
      } else {
        effect=effect.atLocation(def.mode==='target'?destination:source);
        if(def.mode==='projectile') effect=effect.stretchTo(destination);
        if(def.mode!=='projectile' && typeof effect.scaleToObject==='function') effect=effect.scaleToObject(def.scale);
        if(def.mode!=='projectile' && typeof effect.belowTokens==='function')effect=effect.belowTokens(def.layer==='below');
        if(def.mode!=='projectile' && def.layer!=='below' && typeof effect.zIndex==='function')effect=effect.zIndex(1000);
      }
    }
    // Never await completion or slow down the combat workflow.
    void Promise.resolve(sequence.play()).catch(error=>{
      console.warn('[multiverse-d616] VFX não pôde ser reproduzido:',error);
      if(preview)ui?.notifications?.warn?.('Não foi possível reproduzir a animação. Confira o caminho escolhido.');
    });
    return true;
  } catch(error) {
    console.warn('[multiverse-d616] Falha visual isolada do poder:',error);
    if(preview)ui?.notifications?.warn?.('Falha no efeito visual; verifique Sequencer e o arquivo.');
    return false;
  }
}
