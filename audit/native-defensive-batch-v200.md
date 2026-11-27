# Multiverse-D616 v0.2.200 — Lote defensivo e chat do Jogador

**Base estável:** v0.2.199, validada no Foundry pelo usuário. **Estado da v0.2.200:** experimental, aguardando validação com Mestre e Jogador.

## Cobertura honesta

- **27 poderes auditados:** 5 Tactics, 5 Super-Speed, 5 Healing, 1 Luck, 4 Ranged Weapons e 7 Martial Arts.
- **3 automações novas parciais:** Blur, Hit the Dirt, Scatter.
- **24 poderes examinados sem nova implementação neste lote**: permanecem sem registro caso não exista cobertura verificada; não foram criadas macros decorativas.
- **113 macros** em 27 Power Sets (110 antes desta versão).
- **398 poderes oficiais preservados**.

## Chat do Jogador

O Mestre continua usando a rolagem visual da v0.2.184. O Jogador agora recebe um pedido local de `ChatLog.scrollBottom` quando o evento `updateChatMessage` publica a resolução final `flags.multiverse-d616.combatChatResolution` com alvos. Atualizações intermediárias de dados, ataques ainda não resolvidos e mensagens comuns não provocam rolagem automática. A implementação cobre alterações de flags aninhadas e de propriedades pontilhadas. O componente visual nativo aguarda a atualização de layout antes de rolar o chat. **Não houve alterações em dano, RD nem transmissão de dados sensíveis.**

## Novas automações

1. **Blur (Super-Speed, parcial)** — custa 5 Focus; uma rodada de Trouble contra ataques direcionados; apagado no início do próximo turno/encerramento do combate. Rerolls são manuais. Restringido a combate ativo para duração confiável. Ação/Reação continua no rastreador já existente.
2. **Hit the Dirt (Tactics, parcial)** — custo de 5 Focus, Reação. Janela de seleção permite selecionar aliados que concordaram em cair; o GM aplica Caído via `toggleStatusEffect`. **Não há anulação automática do ataque**: o Narrador decide se o alvo deixa de ser elegível.
3. **Scatter (Tactics, parcial)** — custo de 10 Focus, Reação, até Rank aliados. O movimento de metade da Velocidade para longe é feito manualmente; após confirmação, GM aplica Caído aos escolhidos. Alcance da voz, consentimento e cancelamento de ataque são decisões narrativas.

Os dois Tactics usam exclusivamente o **protocolo atômico autenticado de v0.2.196**: pedido serializado no Actor-base, decisão do GM sobre o Actor efetivo do token, atualização única dos recursos e resposta confirmada. Sem macros executadas com privilégios de Mestre.

## Checklist no Foundry v14

1. Com Mestre e Jogador conectados, o Mestre confirma **DANO**, **1/2 DANO** e **CURA**. O chat do jogador deve ir ao resultado; uma rolagem de iniciativa ou mensagem comum não deve mover o chat deliberadamente aberto em outra posição.
2. Ativar **Blur** com 5 Focus em combate, atacar o personagem, conferir 1 Trouble e reroll manual. Avançar para seu próximo turno e conferir remoção do efeito.
3. Como Jogador, ativar **Hit the Dirt**, escolher aliados dispostos a cair; Mestre confirma e ambos visualizam Caído. Conferir um único custo de Focus e Reação.
4. Como Jogador, ativar **Scatter** com dois aliados (se Rank ≥2), mover cada um manualmente até metade da Velocidade, confirmar e conferir Caído. Tentar mais que Rank alvos e confirmar bloqueio sem gasto.
5. Regressão: Energy Absorption, Anger, Jinx You, Healing Hands (Mestre/Jogador), Edge/Trouble manuais, RD, veículos, Team Maneuvers.

## Testes

Executar `node --test tests/*.test.mjs`. Resultado local: **1.129 testes aprovados e zero falhas**. A validação presencial em dois clientes reais ainda é necessária. Não houve publicação no GitHub.
