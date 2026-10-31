import test from 'node:test';
import assert from 'node:assert/strict';
import {
  focusedCombatToken,focusedCombatTokens,renderTokenUnderlays,
  clearTokenUnderlays,registerCombatIconAssets,
} from '../scripts/combat/compact-token-underlay.mjs';

class Container {
  constructor(){this.children=[];this.position={set:(x,y)=>{this.x=x;this.y=y;}};this.scale={set:x=>{this.zoom=x;}};}
  addChild(child){this.children.push(child);child.parent=this;return child;}
  removeChild(child){this.children.splice(this.children.indexOf(child),1);child.parent=null;}
  destroy(){this.destroyed=true;}
  sortChildren(){this.sorted=true;}
}
class Graphics extends Container {
  beginFill(){return this;} endFill(){return this;} lineStyle(){return this;}
  drawRoundedRect(){return this;} drawCircle(){return this;} drawRect(){return this;}
}
class Sprite extends Container {
  constructor(texture){super();this.texture=texture;this.anchor={set:(v)=>{this.anchorValue=v;}};}
}
const usedIcons=[];
const Texture={from(url){usedIcons.push(url);return {url};}};
globalThis.PIXI={Container,Graphics,Sprite,Texture};
globalThis.game={user:{isGM:true}};
const primary=new Container();
globalThis.canvas={primary,stage:{scale:{x:1}}};
const own={id:'own',visible:true,isOwner:true,actor:{isOwner:true},document:{hidden:false,elevation:0},x:100,y:100,w:100,h:100};
const enemy={id:'enemy',visible:true,isOwner:false,actor:{isOwner:false},document:{hidden:false,elevation:0},x:200,y:100,w:100,h:100};
const hidden={...enemy,id:'secret',document:{hidden:true,elevation:0}};
const state={actionUsed:0,actionMax:2,reactionUsed:0,reactionMax:1,movementMax:5,movementUsed:1};

test('mantém seleção e exibe simultaneamente hover visível para jogador e Mestre',()=>{
  const tokens={hover:enemy,controlled:[own]};
  assert.deepEqual(focusedCombatTokens(tokens,true),[own,enemy]);
  assert.deepEqual(focusedCombatTokens(tokens,false),[own,enemy]);
  assert.equal(focusedCombatToken(tokens,false),enemy);
  tokens.hover=hidden;
  assert.deepEqual(focusedCombatTokens(tokens,false),[own]);
  assert.deepEqual(focusedCombatTokens(tokens,true),[own,hidden]);
  tokens.controlled=[enemy];tokens.hover=null;
  assert.deepEqual(focusedCombatTokens(tokens,false),[],'jogador não controla token sem permissão');
  tokens.hover=enemy;
  assert.deepEqual(focusedCombatTokens(tokens,false),[enemy],'hover em alvo visível independente da propriedade');
  tokens.hover={...enemy,visible:false};
  assert.deepEqual(focusedCombatTokens(tokens,false),[]);
});
test('desenha as imagens originais sem depender de Font Awesome como texto',()=>{
  assert.equal(renderTokenUnderlays({token:own,state}),true);
  assert.equal(primary.children.length,1);
  assert.equal(primary.children[0].sortLayer,650);
  assert.equal(primary.children[0].eventMode,'none');
  assert.equal(primary.sorted,true);
  assert.equal(primary.children[0].children.length,2,'ações acima e movimento abaixo');
  const resources=primary.children[0].children[0];
  assert.equal(resources.children.filter(child=>child instanceof Sprite).length,3);
  const movement=primary.children[0].children[1];
  assert.ok(movement.children.filter(child=>child instanceof Sprite).length>=4);
  assert.equal(movement.y,own.y+own.h+30,'setas ficam abaixo do nome do token');
  assert.ok(usedIcons.some(name=>name.includes('hand-fist.svg')));
  assert.ok(usedIcons.some(name=>name.includes('shield-halved.svg')));
  assert.ok(usedIcons.some(name=>name.includes('chevron-right.svg')));
  assert.equal(renderTokenUnderlays({token:own,state}),true);
  assert.equal(primary.children.length,1,'não duplica o mesmo recurso');
});
test('GM conserva seu token ao colocar cursor sobre outro; remove apenas o alvo ao sair do hover',()=>{
  const both=[{token:own,state},{token:enemy,state}];
  assert.equal(renderTokenUnderlays({entries:both}),true);
  assert.equal(primary.children.length,2);
  assert.equal(renderTokenUnderlays({entries:[both[0]]}),true);
  assert.equal(primary.children.length,1);
  assert.equal(primary.children[0].children[1].x,own.x+own.w/2);
  assert.equal(renderTokenUnderlays({entries:[]}),true);
  assert.equal(primary.children.length,0);
});
test('acompanha zoom; carrega os próprios arquivos na cena; limpa com HUD desligado',()=>{
  const sceneTextures={};registerCombatIconAssets(sceneTextures);
  assert.match(sceneTextures['m616-compact-action'],/hand-fist\.svg$/);
  assert.match(sceneTextures['m616-compact-reaction'],/shield-halved\.svg$/);
  assert.match(sceneTextures['m616-compact-arrow'],/chevron-right\.svg$/);
  canvas.stage.scale.x=2;
  renderTokenUnderlays({token:own,state});
  const root=primary.children[0];
  assert.equal(root.children[0].zoom,.5);
  assert.equal(root.children[1].zoom,.5);
  assert.equal(root.children[1].y,own.y+own.h+15);
  renderTokenUnderlays({token:own,state,enabled:false});
  assert.equal(primary.children.length,0);
  clearTokenUnderlays();
});
