# Multiverse-D616 (Foundry VTT System)

Sistema **Multiverse-D616** para **Foundry VTT v14**.

## Central de Automações 5.0 — Biblioteca e compartilhamento de regras

A Central possui três abas: **Minhas Automações** (regras em uso), **Biblioteca** (modelos salvos, inativos) e **Automações Nativas** (configurações do motor já existente).

- **Guardar modelo:** em Minhas Automações, clique em **Guardar modelo** para manter uma cópia da regra, sem vinculá-la à execução. Edições posteriores na regra ativa não modificam o modelo salvo.
- **Exportar minhas regras:** baixa um arquivo JSON com todas as regras personalizadas do mundo; **Exportar biblioteca** baixa os modelos disponíveis. O formato é exclusivo do D616 e não contém scripts.
- **Transferir para outro mundo:** abra a aba Biblioteca do outro mundo, selecione **Importar JSON**, revise a confirmação e, após importar, clique em **Adicionar às minhas regras** nos modelos desejados. Cada cópia é criada desativada para permitir revisão e ativação consciente.
- **Segurança e limites:** apenas Mestres podem alterar; até 100 modelos por biblioteca/arquivo e 1 MB por arquivo; arquivos inválidos são rejeitados por completo, modelos duplicados são ignorados e nenhum item importado substitui uma regra existente. Exportações **não incluem** configurações de grupos nativos, dados das fichas nem arquivos de mídia.
- **Disponibilidade:** modelos são salvos em configurações de *mundo*; para reutilizar em outro mundo, exporte e importe o JSON. Faça backup do mundo antes de importar bibliotecas grandes.

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
- **Central de Automações 5.0:** Biblioteca de modelos inativos com exportação/importação JSON e cópia desativada entre mundos; oito grupos de rotinas nativas e criador visual de regras ativas (poder, início/fim do turno) e passivas (Edge/Trouble enquanto possui o poder) e modificadores de Edge/Trouble ao rolar ataques de poderes específicos, com condição opcional
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

## Central de Automações

O Mestre encontra a Central em **Configurações do Foundry → Configurar Configurações → Multiverse-D616 → Abrir Central de Automações**. Nela, há duas abas: **Minhas Automações** (criação de regras próprias) e **Automações Nativas** (grupos e controles já existentes). Na aba nativa, pode pausar todas as automações opcionais, habilitar/desabilitar cada um dos oito grupos e pesquisar poderes específicos. O painel preserva a posição de rolagem quando o Mestre altera uma opção.

Nas categorias **Condições automáticas de poderes**, **Dano especial**, **Ataques adicionais**, **Efeitos elementais**, **Efeitos contínuos** e **Recuperação de condições**, é possível desabilitar individualmente somente as rotinas com pontos de controle próprios. Os grupos **Concentração** e **Consumo de Ações/Movimento** permanecem configuráveis em conjunto, para preservar as regras integradas. A pesquisa e o filtro **Só alteradas** ajudam a localizar exceções. Quando o dano automático de condições do HUD estiver desligado, a Central informa a dependência e identifica as rotinas afetadas. A preferência é salva por mundo e os controles preservam os efeitos já existentes; rolagens e aplicações manuais continuam disponíveis.

### Criar novas automações

