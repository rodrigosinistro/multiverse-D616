**v0.2.68 (Foundry VTT v14):** Banging Heads derruba os alvos atingidos no Fantástico depois de confirmar cada dano; Deafen aplica Surdo por um turno e somente permite dano no Fantástico; Flare e Dazzle também recebem dano normal apenas no Fantástico. Barreira física usa a constante moderna de sentidos v14. `system.json` aponta para a release `v0.2.68` **a ser publicada manualmente após validação**. ZIP único com pasta `multiverse-d616/`: para atualizar o repositório copie o **conteúdo** dessa pasta para a raiz, mantendo `system.json` na raiz. A URL `download` no manifesto só funcionará depois de criar a release e enviar o ZIP de nome correspondente. Não houve publicação automática. Consulte CHANGELOG para detalhes.

**v0.2.65 (Foundry v14):** ataques adicionais opcionais para Unstoppable Assault e Unrelenting Smash (novos 15 Focus por rolagem, Movimento limitado e sem repetir alvos); ações sustentadas de Hellfire Chains (teste por rodada contra alvo preso, dano Health e Focus) e Coiling Crush (Movimento para esmagar por Melee vs Resilience). Atalhos e botões dependem da situação e respeitam as configurações do Mestre. Não substituem posicionamento nem decisões de alcance especial. Ver CHANGELOG.

**v0.2.56 (Foundry v14):** Refinamento de ataques contra múltiplos alvos: condições distintas com o mesmo valor líquido de Edge/Trouble deixam de gerar revisão manual desnecessária. O card passa a mostrar as origens por alvo. Modificadores realmente divergentes continuam sob decisão do Mestre, preservando uma única rolagem, Focus, DR e dano por alvo. Testes e detalhes no CHANGELOG.

**v0.2.49 (Foundry v14):** Ajustes na duração de condições de poderes (inclusive efeitos aplicados durante o turno do alvo e retrocesso de turnos), identificação do token afetado e interrupção automática de Concentração ao receber Atordoado ou Desmoralizado. Mantidos os encerramentos por Concentração, atalhos de condição e automações de veneno/sangramento da v0.2.48. ZIP completo para instalação e teste; ver CHANGELOG.

**v0.2.48 (Foundry v14):** Escapar de poderes de Grab permite escolher Ação Padrão ou Reação (quando disponíveis). O HUD oferece testes para encerrar Sangrando (Logic TN 10) e Em Chamas (Agility TN 10); Sangrando também termina ao recuperar Health. Envenenado agora pede Resilience TN 18 no início do turno e aplica perda de 1 Health na falha ou cura em Sucesso Fantástico. Correção do aviso de `Roll.evaluate` no Foundry v14. Compêndios e demais rotinas preservados. Ver CHANGELOG para regras, escopo e testes.

**v0.2.47 (Foundry v14):** adiciona condições automáticas para Venom Burst, Headshot, Penance Stare, Double Tap, Growing Attack, Snap Shooting e Spider-Strike, respeitando confirmação de dano, Saúde/Focus, rerrolagens e aplicação por alvo. Mantidos compêndios e interface da v0.2.46; cálculo especial de dano continua manual quando necessário.

**v0.2.46 (Foundry v14):** corrige no compêndio Powers o nome duplicado de Venom Bash para **Venom Burst** (descarga bioelétrica em área). Mantidos o ID, conteúdo e pré-requisito. Todas as automações e funcionalidades da v0.2.45 foram preservadas.

## Configurações de automação — v0.2.54 (Foundry VTT v14)

Acesse **Configurações do Jogo → Multiverse-D616**. As opções são de **mundo**, alteráveis pelo Mestre, e são lidas durante o uso: não é necessário reinstalar o sistema ao alterar uma configuração.

- **Automações — DESATIVAR TODAS**: marcada, prevalece sobre os controles abaixo. Desmarcada por padrão.
- **Condições automáticas de poderes**: efeitos aplicados por rolagens e confirmação de dano de poderes.
- **Efeitos elementais fantásticos**: condições elementais e Force/Earth aplicados automaticamente em Sucessos Fantásticos.
- **Dano contínuo e Envenenado**: dano no fim do turno e testes de veneno no começo do turno. A opção anterior “Aplicar dano de condições automaticamente no fim do turno” continua funcionando em conjunto (ambas devem estar ativadas para dano contínuo).
- **Recuperação automática de condições**: remoção de Sangrando quando Health é recuperada. Testes iniciados manualmente continuam disponíveis.
- **Concentração e manutenção de Focus**: criação, controle de limite, interrupções automáticas e manutenção por turno.
- **Consumo automático de Ações e Movimento**: registra o gasto espontâneo no Controle de Turno, sem desativar os botões de controle manual.

Os seis grupos ficam **ligados por padrão**, preservando as mesas de versões anteriores. A chave geral se aplica apenas a **automações opcionais dos grupos descritos**: rolagens, cálculo de dano, confirmação manual de dano, custo inicial de Focus, movimentação básica do Foundry, criação de fichas, edição manual de condições e controle manual de recursos não são desligados. Efeitos já ativos ainda precisam expirar/ser removidos normalmente para evitar condições permanentes indevidas.

O **Template de Ficha (cor)** também está agora nas opções do **Multiverse-D616**, em vez de “Não Mapeado”. Na primeira abertura pelo Mestre, a cor global antiga é copiada automaticamente, sem sobrescrever uma nova escolha já definida.

