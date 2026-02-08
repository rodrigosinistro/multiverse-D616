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
