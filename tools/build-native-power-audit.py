"""Offline, read-only audit of the actual v0.2.178 Powers LevelDB catalog.
Only writes audit/ reports. Never changes the source power compendium.
"""
from pathlib import Path
from collections import Counter
import importlib.util,json,csv,re,html
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('d616ldb',ROOT/'tools/d616-leveldb.py')
ldb=importlib.util.module_from_spec(spec);spec.loader.exec_module(ldb)
powers=[v for k,v in ldb.read_entries(ROOT/'packs/mmc-powers-v0186/000002.log').items() if k.startswith('!items!')]
source=json.loads((ROOT/'apps/charactermancer/data/powers.json').read_text())['items']
by_id={p['_id']:p for p in source}
assert len(powers)==len(by_id)==398

REFERENCE={('Basic','Anger'):('planejada','Nenhum controlador dedicado de Anger identificado.'),
('Basic','Energy Absorption'):('nativa-validada','scripts/energy-absorption-custom.mjs; integração especial por Item.roll()'),
('Super-Speed','Lightning Actions'):('central-dependente','scripts/custom-automations.mjs; passiva cadastrável pela Central (v174)'),
**{('Elemental Control',f'Elemental Protection {i}'):('parcial-revisar','scripts/elemental-shields.mjs e scripts/elemental-advanced.mjs') for i in range(1,5)}}

def plain(v):return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]*>',' ',str(v or '')))).strip()
def family(item):
    n=item['name'].lower();s=item['system'];a=str(s.get('action','')).lower();d=str(s.get('duration','')).lower();e=plain(s.get('effect')).lower()
    if ('teleport' in n or 'travel' in n or 'movement' in e[:80]):return 'Movimentação/teleporte/viagem'
    if 'healing' in s.get('powerSet','').lower() or any(x in n for x in ('heal','regenerat','recover')):return 'Cura/recuperação'
    if 'reaction' in a or 'reação' in a:return 'Reação/proteção'
    if any(x in d for x in ('concentration','concentração')):return 'Concentração/efeito mantido'
    if 'permanent' in d or 'permanente' in d:return 'Passiva/permanente'
    if s.get('attack') is True or s.get('attackKind'):return 'Ataque ou verificação'
    if 'standard' in a or 'padrão' in a:return 'Ativação/custo/efeito'
    if any(x in n for x in ('illusion','disguise','memory')):return 'Efeito especial/narrativo'
    return 'Especial/avaliação manual'

def mechanisms(p):
    s=p['system']; parts=[]
    if s.get('cost'):parts.append('Focus/custo (motor genérico apenas quando reconhecido)')
    if 'concentration' in str(s.get('duration','')).lower() or 'concentração' in str(s.get('duration','')).lower():parts.append('Concentração')
    if 'standard' in str(s.get('action','')).lower():parts.append('Ação Padrão')
    if 'reaction' in str(s.get('action','')).lower():parts.append('Reação')
    if s.get('attack') or s.get('attackKind'):parts.append('Rolagem / dano (confirmar com resolvedor)')
    return parts

code_sources={str(f.relative_to(ROOT)):f.read_text(encoding='utf-8',errors='replace') for f in
    [ROOT/'multiverse-d616.mjs',*list((ROOT/'scripts').rglob('*.mjs')),*list((ROOT/'scripts').rglob('*.js'))]}

def reference_paths(name):
    # Exact quoted mentions are a useful audit candidate, not proof of behavior.
    return [path for path,text in code_sources.items() if any(q+name+q in text for q in ("'",'"','`'))]