Na aba **Minhas Automações**, use o formulário **Gatilho → Condição → Efeito** para criar regras que realmente executam no jogo. Escolha quando disparar (**rolar um poder específico**, **início do turno**, **fim do turno** ou **passiva: ao realizar um ataque**), restrinja opcionalmente por uma condição já presente no personagem e defina um resultado (**aplicar uma condição nativa**, **recuperar Health dentro do máximo da ficha** ou **publicar mensagem no chat**). Em rolagens de poder é possível exigir **M no dado Marvel**, o que por si só não comprova um acerto. No gatilho **Ao rolar um poder**, o efeito é aplicado **ao próprio personagem**, não ao alvo, mesmo que apareça M no dado Marvel. Para efeitos em inimigos, escolha **Após acertar um alvo**. O editor sinaliza essa diferença e oferece **Converter para efeito no alvo atingido**: ao converter uma regra que exigia M, a condição passa a depender de **Sucesso Fantástico confirmado**. Uma regra nova só é criada quando o Mestre clica em **Salvar automação**. Ao **editar uma regra já existente**, as alterações pendentes são salvas automaticamente antes de fechar a Central ou escolher outra regra; se o formulário estiver inválido ou o salvamento falhar, a janela permanece aberta. Um aviso no editor informa o estado das alterações. Para regras **Ao rolar um poder**, também é possível atribuir **Edge ou Trouble ao próprio ataque** com escopo corpo a corpo, à distância ou todos; o modificador é considerado antes dos dados serem lançados. Por exemplo, **Elemental Blast** pode ser configurado como `Ao rolar um poder` → `Elemental Blast` → `Conceder Edge` → `Ataques à distância`. **A ficha padrão de Elemental Blast já possui Edge nativo**, e o sistema ignora uma segunda vantagem idêntica definida no criador. Modificadores baseados no dado Marvel M da mesma rolagem não são permitidos: o resultado só é conhecido depois do lançamento. O menu ampliado oferece as 22 condições normais do catálogo, mas não altera os estados internos de Concentração, Agarrado ou Escudo Arremessado. Para o exemplo **Blazing Fast Fists**, selecione `Passiva: ao realizar um ataque`, informe `Blazing Fast Fists` como poder de origem, selecione `Conceder Edge (vantagem)` e `Ataques corpo a corpo`. O personagem precisa possuir esse poder na ficha. Rolagens de Item configuradas como ataque (inclusive armas) são tratadas diretamente; nos testes genéricos de Melee feitos pelo HUD ou macro, marque um alvo para indicar que se trata de ataque. Sem alvo marcado, o teste genérico não ganha Edge passivo, pois pode ser uma ação não ofensiva. As regras podem ser editadas, pausadas, ativadas e excluídas; ficam salvas por mundo.

Uma regra pode conter **de um a oito efeitos em sequência**, com controles para **adicionar, remover e reordenar** cada etapa. Por exemplo, após um Sucesso Fantástico confirmado contra o alvo, é possível **aplicar Confuso por dois turnos**, **recuperar Health** e **publicar um aviso no chat**, sem criar três regras independentes. Cada condição tem sua própria duração e orientação de remoção. A ação **Executar animação configurada no poder** pode reproduzir a animação do Item via Sequencer (quando o módulo e o arquivo estiverem disponíveis); a ausência da animação não impede as demais ações. Edge/Trouble continua alterando somente rolagens antes de serem feitas. **Dano personalizado** está disponível no gatilho **Após acertar um alvo**, por valor fixo, por atributo ou como **multiplicador ×2/×3**. Bônus entram no dano base; o multiplicador atua no dano calculado após RD e regras especiais. As decisões sobre acerto, barreiras e aplicação pelo Mestre continuam no motor/MMDR nativo. Caso múltiplas automações proponham multiplicadores para o mesmo alvo, somente o maior se aplica. **Dano contínuo por turno** é um efeito adicional (1–100 pontos por tick, Health ou Focus, por 1–20 inícios de turno do alvo): após o gatilho ele cria um ActiveEffect temporário independente das condições nativas. Começa no **próximo início de turno** do personagem, aplica o dano automaticamente pelo processador do MMDR (redução de dano e proteções pessoais), informa no chat o dano efetivo e os turnos restantes, e desaparece ao terminar. Precisa de combate iniciado, personagem na iniciativa e Mestre ativo; uma regra já ativa não se acumula novamente no mesmo alvo. Efeitos existentes continuam até expirarem mesmo se a criação de novas regras for pausada. Não dispara um segundo pedido de confirmação de dano em cada turno. **Atenção:** adicionar Em Chamas e dano contínuo na mesma regra pode provocar dois danos independentes (o dano nativo da condição e o dano personalizado). Use os dois apenas quando essa for a intenção do Mestre.