## Versão 0.2.45 — Sucessos Fantásticos e Condições por Poder (Foundry v14)

A v0.2.45 adiciona automações de **condições** para 16 poderes: Smash, Reverse Punch, Telekinetic Attack, Disrupt Person, Bolts of Balthakk, Focused Strike, Mental Punch, Telepathic Blast, Venom Bash, Venom Blast, Point-Blank Parry, Telekinetic Toss, Flying Double Kick, Dance of Death, Orchestra of Overkill e Unrelenting Smash.

Marque os alvos antes de rolar o poder. Após um acerto fantástico, o Mestre usa o card **DAMAGE** e confirma a aplicação. Somente os alvos atingidos e confirmados recebem o status. **Venom Bash** e **Venom Blast** exigem perda efetiva de Health. Rerrolar Edge/Trouble após a confirmação invalida os efeitos deste card; use um novo card de dano. Status colocados manualmente pelo Mestre não são alterados.

As fórmulas de dano, as opções de ataques adicionais e outras exceções particulares dos poderes não são modificadas nesta versão. Consulte o CHANGELOG para a delimitação desta entrega.

## Versão 0.2.41 — Estabilização Geral (Foundry v14)

- Efeitos transitórios de Concentração gerados em formato v14 (`type: "base"`, `system.changes` com `type` textual), sem `mode` numérico; efeitos de Body Sheet e Shield e custos existentes preservados.
- No Controle de Turno, pedidos de consumo de recursos são validados pelo Mestre e rejeitam consumos repetidos, valores inválidos ou ações e reações já esgotadas. Pedidos concorrentes continuam serializados por combatente.
- Resolução de ID de combate sem substituição silenciosa pelo combate atualmente aberto; pedidos atrasados de encontros encerrados não afetam outro combate.
- Fichas, HUD, Charactermancer, design e compêndios permanecem intactos. Algumas mensagens de console de módulos de terceiros e arquivos de imagem que não existem no servidor não fazem parte desta correção.
- Executar testes reais de Reações Mestre/Jogador, Concentração Shield, Combat Reflexes e alternância entre combates.

## Versão 0.2.40 — HUD e Controle de Turno 2.0 (Foundry v14)

- Título **Atributos** restaurado no painel de atributos.
- Poderes e Traços & Tags alinhados no topo com colunas em grid, independente do tamanho das listas.
- Textura original vermelha repetida por toda a altura dos painéis, inclusive em listas extensas.
- Ficha de NPC da v0.2.34 preservada integralmente.

## Versão 0.2.34 — Fichas de Personagens e NPCs em ApplicationV2

- Corrigida a listagem do grupo selecionado: poderes com o mesmo nome em outros grupos (ex.: Jump 1/2/3 de Spider-Powers e Super-Strength) não aparecem misturados.
- Mantidos todos os poderes e variantes legítimas no catálogo geral; o filtro afeta somente a visualização do grupo ativo.
- Preservados o Charactermancer 2.0, as seis etapas e os mecanismos de criação e importação.
- Teste recomendado: alternar entre Spider-Powers e Super-Strength; cada grupo deve exibir apenas suas próprias progressões Jump.

## Versão 0.2.31 — Correção do Charactermancer 2.0

Correção da colisão de `state` com a propriedade de ciclo de vida (somente leitura) da `ApplicationV2` no Foundry v14. Os dados de criação usam `mmcState`, sem mudar as regras, os passos ou os poderes.

# Multiverse-D616

**Sistema para Foundry VTT v14**. Versão atual: **0.2.45**.

## v0.2.30 — Charactermancer 2.0 (ApplicationV2)
- Janela migrada da antiga ApplicationV1 para ApplicationV2 do Foundry v14; seis etapas e motor de criação preservados.
- Interface vermelho/preto/branco inspirada no Controle de Turno, com cabeçalho de progresso e rolagem interna.
- Os dois antigos shims V1 do Charactermancer deixam de ser carregados.
- Nenhuma alteração em compêndios, poderes, pré-requisitos, atributos, criação de atores ou exportação PDF.
- Validar no Foundry v14 real: criação completa de personagem, navegação e fechamento, poderes repetidos, popup de efeito.

## v0.2.29 — Diálogos modernos do Foundry v14

- Migrados para `DialogV2.wait` os fluxos de seleção de alvos, teste situacional, convite de Escapar como Reação e escolha de Focus variável (antes da ação e ao recalcular a rolagem no chat).
- Visual unificado com a identidade do Controle de Turno: vermelho, preto e branco. O comportamento padrão de seleção manual de alvos permanece inalterado.
- A seleção, confirmação, cancelamento e validação de valores de Focus acontecem antes de alterar recursos. Fechar um diálogo não consome recursos.
- Migração limitada a essas janelas para evitar regressões nas fichas/Charactermancer. Outras interfaces V1 permanecem para conversão separada e testável.
- Compêndios e lógica de Combat Trickery, concentração, condições e automações permanecem idênticos à versão aprovada.

## v0.2.28 — Combat Trickery: ataques com metadados legados

- Corrigido o reconhecimento de ataques de poderes como **Double Tap**, cujo registro antigo traz `attack: false`, apesar de definir atributo, defesa e tipo de ataque.
- O poder preparado agora afeta a **próxima rolagem de ataque válida**, convertendo seu dado Marvel em MARVEL (1), respeitando o Rank dos alvos e o limite de uma vez por batalha.
- A notificação esclarece que rolagens anteriores não são alteradas. Os demais poderes, compêndios e a seleção de alvos não foram modificados.

