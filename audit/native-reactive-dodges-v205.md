# Multiverse-D616 v0.2.205 — Reações defensivas após ataque

**Base:** v0.2.204 aprovada. **Status:** experimental até a validação em Foundry v14.

## Regra preservada do catálogo oficial

| Poder | Gatilho oficial | Ação | Efeito |
|---|---|---|---|
| Slow-Motion Dodge | Um inimigo faz ataque contra a Defesa de Agility do personagem | Reaction | Trouble no ataque inimigo |
| Spider-Dodge | Alguém faz ataque de Agility contra o personagem | Reaction | Trouble no ataque; se errar, salto opcional com Jump Speed |

O poder deve ser usado **em resposta ao ataque**, depois da declaração/rolagem e **antes da resolução final**. O catálogo oficial não exige que o ataque tenha acertado; um acerto preliminar pode ser reavaliado pelo Trouble manual. O card do atacante é a única rolagem usada. 

## Mudança técnica

1. A ativação pelo HUD/ficha é encaminhada diretamente a `declareNativeReactiveDodge` antes de alvos, preflight, Focus e Concentração.
2. Confirma combate ativo, personagem participante e Reação disponível. O Turn Tracker consome a Reação uma vez.
3. Publica `nativePowerResultMessage`, com descrição, efeito, Gatilho, Ação e Duração oficiais e lembrete para o atacante/Mestre clicar **TROUBLE** no próprio card já aberto.
4. Não cria efeito preparado, não injeta Trouble no card automaticamente, não rola outro teste, não modifica alvos/dano ou o protocolo atômico.
5. O GM principal remove marcadores antigos `nativePreparedDodge` que possam existir de versões anteriores.

## Checklist Foundry v14 — Mestre e Jogador

- [ ] Com personagem em combate e Reação disponível, o inimigo rola um ataque que atinge Defesa de Agility. Depois da rolagem e antes da resolução, o jogador ativa Slow-Motion Dodge: card oficial aparece; atacante usa TROUBLE manual no card original.
- [ ] Um ataque contra outra defesa não deve autorizar Slow-Motion Dodge (validação de gatilho pelo Mestre/mesa).
- [ ] Repetir com Spider-Dodge após um ataque de Agility, independentemente da defesa alvo, e confirmar salto manual somente se o ataque errar.
- [ ] Confirmar que **não** existe status ou efeito 'Reação preparada' e que **nenhum reroll é automático**.
- [ ] A Reação do personagem deve cair uma única vez no HUD; sem Reação disponível, a ativação deve ser recusada sem criar card.
- [ ] Verificar que o card mostra descrição, efeito, gatilho, ação, duração e lembrete de TROUBLE manual.
- [ ] Regressão: Blur continua com duração de 1 rodada, Hit the Dirt / Scatter e Spider-Pheromones inalterados; Anger, Energy Absorption, RD, chat de dano e o protocolo atômico também.

**Limite intencional:** o sistema não inspeciona automaticamente se o ataque concreto atende ao gatilho; a mesa escolhe quando declarar a Reação e se o Trouble é elegível. Esta é uma automação **parcial**.
