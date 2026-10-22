## v0.2.77 — Padronização do README e documentação (Foundry VTT v14) — 22/10/2026

- Reorganizado o `README.md` no formato institucional acordado: apresentação, manifesto de instalação, recursos nativos integrados, compatibilidade, créditos, avisos de projeto não oficial, licença MIT e instruções de instalação.
- Removidos do README os relatos históricos de versões, testes, correções e notas de release; o histórico de alterações permanece documentado neste `CHANGELOG.md`.
- Atualizada a compatibilidade documentada para Foundry VTT **v14** (minimum 14, verified 14); badge de instalação atualizado para v14.
- Lista de recursos do README atualizada com armas equipadas no HUD, poderes vinculados a Armas/Itens, poderes permanentes sem acumulação e Active Effect Adamantium.
- Manifesto `system.json` atualizado para **0.2.77**, com URL de release correspondente (publicação manual posterior pelo usuário). **Nenhuma mudança funcional no motor de regras, fichas ou compêndios** em relação à v0.2.76.

## v0.2.76 — Mesmo filtro de poderes permanentes no HUD de Armas e Itens (Foundry VTT v14)

- O HUD **POWERS** agora usa exatamente o mesmo critério de visibilidade dos poderes do personagem para poderes associados a armas equipadas e itens no inventário. Poderes **Permanent** passivos (Mighty, Sturdy, Uncanny, Flight etc.) permanecem no equipamento e continuam concedendo seus bônus pela lógica v0.2.75, mas não criam botões de ativação desnecessários.
- Permanentes acionáveis (como Grow, Shrink, Resize Object, Resize Other, Domination) continuam aparecendo para execução voluntária; poderes de uso Instant e Concentration permanecem inalterados.
- Itens com apenas poderes passivos não geram cabeçalhos vazios no HUD. Alterações do nome/duração do poder associado atualizam o HUD; botões antigos deixam de acioná-lo se for alterado para passivo.
- Sem alterações em fichas/compêndios, nos bônus ou na regra de não acumulação dos poderes permanentes. Um ZIP instalável para validação e publicação manual posterior, sem modificação do GitHub.

## v0.2.75 — Poderes permanentes de armas/itens, sem acumulação (Foundry VTT v14)

- Active Effects transferíveis de poderes com duração **Permanent/Permanente** associados a armas equipadas e itens possuídos passam a ser considerados nos cálculos do portador, sem criar um poder adicional em sua ficha.
- Poderes da mesma família (Power Set + nome, ignorando sufixo numérico) usam somente o **nível mais alto** entre portador e equipamentos. Empates mantêm o poder próprio do personagem; duplicatas em equipamentos não acumulam.
- Remover ou desequipar o equipamento restaura a versão intrínseca automaticamente. Equipamentos não equipados não concedem passivos; itens comuns concedem enquanto estiverem no inventário.
- Não aplica automaticamente poderes Permanent que exigem ativação voluntária (ex.: Grow, Shrink, Domination, Resize); esses continuam acionáveis pelo botão.
- Suporte à normalização de efeitos antigos v13/v14 na cópia, incluindo migração de Mighty/Accuracy/Brilliance/Discipline e fatores de voo/movimento, sem modificar o compêndio nem a origem. Proteções Health/Focus, poderes de movimento e bônus Mighty/Accuracy/Brilliance/Discipline usam o mesmo motor Active Effect do Foundry v14. Também são reconhecidos Healing Factor, Danger Sense, Evasion e Wisdom quando vindos de equipamentos; Flexible Bones 2 e Jump 2/3 recebem seus efeitos equivalentes mesmo em compêndios antigos sem Active Effect.
- Testes de regressão sobre precedência, item/arma, múltiplos itens, fontes independentes, dois tipos de RD, movimentação e dados antigos.

## v0.2.74 — Edição de Poderes de Equipamentos e proteção no combate (Foundry VTT v14)

- As fichas de Arma e Item agora oferecem botão **Editar** ao lado de cada poder vinculado. Abre editor para a CÓPIA do poder no equipamento: elemento próprio, nome, descrição, efeito, custo, ação e dados de ataque. Não altera o poder de origem nem o elemento do personagem.
- **Elemental Protection 1–4** e **Telekinetic Protection 1–4** usados pelo equipamento equipado/inventário passam a ser reconhecidos no sistema de interceptação de dano: a Concentração é resolvida pelo ID do poder associado, mesmo que ele não apareça como Item independente do Actor. Respeita arma equipada e efeito habilitado; protege Health e Focus conforme as regras já existentes, sem alterar RD.
- O poder vinculado continua uma cópia em flags, sem adicionar poderes passivos permanentes ao Actor. Equipamentos sem vínculo com o personagem não concedem proteção; armas desequipadas não concedem proteção.
- Testes novos de independência do elemento, abertura do editor, persistência dos dados e absorção do ataque, com teste de regressão de todas as fichas e danos existentes.

## v0.2.73 — Correção de abertura das fichas de Armas e Itens (Foundry VTT v14)

- Registrado `systems/multiverse-d616/templates/item/parts/item-attached-powers.hbs` na pré-carga de partials Handlebars usada no Foundry v14.
- Corrige `Failed to render template part "sheet"` / `The partial ... item-attached-powers.hbs could not be found` ao criar ou abrir armas e itens.
- Adicionado teste de regressão que audita os partials reais chamados pelos templates, sua existência no ZIP e o registro na pré-carga.
- Mantidos poderes associados, Active Effect Adamantium, HUD de armas e as demais funcionalidades anteriores.

## v0.2.72 — Poderes vinculados a Armas e Itens (Foundry VTT v14)

- Nova aba **Poderes** nas fichas de Armas e Itens. Arraste um documento do tipo Poder da ficha de personagem, aba Itens ou compêndio para associá-lo como cópia ao equipamento (arma/item com dados próprios; origem preservada).
- Poderes associados podem ser removidos do equipamento sem apagar o documento original nem alterar os poderes da ficha.
- Quando a arma está equipada, seus poderes ficam disponíveis logo abaixo dela no HUD nativo POWERS. Os poderes de itens comuns no inventário aparecem em grupo próprio. Os poderes vinculados usam o fluxo padrão de ativação/rolagem da ficha, com custos de Focus e verificações usuais, sem criar poderes permanentes duplicados no ator.
- Armas não equipadas não disponibilizam seus poderes. Atalhos obsoletos são revalidados no clique.
- Durations de Active Effects de poderes copiados são normalizadas apenas na construção temporária do documento para compatibilidade com validação do Foundry v14.
- Limitação deliberada: **poderes passivos** vinculados a equipamentos são armazenados e exibidos, mas **não são aplicados automaticamente como benefícios do ator**. A automação cobre a utilização explícita dos poderes acionáveis. Regras que consultam exclusivamente actor.items podem requerer integração adicional para powers associados.

## v0.2.71 — Armas equipadas no HUD de POWERS (Foundry VTT v14)

- A aba POWERS do HUD nativo também lista todas as armas marcadas como **Equipped**, organizadas alfabeticamente, após os poderes, em grupo **ARMAS EQUIPADAS**.
- Um clique usa o mesmo `Item.roll()` da ficha, preservando seleção de alvos, ações, dano, modificadores e a penetração de Health DR do Active Effect Adamantium.
- Armas não equipadas não aparecem, inclusive ao alternar de arma; o HUD se atualiza quando o item muda.
- O botão revalida que a arma ainda está equipada antes de executar (proteção contra cliques em atalhos antigos).
- Mantidas as correções de compatibilidade de Active Effects/arrastar itens da v0.2.70; sem alterações em compêndios ou no GitHub.

## v0.2.70 — Corrige equipar/adicionar armas com Active Effect Adamantium (Foundry v14)

- Resolve erro de validação `effects.0.duration.value: must be an integer` ao copiar uma arma com Adamantium do diretório para uma ficha de personagem ou NPC.
- O botão Adamantium cria um Active Effect `base` com `system.changes` e duração permanente explícita no formato v14 (`duration.value = null`).
- Intercepta a adição de documentos à ficha em `_onDropDocument` (API v14); normaliza durações malformadas na cópia, preservando o Item original e durações válidas. Strings numéricas inteiras são convertidas; valores inválidos tornam-se permanentes (`null`).
- Criação manual de Active Effects usa campos `duration.value/units/expiry` do Foundry v14, sem `duration.rounds` legado.
- Preserva toda a mecânica de Adamantium da v0.2.69 e os demais comportamentos da v0.2.68.

## v0.2.69 — Adamantium (Active Effect de arma)

- Botão **Adicionar Active Effect: Adamantium 1** na aba Efeitos de armas. Cria um efeito de arma com alteração `flags.multiverse-d616.adamantiumHealthDrIgnore` = `1`, tipo `add` (Foundry VTT v14), sem transferência para o portador.
- O motor de dano ignora até o valor configurado da **RD de Health** do alvo somente quando o ataque vem da própria arma equipada; nunca altera RD de Focus, poderes, outras armas ou os atributos reais do alvo.
- Valor congelado nas flags da rolagem; efeitos desativados não operam, e valor excedente não reduz RD abaixo de zero. Múltiplos Adamantium na mesma arma não acumulam, prevalecendo o maior valor.
- Cards de dano e painel do Mestre mostram RD original, penetração e RD efetiva.
- Versionamento 0.2.69, ZIP instalável completo para testes v14 e publicação manual posterior.

## v0.2.68 — Auditoria pontual de Sucessos Fantásticos e manutenção Foundry v14
- **Banging Heads:** no Sucesso Fantástico, cada alvo atingido recebe Caído **somente após o Mestre confirmar seu dano**. Mantido o ataque único contra duas defesas; sem duplicar condições nem disparar antes da confirmação.
- **Deafen:** teste Ego contra Vigilance, aplica Surdo por 1 turno no sucesso. Somente o Sucesso Fantástico habilita dano normal; um sucesso comum não deve abrir dano indevido. Metadados incorretos de importações antigas são tratados em execução, sem modificar compêndios.
- **Flare e Dazzle:** auditoria identificou a mesma exceção: o sucesso comum apenas cega, sem dano, enquanto o Fantástico causa dano **normal** (não dobrado). Dazzle passa a ser reconhecido como teste Ego contra Vigilance com dano somente no Fantástico, mantendo a decisão narrativa entre luz e escuridão.
- **Compatibilidade de paredes no Foundry v14:** uso de `CONST.EDGE_SENSE_TYPES` em vez de `CONST.WALL_SENSE_TYPES` na criação de barreiras Elemental/Telekinetic, sem alterar bloqueio de movimento, visão, som, cor, geometria ou Concentração.
- **Manifesto de release:** versão 0.2.68 e link de download preparados para a futura release `v0.2.68` no GitHub. O link só existirá depois que o proprietário publicar o arquivo com o nome exato; **nada é enviado ao GitHub automaticamente**.
- **Integridade:** preservados o catálogo, os compêndios e a lógica das versões já aprovadas. A migração completa dos visuais `MeasuredTemplate` para Regions (API v14) fica fora desta atualização para não arriscar a representação física já validada.

## v0.2.67 — Concentração e cards de ataques sustentados (Foundry VTT v14)

- **Contenções ligadas à Concentração:** quando o alvo se liberta e não resta outra condição de agarramento/paralisia sustentada pelo *mesmo* efeito, a Concentração específica é encerrada. Nunca apaga outros poderes/concentrações do atacante. Protege efeitos manuais e casos com múltiplos alvos.
- **Hellfire Chains:** a Concentração deixa de ser necessária no ataque inicial que não criou uma contenção Fantástica; o encerramento é verificado após a confirmação e reconciliação do dano, preservando rerrolagens e outros alvos. Enquanto houver alvo preso, a Concentração permanece.
- **Hellfire Chains — ataques posteriores:** a mesma rolagem resolve Health e Focus; o card com a prévia de Focus só é publicado **depois** que o Mestre confirmar o dano de Health, nunca antes. A aplicação de Focus ainda requer seu próprio botão DAMAGE.
- **Unstoppable Assault / Unrelenting Smash:** após a confirmação de dano do Mestre, a nova repetição é oferecida em um **card separado**, criado somente após a confirmação, com o botão para nova seleção de alvos. Não reabre o card anterior nem reaproveita seu dano.
- Preservadas as regras existentes de Movimento, 15 Focus por repetição, Combate Inteligente, seleção de alvos e Coiling Crush; compêndios preservados.

## v0.2.66 — Correções de ataques adicionais e contenções (Foundry VTT v14)

- Unstoppable Assault e Unrelenting Smash: o botão de repetir aparece abaixo do card de **DANO já confirmado** pelo Mestre, não antes. Cada repetição abre a mesma janela de seleção de alvos e gera uma rolagem e um card de DAMAGE próprios; novas confirmações não reutilizam o dano de ataques anteriores.
- O alcance corpo a corpo e o deslocamento entre repetições só são verificados quando **Cancelar Combate Inteligente** está desmarcado. O gasto de 15 Focus, a economia de ações e a proibição de repetir um alvo permanecem.
- Hellfire Chains: atualizar o HUD ao avançar turno ou ao criar/remover condições em outros personagens. A repetição usa uma única rolagem de dados, gerando danos Health e Focus confirmáveis separadamente, sem animar a mesma rolagem duas vezes.
- Coiling Crush: testes subsequentes oferecem DAMAGE no próprio card de ataque, usando Melee vs Resilience e Movimento.
- Preservadas as automações anteriores, compêndios e opções de desativação por grupo.

## v0.2.65 — Ataques repetidos com custos e ações sustentadas (Foundry VTT v14)
- **Unstoppable Assault e Unrelenting Smash:** o card oferece **↪ Repetir** no próprio turno, cobrando **15 Focus adicionais** sem gastar outra Ação Padrão. A repetição usa nova rolagem independente e admite vários alvos próximos, mas bloqueia alvos já incluídos na cadeia na mesma rodada. O personagem pode reposicionar-se antes de cada repetição dentro da metade de sua Velocidade e do Movimento disponível (deslocamento é realizado normalmente no mapa e contabilizado pelo Controle de Turno; o botão não move o token). Sem Movimento ou Focus suficiente, a sequência termina. As fórmulas de dano metade/integral e a condição Caído de Unrelenting Smash permanecem aplicáveis após confirmação do Mestre.
- **Hellfire Chains:** em rodadas seguintes, quando o alvo permanece agarrado por essa Concentração, o dono pode clicar **Atacar: Correntes Infernais** na aba POWERS. Uma rolagem Ego vs Resilience produz confirmação separada de dano em **Health e Focus**, sem gastar nova ativação do poder. Não recria condições de agarramento em cada repetição. Um teste por alvo, por rodada; nada acontece automaticamente sem um clique.
- **Coiling Crush:** enquanto mantém Concentração e o alvo continua Paralisado pelo poder, o dono pode clicar **Esmagar: Coiling Crush** em turnos subsequentes. Consome o **Movimento restante da rodada** pelo Controle de Turno e realiza Melee vs Resilience para causar Health. A ativação inicial não causa dano no acerto comum e causa dano normal em Sucesso Fantástico; nos esmagamentos posteriores o Fantástico volta a dobrar o dano.
- **Segurança:** exige o turno do dono, origem e Concentração válidas; bloqueia repetição na mesma rodada e alvo fora do alcance corpo a corpo padrão. O Mestre confirma dano pelos cards, com decisões de Edge/Trouble por alvo quando necessário. O grupo já existente **Automações — Ataques adicionais condicionais** controla essa funcionalidade e respeita **DESATIVAR TODAS**. Casos de alcance especial e posicionamento controverso continuam sujeitos ao Mestre.
- Entrega ZIP único e completo. Compêndios, fichas e dados de personagem não modificados; sem publicação no GitHub.

