# Multiverse-D616 v0.2.185 — Lote 1 de passivos / Macros_D616

## Origem e garantias

Base: ZIP **v0.2.184** validada pelo Mestre. Fonte das definições: LevelDB instalado `packs/mmc-powers-v0186/000002.log`, 398 poderes/27 Power Sets. Não há edição do catálogo Powers ou demais compêndios oficiais, nem de README, HUD, resolução de dano, RD ou Ator. Compêndio Macros_D616 é biblioteca **não executável com privilégios de GM**: cada macro exibe um registro de informações e a ativação ocorre no motor e na ficha/HUD. Acesso de leitura de jogadores é suficiente.

## Contagens de registro

| Tipo | Novas referências | Situação técnica |
|---|---:|---|
| Accuracy 1–4, Brilliance 1–4, Discipline 1–4, Mighty 1–4, Sturdy 1–4, Uncanny 1–4 | 24 | Active Effects originais `transfer=true`, com `UPGRADE` para modificadores e RD; **não** reaplicados pela macro |
| Brawling, Evasion, Integrity, Wisdom | 4 | Defesas alternativas reconhecidas no motor de resolução existente |
| Danger Sense | 1 | Entrada na Rodada Bônus pelo rastreador existente |
| Healing Factor | 1 | Cura no fim do turno pelo controlador existente; depende da ativação na Central |
| Real Jinx (Luck) | 1 | **Nova automação nativa**: um Trouble em ataque direto explicitamente direcionado ao portador, sem acumular com outro Trouble |
| **Novas referências** | **31** | 30 integrações por referência + 1 nova automação |
| Referências já existentes v0.2.184 | 7 | Anger, Energy Absorption, Lightning Actions e Elemental Protection 1–4 |
| **Total v0.2.185** | **38** | 27 pastas preservadas; cópias dos mesmos ícones dos poderes |

Status globais de catálogo: 2 `native-active` (Anger e Real Jinx), 2 `requires-configuration` (Lightning Actions e Healing Factor), 34 `reference-existing`. **Esses números indicam o estado do registro — não a conclusão de automação dos 398 poderes.** A inspeção `power-owned` informa a presença do poder, não prova que todos os efeitos de um Actor foram preparados corretamente em um mundo específico.

## Real Jinx: execução e limites

- Só é aplicada se o atacante fizer um **ataque**, contra **alvo explicitamente marcado**, e o personagem alvo possuir o poder oficial `Real Jinx` no Power Set `Luck`, ou recebê-lo de um equipamento permanente compatível. A avaliação é somente leitura.
- Insere um único Trouble na mesma coleta de modificadores de condições já usada nas rolagens de ataque; **não modifica** o Actor nem seu conjunto permanente de dados.
- Se a rolagem já possui Trouble (condição do atacante, condição do alvo, efeito passivo, efeito do poder ou base conhecida), não acrescenta outro. Se há alvos com modificadores diferentes, o sistema não força uma rerrolagem compartilhada e sinaliza a necessidade de decisão por alvo pelo Mestre.
- Não atribui Trouble quando não houver seleção de alvo, em testes não ofensivos ou em situações narrativas que o sistema não consiga identificar. O Narrador ainda decide o que é “tentar ferir com uma ação direta” em casos ambíguos.
- Mantém o tratamento geral do dado Marvel e de resultados Fantásticos da v0.2.184.

## Testes automatizados

Suíte `node --test tests/*.test.mjs`: **1.036 aprovados, 0 falhas**. Casos novos abrangem identidade do Power Set, cópia de registros, diagnóstico, ausência de duplicação de efeitos, Real Jinx em ataques Melee/Agility, checks não ofensivos, ausência de alvo, Trouble já existente, alvo Caído, modificadores base e multialvos. Verificação independente de todos os 24 modificadores originais identificou AE transferível `UPGRADE` com valor e chave correspondentes. Os testes de Foundry dentro do ambiente gráfico dependem da validação do Mestre.

## Checklist no Foundry v14

1. **Backup do mundo** e instalação da v0.2.185 em mundo de testes. Abrir `Macros_D616`: 38 macros nas 27 pastas; Power Sets organizados; ícones originais e nenhuma solicitação de execução manual.
2. **Modificadores permanentes:** personagem com Accuracy 1 ou Mighty 2 deve receber exatamente os benefícios dos Active Effects originais. Conferir Sturdy 1/2 e Uncanny 1/2, sem somar tiers cumulativamente. Remover o item e confirmar que o efeito desaparece; equipar/desmontar itens que concedem o poder, se aplicável.
3. **Defesas:** Brawling (Melee para se defender de ataques contra Agility), Evasion (Agility contra Melee), Integrity (Logic contra Ego) e Wisdom (Ego contra Logic), sem mudanças de fórmula ou de defesa independente do ataque.
4. **Danger Sense:** entrar em combate sem resultado Fantástico de iniciativa; conferir participação na Rodada Bônus, sem turno duplicado.
5. **Healing Factor:** confirmar recuperação no fim do turno, dentro do máximo de Health, e que desligar a regra na Central impede essa recuperação automática.
6. **Real Jinx:** adicionar o poder de Luck ao defensor. Jogador ataca esse alvo marcado: o chat deve mostrar Trouble de Real Jinx e executar uma só rerrolagem quando aplicável. Repetir atacando com Demoralizado (sem dois Troubles) e depois atacando dois alvos, um com Real Jinx e outro sem (decisão de Mestre, sem rerrolagem coletiva).
7. **Regressão:** verificar Anger, Energy Absorption (permissões de PLAYER e Reação), Elemental Protection, Lightning Actions, Chat de Combate 2.0, RD, concentração, HUD e veículos.

## Arquivos desta versão

Alterados: `system.json`, `CHANGELOG.md`, `scripts/condition-edge.mjs`, `scripts/native-power-automations.mjs`, `scripts/native-power-legacy-bridge.mjs`, `scripts/native-power-registry-data.mjs`, `tools/build-native-macro-pack.py`, `packs/macros-d616/000002.log`, expectativas de versão de testes existentes.

Novos: `scripts/native-power-passives.mjs`, `tests/native-passive-batch-v185.test.mjs`, `audit/native-passive-batch-v185.md`.

Preservados byte a byte: `README.md`, os 6 compêndios de Item originais, e todo o restante do sistema. A v0.2.185 é experimental até validação prática no Foundry v14; a v0.2.184 é a base estável aprovada. Não publicar no GitHub.
