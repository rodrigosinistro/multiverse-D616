# Checklist de testes — Multiverse-D616 v0.2.4 (Foundry VTT v14)

1. Faça backup do mundo, substitua a pasta `Data/systems/multiverse-d616` pela deste ZIP e abra o mundo como Mestre.
2. Confirme **0.2.4** em Configurações > Sistemas.
3. Coloque **Grow 1** numa ficha (tamanho Average), clique no poder: opções **Normal, Big (1,83–2,44 m), Huge (2,44–7,32 m)**; não deve listar Gigantic, Titanic ou Gargantuan.
4. Com **Grow 2**, deve aparecer também **Gigantic**. Com **Grow 3**, **Titanic**. Com **Grow 4**, **Gargantuan**.
5. Clique **Cancelar**: o tamanho, o combate, os efeitos e o chat devem continuar inalterados.
6. Escolha **Huge**: a ficha deve passar a **Huge**; conferir alcance, defesa, multiplicador de dano Melee e as velocidades em/fora de combate.
7. Com Grow 4, mude de Huge para Titanic: deve existir **somente um efeito de Crescimento**, e não somar os modificadores de ambos os tamanhos.
8. Escolha **Tamanho normal**: volta para o tamanho natural original sem perder outros poderes/efeitos.
9. Teste com personagem naturalmente **Big** (ou trait Unusual Size). A janela só mostra tamanhos MAIORES que o natural e seus bônus naturais não devem acumular com o Crescimento.
10. Teste também na ficha de NPC, dentro e fora de combate.
11. Ainda crescido, altere manualmente o tamanho da ficha: o efeito Grow deve sair e a nova escolha manual prevalecer.
12. Faça um teste de regressão com Flight 2, Speed Run 2, Stilt Steps, Body Sheet, Shield e Extended Reach, mantendo os ajustes da v0.2.3.
13. Publique no GitHub apenas após a validação local. Release sugerida: `v0.2.4` e arquivo `multiverse-d616-v0.2.4.zip`.

**Nota:** os testes de código não substituem uma rodada dentro do Foundry v14 com personagens e tokens reais. O sistema não altera as dimensões do TokenDocument em cena diretamente; utiliza os efeitos de tamanho já existentes.