## Correção de alcance para mapas sem grade — v0.2.25 (Foundry VTT v14)

- Em cenas sem grade, o Foundry v14 pode retornar `spaces: 0` para quaisquer duas posições. Agora o sistema converte corretamente a distância real da régua pela distância de um espaço da cena e verifica o alcance mesmo sem grade visual.
- Melhora a busca do token atacante em cenas com atores sintéticos/não vinculados. Se houver alvos, mas não for possível localizar o atacante, o sistema avisa explicitamente que o alcance não foi verificado.
- Regra permanece de **aviso, com escolha de continuar ou cancelar** antes de gastar Focus; não cria bloqueios rígidos.

## Combate Inteligente — v0.2.24 (Foundry VTT v14)

- Antes de gastar Focus, trocar Concentração ou rolar dados, ataques direcionados com alvos marcados verificam **alcance conhecido** e **eventuais obstáculos à linha de visão**. O sistema só adverte quando encontra uma condição concreta; não bloqueia irrevogavelmente um poder porque o mapa não é perfeito.
- Usa `attackRange` quando positivo, senão o campo `range` (ex.: `10 spaces`, `10 espaços`, `Reach`, `5 spaces per rank`, `10 espaços vezes o rank do personagem`) e a distância medida no mapa. Alcances não declarados ou ambíguos continuam sem validação automática, em vez de inferências arriscadas. O alcance maior de `system.reach` funciona para ataques Reach.
- Para ataques à distância, verifica paredes de visão pelo `PointSourcePolygon.testCollision` nativo da API Foundry v14. Diferenças de altura e APIs indisponíveis não são tratadas como obstrução confirmada: nesses casos o Mestre avalia.
- Se encontrar possível problema: **Trocar alvos**, **Cancelar** ou **Continuar mesmo assim**. Cancelamento não gasta Focus nem substitui Concentração. Continuar registra a advertência no chat para o Mestre. Ao escolher novo alvo, usa a interface da v0.2.22 sem reativar memória de últimos alvos.
- Elemental Prison/Sphere mantêm o desenho de Regiões e as regras de barreira já validadas: a posição do centro da área não é um alvo comum, portanto não se inventa alcance direto a partir dos tokens marcados.
- Nesta entrega, validação de alcance/visão e avisos foram priorizados. Os aprimoramentos mais amplos de dano e ataque multi-alvo ficam para versão posterior, após testes em Foundry real.

## Condições e tentativas de escape — v0.2.20 (Foundry v14)

- No HUD nativo, aba POWERS, o dono de um personagem afetado pode escolher **Escapar: [Poder]**. O teste rola Melee, usa TN 20 para Elemental Grab, Telekinetic Grab, Crimson Bands e Hellfire Chains, TN 16 para Webgrabbing/Webcasting e a defesa Melee atual do controlador em Coiling Crush.
- Tentativas em combate consomem uma Ação Padrão no Controle de Turno e só são realizadas no turno do personagem (o Mestre pode administrar exceções). Falha mantém as condições; sucesso remove somente os efeitos de contenção desse poder/card, nunca efeitos manuais ou consequências elementais com duração própria.
- Mists of Morpheus: o Sucesso Fantástico adiciona o indicador **Sono profundo** à condição Atordoado, até cessar a Concentração. O livro não especifica número-alvo para despertar; a decisão permanece com o Mestre.
- Rolagens e remoções automáticas dos efeitos são processadas pelo Mestre ativo; não há cobrança de Focus para o teste de escape. Os demais controles das v0.2.19 permanecem intactos.

## Sphere e Prison — v0.2.19 (Foundry v14)

- **Controles de Poder para jogadores:** o proprietário do personagem pode usar **Desenhar área** mesmo se o card do chat tiver sido criado pelo Mestre; pedidos remotos são conferidos novamente pelo Mestre ativo para impedir uso não autorizado.
- **Desenho sobre tokens:** durante a operação de desenho, o sistema intercepta o mouse antes da seleção de tokens. Clique e arraste sobre qualquer parte do mapa, inclusive em cima de um token, para dimensionar a Região. Solte para confirmar; Esc ou clique direito para cancelar; os eventos são limpos automaticamente.
- **Interface:** removida a linha redundante de Proteção/Defesa abaixo do botão. A descrição do poder mantém as regras, e o painel aparece apenas uma vez.
- **Proteção automática:** preservadas Regiões, intercepção por posição, Concentração, defesa Ego, absorção de dano e remoção da Região. As outras automações continuam inalteradas.

## Poderes Elementais — v0.2.16 (histórico)

