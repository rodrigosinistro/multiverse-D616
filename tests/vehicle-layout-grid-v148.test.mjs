import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const template=readFileSync(new URL('../templates/actor/actor-vehicle-sheet.hbs',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles/actor-sheet-v2.css',import.meta.url),'utf8');
const vehicleCss=readFileSync(new URL('../styles/vehicle-sheet.css',import.meta.url),'utf8');

// Static HTML skeleton validation is deliberate: the regression in v0.2.147
// came from one unmatched </div> in the Handlebars template, not from CSS.
function parseSkeleton(html){
  const nodes=[];
  const stack=[];
  const voidTags=new Set(['input','img','br','hr','meta','link','source']);
  const tags=/<\/?([a-z][\w:-]*)(?:\s[^<>]*?)?>/gi;
  for(const match of html.matchAll(tags)){
    const token=match[0], tag=match[1].toLowerCase();
    if(token.startsWith('</')){
      const previous=stack.pop();
      assert.equal(previous?.tag,tag,`closing ${token} must match open <${previous?.tag ?? 'none'}> at index ${match.index}`);
    } else {
      const classes=token.match(/\bclass="([^"]+)"/)?.[1].split(/\s+/).filter(Boolean) ?? [];
      const node={tag,classes,parent:stack.at(-1)??null,children:[]};
      if(node.parent) node.parent.children.push(node);
      nodes.push(node);
      if(!token.endsWith('/>') && !voidTags.has(tag))stack.push(node);
    }
  }
  assert.deepEqual(stack.map(n=>n.tag),[], 'every HTML tag closes at its correct level');
  return nodes;
}
const has=(node,className)=>node.classes.includes(className);
const find=(nodes,className)=>{
  const matches=nodes.filter(node=>has(node,className));
  assert.equal(matches.length,1,`${className} must be unique`);
  return matches[0];
};

test('Vehicle upper dashboard keeps exactly three direct columns with Damage and Movement stacked inside the third',()=>{
  const nodes=parseSkeleton(template);
  const top=find(nodes,'mm-v2-npc-top');
  const identity=find(nodes,'mm-v2-npc-identity');
  const abilities=find(nodes,'mm-v2-abilities');
  const right=find(nodes,'m616-vehicle-right-column');
  const damage=find(nodes,'mm-v2-damage');
  const movement=find(nodes,'m616-vehicle-movement');
  assert.deepEqual(top.children,[identity,abilities,right]);
  assert.deepEqual(right.children,[damage,movement]);
  assert.equal(identity.parent,top);
  assert.equal(abilities.parent,top);
  assert.equal(damage.parent,right);
  assert.equal(movement.parent,right);
  assert.match(css,/\.mm-v2-npc-top\s*\{[^}]*display:grid;grid-template-columns:([^;]*\s){2}/);
  assert.match(vehicleCss,/\.m616-vehicle-right-column\s*\{\s*display:flex;flex-direction:column;/);
});

test('Vehicle keeps Powers + Traits side by side, and Crew underneath for GM and players',()=>{
  const nodes=parseSkeleton(template);
  const top=find(nodes,'mm-v2-npc-top');
  const bottom=find(nodes,'mm-v2-npc-bottom');
  const powers=find(nodes,'mm-powers-block');
  const traits=find(nodes,'mm-traitstags-block');
  const crew=find(nodes,'m616-vehicle-crew');
  assert.deepEqual(bottom.children,[powers,traits]);
  assert.equal(bottom.parent,top.parent);
  assert.equal(crew.parent,top.parent);
  const childOrder=top.parent.children;
  assert.ok(childOrder.indexOf(top)<childOrder.indexOf(bottom));
  assert.ok(childOrder.indexOf(bottom)<childOrder.indexOf(crew));
  assert.match(template,/vehicleCanManage/);
  assert.match(template,/vehicleCanRoll/);
});
