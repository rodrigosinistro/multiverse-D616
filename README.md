# Multiverse-D616 (Foundry VTT System)

Sistema **Multiverse-D616** para **Foundry VTT v14**.

## Instalação (Manifest)

Cole este link no instalador de sistemas do Foundry:

```text
https://raw.githubusercontent.com/rodrigosinistro/multiverse-D616/main/system.json
```

## Recursos nativos integrados

- Hover Tooltips
- Chat Power Details
- Damage Reduction Helper
- Conditions HUD
- Condições automáticas de Powers em Concentração
- Efeitos visuais opcionais para Poderes e Armas (via Sequencer, com biblioteca pesquisável e configuráveis por Item)
- HUD de Ações para **ABILITIES** e **POWERS**, incluindo Armas equipadas e poderes associados aos equipamentos
- Charactermancer (assistente de criação)
- PDF Export
- Power Sets custom (suporte a Power Sets novos sem crash na ficha)
- Focus em Powers (custo automático):
  - Custo fixo (ex.: `5 Focus`) é deduzido automaticamente ao usar o poder
  - Custo variável (ex.: `5 ou mais Focus`) abre automaticamente um diálogo para escolher o gasto
- Armas e Itens com poderes associados por arrastar e soltar, com edição independente dos poderes do personagem
- Poderes permanentes em equipamentos: efeitos passivos aplicados ao portador, sem acumular versões do mesmo poder (prevalece a mais forte)
- Active Effect **Adamantium** em armas, permitindo ignorar níveis configuráveis de Redução de Dano de Health
- Visualização compacta opcional de combate: Ações e Reações sobre tokens, quatro indicadores de Movimento e ordem de iniciativa horizontal (janela de turno detalhada continua disponível)
- Distância e acompanhamento nativos de movimento para tokens, considerando o modo de deslocamento selecionado (Caminhada, Voo, Natação, Escalada etc.)
- Central de Automações: regras personalizadas com gatilhos, condições e efeitos, configuração de rotinas nativas e biblioteca de modelos com importação/exportação JSON
- Central de Diagnóstico: verificação sob demanda e somente leitura de compêndios, automações, fichas e dependências, com exportação de relatório JSON
- Fichas próprias de Veículos, com tripulação embarcada, funções, visibilidade configurável por veículo e movimento conjunto dos tokens
- Health e Focus máximos calculados automaticamente para personagens, NPCs e veículos, com suporte a modificadores de Active Effects
- Compêndios de Powers, Traits, Tags, Origins, Occupations e Items

## Veículos e tripulação

Crie veículos em **Atores → Criar Ator → Veículo**. A ficha mantém o visual do sistema e apresenta **Abilities**, **Damage**, **Movimento**, **Powers**, **Traits & Tags** e **Tripulação**. O Mestre pode embarcar personagens com tokens na mesma cena, atribuir funções (piloto, copiloto, operador ou passageiro) e escolher se os passageiros ficam visíveis ou ocultos no mapa. Os tokens embarcados acompanham a nave e não se movimentam independentemente enquanto estiverem a bordo.

Ao embarcar, o jogador que possui o personagem recebe acesso **OWNER** ao veículo, podendo movimentá-lo e usar seus poderes. **O desembarque não revoga essa permissão**: se necessário, o Mestre pode alterá-la manualmente nas permissões do veículo. Por enquanto, o transporte de tripulantes é limitado à mesma cena; a função de piloto não concede, por si só, permissões adicionais.

## Health e Focus automáticos

Para personagens, NPCs e veículos, os valores máximos são calculados a partir dos atributos: **Health = máximo entre 10 e Resilience × 30**; **Focus = máximo entre 10 e Vigilance × 30**. Poderes, traços e tags que tenham **Active Effects configurados** podem modificar os totais. Ao recalcular os máximos, o sistema preserva o dano sofrido e o Focus já consumido, em vez de restaurar automaticamente os recursos.

## Documentação

Este README descreve as funcionalidades permanentes do projeto. Consulte **[CHANGELOG.md](CHANGELOG.md)** para o histórico de versões e **[MIGRATION_NOTES.md](MIGRATION_NOTES.md)** para observações de migração quando aplicáveis. As alterações entre versões são documentadas no CHANGELOG, não neste README.

## Compatibilidade

- **Foundry VTT v14** (minimum 14, verified 14).

## Créditos e Referências

Este sistema foi **baseado** e **adaptado** a partir do código do **sistema Marvel Multiverse (D616) para Foundry VTT** e de módulos da comunidade.

Todos os créditos aos **autores(as) originais** do sistema e dos módulos citados. Este fork renomeado e integrado existe apenas para fins de compatibilidade e melhoria do fluxo de jogo, mantendo os respectivos créditos aos criadores originais.

Caso você seja autor(a) de alguma parte e deseje um crédito específico (nome/link), abra uma issue que atualizaremos este README.

---

# MarvelMultiverse RPG System!

## The __Unofficial__ Multiverse-D616 Role Playing Game System for Foundry VTT

This is an unofficial implementation of the [Multiverse-D616 Role Playing Game](https://www.marvel.com/rpg) table top role playing game for [Foundry VTT](https://foundryvtt.com), providing character sheet, dice and game system support.

This system is a fan made work, and is not associated with Marvel Entertainment, LLC, The Walt Disney Company, or their partners in any way.

This system provides character sheet support for Actors and Items, mechanical support for dice, and tools to facilitate gameplay in Foundry VTT. It is not a substitute for the official Marvel Multiverse Role-Playing Game books. To play the game as intended, consult the official sourcebooks. Marvel names, characters, and trademarks remain the property of their respective owners.

The software component of this system is distributed under the MIT license.

## Installation Instructions

To install and use the Multiverse-D616 Role Playing Game system for Foundry Virtual Tabletop you will need a licensed copy of a currently supported version of [Foundry VTT](https://foundryvtt.com/purchase/).

![Foundry v14](https://img.shields.io/badge/foundry-v14-green)

### Easy Install

In your Foundry setup page, copy and paste the manifest link above into the **Install System** dialog on the Setup menu of the application.

Updates are released often. If you upgrade and discover an issue, please [submit an issue](https://github.com/rodrigosinistro/multiverse-D616/issues).