- **Elemental Push:** setas visuais de direção (↖ ↑ ↗ ← → ↙ ↓ ↘), quantidade de espaços e permissão ao autor do ataque. Quando o token de terceiro pertence a outro jogador, o Mestre ativo executa a atualização validada. Um mesmo card movimenta cada alvo apenas uma vez.
- **Sucesso Fantástico do Push:** o card oferece DAMAGE mesmo sendo um teste sem dano em sucessos normais. O Mestre confirma o dano; depois, Caído e o especial elemental são aplicados, sem duplicidade.
- **Sphere/Prison:** botão **Desenhar área** no chat do poder. Sphere centralizada no conjurador; Prison pede clique no ponto desejado. A área é um template circular **editável** do Foundry (não é parede, barreira física de colisão ou alvo de ataque próprio), de raio padrão até 5 espaços por Rank. O template é removido ao encerrar a Concentração correspondente.
- **Proteções:** Elemental Protection e Sphere ativas no token interceptam ataques confirmados no card de dano; o Mestre pode escolher atacar diretamente o alvo ou especificamente a estrutura (incluindo Prison). A defesa para o ataque à estrutura é Ego do criador. Ataques de dano bruto até 10×Protection são absorvidos; se exceder, a proteção se quebra, mas o ataque não fere o protegido. O ícone M traz o nome do efeito ativo.
- **Segurança:** dano/efeitos especiais não são duplicados ao reaplicar o mesmo card. A geometria do template não rastreia automaticamente obstáculos ou personagens na área; cabe ao Mestre direcionar a resolução contra a estrutura, quando apropriado. Faça backup antes de atualizar.

## Poderes Elementais Avançados — v0.2.15

- Elemental Prison, Elemental Sphere, Elemental Suffocation e Elemental Push possuem fluxos de rolagem distintos e efeitos em acertos normais/Fantásticos.
- O Mestre confirma danos e controla a estrutura/posicionamento no card. Sem criar paredes, objetos ou áreas físicas automaticamente no mapa.
- Elemental Prison/Sphere herdam custo e resistência de Elemental Protection; o sistema aplica condições especiais respeitando a Concentração e os alvos marcados.

## Resize Other — v0.2.14

Marque **exatamente um token-alvo** na cena, deixe o token do personagem próximo o suficiente para tocar e use **Resize Other** pela ficha ou pela aba POWERS. A janela permite selecionar apenas tamanhos alcançáveis pelos níveis de Grow/Shrink que o personagem possui (Rank 3 e Grow 2 ou Shrink 2 no mínimo), e confirmar se o alvo concorda. Um alvo resistente precisa estar **Agarrado** antes da ativação. Quando o alvo não pertence ao jogador e é declarado voluntário, o Mestre confirma a concordância. O poder custa **10 Focus**, sem rolagem própria de ataque.

A escolha muda os atributos derivados e o X/Y/Z do token-alvo, preservando o tamanho natural. **Restaurar tamanho anterior** remove Resize Other e recupera um Grow/Shrink próprio anterior, quando houver. A aplicação no token-alvo de outro proprietário passa pelo Mestre ativo. **Resize Object não recebe automação**: continua interpretativo, pois objetos podem não existir como elementos de mapa. Faça backup do mundo antes de atualizar.

## Condições dos Poderes — v0.2.11

Ao usar um dos 23 poderes mapeados com um alvo marcado, o Mestre ativo aplica automaticamente ao token atingido uma condição visível (por exemplo, Atordoado, Cego, Caído, Agarrado ou Sangrando). O sistema distingue acerto normal e fantástico, reconhece modificações posteriores da rolagem por Edge/Trouble e remove somente as condições que pertencem ao card. Condições temporárias expiram no combate pelo turno apropriado; as que dependem de Concentração acompanham a Concentração. Condições sem término fixo (como Sangrando/Agarrado) continuam até remoção manual do Mestre.

**Importante:** o jogador deve marcar os alvos **antes de rolar**. A atribuição automática requer um Mestre online. Fora do combate, a expiração é manual. O efeito do status na ficha/token é automático, mas as penalidades específicas das condições (ex.: Trouble, dano contínuo ou encerrar outras Concentrações) ainda podem exigir decisão do Mestre. Poderes que dependam de causar dano real, teste de fuga ou consequência opcional não foram automatizados indiscriminadamente. Faça backup do mundo antes de testar.

## Rolagens de Poderes — v0.2.10

Os Poderes com testes definidos agora usam o atributo correto e avaliam, quando aplicável, a defesa do token marcado ou o número-alvo (TN) fixo. O card diferencia sucesso normal, falha, Sucesso Fantástico e Falha Fantástica, sem confundir o dado Marvel M com um acerto automático. Poderes sem dano não oferecem DAMAGE (exceto a possibilidade prevista de dano com Sucesso Fantástico em Jinx You e Flare). As rolagens situacionais pedem confirmação antes de gastar Focus/Concentração. Os controles **Teste sem dano** e **TN fixo** ficam na ficha do Poder. Registros incompletos de personagens antigos recebem valores de referência no uso, preservando alterações manuais.

**Importante:** o motor de Focus, Concentração e as funcionalidades de Grow/Shrink da v0.2.9 continuam preservados. Modificadores e efeitos especiais narrativos de muitos poderes ainda requerem decisão do Narrador. Faça backup do mundo antes de testar esta atualização.

## Motor de Focus — v0.2.9

O uso de poderes reconhece custos em `Focus` e `Foco`, fixos e variáveis. Quando houver Concentração, o jogador escolhe/valida o custo antes de confirmar mudanças. Efeitos com custo `por turno` ou `per round` debitam automaticamente a manutenção no começo dos turnos seguintes do ator no combate, uma vez por turno. O chat oferece **Encerrar manutenção**; encerrar a Concentração também encerra a cobrança. Sem Focus suficiente, o efeito é encerrado. Em poderes com duração por Rank, a manutenção termina ao esgotar a duração. Fora do combate a manutenção deve ser administrada manualmente.