Nas regras de turno/poder, somente o Mestre ativo aplica alterações de ficha ou envia mensagens. Regras passivas apenas influenciam a rolagem do próprio atacante, sem modificar fichas. Não são aceitos códigos JavaScript, caminhos de dados arbitrários nem alterações genéricas de valores. A opção **Pausar todas** também pausa estas regras, e **Executar minhas automações** controla somente as personalizadas. No início/fim do turno, somente avanços normais do combate disparam os gatilhos (não retrocessos). Não há execução retroativa. Os efeitos não modificam Concentração nem gastos automáticos do sistema. Nas automações que aplicam condições, o Mestre pode escolher **duração manual**, **1–20 turnos do alvo** ou **1–20 rodadas de combate**, além de escrever uma **orientação de remoção** opcional. Para turnos/rodadas é obrigatório que o combate esteja ativo e o personagem afetado esteja na iniciativa; sem essas condições, o sistema não aplica um efeito temporário sem prazo confiável. Durações são controladas por flags nos ActiveEffects do Foundry v14, sem alterar a rotina das condições nativas nem substituir efeitos existentes. **No início de cada turno**, o chat apresenta as condições ativas, o tempo restante e a forma de remoção; Sangrando, Em Chamas e Envenenado usam as referências nativas já existentes no sistema e as demais condições são descritas sem inventar testes. A orientação do Mestre prevalece na condição criada pela Central. Avisos não representam rolagens nem consomem ações. Condições antigas das automações já salvas continuam com **duração manual**. A expiração independe da opção de pausar novas automações, respeitando efeitos já aplicados.

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

The system for Foundry VTT contains no rules or proprietary content from the various official RPG sourcebooks by Marvel Entertainment. It is intended to make the process of enjoying the Marvel Multiverse Role Playing system via an online tabletop experience as easy as possible, but you will still need to purchase any and all official sourcebooks you desire in order to enjoy this system as intended.

This system provides character sheet support for Actors and Items, mechanical support for dice and rules support necessary to play games of MMRPG. It is not a substitute for or contain rules or proprietary content from any Multiverse-D616 RPG publications. It is intended to enable game play on Foundry Virtual TableTop software. You will still need to purchase any and all official sourcebooks you desire in order to enjoy this system as intended.

The software component of this system is distributed under the MIT license.

## Installation Instructions

To install and use the Multiverse-D616 Role Playing Game system for Foundry Virtual Tabletop you will need a licensed copy of a currently supported version of [Foundry VTT](https://foundryvtt.com/purchase/).

![Foundry v14](https://img.shields.io/badge/foundry-v14-green)

### Easy Install

In your Foundry setup page, copy and paste the manifest link above into the **Install System** dialog on the Setup menu of the application.

Updates are released often. If you upgrade and discover an issue, please [submit an issue](https://github.com/rodrigosinistro/multiverse-D616/issues).

### Central de Automações 4.1 — regras personalizadas por alvo

Em **Configurações → Multiverse-D616 → Central de Automações → Minhas Automações**, o Mestre pode escolher um poder de uma ficha ou de um compêndio de Itens, ou informar seu nome manualmente. O gatilho **Após acertar um alvo (resultado confirmado)** aplica efeitos por alvo após a avaliação nativa da defesa e das decisões individuais de acerto. Para ataques com dano, os efeitos só são aplicados após a confirmação do card MMDR pelo Mestre; condições de ataque sem dano são resolvidas imediatamente contra a defesa. Escolha entre qualquer acerto e Sucesso Fantástico confirmado. Os efeitos disponíveis são condição, recuperação de Health e mensagem no chat. Uma condição prévia pode ser verificada no lançador ou no alvo. Edge/Trouble continuam sendo definidos **antes** da rolagem. As regras permanecem opcionais e são gravadas nas configurações do mundo; nenhuma regra modifica os compêndios ou scripts dos poderes. Efeitos já aplicados não são retroativamente desfeitos se a rolagem for alterada após a aplicação.

### Central de Automações — bônus de dano personalizado

Em **Minhas Automações**, crie uma regra com gatilho **Após acertar um alvo**, selecione o poder e o resultado desejado (qualquer acerto ou Sucesso Fantástico), opcionalmente exija uma condição no atacante ou alvo. No passo Efeito escolha **Modificar dano (cálculo nativo/MMDR)** e configure **valor fixo (1–100)**, **valor de um atributo do atacante** ou **multiplicador do dano calculado (×2 ou ×3)**. Multiplicadores são aplicados após RD e fator nativo, e somente o maior multiplicador de regras coincidentes entra no card. Pode adicionar condição, mensagem, cura ou animação à mesma sequência.

O bônus entra no cálculo do card do dano do poder, respeitando a fórmula e a RD nativa, o fator de dano do poder, proteções e confirmação MMDR. Efeitos pós-acerto continuam após a confirmação; o modificador de dano não é executado novamente nessa fase. Mudanças em regras não alteram cards anteriores já preparados.
