import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const readme=fs.readFileSync(new URL('../README.md', import.meta.url));
const md=readme.toString('utf8');
const changelog=fs.readFileSync(new URL('../CHANGELOG.md', import.meta.url),'utf8');
test('README aprovado do mantenedor permanece sem histórico de versões',()=>{
 assert.equal(createHash('sha256').update(readme).digest('hex'), '04838f7de55c47a833f548639088158f9827c26be17f8a12ea8f49164bdf45cf');
 assert.match(md,/## Instalação \(Manifest\)/);
 assert.match(md,/## Créditos e Referências/);
 assert.match(md,/## Veículos e tripulação/);
 assert.match(md,/O desembarque não revoga essa permissão/);
 assert.match(md,/## Health e Focus automáticos/);
 assert.doesNotMatch(md,/\bv0\.2\.\d+\b/);
});
test('Novidades e correções da publicação ficam somente no CHANGELOG',()=>{
 assert.match(changelog,/^## v0\.2\.153/);
 assert.match(changelog,/README canônico/);
});
