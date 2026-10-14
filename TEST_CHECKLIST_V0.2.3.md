# Checklist de testes — Multiverse-D616 v0.2.3 / Foundry VTT v14

1. Faça backup do mundo. Feche o Foundry e substitua a pasta do sistema `Data/systems/multiverse-d616` por esta pasta completa.
2. Abra como Mestre. Verifique versão 0.2.3 nas configurações. Aguarde a migração de fichas.
3. Com personagem **Stilt Steps** e Run 5/Climb 3: confirmando sem combate, Run 10 e Climb 6; no combate mantenha os mesmos benefícios. Poder não deve gerar efeito temporário ao ser usado.
4. Com personagem **Flight 2 + Jump 1/2/3**: Jump fica ativo, mesmo depois de retirar/adicionar Flight 2. Faça o teste também com personagem antigo migrado.
5. **Shield 1–4**: antes de usar o poder, DR de Saúde não aumenta. Ao usá-lo, Concentração cria DR igual ao nível. Remover o status encerra o DR. Em conjunto com outra proteção, prevalece maior DR, sem acumular.
6. **Extended Reach**: alcance base 1. Apenas nível 1 ⇒ alcance 4; nível 2 ⇒ 10; níveis 1 e 2 ⇒ 10 (não 40). Com tamanho Huge ⇒ 50. Voltar a Average ⇒ 10. Teste ficha antiga migrada.
7. **Body Sheet**: apenas durante Concentração oferece DR 3 e Planar; bloqueio de ataques permanece. Remova a Concentração e confirme reversão.
8. **Não regressão**: Mighty/Accuracy/Brilliance/Discipline 1–4, Flexible Bones 2, Flight 1/2 ×50, Speed Run 1/2 ×50, Speed Swim, Jump 2/3, tamanho, Speed de combate/fora de combate e NPCs.
9. Teste ficha de jogador e NPC, como Mestre e como jogador dono. Confirme que compêndios de poderes e Charactermancer carregam corretamente.
10. Só depois de validar localmente, crie release no GitHub: tag `v0.2.3` e asset `multiverse-d616-v0.2.3.zip`.
