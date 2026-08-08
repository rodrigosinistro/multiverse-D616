# v0.1.69

- Corrigida a fórmula de ataques realizados por Powers e armas no Foundry VTT v14.
- O atributo selecionado no Item (Melee, Agility, Resilience, Vigilance, Ego ou Logic) volta a aparecer na fórmula do card e a ser somado ao resultado total.
- A correção também cobre rolagens iniciadas por macro e pelo Token Action HUD, pois todos esses fluxos usam o mesmo `Item.roll()`.
- Fórmulas personalizadas que já contêm a referência do atributo são preservadas sem duplicar o modificador.

# v0.1.68

- Removido o botão **DAMAGE** dos cards de rolagem de iniciativa.
- A remoção usa as referências explícitas de iniciativa da v0.1.67 e mantém compatibilidade com mensagens antigas identificadas por `Initiative` ou `Iniciativa`.
- Cards de ataques, Powers e demais testes continuam exibindo o botão **DAMAGE** normalmente.

# v0.1.67

- Corrigida a atualização da ordem de iniciativa após usar **Edge** ou **Trouble** em uma rolagem de iniciativa.
- As mensagens de iniciativa agora carregam referências explícitas ao Combat e ao Combatant, sem depender do nome exibido no chat.
- Corrigida a detecção de iniciativa em português; o código anterior procurava apenas a palavra inglesa `Initiative`, por isso `Iniciativa` não atualizava o Combatant.
- O resultado ajustado passa a ser aplicado com `Combat.setInitiative`, que reordena o encontro e preserva corretamente o combatente do turno atual.
- Combatentes com **E** ou **Trouble** na iniciativa ficam pendentes até escolherem um dado ou clicarem em **Manter iniciativa**.
- O combate só começa automaticamente quando todas as iniciativas e todos os Edge/Trouble pendentes forem resolvidos.
- Em rolagens de iniciativa, o sistema exibe somente o modificador autorizado: Edge para personagens com E, Trouble para personagens com Trouble e nenhum botão para personagens sem modificador.
- Cada Edge/Trouble de iniciativa pode ser usado somente uma vez; após a resolução, os botões são removidos do card.
- Adicionado fallback por Token, Actor e alias para mensagens de iniciativa antigas que não possuem as novas flags.

# v0.1.66

- Adicionados ao Quadro de Controle de Turno os botões de Mestre **Iniciar Combate**, **Retroceder Turno**, **Avançar Turno** e **Finalizar Combate**.
- **Iniciar Combate** agora abre uma fase de iniciativa: cada jogador ativo recebe um popup para lançar a iniciativa dos personagens que controla.
- O Mestre recebe um popup separado para lançar a iniciativa dos combatentes sem jogador ativo responsável, incluindo NPCs, combatentes ocultos e personagens cujo dono esteja desconectado.
- Quando todos os combatentes possuem iniciativa, o encontro começa automaticamente na Rodada 1.
- Se alguém fechar o popup sem rolar, o Mestre pode clicar novamente em **Iniciar Combate** para reenviar os pedidos pendentes, sem apagar iniciativas já lançadas.
- As solicitações de iniciativa são validadas pelo proprietário do Actor; caso a permissão do jogador impeça a atualização direta, o Mestre primário executa a rolagem por socket.
- **Finalizar Combate** exige confirmação para evitar encerramentos acidentais.
- Os quatro controles são exclusivos do Mestre; jogadores continuam vendo o quadro e os contadores em modo somente leitura.

# v0.1.65