rows=[]
for p in sorted(powers,key=lambda x:(x['system'].get('powerSet','').casefold(),x['name'].casefold(),x['_id'])):
    s=p.get('system',{});k=(s.get('powerSet'),p['name']);status,evidence=REFERENCE.get(k,('não-verificada','Somente mecanismos genéricos identificáveis por metadados; NÃO é prova de ausência de automação.'))
    rows.append({'powerId':p['_id'],'sourceUuid':f'Compendium.multiverse-d616.powers.Item.{p["_id"]}',
      'originalSourceId':p.get('flags',{}).get('scene-packer',{}).get('sourceId',''),
      'name':p['name'],'powerSet':s.get('powerSet',''),'icon':p.get('img',''),
      'prerequisites':s.get('prerequisites',''),'action':s.get('action',''),'trigger':s.get('trigger',''),
      'duration':s.get('duration',''),'cost':s.get('cost',''),'range':s.get('range',''),
      'description':s.get('description',''),'effect':s.get('effect',''),
      'familyHeuristic':family(p),'genericMechanisms':mechanisms(p),
      'automationStatus':status,'automationEvidence':evidence,
      'sourceCodeReferences':reference_paths(p['name']),
      'dedicatedCodeCandidate':bool(reference_paths(p['name'])),
      'auditScope':'metadados + identificação de controladores; regras individuais requerem validação'} )

out=ROOT/'audit';out.mkdir(exist_ok=True)
(out/'native-power-inventory-v180.json').write_text(json.dumps({'version':'0.2.180','basis':'Source Powers compendium: packs/mmc-powers-v0186','total':398,'powers':rows},ensure_ascii=False,indent=2)+'\n')
with (out/'native-power-inventory-v180.csv').open('w',newline='',encoding='utf-8-sig') as f:
    fields=['powerId','sourceUuid','name','powerSet','icon','prerequisites','action','trigger','duration','cost','range','description','effect','familyHeuristic','genericMechanisms','automationStatus','automationEvidence','sourceCodeReferences','dedicatedCodeCandidate']
    w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader()
    for p in rows:w.writerow({**p,'genericMechanisms':' | '.join(p['genericMechanisms']),'sourceCodeReferences':' | '.join(p['sourceCodeReferences'])})

mismatches=[]
for p in rows:
    src=by_id[p['powerId']]
    for path,a,b in [('icon',p['icon'],src['img']),('effect',p['effect'],src['system'].get('effect',''))]:
        if a!=b:mismatches.append((p['name'],p['powerSet'],p['powerId'],path,a,b))
with (out/'native-power-catalog-differences-v180.csv').open('w',newline='',encoding='utf-8-sig') as f:
    w=csv.writer(f);w.writerow(['Poder','Power Set','ID','Campo','Compêndio real','Charactermancer powers.json']);w.writerows(mismatches)