## v0.2.64 — Ataques extras condicionais: Rico-Shield e Elemental Ricochet (Foundry VTT v14)
- **Rico-Shield / Elemental Ricochet:** um ataque normal continua sendo uma ativação única. Após **Sucesso Fantástico efetivo** e **confirmação do dano pelo Mestre**, o card da rolagem oferece **↪ atacar outro alvo**. Cada ricochete é uma rolagem própria (Agility vs Agility), pode disparar outro ricochete se for Fantástico, e termina em sucesso comum, falha, quando não houver novo alvo ou quando o jogador decidir parar. O dano de cada alvo é confirmado individualmente pelo Mestre.
- **Economia de ações/Focus:** a ativação inicial continua cobrando 10 Focus e uma Ação Padrão. Ricochetes adicionais não disparam novo `Item.roll()`, evitando novo gasto de Focus, de Ação Padrão ou de condições de escudo arremessado. Para Rico-Shield, o escudo permanece indisponível até o turno seguinte, como antes.
- **Limite de alvos e alcance:** cada etapa marca **exatamente um novo alvo**, sem repetir alvos já atacados na cadeia. O alcance é acumulado somando as distâncias entre os alvos, a partir do lançamento inicial, dentro de **10 espaços × Rank**. Elemental Ricochet verifica também a linha de visão comprovadamente bloqueada entre os alvos; casos geométricos indeterminados permanecem sujeitos ao Mestre.
- **Segurança e integridade:** o botão só aparece quando a confirmação do dano pertence à assinatura atual da rolagem; rerrolagens de Edge/Trouble não podem reusar a confirmação antiga. Proteções que bloquearam o ataque não liberam ricochete. A sequência permanece no turno inicial, e cada card oferece no máximo um ricochete seguinte, evitando reexecução acidental.
- **Elemental Ricochet legado:** o catálogo original o marcava como `attack:false`. O motor agora reconhece esse poder específico como ataque Agility vs Agility com dano Health, sem reescrever itens e compêndios. Seu elemento é mantido nas rolagens seguintes.
- **Configuração:** grupo opcional *Automações — Ataques adicionais condicionais*, ativado por padrão, subordinado ao interruptor geral **DESATIVAR TODAS**. Ao desligar, as rolagens e ações manuais permanecem disponíveis.
- **Escopo:** Unstoppable Assault / Unrelenting Smash (novos custos e movimento), Hellfire Chains e Coiling Crush (novas ações por turno) ficam para evolução futura. Nenhum efeito foi criado para eles nesta versão.
- ZIP completo instalável, sem publicação no GitHub; testes de regressão preservados.

## v0.2.63 — Atalhos clicáveis para efeitos recorrentes (Foundry VTT v14)
- Corrigido despacho de clique na aba POWERS: os atalhos **Apagar: Chamas de Faltine** e **Healing Factor: recuperar** eram renderizados, porém seus tipos de ação não eram incluídos no seletor do evento, portanto cliques eram ignorados sem erros no console.
- Ao clicar em Apagar: Chamas de Faltine, a rotina existente verifica a disponibilidade de uma Ação Padrão no turno do portador, consome a ação via Controle de Turno, desativa apenas a condição Chamas de Faltine e anuncia o resultado no chat. Quando não há ação disponível, não remove a condição.
- O atalho Healing Factor: recuperar, fora de combate, volta a executar sua cura manual por turno narrativo (até o Health máximo), sem iniciar contagem automática de tempo.
- Sem alterações no dano recorrente, nos testes de Sucesso Fantástico, nas demais condições, nas proteções, nos compêndios ou nas configurações de automação da v0.2.62.

## v0.2.62 — Efeitos contínuos de Poderes (Foundry VTT v14)
- Auditoria inicial dos efeitos recorrentes do catálogo: Flames of the Faltine causa **5 Health ao final de cada rodada** após acerto Fantástico, até uma Ação Padrão apagar as chamas. Não se confunde com a condição Em Chamas, cujo gatilho é o fim do turno do alvo.
- Flames of the Faltine: metadados legados de ataque reparados em tempo de execução (Ego vs Agility, dano Health); efeito temporário com ícone e identificação no HUD de condições, criado apenas depois da confirmação de dano do Mestre, respeitando a rolagem e a defesa do alvo. Ataques bloqueados pelas proteções não incendeiam o personagem.
- O alvo pode usar o atalho **Apagar: Chamas de Faltine** na aba POWERS gastando uma Ação Padrão, ou o Mestre pode remover o efeito manualmente pelo HUD. A aplicação repetida renova as chamas sem acumular cópias indevidas.
- Healing Factor: no final de cada turno do portador em combate, recupera Health igual ao valor de Resilience, até seu Health máximo. O sistema evita processar duas vezes a mesma passagem de turno e não aplica cura extra ao retroceder a iniciativa. Fora de combate, o atalho **Healing Factor: recuperar** na aba POWERS representa um turno narrativo por clique; o Mestre continua controlando a passagem de tempo (sem temporizador real automático).
- Todas as automações opcionais de efeitos recorrentes respeitam o grupo **Dano contínuo e Envenenado** e o interruptor **DESATIVAR TODAS**; remoção manual continua disponível.
- Hellfire Chains, Coiling Crush e Webtrapping foram auditados, mas requerem novos ataques, verificações de espaços ou decisões por turno, e não receberam aplicação passiva indiscriminada.
- Compêndios, fichas, valores originais dos poderes e demais recursos da v0.2.61 preservados. Entrega ZIP instalável para validação manual no Foundry v14, sem publicação direta no GitHub.

## v0.2.61 — Compatibilidade de animações nas barreiras (Foundry v14)
- Elemental Barrier e Telekinetic Barrier continuam criando sua Wall física, visual colorido, absorção e Concentração exatamente como na v0.2.60.
- O ActiveEffect TRANSITÓRIO de Concentração dessas duas barreiras agora declara `flags.autoanimations.isEnabled=false`, porque a própria barreira já é representada no mapa. Evita que o Automated Animations acione no efeito de Concentração um `stretchTo` entre origem e destino idênticos (aviso do Sequencer sobre distância 0).
- A configuração de animações do Item (lançamento) e de todos os outros poderes permanece intacta; correção localizada somente ao efeito transitório. Em efeitos antigos, a próxima ativação atualiza a flag de compatibilidade.
- Nenhuma mudança em fórmulas, compêndios, posicionamento, proteções ou HUD.

## v0.2.60 — Barreira física integrada à macro Elemental Barrier v5 (Foundry v14)
- **Elemental Barrier:** após usar o poder e ativar sua Concentração, clique em **Desenhar área**, selecione um dos oito elementos da macro (Gelo/Água, Fogo, Force, Metal/Pedra, Eletricidade, Energia, Trevas ou Radiação) e marque a parede por dois cliques na cena. Prévia colorida com comprimento máximo de **2 espaços por Rank** e alcance máximo de **10 espaços por Rank** do conjurador. Esc cancela.
- **Telekinetic Barrier:** o mesmo posicionamento de Wall física e MeasuredTemplate com visual violeta, sem escolher elemento; usa **Logic** como defesa, enquanto Elemental Barrier usa **Ego** para ataques recebidos. Os testes próprios de Agility/Logic ao conjurar permanecem sem alterações.
- **Wall REAL + MeasuredTemplate visual:** a Wall bloqueia o movimento no mapa (não visão/luz/som); o ray mostra a cor e extensão. A geometria da interceptação usa agora o segmento real da parede, incluindo diagonais, antes da confirmação de dano pelo Mestre; ambas absorvem ataques de até **10 de dano bruto** e, acima disso, são destruídas protegendo os personagens no golpe que as quebra.
- **Concentração:** destruição/remoção da Concentração remove somente os documentos daquela barreira (Wall + MeasuredTemplate); recriar elimina a anterior. Também reconhece e limpa os objetos com flags `world.d616ElementalBarrier` da macro v5 vinculados à mesma Concentração, evitando órfãos no upgrade.
- **Restante do sistema:** Elemental Prison, Elemental Sphere e Telekinetic Sphere continuam usando regiões circulares. Poderes sem a mesma mecânica, como Shield Wall, Protection Hex, Shield of the Seraphim, Body Sphere e Time-Out Bubble, não criam Walls automáticas.
- **Segurança/compatibilidade:** todas as coordenadas, alcance, elemento e Concentração são revalidados pelo GM; jogadores podem solicitar criação sem permissão para alterar a cena diretamente. Nenhum compêndio alterado. Pacote ZIP completo para instalação manual, sem GitHub.

## v0.2.59 — Regiões de barreiras e esferas telecinéticas (Foundry v14)
- Telekinetic Barrier: parede editável desenhada por arrasto (até 2 espaços por Rank, alcance de 10 espaços por Rank), intercepção de ataques pela defesa Logic do conjurador, absorção de 10 de dano antes de desmanchar a Concentração e efeito Paralisado no Sucesso Fantástico.
- Telekinetic Sphere: região circular centrada no conjurador com raio de até 5 espaços por Rank; custo e absorção herdados do maior Telekinetic Protection, ataques contra Logic; expulsão de intrusos antes do dano de Sucesso Fantástico.
- Elemental Barrier: adicionado ao motor de regiões, com parede retangular, defesa Ego e absorção de até 10 de dano.
- Elemental Prison e Elemental Sphere mantêm suas rotinas existentes; todos os quatro tipos de estrutura (e a prisão) removem a região ao encerrar a Concentração ou destruir a estrutura.
- Auditoria do catálogo: Body Sphere e Time-Out Bubble possuem mecanismos diferentes e não receberam intercepção de barreira.
- Mantidos compêndios e demais automações sem alterações de dados.

## 0.2.58 — Proteções telecinéticas e auditoria de absorção (Foundry v14)

- **Telekinetic Protection 1–4:** agora usa a mesma interceptação de dano confirmada de Elemental Protection, com limite de **10/20/30/40** por ataque e exigência de Concentração ativa. Dano bruto é comparado ao limiar antes de DR; um ataque igual ou inferior é totalmente absorvido sem destruir a proteção; um ataque superior também é totalmente absorvido, mas encerra aquela Concentração. O alvo não sofre dano no golpe que a destrói.
- **Shield of the Seraphim:** recebe o mesmo tratamento de absorção (**20 pontos**), para dano de Health/físico. Dano psíquico de Focus não dispara automaticamente este escudo; o Mestre conserva o controle de bypass para casos ambíguos quanto à natureza do ataque.
- **Seleção correta da proteção:** quando houver mais de uma proteção pessoal ativa, a mais forte é preferida; atravessar uma Região de Elemental Sphere/Prison continua tendo prioridade, e o Mestre pode determinar bypass. Somente o efeito de Concentração da proteção atingida é encerrado quando a barreira quebra.
- **HUD de dano:** o seletor agora identificado como **Proteção ativa** mostra o nome da proteção efetiva (Elemental, Telekinetic ou Seraphim); o controle continua integrado aos cards legados e modernos de dano e à confirmação do Mestre.
- **Auditoria de escopo:** Shield 1–4 permanece exclusivamente Redução de Dano, sem bloquear integralmente ataques. Telekinetic Sphere, Telekinetic Barrier, Elemental Barrier, Protection Hex e Environmental Protection não foram convertidos em escudos pessoais: dependem de geometria, tipo de ataque ou regras próprias. Não se presume proteção automática de outros tokens atrás de barreiras não desenhadas.
- **Integridade:** ajustes concentrados no reconhecedor de proteções e confirmação dos cards; compêndios, criação de personagem e demais automações permanecem inalterados. Pacote ZIP instalável para Foundry v14; sem publicar no GitHub.

## 0.2.57 — Condições secundárias de Sucessos Fantásticos (Foundry v14)

- **Crushing Grip / Telekinetic Crush:** aplica Imobilizado no Sucesso Fantástico após o Mestre confirmar o dano. Sucesso comum não aplica condição nova. Mantém a necessidade de alvo previamente agarrado como regra de uso do poder.
- **Suppressive Fire, Covering Fire e Return Fire:** causam Atordoado no Sucesso Fantástico somente quando o dano de Focus confirmado foi positivo; Covering Fire dura uma rodada, os demais um turno, segundo as descrições do catálogo.
- **Reparação de metadados legados sem modificar compêndios:** os três ataques de cobertura registram dano em Focus; Covering Fire passa a comparar Agility vs Vigilance, e Covering/Return Fire passam pelo fluxo de ataque e dano normal. A correção fica restrita aos poderes canônicos e formatos legados reconhecidos.
- **Escopo controlado:** condições por card são aplicadas ao token correto somente após confirmação do Mestre, respeitam EDGE/TROUBLE por alvo, não duplicam após reaplicação/retroação e dependem do grupo **Condições automáticas de poderes**. Dano, DR, Focus inicial e rolagens continuam regidos pelos motores existentes.
- **Limitação intencional:** Flames of the Faltine (chamas contínuas), ataques adicionais de Rico-Shield e efeitos narrativos/condicionais permanecem para auditoria posterior; nenhum efeito inventado foi incluído.
- Pacote completo para testes Foundry VTT v14; sem publicação no GitHub.

## 0.2.56 — Equivalência e transparência de Edge/Trouble por alvo (Foundry v14)

