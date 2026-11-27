# Validação v0.2.183 — Energy Absorption para Jogador

## Caso principal

1. Backup do mundo e instalação do ZIP completo no Foundry VTT v14. Conecte Mestre e Jogador em sessões separadas.
2. Confirme que o Jogador tem permissão **DONO (OWNER)** sobre **o personagem**, não sobre todas as macros. As macros do compêndio `Macros_D616` são referências; jogador não precisa executá-las.
3. Em combate, inicie rodada nova para zerar os gastos remanescentes de testes anteriores, com pelo menos 15 Focus e 1 Reação disponível.
4. Como Jogador, ative **Energy Absorption** pelo HUD ou ficha. Confira redução de 15 Focus, consumo de exatamente 1 Reação (ícone escurecido), criação do status **Preparado** e mensagem no chat.
5. Provoque dano Health, confirme a conversão em Focus, limite 2×, status **Ativo**, consumo posterior do crédito e remoção dos efeitos.
6. Repita quando todas as Reações já tiverem sido gastas. O poder deve recusar a ativação **sem alterar Focus nem o indicador de Reação**.
7. Repita com menos de 15 Focus e sem combate ativo. Não deve haver gasto de recursos.
8. Valide que o mesmo poder funciona como Mestre. Confirme ausência de duplicação de gasto e de status.

## Regressões

- Elemental Protection 1 em Zima como Jogador: mesmo comportamento da v0.2.182.
- Anger: bônus fixo Melee, penalidade Logic e expiração por Concentração.
- Lightning Actions: mantém dependência da regra da Central.
- HUD persistente e clássico: indicadores de Reação atualizados após o registro feito pelo Mestre.
- Macro compendium: pastas e 7 entradas preservadas, acesso de visualização do Jogador.

## Limitações

- O canal genérico de solicitações do Controle de Turno ainda não foi reescrito. Esta versão corrige apenas o fluxo de Energy Absorption para Jogador.
- Sem validação manual no Foundry real, a v0.2.183 é experimental. Se a atualização do Actor do Jogador estiver bloqueada por alguma configuração do mundo, o pedido será negado sem gasto.
