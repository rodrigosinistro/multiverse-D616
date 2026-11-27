# Multiverse-D616 v0.2.195 — Validação de suporte com Mestre e Jogador

## Origem do ajuste

Na v0.2.194, o console do Mestre registrou repetidamente `Token de origem inválido na cena selecionada.` dentro de `resolveSupportGMContext()` antes da transação de Healing Hands / Soothing Touch / poderes táticos. As mensagens `Healing Hands exige tocar o alvo` e `Soothing Touch: o alvo não precisa recuperar Focus` também aparecem; essas são regras legítimas, não erro de comunicação.

## Alterações limitadas

1. O token da origem e os alvos são confirmados pela **coleção da cena** (`scene.tokens`) em vez de uma igualdade rígida com `token.parent.id`.
2. A solicitação inclui `sourceActorId` como referência ao Actor-base. Se o ID de token não for encontrado, só se permite identificar a origem se existir **um único** token do Actor-base na mesma cena e o jogador realmente tiver permissão DONO no Actor efetivo. A origem nunca é escolhida de outra cena.
3. O Mestre valida novamente o Actor, o Item oficial, as permissões, o custo, os alvos e os recursos antes de aplicar os efeitos.
4. O console do Mestre agora fornece uma linha textual com prefixo `[D616][SUPPORT-GM]` e indica `sceneFound`, `sourceFound`, `sceneTokens`, `channelOwner`, `sourceOwner`, etc. Isso preserva a evidência nos arquivos de console exportados.

## Teste prático recomendado

- Feche ou recarregue as duas sessões (Mestre e Jogador) após instalar o ZIP.
- Controle **Zima** como jogador e selecione o token dela na mesma cena em que o Mestre está.
- Coloque um aliado **adjacente** à Zima, com Health reduzido (por exemplo, 40/100), e use **Healing Hands** pelo HUD. Confirme abertura da janela, escolha do alvo, gasto único de Focus e cura no alvo.
- Reduza também o **Focus do aliado** antes de testar **Soothing Touch**; com Focus cheio, o poder deve avisar que não há o que recuperar.
- Com combate ativo e um aliado válido, teste **Inspiration**, **Battle Plan** e **Rally on Me**; confira seleção, efeitos e limites.
- Se ocorrer rejeição, copie o texto completo da linha `[D616][SUPPORT-GM]` do console do Mestre junto ao console do Jogador. Isso permite distinguir falha de cena, de origem, de permissão e de ID de Item sem outra hipótese às cegas.

## Testes automatizados

Executar `node --test tests/*.test.mjs` no diretório raiz do sistema. Nesta versão: **1.096 testes aprovados, zero falhas**. Esses testes incluem cenário com `parent` indisponível, recusa de token/Actor falsificados, fallback único seguro, ambiguidade e proibição de personagens não pertencentes ao usuário. Não substituem a validação real no Foundry v14.

## Preservação

`README.md`, os seis compêndios oficiais e `packs/macros-d616` intactos em relação à v0.2.194. Sem alterações no motor de combate, RD, HUD, Focus, custos ou fórmulas dos poderes. Não publicar no GitHub.