- **Múltiplos alvos com fontes diferentes, mas mesmo modificador líquido:** não exige confirmação manual desnecessária (exemplo: ataque próximo contra Caído e contra Cego, ambos concedendo 1 Edge). Um único ataque/rolagem continua sendo usado; nenhuma nova rolagem, gasto de Focus ou alteração automática de acerto é criada.
- **Condições diferentes que se cancelam:** modificadores de alvos equivalentes a zero não são tratados como divergências, mesmo quando as origens variam.
- **Transparência por alvo:** guarda um resumo independente das origens de Edge/Trouble de cada alvo no card de ataque, inclusive quando o valor final é equivalente; não atribui ao grupo inteiro a condição de um único alvo.
- **Divergência real preservada:** se os modificadores líquidos forem diferentes entre alvos, o Mestre ainda confirma acerto ou falha individualmente antes de aplicar dano ou condições. Decisões continuam ligadas à assinatura da rolagem para evitar reaproveitar decisões após retro Edge/Trouble.
- **Conservador quanto ao empilhamento:** modificadores líquidos maiores que 1 continuam indicando que o Mestre precisa avaliar a quantidade de rerrolagens. Não altera as regras do jogo, DR, Fantastic, GM-confirmation, compêndios ou controles de automação.
- Pacote completo para testes manuais, baseado na v0.2.55 validada; nenhuma publicação no GitHub.

## 0.2.55 — Auditoria e dano diferenciado por Sucesso Fantástico (Foundry v14)

- **Auditoria inicial dos 398 poderes do catálogo (139 com menção a Sucesso Fantástico):** identificadas exceções determinísticas ao multiplicador genérico de Sucesso Fantástico; os resultados ainda dependentes de escolha narrativa, ataques bônus, dano especial de arma e alcance/área continuam sob o Mestre e serão tratados em etapas posteriores.
- **Venom Burst:** acerto normal derruba, mas **não causa Health**; no Sucesso Fantástico causa **metade do dano normal**, arredondada para cima e individualmente contra os alvos que acertou. Não gera card de dano quando não houver alvo com acerto Fantástico; o status Caído existente permanece ativo.
- **11 poderes com dano especial de metade / integral:** Dance of Death, Orchestra of Overkill, Whirling Frenzy, Unstoppable Assault, Ground-Shaking Stomp, Fast Attacks, Fast Strikes, Slow-Motion Shoot-Dodge, Weapons Blazing, Spider-Strike e Elemental Barrage. O sucesso normal causa metade do dano normal; Fantástico causa dano integral, sem duplicar. As consequências especiais já existentes continuam funcionando; ataques bônus e efeitos de armas continuam sujeitos ao Mestre.
- **Headshot:** 2× dano normal no sucesso comum, **3× no Fantástico**, sem multiplicação Fantástica dupla. A condição Atordoado já automatizada ainda depende de dano efetivo após proteção.
- **Banging Heads, Leg Sweep e Rico-Shield:** o sucesso Fantástico não duplica o dano automaticamente; seus efeitos adicionais continuam sujeitos às regras específicas dos poderes.
- **Integridade do dano:** Redução de Dano calculada uma única vez, valores brutos para barreiras preservados, condições por alvo e decisão de Edge/Trouble mantidas. Botões DANO, 1/2 DANO e CURA e confirmação final continuam com o Mestre.
- **Dados legados:** Elemental Barrage passa a ser reconhecido como ataque de Ego contra Resilience que pode causar Health, sem editar os compêndios ou fichas antigas.
- **Configurações:** novo grupo opcional **Automações — Dano especial por poder / Sucesso Fantástico** ativado por padrão. A opção global DESATIVAR TODAS o suspende; desativado, as fórmulas passam a usar a regra genérica e o Mestre pode ajustar o dano manualmente.
- **Fora de escopo desta etapa:** redução por tag Heroic (Penance Stare), efeitos especiais de armas, ataques extras, decisões de área e resistências situacionais ainda dependem de arbitragem ou auditoria complementar. Não foram inventadas regras para elas.
- Versão baseada na v0.2.54 aprovada, compêndios preservados, ZIP completo para testes manuais no Foundry VTT v14; sem publicar no GitHub.

## 0.2.54 — Configurações de automação por grupos e cor da ficha no sistema (Foundry v14)

- A opção **Template de Ficha (cor)** foi movida da categoria órfã `sheet-export-m616` para **Multiverse-D616**, mantendo as cores e migrando a preferência global anterior uma única vez.
- Novo controle **Automações — DESATIVAR TODAS** (desmarcado por padrão), com precedência sobre seis grupos individuais, todos ativados por padrão: condições de poderes; efeitos elementais fantásticos; dano contínuo e Envenenado; recuperação automática de condições; Concentração e manutenção de Focus; consumo automático de Ações e Movimento.
- A desativação afeta apenas automações opcionais desses grupos. **Não desativa** rolagens, uso manual de poderes, cálculo de dano, botões manuais de aplicar dano, nem ações manuais no HUD e Controle de Turno. A expiração/limpeza dos efeitos que já estavam ativos continua sendo processada.
- Chaves de mundo, com leitura em tempo real. Compêndios e efeitos validados da v0.2.53 preservados.

## v0.2.53 — Ícones de Force/Earth nos tokens (Foundry VTT v14)

- **Ícone no Token:** efeitos personalizados `Elemental — Force (Trouble)` e `Elemental — Earth (Movimento reduzido)` agora definem `showIcon: ALWAYS` (valor `2`, API Foundry v14), mesmo quando não possuem duração nativa. O ícone do ActiveEffect volta a aparecer sobre o token afetado, além do painel lateral.
- **Reaplicação:** efeitos elementais já criados por versões anteriores também recebem `showIcon: ALWAYS` ao serem reutilizados.
- **Sem regressão mecânica:** mantido relógio por turno do agressor, com desativação ao expirar; sem alteração de status nativos, dano, Trouble, redução de velocidade, compêndios ou Charactermancer.
- ZIP completo de instalação manual; requer validação real no Foundry v14.

## v0.2.52 — Expiração de Force/Earth pelo turno do agressor (Foundry VTT v14)

- **1 rodada vinculada ao agressor:** Force (Trouble) e Earth (movimento reduzido) aplicados em Sucesso Fantástico duram até o início do próximo turno do personagem que lançou o poder, não até o início do turno do alvo.
- **Sem temporizador nativo concorrente:** os dois efeitos personalizados deixam de usar `duration.value = 1 round` do Foundry, cuja semântica antecipava o vencimento. Flags próprias registram combate, rodada de aplicação e combatente de origem, e o GM os desativa na transição correta. A remoção não apaga o registro nem provoca o erro de `EmbeddedCollection`.
- **Proteções:** a contagem não expira por simples avanço da vítima, nem ao retroceder rodada; o mesmo efeito pode ser reaplicado com relógio reiniciado; somente os efeitos elementais próprios são alterados, sem afetar condições manuais e status padrões.
- **Escopo:** nenhuma modificação em compêndios, fichas, Charactermancer ou cálculo de dano. ZIP completo para Foundry v14, pendente validação manual.

## v0.2.51 — Remoção segura de efeitos elementais temporários (Foundry VTT v14)

- **Correção do erro `undefined id ... does not exist in EmbeddedCollection`:** o sistema não exclui mais um efeito Elemental — Force/Earth no mesmo instante em que o registro nativo de expiração do Foundry v14 tenta atualizar seu documento. O registro nativo administra a expiração; sem expirador nativo, o sistema desativa o efeito em segurança.
- **Remoção pelo painel:** o Mestre desativa somente o efeito especial Force ou Earth selecionado. Seu ícone e nome desaparecem e os modificadores deixam de valer, sem remoção física do documento durante a disputa de atualização.
- **Reaplicação:** reativa o efeito existente, reiniciando sua duração com referência ao combate atual, sem criar sucessivas cópias inativas nem perder o identificador original.
- **Escopo:** preservados outros status, regras, efeitos por Concentração, HUD, fichas, compêndios e automações anteriores. ZIP completo para Foundry v14, requer teste manual.

## v0.2.50 — Identificação visual dos efeitos elementais temporários (Foundry VTT v14)

- **Efeitos Elementais Force/Earth:** os efeitos de Sucesso Fantástico que antes só mostravam um ícone no token passam a aparecer também no painel lateral de Condições com nome e descrição: **Elemental — Force (Trouble)** e **Elemental — Earth (Movimento reduzido)**.
- O efeito continua sendo um `ActiveEffect` temporário, sem criar um status fictício no catálogo. O cálculo de Trouble, redução de velocidade e expiração automática permanece inalterado.
- O Mestre pode remover o efeito diretamente no painel, sem afetar condições manuais, efeitos de outros poderes ou o compêndio. Jogadores podem visualizar o nome, mas não remover o efeito por essa interface.
- Fichas, HUD/POWERS, Charactermancer, compêndios, ataques e regras de combate permanecem preservados.
- ZIP completo instalável para Foundry v14; exige validação manual antes de se tornar versão estável.

## v0.2.49 — Ciclo de vida de Condições e Concentração (Foundry VTT v14)

- **Durações de poderes:** corrigida a contagem de condições de 1 turno quando são aplicadas durante o próprio turno do alvo, inclusive por Reação. Nesses casos, o turno em andamento já conta e a condição termina ao avançar para o próximo combatente. Se a condição for aplicada fora do turno da vítima, ela permanece até o final do próximo turno da vítima, como antes.
- **Controle de Turno:** retroceder o turno não faz efeitos temporários expirarem prematuramente; condições ligadas a um combatente removido da iniciativa não ficam penduradas indefinidamente. Efeitos de 1 rodada continuam vencendo ao chegar ao próximo turno do agressor, não apenas porque a iniciativa foi reordenada dentro da mesma rodada.
- **Vários tokens:** condições com duração de turno passam a identificar o token atingido, evitando usar outro combatente quando tokens ligados ao mesmo ator coexistem.
- **Interrupção de Concentração:** receber Atordoado ou Desmoralizado agora encerra as Concentrações do personagem, como estabelecido em `data/conditions.json`. Os efeitos de poderes mantidos por essas Concentrações são removidos pelos mecanismos já existentes, incluindo condições no alvo e regiões elementais relacionadas.
- **Integridade:** somente efeitos pertencentes ao card/poder e vínculo encerrado são removidos. Condições manuais e efeitos de Concentração distintos permanecem preservados. Operações autoritativas de expiração/interrupção continuam controladas pelo Mestre ativo.
- **Escopo preservado:** a v0.2.49 não inventa temporizadores para condições manuais sem duração explícita e não automatiza decisões narrativas. Compêndios, regras de ataques/danos, Hud/POWERS, fichas e Charactermancer não sofreram mudanças.
- Entrega em ZIP completo instalável para Foundry v14, sem publicação no GitHub; aguarda teste em mesa real.

## v0.2.48 — Condições e testes de escape (Foundry VTT v14)

- **Escapar de Grab por Ação ou Reação:** a janela imediata ao receber Elemental Grab permanece; durante o turno do personagem o botão "Escapar" no HUD oferece escolha entre Ação Padrão e Reação se ambas estiverem disponíveis. Fora do próprio turno somente uma Reação disponível permite nova tentativa. O Controle de Turno registra e valida o recurso escolhido.
- **Atalhos de Condições no HUD / POWERS:** aparecem apenas enquanto a condição estiver ativa. "Remover: Sangrando" faz Logic TN 10 e "Remover: Em Chamas" faz Agility TN 10, cada um custando uma Ação Padrão no próprio turno. Sucesso remove exclusivamente a condição testada; falha não a remove. Outros métodos narrativos permanecem sob decisão do Mestre.
- **Sangrando:** permanece perdendo 5 Health no fim do turno; recuperar 1+ Health agora encerra a condição automaticamente, mesmo sem o teste de Logic, inclusive com controle GM para personagens dos jogadores.
- **Envenenado:** a passagem para o turno de um alvo envenenado cria um pedido de Resilience TN 18 no chat, visível ao dono e ao Mestre. A rolagem não custa Ação: falha perde 1 Health automaticamente; sucesso evita a perda neste turno; Sucesso Fantástico remove Envenenado. Pedidos repetidos, testes em turnos antigos e múltiplas confirmações do mesmo pedido são bloqueados.
- Removido aviso de compatibilidade `Roll.evaluate({async:true})` da rotina de Recuperação (v14).
- Não altera compêndios, poderes, fichas, Charactermancer, dano de outras condições ou regras de proteção; instalação com ZIP único. Validação automatizada concluída; testes em mesa real ainda necessários.

## v0.2.47 — Condições adicionais de Poderes (Foundry VTT v14)

- **Venom Burst** derruba individualmente cada alvo atingido, mesmo no acerto normal que não causa dano. Falhas e rerrolagens removem apenas a condição criada pelo card; cálculo de dano Fantástico segue sujeito à confirmação manual.
- **Headshot** atordoa após dano efetivo confirmado (sucesso normal ou fantástico). Dano zero após proteções não atordoa.
- **Penance Stare** paralisa por um turno no Sucesso Fantástico, apenas após o Mestre confirmar o card de dano de Focus.
- **Double Tap** e **Snap Shooting** aplicam Sangrando no Sucesso Fantástico; **Growing Attack** aplica Atordoado; **Spider-Strike** aplica Paralisado. Todos aguardam confirmação do dano e são reconciliados após rerrolagens.
- Corrigida somente a detecção dos ataques/dano no runtime de **Headshot, Double Tap e Penance Stare** para registros antigos que continham `attack:false` ou `damageType` ausente, sem reescrever itens ou compêndios.
- Dano diferenciado, efeitos de área que dependem de escolhas e situações narrativas permanecem com o Mestre. UI, fichas e compêndios preservados; ZIP único para Foundry v14, pendente teste real.

## v0.2.46 — Correção de identificação Venom Burst (Foundry VTT v14)

- Corrigido o nome de um poder do compêndio **Powers / Spider-Powers**: a descarga bioelétrica em área de até 5 espaços é **Venom Burst**, não uma segunda cópia de Venom Bash.
- Mantidos o mesmo ID do item, o custo de 10 Focus, pré-requisito **Venom Bash, Rank 3**, descrição, efeito e demais campos.
- **Venom Bash** original permanece inalterado, assim como a implementação de suas condições da v0.2.45. O Charactermancer já reconhecia Venom Burst corretamente.
- Proteção contra regressão no teste do compêndio. Nenhuma alteração nas regras, fichas, HUD ou nos demais compêndios.
- Correção do pacote do sistema; itens já importados para o mundo ou personagens não são renomeados automaticamente.

## v0.2.45 — Condições automáticas de Poderes e Sucessos Fantásticos (Foundry VTT v14)