- O Quadro de Controle de Turno agora está disponível para Mestres e jogadores; cada usuário pode abrir, fechar, minimizar, arrastar e redimensionar sua própria janela.
- O ícone de cronômetro nas ferramentas de Token agora aparece para todos os usuários e reabre o quadro sem alterar a ferramenta ativa do canvas.
- Adicionado o botão **Iniciar Combate** dentro do quadro, visível e utilizável somente pelo Mestre, quando o encontro ainda não começou.
- Jogadores recebem uma visualização somente de leitura; controles manuais e reset individual continuam exclusivos do Mestre.
- Combatentes ocultos continuam invisíveis para jogadores no quadro.
- Os recursos exibem somente a quantidade utilizada (`0`, `1`, `2`...), sem a fração de máximo (`0/1`).
- Ação Padrão, Reação e Movimento agora mantêm fundo vermelho fixo, com o número de usos em branco e negrito, sem mudança de cor ao atingir ou ultrapassar o limite.
- Otimizada a janela Controle de Turno para não reconstruir toda a interface a cada atualização irrelevante do combate.
- Adicionado limite de atualização, agrupamento por frame e assinatura de estado; renders idênticos agora são descartados.
- A janela não é atualizada enquanto estiver fechada ou minimizada e preserva a posição de rolagem da lista.
- Atualizações de Combatant e Combat agora só redesenham a janela quando alteram turno, rodada, iniciativa, derrota ou os recursos rastreados.
- Retratos dos combatentes são validados uma única vez antes de serem usados, evitando tempestades de requisições 404 durante a abertura do combate.
- O ResizeObserver da janela passou a salvar geometria com debounce e apenas quando tamanho ou posição realmente mudam.
- O painel de condições deixou de reconstruir o DOM em todo update de Token/Actor; agora reage apenas a seleção e mudanças de Active Effects/status.
- A paleta exclusiva de condições é reaplicada somente quando necessário, em vez de ser recriada em cada render do painel.
- A verificação automática de Incapacitated/Demoralized agora roda somente quando Health ou Focus mudam.
- Reduzido o log de diagnóstico repetitivo do Chat Power Details durante rerenders do chat.

# v0.1.64

- Corrigido o travamento aparente do canvas ao abrir o Controle de Turno pela barra lateral.
- O cronômetro deixou de ser registrado como um grupo de Scene Controls vazio e passou a ser um botão verdadeiro dentro das ferramentas de Token, preservando seleção, arraste, alvo e demais interações do canvas.
- O botão do Controle de Turno não se torna uma ferramenta ativa e apenas abre a janela do Mestre.
- O rastreamento de movimento agora é consolidado somente pelo Mestre primário, evitando solicitações duplicadas entre clientes.
- O fallback por `preUpdateToken`/`updateToken` também é executado pelo Mestre primário e continua cobrindo movimentos por atualização direta de coordenadas.
- Imagens inválidas dos combatentes são memorizadas pela janela e não voltam a gerar requisições 404 em cada atualização do combate.

# v0.1.63

- Corrigido o contador de movimento em cenas sem grade: quando o Foundry retorna `spaces = 0`, a distância da operação é convertida para espaços usando a escala configurada na cena.
- O rastreamento do hook `moveToken` agora é processado pelo cliente que realmente iniciou o movimento e sincronizado com o Mestre, evitando depender da cópia da operação recebida por outro cliente.
- O movimento é associado ao Combatant correspondente ao Token movimentado, inclusive em movimentos fora do turno ativo.
- Adicionada medição alternativa pelas posições de origem/destino e um fallback pelo hook `updateToken` para módulos que alteram diretamente as coordenadas do Token.
- Adicionada proteção contra contagem duplicada quando `moveToken` e `updateToken` descrevem a mesma movimentação.
- O botão flutuante de reabertura foi removido e substituído por um controle com ícone de cronômetro na barra de ferramentas à esquerda, visível somente para o Mestre.
- Adicionado registro de diagnóstico no console sempre que o Controle de Turno contabiliza movimento.

# v0.1.62

- Corrigido o rastreamento de Powers usados fora do turno ativo: Reações agora localizam o Combatant do ator que efetivamente usou o Item.
- Powers com ações alternativas, como `Standard, movement or reaction`, voltam a abrir a escolha e consomem somente o recurso selecionado.
- A leitura do campo Action também reconhece `Standart`, `Ação Padrão` e `Padrão`, preservando compatibilidade com conteúdo legado.
- Corrigida a medição de movimento do Foundry v14: o rastreador soma os trechos `passed` e `pending` da operação atual, sem reutilizar o histórico cumulativo.
- Movimentos feitos por integrações via método `api` passam a ser contabilizados; movimentos administrativos (`config`, `paste`, `undo`) e teletransportes marcados pelo Foundry são ignorados.
- Corrigida a corrida de inicialização das condições automáticas Incapacitated/Demoralized, garantindo que a paleta D616 esteja registrada antes de alternar o status.
- Adicionado fallback seguro por ActiveEffect para condições automáticas quando outro módulo atrasa a reconstrução interna dos status.
- Adicionada migração não destrutiva dos caminhos de ícones já existentes no mundo, de `systems/marvel-multiverse/` para `systems/multiverse-d616/`.
- Imagens inválidas na janela Controle de Turno agora usam o ícone genérico como fallback.

