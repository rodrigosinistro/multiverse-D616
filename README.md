# Multiverse-D616

Sistema de jogo para **Foundry VTT v14** baseado no Marvel Multiverse RPG (D616), com fichas de personagem/NPC, rolagem personalizada de dados Marvel, automações auxiliares e ferramentas integradas usadas pela mesa.

## Versão

- **Versão do sistema:** 0.1.74
- **Compatibilidade:** Foundry VTT v14 (`minimum: 14`, `verified: 14`)
- **ID / pasta interna:** `multiverse-d616`
- **Manifest:** `https://raw.githubusercontent.com/rodrigosinistro/multiverse-D616/main/system.json`

## Atualização v0.1.74 — AutoAnimations em Powers concentrados

- Configurações personalizadas do **AutoAnimations** salvas diretamente em um Power de duração **Concentração/Concentration** passam a ser copiadas para o Active Effect transitório criado pelo sistema.
- Isso permite configurar no próprio Power animações persistentes **On Token** (por exemplo, escudos JB2A) sem cadastrar cada Power no Automatic Recognition → Active Effects.
- Cada Power preserva sua própria animação, variante e cor; personagens com Powers de mesmo nome podem usar visuais diferentes.
- O sistema não depende do AutoAnimations nem do JB2A: se esses módulos não estiverem ativos, a mecânica de Concentração continua funcionando normalmente.

## Atualização v0.1.73 — Powers em Concentração

- Usar um Power com duração **Concentração/Concentration** cria automaticamente uma condição transitória própria no token.
- A condição mostra o nome e o ícone do Power. Ao passar o mouse, o tooltip exibe o campo **Descrição** do Power.
- Essa condição existe somente como Active Effect no ator do token: não entra na lista customizada nem na paleta de atalhos do Token HUD.
- Reutilizar o mesmo Power atualiza sua condição sem duplicá-la e sem consumir outro nível.
- Remover uma condição de Power reduz o nível **Concentração N** correspondente; remover a condição genérica encerra todos os Powers concentrados.
- O menu manual do Extempore foi removido. O HUD de Ações nativo da v0.1.72 permanece inalterado.

## Atualização v0.1.72 — Extempore e HUD de Ações nativos

- **D616 Extempore Effects** agora faz parte do sistema base. Pelo menu de contexto do chat, ele cria um `ActiveEffect` somente no token/ator selecionado.
- O efeito Extempore não é cadastrado na lista de condições, não é salvo como atalho reutilizável e não aparece na paleta de condições do Token HUD. Ao removê-lo, o documento temporário é apagado.
- As abas **ABILITIES** e **POWERS** do Token Action HUD agora são fornecidas por um HUD nativo, móvel e minimizável.
- O HUD nativo não depende de **Token Action HUD Core** nem de socketlib. Powers continuam usando `Item.roll()` e preservam todo o fluxo do sistema.
- Depois da atualização, desative os módulos externos **D616 Extempore Effects**, **Token Action HUD Multiverse-D616** e **Token Action HUD Core**.

## Atualização v0.1.69 — Atributos nos ataques

- Powers e armas voltam a somar o atributo selecionado à fórmula e ao total do ataque.
- O modificador aparece no card de rolagem e também é considerado na comparação contra a defesa do alvo.
- A correção vale para ficha, macro e Token Action HUD e evita duplicação em fórmulas personalizadas.

## Atualização v0.1.68 — Card de iniciativa limpo

- Rolagens de iniciativa não exibem mais o botão **DAMAGE**.
- O botão continua disponível normalmente em ataques e outras rolagens que podem causar dano.

## Atualização v0.1.67 — Edge/Trouble na iniciativa

- Rolagens de iniciativa ficam vinculadas explicitamente ao Combat e ao Combatant corretos.
- Usar **EDGE** ou **TROUBLE** no card recalcula o total e reordena imediatamente a iniciativa.
- Personagens com modificador de iniciativa precisam escolher um dado ou clicar em **Manter iniciativa**.
- O combate aguarda todas as decisões de Edge/Trouble antes de começar automaticamente.
- O mesmo modificador de iniciativa não pode ser aplicado duas vezes no mesmo card.

## Atualização v0.1.66 — Controles de combate e iniciativa distribuída

