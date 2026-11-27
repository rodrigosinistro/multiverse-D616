# Multiverse-D616 v0.2.188 — Defense Stance e Edge/Trouble manual

## Objetivo e base

Base: ZIP completo **v0.2.187**, validado pelo Mestre no Foundry VTT v14. Esta atualização trata apenas dos dois ajustes pedidos: interrupção de Defense Stance quando perder Health e apresentação/execução manual dos modificadores líquidos Edge/Trouble. Nenhum poder novo foi registrado; o compêndio **Macros_D616** conserva 51 entradas e 27 pastas.

## Funcionamento

- O sistema observa o Health efetivo após atualizações do Actor e do Actor do token. Se o valor for **menor** que o observado anteriormente, localiza a Concentração ativa do poder oficial **Defense Stance** (Martial Arts) e remove **somente** seu ActiveEffect. A lógica de Concentração existente sincroniza o nível genérico, sem apagar outras Concentrações.
- Se a proteção/RD absorver todo o dano, ou o efeito reduzir apenas Focus, a Concentração não termina. A regra solicitada pelo Mestre é aplicada por dano efetivo em Health, mesmo que a descrição original faça referência a um ataque bem-sucedido.
- O resolvedor situacional ainda registra as fontes e calcula Edge/Trouble líquidos (incluindo cancelamentos e diferenças de múltiplos alvos), porém deixa o reroll sempre **manual** no card. Não existem rerolls disparados automaticamente por condições. A iniciativa tem seu próprio fluxo, não reescrito nesta versão.
- O quadro de Condições/Automações exibe título centralizado, origens, quantidade líquida em fonte maior e instrução de clicar nos controles **EDGE**/**TROUBLE** sob os dados.

## Roteiro de validação no Foundry

1. Faça backup do mundo e atualize o sistema pelo ZIP da v0.2.188.
2. Com Mestre e Jogador conectados, ative **Defense Stance** e mantenha outra Concentração possível (se o Rank permitir). Confira os efeitos na ficha/HUD.
3. Cause um ataque que **acerte mas não reduza Health** por causa da proteção/RD. Defense Stance deverá continuar ativa.
4. Cause um ataque que reduza **1 ou mais Health**. Defense Stance deverá desaparecer automaticamente; outra Concentração deve continuar e o contador deve diminuir corretamente.
5. Repita com dano contínuo e com um token desvinculado para conferir sincronização do mestre/jogador.
6. Reponha Health e cause somente perda de Focus. Defense Stance não deve ser removida.
7. Faça um ataque contra **Unflappable Poise + Defense Stance**; confira Trouble líquido (geralmente 2). Nenhum dado deve rerrolar sozinho. Clique você mesmo em **TROUBLE**.
8. Faça um ataque com 1 Edge líquido e outro com 1 Trouble líquido (incluindo Blazing Fast Fists, Real Jinx ou condições). Em ambos, as fontes aparecem no quadro centralizado e somente um clique explícito deve gerar reroll.
9. Faça um teste Edge + Trouble que se anulam; confirme net zero, sem rerolls. Teste alvos múltiplos com modificadores distintos.
10. Valide também dano/RD, Anger, Energy Absorption e HUD, sem alterar demais automações.

## Testes e integridade

Testes Node: `node --test tests/*.test.mjs`. Arquivos alterados: `scripts/native-power-martial-stances.mjs`, `scripts/condition-edge.mjs`, `css/multiverse-d616.css`, `system.json`, `CHANGELOG.md` e testes. Novo checklist: este arquivo. Preservados integralmente o `README.md`, os seis compêndios oficiais e o compêndio `Macros_D616`.

**Status:** experimental até aprovação do Mestre. Não publicar automaticamente no GitHub.
