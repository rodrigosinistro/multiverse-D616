# v0.2.213 — Auditoria de 27 poderes e Reações após o gatilho

## Base e cobertura

Base: **v0.2.212, validada no Foundry com Mestre e Jogador**. Lote de **27 poderes** de Resize, Melee Weapons, Ranged Weapons, Super-Speed, Healing, Tactics e Martial Arts. Somente 3 obtiveram automação parcial adicional; os demais 24 permanecem manuais, não catalogados. Não considerar cards ou macros de inspeção como automação integral.

## Novos comportamentos

- **Shrinking Dodge (Resize)**: após o personagem ser atacado, usar como Reação. O rastreador desconta 1 Reação e o sistema desconta **5 Focus**. Card com descrição oficial e orientação de **TROUBLE manual** no dado do ataque original, antes de aplicar dano. Sem pré-armação.
- **Riposte (Melee Weapons)**: depois que um ataque Melee inimigo **errar**, usar como Reação. Desconta 1 Reação, **nenhum Focus**. Card oficial instrui contra-ataque Melee de resposta. **A rolagem, dano e efeitos de arma ainda são manuais**; não descontar uma ação Standard adicional.
- **Point-Blank Parry (Ranged Weapons)**: depois de um inimigo a **até 2 espaços** errar um ataque, declarar Reação. Desconta 1 Reação e **5 Focus**. Card oficial informa ataque à distância de resposta; rolagem, dano e Sangrando Fantástico **ainda são manuais**; não cobrar Standard adicional.

As regras do gatilho (erro, alcance, timing) ainda dependem de confirmação do Mestre. O card jamais dispara outra rolagem nem altera dano antes da resolução final. Focus é aplicado após o rastreador autorizar a Reação; recusas e falhas anteriores ao chat não gastam recursos. Em falha de publicação do chat, tenta estorno de ambos.

## Cobertura dos 398 poderes

| Situação | Quantidade |
|---|---:|
| Nativas ativas | 14 |
| Nativas parciais | 46 |
| Referências existentes | 91 |
| Depende de configuração | 2 |
| Não catalogados | 245 |
| **TOTAL** | **398** |

**153 macros catalogadas (38,44% do catálogo), mas apenas 60 registradas como automações nativas ativas/parciais.** A implementação real de algumas das referências existentes não equivale à regra integral do respectivo poder; há trabalho restante substancial.

## Checklist no Foundry v14

1. PLAYER declara Shrinking Dodge **depois** do ataque: 5 Focus e 1 Reação debitados, card oficial aparece para ambos. Atacante/Mestre executa Trouble no card original. Confirmar não haver segunda rolagem e não haver status persistente.
2. PLAYER declara Riposte **após um erro Melee**: 1 Reação debitada, Focus inalterado, card publicado. Executar manualmente o contra-ataque, dano e especial da arma sem consumir Standard adicional.
3. PLAYER declara Point-Blank Parry **após erro a até 2 espaços**: Focus -5 e Reação -1; card publicado. Executar manualmente teste à distância de resposta e Sangrando em Fantástico.
4. Reação esgotada, Focus insuficiente, sem combate e falha de publicação do chat: não criar efeitos indevidos nem gastos duplicados. Tentar click duplo.
5. Regressão: Always Ready, Fast Hands, Shield Deflection, Hurled Shield Block e Counterstrike Technique (com ataque Fantástico) no Mestre e Jogador. Conferir a aplicação do dano uma única vez.

## Integridade e segurança

README e seis compêndios oficiais preservados byte a byte; apenas `Macros_D616` foi reconstruído a partir do Powers LevelDB. Protocolo atômico v196 de GM e correções v210/v212 intactos. Nenhum GitHub alterado. O teste automatizado não substitui o teste multiplayer real.
