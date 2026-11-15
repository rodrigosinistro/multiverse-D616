# Auditoria de pré-requisitos — v0.2.165 (13/11/2026)

**Escopo:** 398 registros de poderes em `apps/charactermancer/data/powers.json`,
compêndio LevelDB `mmc-powers-v0186` e reconciliação do Charactermancer. Auditoria
interna de consistência complementada por verificações pontuais no Core Rulebook,
Tony’s Workshop e Roll20; **não é comparação exaustiva dos 398 poderes com todos
os livros e expansões da Marvel**.

## Registros do catálogo corrigidos

| Poder | Power Set | Antes | Corrigido | Evidência |
|---|---|---|---|---|
| Energy Absorption | Basic | vazio | **Rank 4** | Tony’s Workshop, 14/06/2024, p. 2 |
| Blazing Fast Fists | Super-Speed | vazio | **Rank 2** | Core Rulebook / carta de poder |
| Grow 2 | Resize | vazio | **Grow 1** | Core Rulebook / Roll20 |
| Do This All Day | Martial Arts | vazio | **Rank 2** | Core Rulebook / Roll20 |
| Do This All Day | Shield Bearer | vazio | **Rank 2** | Core Rulebook / Roll20 |

**Compêndio:** além desses cinco registros, havia **23 IDs de compêndio** cujo
pré-requisito divergia do JSON (alguns incluíam registros anteriores substituídos
no log). Todos foram ajustados para o valor canônico do catálogo, sem alterar
efeitos, nomes, IDs ou outras propriedades. Exemplos de erros graves:
`Speed Run 2` (Rank 2 no pack vs Rank 3 no JSON), `Return Fire` (Rank 8 no
pack vs Rank 2 no JSON), `Dance of Death` (dependência truncada) e requisitos
com erros de pontuação/grafia, que poderiam bloquear poderes válidos.
O teste `power-prerequisites-v165.test.mjs` exige que **todos os 398 registros
mais recentes** do compêndio tenham os mesmos pré-requisitos do catálogo.

**Camada de proteção:** sete entradas (os cinco registros acima, `Speed Run 2` e
`Return Fire`) são corrigidas em memória ao combinar o catálogo com cópias
antigas de compêndios ou itens do Mundo. O sistema não modifica automaticamente
as fichas de personagens nem elimina poderes já escolhidos. O Mestre deve
revisar as fichas afetadas. A exceção legítima de `Surprising Power` continua
aplicável. A normalização preserva requisitos adicionais personalizados.

**Anomalias deliberadamente não alteradas:** existem cadeias com Ranks aparentemente
inconsistentes no livro, por exemplo `Blur` e `Speed Blast` (`Rank 2` mas
dependentes de `Speed Run 2`, que exige Rank 3), e `Precognition 2` com requisito
inferior ao de seu antecessor. O validador já exige o poder antecessor; não
transformamos estas ambiguidades editoriais em regras novas sem uma errata
verificada. Dependências como `Sorcerous`, `Chaotic` e `Cursed` são Traits,
não poderes ausentes; `None` pode significar ausência de requisitos.

**Referências:**
- https://cdn.marvel.com/u/prod/marvel/i/pdf/MMRPG_Tonys_Workshop_20240614.pdf
- https://cdn.marvel.com/u/prod/marvel/i/pdf/MMRPG_Errata_20241220.pdf
- https://roll20.net/compendium/marvel616/Do%20This%20All%20Day
- https://roll20.net/compendium/marvel616/Grow%202

---

## Validação adicional — v0.2.124

Durante testes reais da v0.2.123, o Sucesso Fantástico de **Speed Blast** aplicava Caído ao **lançador**, por causa da marcação `self:true` no mapeamento de condições. Corrigido para aplicar **Atordoado** (acerto) e **Caído** adicional (Sucesso Fantástico) exclusivamente ao **alvo atingido**. Adicionado teste de regressão cobrindo ataque, acerto comum, Fantástico, rerrolagem e falha.

# Auditoria dos poderes — fase 2 (v0.2.123)

**Fonte utilizada:** os efeitos de `apps/charactermancer/data/powers.json` distribuídos no próprio sistema, comparados ao código de resolução e ao processamento de dano. Não houve comparação exaustiva com manuais oficiais nem alteração direta dos itens importados no mundo.

| Poder | Classificação da auditoria | Tratamento v0.2.123 |
|---|---|---|
| Command Animal | Teste situacional, sem dano | Ego vs Ego só quando necessário |
| Banging Heads (Martial Arts) | Ataque danoso contra **dois** alvos | Melee vs Melee; exige ambos atingidos; Fantastic ×1 e Caído já existentes |
| Time Travel Other | Teste não danoso | Ego vs Vigilance |
| Dimensional Travel Other | Teste não danoso | Ego vs Vigilance |
| Hurled Shield Deflection | Reação sem teste | Não rola ataque; efeito da reação permanece sob controles existentes |
| Webcasting | Teste não danoso | Agility vs Agility; usa condições já existentes |
| Supernova | Ataque danoso em área | Ego vs Resilience; Health, ½ no acerto comum, integral no Fantástico |
| Multiversal Travel Other | Teste não danoso | Ego vs Vigilance |
| Speed Blast | Teste não danoso | Agility vs Agility; Atordoado/Caído já mapeados |
| Steal Power | Teste não danoso | Ego vs Ego; transferência dos poderes depende do Mestre |
| Brain Drain | Ataque danoso em Focus | Ego vs Vigilance; recuperação de Focus do lançador ainda não automatizada |
| Steal Powers | Teste não danoso | Ego vs Ego; transferência dos poderes depende do Mestre |

