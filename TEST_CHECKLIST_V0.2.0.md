# Multiverse D616 v0.2.0 — Checklist para Foundry VTT v14

## Antes de testar
- Faça cópia de segurança do mundo e do sistema.
- Pare o Foundry e substitua totalmente `Data/systems/multiverse-d616` pela pasta do ZIP.
- Confirme `system.json` com versão `0.2.0`. Reabra o mundo e atualize o navegador sem cache.

## Testes de personagem e NPC
- [ ] Abra uma ficha de personagem Rank 3, Agility 4 e Average: Run 5, Climb/Jump/Swim 3, Flight 1 ativo 15.
- [ ] Mude Agility para 5: Run 6, Flight 18, e os modos básicos acompanham Run.
- [ ] Retorne Agility para 4, selecione Big: Run 6; selecione Small: Run 4.
- [ ] Selecione Little: Run 1; Tiny/Miniature/Microscopic: Run 0; confirme que o voo com Flight 1 permanece 15.
- [ ] Selecione Huge: Run 25; Gigantic: Run 100; Titanic: Run 400; Gargantuan: Run 1600.
- [ ] Confirme que alcançar (Reach) é multiplicado pelo tamanho em personagens sem efeitos específicos de alcance.
- [ ] Repita ao menos Average, Huge e Little com uma ficha de NPC, confirmando que poderes funcionam normalmente.
- [ ] Após trocar de tamanho várias vezes, não ficam efeitos antigos de tamanho duplicados ou sobrepostos.

## Unusual Size e Flight
- [ ] Importe o Sentinela MK III antigo com Unusual Size: Run 25, Flight 18; fora de combate Flight 54.
- [ ] Remova Unusual Size mas mantenha Huge Effects: Run 25, Flight 15; fora de combate Flight 45.
- [ ] Com o traço Unusual Size e tamanho natural Huge, aplique um efeito temporário de Resize para Little: Run muda; Flight permanece 18.
- [ ] Teste Flight 2 e confira multiplicador fora de combate ×50 do Flight final.

## Outros movimentos / efeitos
- [ ] Speed Run 1/2 (Rank 3): Run regular ×3; o Flight 1 não multiplica Speed Run outra vez.
- [ ] Combine Speed Run e Jump 1: aplique a regra de maior resultado por poder; o poder Jump usa Run regular, sem multiplicar Speed Run novamente.
- [ ] Teste Glide, Swingline e Levitation com seus respectivos poderes.
- [ ] Aplique Elemental Control (Earth): movimentos de combate e fora de combate sofrem a redução; removendo o efeito, voltam ao normal.
- [ ] Confirme Health, Focus, rolagens, Concentração, tracker e os painéis Powers / Traits & Tags sem regressões.
- [ ] Faça ao menos um teste com GM e um jogador dono da própria ficha.

## Regressão isolada (fora do Foundry)
Execute com Node.js 20 ou superior:
`node tests/movement.test.mjs`

Observação: testes isolados não executam a interface/ActiveEffects reais do Foundry. Os dois JSONs do Sentinela usados no desenvolvimento não estão incluídos no pacote público.
