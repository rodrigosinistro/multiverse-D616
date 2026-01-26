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