# v0.1.61

- Substituído o controle compacto embutido no Combat Tracker por uma janela flutuante exclusiva do Mestre.
- A janela pode ser arrastada, redimensionada, minimizada e fechada; um botão flutuante permite reabri-la.
- Posição, tamanho, estado aberto/fechado e minimização são preservados no navegador do Mestre.
- A janela mostra todos os combatentes, destaca o turno atual e permite controlar Ação Padrão, Reação e Movimento.
- Mantidos o rastreamento automático de armas/Powers, o consumo de movimento e o reset no início do turno.
- A paleta de condições agora é exclusiva do Multiverse-D616: condições padrão do Foundry e de módulos não relacionados são removidas.
- Condições nativas, customizadas pelo sistema e criadas pelo D616 Extempore Effects continuam disponíveis.

# v0.1.60

- Replaced the Powers compendium with the user-provided Foundry export.
- Preserved all Power Set folders as native compendium Folder documents.
- Updated legacy `marvel-multiverse` system and icon paths to `multiverse-d616`.
- Replaced the unavailable world-specific Animal Control icon with the system power icon.
- Synchronized the Charactermancer fallback Powers data with the new compendium.
- Removed the temporary runtime folder-reconstruction script.

# Changelog

## 0.1.59

- Restaurada a organização interna do compêndio **Powers** em 26 pastas de **Power Set**.
- Adicionada migração automática, executada pelo Mestre ativo, que recria as pastas e reassocia os 383 Powers conforme a estrutura original de `powers.json`.
- A migração preserva os nomes e identificadores originais das pastas sempre que possível, relocka o compêndio após a operação e não altera Powers personalizados.
- Renomeados os arquivos de compêndio para `v0159`, evitando reaproveitamento de uma migração LevelDB incompleta da versão anterior.

## 0.1.58

- Corrigido o caminho dos arquivos JSON do Charactermancer após sua integração ao sistema.
- Restaurados os seis compêndios oficiais (Itens, Ocupações, Origens, Poderes, Tags e Traços).
- Normalizados os caminhos de ícones para `systems/multiverse-d616/`.
- Atualizadas referências de API para os namespaces do Foundry VTT v14 (`ActorSheet`, `ItemSheet` e `loadTemplates`).
- Corrigido o retorno interno do Charactermancer para o formato jQuery esperado pelo Application V1.
- Corrigido o identificador usado pelo guard do libWrapper.

## v0.1.57 — Active Effects, condições e Controle de Turno

- Corrigido o ciclo de preparação de `Actor` e `Item` para o Foundry VTT v14. O sistema não chama mais `prepareData()` uma segunda vez, eliminando os erros de fases `initial`/`final` já concluídas.
- Restaurada a aplicação dos Active Effects transferidos por Powers, Traits, Origins e Occupations. `Sturdy 1–4` volta a alterar `system.healthDamageReduction`, e o fluxo de dano usa o valor derivado do alvo.
- O registro de condições agora usa o objeto chaveado exigido pelo Token HUD do Foundry v14, preservando condições de outros módulos.
- Removido o monkey patch legado de `_getStatusEffectChoices`, que devolvia um array incompatível com v14.
- Condições automáticas em atores sintéticos são aplicadas diretamente ao ator daquele token, sem alcançar outras cópias não vinculadas.
- Dano de condição e prompts de recuperação são executados somente pelo Mestre ativo primário, evitando duplicação entre clientes.
- Poderes usados pela ficha, macro ou Token Action HUD passam pelo mesmo `Item.roll()`, incluindo custo de Focus, Concentração, alvos, contexto de dano e hooks.
- Adicionado Controle de Turno no Combat Tracker: Ação, Reação e espaços de Movimento usados/máximos, estado por Combatant, reset no início do turno e edição por Mestre/dono.
- Armas e Powers marcam recursos automaticamente; ações alternativas perguntam qual recurso foi usado e ações combinadas marcam os dois.
- Movimento do combatente ativo é acompanhado pelo hook `moveToken` do Foundry v14 para movimentos por arraste, teclado e HUD.
- O contador é reinserido quando o Carousel/Combat Tracker Dock reconstrói o
  retrato de um combatente, preservando a integração após atualizações.
- Ações extras não são bloqueadas: o contador pode ultrapassar o máximo para representar poderes e exceções.
- Migrados os fluxos do sistema de `core.rollMode` para `core.messageMode`.
- O Controle de Turno foi implementado em `scripts/combat/`, primeiro passo da separação do arquivo central por responsabilidade.