- O Mestre controla o encontro pelo próprio Quadro de Controle de Turno: iniciar, retroceder, avançar e finalizar.
- Ao iniciar, cada jogador recebe um popup para rolar a iniciativa dos personagens que controla.
- O Mestre rola, em um popup separado, pelos combatentes sem jogador ativo responsável.
- O combate começa automaticamente quando todas as iniciativas forem registradas.
- O pedido pode ser reenviado para quem fechou o popup sem rolar.

## Atualização v0.1.64 — Controle de Turno sem bloquear o canvas

- O cronômetro agora é um botão real nas ferramentas de Token do Mestre.
- Abrir a janela não troca a camada ativa nem interrompe seleção, movimento, alvo ou controles do combate.
- O movimento é consolidado pelo Mestre primário para evitar duplicidade entre clientes.
- Retratos inválidos deixam de ser requisitados novamente a cada atualização da janela.

## Atualização v0.1.63 — Movimento em qualquer tipo de grade

- Conta movimento em grades quadradas, hexagonais e cenas sem grade.
- Usa o movimento oficial do Foundry v14 e possui fallback para atualizações diretas de coordenadas.
- Associa a movimentação ao Token/Combatant correto, inclusive fora do turno ativo.
- Exibe um ícone de cronômetro na barra de ferramentas à esquerda para reabrir a janela do Mestre.

## Atualização v0.1.62 — Rastreamento preciso de ações e movimento

- Reações usadas fora do turno ativo são registradas no combatente correto.
- Powers com múltiplas opções de ação perguntam se o usuário gastou Ação Padrão, Movimento ou Reação.
- O movimento usa os dados completos da operação do Foundry v14, incluindo movimentos realizados por módulos via API.
- Teletransportes marcados como tal pelo Foundry não gastam espaços de movimento automaticamente.
- Condições automáticas aguardam o registro da paleta D616 antes de aplicar Incapacitated e Demoralized.
- Ícones legados de Items já importados no mundo são migrados para o caminho atual do sistema.

## Atualização v0.1.61 — Janela de Controle de Turno e condições exclusivas

- O Controle de Turno agora aparece em uma janela flutuante exclusiva do Mestre.
- A janela pode ser arrastada, redimensionada, minimizada e fechada. Ao fechar, use o botão **Turno** no canto inferior esquerdo para reabrir.
- A posição e o tamanho ficam salvos localmente no navegador do Mestre.
- Todos os combatentes aparecem na lista, com o turno atual destacado.
- Os controles mostram **Ação Padrão**, **Reação** e **Movimento** usados/máximos.
- Clique acrescenta um uso; clique direito desfaz; `Shift` + clique em Movimento consome o restante; a seta circular zera a linha.
- O rastreamento automático por armas, Powers e movimento do token permanece ativo, inclusive quando a janela está fechada.
- A paleta do Token HUD contém somente as condições nativas D616 e as condições atualmente salvas no gerenciador customizado do sistema.
- Powers com duração Concentração criam Active Effects transitórios diretamente no token; eles aparecem no painel lateral enquanto ativos, mas nunca entram na paleta ou no editor de condições customizadas.
- Condições de outros módulos não entram automaticamente na paleta; para disponibilizá-las no Token HUD, cadastre-as em **Configurações do Sistema → Condições (D616)**.

## Atualização v0.1.56 — Dano por alvo

Esta versão corrige o encadeamento completo da rolagem de ataque até a aplicação do dano:

- o alvo é salvo no card do ataque pelo UUID do token;
- o botão **DAMAGE** calcula o dano somente para esses alvos salvos;
- o card de dano conserva o dano final individual, já considerando a redução de cada alvo;
- **DANO**, **1/2 DANO** e **CURA** alteram o mesmo token original, mesmo que o jogador ou o Mestre mudem a seleção depois da rolagem;
- tokens não vinculados continuam sendo tratados individualmente;
- o cálculo nunca produz dano negativo e Fantastic só dobra um resultado positivo.

Também foram atualizados os pontos de renderização do chat para as APIs de HTML nativas do Foundry VTT v14.

## Atualização v0.1.55 — Foundry VTT v14

Esta versão atualiza o pacote para a geração 14 do Foundry VTT, mantendo a estrutura do sistema e preservando os recursos já existentes. As principais mudanças foram:

- Manifest atualizado para Foundry VTT v14.
- Inclusão de `documentTypes` para Actor e Item, evitando dependência do modelo legado baseado apenas em `template.json`.
- Ajuste de `ChatMessage.create` para usar `author` em vez de `user` no HUD de condições.
- Registro de sheets com preferência pelo namespace `foundry.documents.collections`, mantendo fallback seguro.
- Correção de referência global insegura no TokenHUD.
- Correção do caminho da imagem de setup `mmrpg-setup.png`.
- Recriação dos diretórios de compêndios declarados no manifesto.

## Requisitos

- Foundry Virtual Tabletop v14.
- Instalação na pasta: `{UserData}/Data/systems/multiverse-d616/`.
- Nenhum módulo é obrigatório para as condições automáticas de Concentração ou para o HUD de Ações nativo.

## Instalação manual

1. Baixe o ZIP da release.
2. Extraia a pasta `multiverse-d616` para `{UserData}/Data/systems/`.
3. Reinicie o Foundry VTT.
4. Crie ou abra um mundo usando o sistema **Multiverse-D616**.

---

## README anterior preservado

# Multiverse-D616 (Foundry VTT System)

Sistema **Multiverse-D616** para **Foundry VTT v13**.

## Instalação (Manifest)
Cole este link no instalador de sistemas do Foundry:
```
https://raw.githubusercontent.com/rodrigosinistro/multiverse-D616/main/system.json
```

## Recurso nativos integrados
- Hover Tooltips
- Chat Power Details
- Damage Reduction Helper
- Conditions HUD
- Condições automáticas de Powers em Concentração
- HUD de Ações para ABILITIES e POWERS
- Charactermancer (assistente de criação)
- PDF Export
- Power Sets custom (suporte a Power Sets novos sem crash na ficha)
- Focus em Powers (custo automático):
  - custo fixo (ex.: `5 Focus`) é deduzido automaticamente ao usar o poder
  - custo variável (ex.: `5 ou mais Focus`) abre automaticamente um diálogo para escolher o gasto

## Compatibilidade
- Foundry VTT v13 (minimum 13, verified 13.351).

## Créditos e Referências
Este sistema foi **baseado** e **adaptado** a partir do código do **sistema Marvel Multiverse (D616) para Foundry VTT** e de módulos da comunidade.
Todos os créditos aos **autores(as) originais** do sistema e dos módulos citados. Este fork renomeado e integrado existe
apenas para fins de compatibilidade e melhoria do fluxo de jogo, mantendo os respectivos créditos aos criadores originais.
Caso você seja autor(a) de alguma parte e deseje um crédito específico (nome/link), abra uma issue que atualizaremos este README.

---

# MarvelMultiverse RPG System!

## The __Unofficial__ Multiverse-D616 Role Playing Game System for Foundry VTT

This is an unoffical implementation of the [Multiverse-D616 Role Playing Game](https://www.marvel.com/rpg) table top role playing game for [Foundry VTT](http://foundryvtt.com). Providing character sheet, dice and game system support.

This system is a fan made work, and is not associated with Marvel Entertainment, LLC, The Walt Disney Company, or their partners in any way.

The system for Foundry VTT contains no rules or proprietary content from the various official RPG sourcebooks by Marvel Entertainment. It is intended to make the process of enjoying the Marvel Multivese RolePlaying system via an online tabletop experience as easy as possible but you will still need to purchase any and all official sourcebooks you desire in order to enjoy this system as intended.

This system provides character sheet support for Actors and Items, mechanical support for dice and rules support necessary to
play games of MMRPG. It is not a substitute for or contain rules or proprietary content from any Multiverse-D616 RPG publications. It is intended to enable game play on Foundry Virtual TableTop software. You will still need to purchase any and all official sourcebooks you desire in order to enjoy this system as intended.

The software component of this system is distributed under the MIT license.

## Installation Instructions

To install and use the  Multiverse-D616 Role Playing Game system for Foundry Virtual Tabletop you will need a licensed copy of currently supported versions of [Foundry VTT](https://foundryvtt.com/purchase/) 
![Foundry v12](https://img.shields.io/badge/foundry-v12-green) ![Foundry v13](https://img.shields.io/badge/foundry-v13-green).

### Easy Install ###
In your foundry setup page copy and paste the following Link into the **Install System** dialog on the Setup menu of the application.

Updates are released often, if you upgrade and discover an issue please submit it.
