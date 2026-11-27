# Multiverse-D616 v0.2.206 — Reações após gatilho (29 poderes auditados)

**Base:** v0.2.205, aprovada em Foundry VTT v14. **Estado:** experimental até validação com Mestre e Jogador.

## Entrega objetiva

- **29** poderes auditados, entre Shield Bearer (12), Martial Arts (9), Melee Weapons (3), Ranged Weapons (4) e Immovable de Super-Strength (1).
- **7 novas automações parciais:** Shield Deflection; Hurled Shield Deflection; Hurled Shield Block; Immovable (Shield Bearer); Immovable (Super-Strength); Brace for Impact (Shield Bearer); Brace for Impact (Martial Arts).
- **4 referências a mecânicas já existentes:** Shield 1, 2, 3 e 4. A RD de Health somente durante Concentração já existia em `shieldConcentrationChanges()`.
- **18 permanecem manuais** no grupo auditado; não são apresentados como automações completas.
- `Macros_D616`: **136 → 147 macros** em 27 pastas, com ícones extraídos dos poderes originais.

## Mecânica e limites de responsabilidade

A Reação é acionada **após o gatilho previsto no poder** e antes da resolução final do ataque ou movimento. Sem preparação, sem rolagem extra e sem auto-reroll. A ativação exige combate ativo, personagem na iniciativa, Reação disponível e Focus suficiente conforme o poder. A descrição oficial é exibida integralmente no chat, seguida da indicação do que deve ser resolvido no card original.

| Poder | Automação | O que continua manual |
|---|---|---|
| Shield Deflection | Desconta Reação, publica descrição e aviso de TROUBLE | Confirmar ataque contra Agility e clicar TROUBLE no ataque original |
| Hurled Shield Deflection | Desconta Reação e 5 Focus, anuncia TROUBLE no atacante | Confirmar aliado alvo de ataque de Agility e reroll manual |
| Hurled Shield Block | Desconta Reação e 5 Focus, anuncia RD de Health do escudo no ataque ao aliado | Escolher aliado, validar ataque de Agility e aplicar RD pontual |
| Immovable — Shield Bearer | Desconta Reação, publica redução de recuo baseada em Defesa Melee | Decidir recuo/queda e mover o token |
| Immovable — Super-Strength | Mesmo controlador compartilhado, identificação independente | Decidir recuo/queda e mover o token |
| Brace for Impact — Shield Bearer | Escolhe e desconta Focus (mínimo 5; máximo 5×Rank) e Reação; anuncia absorção 1:1 | Descontar manualmente até a absorção escolhida do dano físico de Health deste ataque |
| Brace for Impact — Martial Arts | Mesmo controlador e cálculos, identidade independente | Mesma resolução manual de dano físico |

Os poderes **não** modificam o Actor de um aliado ou inimigo, não criam RD permanente, não anulam ataque automaticamente e não rolam dados no lugar do atacante. Não dependem da Central de Automações nem conferem acesso DONO às macros.

## Checklist de validação no Foundry v14

1. Com Mestre e Jogador conectados, o inimigo declara/rola um ataque contra a Agility do defensor. O jogador ativa **Shield Deflection** pelo HUD **após o gatilho**. Verificar card completo, consumo de 1 Reação, e aplicação manual do TROUBLE no **card original** pelo atacante/Mestre.
2. Repetir **Hurled Shield Deflection** protegendo um aliado; conferir gasto de **5 Focus e 1 Reação**, sem reroll automático.
3. Repetir **Hurled Shield Block**, confirmando que a RD do escudo é usada somente contra aquele ataque, sem criar efeito permanente.
4. Testar **Immovable** nas versões Shield Bearer e Super-Strength. Confirmar descrição correta e que a redução de recuo continua com o Narrador.
5. Testar **Brace for Impact** nas duas versões. Selecionar 5 e 10 Focus, conferir consumo único de Focus/Reação, uso pontual de absorção e card oficial. Cancelar a seleção e confirmar **zero gasto**.
6. Testar sem Reação disponível e com Focus insuficiente. A ação deve ser recusada antes de publicar efeito ou gastar outro recurso.
7. Regressão: **Slow-Motion Dodge / Spider-Dodge** permanecem instantâneos; **Shield 1–4** mantêm RD somente enquanto há Concentração; **Anger, Jinx You, Energy Absorption**, protocolo Mestre/Jogador, dano, chat e Edge/Trouble manuais continuam funcionando.

## Preservação

Arquivos originais de poderes e outros cinco compêndios não foram regenerados nem modificados. README não foi alterado. Os testes automatizados devem ser executados integralmente antes de considerar a versão candidata. **Nenhuma publicação no GitHub**.
