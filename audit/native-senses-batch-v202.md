# Multiverse-D616 v0.2.202 — Auditoria de sentidos, furtividade e ilusão

**Base:** v0.2.201 validada no Foundry v14 pelo usuário. **Total auditado:** 27 poderes — Healing (7), Illusion (14), Basic (6).

**Implementação funcional nova (parcial):** Heightened Senses 1/2; Invisibility; Silence Self (4 registros). Integração com `resolveConditionEdges` do sistema, sem criar condição, sem custo adicional, sem lógica paralela de dados.

**Referências de mecânicas já existentes (não são automações novas):** Dazzle, Deafen, Flare, Cure-All e Restore (5 registros). Dazzle/Deafen/Flare usam o fluxo Ego contra Vigilance e condições em `power-conditions`; Cure-All/Restore têm teste de Ego contra TN 12/TN 20 em `power-rolls`, **mas não automatizam a restauração final**.

**Biblioteca:** 113 → 122 macros; 27 pastas; cada ícone preservado do compêndio original. Dos 27 auditados, 18 permanecem sem novo registro nesta versão. Os 398 poderes do catálogo não foram alterados.

## Limite de contexto — importante
A ficha usa o dado de atributo (Vigilance/Agility) para diversas tarefas. Ela não sabe com segurança se um teste é especificamente de **percepção** ou de **furtividade**. Portanto, os 4 poderes apresentam **fontes condicionais** no card: Edge de Heightened Senses 1/2 quando o teste de Vigilance é para perceber algo; Trouble quando alguém tenta esconder-se de observador com esses poderes; Edge em Agility quando o portador sob Silence Self/Invisibility concentra e tenta passar despercebido; Trouble para observador tentando perceber alguém sob esses poderes. As fontes ficam expressamente marcadas como dependentes de confirmação do Mestre. O usuário pode optar por **não clicar** nos rerolls quando o teste não é elegível. Não há rerolls automáticos.

Heightened Senses 2 substitui o benefício do nível 1 (não soma 3). Invisibility e Silence Self exigem a Concentração real do poder; ao encerrá-la o modificador desaparece. Outras Concentrações permanecem intactas.

## Validação no Foundry v14
1. Personagem com Heightened Senses 1: abra teste de Vigilance para perceber e confira uma fonte de Edge, sem reroll até clique manual.
2. Com Heightened Senses 2 e 1, faça o mesmo: apenas duas fontes de Edge, não três.
3. Ative Silence Self e depois Invisibility em testes separados: no teste não ofensivo de Agility, confira o Edge e a remoção ao encerrar a Concentração.
4. Selecione como alvo um observador com Heightened Senses 2 para teste não ofensivo de Agility e confira duas fontes de Trouble condicionais.
5. Teste um ataque de Agility e um ataque de Vigilance para confirmar que essas fontes não se aplicam ao combate.
6. Confirme que o chat apresenta os textos originais do poder, e que o protocolo Mestre/Jogador de suporte da v0.2.196 continua funcionando.

**Pendente:** validar visualmente em dois clientes, especialmente a seleção de alvo em testes não ofensivos e a distinção narrativa de furtividade/percepção. Não classificar como automação completa até que haja indicação explícita de finalidade do teste.

**Contagem global de registros (não equivale à cobertura funcional completa):** {'not-registered': 276, 'reference-existing': 79, 'native-active': 12, 'requires-configuration': 2, 'native-partial': 29}. Arquivos protegidos idênticos ao ZIP v0.2.201: 19.
