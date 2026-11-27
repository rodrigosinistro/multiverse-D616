# Multiverse-D616 v0.2.203 — auditoria tática e checklist

Base **v0.2.202** validada no Foundry. Este lote foi extraído do compêndio oficial real (não do nome isolado ou de uma lista inventada).

## Cobertura e limites

- **27 poderes auditados:** Healing 3, Luck 1, Martial Arts 9, Melee Weapons 3, Ranged Weapons 4, Tactics 3, Super-Speed 4.
- **3 automações parciais novas:** Change of Plans, Combat Support e Charmed Life.
- **24 permanecem sem nova automação neste lote:** embora algumas rolagens/condições já funcionem pelo motor legado, isso não equivale à automação integral da regra.
- **125 macros no Macros_D616**, com ícones dos Items e 27 pastas originais. Nenhuma macro executa código como GM.
- Os testes automatizados **não substituem o teste em Foundry v14 com dois clientes**.

## Casos para o Mestre e Jogador

1. **Change of Plans:** com um aliado de outro jogador, ativo na cena e audível, use o poder como PLAYER. Verifique 5 Focus, uma Reação, o card com a descrição oficial, e o Edge exibido no próximo teste de ação do aliado. Finalize o reroll manualmente. Confirme que o efeito desaparece após o card.
2. **Combat Support:** no mesmo cenário, use com 10 Focus. O **próximo** teste do aliado deverá ter Marvel M (1), sem permitir TROUBLE no dado Marvel. Execute outra rolagem do aliado e confirme que não há segundo dado forçado; repetir o poder neste combate deve ser bloqueado.
3. **Expiração:** prepare Change of Plans e não role. Avance a iniciativa ao próximo turno do lançador: o efeito deve sumir. Refaça com Combat Support. Teste quando a Reação é utilizada durante o turno de outro personagem.
4. **Charmed Life:** clique no poder pelo HUD (sem custo) e depois role uma habilidade sem outros Edges; deverá aparecer a fonte `Luck: Charmed Life` no card, com reroll manual. Nova ativação na mesma rodada deve ser recusada. Na rodada seguinte, o benefício pode ser preparado novamente. Teste também com outro Edge: Charmed Life não pode acrescentar um segundo Edge e não deve ser consumido em uma rolagem não elegível.
5. **Regressão:** Healing Hands e Soothing Touch com PLAYER/Mestre (protocolo atômico v0.2.196); descrições completas no chat; Edge/Trouble manuais; Anger, Jinx You, Blur, Scatter e o chat de dano de jogadores.

## Preservação

`README.md`, seis compêndios de origem, 398 poderes oficiais, Central, HUDs, Veículos e Team Maneuvers não foram editados. O protocolo de atualização de flag como string JSON (`nativeSupportPlayerRequestV2`/`nativeSupportPlayerResultV2`) foi preservado. Não publicar no GitHub. O aumento de 122 para 125 entradas indica apenas os três poderes parciais novos, não 125 automações completas.
