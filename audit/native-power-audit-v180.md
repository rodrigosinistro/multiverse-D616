# Auditoria técnica inicial — Macros_D616 / v0.2.180

## Escopo e evidência

Fonte primária: **LevelDB real** `packs/mmc-powers-v0186/000002.log` da v0.2.178 (read-only), não apenas o JSON do Charactermancer. Conferidos 398 itens únicos de tipo `power` em 27 Power Sets. Não houve alterações em Power Items, seus IDs, imagens ou textos.

**Limite da cobertura:** localizar nomes exatos em código e identificar custo, ação, duração e componentes genéricos em metadados NÃO equivale a comprovar execução integral do efeito. Esta etapa é inventário e triagem estática, não validação em Foundry. Campos `familyHeuristic` e `genericMechanisms` são classificações de triagem, não interpretações definitivas da regra.

## Cobertura preliminar (não confundir com porcentagem automatizada)

| Estado | Quantidade | Interpretação |
|---|---:|---|
| Nativa validada em código | 1 | Energy Absorption: controlador nativo específico da v0.2.178 preservado |
| Dependente de configuração existente na Central | 1 | Lightning Actions: suportado pelo mecanismo passivo da Central, **não** garantidamente nativo independente |
| Parcial / revisar | 4 | Elemental Protection 1–4: subsistemas especializados identificados, ativação/ciclo completo a validar |
| Planejada | 1 | Anger: custo e concentração genéricos, bônus e bloqueio ainda exigem controlador dedicado |
| Não verificada individualmente | 391 | Precisam de investigação; NÃO significa que sejam manuais |

A busca de nomes exatos em scripts encontrou referências para **142 poderes** e nenhuma referência explícita para **256**. São apenas **candidatos de investigação**: uma referência pode ser comentário, exemplo ou controle parcial; ausência de nome não significa ausência de comportamento genérico. Consulte a coluna `sourceCodeReferences` no inventário.

A cobertura funcional conclusiva de 398/398 não pode ser declarada sem inspeção por poder e testes no Foundry. Nenhuma automação nova de combate foi ativada nesta fase.

## Distribuição por Power Set

| Power Set | Poderes |
|---|---:|
| Animal Control | 4 |
| Basic | 48 |
| Elemental Control | 18 |
| Healing | 7 |
| Illusion | 14 |
| Luck | 9 |
| Magic | 28 |
| Martial Arts | 20 |
| Melee Weapons | 9 |
| Narrative | 3 |
| Omniversal Travel | 20 |
| Phasing | 9 |
| Plasticity | 13 |
| Power Control | 13 |
| Ranged Weapons | 15 |
| Resize | 14 |
| Shield Bearer | 14 |
| Sixth Sense | 13 |
| Spider-Powers | 20 |
| Super-Speed | 10 |
| Super-Strength | 11 |
| Tactics | 11 |
| Telekinesis | 14 |
| Telepathy | 31 |
| Teleportation | 14 |
| Translation | 8 |
| Weather Control | 8 |
| **TOTAL** | **398** |

## Nomes duplicados no catálogo

10 nomes ocorrem em mais de um Power Set: Astral Form (2), Banging Heads (2), Brace for Impact (2), Crushing Grip (2), Do This All Day (2), Flare (2), Immovable (2), Jump 1 (2), Jump 2 (2), Jump 3 (2). A chave do registro será ID de origem/UUID e Power Set + nome para casos de importação com novo ID; jamais nome isolado.

## Divergência entre fontes

Encontradas **8 divergências** entre o LevelDB instalado e `apps/charactermancer/data/powers.json`: 4 caminhos de ícone e 4 textos de efeito. Detalhes em `native-power-catalog-differences-v180.csv`. No LevelDB, os 4 ícones de Animal Control usam caminho externo `Marvel%20Multiverse/...`, que pode não resolver em outras instalações; nesta fase NÃO serão alterados. Para as referências do Macros_D616 usamos estritamente os ícones originais do LevelDB.

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
