import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installQuietTokenRuler,quietFoundryTokenRulers} from '../scripts/combat/native-token-ruler-visuals.mjs';

class CoreTokenRuler {
  _getWaypointLabelContext(){return {text:'5,92 (+3,87)',icon:'walking'};}
  _getSegmentStyle(){return {color:0x00ff00,width:3,alpha:1};}
  _getWaypointStyle(){return {color:0x00ff00,radius:5,alpha:1};}
  _getGridHighlightStyle(){return {color:0x00ff00,alpha:1};}
  _configureOutline(){return {color:0xffffff,thickness:2};}
  pathMeasurements(){return [2,4,6];}
  moveAlongPath(){return 'moved';}
}
class ManualRuler {
  _getSegmentStyle(){return {width:3,alpha:1};}
}
let quiet = true;

test('a régua nativa do token não apresenta linhas, pontos, destaques ou etiquetas duplicadas',()=>{
  assert.equal(installQuietTokenRuler(CoreTokenRuler,()=>quiet),true);
  const native=new CoreTokenRuler();
  assert.equal(native._getWaypointLabelContext(),undefined);
  assert.equal(native._getSegmentStyle().width,0);
  assert.equal(native._getSegmentStyle().alpha,0);
  assert.equal(native._getWaypointStyle().radius,0);
  assert.equal(native._getGridHighlightStyle().alpha,0);
  assert.equal(native._configureOutline().thickness,0);
  assert.deepEqual(native.pathMeasurements(),[2,4,6]);
  assert.equal(native.moveAlongPath(),'moved');
  // Manual measuring (R) is not a token ruler, and must remain usable.
  assert.deepEqual(new ManualRuler()._getSegmentStyle(),{width:3,alpha:1});
});

test('sem a opção do Multiverse ativa as decorações nativas voltam ao normal',()=>{
  quiet=false;
  const native=new CoreTokenRuler();
  assert.deepEqual(native._getWaypointLabelContext(),{text:'5,92 (+3,87)',icon:'walking'});
  assert.equal(native._getSegmentStyle().width,3);
  assert.equal(native._getWaypointStyle().radius,5);
  assert.equal(native._getGridHighlightStyle().alpha,1);
  assert.equal(native._configureOutline().thickness,2);
  quiet=true;
  assert.equal(installQuietTokenRuler(CoreTokenRuler,()=>quiet),true,'idempotente');
  assert.equal(native._getSegmentStyle().width,0);
});

test('v14 encontra a classe TokenRuler por namespace oficial',()=>{
  class InstalledRuler { _getWaypointLabelContext(){return {text:'1'};} }
  globalThis.foundry={canvas:{placeables:{tokens:{TokenRuler:InstalledRuler}}}};
  assert.equal(quietFoundryTokenRulers(()=>true),true);
  assert.equal(new InstalledRuler()._getWaypointLabelContext(),undefined);
});

test('desenhos vetoriais são brancos antes do tint no canvas; a informação de distância fica próxima',()=>{
  const root=new URL('../',import.meta.url);
  for(const name of ['hand-fist','shield-halved','chevron-right']){
    const svg=readFileSync(new URL(`ui/compact-combat-icons/${name}.svg`,root),'utf8');
    assert.match(svg,/fill="#ffffff"/);
    assert.doesNotMatch(svg,/currentColor/);
  }
  const underlay=readFileSync(new URL('scripts/combat/compact-token-underlay.mjs',root),'utf8');
  assert.match(underlay,/sprite\(group,spec\.type,x,0,0xffffff,15\)/);
  const display=readFileSync(new URL('scripts/combat/native-distance-display.mjs',root),'utf8');
  assert.match(display,/y:source\.y, elevation/);
  assert.match(display,/y:target\.y, elevation/);
  assert.match(display,/anchorY-pillHeight-26/);
  assert.doesNotMatch(display,/walkDisplayTree|looksLikeDistanceDecoration|setExternalDistanceDecorationsHidden/);
  assert.match(display,/showRemotePreview/);
});
