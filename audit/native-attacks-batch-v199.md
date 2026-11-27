# Multiverse-D616 v0.2.199 — auditoria e validação

**Base:** v0.2.198, aprovada pelo usuário no Foundry v14. **Estado desta entrega:** experimental.

## Escopo

- **29 poderes auditados:** 15 de Ranged Weapons, 9 de Melee Weapons e cinco de Martial Arts.
- **22 novos registros** no Macros_D616 (4 comportamentos reais ampliados, classificados como parciais; 18 referências a mecanismos pré-existentes). Total: **110 macros, 27 pastas**.
- Macros são *referências inertes*, com ícones e IDs oficiais. Não executam código de jogador com permissão de Mestre.
- Catálogo de **398 poderes preservado**, sem alteração de compêndios oficiais.

## Melhorias funcionais

1. **Sniping:** dano triplo em Fantástico; aviso de mínimo 20 espaços se Combate Inteligente estiver ligado. A restrição de movimento é manual.
2. **Snap Shooting:** fator de dano ½ no sucesso comum e 1× no Fantástico, pelo resolvedor de dano existente. Sangrando no Fantástico continua no motor.
3. **Furious Attacks:** bônus fixo de dano +1 por 2 Focus gastos, calculado uma vez, e fatores de dano ½ ou 1×. Multi-alvos e efeito especial da arma exigem Mestre.
4. **Untouchable Position:** marcador temporário após ataque rolado contra personagem (somente com alvo/cena identificados); Trouble contra ataques corpo a corpo seguintes até início do próximo turno. Rerolls manuais; não interfere no primeiro ataque.

**Não confundir as 18 referências com novas automações.** Passivas como Always Ready e Fast Hands, reações de defesa e ações opcionais posteriores continuam sem implementação integral; não se concedem Reações extras genéricas sem restringir o Power Set.

## Cobertura total

native-active: 12, native-partial: 22, not-registered: 288, reference-existing: 74, requires-configuration: 2. Total = 398.

## Testes no Foundry

1. Com personagens Mestre e Jogador, ative **Sniping**: ataque a distância acima de 20 espaços e confirme que um Fantástico causa 3× o dano normal (após RD) em vez de 2×. Se usar Combate Inteligente, teste aviso com alvo a 10 espaços.
2. Use **Snap Shooting**: compare acerto comum (metade do dano normal) e Fantástico (dano completo), mantendo condição Sangrando conforme regra original.
3. Use **Furious Attacks**, investindo 10 Focus: bônus fixo +5 no card; 15 Focus: +7. Confira que Focus não é debitado duas vezes, e faça teste com dois alvos.
4. Para **Untouchable Position**, ataque o personagem com qualquer ataque direcionado: o primeiro não recebe Trouble da postura. Um segundo ataque Melee antes do turno seguinte recebe 1 Trouble líquido (sem reroll automático). Ao chegar o próximo turno do defensor, o bônus negativo desaparece. Verifique com token não vinculado e em turno bônus.
5. Regressão: Anger, Jinx You, Healing Hands com Mestre/Jogador, Edge/Trouble manuais, RD, Attack/Defense Stance, Team Maneuvers e compêndios.

## Arquitetura e limites

As novas automações de cálculo não gastam Focus nem alteram RD diretamente; o motor original continua responsável por gastar recursos e aplicar dano. O marcador de Untouchable é escrito somente pelo GM a partir de um card de ataque que identifica cena e alvo, jamais de execução de script de macro. O protocolo atômico da v0.2.196 permanece intacto.

**Nenhuma versão é estável sem validação do usuário em duas sessões reais do Foundry.** Sem publicação no GitHub.
