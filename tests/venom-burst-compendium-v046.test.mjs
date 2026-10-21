import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const packFile = new URL('../packs/mmc-powers-v0186/000002.log', import.meta.url);
const catalogFile = new URL('../apps/charactermancer/data/powers.json', import.meta.url);

const crcTable = Array.from({ length: 256 }, (_, start) => {
  let crc = start;
  for (let i=0;i<8;i++) crc=(crc >>> 1) ^ (crc & 1 ? 0x82f63b78 : 0);
  return crc >>> 0;
});
function maskedCrc32c(data) {
  let crc = 0xffffffff;
  for (const b of data) crc = (crcTable[(crc ^ b) & 255] ^ (crc >>> 8)) >>> 0;
  crc = (crc ^ 0xffffffff) >>> 0;
  return (((crc >>> 15) | (crc << 17)) + 0xa282ead8) >>> 0;
}
function readVarint(bytes, start) {
  let value=0, mul=1, pos=start;
  while (true) {
    assert.ok(pos < bytes.length, 'truncated varint');
    const byte=bytes[pos++];
    value += (byte & 127) * mul;
    if (byte < 128) return [value, pos];
    mul *= 128;
  }
}
function readPowerCompendium() {
  const bytes=readFileSync(packFile);
  const batches=[];
  let fragments=[];
  let pos=0;
  while (pos < bytes.length) {
    const remain=32768-(pos % 32768);
    if (remain < 7) { pos+=remain;continue; }
    assert.ok(pos + 7 <= bytes.length);
    const crc=bytes.readUInt32LE(pos), len=bytes.readUInt16LE(pos+4), kind=bytes[pos+6];
    const data=bytes.subarray(pos+7,pos+7+len);
    assert.equal(data.length,len);
    assert.equal(crc,maskedCrc32c(Buffer.concat([Buffer.from([kind]),data])),`invalid LevelDB WAL checksum at ${pos}`);
    pos+=7+len;
    if (kind===1) batches.push(data);
    else if(kind===2) fragments=[data];
    else if(kind===3) fragments.push(data);
    else if(kind===4) {fragments.push(data);batches.push(Buffer.concat(fragments));fragments=[];}
    else assert.fail(`unknown WAL record type: ${kind}`);
  }
  assert.equal(fragments.length,0);
  const items=new Map();
  for (const batch of batches) {
    const n=batch.readUInt32LE(8);
    let at=12;
    for(let i=0;i<n;i++){
      const op=batch[at++];
      const [kl, np]=readVarint(batch,at);at=np;
      const key=batch.subarray(at,at+kl).toString();at+=kl;
      if (op===1) {
        const [vl,vp]=readVarint(batch,at);at=vp;
        const value=batch.subarray(at,at+vl);at+=vl;
        if (key.startsWith('!items!')) items.set(key,JSON.parse(value.toString()));
      } else if (op===0) items.delete(key);
      else assert.fail(`invalid LevelDB batch action ${op}`);
    }
    assert.equal(at,batch.length,'invalid LevelDB batch length');
  }
  return [...items.values()];
}

test('compêndio contém Venom Bash e Venom Burst distintos, sem duplicata de nome',() => {
  const items=readPowerCompendium();
  const bash=items.filter(item=>item.name==='Venom Bash');
  const burst=items.filter(item=>item.name==='Venom Burst');
  assert.equal(bash.length,1);
  assert.equal(burst.length,1);
  assert.equal(bash[0]._id,'BxD7F1yfUKtqWdUV');
  assert.equal(burst[0]._id,'KQxISBVt5QDnkh6C');
  assert.equal(bash[0].system.prerequisites,'');
  assert.equal(burst[0].system.prerequisites,'Venom Bash, Rank 3');
  assert.equal(burst[0].system.cost,'10 Focus');
  assert.match(burst[0].system.effect,/arcos de bioeletricidade ao redor/);
});

test('nomes e pré-requisitos são consistentes entre compêndio e Charactermancer',() => {
  const items=readPowerCompendium();
  const catalog=JSON.parse(readFileSync(catalogFile,'utf8')).items;
  for(const name of ['Venom Bash','Venom Burst']) {
    const pack=items.find(x=>x.name===name);
    const website=catalog.find(x=>x.name===name);
    assert.ok(pack && website);
    assert.equal(pack.system.prerequisites,website.system.prerequisites);
  }
});