## v0.1.56 — Dano por alvo e compatibilidade Foundry VTT v14

- Corrigido o fluxo do botão `DAMAGE`: ele agora usa exclusivamente os UUIDs dos alvos salvos no card do ataque, em vez dos alvos que estiverem marcados no momento do clique.
- O card de dano passa a guardar uma estrutura por alvo (`damageApplication`) com UUID do token/ator, tipo, redução e dano final. Os botões **DANO**, **1/2 DANO** e **CURA** aplicam esses valores ao mesmo alvo original.
- Corrigido o caso em que o GM mudava a própria seleção antes de aplicar o dano e outro token era alterado.
- Preservado o ator sintético de tokens não vinculados por meio do UUID do token e do ator.
- O Damage Multiplier efetivo não fica negativo; resultado Fantastic só dobra dano positivo.
- Cards antigos mantêm fallback conservador, sem trocar silenciosamente para a seleção atual de outro usuário.
- Atualizado o ciclo de renderização de `ChatMessage` para a API `renderHTML` do Foundry VTT v14.
- Removidas integrações obsoletas com `ChatMessage#getHTML` e com o hook legado `renderChatMessage`; os complementos de chat usam `renderChatMessageHTML` e `HTMLElement`.
- Corrigido `MarvelMultiverseRoll.fromTerms`, que referenciava uma variável inexistente.
- Corrigida a detecção do sistema no botão de exportação PDF.
- Atualizados os links exibidos nas configurações para este repositório.
- Executados testes automatizados focados em persistência de alvo, dano integral, meio dano, cura e regra de dano mínimo zero.

## v0.1.55 — Foundry VTT v14

- Atualizado `system.json` para `compatibility.minimum = 14` e `compatibility.verified = 14`.
- Adicionado bloco `documentTypes` para os tipos de Actor e Item do sistema, com campos HTML registrados para sanitização/validação no servidor.
- Ajustado o HUD de condições para usar `ChatMessage.author` em vez do campo legado `user`.
- Ajustado uso de `foundry.utils.getProperty` no dano automático de fim de turno.
- Tornado o fallback de `TokenHUD` seguro via `globalThis.TokenHUD`.
- Registro de sheets atualizado para preferir `foundry.documents.collections.Actors/Items`, mantendo fallback para ambientes antigos.
- Corrigido caminho da arte de setup `mmrpg-setup.png` no pacote.
- Diretórios de compêndio declarados no manifesto foram recriados no ZIP final.

## 0.1.53 (2026-02-22)
- Fix (Chat — EDGE/TROUBLE): rolagens retroativas (EDGE/TROUBLE) não sobrescrevem mais `flags` do sistema no ChatMessage. Isso evita regressões como o botão/estado de Focus “sumir” após um reroll.
- Melhoria (Focus — custo automático em Powers):
  - **Custo fixo** (ex.: `5 Focus`): agora é **deduzido automaticamente** do Focus do personagem ao usar o Poder.
  - **Custo variável** (ex.: `5 or more Focus` / `5 ou mais Focus`): ao usar o Poder, abre automaticamente para o usuário que rolou um diálogo para escolher o total a gastar (mínimo + extra), mantendo as regras já existentes (limite **5×Rank**, validação de Focus disponível, bônus por escalonamento quando detectável no EFFECT).
  - O gasto fica salvo no próprio card via `flags` e aparece na linha de info (FOCUS/BÔNUS) — sem depender de um botão no card.

## 0.1.52 (2026-02-21)
- Fix (Sheet/Charactermancer — Power Sets custom): a ficha não trava mais ao abrir quando existir Power com `system.powerSet` novo/não listado (ex.: **"Animal Control"**). O agrupamento de Powers agora cria buckets dinamicamente (e ignora com segurança quando o DataModel não permite chaves novas).

## 0.1.51 (2026-02-17)
- Fix (Movement — Flight): Flight Speed agora segue corretamente a regra **Run Speed atual × Rank** (inclui modificadores que alterem a Run Speed). Isso também corrige conteúdo legado que tentava aplicar `flight.calc` como `runspeed` e depois `rank` via Active Effects.