**Instalação:** faça backup do mundo, substitua a pasta `Data/systems/multiverse-d616` pelo conteúdo deste ZIP e reinicie o Foundry. Faça os primeiros testes como Mestre em um mundo de teste. O ZIP contém o sistema completo; o GitHub não é alterado.

## Atualização v0.2.8 — Poderes permanentes acionáveis nos atalhos

A aba **POWERS** do Token Action HUD nativo inclui **Resize Object** e **Resize Other** (também aceita a grafia `Resize Others`), além de 11 outros poderes com duração Permanente que demandam uso deliberado ou teste de dados: Charmed Life, Disguise, Domination, Edit Memory, Flexible Fingers, Levitation, Memory Blip, Orders, Rubberneck, Shape-Shift e Teleport Object. Grow/Shrink 1–4 continuam disponíveis. Modificadores puramente passivos como Mighty, Flight e Sturdy permanecem ocultos.

A função do botão é executar o fluxo original `Item.roll()` da ficha. A atualização não cria novas janelas de seleção de alvos/objetos nem automatiza efeitos que ainda são narrativos. 

## Atualização v0.2.7 — Dimensões X/Y/Z do token automáticas

- Grow, Shrink e a alteração manual de tamanho passam a atualizar **X/Y/Z** (largura, altura e profundidade da caixa do token na grade) na cena ativa e no token padrão de um personagem vinculado.
- Tabela: Microscopic **0,1**; Miniature **0,3**; Tiny **0,5**; Little **0,7**; Small **0,9**; Average **1**; Big **2**; Huge **3**; Gigantic **5**; Titanic **8**; Gargantuan **10** em todos os três eixos.
- Retornar ao normal respeita o tamanho natural configurado, incluindo Unusual Size. Tokens independentes (não vinculados) redimensionam apenas sua instância, sem alterar os demais NPCs do mesmo Actor.
- Não altera `x/y` (posição), elevação nem escala da arte. Os novos valores mudam o espaço ocupado na grade do Foundry v14; teste colisões e movimento em combate.
- Faz limpeza de modificadores legados de dimensões quando necessário; compêndios/Charactermancer preservados.

## Atualização v0.2.6 — Encolhimento com escolha de tamanho e atalhos

- **Shrink 1–4:** janela de seleção de categoria ao usar o poder, tanto por ficha de PC/NPC quanto por atalho **POWERS**.
- **Tamanhos disponíveis:** Shrink 1 até Little (45,72 cm), Shrink 2 até Tiny (10,16 cm), Shrink 3 até Miniature (2,54 cm), Shrink 4 até Microscopic (6,35 mm). Níveis superiores incluem as categorias inferiores, limitadas também pelo tamanho natural.
- **Duração Permanente:** Shrink 1–4 aparecem na lista de atalhos como exceção, como Grow 1–4. Outros poderes Permanentes continuam ocultos.
- **Sem acumulação:** um único efeito de Grow ou Shrink por personagem. Alternar entre os dois substitui o anterior, preservando tamanho natural e os modificadores de tamanho já configurados na ficha.
- **Tamanho normal** remove o redimensionamento temporário, e **Cancelar** não altera a ficha nem consome recursos. Selecionar tamanho natural manualmente remove ambos os efeitos temporários.
- **Instalação:** atualize a pasta `multiverse-d616`, reinicie o Foundry VTT v14 e teste com cópia de segurança do mundo.
- **Publicação:** após validar localmente, criar release `v0.2.6` e anexar `multiverse-d616-v0.2.6.zip`; o GitHub não foi alterado automaticamente.

## Atualização v0.2.5 — Crescimento nos atalhos

- **Grow 1–4** aparecem na aba **POWERS** do Token Action HUD nativo, apesar de duração Permanente, e utilizam a mesma janela de seleção de tamanho da v0.2.4.
- Outros poderes permanentes continuam ocultos na lista, sem alterar seus modificadores.
- **Validação:** `node --test tests/*.test.mjs` e teste visual no Foundry VTT v14.
- **Publicação:** criar release `v0.2.5` e anexar `multiverse-d616-v0.2.5.zip` apenas após testar localmente.

## Atualização v0.2.4 — Crescimento controlado por categoria

- **Grow 1–4:** janela ao usar o poder nas fichas de PCs/NPCs, com seleção de tamanho dentro dos limites permitidos e faixas de altura em metros.
- **Normalizar:** opção para restaurar o tamanho natural; cancelar não cria efeitos nem registra uso.
- **Tamanho escolhido:** efeito ativo independente, trocando os bônus de tamanho sem acumular etapas e preservando tamanho natural, alcance, movimentação e os demais efeitos.
- **Validação interna:** `node --test tests/*.test.mjs`.
- **Distribuição:** atualizar a versão 0.2.4 no GitHub somente após testes locais, criando release/tag v0.2.4.

## Atualização v0.2.3 — Correções de Poderes

- **Stilt Steps:** transferência permanente de Run ×2 e Climb ×2, sempre visíveis na ficha.
- **Flight 2:** Jump permanece disponível; não é mais desativado pelo voo.
- **Shield 1–4:** Health DR apenas com a Concentração do poder ativa; remover a Concentração remove o benefício.
- **Extended Reach 1–2:** x4 e x10 são alternativas, não multiplicadores acumulativos. Alcance respeita o tamanho.
- **Migração:** converte poderes antigos de fichas existentes; reforça backup antes de instalar.
- **GitHub:** o `download` v0.2.3 do manifesto só passa a funcionar após criar uma release `v0.2.3` e anexar o ZIP completo.

