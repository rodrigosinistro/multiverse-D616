# Multiverse-D616 v0.2.187 — Posturas de Artes Marciais

## Base e limites

Base exata: v0.2.186 validada pelo Mestre no Foundry VTT v14. Fonte dos textos: `packs/mmc-powers-v0186/000002.log` (398 poderes, 27 Power Sets); o Charactermancer não é utilizado como autoridade alternativa. Não houve edição dos poderes oficiais. Os 6 compêndios originais, README e motor de Redução de Dano são preservados.

## Nova automação 1 — Attack Stance (completa)

- **Power Set:** Martial Arts — `cCVjyNL1fTcyAq9g`.
- **Regra do catálogo:** "O personagem dobra seu bônus de habilidade de Melee para dano." Custo de Focus vazio, Ação Standard, duração Concentration.
- **Ativação:** `Item.roll()` pelo HUD/ficha cria a Concentração já existente. O controlador nativo anota a própria Concentração; o rastreador existente consome a Ação Padrão, sem custo extra.
- **Dano:** durante ataques Melee, soma uma parcela adicional **igual ao valor atual da habilidade Melee**, efetivamente dobrando sua participação no dano. Não dobra o multiplicador, não altera testes ou ataques de Agility/Logic e não altera RD. Cada ataque registra um snapshot próprio `nativeStanceMeleeBonus`, isolado do snapshot anterior `nativeAngerMeleeBonus`. Resultados antigos não mudam se a Concentração terminar.
- **Limpeza:** a remoção/desativação da Concentração deixa de produzir o bônus imediatamente; não há efeito independente para limpar.

## Nova automação 2 — Unflappable Poise (PARCIAL)

- **Power Set:** Martial Arts — `TAhre265tkdXG3fu`.
- **Regra do catálogo:** ataques corpo a corpo contra o personagem sofrem Trouble; com Defense Stance, sofrem dois Troubles.
- **Automatizado:** a primeira fonte Trouble entra no resolvedor existente de ataques diretos e corpo a corpo (`scripts/condition-edge.mjs`). O poder é passivo e permanente; não consome Focus, Ação ou Reação. Quando uma concentração Defense Stance pertencente ao personagem está ativa, o sistema exibe uma segunda fonte Trouble separada.
- **Ainda manual:** a escolha de dois rerolls de Trouble continua responsabilidade do Mestre, como no motor atual para qualquer net maior que 1. A regra de Defense Stance de **encerrar o bônus após o primeiro acerto corpo a corpo** ainda exige que o Mestre termine essa postura; não foi criada automação de confirmação de acerto nesta versão. Por isso o registro mostra `native-partial`, não `native-active`.
- **Real Jinx:** esse poder não pode acumular Trouble com outra fonte; Unflappable é processado primeiro e Real Jinx é ignorado quando o Trouble de Unflappable já existe. Não afeta ataques à distância, testes genéricos nem ataques sem alvo marcado. Multialvos diferentes continuam exigindo resolução separada pelo Mestre.

## Cinco referências de movimento (mecanismo preexistente)

- Flight 1, Flight 2 — Basic.
- Jump 2, Jump 3 — Super-Strength.
- Speed Swim — Super-Speed.

Os itens são registrados com `reference-existing`, sem novos multiplicadores ou atualizações de Actor. Continuam dependentes dos mecanismos de movimento existentes. Isso não representa novas automações operacionais.

## Biblioteca e integridade

- 51 macros de referência, 27 pastas por Power Set, ícones correspondentes aos itens oficiais.
- Macro de compêndio é uma referência informativa (`showMacroInfo`), não código executado como Mestre; permissões de jogador permanecem `OBSERVER` no compêndio.
- Sem alteração da Central, Energy Absorption, Lightning Actions, Anger, Real Jinx (exceto a compatibilidade não cumulativa), Team Maneuvers, veículos, HUD ou regras globais de combate.
- `README.md` e seis compêndios originais não modificados. `CHANGELOG.md` atualizado.

## Teste recomendado no Foundry v14 — Mestre e Jogador

1. Instalar v0.2.187 após backup de mundo, abrir Macros_D616 e conferir 51 macros e 27 pastas.
2. Criar um personagem com **Attack Stance** e Melee +4, ativar o poder pelo HUD com conta Jogador. A Concentração deve aparecer sem gastar Focus; Ação Padrão segue o rastreador atual.
3. Com o mesmo ataque e resultados de dados, comparar dano Melee sem e com postura. Com postura deve haver **+4 de dano fixo**, sem alterar o multiplicador nem o dano de ataques de Agility.
4. Encerrar Concentração, atacar novamente e confirmar remoção do bônus. Um card anterior deve conservar seu dano, se ainda não resolvido pelo Mestre.
5. Dar **Unflappable Poise** a um alvo. Um atacante deve receber um Trouble ao usar ataque corpo a corpo direcionado contra esse alvo. Em ataques à distância ou testes que não são ataques, não deve haver Trouble.
6. Com **Defense Stance** ativa no alvo de Unflappable, confirmar indicação de duas fontes de Trouble e pedido de decisão do Mestre. Encerrar manualmente Defense Stance após acerto bem-sucedido antes de rolar novo ataque, pois essa parte continua manual.
7. Combinar Unflappable Poise e Real Jinx num único alvo: não deve haver segundo Trouble originado de Real Jinx.
8. Repetir com dois alvos diferentes no mesmo ataque; o sistema não pode aplicar um Trouble de um alvo ao outro silenciosamente.
9. Regressão: Anger, Energy Absorption como Jogador, Elemental Protection, Regain Focus, Do This All Day, Real Jinx isolado, chat de DANO, movimento e Team Maneuvers.

**Só considerar a v0.2.187 estável após validação real pelo Mestre.**