- **16 novos poderes com condições automáticas após confirmar DAMAGE**: Smash, Reverse Punch, Telekinetic Attack, Disrupt Person, Bolts of Balthakk, Focused Strike, Mental Punch, Telepathic Blast, Venom Bash, Venom Blast, Point-Blank Parry, Telekinetic Toss, Flying Double Kick, Dance of Death, Orchestra of Overkill e Unrelenting Smash.
- Em Sucesso Fantástico confirmado, aplica Atordoado, Sangrando ou Caído conforme a descrição individual de cada poder. O Atordoado de um turno ou de uma rodada vence nos momentos apropriados do Controle de Turno. Falhas, alvos não atingidos e resultados pendentes de decisão individual do Mestre não geram efeitos.
- Venom Bash e Venom Blast só aplicam Atordoado quando o alvo realmente perde **Health** depois de reduções de dano; dano nulo ou perda exclusiva de Focus não cumpre o requisito.
- A confirmação de dano registra o tipo (Health/Focus) e a assinatura da rolagem original. Uma rerrolagem de Edge/Trouble invalida as condições dependentes do card antigo; o Mestre precisa gerar/confirmar um card de dano atualizado. Cards antigos não afetam dados novos. Efeitos manuais nunca são removidos por essa reconciliação.
- **Escopo:** a atualização automatiza as condições listadas. Regras especiais de multiplicadores de dano, ataques adicionais, efeitos narrativos e testes situacionais permanecem regidas pelos fluxos já existentes e/ou decisão do Mestre. Nenhuma modificação nos compêndios, atributos, layout das fichas, HUD, Charactermancer ou Focus. Penance Stare e Headshot continuam para uma etapa própria, pois exigem tratamento especial de dano.
- ZIP instalável único para Foundry VTT v14; testes automatizados; requer validação no Foundry real antes de ser considerada versão estável. Nada publicado no GitHub.

## v0.2.44 — Ataques com múltiplos alvos (Foundry VTT v14)

- Uma única rolagem, com comparação de defesa e resultado de acerto separados por token marcado.
- Cards de dano estruturados incluem somente alvos atingidos; cada um conserva sua Redução de Dano e proteção elemental individual.
- Sucesso Fantástico e suas condições se aplicam apenas a alvos efetivamente atingidos (mantendo os requisitos específicos de cada poder).
- Quando os alvos exigem Edge/Trouble incompatíveis com uma única rolagem, a resolução fica pendente de confirmação individual do Mestre no próprio card; não são inventadas rerrolagens automaticamente.
- Decisões individuais ficam ligadas à rolagem, e cards de dano desatualizados após rerrolagem ou mudança na decisão são bloqueados.
- Mantidas fichas, HUD, Charactermancer, Concentração, Focus e compêndios da v0.2.43.

## v0.2.43 — Correção de salvamento das fichas ActorSheetV2 (Foundry v14)
- Persiste Atributos, Saúde, Focus, Rank, Karma, Team Maneuver e campos da Biografia individualmente, sem submeter formulário antigo completo.
- Novo editor de História, Personalidade e Características, com Editar/Salvar/Cancelar e salvamento no fechamento.
- Mantidas as regras, fichas atuais e todos os compêndios; tamanho continua utilizando lógica própria de token e Active Effects.

## 0.2.42 — Agarrado por Poder e Unificação das Proteções (Foundry v14)

- Regra da mesa **Agarrado — Poder**, separada do agarrão físico: alvo não pode realizar deslocamento voluntário, ataques contra ele recebem **1 Edge** (sem acumular da mesma condição), e o controlador não fica agarrado. O Mestre pode reposicionar o token para resolver movimentos forçados ou situações narrativas.
- **Elemental Grab, Telekinetic Grab, Webgrabbing e Hellfire Chains** recebem o status separado; o efeito elemental **Plants** também. Agarrões físicos (Grappling Technique e Leaping Leglock) conservam o comportamento original. Efeitos antigos reconhecem a origem do poder sem alteração destrutiva dos personagens.
- Testes de **Escapar**, prazo e **Concentração** continuam utilizando os vínculos originais; a condição nova não inventa TN nem duração.
- Proteções por **Elemental Protection, Sphere e Prison** passam pela mesma seleção antes da aplicação de dano: barreiras desenhadas cruzadas têm prioridade, depois a proteção pessoal; defesa da estrutura segue Ego do criador, e o limite de absorção considera o dano bruto antes da DR. Os valores de Shield/DR continuam sendo aplicados pelo cálculo normal de dano.
- Cards de dano legados também passam pelo mesmo motor de proteção, e dois cliques simultâneos no mesmo card (neste cliente) são serializados para evitar aplicação duplicada. A confirmação é mantida no card.
- Nenhuma mudança nos compêndios ou nos layouts de Personagem, NPC, Item e Charactermancer. Compatibilidade Foundry v14 preservada.

## v0.2.41 — Estabilização Geral (Foundry VTT v14)

- Novos efeitos transitórios de Concentração armazenam apenas mudanças tipadas v14 (`system.changes`); registros antigos de `changes` são limpos na atualização, sem mudar os bônus de Body Sheet/Shield nem os efeitos por Concentração.
- Pedidos de Ação/Reação do Controle de Turno passam por validação atômica no Mestre: rejeita recursos duplicados, inválidos, vazios e recursos já esgotados. Mantida serialização por combatente.
- Pedidos de combate com IDs explícitos não são aplicados a um combate diferente caso o anterior tenha sido encerrado.
- Preservados HUD, fichas de Actor/Item, Charactermancer, regras, 18 compêndios e configurações anteriores.
- Limitações: avisos de módulos externos, tokens apontando para imagens inexistentes e opção de fichas legadas não são ocultados nem alterados.

## v0.2.40 — HUD e Controle de Turno 2.0 (Foundry v14)

- Controle de Turno calcula o limite de Reações a partir do Traço Combat Reflexes (2 Reações por rodada), inclusive em personagens existentes, sem migrar ou sobrescrever dados de ficha. Limite retorna a 1 se o Traço for removido.
- O controle mostra recurso usado / máximo em cada combatente, com destaque quando esgotado, preservando cores e comandos anteriores.
- Atualização entre clientes ao mudar ficha, Traços, itens, efeitos e token; confirmação negativa imediata se uma requisição de Reação falhar no Mestre.
- HUD nativo preserva a posição de rolagem ao atualizar a lista e reage também a Active Effects de itens vinculados aos personagens.
- Painéis HUD/Controle de Turno já são implementações nativas, não interfaces ApplicationV1. Aparência anterior preservada.
- 18 compêndios, sistema de combate, Charactermancer, fichas V2 e rotinas de danos preservados. Testes automatizados; validação real no Foundry v14 pendente.

## v0.2.39 — Edição visível de textos e contraste dos Active Effects
- Botões Editar, Salvar e Cancelar visíveis diretamente em Description e Effect, com edição de texto formatado e gravação isolada por Item.
- As descrições das demais fichas de Item usam o mesmo fluxo; os campos de Elemento e outros atributos preservam seu salvamento anterior.
- Nomes e demais informações dos Active Effects em preto sobre fundo claro; nenhuma alteração mecânica ou nos compêndios.
- A versão ainda requer validação de operação real no Foundry v14.

## v0.2.38 — Correção persistência ItemSheetV2 (Foundry v14)
- Gravação de Elemento e campos simples separada por campo, sem submissão global que possa apagar Description ou Effect.
- Description e Effect exibidos continuamente a partir do HTML enriquecido persistido; editor V14 com Salvar explícito e gravação ao fechar, inclusive para poderes embutidos em personagens.
- Ajustes aplicados aos demais tipos de Item; automações, compêndios e fichas de Actor preservados.

## v0.2.37 — Correção da edição de ItemSheetsV2 (Foundry v14)

- Rótulos de campos com texto preto sobre fundo claro, melhorando a legibilidade nas fichas de Item.
- Campos Description e Effect, além de descrições de Armas, Traços, Tags, Origens, Ocupações e Itens, usam o `<prose-mirror>` nativo do Foundry v14 em lugar do helper legado `{{editor}}`.
- Os editores usam nome `system.campo` e UUID real do Item para edição e salvamento, inclusive para Items incorporados a Atores; visualização enriquecida quando a ficha não é editável.
- Seção Effects tem cabeçalhos legíveis e alinhados, sem modificar a criação ou o funcionamento dos Active Effects existentes.
- Compêndios, automações, fichas de Atores e Charactermancer preservados. Requer validação no Foundry real.

## v0.2.36 — Fichas de Itens em ApplicationV2 (Foundry v14)

- Power, Weapon, Trait, Tag, Origin, Occupation e Item usam `HandlebarsApplicationMixin(ItemSheetV2)` como padrão, com templates separados por tipo.
- Navegação de abas, formulários, avatar, gerenciamento de Active Effects e controles de Trait/Tag em Ocupações migrados para DOM nativo.
- Ficha antiga de Item mantida como alternativa de compatibilidade (não padrão).
- Novo estilo vermelho/preto/branco para fichas de Item, com rolagem vertical.
- Cabeçalho **NON-COMBAT CHECKS** na ficha de Personagem agora branco sobre vermelho-escuro, combinando com os demais.
- Compêndios, regras de combate, ActorSheets e Charactermancer não modificados; requer validação no Foundry v14.

## v0.2.35 — Refinamento da ficha de Personagem (Foundry v14)

- Cabeçalho **Atributos** visível e com altura fixa independente do corpo da tabela.
- Lista de Poderes e Traços & Tags em colunas de CSS Grid, com alinhamento superior mesmo com alturas diferentes.
- Fundo texturizado do painel replicado verticalmente para listas longas; a textura não desaparece ao rolar.
- Mudanças limitadas à ficha de Personagem; painel de NPC da v0.2.34, compêndios, regras e automações permanecem idênticos.
- Testes automatizados; requer validação real na mesa Foundry VTT v14.

## v0.2.34 — Reparos da interface ActorSheetV2 (Foundry v14)

- Restabelecida a rolagem vertical integral nas fichas V2, eliminando travamentos de altura fixa e `overflow:hidden` herdados da UI antiga.
- Alinhamento em colunas estáveis para os atributos da ficha de Personagem.
- Retorno dos tooltips de Poderes/Itens com preenchimento de metadados durante `_onRender`, independente do hook V1.
- Ficha de NPC reorganizada em painel responsivo inspirado na distribuição visual das fichas impressas, mantendo retrato, Rank, Health, Focus, atributos, dano, Poderes, Traits e Tags.
- Mantidos nomes dos campos para salvar no Actor existente e controles de itens, rolagens, Active Effects, HUD e PDF; compêndios não alterados.
- Validação automatizada; requer confirmação dentro do Foundry VTT v14 real.

## v0.2.33 — Modernização das fichas de Personagens e NPCs (Foundry v14)

- Fichas de Personagens e NPCs passaram a usar `HandlebarsApplicationMixin(ActorSheetV2)` e a API `DocumentSheetConfig` do Foundry v14.
- Aparência e templates originais preservados, inclusive o posicionamento de Poderes do NPC, movimentação em combate e cores da ficha.
- Novo ciclo de vida para campos editáveis, abas, rolagens, controles de itens e Active Effects. Os comandos de Active Effects não conflitam mais com `data-action` reservado do ApplicationV2.
- Importação por arrastar-e-soltar mantém Origem, Ocupação e poderes elementais, com suporte a ordenação nativa.
- Exportação PDF reintegrada à barra de título da nova ficha de personagem.
- Fichas antigas ficam disponíveis como opção **de compatibilidade**, mas as modernas são o padrão.
- Nenhuma mudança nas regras, nos compêndios, no motor de dados ou no ItemSheet.
- Testes automatizados e de navegação em navegador simulado; validação na interface do Foundry real ainda necessária.

## v0.2.32 — Filtro de Power Sets no Charactermancer (Foundry v14)

- A listagem de poderes agora respeita estritamente o Power Set escolhido no seletor.
- Corrigida a inclusão indevida de progressões homônimas de outros conjuntos, como Jump 1/2/3 de Super-Strength no seletor Spider-Powers.
- Os poderes de outros conjuntos permanecem no catálogo e disponíveis quando o conjunto correspondente é selecionado; dados dos compêndios e personagens existentes preservados.
- Sem alterações nos cálculos de atributos, Focus, poderes ou Active Effects. Correção restrita à interface do Charactermancer.

## v0.2.31 — Correção de abertura do Charactermancer (Foundry v14)

- Corrigido `Cannot set property state of #<ApplicationV2> which has only a getter`, renomeando o estado de criação para `mmcState` sem conflitar com a API do Foundry.
- Mantidos os seis passos, catálogo, regras, layout e compêndios da v0.2.30.
- Teste de regressão com `ApplicationV2.state` somente leitura, como no Foundry v14.

## 0.2.30 — Charactermancer 2.0: ApplicationV2 (Foundry VTT v14)
- Janela principal do Charactermancer migrada de `foundry.appv1.api.Application` para `foundry.applications.api.ApplicationV2`, utilizando renderização e substituição de DOM nativas.
- Mantidas as seis etapas de criação, as buscas/seleções, os pré-requisitos, os poderes repetíveis, o fluxo de criação do ator e seus Active Effects.
- Tema vermelho, preto e branco, cabeçalho com indicação da etapa e navegação preservada.
- Corrigidos os acessos antigos a `this.element[0]` e desativados dois shims próprios do V1, agora desnecessários.
- Compêndios e dados do Charactermancer inalterados. GitHub não modificado. Requer validação visual e funcional dentro do Foundry v14.

## 0.2.29 — Modernização gradual dos diálogos (Foundry VTT v14)

- Janelas de seleção de alvos, teste situacional, reação para escapar e Focus variável agora utilizam `DialogV2.wait` nativo em vez de `Dialog.wait`/`new Dialog` legado.
- Escolhas e cancelamentos mantêm os valores originais; fechar a janela não altera alvos, não gasta Focus e não consome Reação.
- DialogV2 fornece seu próprio formulário: controles de gasto de Focus adaptados à nova interface, com verificação de limites.
- Paleta vermelho, preto e branco, consistente com o Controle de Turno; CSS escopado, sem mexer nas fichas antigas.
- Compêndios, poderes e mecânicas não alterados. A migração dos grandes formulários e das fichas para ApplicationV2 continuará em etapas posteriores.
- ZIP completo para Foundry v14, sem alterações no GitHub.

## 0.2.28 — Hotfix Combat Trickery (Foundry VTT v14)

- Corrigido o disparo de Combat Trickery em ataques cujo `system.attack` foi salvo como `false` no compêndio, especialmente Double Tap. A verificação passa a usar a classificação de ataques já usada pelo sistema, incluindo armas e poderes direcionados que testam uma defesa.
- Permanecem os requisitos originais (todos os alvos de Rank igual/superior, uma vez por batalha, custo e Reação existentes); poderes que não são ataques não consomem o efeito preparado.
- A mensagem explica que a ativação modifica o próximo ataque válido, não uma rolagem já concluída.
- Incluídos testes regressivos para Double Tap, outros ataques e exclusão de efeitos não ofensivos.
- Compêndios, automações anteriores e APIs de Foundry preservados; ZIP completo para testes, sem publicação no GitHub.

## 0.2.27 — Auditoria de Poderes e consistência do Charactermancer (Foundry VTT v14)