## Atualização v0.2.2 — Auditoria de Power Modifiers e movimentação

- **Bônus sem acumulação:** Mighty, Accuracy, Brilliance e Discipline 1–4 agora usam `UPGRADE`; prevalece o maior benefício, em vez da soma dos níveis inferiores.
- **Flexible Bones 2:** redução de dano à Saúde 2 adicionada.
- **Flight 1/2, Speed Run 1/2:** maior multiplicador de deslocamento fora de combate prevalece. Speed Run 2 atualizado para ×50 e Rank 3.
- **Speed Swim:** aumenta a velocidade de natação **normal** × Rank; deslocamento fora de combate ×3.
- **Jump 2/3:** efeitos de velocidade adicionados nas árvores Spider-Powers e Super-Strength, com ×3/×50 fora de combate, sem acumular níveis.
- **Stilt Steps:** corrigido para **ação de movimento instantânea**. Durante seu uso no turno de combate, aplica Run ×2 e Climb ×2, expirando na mudança de turno; fora de combate exibe orientação e não deixa efeito permanente.
- **Body Sheet:** bônus de redução de dano à Saúde 3 e Glide ×2 da corrida normal aplicados **apenas enquanto a condição do Power em Concentração estiver ativa**. Ataques por armas/Powers ficam bloqueados durante a condição.
- **Migração de fichas:** atualização automática e repetível dos efeitos antigos em Actors existentes, preservando os itens e IDs dos poderes. O Mestre primário executa a migração ao entrar na mesa; recomenda-se backup do mundo.
- **Testes offline:** `node tests/movement.test.mjs` e `node --test tests/*test.mjs`. Teste com Foundry VTT v14 real continua recomendado.
- **Distribuição:** o ZIP instalável contém `multiverse-d616/`. Não é necessário instalar o Charactermancer separadamente.
- **Publicação futura:** o endereço de `download` da v0.2.2 foi previsto para sua respectiva release; para esta versão, use v0.2.3 após validar os testes.

## Atualização v0.1.97 — Controle de Turno e Concentração

- **Controle de Turno:** a janela se abre automaticamente para participantes conectados quando o Mestre adiciona o primeiro personagem ao combate ativo, mesmo que estivesse fechada ou minimizada. Novas adições ao mesmo combate respeitam um fechamento manual posterior.
- **Bandeja de condições:** o jogador proprietário do Actor pode clicar no **×** dos seus próprios status de Concentração. Remover `Concentração N` encerra todas as concentrações; remover o status de um Power encerra apenas aquele Power.
- **Permissões:** demais condições continuam limitadas ao Mestre. Com Mestre conectado, a operação é autorizada e executada pelo GM via socket do sistema; sem Mestre, permanece disponível a execução diretamente pelo proprietário.
- **Instalação:** extraia o ZIP que contém `multiverse-d616/` na pasta `Data/systems` do Foundry v14. Para atualizar o GitHub, use o ZIP de fontes com os arquivos na raiz. O link de download da nova versão no `system.json` será válido **após** publicar a release `v0.1.97` com o ZIP instalável.

## Atualização v0.1.96 — PDF com Traits/Tags repetidos

- A exportação PDF agora mostra a quantidade de Traits e Tags repetidos na primeira página, igual ao site (ex.: **Linguist ×2**).
- As páginas de descrição não duplicam o mesmo Trait/Tag várias vezes.

## Atualização v0.1.94 — correção da exportação PDF

- Corrigida a falha **`WinAnsi cannot encode`** ao exportar personagens que contenham caracteres Unicode invisíveis em descrições de Powers/Traits/Tags.
- O exportador remove caracteres como **ZERO WIDTH SPACE (U+200B)** antes de medir/desenhar o texto.
- A normalização agora também protege os campos da ficha PDF contra caracteres que a fonte padrão não consegue codificar.
- As escolhas repetidas de Traços/Tags implementadas na v0.1.93 permanecem inalteradas.

## Atualização v0.1.93 — Traços e Tags repetíveis no Charactermancer

- O Charactermancer agora respeita **`system.multiple = true`** em Traços e Tags.
- Itens repetíveis podem ser selecionados novamente; os demais continuam com seleção única.
- Remover uma seleção apaga somente aquela ocorrência.
- A criação do personagem preserva todas as ocorrências válidas no Actor.

## Atualização v0.1.92 — destaque visual do Attack Edge Mode

- O aviso do `Attack Edge Mode` foi movido para o **final do card informativo do Power**, depois dos dados de Ação/Duração/Custo/Alcance.
- `edge` mostra: **Esse Ataque tem 1 EDGE (Vantagem)**.
- `trouble` mostra: **Esse Ataque tem 1 TROUBLE (Desvantagem)**.
- O aviso fica centralizado, em negrito, com fonte maior e moldura vermelha.
- `normal` e campo vazio continuam sem exibir aviso.
- Alteração somente visual; nenhuma regra de EDGE/TROUBLE foi modificada.

## Atualização v0.1.91 — Attack Edge Mode visível no chat

