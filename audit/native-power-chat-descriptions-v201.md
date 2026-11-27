# v0.2.201 — Descrições dos poderes no Chat das automações nativas

## Diagnóstico

A chamada `MarvelMultiverseItem.roll()` encaminha os poderes nativos de suporte para `dispatchNativeSupportPower` **antes** do trecho que publica o card tradicional com `system.description` e `system.effect`. Em consequência, Scatter e os demais poderes dessa família mostravam somente alvos e gastos de Focus, apesar de executarem corretamente suas regras.

## Ajuste

- Adicionado `scripts/native-power-chat.mjs`, com `nativePowerDescriptionHtml` e `nativePowerResultMessage`.
- As três mensagens produzidas pelo controlador de suporte (resultado normal, efeitos de Luck com Concentração e falha de toque de Jinx You) agora contêm a **descrição original**, o **efeito original** e campos Ação / Duração / Custo / Gatilho / Alcance quando disponíveis.
- Os resultados da automação e Focus gasto continuam abaixo da descrição, no mesmo card, com marcação de tipo `power:` e sem execução duplicada de regras.
- O componente de metadados usa a classe `mcpd-card`, já existente no sistema, evitando adição de CSS ou inserção redundante pelo `chat-power-details.js`.
- Os itens são obtidos do Actor efetivo, após a validação de Mestre; o pacote atômico não transporta HTML ou fórmulas arbitrárias.

## Escopo

A correção abrange os poderes do controlador compartilhado: Healing Hands, Soothing Touch, Inspiration, Battle Plan, Keep Moving, On Your Feet, Rally on Me, Hit the Dirt, Scatter, Lucky You, Wish You Luck, Lucky Us, Evil Eye, Jinx You, Jinx You All, Focus Fire e Operations Center.

## Validação visual no Foundry v14

1. Com Mestre e Jogador, ative Scatter com aliados selecionados. Deve haver um **único card** com descrição e efeito oficiais, Ação/ Duração/ Custo e, abaixo, nomes dos aliados Caídos e Focus gasto.
2. Ative Healing Hands ou Soothing Touch com alvo válido; confirme descrição e efeito no chat de ambos os clientes e gasto único.
3. Ative Lucky You / Evil Eye; confirme o texto da regra, o resumo de Edge/Trouble e a manutenção da Concentração.
4. Em Jinx You, erre um teste Melee e confirme a descrição e que não foi criado Trouble.
5. Confira Jinx You bem-sucedido, Energy Absorption, o chat de dano com rolagem automática do jogador e Edge/Trouble manuais. Esses mecanismos não foram modificados.

**Status:** experimental até teste visual com dois clientes reais. Base estável v0.2.200. Não publicar no GitHub.