- Conciliação dos poderes entre catálogo auxiliar, compêndios e Mundo por ID e conteúdo, sem descartar poderes distintos que compartilham um nome. Mantida a precedência dos poderes personalizados do Mundo.
- Correções canônicas de nome e pré-requisito por ID continuam protegidas contra versões antigas do compêndio; os Active Effects existentes permanecem presentes ao mesclar os dados.
- Na seleção, poderes homônimos de conjuntos diferentes não ficam mais indevidamente marcados como "Concedido" ou "Selecionado"; requisitos continuam reconhecendo os nomes conforme as regras do catálogo.
- Na criação da ficha, uma Origem/Ocupação não apaga poderes distintos escolhidos pelo jogador. Séries numeradas preservam o maior nível dentro de cada conjunto, sem remover o mesmo tipo de poder pertencente a outro conjunto.
- Corrigida a dica de pré-requisito ausente no botão "Bloqueado", que exibia uma expressão literal em vez dos requisitos.
- Compêndios LevelDB, descrições oficiais, automações de poderes, seleção manual, Focus e Combate Inteligente da v0.2.26 preservados sem alterações.
- Testes automatizados e ZIP instalável completo; validação no Foundry v14 permanece necessária. GitHub não alterado.

## 0.2.26 — Configuração do Combate Inteligente e modernização gradual (Foundry VTT v14)

- Nova configuração global **Cancelar Combate Inteligente**, marcada por padrão. Enquanto ativa, ignora completamente a análise prévia de alcance e linha de visão, mantendo inalteradas as rolagens, Focus e seleção de alvos. Desmarcar habilita os avisos da v0.2.25.
- Leitura de alterações de Active Effects agora prioriza `type` (texto da API v14), com compatibilidade para objetos antigos serializados com `mode` numérico sem acessar o getter obsoleto do Foundry; abrangência: movimento, Grow, Shrink e Resize Other.
- Hook de manutenção de Focus atualizado para `renderChatMessageHTML` e elemento HTMLElement nativo; janela de verificação de combate utiliza `DialogV2.wait` quando disponível, com fallback compatível.
- Migração completa das fichas e do Charactermancer para ApplicationV2 fica para etapa futura de baixo risco, após testes de interface; nenhuma alteração em compêndios, fórmulas, atores ou fichas desta versão.
- ZIP único completo, sem publicação no GitHub; requer validação dentro do Foundry v14.

## 0.2.25 — Correção de alcance nas cenas sem grade (Foundry v14)

- Correção crítica: a API GridlessGrid do Foundry v14 devolve sempre `spaces: 0`. Quando a cena não possui grade, o sistema passa a converter a distância real da régua (`measurePath().distance`) pelo valor de distância de cada espaço. Um zero irreal também é detectado e corrigido em cenas com informações incompletas.
- Identificação reforçada do token conjurador, incluindo Actors sintéticos e tokens não vinculados; não omite silenciosamente a verificação quando há alvo mas não foi localizado o atacante.
- Adicionados testes para Elemental Blast e Elemental Burst a 15 espaços contra alcance de 10, mock de cena gridless, cancelamento antes de Focus e Actor sintético.
- Mantidos avisos não bloqueantes de alcance/visão, modos de alvo e demais recursos da v0.2.24; nenhum compêndio alterado.
- Versão candidata a validação real no Foundry v14; entrega apenas ZIP completo, sem GitHub.

## 0.2.24 — Combate Inteligente: alcance e linha de visão (Foundry v14)

- Verificação prévia de alcance e linha de visão para armas e poderes direcionados, **antes** de gastar Focus, modificar Concentração, consumir ação ou rolar.
- Alcances explícitos em português/inglês, por Rank e Reach; exceções para fichas antigas Elemental Grab, Telekinetic Grab e Elemental Barrier. Alcance indefinido **não** é estimado livremente.
- Distância entre centros calculada no grid v14; alcance corpo a corpo considera bordas e tamanhos dos tokens, incluindo Extended Reach da ficha.
- Linha de visão usa `foundry.canvas.geometry.PointSourcePolygon.testCollision` quando disponível. Casos não confirmados não geram bloqueio artificial; tudo é aviso com escolha do jogador e registro no chat.
- Janela coerente com a estética vermelha/preta/branca do sistema, com opções Trocar alvos, Continuar mesmo assim e Cancelar. Mantidas seleção manual padrão, Edge/Trouble, Reações, proteções, regiões, Focus e compêndios da v0.2.23.
- Testes offline em Node.js + verificação da integridade do ZIP; validação dentro do Foundry permanece necessária.

## 0.2.23 — Edge/Trouble de condições (Foundry VTT v14)

- Consulta apenas condições ativas reais no ator, sem duplicar a mesma condição de múltiplos efeitos, e mostra no chat as origens de Edge/Trouble.
- Modificadores explícitos: Desmoralizado/Exausto (todos os testes), Atordoado/Arrasado (ações padrão/Reações), Imobilizado (Melee/Agility), Caído (ataques Melee), Agarrado (ataques com/sem alvo específico) e Edge contra alvos Atordoados/Arrasados/Restritos/Cegos, além de Caído (Edge de perto ou Trouble à distância).
- Compensa Edge e Trouble opostos. Não soma condições incompatíveis entre múltiplos alvos na mesma rolagem. Efeitos que exigem interpretação visual/auditiva ficam com o Mestre.
- Trouble líquido único faz rerrolagem obrigatória do melhor dado (exceto 6-M-6); Edge deixa o jogador escolher qual dado rerrolar no card. Acúmulos dependentes de decisão do Mestre não são rerrolados automaticamente.
- Rola também nos testes de atributos do HUD, no Escapar e em rolagens de ficha. Preserva poderes, Focus, Reações, alvos manuais e compêndios da v0.2.22.
- Sem publicação no GitHub; ZIP completo instalável.

## 0.2.22 — Alvos manuais por padrão e visual no tema D616 (Foundry VTT v14)

- **Seleção manual do Foundry** passa a ser o padrão. Na primeira inicialização após atualizar, perfis que ainda estejam em modos anteriores mudam uma única vez para seleção manual; é possível escolher **Perguntar antes de ataques** nas configurações a qualquer momento.
- Removidos o modo **Reutilizar último alvo válido**, o botão **Manter último alvo**, a mensagem de último alvo e a gravação de histórico automático de alvos. Configurações antigas `auto` são tratadas como manuais.
- Janela opcional de alvos e seletor de tokens no mapa atualizados para vermelho, preto e branco, seguindo o estilo do Controle de Turno.
- O modo de confirmação mantém **Usar alvos marcados** (quando houver), **Selecionar no mapa**, **Sem alvo** e **Cancelar**; continua antes de gastar Focus e sem alterações dos alvos no cancelamento.
- Preservados Reações para escapar, Concentração, compêndios e todas as automações anteriores. ZIP instalável completo, sem publicação automática no GitHub.

## 0.2.21 — Alvos Inteligentes e Escapar como Reação (Foundry VTT v14)

- Nova configuração por cliente: **Seleção inteligente de alvos** com três modos (confirmar o alvo, reutilizar automaticamente o último alvo ou manter a seleção manual tradicional). Padrão: confirmar.
- Último alvo salvo por personagem e cena: não recupera tokens excluídos, ocultos a jogadores ou de outra cena. A escolha explícita de não ter alvos não apaga o último alvo útil.
- O seletor aparece antes do gasto de Focus/Concentração em armas e poderes direcionados, com botões para manter o alvo anterior, aproveitar alvos já marcados, selecionar diretamente no mapa, usar sem alvo ou cancelar.
- Seleção direta no mapa permite múltiplos tokens com cliques sucessivos, inclusive sobre tokens, sem alterar/mover os tokens; Enter confirma, Escape cancela. Nenhum alvo é alterado antes da confirmação.
- Condições de contenção criadas por um novo acerto agora oferecem **Escapar como Reação** imediatamente ao jogador que controla o alvo (ou Mestre, para NPC sem jogador proprietário). Quem recusa pode tentar escapar posteriormente por Ação Padrão no próprio turno.
- Reações fora do turno são validadas e consumidas pelo Controle de Turno, com confirmação do Mestre via socket e deduplicação de pedidos; o teste não é rolado se a Reação já foi utilizada.
- Escapes preservam TN ou defesa específica por poder e só removem as condições geradas pelo ataque original, sem apagar efeitos manuais ou especiais elementais de duração independente.
- Nenhuma alteração nos compêndios. ZIP completo de instalação; não publica diretamente no GitHub.

## 0.2.20 — Condições, Escape e Sono Profundo (Foundry VTT v14)

- HUD POWERS: opção **Escapar** surge automaticamente quando um personagem está preso por Elemental Grab, Telekinetic Grab, Webgrabbing, Webcasting, Crimson Bands of Cyttorak, Hellfire Chains ou Coiling Crush. O botão desaparece ao ser removida a condição ou encerrada a Concentração.
- Testes conforme os textos dos poderes no compêndio: Melee vs TN 20 (Grab telecinético/elemental, Crimson Bands e Hellfire Chains); Melee vs TN 16 (Webgrabbing e Webcasting); Coiling Crush = Melee contra a defesa atual de Melee do controlador.
- Em combate, tentativas consomem 1 Ação Padrão pelo Controle de Turno; em falha a condição permanece e em sucesso o Mestre ativo remove somente as condições pertencentes àquela fonte, preservando outros poderes, status manuais e efeitos elementais independentes.
- Mists of Morpheus: além de Atordoado, Sucesso Fantástico aplica um Active Effect **Sono profundo** com ícone M até o término da Concentração, sem inventar um teste de despertar ausente na descrição.
- Não há alterações nos compêndios ou poderes já existentes; a nova automação reconhece efeitos de personagens existentes quando a origem ainda está disponível. Sem publicação direta no GitHub; único ZIP instalável sem relatórios extras.

## 0.2.19 — Controle de jogador e desenho sobre tokens (Foundry VTT v14)

- Elemental Sphere/Prison: removida a informação redundante de Proteção/Defesa abaixo do botão Desenhar área (já consta na descrição).
- Painel de controles liberado ao proprietário do personagem conjurador, ainda que o chat tenha sido criado pelo Mestre; autoridade revalidada no socket do Mestre ativo. Jogadores sem propriedade não recebem esses comandos.
- Captura temporária nativa de mouse na fase anterior às interações PIXI: permite começar e arrastar o desenho sobre tokens sem selecioná-los ou movê-los acidentalmente. Os listeners são limpos após soltar, Esc, cancelamento ou mudança de cena.
- Preservadas as Regiões do Foundry v14, a intercepção automática fora/dentro, Concentração, custo, dano e demais poderes. Nenhuma alteração nos compêndios.
- Entrega como ZIP único, completo e instalável, sem publicação direta no GitHub.

## 0.2.18 — Refinamento dos controles de Elemental Sphere e Prison (Foundry VTT v14)

- O seletor **Defesa elemental** nos cards de dano ocupa agora toda a largura da tabela (as três colunas), inclusive com nomes longos de proteções.
- Removido o botão manual **Resolver ataque contra a estrutura** de Sphere/Prison; a defesa Ego e a interceptação automática por posição, implementadas na v0.2.17, seguem intactas.
- O botão **Desenhar área**, a proteção indicada no chat, a Concentração e o motor de dano permanecem inalterados.
- Pacote instalável completo, sem publicação direta no GitHub.

## 0.2.17 — Regiões e interceptação de Elemental Sphere/Prison (Foundry VTT v14)

- Controles de Sphere/Prison aparecem apenas no card de descrição, sem painel duplicado no card da rolagem.
- Desenho interativo: clique e arraste para selecionar o raio da área. Sphere centrada no conjurador; Prison centralizada onde o jogador iniciar o arrasto. Raio limitado a 5 × Rank espaços.
- Substituído o MeasuredTemplate obsoleto por RegionDocument do Foundry v14, editável como Região e vinculada à Concentração; remoção automática no fim.
- Defesa automática por geometria do círculo: quando um ataque parte de um lado e mira um token do outro lado da barreira, utiliza a defesa Ego do CRIADOR. Ataques entre tokens dentro da mesma Região conservam defesas normais.
- Barreiras pertencem ao conjurador, mesmo protegendo outro personagem; interceptam dano bruto e podem ser destruídas sem ferir os protegidos por aquele ataque.
- Mestre conserva a possibilidade de aplicar ataque direto ignorando a proteção, para tiros que contornem o limite 2D ou situações especiais.
- Compêndios e poderes de outras categorias preservados.

## 0.2.16 — Ajustes dos Poderes Elementais (Foundry VTT v14)

- Elemental Push: controle de deslocamento com oito setas, distância por espaços e uso pelo autor da rolagem. Atacantes não Mestres enviam pedido validado ao Mestre para movimentar o token.
- Corrigido DAMAGE ausente em sucessos fantásticos de poderes que só causam dano nesse resultado. No Push, condição Caído e especial elemental são aplicados depois de confirmar o dano; sucesso normal continua sem dano.
- Elemental Sphere e Elemental Prison: botão de desenho no chat da descrição ou da rolagem cria MeasuredTemplate circular editável. Sphere centrada no conjurador; Prison com centro escolhido no mapa; template ligado à Concentração e removido quando ela termina. Sem Walls/Tiles automáticos.
- Elemental Protection 1–4 e estruturas ativas: status M com nome do poder; integração com cartão de dano. Protection e Sphere interceptam automaticamente se estão protegendo o alvo; para Prison, o Mestre escolhe atacar a estrutura. Estruturas usam Defesa Ego do criador, absorvem dano bruto até o limite 10×nível e são destruídas se excedido sem ferir ocupantes.
- Cartões de dano confirmados não podem ser aplicados novamente; confirmações de ataque absorvido não transferem condições ao personagem. Mantidas regras e conteúdo de compêndio da v0.2.15.
- ZIP completo instalável para Foundry VTT v14, sem publicação direta no GitHub e sem arquivos extras de auditoria/checklist. Requer validação em mesa.

## 0.2.15 — Poderes Elementais Avançados (Foundry VTT v14)

