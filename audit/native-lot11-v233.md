# Lote 11 — auditoria acelerada de 20 poderes (v0.2.233)

**Base:** v0.2.232 aprovada, Foundry v14. **Resultado:** 20 poderes distintos examinados; **4 integrações novas**, **10 coberturas existentes conferidas em código/testes**, **6 efeitos especiais ainda pendentes de validação/implementação**. Não equivale a 20 novas macros nem a 20 poderes integralmente automatizados.

## Tratamento dos 20 poderes

| Poder | Conjunto | Status v233 | Evidência/limite |
|---|---|---|---|
| Let's Go | Healing | **Novo** | `native-priority-lot11.mjs`: suporte Health=0, só Movimento; Concentração/Health positivo encerram o suporte. Decisões de morte continuam com o Mestre. |
| Never Surrender | Healing | **Novo** | `native-priority-lot11.mjs` + `conditions-hud.js`: suprime Desmoralizado com Focus=0, sem criar Focus, com limpeza ao recuperar. |
| Mental Shelter | Telepathy | **Novo** | `native-priority-lot11.mjs`: RD de Focus temporária igual ao melhor Uncanny 1–4 (Basic), em alvos escolhidos até 5 espaços × Rank. |
| Hex Bolt | Magic | **Novo** | `power-conditions.mjs` e `condition-edge.mjs`: Trouble por 1 rodada no Fantástico, somente após card de dano confirmado pelo Mestre. |
| Body Sheet | Plasticity | **Existente conferido** | `concentration.js` fornece RD de Health 3 e planagem; `activated-movement-powers.mjs` impede ataques durante Concentração. |
| Deafen | Illusion | **Existente conferido** | `power-rolls.mjs`, `power-conditions.mjs`, `power-fantastic-damage.mjs`: Ego vs Vigilance, Surdo 1 turno e dano apenas no Fantástico. |
| Dazzle | Illusion | **Existente conferido** | Ego vs Vigilance, Cego 1 turno, dano Fantástico normal. Escolha narrativa de escurecer em vez de ofuscar continua com o Mestre. |
| Flare | Magic/Illusion | **Existente conferido** | Condição Cego e dano somente no Fantástico. Testar seleção individual dos inimigos dentro de 5 espaços, para evitar incluir não-alvos. |
| Disrupt Nerves | Phasing | **Existente conferido** | Ego vs Resilience, Atordoado por 1 rodada e Caído no Fantástico. O requisito narrativo de atravessar o alvo permanece sob arbitragem. |
| Webcasting | Spider-Powers | **Existente conferido** | Paralisado, Imobilizado no Fantástico e teste de fuga Melee CD16 (`power-escapes.mjs`). |
| Shield Bash | Shield Bearer | **Existente conferido** | Ataque normal com Caído no Fantástico; multiplicação de dano permanece no motor padrão. |
| Double Tap | Ranged Weapons | **Existente conferido** | Ataque de Agility contra Agility; Sangrando no Fantástico. Checar distância de 2 espaços no uso. |
| Headshot | Ranged Weapons | **Existente conferido** | Ataque de Agility e multiplicadores 2×/3× (`power-fantastic-damage.mjs`); Atordoado após dano real. Verificar Trouble de mira na sessão. |
| Wisecracker | Basic | **Existente conferido** | Dano de Focus, Fantástico com Atordoado por rodada; motor de rolagem e confirmação de dano existente. |
| Reverse-Momentum Throw | Martial Arts | **Pendente** | Reação associada ao ataque corpo a corpo anterior que errou, Defense Stance e metade do dano hipotético; não presumir resultado. |
| Blink Defense | Teleportation | **Pendente** | Reação ligada à rolagem do projétil, teste de Ego com Edge e redirecionamento no Fantástico. Reaproveitar Catch Bullets somente após validar diferença. |
| Molecular Destabilization | Super-Speed | **Pendente** | Explosão de objeto, ataque em área a 2 espaços, dobra e ignora RD de Health no Fantástico. Requer card multi-alvo confirmado. |
| Body Sphere | Plasticity | **Pendente** | Proteção RD Health 3 de grupo, co-localização e alternativa de agarrar/Imobilizar. Reutilizar controlador do Lote 7. |
| Bounce Back | Plasticity | **Pendente** | Reação para zerar dano de queda, levantar-se de Caído e saltar opcionalmente; vínculo com o card de queda deve ser confiável. |
| Probability Manipulation Hex | Magic | **Pendente** | Quando aliado elegível teria Trouble, remover todo Trouble e conceder Edge. Precisa vincular a Concentração à rolagem correta. |

## Testes de aceitação novos (v0.2.233)

- Fonte de poder oficial verificada por Power Set e nome; nenhuma mutação de compêndios.
- Pré-seleção antes de gasto; alcance de toque para resgates e 5 espaços por Rank para Mental Shelter.
- Mestre autoriza alvos; jogador não ganha OWNER de outro personagem.
- Health/Focus em zero e acima de zero, limpeza da Concentração e retorno automático de Incapacitado/Desmoralizado quando aplicável.
- Let's Go bloqueia Ações Padrão e Reações, mas permite Movimento.
- Mental Shelter fornece apenas a RD de Focus herdada de Uncanny e conserva efeitos de outras fontes.
- Hex Bolt não gera Trouble em sucesso comum, exige confirmação do Mestre no Fantástico e expira em uma rodada.
- Dez mecanismos existentes verificados contra os registros do compêndio em testes específicos.

**Limite de validação:** testes automatizados não substituem uma sessão real com Mestre e Jogador. Esta versão deve permanecer experimental até aprovada no Foundry v14. Testar em especial alvos com tokens não vinculados, ação de Reação de Let's Go, Focus=0 e múltiplos personagens sob Mental Shelter.

**Próximo lote (v0.2.234):** priorizar as seis lacunas acima e acrescentar até quatorze poderes relacionados a Reações/áreas, conforme o mapa. Não criar macros apenas para elevar uma contagem.