**Importante:** esta etapa ajusta o **tipo de rolagem e dano**; não significa que todos os efeitos secundários/narrativos desses poderes estejam automatizados. Continuam pendentes uma avaliação específica das recuperações de Brain Drain, o gasto e posicionamento de Supernova e as escolhas do Mestre em viagens e roubo de poderes.

**Outros alertas da auditoria:** `Environmental Protection` apresenta `action: Permanent` e `duration: Instant`, enquanto `Iconic Weapon` tem descrição resumida vazia, embora o efeito completo esteja presente. Não foram alterados sem validação editorial. A contagem de 398 poderes e a sincronização com o compêndio seguem protegidas por testes.

---

> **Atualização v0.2.122 — Catálogo vs compêndio:** os 398 poderes do catálogo agora possuem entradas correspondentes no compêndio distribuído. A v0.2.121 já distribuía o mesmo compêndio da v0.2.120, com 392 itens; seis registros estavam ausentes: Control Emotion, Control Group Emotion, Sense Emotion, Sway Emotion, Iconic Item e Power Cosmic. Restaurados na v0.2.122 preservando IDs, sem alterar o processamento de combate. Quatro divergências preexistentes de nomes de outros poderes também foram corrigidas: Invisibility → Mirror Images, Extend Invisiblity → Extend Invisibility, Elemental Richochet → Elemental Ricochet e Steal Powers → Steal Power.

# Auditoria de Poderes — v0.2.121 (02/11/2026)

## Escopo e limites

Esta auditoria analisa os **398 poderes** existentes em `apps/charactermancer/data/powers.json`,
a resolução de rolagens em `scripts/power-rolls.mjs` e o classificador de ações no
`turn-tracker-core.mjs`. Trata-se de **auditoria de consistência e execução do código**, não
comparação exaustiva com o texto de todos os livros oficiais. Alterações particulares nas
fichas dos mundos não foram inspecionadas. A auditoria pode ser executada sem Foundry via
`auditPowerCatalog()` em `scripts/power-catalog-audit.mjs`, e sua integridade é testada
pela suíte de Node existente.

## Correção confirmada e aplicada

| Poder | Dados antigos | Comportamento esperado pelo efeito do catálogo | Ajuste v0.2.121 |
|---|---|---|---|
| Control Emotion | `attack: true`, sem `attackTarget` | Ego contra Ego, sem dano direto | Teste sem dano, defesa Ego |
| Control Group Emotion | `attack: true`, sem `attackTarget` | Ego contra Ego, alvos individuais, sem dano direto | Teste sem dano, defesa Ego |
| Sense Emotion | `attack: true`, sem `attackTarget` | Ego contra Ego, sem dano direto | Teste sem dano, defesa Ego |
| Sway Emotion | `attack: true`, sem `attackTarget` | Ego contra Ego, sem dano direto | Teste sem dano, defesa Ego |

O ajuste é feito pelo **resolvedor de rolagens**: nenhum compêndio, ficha de personagem
existente ou regra personalizada é sobrescrito. Os quatro poderes continuam lançando
um teste real, mas deixam de chamar `calcDamage` como se fossem ataques danosos.

## Revisão manual pendente (não houve mudança automática)

- **12 poderes** possuem `attackKind` definido mas não foram classificados pelo motor
  como ataque danoso ou `checkOnly`: Command Animal, Banging Heads (Martial Arts),
  Time Travel Other, Dimensional Travel Other, Hurled Shield Deflection,
  Webcasting, Supernova, Multiversal Travel Other, Speed Blast,
  Steal Power, Brain Drain e Steal Powers. Alguns podem ser poderes especiais,
  testes não danosos ou dependentes de regra específica. É necessário revisar
  suas descrições individualmente antes de mudar a interpretação.
- **Environmental Protection:** `action: Permanent` enquanto `duration: Instant`;
  verificar manualmente a intenção desses campos antes de alterar o catálogo.
- **Iconic Weapon:** descrição curta vazia; o texto completo de efeito está presente.
- Ações usam diversas grafias e idiomas (ex.: `Standart`, `Reação`, `Standard ou Movimento`).
  O classificador **já reconhece** essas variantes; nenhum ajuste automático de
  custo de ações foi realizado.
- Pré-requisitos de Magic como **Sorcerous**, **Cursed** e **Chaotic** são traços,
  não necessariamente poderes ausentes; os pré-requisitos do Charactermancer
  também consultam o catálogo de traços e tags. Não foram removidos.

## Cuidados e próximos passos

1. Testar no Foundry uma rolagem Ego vs Ego com os quatro poderes: deve aparecer
   como teste de efeito, sem botão de dano.
2. Validar o grupo de 12 poderes acima **um a um**, comparando a ficha ao texto
   original da regra antes de autorizar correções. Não inferir dano somente pelo
   nome ou pela presença de `attackKind`.
3. Preservar as personalizações do Mestre, os compêndios e o Charactermancer;
   caso sejam feitas alterações oficiais, preferir migrações conservadoras.

## Reprodutibilidade

A suíte automatizada executa a auditoria de todos os poderes e falha diante de
novo ataque danoso sem atributo/defesa e de uma regressão nos quatro poderes
corrigidos. Outros achados são relatados para revisão e não mudam o jogo.
