# Multiverse-D616 v0.2.212 — Counterstrike Technique: correção de identificação de Item

## Falha reproduzida

**Sintoma em Foundry VTT v14:** Após confirmar o dano original, ativar Counterstrike Technique no HUD de Zima como PLAYER mostrava “O Item solicitado não é Counterstrike Technique oficial.”, repetido no console do Mestre. O card do contra-ataque nunca era criado.

**Causa:** `isOfficialCounterstrike()` comparava o ID ao final de qualquer `item.uuid` (por exemplo `Actor.def.Item.abcdefghijklmnop`) ao ID da origem oficial `Z2bM6AFg0F0jtzm3`. Os IDs de Items embutidos no Actor/Token normalmente são próprios da cópia e **não** iguais aos do compêndio. Os testes anteriores não modelavam a presença de `uuid` no Item da ficha, permitindo que a falha passasse despercebida.

## Correção

- A identificação do poder é validada pelo registro interno de automações `Macros_D616` (nome **Counterstrike Technique**, Power Set **Martial Arts**, handler `counterstrike-technique`, identidade conhecida `Z2bM6AFg0F0jtzm3`).
- `Actor.<id>.Item.<local id>` e UUIDs de Items dentro de Actors sintéticos são aceitos; **não são tratados** como IDs de compêndio.
- Proveniência explicitamente declarada como `Compendium...Item.<id>` continua sendo checada, recusando quando corresponde a **outro** ID. Metadado nativo `nativeAutomation.powerId` divergente também é recusado.
- Quando os IDs locais do Item diferem entre PLAYER e Mestre, o Mestre resolve um único poder correspondente pertencente ao Actor real do token. Ainda exige OWNER na solicitação do Actor mundial e no Actor do token, combate iniciado, Attack Stance ativo, recibo confirmado de dano Melee real, disponibilidade de 5 Focus e Reação.
- Não alterados: fórmula de dano de Counterstrike, RD, botão DANO exclusivo do Mestre, recibo contra duplicação, estornos, controles de Reação e protocolo atômico v196/v210.

## Validação automatizada

- `node --test tests/*.test.mjs` — **1.215 testes aprovados, zero falhas**, com testes adicionais para Item embutido em Actor, Actor sintético, solicitação PLAYER→GM com IDs locais diferentes e rejeição de proveniência falsa.
- README e os seis compêndios oficiais continuam idênticos em bytes à v0.2.211. Biblioteca `Macros_D616` preservada com **150** entradas.
- Requer validação prática com Mestre e Jogador conectados; os testes automatizados não substituem uma sessão Foundry real.

## Teste sugerido no Foundry

1. Inicie uma rodada limpa, ative Attack Stance em Zima e selecione seu token.
2. Com Orgulhoso Sentinel, acerte ataque Melee contra Zima e clique **DANO** no card original. Certifique-se de que o dano foi aplicado.
3. No PLAYER de Zima, acione Counterstrike Technique no HUD.
4. Verifique o desconto único de 5 Focus e uma Reação e o novo card no chat do Mestre com **DANO** direcionado a Orgulhoso Sentinel.
5. Antes de clicar DANO, confirme que o Health do Sentinel está inalterado. Depois do clique, confira o dano calculado; um segundo clique não deve aplicar de novo.
6. Teste novamente o mesmo gatilho (deve recusar sem novo gasto) e um ataque Fantástico (não duplica dano normal na devolução).

Nenhuma publicação no GitHub.
