# Multiverse-D616 v0.2.190 — Auditoria de 28 poderes e validação

**Base estável:** v0.2.189, aprovada em Foundry v14. **v0.2.190 experimental até validação no mundo.**

## Inventário e cobertura

A fonte é o compêndio real `packs/mmc-powers-v0186` (398 poderes; 27 Power Sets), não uma lista inferida de nomes. O inventário completo deste lote está em [`native-support-batch-v190.csv`](native-support-batch-v190.csv), incluindo IDs e ícones originais.

Foram auditados **28 poderes**: Healing (7), Tactics (11), Magic (4), Basic (1), Luck (1), Shield Bearer (1), Elemental Control (2), Super-Strength (1).

| Estado | Quantidade | Poderes |
| --- | ---: | --- |
| Nova automação completa | 3 | Healing Hands, Soothing Touch, Lucky Me |
| Nova automação parcial | 6 | Keep Moving, On Your Feet, Rally on Me, Inspiration, Battle Plan, Shield Wall |
| Referência a controlador existente | 3 | Elemental Blast, Bolts of Balthakk, Smash |
| Referência parcial existente | 1 | Supernova (bônus de Focus existente; área/meio dano exige julgamento) |
| Manual ou automação específica ainda não verificada | 15 | Demais entradas do CSV — não contadas como concluídas |

O `Macros_D616` passa de **53 para 66 referências** nas **27 pastas**. Dessas 13 adições, **9** implementam comportamento novo ou ampliado (nem todas completas) e **4** apenas identificam recursos do motor existente. Não contar os 66 como 66 poderes integralmente automatizados.

## Regras efetivamente implementadas

- **Healing Hands (Healing):** toque, gasto variável mínimo de 10 Focus, ganho de Health do alvo igual ao gasto, máximo respeitado. Rank limita gasto a 5×Rank; custo descontado uma vez do lançador.
- **Soothing Touch (Healing):** mesmas validações, mas ganho no Focus do alvo. Não cria Focus acima do máximo.
- **Keep Moving (Tactics):** Reação, retira `mmrpg.stunned` ou `mmrpg.demoralized` do aliado selecionado, preservando os demais efeitos. Se o alvo ainda estiver com Focus zero, a sincronização de condições poderá reaplicar Desmoralizado após futuras alterações: exige arbitragem do Mestre.
- **On Your Feet (Tactics):** Reação, 5 Focus; remove `mmrpg.prone` dos aliados marcados capazes de levantar, preservando os incapacitados. Alcance da voz não é medido automaticamente.
- **Rally on Me (Tactics):** Ação Padrão, 10 Focus e uma vez por combate; até Vigilance aliados; após o movimento feito manualmente, somente os já próximos do lançador recuperam Focus = 5×Rank, limitado ao máximo. Movimento de meia velocidade, voz e aliados aptos dependem do Mestre.
- **Inspiration (Basic):** Ação Padrão, sem Focus; um aliado marcado recebe um Edge em testes até o início do próximo turno do lançador. O efeito expira pelo combate, sem lançar dado automaticamente.
- **Battle Plan (Tactics):** Ação Padrão, 10 Focus; até Vigilance aliados marcados recebem o mesmo Edge temporário até o início do próximo turno do lançador. Requisitos de audição confirmados com o Mestre.
- **Lucky Me (Luck):** concede Edge para todos os testes enquanto o personagem mantém a sua Concentração de Lucky Me. O Focus por turno e a limpeza da Concentração continuam sob o motor já existente.
- **Shield Wall (Shield Bearer):** concede Trouble em ataques direcionados ao portador enquanto a Concentração estiver ativa. Um deslocamento registrado do token encerra apenas esta Concentração. Deslocamento involuntário e uso de uma Ação de Movimento sem mover o token exigem adjudicação do Mestre.

## Segurança e manutenção

