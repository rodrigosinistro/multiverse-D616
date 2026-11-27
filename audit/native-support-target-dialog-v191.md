# Multiverse-D616 v0.2.191 — Seleção de alvos nos poderes de suporte

Base: v0.2.190. **Nenhum cálculo de cura, gasto de Focus, Edge, RD ou dano foi alterado.**

## Correções

1. `Item.roll()` encaminha poderes de suporte ao despachante nativo antes do fluxo genérico; por isso não executava `chooseSmartTargets`. O próprio despachante agora chama `chooseSmartTargets(item, {force: true, requireTargets: true})` **antes** de cobrar custo ou emitir solicitação ao Mestre.
2. Reutiliza a janela oficial existente para alvos marcados ou selecionados no mapa. Poderes de suporte não exibem a opção **Sem alvo**. Cancelamento não altera seleção nem custos.
3. Na conexão Jogador → Mestre, token não vinculado pode apresentar UUID sintético distinto. A validação do token de origem agora aceita também o mesmo `actorId` base na cena, protegendo o caso de uma origem arbitrária.
4. Os demais mecanismos dos sete poderes de suporte, incluindo confirmações de voz e alcance quando cabíveis, não foram reimplementados.

## Checklist prático Mestre + Jogador

- **Healing Hands:** entrar como PLAYER, usar o HUD/ficha; confirmar abertura do seletor, escolher aliado adjacente que precise de Health; investir 10 Focus e verificar recuperação uma única vez.
- **Soothing Touch:** repetir com um aliado que precise de Focus; conferir a aplicação e os limites.
- **Rally on Me:** abrir seletor e escolher aliados próximos, com combate ativo; conferir limite por Vigilance, Focus e uso único por combate.
- **Inspiration:** em combate, escolher um aliado, confirmar a janela narrativa e verificar o Edge temporário e sua expiração.
- **Battle Plan:** selecionar dois ou mais aliados, verificar os Edge temporários e a expiração no próximo turno apropriado.
- **Cancelar:** abrir seletor sem alvo, clicar Cancelar ou fechar a janela; nem Focus nem Ação/Reação podem ser consumidos. Repetir com alvos previamente marcados, verificando que a seleção anterior não foi apagada.
- **Fonte:** testar personagem com token vinculado e não vinculado. Se houver mais de um token do mesmo Actor, controlar o token desejado antes de ativar.
- **Regressão:** verificar que a configuração geral de seleção manual continua igual para armas/ataques; testar Anger, Energy Absorption, Defense Stance e os rerolls manuais de Edge/Trouble.

## Arquivos funcionais modificados

- `scripts/native-power-support.mjs`
- `scripts/smart-targets.mjs`

Versionamento/documentação/testes: `system.json`, `CHANGELOG.md`, `tests/*.test.mjs` (expectativas de versão), `tests/native-support-target-dialog-v191.test.mjs`, `audit/native-support-target-dialog-v191.md`.

**Não publicados no GitHub.**