- Powers/Weapons com **`system.attackEdgeMode = edge`** agora exibem **ATTACK EDGE MODE: EDGE** no card informativo do chat.
- Powers/Weapons com **`system.attackEdgeMode = trouble`** exibem **ATTACK EDGE MODE: TROUBLE**.
- Valores **Normal** ou **vazio** não exibem nenhuma informação adicional.
- A mudança é exclusivamente informativa: nenhuma regra, cancelamento, rerrolagem ou automação de EDGE/TROUBLE foi modificada.


## Atualização v0.1.90 — Formatação do Efeito no Charactermancer

- O popup informativo dos Powers agora interpreta corretamente o rich text salvo em **`system.effect`**.
- Marcações HTML como parágrafos, negrito, itálico e listas deixam de aparecer como texto literal e passam a ser exibidas com sua formatação visual.
- O ajuste é somente de apresentação e não altera qualquer mecânica existente.


## Atualização v0.1.89 — Efeito dos Powers no Charactermancer

- Cada Power exibido no passo **Poderes** do Charactermancer agora possui um pequeno botão circular **i** ao lado do nome.
- Ao clicar no ícone, é aberto um popup compacto mostrando o texto completo do campo **Efeito** do Power.
- O popup fecha pelo **×**, por clique fora da janela ou pela tecla **Esc**.
- A alteração é exclusivamente visual/informativa e não modifica seleção de Powers, pré-requisitos, limites, compêndios nem mecânicas de combate.


## Atualização v0.1.88 — Combat Trickery automático

- **Combat Trickery** agora prepara automaticamente o próximo ataque válido do personagem e gasta o Focus normalmente.
- Se todos os alvos marcados tiverem **Rank igual ou superior** ao atacante, o dado Marvel desse ataque é transformado automaticamente em **MARVEL (1)**.
- O dado Marvel fica protegido contra **Trouble** nesse ataque, sem alterar Trouble nos demais dados.
- Em combate, o uso é limitado a **uma vez por batalha** por personagem. Fora do Combat Tracker, permanece disponível para testes e uso manual.
- Ataques sem alvo marcado ou com qualquer alvo de Rank inferior não consomem o efeito preparado.

## Atualização v0.1.87 — Defesas alternativas pelo alvo real

- **Brawling, Evasion, Wisdom e Integrity** agora verificam a defesa indicada em `system.attackTarget`.
- Isso corrige combinações em que a habilidade usada na rolagem difere da defesa-alvo, como **Telekinetic Grab (Logic vs Melee)** contra um alvo com **Evasion**, que passa a usar **Agility Defense**.
- As demais mecânicas de ataque, EDGE/TROUBLE, Fantastic, Focus e dano permanecem inalteradas.

## Atualização v0.1.86 — Habilidade de ataque x defesa-alvo

- A avaliação **ACERTOU/ERROU** separa corretamente a habilidade usada na rolagem (`system.ability`) da defesa indicada pelo Power/Weapon (`system.attackTarget`).
- Ataques como **Logic vs Agility** agora comparam o total contra **Agility Defense**, e não contra Logic.
- Os cards persistem `attackTarget`, com fallback para recuperar o valor do item original em cards anteriores.

## Atualização v0.1.85 — Elemental Control e EDGE/TROUBLE

- Powers de **Elemental Control** com `system.element` vazio passam a herdar o elemento padrão da ficha.
- Corrigido o armazenamento do Marvel Die em rerolls de **EDGE/TROUBLE**, incluindo tratamento correto de `M`.
- Fantastic de Elemental Control preserva os metadados necessários para aplicação automática das condições correspondentes.


## Atualização v0.1.78 — Correção multiplayer da Concentração

- Corrigida a troca de Powers em Concentração quando a ação é iniciada por um **jogador** com o Mestre conectado.
- A alteração dos Active Effects da troca é encaminhada ao **Mestre ativo primário**, que executa a substituição e devolve o resultado ao jogador pelo socket nativo.
- O sistema agora ignora, nos demais clientes, o `deleteActiveEffect` iniciado por outro usuário, evitando sincronizações duplicadas e documentos já removidos.
- Isso corrige os erros `ActiveEffect ... does not exist` e `undefined id ... does not exist in EmbeddedCollection` observados no cliente do jogador.
- O fluxo visual da v0.1.77 não mudou: o jogador ou Mestre pode responder **SIM**, escolher qual Power será substituído e o novo Power assume a vaga mantendo **Concentração = Rank**.

## Atualização v0.1.77 — Troca de Powers em Concentração

- Quando o personagem já está no limite de **Concentração = Rank**, o fluxo **SIM/NÃO** permanece igual.
- Ao escolher **SIM**, o sistema abre uma segunda mensagem privada para **Mestres e proprietários do personagem**, perguntando qual Power concentrado será encerrado.
- Os Powers ativos aparecem como botões; o mais antigo fica no topo e é identificado como **(mais antiga)**.
- Ao escolher um Power, o Active Effect dele é removido e o novo Power assume exatamente aquela vaga, mantendo o nível genérico **Concentração N** no limite correto.
- Mestre ou jogador proprietário pode responder à escolha pelo chat; a decisão é sincronizada pelo socket nativo do sistema.
- Powers excedentes criados pelo comportamento antigo (`countsTowardLevel: false`) podem ser reutilizados e convertidos corretamente para uma vaga válida durante a troca.

## Atualização v0.1.76 — Compêndios Secret Wars

