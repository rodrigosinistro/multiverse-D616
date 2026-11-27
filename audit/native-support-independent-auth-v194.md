# Multiverse-D616 v0.2.194 — Validação da autorização de poderes de suporte

**Base:** pacote completo v0.2.193 (experimental). Última versão estável aprovada pelo Mestre: v0.2.189.

## Evidência da sessão real

O console de Mestre da v0.2.193 registra quatro falhas em `native-power-support.mjs:84` na expressão de vínculo entre token de origem e Actor de transporte. O console do Jogador apenas mostrou a falha genérica. O registro `Object` do erro não preserva os valores dos campos internos, portanto a condição individual exata não pode ser determinada apenas pelos logs.

## Ajuste

O `updateActor` de um Actor mundial continua autenticando o remetente pelo `userId` fornecido pelo Foundry. O Mestre agora valida a operação por posse (`OWNER`) **separada** no Actor do canal e no Actor efetivo do token recuperado da cena autorizada, sem exigir igualdade literal entre os IDs do canal e do token. O poder precisa existir no token e corresponder ao ID oficial previsto no registro. Não há execução de macros arbitrárias ou concessão de permissões extras.

Essa separação evita confundir um canal de comunicação autenticado com o personagem em que o efeito é aplicado. Health, Focus, Edge e demais efeitos permanecem no Actor efetivo do token.

## Cobertura automatizada

- Healing Hands, Soothing Touch, Rally on Me, Inspiration e Battle Plan usando Actor de transporte diferente do Actor efetivo do token.
- Autorizações negativas: jogador sem `OWNER` no lançador, sem `OWNER` no canal, token fora da cena, Item ausente e identidade oficial de poder inválida.
- Resposta do Mestre no canal original, processamento único e gasto único do Focus.
- Regressão completa do projeto: **1.092 testes aprovados, 0 falhas**.
- `README.md` e os sete compêndios preservados byte a byte em relação à v0.2.193.

## Checklist no Foundry VTT v14

1. Instalar a v0.2.194 e recarregar **Mestre e Jogador**.
2. Conectar um Jogador com `OWNER` na ficha Zima e selecionar o token que executará o poder.
3. Usar **Healing Hands** em um aliado adjacente com Health abaixo do máximo; escolher o alvo e confirmar a cura e o gasto de Focus apenas uma vez.
4. Usar **Soothing Touch** em um aliado adjacente com Focus abaixo do máximo.
5. Em combate ativo, ativar **Inspiration**, **Battle Plan** e **Rally on Me** em aliados elegíveis e verificar a seleção e expiração conforme as regras existentes.
6. Tentar usar um token sem permissão DONO para confirmar que o Mestre o rejeita.
7. Conferir a janela do Mestre em caso de rejeição: os campos de diagnóstico agora distinguem IDs de canal, token, Actor-base, Actor efetivo e permissões.

**Limitação:** testes Node não substituem testes com dois clientes reais. Não atualizar o GitHub até aprovação do Mestre.