- **Elemental Prison:** valida possuir Elemental Protection, herda o custo do nível superior do personagem e mostra o limiar de absorção. No sucesso contra Ego vs Agility, registra o alvo dentro da prisão em um efeito de Concentração com ícone M, sem confundi-lo com a condição Imobilizado. No Sucesso Fantástico, permite dano normal e efeito especial elemental, apenas após o Mestre confirmar o dano.
- **Elemental Sphere:** mesma proteção e custo, com escolha dos alvos indesejados pelo jogador. O Mestre pode expulsar os alvos atingidos através do card; somente os efetivamente expulsos podem receber dano e efeito especial elemental por Sucesso Fantástico.
- **Elemental Suffocation:** exige um único alvo previamente Agarrado pelo Elemental Grab do mesmo personagem; Ego vs Resilience, custa 15 Focus, causa dano normal no sucesso e, no Fantástico, adiciona Imobilizado e efeito especial elemental após a confirmação do dano.
- **Elemental Push:** exige alvo único, Ego vs Agility e 10 Focus. No acerto, o Mestre pode mover o token em qualquer direção até Rank espaços, respeitando os limites da cena; apenas no Sucesso Fantástico habilita dano normal, Caído e efeito especial do elemento após o dano confirmado.
- Prison e Sphere não geram Tiles nem assumem geometria automática: posição, seleção de pessoas dentro da área e obstruções permanecem sob controle do Mestre. Cada estrutura absorve ataques até o limite de Elemental Protection; o Mestre pode registrar um ataque contra ela e encerrar a Concentração quando o dano ultrapassar o limite, sem ferir os ocupantes.
- Mantém identificação dos alvos por card, reconciliação após Edge/Trouble, condições com ícone M, regras de duração e Concentração. Corrigidos dados de rolagem dos quatro poderes no Charactermancer e compêndio LevelDB; personagens antigos também recebem a correção pelo nome do poder.
- Apenas um ZIP instalável completo, sem publicar diretamente no GitHub. Requer validação local no Foundry v14.

## 0.2.14 — Resize Other automatizado (Foundry VTT v14)

- Resize Other / Resize Others agora abre a seleção de um único token-alvo na cena. As categorias de tamanho disponíveis vêm dos níveis de Grow e Shrink que o personagem realmente possui (pré-requisito Rank 3 e Grow 2 ou Shrink 2). Resize Object permanece interpretativo e inalterado.
- Custo de 10 Focus continua administrado pelo Motor de Focus. Cancelar seleção, ausência de alvo ou violação da regra de toque não gasta Focus. Quando um erro ocorre após o débito e antes de aplicar o efeito, o gasto é estornado.
- Alvo voluntário é permitido; alvo resistente precisa estar previamente Agarrado. Para alvos de terceiros declarados voluntários, o Mestre ativo confirma consentimento. Não inventa nova rolagem nem dano: a regra do poder exige agarrar o alvo resistente antes.
- Aplica um Active Effect temporário de redimensionamento (a duração do poder é Permanente), sem alterar a categoria natural gravada na ficha. Ajusta todas as dimensões X/Y/Z dos tokens conforme a tabela de tamanho das versões anteriores, além dos efeitos de atributos derivados. Restabelecer tamanho anterior remove o efeito e recupera um Grow/Shrink próprio que estivesse ativo antes.
- Tokens vinculados são atualizados em cena e no token padrão do Actor; tokens NPC independentes atualizam apenas sua instância. Quando o jogador não possui permissão sobre o alvo, a aplicação é realizada e validada pelo Mestre via socket.
- Compêndios, fichas e poderes anteriores mantidos. Apenas um ZIP completo instalável; nenhuma publicação feita automaticamente no GitHub.

## 0.2.13 — Poderes não danosos com condições em Sucesso Fantástico (Foundry VTT v14)

- Elemental Grab: Agarrado no sucesso normal e Imobilizado + efeito especial do elemento no Sucesso Fantástico, sem necessidade de card DAMAGE. Concentração mantém apenas o agarramento/imobilização; efeitos especiais têm seu ciclo de vida independente.
- Elemental Control: reutiliza a tabela de especiais elementais existente; condições por 1 rodada, Trouble por Force e velocidade pela metade por Earth recebem o mesmo controle de duração.
- Telekinetic Grab: Agarrado e, em Fantástico, Imobilizado. Corrige rolagem sem dano até para poderes antigos em fichas existentes.
- Webgrabbing: Agarrado no sucesso e Imobilizado no Fantástico.
- Crimson Bands of Cyttorak: Paralisado no sucesso e Imobilizado no Fantástico; corrige dados antigos Logic vs Logic para Ego vs Melee e Edge conforme descrição.
- Elemental Barrier: aplica o efeito especial do elemento em Sucesso Fantástico, sem criar dano automático.
- Novos status continuam exibindo M, são vinculados à rolagem e reconciliados quando Edge/Trouble modifica o resultado, sem remover efeitos manuais.

## 0.2.12 — Ícones de condições e confirmação de dano (Foundry VTT v14)

- Os Active Effects de condições dos poderes passam a exibir o ícone M no token com showIcon: ALWAYS.
- Poderes que produzem dano aplicam suas condições somente após a confirmação do dano no card MMDR.
- Mantida a regra: dano zero não cancela efeitos determinados pelo acerto; Razorwebs só aplica Sangrando após dano efetivo.
- Poderes não danosos continuam aplicando condições quando o teste é resolvido.
- A reavaliação por Edge/Trouble continua reconciliando os efeitos da rolagem sem apagar efeitos manuais.

## 0.2.11 — Condições automáticas dos Poderes (Foundry VTT v14)

- Aplicação automática de condições de status dos Poderes após rolagem contra defesas, pelo GM ativo, em **23 poderes selecionados**: Disrupt Nerves, Flare, Dazzle, Wisecracker, Razorwebs, Shield Bash, Hurled Shield Bash, Rico-Shield, Clobber, Leg Sweep, Speed Blast, Webcasting, Elemental Grab, Telekinetic Grab, Thunder, Mists of Morpheus, Coiling Crush, Icy Tendrils of Ikthalon, Hellfire Chains, Ground-Shaking Stomp, Grappling Technique, Spin & Throw e Leaping Leglock.
- Regras distintas para Sucesso normal e Fantástico; **Falha Fantástica não produz condição**. A avaliação usa os alvos marcados e salvos no card, a defesa correta e as trocas Brawling/Evasion/Wisdom/Integrity. Apenas o Mestre ativo aplica ou remove os efeitos para evitar duplicidade entre clientes.
- Active Effects exclusivos por card e alvo (sem apagar condições manuais). Alterações posteriores na rolagem por Edge/Trouble conciliam condições concedidas/removidas, sem duplicar. Suporta tokens não vinculados e autoconsequências como Speed Blast (Caído no próprio atacante em Fantástico).
- Condições por uma rodada expiram no início do próximo turno do atacante; por um turno, após o próximo turno do alvo. Encerrar o combate limpa as condições temporizadas. Condições com duração dependente de sair de agarramento/teia/limpar Sangramento continuam até remoção pelo Narrador; efeitos ligados à Concentração encerram quando ela é removida/desativada.
- **Limite deliberado:** não automatiza condições que exigem confirmação de dano efetivo, teste para escapar ou julgamento/seleção narrativa. Fora de combate, condições temporizadas exigem remoção manual. A aplicação de um status não automatiza todos os seus efeitos secundários (perda de Concentração por atordoamento, modificadores de Edge/Trouble ou dano contínuo); manter supervisão do Narrador.
- Sem alteração dos compêndios, regras de Focus, Grow/Shrink, HUD, movimentação ou fichas existentes. Nenhum repositório GitHub foi modificado.

## 0.2.10 — Automação das rolagens dos Poderes (Foundry VTT v14)

- Corrigidos no compêndio de Powers e no Charactermancer os metadados de rolagem de 29 poderes (30 registros, contando as duas versões de Flare): habilidade, defesa alvo, TN fixo e distinção entre ataques com dano e testes sem dano. Inclui Detect Lie, Disrupt Nerves, Command, Swap Items, Jinx You, Razorwebs, Wisecracker e outras entradas.
- Poderes em fichas existentes têm metadados de rolagem recuperados em tempo de uso quando incompletos. As configurações explicitamente preenchidas pelo Narrador continuam prevalecendo. Fichas e compêndios existentes não são apagados nem reimportados.
- Novos controles nas fichas dos Poderes: **Teste sem dano** e **Número-alvo fixo (TN)**. Checks sem dano ocultam o botão genérico de DAMAGE. Jinx You e Flare preservam o botão apenas se o dado Marvel indicar possibilidade de dano por Sucesso Fantástico; a aplicação continua manual conforme o resultado da ação.
- Testes contra TN fixo calculam e exibem SUCESSO, FALHA, SUCESSO FANTÁSTICO ou FALHA FANTÁSTICA. A avaliação de alvo usa a defesa configurada e mantém as trocas por Brawling, Evasion, Wisdom e Integrity. Um Marvel M que não atinge a defesa é uma Falha Fantástica; um Ultimate Fantastic natural 6-M-6 é sucesso automático.
- Testes situacionais (ex.: Swap Items contra alvo relutante) oferecem Rolar teste / Usar sem teste / Cancelar antes de alterações em Focus ou Concentração. Não inventa dificuldades variáveis: Resurrect depende do tempo desde a morte; Understand Sign Language tem TN não informado na descrição, cabendo ao Narrador.
- O sistema não aplica automaticamente condições ou consequências narrativas dos testes nesta versão; esse recurso permanece para próxima etapa. Todos os demais mecanismos de v0.2.9 permanecem.

## 0.2.9 — Motor de Focus (Foundry VTT v14)

- Leitura de custos em português ou inglês (`Focus`/`Foco`), inclusive variáveis (`ou mais`/`or more`) e manutenção (`por/per turno/round/rodada`). Corrige Hex Bolt (5 Foco) e interpreta as onze entradas recorrentes presentes no catálogo.
- O gasto é escolhido/validado antes da Concentração; cancelar a escolha não altera recursos nem substitui Concentração. O Focus só é debitado após aprovação; a ficha é revalidada imediatamente antes do débito.
- Efeitos de manutenção por turno persistem em flags de Active Effects. Poderes com Concentração reaproveitam o efeito próprio; poderes sem Concentração recebem um efeito de manutenção separado. Gasto inicial não é cobrado duas vezes na mesma rodada.
- No turno seguinte do personagem em combate, o sistema cobra a manutenção uma vez, com processamento pelo Mestre ativo (ou por um único proprietário quando não há Mestre). Focus insuficiente encerra o efeito e sua Concentração associada; o chat disponibiliza Encerrar manutenção.
- Time-Out, Time-Out Bubble e Time-Out Tag encerram a manutenção ao atingir o limite declarado de uma rodada por Rank. Cobrança automática entre turnos é orientada ao combate; fora de combate o encerramento é manual.
- As fichas, HUD, Grow/Shrink, dimensões dos tokens e compêndios não foram alterados. Validar no Foundry v14 antes de publicar; GitHub não modificado automaticamente.

## 0.2.8 — Poderes Permanente acionáveis na lista POWERS (Foundry v14)

- **Resize Object** e **Resize Other** agora aparecem no Token Action HUD nativo apesar de `system.duration = Permanent`; aceita também a grafia alternativa **Resize Others** nas fichas importadas.
- Auditoria de 88 poderes com duração Permanente/Permanent no catálogo auxiliar (398 registros): mais 11 nomes ativos passam a aparecer no HUD, somando 13 novas exceções: Charmed Life, Disguise, Domination, Edit Memory, Flexible Fingers, Levitation, Memory Blip, Orders, Resize Object, Resize Other, Rubberneck, Shape-Shift e Teleport Object.
- Mantida a exceção de **Grow 1–4 e Shrink 1–4**. Os **67** poderes permanentes passivos restantes do catálogo auxiliar seguem ocultos.
- A seleção das exceções é explícita e compara o nome normalizado (com suporte para `Permanente`, `Permanent`, hífen no nome e alias de Resize Other), sem liberar automaticamente qualquer poder com o campo `action` preenchido: Lightning Actions e Stilt Steps continuam passivos neste filtro.
- Os atalhos chamam a mesma função `item.roll()` da ficha para respeitar Focus, rolagem existente, registros de turno e mensagens. **Não** são implementadas janelas de seleção de alvo, macros ou novos modificadores para os poderes adicionados.
- Nenhuma alteração nos compêndios, Charactermancer, sistema de combate ou tamanhos de token. Não publicado diretamente no GitHub; testar no Foundry v14 antes de publicar.

## 0.2.7 — Token X/Y/Z sincronizado com tamanho de Grow, Shrink e ficha (Foundry v14)

- Ao escolher tamanho em **Grow 1–4** ou **Shrink 1–4**, atualiza automaticamente o tamanho em espaços de grade **X (width), Y (height), Z (depth)** do token colocado na cena e do token padrão (*prototype token*) de um Actor vinculado.
- Mapeamento único: Microscopic 0,1; Miniature 0,3; Tiny 0,5; Little 0,7; Small 0,9; Average 1; Big 2; Huge 3; Gigantic 5; Titanic 8; Gargantuan 10. X/Y/Z recebem o mesmo valor.
- A opção **Tamanho normal** retorna à categoria natural do personagem, inclusive em personagens com **Unusual Size**; alternar Grow/Shrink não acumula dimensões.
- A troca **manual** de tamanho na ficha (personagem ou NPC) utiliza a mesma tabela. A movimentação de X/Y/Z não altera coordenadas do token (`x`, `y`), elevação ou escala artística (`texture.scaleX/scaleY`).
- Para tokens não vinculados (*synthetic actors*), apenas aquele token específico é alterado. Para Actors vinculados, os tokens vinculados na cena atual e o token padrão são atualizados; clones não vinculados não são tocados.
- Os efeitos antigos de tamanho que continham `prototypeToken.width/height` são limpos conforme usados, e os novos efeitos usam somente modificadores da ficha. Efeitos Grow/Shrink já ativos na cena são sincronizados ao abrir a cena como Mestre.
- Remover/desativar um efeito de Grow/Shrink restaura o tamanho conforme os efeitos restantes ou o tamanho natural.
- Os compêndios e os dados do Charactermancer não foram modificados. Não publicado no GitHub; validar localmente na v14.

## 0.2.6 — Shrink 1–4: seleção de tamanho e atalhos (Foundry v14)

- **Shrink 1–4** agora abrem a janela de Encolhimento ao usar o poder na ficha ou nos atalhos, mostrando os tamanhos permitidos, altura/faixa por categoria e opção de tamanho normal.
- Limites oficiais: Shrink 1 Little; Shrink 2 Tiny; Shrink 3 Miniature; Shrink 4 Microscopic. Não oferecem redução além do nível adquirido ou igual/maior que o tamanho natural.
- Duração Permanente: incluídos na lista de exceções do Token Action HUD nativo, aba POWERS, sem liberar outros poderes permanentes.
- Active Effect de Encolhimento separado do tamanho natural, com modificadores de tamanho conforme `CONFIG.MULTIVERSE_D616.sizeEffects`. Trocas não acumulam efeitos nem bônus, inclusive ao alternar Grow e Shrink.
- Cancelamento e retorno ao normal preservam dados naturais; mudança manual de tamanho encerra Grow/Shrink. Sem alterações aos compêndios existentes e sem migração destrutiva.
- Testes automatizados de categorias, opções por Rank do poder, HUD, não-acumulação, tamanho natural e regressão de Grow/movimentação. Publicar no GitHub somente após teste local no Foundry VTT v14.

