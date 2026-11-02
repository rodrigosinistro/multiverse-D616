import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readCatalog = () => JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json', import.meta.url), 'utf8')).items;
const pack = () => readFileSync(new URL('../packs/mmc-powers-v0186/000002.log', import.meta.url));
function readVarint(buffer, offset) {
  let value = 0;
  let factor = 1;
  while (true) {
    assert.ok(offset < buffer.length, 'Invalid varint');
    const byte = buffer[offset++];
    value += (byte & 0x7f) * factor;
    if ((byte & 0x80) === 0) return { value, offset };
    factor *= 128;
  }
}
function parseWrites(buffer) {
  const batches = [];
  let fragments = [];
  for (let pos = 0; pos < buffer.length;) {
    const remainingInBlock = 32768 - (pos % 32768);
    if (remainingInBlock < 7) { pos += remainingInBlock; continue; }
    const length = buffer.readUInt16LE(pos + 4);
    const type = buffer[pos + 6];
    pos += 7;
    if (!length && !type) { pos += 32768 - (pos % 32768); continue; }
    assert.ok([1, 2, 3, 4].includes(type), `Invalid record type ${type}`);
    assert.ok(length <= 32768 - (pos % 32768), 'Record crosses a block boundary');
    fragments.push(buffer.subarray(pos, pos + length));
    pos += length;
    if (type === 1 || type === 4) {
      batches.push(Buffer.concat(fragments));
      fragments = [];
    }
  }
  assert.equal(fragments.length, 0, 'Unfinished LevelDB record');
  const documents = new Map();
  for (const batch of batches) {
    const count = batch.readUInt32LE(8);
    let offset = 12;
    for (let i = 0; i < count; i++) {
      const operation = batch[offset++];
      let part = readVarint(batch, offset); offset = part.offset;
      const key = batch.subarray(offset, offset + part.value).toString('utf8'); offset += part.value;
      if (operation === 1) {
        part = readVarint(batch, offset); offset = part.offset;
        const value = JSON.parse(batch.subarray(offset, offset + part.value).toString('utf8'));
        offset += part.value;
        documents.set(key, value);
      } else if (operation === 0) documents.delete(key);
      else assert.fail(`Unexpected LevelDB operation: ${operation}`);
    }
    assert.equal(offset, batch.length, 'Trailing data in WriteBatch');
  }
  return documents;
}

test('todos os poderes do catálogo estão no compêndio com ID e nome correspondentes', () => {
  const catalog = readCatalog();
  const documents = parseWrites(pack());
  const packed = [...documents.keys()].filter((key) => key.startsWith('!items!'));
  assert.equal(catalog.length, 398);
  assert.equal(packed.length, catalog.length, 'Número de poderes no compêndio difere do catálogo');
  for (const power of catalog) {
    const entry = documents.get(`!items!${power._id}`);
    assert.ok(entry, `Poder ausente do compêndio: ${power.name}`);
    assert.equal(entry.name, power.name, `Nome divergente para ${power._id}`);
    assert.equal(entry.type, 'power');
    assert.ok(documents.has(`!folders!${power.folder}`), `Pasta ausente para ${power.name}`);
  }
});

test('os quatro poderes emocionais de Telepatia estão pesquisáveis no compêndio', () => {
  const documents = parseWrites(pack());
  for (const name of ['Control Emotion', 'Control Group Emotion', 'Sense Emotion', 'Sway Emotion']) {
    const matches = [...documents.entries()]
      .filter(([key, item]) => key.startsWith('!items!') && item.name === name);
    assert.equal(matches.length, 1, `${name} deve existir exatamente uma vez`);
    assert.equal(matches[0][1].system.powerSet, 'Telepathy');
  }
});
