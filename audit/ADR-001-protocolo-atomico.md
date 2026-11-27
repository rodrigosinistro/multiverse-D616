# ADR-001 — Protocolo atômico de automações entre Mestre e Jogador

**Projeto:** Multiverse-D616 · Foundry VTT v14  
**Base validada no Foundry:** v0.2.196 · 19/11/2026  
**Estado:** DECISÃO ARQUITETURAL OBRIGATÓRIA para próximas automações que alteram personagens de outro jogador.

## Defeito que foi observado

Nas versões v0.2.191 até v0.2.195, ativações de Healing Hands, Soothing Touch, Rally on Me, Inspiration e Battle Plan funcionavam pelo Mestre, mas falhavam como PLAYER. Os consoles do Mestre mostravam em alguns testes `scene=none`, `source=none`, `targets=invalid`, e mensagens como “Cena da solicitação não encontrada”. **Não era necessário afrouxar a checagem de permissão ou continuar alterando a busca de tokens.**

A causa comprovada era o uso de um **objeto aninhado** nas flags do Actor (`nativeSupportPlayerRequest` / resultado): o hook `updateActor` recebe o *diff das propriedades alteradas*, não necessariamente o objeto completo. Em ativações repetidas com a mesma cena, token e alvos, algumas propriedades não mudavam e eram omitidas no diff. O receptor tentava usar esse fragmento como se fosse a requisição completa.

## Solução aprovada

1. O jogador escolhe poder, valor de Focus e alvos no HUD/ficha e no seletor de alvos padrão. Cancelamento não consome recursos.
2. O jogador escreve **um único campo de string JSON serializada** em `flags.multiverse-d616.nativeSupportPlayerRequestV2` do **Actor mundial** autorizado. A serialização deve incluir o pacote inteiro: id único da solicitação, cena, token de origem, Actor-base, poder oficial, alvos e custo, conforme aplicável.
3. O hook de `updateActor` no Mestre recebe **o `userId` autenticado pelo Foundry** e decodifica o pacote inteiro recebido no campo alterado. Nunca usar um `userId` fornecido pelo próprio pacote como prova de identidade. Não confiar em sockets simples como canal de autorização para executar código de Mestre.
4. O Mestre resolve a cena e o token pelos documentos da cena, determina o **Actor efetivo do token** (incluindo `ActorDelta` quando não vinculado), confirma permissão **DONO** do solicitante no Actor de transporte e no personagem, e verifica o poder oficial cadastrado no registro interno.
5. Validar no Mestre as regras de custos, alcance, alvos, limite por combate, expiração e execução única. **Somente operações predefinidas do motor** são executadas; nunca JavaScript fornecido pela macro ou pelo cliente.
6. O Mestre grava confirmação ou erro em **um campo atômico** `flags.multiverse-d616.nativeSupportPlayerResultV2` no Actor mundial. O cliente identifica a resposta pelo id do pedido.
7. Garantir proteção contra replay, tentativas de gasto duplicado e alterações de recurso em caso de falha/cancelamento.

## Antipadrões proibidos

- Reintroduzir pedidos/respostas como objetos aninhados atualizados diretamente em flags e esperar que o hook entregue o objeto inteiro.
- Presumir que Actor sintético, Actor-base e seus Item IDs sejam idênticos nos dois clientes.
- Dar permissão DONO às macros ou executar código arbitrário com autoridade do Mestre.
- Aplicar Focus, Health ou ações antes de a validação de alvos terminar; cobrar recursos duas vezes no fluxo Mestre/Jogador.
- Reativar rerolls automáticos de Edge/Trouble líquidos.

## Código e testes de referência

- `scripts/native-power-support.mjs` v0.2.196: `REQUEST`, `RESULT`, `encodeSupportPacket`, `decodeSupportPacket`, `supportRequestChannel`, `resolveSupportGMContext`, emissor, `updateActor` e resposta.
- `CHANGELOG.md` seção **v0.2.196**: causa real, alteração e preservações.
- `tests/` da v0.2.196: cenário de diffs parciais e ciclo Mestre/Jogador.
- Regra de regressão obrigatória: **repetir duas ativações na mesma cena com os mesmos alvos**, mudando apenas o custo ou o poder, com Mestre e Player conectados. Confirmar aplicação única, Focus único, permissão DONO e resposta.

## Evidência prática de validação

O usuário confirmou o funcionamento real em 19/11/2026, com screenshots simultâneos de Mestre e Player. Healing Hands aplicou Health e descontou Focus, e Soothing Touch aplicou Focus, nos dois clientes. Isso torna **v0.2.196 a base aprovada para o próximo desenvolvimento**, sem declarar que versões anteriores tiveram o mesmo resultado.

## Instruções de entrega

Usar ZIP completo da última versão aprovada. Preservar `README.md`, todos os compêndios originais e o `Macros_D616`; atualizar `CHANGELOG.md`; executar os testes; não publicar diretamente no GitHub. Qualquer evolução do transporte deve incluir teste real com Mestre e Player e motivo técnico explícito.
