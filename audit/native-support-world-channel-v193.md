# Multiverse-D616 v0.2.193 — validação do canal Mestre/Jogador

## Falha registrada

Os consoles da v0.2.192 registraram no Mestre `native-power-support.mjs:70`:
`Selecione o token do personagem na cena dos alvos.` A notificação
`Não foi possível aplicar a automação` apareceu no cliente do jogador.

A causa provável foi a associação instável de uma atualização de flags no
Actor sintético de token não vinculado, recebida de maneira diferente por
Mestre e Jogador. A v0.2.192 corrigia a escolha do Item no servidor, mas não
estabilizava o documento usado para transportar a solicitação e o retorno.

## Correção pontual

- Enviar **pedido e confirmação pelo Actor-base (mundo)**, identificado por
  `TokenDocument.baseActor` / `actorId`, e nunca por `ActorDelta`.
- Conferir no Mestre a identidade do Actor-base que sofreu a atualização
  autenticada pelo Foundry (`updateActor`, `userId`), sua propriedade DONO,
  a propriedade do Actor efetivo do token e a correspondência `actorId`.
- Usar o Actor efetivo do Token e o Item oficial por ID para aplicar custos,
  Focus, Health ou Edge exatamente uma vez.
- Preservar a seleção da v0.2.191 e o cancelamento sem gasto.
- Informar no console do Mestre metadados mínimos do canal quando uma
  solicitação for recusada, facilitando futuros diagnósticos.
- Não criar privilégios de Mestre nem executar macros arbitrárias.

## Teste manual obrigatório (Foundry v14)

1. Instale a v0.2.193 no Foundry e recarregue as sessões **Mestre e Jogador**.
2. Tenha um personagem do Jogador com permissão DONO e seu token em cena;
   repita o teste com token vinculado e não vinculado.
3. Em **Healing Hands**, use um aliado adjacente que tenha Health abaixo do
   máximo. Confirme abertura da janela e escolha do aliado. Verifique que o
   Focus do lançador foi descontado uma vez e a recuperação afetou somente o
   alvo correto.
4. Em **Soothing Touch**, use um aliado adjacente com Focus abaixo do máximo;
   repita a validação de recursos e do retorno no chat/HUD.
5. Em combate ativo, repita com **Inspiration**, **Battle Plan** e
   **Rally on Me**, verificando efeitos nos alvos, expiração e limite de uso.
6. Cancele uma seleção e confirme que não houve custo nem efeito.
7. Mantenha o Mestre conectado para testes de atualização de outros personagens.
8. Se falhar, confira o console do Mestre por `[D616] Pedido nativo de suporte`:
   agora ele apresenta `channelActorId`, `channelIsToken`, `sourceTokenId`,
   `sceneId` e `tokenActorId`, além da razão da recusa.

## Integridade e regressão

- **1.089 testes automatizados** passaram sem falhas (Node.js).
- `README.md` e sete compêndios preservados byte a byte.
- Nenhuma alteração em regras de cura/recuperação, rolagem, Focus, dano, RD,
  Edge/Trouble manual, HUD, Veículos, Team Maneuvers ou Central.
- Testes automatizados não substituem a validação com dois clientes reais.
- A v0.2.189 continua a última versão estável validada pelo usuário até
  aprovação posterior.