counter=Counter(r['powerSet'] for r in rows)
statuses=Counter(r['automationStatus'] for r in rows)
references=Counter(bool(r['sourceCodeReferences']) for r in rows)
names=Counter(r['name'] for r in rows)
duplicates={n:c for n,c in names.items() if c>1}
report=f'''# Auditoria técnica inicial — Macros_D616 / v0.2.180

## Escopo e evidência

Fonte primária: **LevelDB real** `packs/mmc-powers-v0186/000002.log` da v0.2.178 (read-only), não apenas o JSON do Charactermancer. Conferidos {len(rows)} itens únicos de tipo `power` em {len(counter)} Power Sets. Não houve alterações em Power Items, seus IDs, imagens ou textos.

**Limite da cobertura:** localizar nomes exatos em código e identificar custo, ação, duração e componentes genéricos em metadados NÃO equivale a comprovar execução integral do efeito. Esta etapa é inventário e triagem estática, não validação em Foundry. Campos `familyHeuristic` e `genericMechanisms` são classificações de triagem, não interpretações definitivas da regra.

## Cobertura preliminar (não confundir com porcentagem automatizada)

| Estado | Quantidade | Interpretação |
|---|---:|---|
| Nativa validada em código | {statuses['nativa-validada']} | Energy Absorption: controlador nativo específico da v0.2.178 preservado |
| Dependente de configuração existente na Central | {statuses['central-dependente']} | Lightning Actions: suportado pelo mecanismo passivo da Central, **não** garantidamente nativo independente |
| Parcial / revisar | {statuses['parcial-revisar']} | Elemental Protection 1–4: subsistemas especializados identificados, ativação/ciclo completo a validar |
| Planejada | {statuses['planejada']} | Anger: custo e concentração genéricos, bônus e bloqueio ainda exigem controlador dedicado |
| Não verificada individualmente | {statuses['não-verificada']} | Precisam de investigação; NÃO significa que sejam manuais |

A busca de nomes exatos em scripts encontrou referências para **{references[True]} poderes** e nenhuma referência explícita para **{references[False]}**. São apenas **candidatos de investigação**: uma referência pode ser comentário, exemplo ou controle parcial; ausência de nome não significa ausência de comportamento genérico. Consulte a coluna `sourceCodeReferences` no inventário.

A cobertura funcional conclusiva de 398/398 não pode ser declarada sem inspeção por poder e testes no Foundry. Nenhuma automação nova de combate foi ativada nesta fase.

## Distribuição por Power Set

| Power Set | Poderes |
|---|---:|
'''
for name,count in sorted(counter.items(),key=lambda x:x[0].casefold()):report+=f'| {name} | {count} |\n'
report+=f'''| **TOTAL** | **{len(rows)}** |

## Nomes duplicados no catálogo

{len(duplicates)} nomes ocorrem em mais de um Power Set: {', '.join(f'{n} ({c})' for n,c in sorted(duplicates.items()))}. A chave do registro será ID de origem/UUID e Power Set + nome para casos de importação com novo ID; jamais nome isolado.

## Divergência entre fontes

Encontradas **{len(mismatches)} divergências** entre o LevelDB instalado e `apps/charactermancer/data/powers.json`: 4 caminhos de ícone e 4 textos de efeito. Detalhes em `native-power-catalog-differences-v180.csv`. No LevelDB, os 4 ícones de Animal Control usam caminho externo `Marvel%20Multiverse/...`, que pode não resolver em outras instalações; nesta fase NÃO serão alterados. Para as referências do Macros_D616 usamos estritamente os ícones originais do LevelDB.

## Anger — observações de regra e projeto

Fonte: **Anger** (Basic), ID `3BRcvFKqGlgbnabc`, custo `10 or more Focus`, pré-requisitos `Mighty 3, Rank 4`, ativação `Standard or reaction`, gatilho `O personagem é ferido por um ataque`, duração `Concentration`.

A cada **10 Focus efetivamente gastos**: **+15 ao bônus FIXO de dano de Melee**, **−2 em Logic** (repercutindo na defesa de Logic). Em Concentração, impede utilizar OUTROS poderes que exijam concentração.

O bônus de dano é um termo aditivo no cálculo pós-RD existente (`scripts/damage-calculation.js`), **não** é um incremento no Damage Multiplier. Por isso, não implementar Anger como simples alteração de `system.abilities.mle.damageMultiplier`. A política para reativação, escolha Standard/Reaction, simultaneidade e cancelamentos precisa ser coberta por testes antes de habilitar a rotina de dano.

## Viabilidade da arquitetura

- `Item.roll()` é usado tanto pelo HUD como pela ficha; um único despacho interno pode captar ambos sem scripts arbitrários.
- Foundry v14 suporta compêndio de tipo `Macro` com pastas de `Macro`. O compêndio conterá **referências inspecionáveis**, enquanto o despacho e as regras reutilizáveis ficam em ES modules auditáveis e versionados do sistema.
- Nenhuma macro de compêndio terá autorização para executar comandos com direitos do Mestre. Os scripts de referência só consultam metadados; não alteram Actors ou consomem recursos.
- O Motor, o HUD, a Central, Energy Absorption, a configuração de Lightning Actions e os seis compêndios originais permanecem inalterados.

## Próximas validações

1. Abrir `Macros_D616` no Foundry v14 e conferir sete macros nos 27 Power Sets, ícones e acesso de jogadores.
2. Verificar correspondência dos IDs em poderes importados para Actors, inclusive Tokens não vinculados e nomes repetidos.
3. Em próxima etapa, ligar `Item.roll()` ao dispatcher interno com idempotência e permissões e testar custo único.
4. Só após esse teste habilitar Anger com modificador aditivo isolado e Concentração exclusiva, garantindo rollback em falhas.
5. Catalogar as automações remanescentes por famílias, sem atribuir falsa cobertura a poderes manuais.
'''
(out/'native-power-audit-v180.md').write_text(report,encoding='utf-8')
print('audited',len(rows),'sets',len(counter),'statuses',dict(statuses),'mismatches',len(mismatches))