- Sincronizados os compêndios nativos com o conteúdo regular já disponível no Charactermancer.
- **Powers:** Control Emotion, Control Group Emotion, Sense Emotion, Sway Emotion, Iconic Item e Power Cosmic.
- **Traits:** From Range, Hard to Kill e The Hunger.
- **Tags:** Ageless, Allspeak, Media Awareness, Signature Item e Worthy.
- **Origins:** Monstrous: Marvel Zombie e Weird Science: Power Cosmic.
- Mantidas todas as automações e regras aprovadas da v0.1.75.

## Atualização v0.1.75 — Regras de Secret Wars

- Flight Speed deixa de acompanhar alterações de tamanho de Resize e permanece baseada na velocidade regular do personagem.
- Fantastic na iniciativa cria uma **Rodada Bônus**; **6M6** concede uma oportunidade de transformar o Marvel Die em M em um teste dessa rodada.
- Arremessar um escudo com Shield Bearer cria **Escudo Arremessado**, suspende os benefícios do escudo e bloqueia os demais Powers do conjunto até o início do próximo turno do personagem.
- Mythic Origins passam a conceder **Allspeak**.
- **Plants** foi adicionado ao Elemental Control (Fantastic: alvo fica Grabbed).
- O Charactermancer recebe os novos Origins, Traits, Tags e Powers regulares apresentados/reproduzidos na Secret Wars Expansion.
- Self-Sacrifice foi deliberadamente deixado fora desta atualização.

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


## Multiverse D616 v0.2.1 — Movimentos e tamanhos

A v0.2.1 preserva as fichas existentes; instale substituindo a pasta inteira `Data/systems/multiverse-d616` com o Foundry fechado. No painel de Speed, os valores em parênteses indicam espaços fora de combate.

O sistema aplica automaticamente o bônus de Agility ao Run, e a regra de tamanho à velocidade terrestre; o Flight normal não muda ao encolher ou crescer temporariamente, exceto pela referência de tamanho natural do traço Unusual Size. Efeitos antigos de tamanho continuam reconhecidos. Fichas legadas em que Run já estava manualmente calculado como `5 + floor(Agility/5)` não recebem o mesmo bônus novamente.

Testes isolados: `node tests/movement.test.mjs`. Esses testes não substituem a validação visual e multiplayer no Foundry VTT v14.


## Multiverse-D616 v0.2.21 — Alvos Inteligentes e Reação

Nas configurações do cliente, escolha o modo de **Seleção inteligente de alvos**: confirmar o último, reutilizar automaticamente ou utilizar seleção manual. Ao selecionar novos alvos no mapa, clique nos tokens desejados e confirme; `Enter` confirma e `Esc` cancela. A seleção ocorre antes de gastar Focus e iniciar Concentração.

Condições de restrição criadas por poderes habilitados podem abrir uma janela ao jogador afetado oferecendo o teste de escape imediato como Reação; em combate, essa tentativa consome a Reação disponível e segue as regras próprias de cada poder. A Ação Padrão posterior permanece disponível. Requer um Mestre conectado para validar gastos de Reação de jogadores.


## Multiverse-D616 v0.2.22 — Seleção de alvos

**Seleção manual do Foundry** é o padrão; nenhuma janela extra aparece. Opcionalmente, ative **Perguntar antes de ataques** nas configurações individuais do cliente para abrir uma janela com o tema do sistema, oferecendo alvos já marcados, seleção no mapa ou ação sem alvo. O botão para reutilizar o último alvo foi removido. Na primeira execução após atualizar, a configuração antiga é migrada uma única vez para Manual; depois, a preferência escolhida pelo jogador é mantida.


## Multiverse-D616 v0.2.23 — Condições e rolagens

Condições ativas oferecem Edge/Trouble no momento de rolar ações e ataques. O chat identifica a origem; Trouble único é aplicado pelo sistema, enquanto Edge usa os botões existentes para o jogador escolher o dado. Acúmulos e ações que dependem de sentidos precisam de decisão do Mestre, e o sistema não impõe modificadores conflitantes numa rolagem contra alvos distintos. A versão é candidata até validação no Foundry v14 real.

**v0.2.26:** configuração global "Cancelar Combate Inteligente" (marcada por padrão); migração gradual de APIs v14 de efeitos e do chat.

**v0.2.27:** mesclagem segura do catálogo do Charactermancer, preservação de poderes homônimos de conjuntos/efeitos diferentes, progressões numeradas por conjunto e correção de pré-requisitos exibidos nos botões bloqueados.

### Agarrado — Poder (regra da mesa; v0.2.42)

A condição `Agarrado — Poder` diferencia uma contenção remota (Elemental Grab, Telekinetic Grab, Webgrabbing, Hellfire Chains e o especial Plants) do agarrão físico. O alvo não pode se deslocar voluntariamente, os ataques contra ele ganham **1 Edge** por essa contenção, e o usuário do poder não fica Agarrado. O status não multiplica Edge quando dois efeitos iguais estão presentes. O Mestre pode reposicionar manualmente o alvo em caso de deslocamento forçado.

**Agarrado físico** continua usando seus modificadores tradicionais. Um alvo pode manter os dois efeitos de fontes diferentes: não se confunde o agarrão corporal com a contenção à distância. Testes de Escapar e duração mantêm as regras de seus respectivos poderes. Proteções Elemental Protection e barreiras Sphere/Prison continuam interceptando antes da DR usual do personagem, mesmo nos cards legados, com o Mestre confirmando a aplicação.
