# Multiverse-D616 v0.2.189 — Focused Strike e Focused Fury

## Base

- **Base estável confirmada:** v0.2.188 aprovada pelo Mestre no Foundry VTT v14.
- Fontes oficiais: `packs/mmc-powers-v0186/000002.log`, sem alteração, com 398 Powers e 27 Power Sets.
- Macro compendium: 53 referências em 27 pastas, ícones originais do compêndio Powers; não há scripts privilegiados.
- Versão experimental até validação manual no Foundry.

## Novas integrações

| Poder | Set / ID de origem | Regra implementada | Status |
| --- | --- | --- | --- |
| Focused Strike | Martial Arts / `aUO9Rmlx2HWYGUJM` | Gasto variável mínimo de 10 Focus; +1 ao bônus fixo de dano Melee por 2 Focus investidos (arredondar para baixo). Em Fantástico, o mecanismo de condições já existente aplica Atordoado por 1 turno. | `native-active` para bônus de Focus; condições existentes preservadas |
| Focused Fury | Melee Weapons / `8DvKqA6FlcJxPMl3` | Gasto variável mínimo de 5 Focus; +1 ao bônus fixo de dano Melee por 2 Focus investidos; Edge inerente do item continua exigindo escolha manual de dado. | `native-partial` porque o efeito especial da arma no Fantástico não foi migrado |

**Exemplos de escalonamento:** Focused Strike com 10/12/20 Focus concede +5/+6/+10, respectivamente. Focused Fury com 5/6/7 Focus concede +2/+3/+3. Focus gasto somente pelo mecanismo normal de `Item.roll()`, e nunca pela macro do compêndio.

## Arquitetura e compatibilidade

- Novo módulo puro `scripts/native-power-focused-attacks.mjs`, consultado por `native-power-automations.mjs` mediante correspondência de Power Set, nome e identidade da origem no registro oficial.
- Em `Item.roll()` o usuário seleciona o total de Focus antes de confirmar; o sistema aplica e registra **uma única** flag existente `focusDamageBonus`, calculada pela regra oficial. O mecanismo de dano existente aplica esse valor ao resolver o card, sem modificar RD, multiplicador ou ataques anteriores.
- Também utiliza a regra tipada quando o antigo botão de edição de Focus é acionado num card compatível.
- Nenhum novo hook global, escrita em recursos de alvos, permissão de Mestre ou ação/Concentração foi introduzido. Edge/Trouble permanecem **manuais**, conforme aprovado na v0.2.188.
- Foco em duas automações do mesmo tipo. Não foi incluído outro poder de mecânica distinta somente para aumentar a contagem de macros.
- O `README.md` e os seis compêndios originais estão idênticos aos da v0.2.188; o único compêndio reconstruído é `Macros_D616`.

## Checklist no Foundry VTT v14

1. Faça backup do mundo, instale a v0.2.189 e confirme que `Macros_D616` mostra 53 referências nas 27 pastas.
2. Crie um personagem Rank 3 ou superior com **Focused Strike**, Melee +6 e Focus suficiente. Ative pelo HUD com **10 Focus**. O seletor deve explicar o bônus +1 por 2 Focus. O card do ataque deve registrar **+5** dano fixo de Focus, e o Focus atual do personagem cair exatamente 10 pontos.
3. Repita com **12 Focus**: o bônus daquele novo card deve ser +6. Antes de clicar em DANO, mude recursos do personagem: a confirmação do card antigo não deve recalcular o bônus.
4. Resolva os ataques em um alvo com RD Health. Compare com um Clobber de dados idênticos: Focused Strike deve acrescentar só o bônus fixo correspondente, sem alterar o multiplicador nem ignorar RD. Em Fantástico, confirme o Atordoado por 1 turno do fluxo já existente.
5. Para **Focused Fury**, ative com **5 Focus** (bônus +2) e depois com 7 Focus (bônus +3). Confirme o **Edge** intrínseco no quadro de reroll e escolha manualmente o dado. O efeito especial da arma no Fantástico continua sujeito ao processo existente; não deve ser anunciado como totalmente automatizado.
6. Teste os dois poderes como **Jogador** com personagem próprio (OWNER) e depois como Mestre. Em nenhum caso a macro precisa ser clicada no compêndio.
7. Regressão: **Anger, Attack Stance, Defense Stance**, Unflappable Poise, **Real Jinx**, Energy Absorption, recuperação de Focus/Health, proteção/RD, Team Maneuvers, multicards e HUD persistente.
8. Confirme especificamente que nenhuma fonte líquida Edge/Trouble refaz dados automaticamente, e que Defense Stance termina com **perda efetiva de Health**.

## Testes offline

- `node --test tests/*.test.mjs`: 1.062 aprovados / 0 falhas.
- `tests/native-focused-attacks-v189.test.mjs`: regras, custos, ID, Power Set, escopo, Edge, Fantástico, não duplicação, snapshots, custo de Focus e RD.
- O Foundry v14 real não é executado pelo runner Node; validação operacional depende dos testes acima.
