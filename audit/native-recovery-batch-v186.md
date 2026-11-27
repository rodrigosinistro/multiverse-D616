# Multiverse-D616 v0.2.186 — Recuperação nativa e referências passivas

## Base e escopo

Base completa **v0.2.185**, aprovada em Foundry VTT v14. Fonte da regra: compêndio oficial instalado `packs/mmc-powers-v0186/000002.log` (398 poderes em 27 Power Sets). Este lote não modifica os itens originais, README, regras gerais de ataque/dano/RD, HUD, concentração, Central nem o sistema de veículos. `Macros_D616` é uma biblioteca de referência com ícones originais e macros informativas, não scripts privilegiados executados pelo Mestre.

## Novas automações (3 poderes, 2 famílias)

| Poder oficial | Power Set | Regra do compêndio | Execução |
|---|---|---|---|
| Regain Focus | Martial Arts | Recupera Focus igual à Vigilance; Ação Standard; sem Focus de custo | Verifica que Focus não está cheio, recupera no Actor até `focus.max`, registra Standard pelo tracker e confirma no chat |
| Do This All Day | Martial Arts | Gasta **5 ou mais Focus**, recupera 2 pontos de Health por 1 Focus | Diálogo de Focus existente, limite por Rank, gasto único, cura até `health.max`, chat |
| Do This All Day | Shield Bearer | Mesma regra, com Power Set e ID distintos | Mesmo controlador centralizado, sem resolver pelo nome isolado |

Ambos Do This All Day reutilizam `mmPreSpendFocusForPowerUse` / `mmCommitFocusForPowerUse` existentes. Nunca descontar Focus pela segunda vez dentro da recuperação. A implementação registra uma única atualização de Health e não dispara cura recorrente. O fluxo de Regain Focus registra uma única atualização de Focus e nenhuma cobrança. Os poderes só funcionam pelo HUD/ficha, não pela macro do compêndio.

## Integrações somente por referência (3)

- `Reinforced Skeleton` (Basic): Active Effect do poder para RD Health 1, já interpretado pelo sistema.
- `Speed Run 1` e `Speed Run 2` (Super-Speed): Active Effects originais e `prepareD616Movement`; não multiplicar os níveis de velocidade fora de combate.

**Registro total:** 44 macros, 27 pastas, 398 poderes no catálogo oficial. Apenas as três recuperações são novas automações de funcionamento nesta versão. Referências não são reimplementações dos efeitos.

## Validação automatizada

`node --test tests/*.test.mjs` e teste dedicado de recuperação. Validar limites de Focus, cap de Health, cura por 5/10/15 Focus, duas variantes, Vigilance, recursos cheios, falha de atualização, identidade de Power Set/ID, preservação de Anger/Real Jinx/Energy Absorption, 27 pastas, ícones e motor de RD. O teste automatizado não substitui teste funcional Mestre/Jogador no aplicativo.

## Checklist no Foundry v14

1. Faça backup do mundo e instale o ZIP v0.2.186; confirme versão e 44 macros organizadas nas 27 pastas.
2. Crie um personagem com **Regain Focus**, reduza Focus e ative pelo HUD como Jogador. Esperado: ganho igual à Vigilance, limitado ao máximo, resumo no chat e Ação Padrão controlada pelo HUD.
3. Com Focus cheio, clique Regain Focus: deve exibir aviso sem gastar Ação ou Focus.
4. Teste **Do This All Day (Martial Arts)** com Health reduzido: selecione 5 Focus e confira +10 Health; repita em turno apropriado investindo 10 Focus para +20 Health (até o máximo). O gasto de Focus ocorre **uma vez**.
5. Repita com **Do This All Day (Shield Bearer)**. Confirme que a macro se resolve pelo Power Set correto.
6. Com Health cheio, o poder deve bloquear antes do diálogo/gasto. Com Focus insuficiente, o seletor já deve bloquear; com Rank menor, respeitar 5×Rank e o pré-requisito de criação.
7. Teste `Reinforced Skeleton` RD e `Speed Run 1/2` com os mecanismos preexistentes (sem bônus duplicados).
8. Regressão: Anger, Energy Absorption pelo PLAYER, Elemental Protection, Real Jinx, Lightning Actions configurado, chat com rolagem automática, Team Maneuvers e veículos.

**Somente considerar v0.2.186 estável após sua validação no Foundry.**
