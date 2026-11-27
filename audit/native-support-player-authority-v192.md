# Multiverse-D616 v0.2.192 — Validação de poderes de suporte para jogador

## Causa identificada

O Mestre recebe a solicitação pelo Actor que teve as flags atualizadas. Em tokens não vinculados, esse Actor pode diferir do `token.actor` usado para executar o poder. O uso de `actor.items.get(itemId)` no Actor do pedido provocava “Poder oficial indisponível”; a checagem pelo UUID/actorId incorreto gerava “Selecione o token do personagem na cena dos alvos”.

## Correção localizada

1. Ao receber o pedido do jogador, validar `userId` autenticado, propriedade DONO no Actor de origem e vínculo com o token da cena.
2. Resolver o Actor efetivo **a partir do token**; procurar o item nele, exigindo a mesma identidade oficial `powerId` do registro interno e, em caso de IDs distintos, uma única correspondência válida.
3. Aplicar gasto/recuperação/efeitos somente no Actor efetivo e nos alvos validados.
4. Publicar o resultado de sucesso/falha de volta no **Actor que recebeu o pedido**, para que o jogador possa receber a confirmação.

## Checklist no Foundry v14

- Atualizar a versão para **Mestre e Jogador** e recarregar o mundo.
- Com um token não vinculado de jogador, usar Healing Hands no aliado **adjacente** (Health abaixo do máximo); abrir janela, escolher alvo, gastar 10 Focus. Confirmar que a cura entra e o Focus cai uma vez.
- Testar Soothing Touch com aliado sem Focus completo; confirmar recuperação e custo.
- Em combate ativo, usar Rally on Me com aliado elegível ao alcance, confirmar uma única utilização e limite de Vigilance.
- Testar Inspiration e Battle Plan com alvos aliados e confirmar um Edge temporário sem reroll automático.
- Testar os mesmos poderes com token vinculado; confirmar que nenhum item é duplicado.
- Cancelar a seleção de alvos; verificar que Focus/Ação/Reação ficam intactos.
- Sem permissão DONO ou tentando selecionar personagem de outro jogador como lançador, a solicitação deve ser recusada sem custo.

**Nota:** mensagem “Healing Hands exige tocar o alvo” é uma validação de alcance, não a falha de autorização. Os erros de `Force Client Settings` nos consoles são independentes do despachante. Foundry recomenda janela de no mínimo 1024×768; o teste anterior usou janela menor, o que pode prejudicar a posição dos diálogos.

A v0.2.189 permanece a última versão plenamente aprovada; v0.2.192 é experimental até validação no Foundry.