## 0.1.50 (2026-02-07)
- Fix (Chat — Acerto/Erro): ao avaliar acertos de ataque, considera Traits do alvo que trocam a defesa usada: **Brawling** (Agility→Melee), **Evasion** (Melee→Agility), **Wisdom** (Logic→Ego), **Integrity** (Ego→Logic).

## 0.1.49 (2026-02-06)
- Fix (Chat — Alvos): a lista agora é **sempre** baseada nos alvos marcados pelo **autor da rolagem** (GM ou jogador) e aparece para **todos**. O sistema captura os alvos locais **no momento da rolagem** e salva no ChatMessage (`flags`); se uma mensagem antiga/não padronizada não tiver isso, o **autor** auto-sincroniza na primeira renderização.
- Fix (Chat/Damage — Vazamento de alvos): removidos fallbacks que usavam `Token.isTargeted` (que podia incluir alvos de outros usuários). Agora o fallback considera apenas alvos marcados pelo **usuário atual**.

## 0.1.48 (2026-02-06)
- Fix (Chat — Alvos): cada ataque lista SOMENTE os alvos marcados pelo usuário que rolou (GM ou jogador). Ainda assim, a lista aparece para TODOS; GM vê ACERTOU/ERROU e jogadores veem ALVO.

## 0.1.47 (2026-02-06)
- Fix (Chat — Alvos): A lista de alvos agora é **visível para TODOS**. O sistema coleta e salva os alvos (via socket) no ChatMessage, então independe de **quem rolou** ou de **quem marcou**.
- Regra: o **GM** vê **ACERTOU/ERROU**; jogadores veem sempre **ALVO** (preto).

## 0.1.44 (2026-02-02)
- Fix: Occupation Traits/Tags picker no longer crashes on Foundry v13 (replaced removed `TextEditor.encodeHTML` with `foundry.utils.escapeHTML`).

## 0.1.43 (2026-02-02)
- Occupation Traits/Tags picker now searches ALL Item compendiums (system + world), not only the system packs.

## v0.1.33 — 2026-01-31

## 0.1.39
- **Occupation Sheet:** agora exibe e permite **gerenciar** os **Traits** e **Tags** associados (aba **Traits & Tags**), incluindo **drag & drop** de itens do tipo Trait/Tag para adicionar e botão de lixeira para remover.

## 0.1.40
- **Fix (Occupation Sheet: Drag & Drop):** corrigido o **arrastar/soltar** de **Traits** e **Tags** para a aba **Traits & Tags**. Agora o drop funciona de forma robusta no Foundry v13 (inclui fallback para UUID links) e mostra aviso se a entrada não estiver editável.

## 0.1.41
- **Fix (Occupation Sheet: Drag & Drop não permitido):** corrigido o caso em que o cursor ficava como **"proibido"** e o drop não disparava. Agora a aba **Traits & Tags** registra `dragover/drop` diretamente nas áreas de drop para garantir que o navegador permita o arrastar/soltar.

## 0.1.42
- **Occupation Sheet (Traits & Tags):** adicionados botões **"+"** para **inserir Traits/Tags** via um **seletor** (lista + busca), como alternativa ao **drag & drop** quando algum stack de módulos bloqueia o DnD.

## 0.1.38
- Concentração aparece no Token como condição (mmrpg.concentration.X) e ao remover limpa o controle.
- Ajuste do hook de chat para renderChatMessageHTML (Foundry v13).
- **Fix (Hotbar: Tooltip MMHT):** corrigido o patch que injeta os dados do tooltip na **barra de atalhos**. Agora, ao passar o mouse por um macro de **Power/Trait/Tag** criado via arrastar da ficha, o tooltip detalhado (Description/Effect/Cost/Range/Action/Duration/Trigger) aparece corretamente.

## v0.1.30 — 2026-01-31
- **Fix (Charactermancer: botões i18n no Jogador):** corrigido o fallback de localização (Foundry retorna a *chave* quando não existe tradução). Agora, quando o idioma do cliente não tem as strings do MMC, os botões não exibem mais `MMC.Back`/`MMC.Next`/`MMC.Select`/`MMC.Open` — eles caem corretamente em **Voltar**, **Seguinte**, **Selecionar** e **Charactermancer**.

## v0.1.29 — 2026-01-31
- **Melhoria (LIMITADO: Arte grande):** ao abrir um ator com permissão **LIMITADO**, o sistema agora abre a arte do personagem em uma janela **ImagePopout** grande (estilo “mostrar imagem” do GM), em vez do retrato pequeno na ficha.

