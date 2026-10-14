# Roteiro de testes — Multiverse-D616 v0.2.7 (Foundry VTT v14)

**Preparação:** faça backup do mundo; substitua a pasta `Data/systems/multiverse-d616` usando o ZIP completo, reinicie e teste primeiro em uma cena de cópia. Abra a configuração do token: em v14 os campos de tamanho são X, Y e Z.

1. Abra um token de personagem *vinculado* na cena, use Grow 1 → **Big**. Confira X=2, Y=2 e Z=2 tanto no token da cena quanto no token padrão da ficha.
2. Grow 1 → **Huge**: X=Y=Z=3. Teste Grow 2 → **Gigantic** (5), Grow 3 → **Titanic** (8), Grow 4 → **Gargantuan** (10).
3. Use Grow → **Tamanho normal** em personagem Average e confira 1,1,1. Repita em personagem natural Big e confirme 2,2,2, preservando bônus naturais.
4. Shrink 1 → **Little** (0,7); Shrink 2 → **Tiny** (0,5); Shrink 3 → **Miniature** (0,3); Shrink 4 → **Microscopic** (0,1). Confira cada valor nos 3 eixos.
5. Shrink → **Tamanho normal** retorna à categoria natural, e escolher Cancelar não altera token/efeitos/foco.
6. Alterne Grow 4 / Shrink 4 no mesmo personagem. Confira que só existe um efeito temporário e que X/Y/Z acompanham a última escolha.
7. Altere diretamente o campo de tamanho na ficha de personagem e na ficha de NPC, incluindo Small (0,9) e Average (1). Confira X/Y/Z e a remoção de Grow/Shrink quando a mudança for manual.
8. Para token **não vinculado**, coloque dois exemplares do mesmo NPC e aplique Shrink em um deles. Confira que apenas o token usado muda; o outro e o token padrão do NPC não mudam.
9. Com dois tokens **vinculados** do mesmo personagem na mesma cena, uma mudança deve atualizar ambos e o protótipo.
10. Faça Grow/Shrink com um personagem **sem token na cena**: deve alterar o token padrão para futura colocação na cena.
11. Antes e depois de cada transformação, confira que a posição x/y, a elevação e a escala da textura/artwork permanecem intactas. Teste movimentação e colisões nos valores grandes.
12. Exclua ou desative manualmente um efeito Grow/Shrink: as dimensões devem retornar à categoria natural (ou ao efeito restante, se aplicável).
13. Se havia um efeito de tamanho antigo com `prototypeToken.width`/`height`, use Grow/Shrink e confira que a ficha não volta a dimensões erradas.
14. No HUD, Grow/Shrink 1–4 ainda devem aparecer na aba POWERS. Os demais poderes permanentes continuam ocultos. Teste concentrações, movimento e fichas antigas.
15. Use uma cena com personagem que já estava transformado na v0.2.6. Ao carregá-la como Mestre, o token deve passar a adotar as novas dimensões X/Y/Z.
16. Só publique no GitHub depois de validar localmente. Os artefatos ZIP instalável e fontes são separados.