- O fluxo do HUD/ficha usa `Item.roll()` e roteamento por Power Set + ID oficial; macros do compêndio são referências inertes, nunca código arbitrário executado como Mestre.
- Healing/Tactics com alteração em alvos usam um controlador compartilhado e **transação autorizada pelo Mestre**. Jogadores apresentam o pedido com uma atualização do próprio Actor; `updateActor` e `updateToken` de delta transportam o `userId` autenticado. O Mestre valida a propriedade do personagem, o poder oficial, Focus, Rank, combate e alvos, antes de qualquer alteração de recursos de terceiros.
- Se houver falha antes de alterar um alvo, o gasto de Focus é estornado; se algum alvo já foi alterado, não se concede benefício gratuito. Ações/Reações seguem o rastreador existente quando habilitado.
- Confirmação narrativa de alcance da voz/consentimento continua **manual**; esta entrega não inventa sensor de audição ou movimentação automática.
- Não foram modificados os cálculos globais de dano, Redução de Dano, multiplicadores, Reação/Energy Absorption ou o esquema de itens. Nenhum Edge/Trouble executa reroll automaticamente.
- `README.md`, os **seis compêndios originais** e suas entradas (398 poderes) devem permanecer idênticos à v0.2.189. Apenas `Macros_D616` é reconstruído.

## Checklist no Foundry v14

1. Faça backup do mundo. Instale o ZIP completo, recarregue as janelas Mestre e Jogador, confirme a versão **0.2.190** e 66 macros em 27 pastas.
2. **Healing Hands:** dois personagens adjacentes, um com Health abaixo do máximo; marque um alvo e gaste 10, depois 15 Focus. Confira gasto único, restauração do alvo e limite do Health. Tente longe, sem Focus e com Health cheio: não devem ocorrer mudanças.
3. **Soothing Touch:** repita para Focus. Teste no Mestre e em um PLAYER que é DONO do lançador, mas não é DONO do alvo. O Mestre precisa estar conectado. Refaça com um token não vinculado.
4. **Keep Moving:** marque um aliado Atordoado, use o poder e confira que somente Atordoado termina. Repita com Desmoralizado e tenha atenção à reposição automática enquanto o Focus continuar zero.
5. **On Your Feet:** marque dois aliados Caídos. Confirme que os elegíveis se levantam; alguém Incapacitado não deve ser levantado automaticamente. Gasta 5 Focus e Reação uma vez.
6. **Rally on Me:** em combate, mova manualmente o grupo até o lançador, marque os aliados ao alcance e ative. Recebem Focus = 5×Rank com teto; segundo uso no mesmo combate deve falhar. Na batalha seguinte, o uso volta a ser permitido.
7. **Inspiration/Battle Plan:** marque um (ou vários, até Vigilance) aliados, ative e confira no card do teste a fonte de Edge. **Clique manualmente no EDGE do dado escolhido**. Avance até o início do próximo turno do lançador: o bônus deve desaparecer.
8. **Lucky Me:** concentre no poder, faça um teste e confira Edge manual. Encerre a Concentração e confira a remoção. Observe manutenção normal de Focus em turnos seguintes.
9. **Shield Wall:** concentre, receba um ataque direcionado e confira Trouble manual. Mova o token por uma ação de movimento; sua Concentração deve terminar. Deslocamentos forçados são caso de revisão do Mestre.
10. **Regressão:** Anger, Energy Absorption com PLAYER, Elemental Protection, Defense Stance com dano real, Edge/Trouble manual, Focused Strike/Fury, Regain Focus, Do This All Day, RD/Health/Focus, multialvos, veículos e Team Maneuvers.
11. Confira os consoles de Jogador e Mestre. A suíte offline não substitui o teste dentro do Foundry v14.

**Testes offline:** `node --test tests/*.test.mjs` — 1.077 aprovados, zero falhas; inclui 15 novos testes do lote e regressão anterior.

**Arquivos funcionais alterados:** `multiverse-d616.mjs`, `scripts/condition-edge.mjs`, `scripts/native-power-automations.mjs`; **novos** `scripts/native-power-support.mjs`, `scripts/native-power-guarded-passives.mjs`; registro e Macro Pack gerados, testes, `system.json`, `CHANGELOG.md`, inventário e checklist. Não publicar no GitHub sem pedido expresso.
