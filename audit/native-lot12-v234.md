# Lote 12 — auditoria acelerada de 20 poderes (v0.2.234)

**Base:** v0.2.233, validada no Foundry VTT v14. **Método:** cruzamento da definição dos 398 poderes com rotinas específicas, condições/rolagens compartilhadas e teste de regressão. **Resultado:** 20 poderes auditados = **3 com integração nova**, **9 com mecanismo especializado identificado**, **5 com cobertura parcial a testar**, **3 pendentes de integração**. A correção do alcance de Never Surrender para **Reach** é independente desses vinte.

> Auditoria estática com testes Node; a cobertura funcional completa de todos os poderes não é inferida apenas de registros no código. O teste final em duas sessões Foundry (Mestre/Jogador) permanece necessário.

## Relação dos vinte poderes

| Poder | Power Set | Situação v234 | Evidência, mecanismo ou lacuna |
|---|---|---|---|
| Body Sphere | Plasticity | **Integração nova; teste funcional no Foundry pendente** | `scripts/native-priority-lot12.mjs`: proteção de aliados com RD Health 3, movimentação solidária, modo de agarrar com Agility e condições. Mestre aprova; concentração controla a limpeza. |
| Probability Manipulation Hex | Magic | **Integração nova; teste funcional no Foundry pendente** | `native-priority-lot12.mjs` + `condition-edge.mjs`: efeito vinculado ao aliado, substituição de Trouble líquido por Edge durante rolagem elegível, alcance e expiração verificados. |
| Bounce Back | Plasticity | **Integração parcial nova** | `native-priority-lot12.mjs`: remove Caído e informa a anulação de dano da queda atual. Ligação automática ao recibo de queda e salto opcional dependem do Mestre. |
| Defense Stance | Martial Arts | **Mecanismo existente identificado** | `native-power-martial-stances.mjs`: Concentração e cancelamento por perda real de Health; confirmar no Foundry. |
| Attack Stance | Martial Arts | **Mecanismo existente identificado** | `native-power-martial-stances.mjs`: ataque com bônus de Melee ligado à Concentração. |
| Counterstrike Technique | Martial Arts | **Mecanismo existente identificado** | `native-power-counterstrike.mjs`: referencia ataque corpo a corpo e Attack Stance, controla reação e card específico. |
| Unflappable Poise | Martial Arts | **Mecanismo existente identificado** | `native-power-martial-stances.mjs`, `condition-edge.mjs`: Trouble/Edge contra alvo e Defense Stance. |
| Spider-Dodge | Spider-Powers | **Mecanismo existente identificado** | `native-power-spider-defenses.mjs`: reação vinculada ao ataque original. |
| Shield Deflection | Shield Bearer | **Mecanismo existente identificado** | `native-power-reactive-guards.mjs`: reação e Trouble na defesa. |
| Catch Bullets | Super-Speed | **Mecanismo existente identificado** | `native-priority-lot2.mjs`, `damage-reduction-helper.js`: reação contra projétil físico e cancelamento via Mestre. |
| Grappling Technique | Martial Arts | **Mecanismo existente identificado** | `power-conditions.mjs`: aplica Agarrado e Imobilizado no Fantástico; elegibilidade narrada pelo Mestre. |
| Mists of Munnopor | Magic | **Mecanismo existente identificado** | `native-priority-lot6.mjs`, `movement-calculator.mjs`: névoa, visibilidade, bloqueios de voo/teias e Concentração. |
| Flexible Bones 1 | Plasticity | **Cobertura parcial; teste de mesa** | Registro de poder em `native-power-registry-data.mjs`; comprovar as consequências passivas de Flexibilidade. |
| Flexible Bones 2 | Plasticity | **Cobertura parcial; teste de mesa** | `equipment-permanent-effects.mjs`: efeito passivo; revisar alcance da regra e mistura com outras reduções. |
| Teleport 1 | Teleportation | **Cobertura parcial; teste de mesa** | Efeito visual em `power-vfx.mjs` e movimento do sistema; verificar usos fracionados e ação/custo no HUD. |
| Teleport 2 | Teleportation | **Cobertura parcial; teste de mesa** | Efeito visual em `power-vfx.mjs`, restante do deslocamento e custo exigem teste funcional. |
| Blink | Teleportation | **Cobertura parcial; teste de mesa** | Mapeamento de VFX em `power-vfx.mjs` e tratamento especial no tracker; validar o efeito completo da regra. |
| Reverse-Momentum Throw | Martial Arts | **Pendente** | Reação deve se vincular a ataque Melee anterior que errou e ao cálculo hipotético de dano. Evitar atalho que consome reação por ataque errado. |
| Blink Defense | Teleportation | **Pendente** | Reação associada a projétil, rolagem de Ego com Edge e redirecionamento no Fantástico, com recibo autenticado. |
| Molecular Destabilization | Super-Speed | **Pendente** | Objeto detonado, explosão multi-alvo e dano que ignora RD no Fantástico, com confirmação por alvo no Mestre. |

## Correção adicional solicitada: Never Surrender — Reach

- **Alcance anterior fixo:** 1 espaço.
- **Alcance novo:** `system.reach` efetivo do personagem; calculado novamente na seleção e na autorização, permitindo Reach ampliado por tamanho/efeitos.
- **Duas fontes alinhadas:** Item Never Surrender no LevelDB do compêndio Powers e `apps/charactermancer/data/powers.json`, ambos com alcance `Reach`.
- **Compatibilidade:** Let’s Go continua com alcance de toque; Mental Shelter mantém 5 espaços por Rank. Outros poderes do compêndio permanecem iguais.

## Testes e limites

- **1.354 testes automatizados passaram, 0 falhas** na execução com bootstrap de hooks Foundry no Node.
- Cenários: Reach ampliado, seleção sem duplicatas e antes dos custos, autorização Mestre, concentração válida, RD, movimento co-localizado, token liberado após perda de concentração, efeito de Probability Hex somente com Trouble líquido, Bounce Back removendo Caído, rolagem de Agility/condições de Body Sphere.
- A ação do Mestre e a seleção de alvos não são substituídas por decisões automáticas quando a regra exige arbitragem.
- **Três poderes pendentes acima** exigem um mecanismo unificado e autenticado de reações e recibos, antes de declarar a automação completa.
- **Nunca tratar 20 analisados como 20 novos poderes totalmente automatizados.**

## Próximo ciclo sugerido

Auditar mais 20 poderes por mecanismo, começando por Reverse-Momentum Throw, Blink Defense e Molecular Destabilization, e priorizar uma biblioteca de vínculo seguro de reações ao ataque original para atender vários poderes.
