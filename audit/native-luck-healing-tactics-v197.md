# Multiverse-D616 v0.2.197 — Luck / Healing / Tactics

**Base:** v0.2.196 validada em Foundry v14, Mestre e Jogador. **Entrega:** v0.2.197 experimental.

## Resultado da auditoria (27 poderes)

| Categoria | Quantidade |
|---|---:|
| Auditados neste lote | 27 |
| Automações parciais **novas e funcionais** | 8 |
| Macros catalogadas no sistema completo | 74 |
| Poderes oficiais preservados | 398 |
| Pastas Power Set | 27 |

Os números de **macros catalogadas** não equivalem à quantidade de novas automações completas. O inventário geral está em `audit/native-power-coverage-v197.csv`. A lista dos 27 está em `audit/native-luck-healing-tactics-v197.csv`.

## Oito novos comportamentos — todos classificados como parciais

| Poder | Atividade automática | Limite assumido |
|---|---|---|
| Lucky You | Edge de Concentração no aliado tocado | Toque; decisão narrativa do Mestre |
| Wish You Luck | Edge no aliado inicialmente a até 5×Rank espaços | Linha de visão confirmada pelo Mestre |
| Lucky Us | Edge nos aliados até Rank, além do lançador | Linha de visão confirmada |
| Evil Eye | Trouble nos testes do inimigo até encerrar Concentração | Linha de visão confirmada |
| Jinx You | Trouble no inimigo tocado após acerto confirmado | Teste de toque/efeito Fantástico ainda manual |
| Jinx You All | Trouble em até Rank inimigos, alcance inicial 5×Rank | Linha de visão confirmada |
| Focus Fire | Edge de aliados **somente** contra o inimigo escolhido | Linha de visão e alcance de audição confirmados |
| Operations Center | Edge nos aliados até começo do próximo turno; movimento do lançador encerra Concentração | Alcance de audição e movimento forçado dependem do Mestre |

Nenhum reroll é disparado automaticamente. O jogador ou Narrador escolhe o dado e clica em **EDGE/TROUBLE**.

### Arquitetura e validações

- O fluxo HUD/Ficha continua em `Item.roll()` e delega somente os poderes oficiais e identificados ao despachante interno. As macros no compêndio continuam **referências inertes**, com ícones originais.
- Escolha de alvos usa `chooseSmartTargets`, inclusive quando a preferência geral está em modo manual; cancelar não consome Focus.
- Jogadores utilizam exatamente o protocolo atômico da **v0.2.196**: pacote JSON inteiro em uma única string de flag no Actor mundial; `updateActor` autenticado pelo Foundry; o Mestre valida DONO, token, Item e alvos, e aplica os recursos no Actor efetivo. Requisições repetidas com mesmos alvos/cena foram testadas.
- Concentração usa o sistema existente (`concentration.js`); cobranças posteriores usam `focus-maintenance.mjs`, quando o catálogo prevê Focus por turno. Ao encerrar Concentração, o Mestre limpa somente os efeitos derivados daquele poder. Em Operations Center, o Edge termina no começo do próximo turno do lançador; token movido encerra Concentração.
- Para evitar gastos indevidos e falsos positivos, este lote com Concentração exige **combate iniciado** e manutenção de Focus habilitada. O Mestre precisa confirmar linha de visão, alcance de audição, consentimento e acerto de Jinx You. Não automatizamos testes especiais de Ego, recuperação após morte ou decisões narrativas neste lote.

### Testes obrigatórios no Foundry

1. **PLAYER e GM:** Lucky You em aliado ao lado, Focus inicial e manutenção no turno seguinte, remoção da Concentração limpando o Edge no outro personagem.
2. **Evil Eye:** alvo inimigo recebe Trouble nos testes enquanto a Concentração durar; o jogador seleciona o reroll manualmente.
3. **Lucky Us / Jinx You All:** verificar os limites de Rank e o benefício do próprio lançador apenas para Lucky Us.
4. **Focus Fire:** marcar simultaneamente 1 inimigo e aliados; Edge somente em ataques contra esse inimigo. Testar outro alvo sem Edge.
5. **Operations Center:** Edge até o próximo turno do lançador e encerramento da Concentração ao mover o token (o Mestre arbitra deslocamento forçado).
6. **Repetição atômica:** ativar o mesmo poder novamente na mesma cena e alvos, com Mestre/Jogador conectados, confirmando sem erro de cena/origem/IDs nem gastos extras.
7. **Regressão:** Healing Hands, Soothing Touch, Energy Absorption, Anger, Edge/Trouble manual, dano e RD.

### Limites de cobertura

Os demais 19 poderes não incluídos neste lote de novas automações foram auditados, mas não receberam uma implementação nova: alguns já estavam registrados, outros continuam manuais. Cure-All, Restore e Resurrect exigem testes específicos de Ego e aplicações diferenciadas em sucesso/Fantástico; Let's Go e Never Surrender afetam comportamentos especiais de 0 Health/Focus; Advance/Scatter/Hit the Dirt dependem de gatilhos e movimentações. Não os apresente como automações completas.

### Arquivos funcionais e integridade

- **Novo:** `scripts/native-power-fortune.mjs` (um controlador compartilhado).
- **Atualizados:** `scripts/native-power-support.mjs` (oito regras restritas sem mudar o protocolo v196), `scripts/condition-edge.mjs` (leitura de fontes), `scripts/native-power-automations.mjs` (diagnóstico), `scripts/native-power-registry-data.mjs` e `packs/macros-d616` (74 referências), `tools/build-native-macro-pack.py` (gerador), `system.json`, `CHANGELOG.md`, novos testes e inventários.
- **Preservados sem alteração de bytes:** `README.md` e os **seis compêndios oficiais** da v0.2.196.
- **Regressão:** 1.107 testes automatizados passaram, 0 falhas. Esse resultado **não substitui validação prática** no Foundry v14.
- **GitHub:** nada publicado.
