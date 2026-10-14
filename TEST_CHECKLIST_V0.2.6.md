# Roteiro de testes — Multiverse-D616 v0.2.6 (Foundry VTT v14)

**Antes:** faça backup do mundo e da instalação do sistema, extraia o ZIP instalável na pasta `Data/systems`, com a pasta `multiverse-d616`, e reinicie o Foundry.

1. Confirme `0.2.6` em Configuração de Sistemas.
2. Em um personagem com **Shrink 1**, abra os atalhos nativos > **POWERS**: `Shrink 1` deve aparecer apesar da duração Permanente. Ao clicar, escolha Normal ou **Little**.
3. Em **Shrink 2**, a janela deve mostrar Normal, Little e **Tiny** (até 10,16 cm). Shrink 3 acrescenta **Miniature** (até 2,54 cm); Shrink 4 acrescenta **Microscopic** (até 6,35 mm).
4. Escolha cada tamanho na ficha e confira modificadores de defesa, movimentação, alcance e retorno ao tamanho natural. Observe que tokens já colocados na cena não são redimensionados automaticamente.
5. Clique **Cancelar**: nenhum efeito, consumo ou chat novo deve ser produzido.
6. Use Shrink duas vezes e confirme que fica **apenas um** efeito de Encolhimento. Retorne ao Normal e confirme a remoção.
7. Se o personagem tiver Grow e Shrink, alterne entre eles: nunca deve haver dois efeitos ativos de Resize. O poder escolhido por último vence.
8. Em personagem com **Unusual Size**, confira que o tamanho natural e bônus correspondentes permanecem íntegros após o retorno ao Normal.
9. Repita em ficha de **NPC**, usando atalho e ficha. Outros poderes Permanentes (Mighty, Sturdy, Flight) devem continuar ocultos no HUD.
10. Confirme regressão de **Grow 1–4**, incluindo seleção, normalização e limites, e as velocidades dentro/fora de combate da v0.2.5.
11. Publicar no GitHub somente **após aprovação dos testes locais**; criar release `v0.2.6` e anexar ZIP instalável completo.
