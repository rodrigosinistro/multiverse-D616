# Migração 0.1.73

Esta versão não altera Items, Combats ou compêndios. O HUD de Ações nativo da v0.1.72 é preservado integralmente.

## Módulos externos

Depois de substituir a pasta do sistema, desative no mundo:

1. **D616 Extempore Effects**;
2. **Token Action HUD Multiverse-D616**;
3. **Token Action HUD Core**.

O HUD de Ações continua funcionando diretamente pelo Multiverse-D616, sem Token Action HUD Core. O antigo módulo Extempore não é mais necessário: seu menu manual foi substituído pelo novo comportamento automático dos Powers em Concentração.

## Limpeza automática

Ao abrir o mundo como Mestre, registros transitórios reservados são removidos do cadastro `customConditions` e continuam fora de `CONFIG.statusEffects`. Essa limpeza não apaga Active Effects legados já aplicados nos tokens.

Ao usar um Power com duração Concentração, sua condição é criada somente como Active Effect no ator do token. O nome e o ícone vêm do Power, e o tooltip usa seu campo Descrição. Ao encerrar a concentração, esses documentos transitórios são apagados.

## Instalação manual

Feche o Foundry VTT, substitua integralmente a pasta `Data/systems/multiverse-d616`, desative os três módulos listados acima e abra o mundo novamente.