## v0.1.28 — 2026-01-31
- **Ajuste (Permissões/Propriedade de Atores):**
  - **LIMITADO:** ao abrir a ficha, exibe apenas a **arte/portrait** do personagem.
  - **OBSERVADOR:** pode ver a ficha, mas fica **view-only** (sem rolagens, sem criar/editar/deletar itens/efeitos).
  - **NENHUM** e **DONO:** mantêm o comportamento padrão (sem mudanças).

## v0.1.27 — 2026-01-31
- **Fix (Hotbar: rolar Item/Poder):** ao arrastar um **Item/Poder/Arma** da ficha para a **barra de atalhos**, o macro criado agora **executa a rolagem** (`item.roll()`) — igual clicar no item na ficha — em vez de abrir a janela de edição. *(Macros antigos precisam ser removidos e recriados.)*

## v0.1.26 — 2026-01-30
- **Fix (Weapon DM vs outros bônus):** o sistema agora calcula corretamente o **MAIOR** bônus de **Damage Multiplier** entre **arma** e **qualquer outro bônus** (sem somar), mesmo quando o ator possui modificadores via **Active Effects**/outras fontes. O card salva `base/other/weapon/effective/finalDM` em `flags` para o botão **DAMAGE** usar o mesmo contexto do ataque.

## v0.1.25 — 2026-01-28
- **Novo (Weapon Damage Multiplier Bonus):** bônus de **Damage Multiplier** de armas (`system.damageMultiplierBonus`) agora é aplicado **somente** quando o item **weapon** é **usado** e está `equipped=true` — **não é passivo**. Se houver outro bônus de DM no mesmo ataque, o sistema usa o **maior** (não soma). O contexto fica salvo no próprio card via `flags`.

## v0.1.24 — 2026-01-26
- **Fix (Condição aplicada no token errado):** ao chegar a 0 de **Health/Focus**, o auto-status (ex.: **Incapacitated**) agora é aplicado **somente ao token afetado** quando o dano foi recebido por um **token não-linkado** (minions/clones), evitando que outro token do mesmo ator-base receba a condição.

## v0.1.23 — 2026-01-26
- **Novo (Botão de Focus no Chat):** quando a rolagem estiver associada a um **Poder** com custo de **Focus**, o card agora exibe um botão **FOCUS** ao lado de **DAMAGE**.
- **Custo fixo:** ao clicar, o sistema desconta automaticamente o custo do Focus do personagem.
- **Custo variável ("X or more Focus"):** abre um diálogo perguntando **quanto a mais** gastar além do mínimo, respeitando o limite de **5×RANK** por uso.
- **Escalonamento automático (beta):** tenta ler o texto do campo **EFFECT** para identificar padrões do tipo “+Y bônus de dano a cada X Focus gasto” e aplica esse bônus ao cálculo do botão **DAMAGE**.
- **Persistência:** o gasto de Focus (e bônus, se detectado) fica salvo no próprio card via `flags` e permanece mesmo após re-render (EDGE/TROUBLE).

## v0.1.22 — 2026-01-25
- **Novo (Condições + Configuração):** condições nativas atualizadas (incluindo níveis de **Concentração**) e novo menu em **Configurações do Sistema → Condições (D616)** para adicionar/editar **Condições custom** (JSON). As condições custom são somadas às nativas e passam a aparecer no **TokenHUD**.

## v0.1.21 — 2026-01-25
- **Melhoria (Ataque: Acertou/Errou no Chat):** removidos **setas/ícones** e o valor da **Defesa** do alvo; agora a avaliação mostra apenas **ACERTOU** (verde) ou **ERROU** (vermelho).

## v0.1.20 — 2026-01-25
- **Meta (Release/GitHub):** `system.json` atualizado com links corretos de **bugs/issues**, **download** e `verified` (Foundry v13.351).
- **Docs:** README atualizado (compatibilidade/verified).

## v0.1.19 — 2026-01-25
- **Fix (HIT/MISS ainda não aparecia):** Correção definitiva do suporte a alvos marcados em Foundry v13, tratando `game.user.targets` como **Token OU TokenDocument** (antes o UUID/IMG não era capturado e o bloco não renderizava).
- **Melhoria (Persistência/Atualização):** A rolagem salva `targets` + `ability` em `flags` quando houver alvo; se não houver flags (mensagens antigas), usa os **alvos atuais**. A lista **recalcula** após usar **EDGE/TROUBLE**.
- **Compat:** `system.json` atualizado para `verified: 13.351`.

