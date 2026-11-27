# v0.2.208 — Auditoria de 27 poderes e Reações extras restritas

## Base e objetivo

Base de desenvolvimento: **v0.2.207 aprovada pelo usuário no Foundry**. Inventário de 398 poderes oficiais/27 Power Sets, lido do arquivo de auditoria de origem e cruzado com as 149 entradas do `Macros_D616` gerado novamente do LevelDB. **Nenhuma mudança nos seis compêndios oficiais ou em README.md**. A v208 requer teste prático com Mestre + Jogador.

## Novas automações reais (2)

- **Always Ready — Martial Arts:** 1 Reação adicional a cada rodada, exclusivamente para ativar poderes de Martial Arts cuja ação seja Reaction. Não libera outras Reações, nem a versão de Brace for Impact de Shield Bearer.
- **Fast Hands — Ranged Weapons:** 1 Reação adicional por rodada, exclusivamente para poderes Reaction de Ranged Weapons. Não libera Artes Marciais, Shield Bearer ou recursos genéricos.
- **Cumulatividade legítima:** personagem com ambas tem 1 Reação base + 1 restrita Martial Arts + 1 restrita Ranged Weapons. Com Combat Reflexes, 2 gerais + 2 restritas; outras extras configuradas na Central continuam gerais.
- **Ordem e estado:** o rastreador utiliza primeiro o saldo geral e só depois gasta um slot restrito. Cada Power Set só pode consumir seu bônus uma vez por turno de personagem. O histórico das categorias usadas é guardado no mesmo flag do Combatant, serializado pela fila já existente, zerado no início do turno/rodada bônus. A remoção/reembolso do último gasto atualiza o histórico.
- **Permissão:** Mestre resolve Item real no Actor de combate; requisição de player só transmite o ID do Item, nunca concede um Power Set. A chamada genérica de `consumeReaction` e o clique simples no indicador não podem gastar uma Reação extra restrita. As chamadas de Power/Reaction exigem ACK do Mestre antes do card.
- **Focus protegido:** para as Reações de rolagem genérica de personagens com estes passivos, o sistema reserva o recurso com o Mestre antes de deduzir Focus; se a reserva falhar, não gasta. Falhas durante a ativação tentam estorno da Reação já reservada. O fluxo de HSB e as Reações instantâneas já nativas permanecem separados.

## Escopo do lote

Foram reavaliados **27 poderes**: Martial Arts (8), Ranged Weapons (4), Melee Weapons (3), Sixth Sense (7), Super-Speed (2), Basic (2), Tactics (1). **Duas** novas automações; os outros **25** permanecem sem nova automação nesta versão. O inventário não os rotula falsamente como completos.

## Cobertura geral

| Situação | Quantidade |
|---|---:|
| native-active | 14 |
| native-partial | 42 |
| reference-existing | 91 |
| requires-configuration | 2 |
| not-registered | 249 |
| **TOTAL** | **398** |

## Teste prático no Foundry

1. Personagem com **Always Ready**, 1 Reação base e Martial Arts **Brace for Impact**: gastar a geral com outro poder; usar Brace for Impact deve gastar a extra. Tentar Shield Deflection em seguida: deve falhar sem consumir Focus.
2. Personagem com **Fast Hands**, 1 Reação geral e **Point-Blank Parry**: gastar a geral; realizar Point-Blank Parry deve ser permitido com seu Focus normal. Segunda Reação Ranged Weapons na mesma rodada: recusada.
3. Personagem com **ambos**: observar 3 Reações, sendo duas restritas. Usar primeiro uma Martial Arts Reaction e depois outra Martial Arts não deve permitir gastar slot de Ranged Weapons. Usar Ranged Weapons Reaction deve funcionar uma vez.
4. **Reiniciar turno** e confirmar renovação dos slots de ambos; testar com **Combat Reflexes** para validar 2 gerais +2 restritas. Ativar Reações como PLAYER e observar a sincronização do estado no Mestre.
5. **Regressão:** Hurled Shield Block protege uma vez, remove a RD e não altera o Focus do usuário em caso de recusa; testar Slow-Motion Dodge, Healing Hands e Jinx You.

## Limites

O motor não identifica se o ataque realmente acionou um gatilho narrativo de uma Reação; isso continua com o Mestre. O registro de Reação adicional é funcional, mas não automatiza os efeitos dos outros 25 poderes auditados. A confirmação automatizada não substitui teste no Foundry com múltiplos clientes.