## 0.2.5 — Grow 1–4 na lista de atalhos (Foundry v14)

- **Token Action HUD nativo, aba POWERS:** Grow 1, Grow 2, Grow 3 e Grow 4 aparecem nos atalhos mesmo quando `system.duration` é `Permanent` ou `Permanente`.
- Clicar no atalho chama `item.roll()`, preservando a janela de tamanho, limitações por nível e efeitos implementados na v0.2.4.
- A exceção é estritamente limitada aos quatro nomes oficiais Grow 1–4. Outros poderes permanentes continuam ocultos; poderes acionáveis não permanentes continuam visíveis.
- Compêndios, fichas, atributos, migrações e controles de movimento permanecem inalterados. Atualização local sem publicação no GitHub; validar no Foundry VTT v14 antes de publicar.

## 0.2.4 — Crescimento com escolha de tamanho (Foundry v14)

- Ao usar **Grow 1–4** em fichas de personagens ou NPCs, abre uma janela de seleção antes do uso, com rótulo da categoria e intervalo de altura em metros.
- **Grow 1:** Big / Huge; **Grow 2:** adiciona Gigantic; **Grow 3:** adiciona Titanic; **Grow 4:** adiciona Gargantuan. As opções respeitam também o tamanho natural do personagem. Sempre inclui retornar ao tamanho natural.
- Cancelar o diálogo não altera Actor nem gasta recursos, cria chat ou registra ações. O valor selecionado é validado novamente contra o nível do poder.
- O tamanho escolhido cria **um único Active Effect** próprio de Crescimento com modificadores oficiais, sem alterar `system.size` natural. Trocar de categoria substitui apenas o crescimento anterior; voltar ao normal o remove.
- Efeitos naturais de tamanho (incluindo **Unusual Size**, Big e Small) são preservados; modificadores de defesa/dano de tamanho não são somados indevidamente quando já existe efeito natural.
- A seleção manual de tamanho na ficha encerra qualquer Crescimento temporário para não deixar um override oculto.
- Motor de tamanho/movimentação e todo o restante da v0.2.3 preservados; testes automatizados adicionais de limites por Grow e comportamento das trocas.
- **Não publicada automaticamente no GitHub.** Validar no Foundry VTT v14.

## 0.2.3 — Stilt Steps permanente, Flight 2 e Shield/Extended Reach (Foundry v14)

- Stilt Steps: modificadores permanentes transferíveis à ficha (Corrida e Escalada ×2), inclusive fora de combate. Remove a criação e expiração de bônus temporários de turno da v0.2.2.
- Flight 2: removida a alteração `system.movement.jump.active = false`. Ter Flight 2 não desativa nem exclui Jump.
- Shield 1–4: DR de Saúde corresponde ao nível apenas durante a Concentração. Sem Concentração, não há DR automático do Shield. O maior valor ativo prevalece.
- Extended Reach 1–2: modificadores migrados de `system.reach` MULTIPLY para `system.reachFactor` UPGRADE, usando apenas o maior (×4 ou ×10), integrado ao alcance ajustado por tamanho; mantém apoio a efeitos legados até a migração.
- Migração de personagens antigos: atualiza efeitos embutidos (formatos v13/v14), restaura Jump, torna Stilt Steps permanente, desliga a transferência dos Shields, reatribui multiplicadores de alcance, remove efeitos temporários de Stilt da v0.2.2 e atualiza Shields que já estejam em Concentração.
- Compêndio nativo e Charactermancer atualizados; testes automatizados com 58 cenários de movimento e 23 testes de migração/efeitos.
- Sem publicação automática no GitHub. Validar primeiro no Foundry v14 real.

## 0.2.2 — Auditoria de Poderes, modificadores e movimentação (Foundry v14)

- Mighty, Accuracy, Brilliance, Discipline 1–4: efeitos permanentes UPGRADE (não acumulam níveis).
- Flexible Bones 2: Health Damage Reduction 2.
- Flight 1/2 e Speed Run 1/2: maior multiplicador não-combate; Speed Run 2 ×50 e Rank 3.
- Speed Swim: multiplica velocidade normal de natação por Rank, fora de combate ×3.
- Jump 2/3 (Spider-Powers, Super-Strength): efeitos de salto e multiplicadores fora de combate ×3/×50.
- Stilt Steps: duração instantânea; bônus Run ×2 e Climb ×2 somente durante a ação de movimento, com limpeza ao avançar o turno.
- Body Sheet: bônus DR Saúde 3 e planar 2× corrida regular apenas com Concentração ativa; ataques via Powers/armas impedidos durante o efeito.
- Compêndio nativo LevelDB e dados do Charactermancer sincronizados para os poderes afetados.
- Migração automática de poderes já adicionados a fichas existentes, com compatibilidade de efeitos antigos e repetição segura.
- Testes automatizados de regressão de movimento/migração; integração dentro do Foundry VTT v14 ainda requer teste local.

## 0.2.1
- Character sheet Speed block no longer shows the movement calculation explanation text.
- Speed now displays out-of-combat movement by default and automatically switches to in-combat movement while the actor is in an active combat.
- Open character and NPC sheets now refresh automatically when combat starts, ends, or combatants change.

## 0.2.0 — Auditoria de tamanho e movimentos (Foundry VTT v14)

- Motor compartilhado em `scripts/movement-calculator.mjs` para PC e NPC, com testes automatizados de regressão em `tests/movement.test.mjs`.
- Run: Agility +1 por 5 pontos; base legada que já inclui Agility detectada para não duplicar.
- Resize: tamanhos Little/Tiny/Miniature/Microscopic e todos os tamanhos maiores aplicados de modo único, sem duplicar efeitos de fichas importadas da v0.1.x; arredondamento para baixo nos multiplicadores de Resize.
- Flight: independente de mudanças temporárias de tamanho (FAQ oficial); Unusual Size consulta tamanho natural salvo, mesmo com Resize temporário. Speed Run não multiplica novamente outro poder de movimento.
- Climb, Jump e Swim: recalculados após Run; poderes específicos calculados da velocidade regular, sem empilhamento multiplicativo de poderes de movimento.
- Glide/Swingline/Levitation: cálculo especial, multiplicadores de tamanho não-flight e velocidades próprias preservadas.
- Velocidade fora de combate: derivada da velocidade final e do multiplicador do Active Effect; ficha mostra combat e fora de combate.
- Trocas de tamanho: operações aguardadas em ordem (`await`), efeitos reconhecidos por flag ou pelo padrão legado; selecionando tamanho permanente, atualiza tamanho natural.
- Alcance: calculado por multiplicador de tamanho em relação ao alcance original quando não houver outro Active Effect alterando alcance.
- Efeitos Flight importados no Charactermancer: removido `runspeed` redundante na mesma chave `flight.calc`.
- Compatibilidade: sistema completo em ZIP, sem atualizar repositório; compêndios LevelDB legados preservados.
- Verificação de regressão: `node tests/movement.test.mjs`. Requer Node.js 20+.

## 0.1.99
- NPC sheet: added top spacing above the Powers block so it no longer overlaps the Health panel.

# Changelog

## 0.1.98

- **Ficha de NPC — organização:** painel **Powers** transferido da coluna direita para a coluna esquerda, diretamente abaixo do retrato, Rank, Health/Focus e atributos.
- **Painel de Poderes:** ocupa toda a largura disponível da coluna esquerda, com altura ajustada ao conteúdo. Mantidos grupos de poderes, rolagens e os comandos de inclusão, edição e exclusão.
- **Coluna direita:** continua mostrando **Damage** e **Traits & Tags**, sem o painel de poderes.
- **Escopo:** ajuste limitado ao layout de NPC; ficha de personagem, mecânicas de jogo, compêndios e automações da v0.1.97 preservados. Compatibilidade Foundry VTT v14 mantida.

## 0.1.97

- **Controle de Turno:** abre e restaura automaticamente a janela no primeiro combatente adicionado pelo Mestre ao combate ativo. Funciona para GM e jogadores conectados e evita reabrir após o usuário fechar manualmente a janela no mesmo combate.
- **Concentração — jogadores:** donos de personagens podem remover a condição genérica de Concentração (encerrando todos os Powers mantidos) ou um status de Power em Concentração (encerrando apenas aquele Power). Outras condições continuam restritas ao Mestre.
- **Concentração — sincronização:** remoção pelos jogadores é encaminhada ao Mestre ativo por socket, com verificação de propriedade do Actor e do tipo exato de status. Os contadores e efeitos vinculados são sincronizados pelos hooks existentes.
- **Compatibilidade:** preservados os compêndios, dados e demais recursos da v0.1.96. Validado para Foundry VTT v14.

## 0.1.96

- **Charactermancer / Pré-requisitos:** normalização de 25 registros no catálogo de poderes (grafia, nomes de poderes distintos, Rank e separadores).
- **Return Fire:** requer `Suppressive Fire, Rank 2`. **Always Ready:** requer `Do This All Day, Rank 3`.
- **Poderes distintos:** nomes `Mirror Images`, `Venom Burst` e `Steal Power` corrigidos sem perder os registros originais.
- **Outras correções:** `Evil Eye`, `Boost Powers`, `Extend Invisibility`, `Dance of Death`, `Elemental Ricochet` e requisitos dos demais poderes auditados.
- **Resize Other/Resize Object:** aceitam `Grow 2` **ou** `Shrink 2`, com Rank mínimo 3.
- **Validação reforçada:** verifica poderes, Tags, Traços, origem, atributos e Rank; não libera pré-requisitos não reconhecidos; revalida ao clicar em Selecionar.
- **Compêndios legados:** o Charactermancer reconcilia as referências de poderes corrigidos ao carregar os dados, preservando os efeitos de cada item.
- **Empacotamento:** versão `0.1.96`, mantendo compatibilidade com Foundry VTT v14 e compêndios do pacote anterior.

## 0.1.95

- **PDF — Traits/Tags repetidos:** a primeira página agora preserva seleções repetidas usando contador, igual ao Charactermancer Web (ex.: `Surprising Power ×2`, `Linguist ×2`, `Obligation ×2`).
- **PDF — páginas extras:** descrições de Traits/Tags repetidos aparecem apenas uma vez, evitando duplicação desnecessária.
- **Compatibilidade:** mantida a correção WinAnsi/Unicode da v0.1.94 e todas as alterações do Charactermancer para `system.multiple = true`.
- Mantida compatibilidade com **Foundry VTT v14**.

## 0.1.94

- **Fix (Exportação PDF):** corrigido erro `WinAnsi cannot encode` ao exportar fichas com textos contendo caracteres invisíveis, incluindo `U+200B ZERO WIDTH SPACE`.
- O exportador agora remove caracteres de largura zero/BOM/controles bidi e normaliza textos antes de medir ou desenhar no PDF.
- Campos do formulário PDF também passam pela mesma normalização, evitando falhas silenciosas com caracteres não suportados pela fonte Helvetica/WinAnsi.
- Adicionada barreira de compatibilidade para caracteres fora do WinAnsi: quando possível são transliterados; caso contrário, são substituídos por `?` em vez de interromper a exportação.
- Mantidas integralmente as alterações da v0.1.93 para **Traços e Tags repetíveis** no Charactermancer.
- Mantida compatibilidade com **Foundry VTT v14**.

## 0.1.93

- **Charactermancer — Traços/Tags múltiplos:** o passo **Traços & Tags** agora respeita `system.multiple = true` dos itens.
- Itens múltiplos continuam disponíveis com **Selecionar novamente** e podem ser escolhidos quantas vezes a criação permitir.
- Itens não múltiplos continuam limitados a uma única seleção; itens concedidos por Ocupação/Origem só podem ser escolhidos novamente quando forem marcados como múltiplos.
- O botão **×** remove somente uma ocorrência de um Traço/Tag repetido.
- A revisão agrupa repetições com contador (ex.: `Linguist ×2`).
- Ao criar o Actor, repetições válidas são preservadas como Items separados; a deduplicação continua ativa para Traços/Tags comuns.
- Mantida compatibilidade com **Foundry VTT v14**.

## 0.1.92

- **Chat — Attack Edge Mode:** o aviso foi movido para o **final do card informativo**, depois da caixa de Ação/Duração/Custo/Gatilho/Alcance.
- `edge` agora exibe **Esse Ataque tem 1 EDGE (Vantagem)**.
- `trouble` agora exibe **Esse Ataque tem 1 TROUBLE (Desvantagem)**.
- O aviso é centralizado, em negrito, com fonte maior e moldura vermelha.
- `normal` e valores vazios continuam sem indicação adicional.
- Alteração estritamente visual; nenhuma mecânica de EDGE/TROUBLE foi modificada.

## 0.1.91

- **Chat — Attack Edge Mode:** Powers/Weapons configurados com `attackEdgeMode = edge` passam a exibir **ATTACK EDGE MODE: EDGE** no card informativo do chat.
- Powers/Weapons configurados com `attackEdgeMode = trouble` exibem **ATTACK EDGE MODE: TROUBLE**.
- `normal` e valores vazios permanecem sem indicação adicional.
- Alteração estritamente visual/informativa; a mecânica existente de EDGE/TROUBLE, incluindo efeitos elementais e rerrolagens, não foi alterada.

## 0.1.90

- **Fix (Charactermancer — popup de Efeito):** o conteúdo de `system.effect` agora é renderizado como HTML formatado, em vez de exibir literalmente marcações como `<p>`, `<strong>`, listas e outros elementos do editor.
- O popup tenta usar o enriquecimento de rich text do próprio Foundry VTT e mantém fallback para o HTML armazenado do Power.
- Ajustados espaçamentos de parágrafos, listas, citações e links dentro do popup.
- Nenhuma mecânica de seleção de Powers, rolagem, combate ou automação foi alterada.

## 0.1.89

- **Charactermancer — informação de Powers:** adicionado um botão circular **i** ao lado do nome de cada Power nas listas de Poderes Básicos e Power Sets.
- Ao clicar no botão, o Charactermancer abre um popup compacto com o conteúdo do campo **Efeito (`system.effect`)** daquele Power.
- O popup pode ser fechado pelo botão **×**, clicando fora dele ou pressionando **Esc**.
- O texto do Efeito é exibido de forma segura, sem alterar os dados do Power, pré-requisitos, seleção de Powers ou qualquer mecânica de rolagem/combate.
- Mantidas integralmente as automações e regras aprovadas até a v0.1.88.
## 0.1.88

