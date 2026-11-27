# Multiverse-D616 v0.2.210 — Auditoria de erro de Reações em PLAYER

## Reprodução a partir dos consoles reais (21/11/2026)

O `Console Completo Jogador(20261121-001233).txt` contém:

- `Não foi possível confirmar a Reação com o Mestre. Confira o estado do turno. Nenhum Focus gasto.`
- `A Reação extra de Always Ready já foi usada; a Reação comum também está esgotada. Nenhum Focus gasto.`
- `A Reação extra de Fast Hands já foi usada; a Reação comum também está esgotada. Nenhum Focus gasto.`

No `turn-tracker.mjs` v209, o GM respondia o `turnTrackerRequest` com um `turnTrackerResult` cujo `userId` tinha o ID do **jogador**. O `handleSocket` invocava `authorizedTurnSocketSender`, que comparava `payload.userId` ao ID **autenticado de quem emitiu o socket** (GM), e portanto descartava a resposta. O GM podia já ter registrado o gasto; o jogador esperava 5s e via erro. Novos cliques consumiam/disputavam o saldo já alterado.

## Correção

- Novo `scripts/combat/turn-tracker-result-protocol.mjs` separa remetente (`userId` = GM) e destinatário (`recipientUserId` = jogador).
- Os resultados são aceitos somente se a identidade transmitida bater com o remetente autenticado pelo Foundry, o remetente for GM, o destinatário for o cliente atual e `requestId` corresponder à requisição em aberto.
- Respostas negativas também chegam corretamente e **não** são confundidas com sucessos.
- A validação de permissões `canControl`, a serialização `serializeSpend`, a lógica de Reações extras e o motor de dano não são alterados.
- O resultado por socket **não** autoriza qualquer mudança de estado do cliente ou acesso GM; ele apenas finaliza a `Promise` do cliente que já enviou uma solicitação ao Mestre.

## Counterstrike Technique — esclarecimento (sem nova automação)

A regra oficial requer Attack Stance ativo e ataque corpo a corpo que efetivamente cause dano. O Mestre confirma DANO, calcula RD, e se a vítima sofreu dano ela pode gastar 5 Focus e uma Reação. Metade do **dano normal do atacante** retorna ao próprio atacante, com a RD que esse atacante tiver aplicada antes da divisão e arredondamento para cima. A FAQ da Marvel (27/03/2025, página 4) diz expressamente que RD pode impedir o gatilho, e que não se podem usar múltiplas Reações para um único gatilho.

**Automação v210:** Counterstrike Technique continua **sem refletir dano automaticamente**; o Mestre executa essa parte manualmente. Não confundir efeito descrito no chat com aplicação automática.

## Checklist no Foundry v14

1. Mestre e PLAYER conectados, personagem com Always Ready, Fast Hands, um poder de Reação de cada Power Set.
2. Rodada renovada. Usar Reação de Artes Marciais e verificar que o jogador recebe ACK sem timeout. Não repetir clique.
3. Usar Reação de Armas à Distância e confirmar ACK e saldo restante.
4. Usar Reação de outra família com saldo comum; deve aceitar.
5. Tentar quarta Reação: deve recusar **imediatamente**, sem descontar Focus, com mensagem verdadeira.
6. Testar falha de Reação com saldo esgotado e confirmar que PLAYER não exibe «Não foi possível confirmar ...» quando a resposta negativa do GM foi recebida.
7. Testar Counterstrike Technique como Reação após confirmação de dano corpo a corpo com Attack Stance ativo; o dano refletido continua manual.
8. Regressão Hurled Shield Block, Jinx You, buffs de concentração, Edge/Trouble manuais.

O README e os seis compêndios oficiais devem permanecer idênticos à v209. Não publicar no GitHub. Versão experimental até validação real.
