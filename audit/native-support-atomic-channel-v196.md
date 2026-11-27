# Multiverse-D616 v0.2.196 — Protocolo atômico de suporte

## Diagnóstico real

O console do Mestre da v0.2.195 mostrou `scene=none source=none targets=invalid` em um pedido do jogador. A chamada `channel.update({"flags.multiverse-d616.nativeSupportPlayerRequest": {...}})` continha um objeto com propriedades repetidas entre ativações. Foundry envia no `updateActor` um diff das propriedades modificadas; o receptor interpretava aquele diff como objeto completo e perdia `sceneId`, `sourceTokenId` e `targetIds`. Corrigir comparação de IDs de cena/token não resolvia a ausência desses campos.

## Correção

A requisição agora usa a flag textual `nativeSupportPlayerRequestV2` (JSON serializado) e a resposta `nativeSupportPlayerResultV2`. A string muda integralmente em cada ativação (inclui id único) e o evento de atualização recebe uma única propriedade indivisível. O transporte continua usando `updateActor` com `userId` fornecido pelo Foundry, em vez de socket comum com remetente declarado pelo cliente. O Mestre resolve os documentos da cena e valida autorização antes de efeitos.

## Verificação no Foundry v14

1. Reiniciar/recarregar completamente **Mestre e Jogador** na v0.2.196; confirmar versão nos consoles.
2. Escolher token da Zima com permissão DONO; marcar como alvo um aliado adjacente com Health reduzido; usar **Healing Hands** pelo HUD, selecionar o alvo na janela e confirmar. Verificar Focus único no lançador, Health no alvo e confirmação no chat.
3. Usar **Soothing Touch** em aliado com Focus reduzido.
4. Em combate, usar **Rally on Me** e conferir Focus dos aliados e restrição de uma utilização por combate.
5. Usar **Inspiration** e **Battle Plan**, conferir Edge sem reroll automático e expiração no turno correto.
6. Repetir com tokens vinculados/não vinculados e personagens controlados por jogadores diferentes. Cancelar a janela: nenhum recurso consumido.
7. Verificar logs do Mestre `[D616][SUPPORT-GM]` apenas se houver rejeição. Caso apareça `scene=none` novamente, capturar ambos os consoles; a nova flag textual deverá permitir identificar problemas de instalação/reload ou outro problema diferente.

**Nota:** teste offline não substitui a validação com dois clientes reais. A v0.2.189 é a última versão validada antes deste lote; manter backup.