- **Novo (Combat Trickery):** ao usar o Power, o sistema gasta o Focus normalmente e prepara o próximo ataque válido do personagem. Se todos os alvos marcados tiverem **Rank igual ou superior** ao atacante, o dado Marvel é automaticamente transformado em **MARVEL (1)**.
- **Trouble:** no ataque afetado por Combat Trickery, o dado Marvel fica protegido contra **Trouble**; o botão de Trouble desse dado é bloqueado, sem alterar a aplicação de Trouble aos outros dados.
- **Uma vez por batalha:** quando há um Combat ativo, o sistema impede um segundo uso de Combat Trickery pelo mesmo personagem naquela batalha. Fora do Combat Tracker, a automação continua disponível para testes/uso manual.
- **Múltiplos alvos:** o benefício só é consumido quando todos os alvos marcados atendem ao requisito de Rank. Ataques sem alvo marcado ou com alvo de Rank inferior não consomem o efeito preparado.
- **Compatibilidade:** preservadas as mecânicas existentes de EDGE/TROUBLE, Fantastic, Ultimate Fantastic Initiative, Focus, dano, alvos, defesas alternativas, Elemental Control e Concentração.

## 0.1.87

- **Fix (defesas alternativas — alvo real do ataque):** **Brawling, Evasion, Wisdom e Integrity** agora verificam a defesa indicada em `system.attackTarget`, e não a habilidade usada para realizar a rolagem. Assim, por exemplo, **Telekinetic Grab (Logic vs Melee)** contra um alvo com **Evasion** usa **Agility Defense**.
- **Abrangência:** a mesma correção vale para qualquer combinação em que a habilidade da rolagem seja diferente da defesa-alvo, preservando as demais mecânicas de ataque, EDGE/TROUBLE, Fantastic, Focus, dano e alvos.

## 0.1.86

- **Fix (Ataques — habilidade x defesa-alvo):** a avaliação **ACERTOU/ERROU** agora separa corretamente a habilidade usada na rolagem (`system.ability`) da defesa indicada pelo Power/Weapon (`system.attackTarget`). Assim, ataques como **Logic vs Agility** comparam o total contra a defesa de **Agility**, e não contra Logic.
- **Compatibilidade:** novos cards persistem `attackTarget` nos flags da rolagem; cards anteriores tentam recuperar o valor diretamente do item original. Valores abreviados/por extenso e diferenças de maiúsculas/minúsculas são normalizados.
- **Defesas alternativas preservadas:** **Brawling, Evasion, Wisdom e Integrity** continuam podendo substituir a defesa, com base na habilidade do ataque, sem alterar as demais mecânicas de rolagem, EDGE/TROUBLE, Fantastic, Focus, dano ou alvos.

## 0.1.85
- Elemental Control: poderes com `system.element` vazio agora herdam `system.defaultElement` da ficha do personagem.
- Edge/Trouble: corrigido o reroll do Marvel Die para armazenar apenas um resultado ativo e tratar `M` corretamente.
- Edge/Trouble: removida a repetição de `(MULTIVERSE_D616.edge)` / `(MULTIVERSE_D616.trouble)` no flavor e no card de dano.
- Elemental Fantastic: aplicação de condições agora usa primeiro `Actor.toggleStatusEffect`, compatível com o HUD de condições e atores sintéticos.
- Elemental Fantastic: o card de dano recupera metadados do card de ataque original após rerolls de Edge/Trouble.

# v0.1.84 — Elemental Control Fantastic Automation

- Elemental Control powers now persist their selected element on attack roll cards.
- Fantastic results display the element's special effect directly in chat.
- When the GM applies Fantastic damage, matching elemental conditions are automatically applied to saved targets.
- Automated status effects: Plants/Grabbed, Air/Prone, Electricity/Stunned, Energy/Blinded, Fire/Ablaze, Ice/Paralyzed, Iron/Pinned, Sound/Deafened, Water/Surprised, Toxin/Poisoned, Chemical/Corroding and Swarm/Frightened.
- Earth now halves all movement modes for 1 round.
- Force now imposes Trouble on actions for 1 round, including sheet and ability-hotbar rolls.
- Hellfire remains an explicit chat reminder because its Health/Focus split depends on damage handling and is not silently inferred.
- Temporary one-round elemental effects use Foundry VTT v14 ActiveEffect durations and are cleaned up when expired.
- Based on the stable v0.1.83 compendium packaging fix; no rollback of embedded Active Effects.

# v0.1.83

- Corrige a compilação dos Active Effects dos compêndios no LevelDB do Foundry VTT v14.
- Active Effects agora são gravados como documentos embutidos (`!items.effects!<item>.<effect>`), seguindo a hierarquia do compilador oficial do Foundry.
- Atualizados Powers, Traits, Tags, Origins, Occupations e Items a partir dos JSONs fornecidos.
- Base do sistema restaurada à v0.1.78 antes da atualização dos compêndios, removendo alterações experimentais das v0.1.80-v0.1.82.

# v0.1.78

- Corrigido o fluxo de **troca de Concentração para jogadores** em mesas com Mestre conectado.
- A substituição de um Power concentrado solicitada por um jogador agora é executada pelo **Mestre ativo primário** via socket nativo do sistema, evitando operações de Active Effect com permissões/autoridade diferentes entre clientes.
- O hook `deleteActiveEffect` da Concentração agora processa a sincronização somente no cliente que iniciou a exclusão (`userId`), impedindo que Mestre e jogador tentem alterar os mesmos Active Effects ao mesmo tempo.
- Eliminada a condição de corrida que gerava erros como **ActiveEffect does not exist** e **undefined id does not exist in EmbeddedCollection** durante a troca de Powers em Concentração.
- O comportamento aprovado da v0.1.77 foi mantido: SIM/NÃO, escolha manual do Power a substituir, indicação do Power mais antigo, suporte a AutoAnimations e limite **Concentração = Rank**.
- Mantida compatibilidade mínima e verificada com **Foundry VTT v14**.

# v0.1.77

- Ajustado o limite de **Concentração** quando o personagem já está usando o número máximo de Powers permitido pelo Rank.
- O prompt **SIM/NÃO** ao exceder o limite foi preservado.
- Ao responder **SIM**, uma segunda mensagem privada é enviada para **Mestres e proprietários do personagem** com a lista de Powers atualmente concentrados.
- O usuário escolhe exatamente qual Power será substituído; o Power mais antigo aparece primeiro e marcado como **(mais antiga)**.
- A condição/Active Effect do Power escolhido é removida e o novo Power assume a vaga sem ultrapassar **Concentração = Rank**.
- As respostas dos prompts de Concentração agora são sincronizadas pelo socket nativo, permitindo que Mestre ou jogador proprietário façam a escolha pelo chat.
- Compatibilidade preservada com efeitos de **AutoAnimations** vinculados aos Active Effects transitórios de Concentração.
- Mantida compatibilidade mínima e verificada com **Foundry VTT v14**.

# v0.1.76

- Atualizados os **compêndios nativos** para acompanhar o conteúdo de Secret Wars já integrado ao Charactermancer.
- Compêndio **Powers**: adicionados **Control Emotion**, **Control Group Emotion**, **Sense Emotion**, **Sway Emotion**, **Iconic Item** e **Power Cosmic**.
- Compêndio **Traits**: adicionados **From Range**, **Hard to Kill** e **The Hunger**.
- Compêndio **Tags**: adicionados **Ageless**, **Allspeak**, **Media Awareness**, **Signature Item** e **Worthy**.
- Compêndio **Origins**: adicionados **Monstrous: Marvel Zombie** e **Weird Science: Power Cosmic**, mantendo a limitação de Rank 5 da origem Power Cosmic.
- Nenhuma regra da v0.1.75 foi alterada; esta versão sincroniza os compêndios com o conteúdo já validado no Charactermancer.
- Mantida compatibilidade mínima e verificada com **Foundry VTT v14**.

# v0.1.75

- Atualizadas regras selecionadas da **Secret Wars Expansion (2026)**.
- **Resize / Flight:** mudanças de tamanho não recalculam mais a Flight Speed; o voo usa a Run Speed regular como base, conforme a nova clarificação.
- **Fantastic Initiative:** um resultado Fantastic na iniciativa cria uma **Rodada Bônus** antes da Rodada 1; personagens com **Danger Sense** também participam, exceto quando Surprised.
- **Ultimate Fantastic Initiative (6M6):** durante a Rodada Bônus, o personagem pode escolher um único Action Check para transformar o Marvel Die em **M**.
- O Quadro de Controle de Turno e o Combat Tracker nativo respeitam a ordem exclusiva dos participantes da Rodada Bônus.
- **Shield Bearer:** Hurled Shield Bash, Hurled Shield Block, Hurled Shield Deflection e Rico-Shield aplicam a nova condição **Escudo Arremessado (Shield Thrown)**; o escudo retorna automaticamente no início do próximo turno do personagem.
- Enquanto o escudo está arremessado, outros Powers de Shield Bearer ficam bloqueados e os Active Effects de Health Damage Reduction concedidos pelos Powers Shield são temporariamente desativados e restaurados no retorno.
- **Mythic Origins:** Mythic, Mythic: Asgardian e Mythic: Olympian agora concedem automaticamente a tag **Allspeak** no Charactermancer.
- **Elemental Control:** adicionado o elemento **Plants**, cujo efeito em Fantastic success é **Target is grabbed**.
- Charactermancer atualizado com conteúdo de Secret Wars: Origins **Monstrous: Marvel Zombie** e **Weird Science: Power Cosmic**; Traits **From Range**, **Hard to Kill** e **The Hunger**; Tags **Ageless**, **Allspeak**, **Media Awareness**, **Signature Item** e **Worthy**; Powers **Control Emotion**, **Control Group Emotion**, **Sense Emotion**, **Sway Emotion**, **Iconic Item** e **Power Cosmic**.
- **Self-Sacrifice não foi automatizado nesta versão.**
- Mantida compatibilidade mínima e verificada com **Foundry VTT v14**.

# v0.1.74

- Integrado o **AutoAnimations** aos Active Effects transitórios de Powers em **Concentração/Concentration**.
- Ao usar um Power concentrado com configuração própria em **A-A / AutoAnimations**, o sistema copia `flags.autoanimations` do Power para o Active Effect criado automaticamente.
- Animações persistentes configuradas diretamente no Power, como escudos **On Token**, podem iniciar junto com a condição específica do Power e acompanhar o token.
- Ao remover a condição específica ou encerrar a Concentração, o Active Effect continua sendo removido pelo fluxo nativo do sistema, permitindo ao AutoAnimations encerrar a animação persistente vinculada ao efeito.
- Reutilizar o mesmo Power atualiza também a configuração AutoAnimations copiada; se a customização for removida do Power, a configuração antiga é limpa do Active Effect na próxima atualização.
- Nenhuma dependência obrigatória foi adicionada: sem AutoAnimations/JB2A, o comportamento normal de Concentração do D616 permanece inalterado.
- Mantida compatibilidade mínima e verificada com **Foundry VTT v14**.

# v0.1.73

- Removido o fluxo manual **Extempore Effects** do menu de contexto do chat.
- Ao usar um Power cuja duração seja **Concentração/Concentration**, o sistema cria automaticamente um Active Effect transitório próprio no ator do token.
- A condição automática usa o nome e o ícone do Power; ao passar o mouse no painel lateral, o tooltip mostra exatamente o campo **Descrição** do Power.
- Condições de Powers concentrados não são gravadas em `customConditions`, não entram em `CONFIG.statusEffects` e não aparecem como atalhos reutilizáveis no Token HUD.
- Reutilizar o mesmo Power atualiza a condição existente sem criar duplicata nem consumir outro nível de Concentração.
- Remover uma condição de Power reduz em um o nível genérico **Concentração N** quando ela ocupa um nível.
- Remover a condição genérica **Concentração N** encerra a concentração e apaga todas as condições transitórias dos Powers correspondentes.
- Mantido integralmente o HUD de Ações nativo aprovado na v0.1.72, sem dependência de Token Action HUD Core.

# v0.1.72

- **D616 Extempore Effects** foi incorporado ao sistema base: cada efeito existe somente como documento `ActiveEffect` no ator do token enquanto estiver aplicado.
- Efeitos Extempore não são gravados em `customConditions`, não entram em `CONFIG.statusEffects` e nunca aparecem como atalhos na paleta do Token HUD.
- Registros legados `d616ee.*` são removidos automaticamente do cadastro customizado pelo Mestre, sem apagar Active Effects já aplicados.
- O painel lateral de condições reconhece o Active Effect transitório diretamente no token e mostra seu nome e descrição sem criar um cadastro reutilizável.
- Remover um efeito Extempore pelo painel exclui diretamente o documento do ator/token.
- **Token Action HUD Multiverse-D616** também foi incorporado ao sistema base, com as abas **ABILITIES** e **POWERS** disponíveis ao selecionar um token.
- O HUD nativo preserva a ordem fixa dos seis atributos, classifica Powers alfabeticamente, oculta Powers permanentes, mostra nomes completos e mantém os tooltips do sistema.
- Powers usados pelo HUD nativo chamam diretamente `Item.roll()`, preservando Focus, Concentração, alvos, dano e Controle de Turno.
- Removida a dependência de **Token Action HUD Core** e, consequentemente, a dependência indireta de socketlib para esse HUD.
- O HUD pode ser movido, minimizado e desativado individualmente nas configurações do cliente.
- Após atualizar, os módulos externos **D616 Extempore Effects**, **Token Action HUD Multiverse-D616** e **Token Action HUD Core** podem e devem ser desativados para evitar comandos ou interfaces duplicadas.

# v0.1.71

- Restaurada a integração com o módulo **D616 Extempore Effects**: suas entradas `d616ee.*` permanecem disponíveis internamente em `CONFIG.statusEffects`, permitindo novamente a criação de Active Effects pelo menu de contexto do chat.
- Os registros internos do Extempore continuam ocultos da paleta do Token HUD, que exibe somente as 29 condições nativas e as condições customizadas pelo usuário.
- O botão **Limpar custom** agora remove apenas as condições gerenciadas pelo usuário e preserva silenciosamente os registros internos necessários ao Extempore.
- O gerenciador informa quantos registros internos do Extempore foram preservados, sem misturá-los ao JSON editável.
- Active Effects criados pelo Extempore continuam aparecendo no painel de condições do personagem e podem ser removidos normalmente.

# v0.1.70

- Atualizada a lista nativa de 29 condições com os nomes em português primeiro e os ajustes fornecidos para **Imobilizado**, **Atordoado** e **Arrasado**.
- Corrigida a paleta de condições do Token HUD para conter somente as condições do arquivo nativo e as condições realmente salvas no cadastro customizado do sistema.
- Condições antigas de módulos externos, inclusive entradas `d616ee.*`, não permanecem mais no Token HUD após a lista customizada ser limpa.
- O Token HUD aberto é atualizado imediatamente após salvar as condições customizadas, sem apagar Active Effects já aplicados aos personagens.
- O carregamento do arquivo de condições agora usa a versão do sistema para evitar que o navegador reaproveite uma cópia antiga em cache após a atualização.

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
