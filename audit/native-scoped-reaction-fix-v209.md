# Multiverse-D616 v0.2.209 — Diagnóstico e correção de Reações extras

## Evidência fornecida

- Versão em ambas as janelas: **0.2.208**.
- Console do Jogador: três notificações **“Reação indisponível ou Reação extra restrita a outro Power Set. Nenhum Focus gasto.”**
- Console do Mestre: confirmação de dano **`MMDR: Zima -80`**. O ataque de Clobber e a confirmação de dano aparecem nos dois chats. Os arquivos não trazem uma exceção JavaScript associada diretamente ao dano desse ataque.
- Esses registros provam a recusa de solicitações de Reação, mas não revelam qual Item foi clicado em cada tentativa. A correção abaixo resolve uma falha reprodutível de alocação da v208; a confirmação do caso real depende do teste no Foundry.

## Defeito reproduzido na v0.2.208

Always Ready e Fast Hands adicionam cada um uma Reação restrita. A v208 consumia o saldo **geral antes da reserva restrita**. Isso gerava a seguinte sequência problemática:

1. Personagem com **Always Ready** ativa uma Reação de **Martial Arts**. A v208 gastava a Reação comum.
2. Ao tentar **Shield Deflection** em resposta a outro ataque, sobrava somente uma Reação exclusiva para Martial Arts.
3. O Mestre recusava corretamente o uso do bônus de Martial Arts para Shield Bearer, mas o recurso comum deveria ter sido preservado pelo passo 1.

## Correção

- Ao ativar uma Reação de Martial Arts, a reserva de **Always Ready** é usada **primeiro** se ainda disponível.
- Ao ativar uma Reação de Ranged Weapons, a reserva de **Fast Hands** é usada **primeiro** se ainda disponível.
- A Reação comum aceita qualquer poder de Reação e só é usada quando o poder não possui um extra elegível restante.
- O histórico **`reactionSpendOrder`** registra, em ordem, cada gasto (`general`, `Martial Arts`, `Ranged Weapons`) no Combatant. Estornos e correções manuais removem o último gasto, sem devolver uma reserva errada.
- Gastos antigos da v208 são reconhecidos sem apagar o saldo existente. O histórico é renovado ao iniciar o próximo turno.
- `consumeReaction()` sem Item continua gastando somente a Reação geral; não pode contornar as restrições. O GM autentica e decide cada gasto vindo do jogador, pela fila serializada.
- A mensagem ao jogador passa a mostrar o motivo específico verificado pelo seu cliente; se o cliente julgá-lo elegível e o Mestre não confirmar, mostra falha de sincronização em vez de atribuir indevidamente a uma restrição.

## Checklist Mestre e Jogador

1. Personagem com **Always Ready**: use uma Reação de **Martial Arts**; depois use **Shield Deflection**. Ambas devem funcionar, cada uma consumindo um recurso diferente.
2. Personagem com **Fast Hands**: use **Point-Blank Parry** e depois uma Reação **Basic/Shield Bearer**. Ambas devem funcionar.
3. Personagem com ambos: 3 Reações (1 geral + 1 Martial Arts + 1 Ranged Weapons), respeitando o uso único por família. Testar em ordem inversa.
4. Com nenhuma Reação geral disponível, tentar Shield Deflection deve exibir mensagem específica de restrição; não consumir Focus.
5. Testar cancelamento/erro na publicação do chat: o recurso previamente reservado deve ser devolvido, seja ele geral ou restrito.
6. Confirmar renovação no próximo turno e testes como PLAYER com Mestre conectado.
7. Regressão: Hurled Shield Block continua aplicando a RD uma vez e removendo após DANO/1/2 DANO; Edge/Trouble continuam com rerolls manuais.

## Integridade e escopo

- **1.193 testes Node** aprovados, zero falhas, incluindo os casos adicionais de ordem, limites, migração e estorno.
- Mantidos o README, os seis compêndios oficiais e o compêndio `Macros_D616` da v208, byte a byte; **149 macros** catalogadas, 398 poderes oficiais.
- Mantido o protocolo atômico Mestre/Jogador da v196.
- Sem publicação no GitHub.
- **Experimental:** a aprovação depende de validação com os clientes Foundry reais; não há alegação de execução visual do Foundry no ambiente de testes.