## v0.1.18 — 2026-01-25
- **Fix (HIT/MISS não aparecia):** Correção da captura de **alvos marcados** (Foundry v13) usando `game.user.targets` (com fallback), garantindo que o bloco **Acertou/Errou** apareça no chat.
- **Melhoria (Fallback):** Se uma mensagem antiga (ou algum caso especial) não tiver os alvos salvos em `flags`, o sistema usa os **alvos atualmente marcados** para ainda exibir **Acertou/Errou**.
- **Melhoria (Dano + alvo):** O botão **DAMAGE** também passou a usar `game.user.targets` (com fallback) para localizar alvos.

## v0.1.17 — 2026-01-24
- **Novo (Ataque: Acertou/Errou no Chat):** Ao rolar um **ataque** com **alvos marcados**, o card de rolagem mostra para cada alvo se o ataque **acertou** ou **errou** (comparando o **total** com a **Defesa** do alvo). Essa informação **se atualiza automaticamente** ao usar **EDGE** ou **TROUBLE** e o resultado mudar.
- **Fix (Fantastic pós-reroll):** A verificação de **Fantastic** para HIT/MISS usa o resultado **mantido** do dado Marvel (pós-reroll), sem considerar resultados descartados.

## v0.1.16 — 2026-01-24
- **Fix (Dano via Token/Minion):** O botão **DAMAGE** no chat agora resolve corretamente o **Ator do atacante** quando a rolagem veio de um **token não-linkado** (onde o `alias` do chat é o **nome do token**, não o nome do ator). Isso corrigiu o erro `Cannot read properties of undefined (reading 'system')` ao calcular dano.

## v0.1.15 — 2026-01-20
- **Fix (Trouble + Marvel Die):** Se o alvo tem **Trouble** e o dado **Marvel** é rolado novamente, o dano agora usa o **resultado mantido** (pós-reroll) e **só dobra** em caso de **Marvel Result ativo** (não mais por resultados descartados).
- **Fix (Damage Type):** Quando `damagetype:` não está presente no flavor, assume **health** por padrão.

## v0.1.13 — 2025-10-13
- **PDF Export:** Atualizado exportador embutido para **sheet-export-m616 v0.3.54**.
- **Template(s):** Copiados de `sheet-export-m616/assets/templates/` para `systems/multiverse-d616/features/sheet-export-m616/assets/templates/`.
- **Botão:** “PDF (M616)” no cabeçalho da ficha (nativo do sistema).
- **Mapeamento:** `Text43` → `system.realname` garantido.
- **Compat:** Mantidos fixes de normalização de pontuação e *flatten* dos campos longos.

## v0.1.12 — 2025-10-12
- **Nativo:** Integração do *Sheet Export — Marvel Multiverse (D616)* diretamente no sistema.
- **PDF Export:** Botão “PDF (M616)” no cabeçalho da ficha de Ator.
- **Template:** Usa `systems/multiverse-d616/features/sheet-export-m616/assets/templates/M616_Character_Sheet_Alt_Red.pdf`.
- **Mapeamento:** `Text43` -> `system.realname` (confirmado).
- **Compat:** Mantidos os fixes do v0.3.45 (normalizePdfText, WinAnsi hyphen, flatten 17, tags apenas nomes).




## 2.2.0-v13-compat
- Updated `system.json` compatibility to Foundry v13 (verified 13.341).

## 0.1.1
- Renamed system fully to Multiverse-D616.
- Declared Foundry v13 compatibility.
- Prepared publish-ready paths and manifest fields.

## 0.1.3
- Integrado nativamente **Chat Power Details** (exibe Action/Duration/Cost/Trigger/Range nos cards de chat de poderes).

## 0.1.4
- **Damage Reduction Helper** integrado nativamente (aplicar/curar dano, DR por Health/Focus, zero-damage em multiplicador 0, etc.).

## 0.1.5
- **Conditions HUD** integrado nativamente (substitui efeitos do Token HUD, auto-dano por turno, ícones, etc.).

## 0.1.6
- Fix: caminhos do Conditions HUD ajustados para **systems/multiverse-d616/** (CSS e data/conditions.json); remoção de referências 'modules/'.


## 0.1.8
- **Charactermancer** integrado nativamente (assistente passo a passo de criação, com dados locais em `apps/charactermancer/data/`).
