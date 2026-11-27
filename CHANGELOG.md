## v0.2.237 — 2026-11-27 — Publicação estável (base v0.2.236 validada)
- Consolidação da versão v0.2.236, aprovada em teste prático no Foundry VTT v14, incluindo Copy Power e Dampen Power com redução de 1 no multiplicador do ataque afetado.
- Inclui as evoluções acumuladas desde a publicação v0.2.178: automações de ataques e reações, proteções e Reinforcement, áreas ambientais, poderes de grupo, suporte e Power Control. Consulte as entradas anteriores para detalhes e limitações.
- Manifesto atualizado para v0.2.237 e URL de download do asset `multiverse-d616-v0.2.237.zip` na release `v0.2.237` do repositório oficial. A publicação é manual; o link só funcionará após o envio do asset.
- Sem mudanças de lógica, migração nova ou alteração dos compêndios e README em relação à v0.2.236. Testes de metadados de publicação atualizados.

## v0.2.236 — 2026-11-27 — Dampen Power: multiplicador por ataque (experimental)
- **Dampen Power:** reduz em 1 o DM de ataques diretos do poder enfraquecido, inclusive Smash, mesmo quando a descrição não menciona multiplicador. Aplica a penalidade ao snapshot do ataque antes da RD, preservando bônus fixos e ataques com outros poderes. Efeitos passivos transferíveis e Venom Sword continuam com seu tratamento específico, sem dupla redução. DM mínimo zero. O card de dano utiliza o multiplicador já reduzido; não altera a ficha nem cards antigos.
- **Validação:** testes Node; teste prático no Foundry v14 pendente. README e compêndios preservados.

## v0.2.235 — 2026-11-27 — Power Control (experimental)
- **Copy Power:** escolha um poder de outro personagem a até 10 espaços antes de pagar 5 Focus; confirmação pelo Mestre cria um Item temporário com os dados e efeitos do poder. Use-o normalmente com seus custos. A remoção da Concentração limpa a cópia e sua Concentração dependente. Não duplica poderes já possuídos.
- **Dampen Power:** escolha um poder a até 20 espaços; teste de Ego contra Ego sem dano, com Edge/Trouble, seguido de resolução pelo Mestre. No sucesso paga o custo do poder escolhido; custo variável é declarado e confirmado pelo Mestre. O efeito fica vinculado à Concentração; não altera o Item original. Falha encerra a tentativa. O M conserva seu valor numérico, sem benefício Fantástico no fluxo normal de rolagem. Alcance explícito, áreas ambientais, alcance de grupos e duração de manutenção finita são reduzidos; modificadores de DM explícitos e efeitos passivos transferíveis são tratados. Efeitos especiais, áreas já existentes, duração fracionária e controladores não integrados exigem arbitragem do Mestre. Não é cobertura universal de todos os poderes.
- **Validação:** testes Node; Foundry v14 Mestre/Jogador pendente. README e compêndios preservados. Não publicar no GitHub.

## v0.2.234 — 2026-11-23 — Lote 12: 20 poderes revisados, alcance Reach e automações compartilhadas (experimental)
- **Never Surrender:** alcance atualizado para `Reach` no compêndio oficial e na fonte do Charactermancer. A seleção e a autorização do Mestre usam o Reach preparado do personagem (`system.reach`), incluindo tamanho/Extended Reach, sem alterar o alcance de toque de Let's Go. Única alteração intencional no compêndio Powers.
- **Body Sphere:** dois modos selecionados antes de gastar recursos: proteger até Rank aliados co-localizados, conferindo RD de Health 3, sem movimento próprio, carregados junto com o usuário; ou envolver um atacante com Agility vs Agility, aplicando Agarrado no acerto e Imobilizado no Fantástico pela rotina geral de condições. Concentração e efeitos são removidos por fonte; proteção coletiva autorizada pelo Mestre.
- **Probability Manipulation Hex:** um aliado selecionado dentro de 5 espaços por Rank recebe um efeito ligado à Concentração. Nas rolagens com Trouble **líquido**, remove Trouble e substitui por Edge; não altera rolagens depois de lançadas, não concede Edge quando não há Trouble, e deixa de beneficiar alvos fora do alcance ou após expirar a Concentração. Outros alvos continuam sob arbitragem do Mestre.
- **Bounce Back:** remove Caído ao usar a Reação e publica a anulação de dano da queda atual no chat; salto opcional e card de queda continuam sob confirmação do Mestre. Não recalcula dano antigo nem cancela automaticamente ataques não relacionados.
- **Auditoria 20 poderes:** seis pendências do Lote 11 revisadas; três receberam novas integrações; Reverse-Momentum Throw, Blink Defense e Molecular Destabilization continuam pendentes de controle específico de ataque/recibo. Outros catorze mecanismos relacionados foram auditados; resultados detalhados em `audit/native-lot12-v234.md`.
- **Qualidade:** efeitos protegidos por flags do sistema, validação por cena/Item, mestre ativo no controle de alvos, operações serializadas de sincronização e prevenção de duplicidade. Compêndios restantes, README e sistemas prévios preservados. Regressão e testes no Foundry v14 recomendados.

## v0.2.233 — 2026-11-23 — Lote 11 acelerado: suporte e diagnóstico de 20 poderes (experimental)
- **Let's Go (Healing):** alvos Health=0 próximos ficam conscientes e podem usar apenas Movimento durante a Concentração; Ações Padrão/Reações ficam bloqueadas. Health positivo ou fim da Concentração restabelece o comportamento normal de Incapacitado.
- **Never Surrender (Healing):** alvos Focus=0 próximos deixam de sofrer o estado Desmoralizado enquanto durar a Concentração, sem ganhar Focus nem ignorar o custo normal de outros poderes. Recuperação de Focus encerra o efeito.
- **Mental Shelter (Telepathy):** Mestre valida os alvos dentro de 5 espaços por Rank; o sistema concede RD de Focus igual ao melhor Uncanny 1–4 do lançador, com efeito por alvo e sem acumular com RD mais alta; a remoção da Concentração apaga apenas os efeitos criados por ela.
- **Hex Bolt (Magic):** o Acerto Fantástico com dano confirmado pelo Mestre impõe uma Desvantagem (Trouble) durante uma rodada; o efeito é vinculado ao card de ataque e desaparece com a expiração normal, sem duplicar ou substituir condições manuais.
- **Auditoria de 20 poderes:** inventário técnico e prioridades em `audit/native-lot11-v233.md`, separando mecanismos atendidos, melhorias implementadas e lacunas que precisam de testes funcionais. Não representar 20 poderes como integralmente automatizados sem evidência.
- **Segurança:** seleção de alvo anterior ao gasto, autorização pelo Mestre ativo, fontes vinculadas à Concentração, restauração de estados quando uma recuperação encerra o efeito e limpeza serializada; nenhuma alteração de compêndios ou README.
- **Teste em Foundry v14:** validar Mestre/Jogador, Health/Focus zero, recarga e expiração de Concentração, RD de Focus, Hex Bolt fantástico, cancelamento e sincronização de tokens.

## v0.2.232 — 2026-11-23 — Lote 10: Vapors of Valtorr (experimental)
- **Vapors of Valtorr (Magic):** cria uma névoa mágica por 10 Focus, Ação Padrão e Concentração, com raio máximo de 25 espaços por Rank, centrada no lançador. O efeito bloqueia visão além de **5 espaços** nas trajetórias cruzadas pela névoa; Control Fog e Mists of Munnopor permanecem com **10 espaços**. A seleção do raio acontece antes do gasto; o Mestre valida a geometria e cria a Região.
- **Ataque da névoa:** a criação não causa um ataque. Em turnos posteriores, o usuário recebe um card com **Atacar com névoa**, escolhe um alvo dentro da Região e lança uma rolagem nova de Ego contra Vigilância (dados e Edge/Trouble normais), uma vez por turno, com Ação Padrão contabilizada pelo rastreador quando habilitado e **sem cobrar novamente os 10 Focus**. O dano é normal ou dobrado no Fantástico; a condição Cego dura 1 turno e é aplicada somente após confirmação do dano pelo Mestre, preservando o motor de MMDR.
- **Permissões e integridade:** o card verifica a posse do personagem, turno atual, Concentração e Região originais; cards antigos não permitem ataques após remoção da área. O lembrete é publicado pelo Mestre somente a cada novo turno elegível. README e compêndios preservados byte a byte. Não publicar no GitHub.
- **Teste no Foundry v14:** Mestre/Jogador, visão a 5 espaços, ataque no turno seguinte, Edge/Trouble, bloqueio por proteção, Cego no Fantástico, limpeza ao encerrar Concentração.

## v0.2.231 — 2026-11-23 — Lote 9: Mists of Munnopor e correção de liberação do grupo (experimental)
- **Group Flight e Group Levitation:** corrige o erro `ActiveEffect ... does not exist!` ao liberar um participante. A sincronização dos efeitos do grupo agora é serializada mesmo quando disparada ao mesmo tempo pelo botão, pelos hooks e por atualizações do combate. Antes de excluir, confere novamente se o efeito ainda existe e ignora apenas remoções já concluídas; falhas reais continuam visíveis para diagnóstico. A liberação não consome novos recursos nem afeta outros efeitos do alvo.
- **Mists of Munnopor (Magic):** reaproveita a Região, a nuvem visual e o bloqueio real de linha de visão acima de 10 espaços do Control Fog, com raio máximo próprio de 100 espaços por Rank, centrado no personagem e vinculado à Concentração. A escolha da área ocorre antes do custo e é aprovada pelo Mestre conectado.
- **Restrições de deslocamento:** dentro da névoa mística, o sistema sinaliza e impede selecionar voo, planagem e movimentação com teias (Swingline) no calculador e no rastreador de Movimento; ao sair, os modos originais voltam a funcionar. O Mestre deve arbitrar casos de queda, deslocamento já iniciado e outras representações narrativas de voo.
- **Auditoria:** Dazzle, Deafen e Silence Self já possuem rotinas de condições, testes ou furtividade; nenhuma macro duplicada foi adicionada para esses poderes.
- **Preservação:** README e compêndios originais mantidos sem alterações; automações anteriores preservadas. Testar no Foundry v14 com Mestre e Jogador antes de promover a versão a estável. Nada publicado no GitHub.

## v0.2.230 — 2026-11-23 — Lote 8: Extend Invisibility, Illumination e controles coletivos por turno (experimental)
- **Group Flight / Group Levitation:** a cada início de turno do personagem que mantém Concentração, o Mestre publica no chat um novo card com os botões **Mover participante** e **Liberar participante**. É um lembrete operacional sobre a mesma ativação, sem cobrança de Focus/Ação/Reação, sem reiniciar Concentração nem duplicar efeitos. Cada turno gera no máximo um lembrete por poder ativo, inclusive após recarregar o chat. O card verifica o grupo atual; participantes já liberados não reaparecem na lista.
- **Permissões Mestre/Jogador:** o Mestre assina a mensagem de lembrete e o proprietário do personagem continua podendo solicitar movimentação e liberação através do fluxo autorizado do Lote 7. Cartões antigos ficam inativos quando a Concentração termina. Cada ação segue validada pelo Mestre ativo, pelos limites de alcance e Movimento e pela identidade do efeito.
- **Extend Invisibility (Illusion):** reaproveita o mecanismo de Invisível já validado no Group Invisibility, com seleção de **um** personagem ou objeto representado por token dentro de **10 espaços**, pré-requisito Invisibility e limite de tamanho por Rank. Escolha anterior ao custo, aprovação do Mestre e limpeza individual ao encerrar Concentração.
- **Illumination (Illusion):** seleciona um ponto a até **50 espaços** antes do custo, com conferência de linha de visão pelo mecanismo do Foundry quando disponível e pelo Mestre. Cria uma fonte **real de luz brilhante** vinculada à Concentração e a uma Region, reaproveitando a criação/limpeza do Darkness. O raio de luz ajustado no arraste é **visual**, pois a descrição do poder não fixa um raio mecânico. O efeito pode continuar mesmo após o personagem afastar-se do ponto iluminado.
- **Preservações:** README e 21 arquivos dos compêndios mantidos sem alterações. Lotes anteriores sem mudança de regras. Regressão automatizada e validação visual com Mestre/Jogador recomendadas antes de considerar estável. Nenhuma publicação no GitHub.

## v0.2.229 — 2026-11-23 — Lote 7: Group Flight, Group Levitation e Group Invisibility (experimental)
- **Seleção antes do custo:** alvos escolhidos por diálogo antes da cobrança normal de Focus, Ação Padrão e Concentração; cancelar não gasta recursos. O Mestre valida e autoriza as escolhas pelo protocolo de socket.
- **Group Flight:** até Ego aliados (sem incluir o conjurador), velocidade de voo do grupo (inclusive do usuário enquanto transporta participantes) igual à metade da velocidade normal, restaurada ao encerrar o efeito ou liberar todos; raio de até 5 espaços × Rank. Requer Flight 1. Alvos recebem efeito temporário de voo e controle de movimentação pelo usuário enquanto durar Concentração.
- **Group Levitation:** até Rank pessoas com tokens, velocidade de Corrida do usuário e alcance máximo de 5 espaços × Rank. Alvo involuntário só é autorizado pelo Mestre quando já estiver agarrado telecineticamente; nenhuma condição de agarrar é inventada automaticamente.
- **Group Invisibility:** até Defesa de Ego alvos (incluindo usuário); respeita limite de tamanho do compêndio; condição Invisível separada por alvo e por Concentração, removida sem tocar outras fontes de invisibilidade. Objetos precisam estar representados como tokens com actor no mapa.
- **Comandos de grupo:** card de chat da ativação oferece Mover participante ou Liberar participante; deslocamento e altitude autorizados pelo Mestre no turno do usuário, com limite cumulativo 3D por participante/turno; movimento pelo planejador do Foundry v14, respeitando paredes, sem gastar Movimento do aliado e sem alterar propriedade dos tokens. Estado do grupo e limpeza vinculados à Concentração.
- **Preservações:** 21 arquivos de compêndios e README mantidos byte a byte. Darkness, Silence Area, Control Fog, dano, Focus, HUD e demais poderes sem alterações. Testar com Mestre e Jogador antes de promover v0.2.229 a estável. Não publicar no GitHub.

## v0.2.228 — 2026-11-23 — Control Fog: bloqueio visual real a partir de 10 espaços (experimental)
- **Correção da regra de Control Fog:** o limite de 10 espaços considera a distância entre observador e alvo quando a linha de visão atravessa névoa; não a espessura da parte do trajeto dentro dela. Isso corrige o caso de 15,4 espaços com uma região pequena de névoa (v227 não bloqueava).
- **Mapa e tokens no cliente Jogador:** além do bloqueio de tokens pela API de visibilidade, aplica-se uma cortina visual a partir do limite dos raios que atravessam a névoa; assim, em mapas iluminados, o cenário além de 10 espaços também fica encoberto. A cortina considera apenas o jogador com um único token ativo de visão; com vários tokens próprios, mantém-se a visão agregada, evitando ocultar o que outro token vê. A visão onisciente do Mestre permanece preservada.
- **Sincronização:** movimentação, saída/entrada, criação/remoção de áreas e mudança de cena reconstruem a visualização local sem modificar visão original, paredes, luz global ou dados de tokens.
- **Não regressão:** Darkness e Silence Area mantidos sem mudanças mecânicas; HUD, Concentração, regras de dano, README e compêndios preservados. Testes automatizados locais; ainda exige validação com Mestre e Jogador no Foundry v14. Nenhuma atualização no GitHub.

## v0.2.227 — 23/11/2026 — Correções do Lote 6: Silence Area e Control Fog (experimental)
- **Silence Area:** estado Surdo sincronizado por Região ao entrar, sair e retornar, incluindo movimentação rápida; usa o indicador visível do HUD de condições (`showIcon` e identificador oficial do status), sem apagar efeitos Surdo aplicados por outros poderes. Atualizações de Região e mudanças de geometria acionam a conciliação; os efeitos são processados de forma serial por cena.
- **Control Fog:** corrige a limitação anterior, que dependia de `sight.range` (visão sem iluminação, insuficiente sob luz do dia). O sistema passa a calcular os trechos de névoa atravessados por cada linha entre observador e alvo, inclusive com Regiões diferentes e sobrepostas. No cliente do jogador, o teste de visibilidade de tokens considera o limite de 10 espaços de névoa sem alterar a visão normal fora dela. Uma camada de névoa semitransparente torna a área perceptível em mapas iluminados, preservando elementos originais da cena e a visão do Mestre.
- **Migração e limpeza:** restaura uma única vez os limites de visão temporários deixados pela v0.2.226 usando `unsetFlag` suportado no Foundry v14, eliminando os avisos de exclusão obsoleta registrados no console. Não modifica iluminação global, paredes ou oclusão permanente do cenário.
- **Preservações e limites:** Darkness, os 21 arquivos de compêndios, README e demais automações permanecem preservados. A névoa agora afeta a visibilidade dos tokens e os avisos de linha de visão; como não substituímos o rasterizador nativo de iluminação, a oclusão volumétrica perfeita da imagem do mapa continua dependente do Foundry e requer verificação visual em Mestre/Jogador.
- **Teste prático:** Silence Area com entrar/sair/reentrar e ícone Surdo visível; Control Fog sob iluminação global, entre dois tokens com linha atravessando menos/mais de 10 quadrados de névoa; finalizar Concentração e verificar retorno do mapa.

## v0.2.226 — Lote 6: Darkness, Silence Area e Control Fog (Foundry v14, experimental)
- **Darkness (Illusion):** seleção circular por clique e arraste, largura máxima 5 espaços por rank, centro até 50 espaços do conjurador. Região visual e fonte de **escuridão negativa real** do Foundry v14, vinculadas à Concentração e à distância. A exceção para luz produzida por poderes depende de decisão do Mestre.
- **Silence Area (Illusion):** mesma geometria/alcance de Darkness; opção de ancorar a área a um token marcado. Aplica **Surdo** apenas enquanto um token permanece na área e remove somente os efeitos criados pelo próprio sistema ao sair ou cessar a Concentração. Não tenta silenciar Discord/voz externa ou áudio dos clientes.
- **Control Fog (Weather Control):** criar névoa circular centrada no personagem (até 50 espaços por rank) ou dispersar névoa registrada pelo sistema. Em névoa, alcance de visão configurado do token é limitado a 10 espaços, restaurando-se o valor anterior ao sair. Quando habilitado, o Combate Inteligente sinaliza disparos através de mais de 10 espaços de névoa; restrições volumétricas universais de visão exigem testes/decisão do Mestre.
- **Segurança e limpeza:** alterações em Regions, AmbientLight, Actor e Token são autorizadas pelo Mestre; cancelamentos antes do pagamento; validação de Rank, geometria e origem no Mestre; limpeza de áreas ao encerrar Concentração, se afastar mais de 50 espaços ou excluir manualmente a Região. Preservados todos os compêndios e README. Testar presencialmente Mestre/Jogador antes de promover a versão.

## v0.2.225 — Reinforcement após confirmação do dano (Foundry v14)
- **Novo fluxo de Reação:** primeiro o Mestre resolve normalmente o ataque contra a proteção e aplica o excedente no Health do alvo (com a opção mundial de dano excedente desmarcada). Depois o proprietário usa **Elemental Reinforcement** ou **Telekinetic Reinforcement** no HUD/ficha, referenciando o card já confirmado.
- **Conversão retroativa e auditável:** o Mestre valida a solicitação enviada pelo jogador, restaura o Health efetivamente perdido no card anterior, desconta o dano excedente correspondente do Focus do usuário e consome uma Reação disponível. O card original ganha um registro visível da conversão, sem repetir rolagem nem dano.
- **Proteção preservada:** o escudo destruído fica inativo enquanto o Reinforcement estiver pendente (não pode absorver novos ataques), evitando excluir sua Concentração e suas Regiões/Paredes. Ao pagar o Reinforcement, ele volta a ficar ativo. Ao passar o turno sem conversão, é removido normalmente.
- **Segurança:** uma conversão por alvo/card, validação da posse do personagem, da Reação extra, do Focus e do turno original; não estorna Health se o valor do alvo tiver mudado após o dano. A Reação de ativação da proteção e a de Reinforcement são gastos separados.
- **Compatibilidade:** a caixa **Sem dano Excedente em Proteções** continua marcada por padrão. O caminho anterior de Reinforcement direto no seletor do Mestre permanece disponível para campanhas que preferirem esse método.

## v0.2.224 — 22/11/2026 — Configuração de dano excedente em proteções (experimental)

- **Configuração de mundo:** adicionada a caixa **Sem dano Excedente em Proteções**, marcada por padrão. Configurações de mundo anteriores continuam com o mesmo comportamento (absorção total do ataque por proteções, mesmo quando destruídas).
- **Com a caixa desmarcada:** proteções pessoais (Elemental Protection 1–4, Telekinetic Protection 1–4, Shield of the Seraphim) e estruturas/barreiras/esferas elementais e telecinéticas absorvem até seus limites. O restante atinge o personagem protegido, após sua RD efetiva (inclusive efeitos temporários e Adamantium). Se a proteção não é rompida, dano ao alvo segue zero; ao romper, a Concentração ainda é encerrada.
- **Reinforcements:** a opção de redirecionar o excedente para Focus permanece no card do Mestre. Se for escolhida e puder ser paga, a proteção é preservada e o alvo não recebe dano de Health, mesmo com a nova configuração desmarcada. Sem Reinforcement, o excesso atinge o alvo conforme a opção.
- **Fluxo preservado:** aplica a escolha de mundo apenas na confirmação de dano autorizada pelo Mestre; suporta DANO, 1/2 DANO, efeitos contínuos e os cards legados, sem descontar o dano duas vezes. Mantém Energy Absorption, RD e proteção de escudo reativo. README e compêndios preservados. Testes automatizados não substituem a validação no Foundry VTT v14.

## v0.2.223 — 22/11/2026 — Automações prioritárias, Lote 5 (experimental)

- **Elemental Infusion** (Elemental Control): o usuário escolhe uma arma de mão equipada antes de gastar Ação Padrão e 5 Focus. A escolha é registrada na Concentração já existente e só a arma escolhida herda o efeito Fantástico de seu elemento. Reutiliza a automação elemental para aplicar a condição no acerto Fantástico confirmado pelo Mestre, mesmo se RD reduzir o dano final a zero (desde que não tenha sido bloqueado pela proteção). A Concentração encerrada ou a arma desequipada interrompem a infusão. Demais armas permanecem inalteradas.
- **Elemental Reinforcement / Telekinetic Reinforcement**: quando uma proteção pessoal ou barreira correspondente receber dano bruto de Health acima de seu limiar, o card do Mestre oferece Reforçar. O excesso acima do limiar é descontado do Focus do defensor mediante consumo de uma Reação disponível; a proteção e sua Concentração são preservadas, sem dano de Health. O Mestre confirma o efeito na transação de dano já existente; nenhum custo é cobrado duas vezes por clicar no poder. Proteções que não seriam destruídas, dano em Focus e bypass não são elegíveis; barreiras usam o Focus/Reação de seu próprio criador.
- Reutilizados o motor de dano MMDR, proteção pessoal e Concentração, a tabela oficial de efeitos Fantásticos elementais e o rastreador existente de Reações. Incluídos testes de seleção, vínculo de arma, autorização, Focus e estorno de Reação. Compêndios e README preservados.
- **Validar no Foundry v14 com Mestre/Jogador:** o custo variável de Reinforcement é calculado pelo dano que excede o limiar de absorção do escudo; verificar essa interpretação no jogo antes de considerar a versão estável.

## v0.2.222 — 22/11/2026 — Automações prioritárias, Lote 4 (experimental)

- **Leech Life** (Magic): ataque Ego vs Resilience com dano de Health reconhecido no motor de dados. Após resolução de dano pelo Mestre, recupera metade do dano realmente sofrido pelo alvo; em Sucesso Fantástico recupera o total, limitado ao Health máximo do atacante. Redução de Dano e proteções que zeram o dano não concedem cura. A confirmação é idempotente e vinculada ao card de dano.
- **Quick Phase** (Phasing): quando ativado por Reação e mantido por Concentração, participa do mesmo estado de fase do Phase Self. Compartilha colisão com paredes, contato físico apenas entre personagens em fase e limpeza automática ao cessar a Concentração. Mantém custo de 5 Focus e consumo de Reação originais.
- **Dispel Spell** (Magic): teste de Ego contra Defesa de Ego, sem causar dano. Exige selecionar um personagem mantendo um poder mágico em Concentração antes de gastar recursos. O Mestre resolve a rolagem no card (incluindo Edge/Trouble). No sucesso comum escolhe uma Concentração mágica; no Fantástico encerra toda a Concentração do alvo, pela API já existente. Evita efeitos duplicados.
- Adicionados testes de reconhecimento, comportamento, permissões e regressão; preservados os compêndios e o README.

## v0.2.221 — Phase Self e desenho livre do Webtrapping (experimental)

- **Phase Self:** personagens com Concentração ativa podem atravessar paredes com o arraste comum do token; Foundry v14 usa `ignoreWalls` tanto na prévia quanto na confirmação do movimento, exclusivamente para o token pertencente ao usuário. Mantido o comando do chat, agora usando a estrutura correta de `waypoints` em `Scene.moveTokens`. Paredes e outros tokens não são modificados; o consumo de movimento continua no fluxo normal.
- **Webtrapping:** substituída a seleção por múltiplos cliques por clique e arraste com prévia gráfica dos quadrados, interpolação de movimento rápido, retorno para corrigir o traçado e limite de cinco espaços ortogonalmente contíguos. Soltar confirma; Esc/botão direito cancela, sem pagar custo.
- Correções isoladas nas automações do Lote 3, preservando os demais poderes e compêndios.

## v0.2.220 — Lote prioritário 3: Advance, Webtrapping e Phase Self (experimental)
- **Advance:** seleção de 1 até Defesa Ego aliados, gatilho confirmado pelo Mestre, concessão de movimento gratuito de uso único para combatentes aliados, aproximando-se do inimigo, sem consumir movimento normal.
- **Webtrapping:** desenho de 1 a 5 espaços de grade contíguos; criação de Region Foundry v14 autorizada pelo Mestre; terreno difícil de caminhada 2×; teste de Agility TN16 ao entrar/iniciar turno; aplicação de Paralisado mediante confirmação do Mestre, fuga Melee TN16 no HUD; expiração por tempo de mundo (Rank × 15 min) e limpeza das condições vinculadas.
- **Phase Self:** estado obtido da Concentração; bloqueio de contato físico Health entre personagens de fases diferentes; botão no chat para mover o token através de Walls sem alterar as Walls globais (deslocamento normal continua contabilizado); remoção do efeito automaticamente ao encerrar a Concentração.
- Integração ao núcleo sem modificar os seis compêndios ou o README. Testes automatizados de regressão adicionados. Validar Mestre/Jogador no Foundry v14 antes de considerar estável.

## v0.2.219 — 2026-11-21 — Automações prioritárias, lote 2 (experimental)
- **Exploit (Melee Weapons):** gatilho armado APENAS depois de dano de Health real (>0), com Sucesso Fantástico de ataque com uma arma, confirmado pelo Mestre. Ataque de Reação exige o mesmo alvo do acerto original, no mesmo turno/rodada, e consome o gatilho uma única vez depois de publicar o card. O novo ataque Melee × Resilience ignora RD de Health SOMENTE nessa rolagem e dobra o dano no Fantástico pela regra normal. O efeito especial específico da arma é exibido ao Mestre para aplicação narrativa/manual; não há efeito genérico inventado para todas as armas.
- **Catch Bullets (Super-Speed):** vincula a Reação de Agility a um card ORIGINAL de ataque à distância ainda não resolvido, com um alvo, exigindo avaliação de projétil físico e alcance pelo Mestre. A rolagem usa o resultado original como TN; em sucesso, o Mestre tem botão de confirmação para ANULAR só aquele ataque/alvo, inclusive quando já existe card DANO pendente, que passa a aplicar 0. No Fantástico recupera a Reação, sem reembolso de Focus. A assinatura dos dados previne usar uma aprovação após reroll do atacante ou defensor. Nenhum ataque é anulado pela conta do jogador antes da autorização do Mestre.
- **Quick Toss (Super-Strength):** corrige o catálogo não danoso sem alterar os itens/compêndios. Selecione exatamente duas pessoas e identifique quem está Agarrado; arremessado recebe dano normal independentemente de acerto, alvo do impacto só recebe dano em acerto; sucesso Fantástico derruba apenas o alvo atingido. Mantém a rolagem, proteção/RD e confirmação do Mestre. Alcance, tamanho, capacidade de levantar e posição final ainda requerem arbitragem.
- **Protection Hex (Magic):** rolagem de Ego salva na Concentração do poder. O total substitui as seis defesas enquanto o efeito durar; no Fantástico, concede RD de Health 1 sem somar a RD superior preexistente. Reaplicar/ajustar rolagem refaz a defesa; terminar a Concentração restaura os valores originais automaticamente, sem editar atributos da ficha.
- **Instant Replay (Omniversal Travel):** 10 Focus e Reação para substituir a ÚLTIMA rolagem do próprio personagem ainda não resolvida, mediante confirmação de falha com o Mestre; reutiliza fórmula e opções originais e modifica o próprio card (sem criar dano/resultado paralelo), registrando total antigo/novo e bloqueando novo uso no mesmo combate. Original com dano preparado/resolvido não pode ser substituído; o novo resultado prevalece mesmo que seja pior. A avaliação narrativa da falha continua com o Mestre.
- **Integridade:** reutiliza os motores de rolagem, Edge/Trouble, Concentração, dano GM e rastreador de Reações; README e compêndios preservados byte a byte. Testes locais Node e auditoria de pacote; requer validação real com Mestre/Jogador no Foundry VTT v14 antes de se tornar a nova versão estável. Nada foi publicado no GitHub.

## v0.2.218 — 2026-11-21 — Automações prioritárias, lote 1 (experimental)
- **Brain Drain (Magic):** recupera Focus somente depois de o Mestre confirmar DANO de Focus; metade do dano efetivamente sofrido (arredondamento para cima) ou 100% no Sucesso Fantástico; respeita Focus máximo, proteção/dano zero e idempotência por recibo. Reutiliza ataque Ego × Vigilance e recursos já existentes; a condição narrativa de alvo agarrado ainda deve ser conferida pelo Mestre.
- **Kill Zone (Ranged Weapons):** confirma o gatilho de inimigo que começa a se mover antes de gastar recursos; exige um alvo em combate e impede atacar o mesmo alvo duas vezes na mesma rodada, por personagem. O ataque continua usando as rolagens, defesa, Edge/Trouble e dano normais (dobro no Fantástico); após publicar o card, devolve a Reação gasta inclusive quando o ataque erra. O gatilho de movimento continua sob supervisão do Mestre.
- **Venom Sword (Spider-Powers):** ativar o poder cria ou reequipa uma arma Bioelétrica Melee própria, que aparece na ficha/HUD, usa o fluxo de ataques de arma normal e concede DM +2 SOMENTE nos ataques feitos com ela, sem acumular com outros bônus DM equivalentes. Mantém Concentração e manutenção de 5 Focus por turno. Ataque Fantástico aplica Atordoado por um turno somente com perda real de Health, após confirmação do Mestre. Quando a Concentração termina, a arma é desequipada e não pode atacar; o item permanece desativado para permitir a resolução de dano pendente de card anterior.
- **Integridade:** README, seis compêndios, HUD e demais poderes sem alterações. Testes locais Node não substituem testes na mesa Mestre/Jogador; **v0.2.217 permanece a base estável validada**. Nenhuma publicação no GitHub.

## v0.2.217 — 2026-11-21 — Elemental Ricochet: Sucesso Fantástico independe de dano final (experimental)
- **Regra corrigida:** depois de um **Sucesso Fantástico contra a defesa do alvo**, o próximo ricochete é liberado assim que o Mestre resolve o ataque, **mesmo se o dano final for 0**. Telekinetic Protection, barreiras/escudos, Redução de Dano e Energy Absorption não encerram a cadeia por absorverem o dano. A correção também atende Rico-Shield, que compartilha o mesmo mecanismo.
- **Segurança mantida:** confirmação do Mestre no card correspondente ao alvo, assinatura da rolagem atual (incluindo Edge/Trouble), acerto Fantástico efetivo e prevenção de reuso. Falhas, sucessos comuns, resultados de cura, card antigo/não resolvido ou sem alvo válido não liberam ataques extras. Nova seleção de ALVO e nova rolagem em cada ricochete, com limite de alcance, sem nova Ação ou Focus.
- **Regressão:** casos de absorção total, mitigação até zero, resolução sem resultado e segurança de assinatura de rolagem. Sem modificações na aplicação de dano, nos compêndios ou no README. Requer validação real no Foundry VTT v14 com Mestre e Jogador. Não publicar no GitHub.

## v0.2.216 — 2026-11-21 — Elemental Ricochet: nova seleção de alvo e card de rolagem completo (experimental)
- **Cada ricochete** (Elemental Ricochet e Rico-Shield) abre a **mesma janela de seleção de alvos** de um ataque de poder comum, independentemente do modo manual/confirmar do cliente. O jogador pode aproveitar um alvo já marcado ou selecionar outro no mapa; um alvo já visitado é recusado pela validação da cadeia. Cancelar não gasta Focus/Ação e não consome o ricochete.
- **Card do ataque adicional:** removido o `content` HTML personalizado que ocultava o dado. O ataque extra passa a ser publicado pelo `MarvelMultiverseRoll.toMessage()` com o corpo padrão de rolagem, exibindo os dados e controles **EDGE/TROUBLE** originais, permitindo rerrolagens manuais pelo Mestre antes da confirmação do dano. Informações de sequência, alvo e distância continuam no flavor e flags do próprio ataque.
- Sem novo custo de Focus ou Ação Padrão; sem alterar confirmação de dano positivo pelo Mestre, assinatura do dado, alvo distinto, alcance acumulado, linha de visão, expiração da cadeia, HUD ou compêndios. Requer validação manual no Foundry VTT v14 com Mestre/Jogador antes de marcar como estável. ZIP completo, sem publicação no GitHub.

## v0.2.215 — 2026-11-21 — Lote Elemental: catálogo real e confirmação segura do ricochete (experimental)
- **Elemental Ricochet:** o mecanismo de ricochetes já existia desde a v0.2.64; foi auditado, catalogado como **nativo parcial** e reforçado. Agora a liberação do próximo ataque exige card técnico da rolagem original, assinatura atual do dado, o mesmo alvo e **dano positivo realmente aplicado** pelo Mestre. Fantástico com absorção total, cura, falha, card adulterado/antigo ou reenvio não libera ricochete. Cada novo ataque mantém o próprio resultado e o botão DANO do Mestre, sem novo Focus/Ação, sujeito a alcance acumulado e visão do novo alvo. O controle não executa movimento ou dano por conta própria.
- **Seis poderes elementais catalogados por mecanismos EXISTENTES, sem criar automações falsas ou duplicadas:** Elemental Barrage (dano metade/inteiro); Elemental Burst (ataque/efeito elemental); Elemental Grab (agarrar e escapar); Elemental Prison (prisão e Concentração); Elemental Push (teste, movimento e condições do mecanismo original); Elemental Suffocation (ataque somente contra alvo elegível agarrado). Esses seis são **referências existentes**, não seis automações novas.
- **Identidade:** Rico-Shield requer Shield Bearer e Elemental Ricochet requer Elemental Control. Itens locais importados continuam aceitos pelo Power Set e nome oficial. Um resultado de rolagem adicional sem card válido é cancelado, permitindo nova tentativa legítima.
- **Cobertura:** 162 macros únicas / 398 poderes; 14 nativas ativas, 49 parciais, 97 referências existentes, 2 dependentes de configuração e 236 ainda não catalogados. Não corresponde a 162 poderes integralmente automatizados.
- **Não regressão:** README, seis compêndios oficiais, HUD, veículos, protocolo atômico PLAYER/Mestre e controles manuais Edge/Trouble preservados. Testes Node de regressão e integridade de arquivos; validar manualmente no Foundry VTT v14 antes de marcar como estável. Nenhuma alteração no GitHub.

## v0.2.214 — 2026-11-21 — Ataques adicionais e movimento gratuito pós-acerto (experimental)
- **Stopping Power (Ranged Weapons):** após um Sucesso Fantástico que causa dano efetivo e é confirmado pelo Mestre, o card publica um botão para um segundo disparo contra o MESMO alvo. Ao clicar, rola novos dados Marvel, registra os modificadores de Edge/Trouble e cria um ataque com seu próprio card de dano e confirmação pelo Mestre. Sem nova Ação Padrão nem segundo gasto de Focus. O segundo tiro não gera uma terceira repetição. A origem e a assinatura do dado são verificadas, com proteção contra uso repetido, troca de alvo e mudança de rodada. Não dispara ataque automaticamente; o jogador decide se usa o segundo tiro.
- **Hit n Run (Melee Weapons):** o Item oficial já contém Edge, que **não foi duplicado**. Após acerto com dano confirmado pelo Mestre, o personagem ganha um crédito de deslocamento gratuito igual a **metade da Run Speed**. O rastreador do GM desconta primeiro esse crédito dos próximos deslocamentos do token e somente o excedente do Movimento normal, sem gastar Ação Padrão indevida. Crédito limitado ao mesmo turno; não empilha com outro da mesma espécie. O token continua sendo movido pelo jogador, sem teleporte automático. Confirmação no chat.
- **Auditoria:** lote de 27 poderes de Melee Weapons, Ranged Weapons, Martial Arts, Super-Speed, Tactics, Healing e Elemental Control; somente Stopping Power e Hit n Run ganharam nova funcionalidade nesta versão. Demais 25 permanecem sem automação nova. Macros_D616 153 → 155. Não equivalem a 155 automações integrais.
- **Preservação:** protocolo atômico Mestre/Jogador, Counterstrike Technique, Hurled Shield Block, rerolls manuais e demais regras preservados. README e seis compêndios oficiais intocados. Nenhuma alteração GitHub. Testes automatizados não substituem validação no Foundry v14 com ambos clientes.

## v0.2.213 — 2026-11-21 — Reações pós-gatilho e cobertura auditada
- **Shrinking Dodge (Resize):** 5 Focus + uma Reação, card com regra oficial e orientação para 1 TROUBLE manual no ataque ORIGINAL. Não prepara condição nem rola automaticamente.
- **Riposte (Melee Weapons):** gasta uma Reação apenas após ataque corpo a corpo inimigo errar; card oficial orienta contra-ataque Melee e dano/efeito especial de arma MANUAIS, sem descontar uma Standard extra. Não atribui dano automático.
- **Point-Blank Parry (Ranged Weapons):** 5 Focus + uma Reação, apenas depois de inimigo até 2 espaços errar; card oficial orienta ataque à distância de resposta e Sangrando Fantástico MANUAIS, sem Standard extra. Distância/erro são conferidos pelo Mestre.
- **27 poderes auditados:** 3 novas automações PARCIAIS; os outros 24 continuam não registrados. Macros_D616 150→153. Cards oficiais, validação de Focus/Reação, cancelamento e estornos; nenhuma regra de dano/Counterstrike modificada.
- **Integridade:** seis compêndios oficiais e README preservados sem alterações; protocolo atômico Mestre/Jogador v196 e correções v210/v212 intactos. Não publicar no GitHub. Testes automatizados não substituem validação prática no Foundry v14.

## v0.2.212 — 2026-11-21 — Corrigida a identidade do Counterstrike Technique em fichas/token

- **Correção em Mestre/Jogador:** o GM rejeitava o Counterstrike Technique válido com «O Item solicitado não é Counterstrike Technique oficial.» porque a validação comparava o ID do Item embutido na ficha (Actor/Token UUID, normalmente diferente) com o ID do registro de origem no compêndio. A falha ocorria antes de gerar o card, mesmo com Attack Stance, dano confirmado e recursos disponíveis.
- **Identidade consistente com o Macros_D616:** o GM agora identifica o poder via registro interno fixo por nome + Power Set + handler registrado, aceitando IDs locais de Item diferentes em fichas e tokens sintéticos. Identificadores explícitos de outro poder no compêndio continuam sendo recusados, assim como protocolos com Power ID incorreto.
- **Protocolo v196/v210 preservado:** o PLAYER continua enviando somente IDs de cena, token, Item e card original por pacote JSON atômico no Actor mundial; o GM verifica propriedade OWNER, resolve o Item real no Actor do token e calcula todo o dano. Se o ID local divergir entre os clientes, aceita apenas um único Item oficial inequivocamente correspondente no Actor do GM.
- **Escopo estrito:** nenhuma mudança no dano, RD, Combat Tracker, reservas de Reação, custo de Focus, Attack Stance, rerolls ou fluxo de botão DANO. Um novo card de Counterstrike permanece sem efeito em Health até a confirmação manual única do Mestre. Falhas antes da publicação estornam Focus e Reação.
- **Testes de regressão:** novos casos com `Actor.<id>.Item.<id local>` e UUID de Item de token sintético, pedido PLAYER→GM com IDs de Item divergentes, e rejeição de origem de compêndio incorreta. README e os seis compêndios originais preservados byte a byte; biblioteca Macros_D616 mantém 150 registros. Não publicar no GitHub. Ainda requer validação real em Foundry VTT v14.

## v0.2.211 — 2026-11-20 — Counterstrike Technique com dano calculado pelo Mestre

- Counterstrike Technique (Martial Arts): após ataque Melee confirmado que efetivamente causou dano enquanto Attack Stance está ativo, a Reação passa por transação autenticada pelo Mestre (5 Focus e uma Reação, ambos consumidos uma única vez).
- O sistema vincula o poder ao card ORIGINAL confirmado, recupera a fórmula original do card técnico reservado ao Mestre e identifica automaticamente o token atacante. Sucesso Fantástico do ataque original não dobra o contra-ataque.
- Fórmula conforme a FAQ da Marvel: dano NORMAL do atacante contra a RD própria do atacante; a RD reduz o multiplicador primeiro e o resultado é dividido por dois, arredondado para cima. Proteções do defensor não são confundidas com as do atacante.
- O Mestre recebe um card padrão de dano (MMDR) direcionado ao atacante original, com o botão DANO; nenhum Health/Focus do atacante é reduzido antes da confirmação do Mestre. Os controles 1/2 DANO e CURA são ocultados e recusados nesse card especial.
- Funciona com PLAYER e Mestre conectados usando solicitação JSON atômica via Actor mundial com checagem GM de OWNER, Actor do token, poder oficial, cena, ataque e recibo de dano. O jogador utiliza somente o resultado público do ataque; não precisa acessar o card técnico do Mestre.
- Prevenção de uso duplicado no mesmo gatilho e estorno de Reação/Focus quando o card não puder ser criado. Counterstrike catalogado como automação parcial: gatilho narrativo e aplicação do dano final pelo Mestre.
- Adicionada 1 macro catalogada ao Macros_D616 (149→150); 398 poderes e seis compêndios oficiais não alterados; README preservado.

## v0.2.210 — 2026-11-20 — Confirmação de Reações PLAYER/Mestre (hotfix)

- **Diagnóstico v208/v209:** o Mestre autorizava e registrava o gasto de Reação no Combatant, mas enviava o `turnTrackerResult.userId` com o ID do jogador. O receptor exigia que `userId` correspondesse ao remetente autenticado do socket (o Mestre) e descartava a resposta. O PLAYER exibia timeout e, após novo clique, «Reação extra já usada» apesar de o primeiro gasto ter ocorrido. Não era problema de dano ou da divisão das Reações extras.
- **Correção:** o Mestre responde com `userId` igual ao seu ID autenticado e `recipientUserId` igual ao usuário que solicitou o gasto. O jogador valida **remetente GM autenticado, destinatário correto, `requestId` pendente e `success` booleano** antes de considerar o gasto confirmado. Usa a mesma serialização de gastos; nenhum socket de jogador ganha permissão GM.
- **Falha do processamento:** as respostas negativas também preservam a separação remetente/destinatário, permitindo devolver a recusa real sem gastar Focus. O processamento não é repetido no recebimento da resposta; o ack apenas informa o resultado da transação efetuada pelo Mestre.
- **Counterstrike Technique — esclarecimento oficial:** o gatilho exige Attack Stance ativo e **dano real** de um ataque corpo a corpo, após RD. A Reação de 5 Focus é declarada depois da resolução do dano original. O contra-ataque causa metade do dano **normal do atacante**, aplicando RD do atacante primeiro e arredondando para cima (Marvel RPG FAQ, 27/03/2025, p. 4). **Não foi criada automação de dano refletido** nesta correção: a aplicação permanece manual. Uma única Reação é permitida por gatilho.
- **Escopo:** sem modificações em dano, HUD, Hurled Shield Block, automações nativas, protocolos `nativeSupportPlayerRequestV2`/`nativeSupportPlayerResultV2`, compêndios ou README. Testes de ACK autorizado e recusado, remetente fraudulento, destinatário errado e múltiplos jogadores incluídos; regressão completa.
- **Status:** experimental até validação prática em Foundry VTT v14 com Mestre e Jogador. Não publicar no GitHub.

## v0.2.209 — 2026-11-20 — Correção do consumo de Reações extras (experimental)
- **Diagnóstico com Mestre/Jogador:** o console do jogador na v0.2.208 registrou recusas de Reação sem consumo de Focus, enquanto o chat de dano continuou funcional. O rastreador anterior gastava a Reação comum antes das extras; isso podia bloquear posteriormente uma Reação de Shield Bearer ou Basic mesmo após um uso elegível de Always Ready / Fast Hands.
- **Alocação por Power Set:** uma Reação usada para ativar Martial Arts gasta primeiro a reserva de Always Ready, se disponível; uma de Ranged Weapons usa primeiro Fast Hands. A Reação comum é preservada para outros Power Sets. Cada reserva permanece restrita e limitada a um uso.
- **Histórico de consumo ordenado:** o Combatant mantém `reactionSpendOrder`, permitindo que estornos restaurarem corretamente o último recurso gasto, mesmo quando a Reação extra é usada antes da comum. Flags da v0.2.208 são convertidas em memória sem apagar gastos atuais; as reservas são renovadas ao iniciar o turno.
- **Compatibilidade:** controles e automações que gastam uma Reação comum sem Item continuam permitidos, mas jamais utilizam uma reserva exclusiva. Gastos genéricos manuais não burlam os bônus restritos. Requisições do jogador continuam autorizadas pelo Mestre e passam pela fila serializada.
- **Diagnóstico no cliente:** mensagens de recusa agora diferenciam Reação comum esgotada, bônus restrito já usado, Item ausente e falhas de sincronização, sem gastar Focus.
- **Escopo preservado:** protocolo atômico v0.2.196, dano/RD de Hurled Shield Block, cards de chat, rolagens e Edge/Trouble manuais. README e seis compêndios oficiais intocados; Macros_D616 permanece com 149 entradas. Requer teste prático Mestre + Jogador.

## v0.2.208 — 2026-11-20 — Reações adicionais restritas (experimental)
- **Base:** v0.2.207 aprovada com Hurled Shield Block protegendo e removendo RD após dano.
- **Always Ready (Martial Arts):** concede mais uma Reação por rodada exclusivamente para ativar um poder de Artes Marciais com Ação Reação. **Fast Hands (Ranged Weapons):** concede mais uma Reação exclusivamente para poder de Armas à Distância com Ação Reação. Os dois benefícios coexistem e cada um tem um uso específico por rodada.
- **Controle autoritativo:** o GM confere o Item realmente possuído no Actor de combate e sua classificação de Reação, sem aceitar o Power Set informado pelo jogador; a Reação comum é gasta primeiro e o extra não aceita consumo por ícone genérico. Flag do Combatant registra as categorias usadas e zera no início do novo turno. Gastos por jogadores de Reação esperam confirmação do Mestre; na rolagem tradicional de Reações de personagens com esses passivos, a reserva é confirmada antes de descontar Focus. Abortos e estornos não duplicam slots.
- **Escopo:** nenhuma alteração na RD do Hurled Shield Block, Focus, dano, cards, rerolls manuais ou protocolo atômico de suporte. Macros_D616 147 → 149; README e seis compêndios oficiais preservados. Requer validação em Mestre + Jogador.

## v0.2.207 — 2026-11-20 — Hurled Shield Block: RD temporária no aliado (experimental)
- **Base:** v0.2.206 validada em jogo; alteração pontual solicitada para Hurled Shield Block (Shield Bearer). Demais poderes e regras de combate preservados.
- **Seleção do aliado:** o jogador ou Mestre seleciona exatamente um aliado em até 5×Rank espaços. Ao acionar Hurled Shield Block **depois do ataque e antes do dano**, confirma o alvo; cancelar não gasta recurso. Alcance, aliado e identidade oficial do poder são revalidados pelo Mestre.
- **Autoridade atômica:** o fluxo usa `nativeSupportPlayerRequestV2` e `nativeSupportPlayerResultV2` da v0.2.196 com autenticação OWNER no Actor e token de origem. Somente a transação do Mestre consome **5 Focus e 1 Reação** e grava o ActiveEffect no token aliado. Não há execução de macro privilegiada nem escrita arbitrária pelo jogador.
- **RD de Health por um ataque:** captura o nível Shield 1–4 do lançador (prioriza o Shield ativo) e cria um marcador temporário visível no aliado. Não altera a RD permanente nem soma com a RD própria: na confirmação de dano de Health é usada a **maior RD**. Mesmo cards rolados antes da declaração são recalculados no momento de aplicar DANO ou 1/2 DANO, incluindo fatores Fantásticos e exceções de dano; perfuração por Adamantium continua aplicável. A proteção não reduz Focus nem dano contínuo.
- **Remoção:** depois de resolver esse ataque contra o token (inclusive dano zero), o Mestre remove automaticamente o efeito; caso não haja confirmação, o marcador expira ao começar o próximo turno do lançador ou ao terminar o combate. O chat informa o aliado, o nível Shield, a redução aplicada e a expiração. A regra narrativa de escudo ausente até seu retorno ainda fica sob controle do Mestre.
- **Segurança e regressão:** impede duplicar a proteção pendente, exige combate/Reação/Focus disponíveis, valida a cena e a identidade do token, tenta estornar Focus/Reação se o registro ou card falhar. Testes adicionais cobrem ataque pré-rolado, maior RD, rerolls manuais, Fantástico, 1/2 DANO, Adamantium, gastos e expiração.
- **Biblioteca e integridade:** mantidas **147 macros**; atualizado somente o registro/metadado de Hurled Shield Block no sétimo compêndio. Seis compêndios oficiais, README.md e protocolo v196 permanecem preservados; sem publicação no GitHub.

## v0.2.206 — 2026-11-20 — Reações após gatilho e escudos (experimental)
- **Base:** v0.2.205 validada pelo usuário. Auditados 29 poderes: os 12 Shield Bearer ainda não registrados, os 9 Martial Arts, os 3 Melee Weapons, os 4 Ranged Weapons e Immovable de Super-Strength. Sete novas automações **parciais** e quatro referências a proteções já existentes; 18 permanecem sem registro neste lote.
- **Reações nativas pós-gatilho:** Shield Deflection, Hurled Shield Deflection, Hurled Shield Block e Immovable (Shield Bearer + Super-Strength) publicam o card oficial após o ataque/empurrão, consomem 1 Reação disponível pelo tracker e não criam rolagens adicionais ou marcadores preparados. O atacante/Mestre decide TROUBLE, RD pontual ou redução do recuo **manualmente** conforme o gatilho e a regra de cada poder.
- **Brace for Impact (Martial Arts e Shield Bearer):** seleção de Focus **mínimo 5**, limitada ao recurso atual e ao limite de 5×Rank. Após confirmação, consome uma Reação e exatamente o Focus escolhido. O card informa que o Mestre deve ignorar até 1 ponto de dano físico de Health por Focus gasto **somente naquele ataque**. Não gera RD permanente nem aplica dano em outro ator automaticamente.
- **Hurled Shield Deflection / Block:** consumem exatamente 5 Focus e 1 Reação; aplicam ao card um lembrete de TROUBLE/Redução de Dano do aliado conforme regra oficial. O Mestre confirma a elegibilidade do alvo e resolve o ataque original. Sem Focus duplicado no motor genérico.
- **Segurança e transação:** validam combate ativo, Combatant, Reação, limite de Focus e identidade oficial (Power Set + nome) antes de gastar. Cancelar a seleção não gasta recursos; falha de Focus ou de chat tenta estornar apenas Reação/Focus efetivamente gastos. Cliques simultâneos do mesmo personagem são bloqueados enquanto a transação está pendente. Não alteram outros atores; nenhuma execução de macro privilegiada.
- **Proteções existentes:** Shield 1–4 entram no Macros_D616 apenas como referências da RD de Health durante a Concentração já implementada por `shieldConcentrationChanges()`; a implementação não é duplicada.
- **Compêndios:** Macros_D616 de 136 para **147** referências, com as mesmas 27 pastas e ícones oficiais. Os seis compêndios oficiais e README.md preservados. O protocolo atômico entre Mestre/Jogador da v0.2.196, combate, HUD, Edge/Trouble manuais e os dois dodges da v0.2.205 permanecem inalterados.
- **Arquivos principais:** `scripts/native-power-reactive-guards.mjs` (novo), `scripts/native-power-spider-defenses.mjs` (apenas exportação do localizador compartilhado), `scripts/native-power-automations.mjs` (inspeção), `multiverse-d616.mjs` (roteamento inicial), gerador/registros Macros_D616, `system.json`, `CHANGELOG.md`, auditoria e testes. Sem publicação no GitHub.

## v0.2.205 — 2026-11-20 — Reações defensivas declaradas após ataque (experimental)
- **Base:** v0.2.204 aprovada em teste real do usuário. Mudança pontual solicitada: poderes que respondem com Trouble a um ataque deixam de exigir preparação antes da rolagem. Preservados motor de dano/RD, HUD, comunicação atômica Mestre/Jogador, cards oficiais e escolha manual de Edge/Trouble.
- **Slow-Motion Dodge (Basic):** ao ocorrer ataque contra a Defesa de Agility, o defensor usa o poder como Reação, pelo HUD ou ficha, após o anúncio/rolagem inicial e antes da resolução final. **Não faz rolagem própria nem prepara ActiveEffect.** Publica texto original, efeito, Gatilho, Ação e Duração no chat. Atacante ou Mestre decide manualmente o botão **TROUBLE** no card do ataque original.
- **Spider-Dodge (Spider-Powers):** mesmo fluxo, com gatilho específico para ataque de **Agility** contra o personagem. No erro após reroll, salto opcional de Jump Speed continua sob decisão do jogador/Mestre. Nenhuma alteração automática da posição do token.
- **Reação e segurança:** o sistema verifica combate ativo, lançador presente e Reação disponível; consome **uma** Reação pelo Turn Tracker antes de publicar o card. Se não for consumida, não publica; se falhar a publicação, tenta estornar. Não aplica Trouble ou reroll por script; o atacante continua dono da rolagem. Nenhum privilégio DONO adicional foi dado a macros.
- **Limpeza de versão:** antigos marcadores `nativePreparedDodge` da v0.2.204 são retirados pelo GM principal ao inicializar. O resolvedor de condições não usa mais esses marcadores. A diferença entre ataques contra Defesa de Agility e ataques de Agility foi preservada.
- **Escopo:** Blur mantém seu efeito de uma rodada e Hit the Dirt / Scatter continuam com seus efeitos próprios, sem serem transformados em regras de Trouble. Spider-Pheromones e demais poderes não foram alterados.
- **Macros_D616:** permanecem **136 entradas** e 27 pastas, com ícones oficiais; as duas entradas atualizadas apenas identificam o handler `reactive-dodge`. Todos os seis compêndios oficiais e o README permanecem idênticos à v0.2.204.
- **Arquivos:** `multiverse-d616.mjs`, `scripts/native-power-spider-defenses.mjs`, `scripts/native-power-automations.mjs`, `scripts/condition-edge.mjs`, `tools/build-native-macro-pack.py`, `scripts/native-power-registry-data.mjs`, `packs/macros-d616`, `system.json`, `CHANGELOG.md`, testes e `audit/native-reactive-dodges-v205.md`. Sem publicação no GitHub. A v0.2.205 requer validação no Foundry v14 com Mestre e Jogador.

## v0.2.204 — 2026-11-20 — Reações defensivas preparadas e aracnídeos (experimental)
- **Base:** v0.2.203 aprovada no Foundry. Preservados os 398 poderes oficiais, README, seis compêndios de origem, sistema de dano/RD, HUD, cards completos e o protocolo atômico Mestre/Jogador (v0.2.196).
- **Lote:** 27 poderes anteriormente não registrados (Basic 8, Spider-Powers 15 e Super-Speed 4). Três comportamentos novos parciais e oito referências somente a mecanismos de ataque/condição existentes. Os outros 16 permanecem manuais. Não confundir referências com automações completas.
- **Basic / Slow-Motion Dodge (parcial):** ao utilizar pelo HUD/ficha **antes da rolagem adversária**, registra uma Reação preparada (sem custo de Focus). Aplica **1 Trouble somente ao próximo ataque dirigido à defesa de Agility**. O efeito termina após o primeiro ataque elegível publicado no chat, ou no próximo turno, sem reroll automático.
- **Spider-Powers / Spider-Dodge (parcial):** igualmente exige Reação preparada antes da rolagem; **1 Trouble no próximo ataque de Agility contra o personagem**, independentemente da defesa atingida. Depois de um erro, o salto opcional usando Jump Speed depende do jogador/Mestre e não foi movimentado automaticamente.
- **Spider-Powers / Spider-Pheromones (parcial):** fonte condicional de **1 Edge no Ego social** enquanto houver Concentração existente do Item (intimidação/persuasão conforme a atração prevista pela regra). O card genérico não reconhece contexto social nem atração, portanto **o Mestre confirma a elegibilidade e o reroll é sempre manual**.
- **Proteções de segurança:** duas Reações preparadas não acumulam; sem combate ativo ou Reação disponível, a preparação é recusada antes de consumir recursos. Flags em ActiveEffects de dados apenas; somente o GM principal limpa o efeito após a rolagem efetiva, sem executar JavaScript de compêndio. O histórico do card conserva os modificadores depois da remoção do efeito.
- **Referências limitadas:** Razorwebs, Spider-Strike, Venom Bash, Venom Blast, Webcasting, Webgrabbing e Venom Burst (Spider-Powers), e Speed Blast (Super-Speed) possuem rolagens e/ou condições pré-existentes. Referência não significa alcance, tipo de dano ou todas as consequências automatizados.
- **Macros_D616:** 125 → **136 entradas** em 27 pastas com ícones extraídos do compêndio oficial. O README e os seis compêndios oficiais permanecem intactos. `scripts/native-power-spider-defenses.mjs` novo; `native-power-senses.mjs`, `native-power-automations.mjs`, `condition-edge.mjs`, `multiverse-d616.mjs`, gerador/registro, CHANGELOG, testes e auditorias atualizados.
- **Validação:** testes de duração, legitimidade do gatilho, Reação indisponível, não duplicação, consumo após card e origem condicional de Edge. Regressão automatizada não substitui a validação no Foundry v14 com Mestre e Jogador. Sem publicação no GitHub.

## v0.2.203 — 2026-11-20 — Tactics de uso único e Charmed Life (experimental)
- **Base estável:** v0.2.202 validada no Foundry. Mantidos todos os 398 poderes oficiais, os seis compêndios de origem, README, HUD, motor de dano/RD e o protocolo atômico Mestre/Jogador da v0.2.196. Versão requer validação prática com Mestre e Jogador.
- **Auditoria:** 27 poderes de Healing (3), Luck (1), Martial Arts (9), Melee Weapons (3), Ranged Weapons (4), Tactics (3) e Super-Speed (4). **Três comportamentos novos reais, todos classificados como parciais**, por dependerem da decisão do jogador ou da confirmação narrativa do Mestre; os outros 24 não foram contabilizados como novos efeitos.
- **Tactics / Change of Plans:** 5 Focus + Reação, seleciona um aliado por meio do diálogo normal. O Mestre confirma o gatilho/alcance de audição e cria **1 Edge somente no próximo teste de ação** do aliado; reroll permanece manual. Expira ao chegar o próximo turno do lançador, com limpeza de efeitos pelo Mestre.
- **Tactics / Combat Support:** 10 Focus + Ação, seleciona um aliado e usa apenas **uma vez por combate**. O próximo teste do aliado usa dado Marvel **M (1)**, protegido de Trouble no dado Marvel. O efeito é consumido após publicação do card de rolagem, ou expira no próximo turno do lançador. O Mestre confirma alcance de audição. Não executa macros como GM e não utiliza flags arbitrárias fornecidas pelo cliente.
- **Luck / Charmed Life:** poder permanente, **sem gasto de Focus ou Ação**. O jogador clica no poder pelo HUD/ficha para preparar **1 Edge em um único teste da rodada**. O efeito não se acumula com outras fontes de Edge; o reroll nunca é automático. Só registra o uso depois que uma rolagem elegível é publicada. Fora de combate o uso depende do Mestre (não há contador de rodada).
- **Implementação:** `scripts/native-power-tactical-once.mjs` e `scripts/native-power-charmed-life.mjs` novos; integração restrita em `scripts/native-power-support.mjs`, `scripts/condition-edge.mjs` e nos três caminhos existentes de rolagem em `multiverse-d616.mjs`. O card nativo de suporte continua publicando a descrição original do Item; nenhuma fórmula global de dano foi reescrita.
- **Macros_D616:** 122 → **125 entradas**, pastas por 27 Power Sets e ícones originais. `tools/build-native-macro-pack.py` e `scripts/native-power-registry-data.mjs` atualizados. Todos os outros compêndios e README mantidos byte a byte. Cobertura auditada em `audit/native-tactical-batch-v203.csv` e `audit/native-power-coverage-v203.csv`.
- **Testes:** automação de uso único, limite por combate/rodada, fontes de Edge não cumulativas, consumo pós-card, expiração por ordem de iniciativa, autorização de alvos/Focus, protocolo atômico, segurança e regressão completa. **Sem publicação no GitHub.**

## v0.2.202 — 2026-11-19 — Lote 27 poderes: percepção e furtividade (experimental)
- **Base:** v0.2.201 validada pelo usuário; mantendo intactos protocolo atômico Mestre/Jogador v0.2.196, HUD, chat com descrição oficial, cálculos de dano, RD e Edge/Trouble manuais.
- **Auditoria:** 27 poderes — Healing 7, Illusion 14 e Basic 6. Quatro melhorias reais mas **parciais** (Heightened Senses 1/2, Invisibility, Silence Self), cinco registros de mecanismos de rolagem/condição existentes (Dazzle, Deafen, Flare, Cure-All e Restore), 18 ainda não registrados.
- **Heightened Senses 1/2:** fontes condicionais de 1/2 Edge em Vigilance de percepção e Trouble em Agility de quem tenta esconder-se do observador. O nível 2 substitui o 1 e não acumula três Edge.
- **Silence Self e Invisibility:** fontes condicionais de Edge para furtividade do personagem concentrado e de Trouble para Vigilance do observador que tenta percebê-lo. Usam a Concentração real do Item; sem novo gasto, efeito ou status duplicado, removem benefício ao encerrar a Concentração.
- **Limite explícito:** o teste genérico de Agility/Vigilance não indica se é furtividade/percepção. Os modificadores são mostrados no card com aviso para o Mestre e **não causam rerolls automáticos**; só clicar nos dados quando a situação se aplicar. Cobertura permanece parcial.
- **Reaproveitamento:** Dazzle/Deafen/Flare já possuem teste de Ego versus Vigilance, condições e dano apenas no Fantástico; Cure-All e Restore têm testes Ego TN 12/20, mas não curam automaticamente. Referências não equivalem a automação completa.
- **Macros_D616:** 113 → 122; 27 pastas/ícones originais. 398 poderes originais, seis compêndios originais e README preservados.
- **Arquivos:** `scripts/native-power-senses.mjs` (novo), `scripts/condition-edge.mjs`, `scripts/native-power-automations.mjs`, `scripts/native-power-registry-data.mjs`, `tools/build-native-macro-pack.py`, `packs/macros-d616`, `system.json`, testes e relatórios `audit/native-senses-batch-v202.*`. Sem GitHub.
- **Validação:** regressão Node e testes específicos; requer validação Mestre/Jogador no Foundry v14 para estabilidade.

## v0.2.201 — 2026-11-19 — Descrição oficial nos cards de automações nativas (experimental)
- **Base:** v0.2.200 aprovada pelo usuário. Correção de apresentação apenas; nenhum cálculo de dano, Focus, Reação, Concentração, condição ou protocolo de Mestre/Jogador foi modificado.
- **Chat dos poderes de suporte e sorte:** o despachante de `native-power-support.mjs` saía antes do `Item.roll()` tradicional, portanto exibia somente o resultado da automação. Agora publica no **mesmo card** a descrição e o efeito originais do Item utilizado, além dos metadados Ação, Duração, Custo, Gatilho e Alcance quando disponíveis, seguidos do resultado da automação e gasto realizado.
- **Cobertura:** Scatter, Hit the Dirt, Healing Hands, Soothing Touch, Inspiration, Battle Plan, Rally on Me, Keep Moving, On Your Feet, Lucky You, Wish You Luck, Lucky Us, Evil Eye, Jinx You, Jinx You All, Focus Fire e Operations Center. Em Jinx You, o aviso de teste Melee errado também mantém a descrição do poder.
- **Segurança/consistência:** Item resolvido pelo Mestre após validação existente; não são aceitas descrições vindas da solicitação do jogador. Nenhuma macro ganha permissão DONO ou executa código arbitrário. Metadados variáveis escapados, texto de efeito vindo do Item como no card tradicional. O helper `scripts/native-power-chat.mjs` é apenas de apresentação; evita duplicar descrições em vários controladores.
- **Testes:** casos do catálogo real, HTML e campos ausentes, integração da transação do Mestre com Scatter (cobrança única e status Caído), e regressão completa do sistema. Os sete compêndios, os 398 poderes e `README.md` são preservados. Versão requer validação visual no Foundry v14; não publicar no GitHub.

## v0.2.200 — 2026-11-19 — Auto-rolagem do chat do Jogador + lote defensivo (experimental)
- **Base:** v0.2.199 aprovada pelo usuário. Ajustes incrementais; nenhuma modificação no motor global de dano, RD, HUD ou protocolo atômico Mestre/Jogador (v0.2.196).
- **Chat do Jogador:** ao receber a confirmação final de dano do Mestre (`combatChatResolution`), a sessão do Jogador chama a rolagem nativa do ChatLog v14. Só eventos de publicação da resolução do ataque acionam a rolagem; mensagens, rolls comuns e atualizações intermediárias não mudam a posição do chat. A sessão do Mestre mantém a rotina da v0.2.184, evitando scroll duplicado.
- **Super-Speed / Blur (parcial):** após gastar 5 Focus e Ação/Reação pelo fluxo existente, cria proteção identificada que impõe 1 Trouble em ataques direcionados ao usuário por uma rodada. Limpeza do efeito no início do próximo turno pelo Mestre; rerolls sempre manuais. Requer combate ativo para cronologia segura.
- **Tactics / Hit the Dirt (parcial):** seleção de aliados pela janela existente, confirmação de participação voluntária e aplicação de Caído pela autoridade do Mestre. A regra narrativa de invalidar o ataque inicial permanece com o Mestre. Custa 5 Focus e uma Reação, pelo protocolo atômico.
- **Tactics / Scatter (parcial):** seleção de até Rank aliados; após movimentação manual de até metade da Velocidade para longe, confirma-se a aplicação de Caído. Custa 10 Focus e Reação. Distância da voz, consentimento, movimento e invalidade do ataque são decisões do Mestre.
- **Auditoria:** 27 poderes defensivos/de reação/suporte analisados; três novos registros funcionais parciais. `Macros_D616`: 110 → 113 entradas em 27 pastas. Os outros 24 auditados não foram apresentados como automatizados sem comprovação de cobertura real.
- **Preservação:** README e seis compêndios originais intactos. Testes de regressão e integridade; versão só será considerada estável após validação Mestre/Jogador no Foundry. Não publicar no GitHub.

## v0.2.199 — 2026-11-19 — Ataques/defesas: lote de 29 poderes (experimental)
- **Base aprovada:** ZIP completo da v0.2.198, validado pelo usuário. Os ajustes são incrementais, sem reescrita do motor e sem modificações na arquitetura atômica Mestre/Jogador (v0.2.196).
- **Sniping (parcial):** Sucesso Fantástico causa **triplo do dano normal** (sem alterar o Damage Multiplier); Combate Inteligente, quando ativado, alerta se o alvo estiver a menos de **20 espaços**, permitindo decisão do Mestre. A proibição de movimento no turno continua sob controle do Mestre.
- **Snap Shooting (parcial):** dano por alvo de **metade no acerto normal e dano completo no Fantástico**; Sangrando Fantástico permanece no controlador existente. O limite e a escolha de alvos continuam no mecanismo de multialvos/Mestre.
- **Furious Attacks (parcial):** cálculo nativo do bônus de dano **+1 a cada 2 Focus gastos** no único card, sem duplicar custo; metade do dano no acerto e dano completo no Fantástico, mantendo os efeitos especiais da arma sob confirmação do Mestre.
- **Untouchable Position (parcial):** após um ataque realmente rolado contra o personagem em combate, ataques corpo a corpo posteriores recebem **1 Trouble até o início do próximo turno**. O primeiro ataque não é penalizado. GM registra um Active Effect vazio/identificado, sem executar macros, e a limpeza ocorre com o avanço do combate. Rerolls permanecem manuais. Não são inferidos ataques sem cards ou seleções de alvos não registradas.
- **Lote auditado:** 29 poderes (15 Ranged Weapons, 9 Melee Weapons, cinco Martial Arts). Macros catalogadas de **88 para 110**: quatro novas/ampliadas **parciais** e 18 referências a cálculo/condições/rolagem existentes. Os demais auditados permanecem sem registro nativo enquanto houver decisões de reação, bônus de ataque ou poderes narrativos ainda não resolvidos.
- **Preservação:** 398 poderes originais, seis compêndios originais, README, Central, HUD, dano, RD e protocolo Mestre/Jogador preservados. Nenhuma execução de macro arbitrária como GM. Todos os 110 ícones copiados do catálogo real. Testes automatizados e inspeção de integridade anexados. **Exige validação no Foundry v14 com Mestre e Jogador**. Não publicar no GitHub.

## v0.2.198 — 2026-11-19 — Jinx You: teste de toque + lote de passivos físicos (experimental)
- **Base:** v0.2.197 testada com jogador; preservada integralmente a correção atômica Mestre/Jogador v0.2.196 (`nativeSupportPlayerRequestV2` e `nativeSupportPlayerResultV2`). A v0.2.197 aplicava Jinx You imediatamente, sem o teste de Melee previsto nas regras oficiais.
- **Jinx You (Luck):** antes do efeito, publica um **teste Marvel de Melee contra Defesa de Melee** pelo fluxo de dados e card normal do sistema. O jogador escolhe manualmente os rerolls de Edge/Trouble, e o Mestre valida o **resultado final do card** antes de cobrar Focus e criar Concentração/Trouble. **Erro:** consome 5 Focus e a Ação Standard, mas não aplica Trouble nem Concentração. **Acerto:** aplica o efeito e manutenção pela implementação anterior. **Sucesso Fantástico:** somente dano Melee normal (não dobrado) no card; acerto normal de toque não causa dano. O mesmo card não pode ser usado para ativar duas vezes.
- **Novo grupo de passivos reais:** Additional Limbs (1 Edge em testes Melee/Agility); Blazing Fast Fists (1 Edge em ataque corpo a corpo, evitando duplicação de regra homônima da Central); Spider Sense (1 Trouble em ataques de Agility contra a Defesa de Vigilance do personagem; os demais componentes do poder permanecem no motor e a parte narrativa é manual). **Edge/Trouble nunca são rolados automaticamente**.
- **Macros_D616:** 74 → **88 referências**, distribuídas em 27 Power Sets; **3 entradas com comportamento novo ou ampliado** e **11 referências** a mecanismos existentes (Plasticity/Flexible Bones 1–2, Extended Reach 1–2, Stilt Steps; Spider-Powers/Jump 1–3, Wallcrawling; Basic/Combat Trickery e Wisecracker). Pastas exibem `Plasticity` com grafia correta, sem modificar o Power Set original do catálogo. Os ícones são os originais dos poderes.
- **Arquitetura:** sem reescrita do cálculo global de dano, RD, chat, HUD, suporte tático ou Central; nenhum código de macro é executado com privilégios do Mestre. O teste Melee é vinculado à identidade original do Item, lançador, alvo e cena e validado no Mestre contra a rolagem de chat autenticada. Ataques e recursos anteriores não são duplicados.
- **Validação:** testes de acerto, erro, Fantástico, replay, Edge/Trouble situacional e passivos; regressão completa em Node. Teste real em Foundry v14 com Mestre/Jogador ainda obrigatório. `README.md` e seis compêndios de poderes/itens originais preservados. Não publicar no GitHub.

## v0.2.197 — 2026-11-19 — Lote Luck/Tactics: 8 novas automações parciais (experimental)
- **Base estável:** ZIP completo v0.2.196, validado pelo usuário em dois clientes (Mestre/Jogador). **ADR-001 obrigatório**: solicitações e confirmações continuam serializadas em um único campo (`nativeSupportPlayerRequestV2`/`ResultV2`), autenticadas por `updateActor` e executadas pelo Mestre após validação DONO. Não executar macros com privilégios de GM.
- **Oito novas automações parciais reais:** Lucky You, Wish You Luck, Lucky Us, Evil Eye, Jinx You, Jinx You All (Luck); Focus Fire e Operations Center (Tactics). A seleção por HUD/ficha usa o seletor existente; o motor verifica alianças, Rank, alcance por quadrados quando definido, custo e disponibilidade de Focus, Concentração e manutenção por turno, e aplica **marcadores de Edge/Trouble nos Actors dos alvos** sem rerolls automáticos. Focus Fire só concede Edge contra o inimigo marcado; Lucky Us também beneficia o lançador.
- **Operações compartilhadas:** 1 novo `scripts/native-power-fortune.mjs` concentra validações, criação/expiração de efeitos e integração ao `focus-maintenance.mjs` e `concentration.js`. Encerrar a Concentração limpa somente os efeitos derivados. Operations Center encerra a postura ao mover o token e concede Edge aos aliados somente até o início do próximo turno do lançador; deslocamento forçado exige confirmação do Mestre.
- **Limites explícitos:** linha de visão, alcance da voz/audição e o acerto de toque de Jinx You ainda dependem de confirmação do Narrador. Os poderes com teste de Ego ou efeitos especiais (Cure-All, Restore, Resurrect etc.) continuam no inventário como manuais, sem macros falsas. Por segurança, esse lote de Concentração só ativa com **combate ativo** e a opção de automação de Concentração habilitada.
- **Macros_D616:** 66 → **74 registros** e as mesmas 27 pastas; ícones copiados do compêndio real. Nenhum dos seis compêndios oficiais foi alterado. Registradas automações parciais separadamente de referências ao motor.
- **Testes/estabilidade:** cenários de autorização de alvo, rangos, limites, foco, expiração, Concentration/Focus upkeep do motor, cálculo manual de Edge/Trouble e protocolo atômico. Preservados README, HUD, RD, veículos, manobras, macros anteriores e Central. Sem GitHub.

## v0.2.196 — 2026-11-19 — Suporte: protocolo atômico entre Jogador e Mestre (experimental)
- **Base:** v0.2.195 (experimental), mantendo os cálculos do lote v0.2.190 e a janela de alvos já existente.
- **Causa comprovada no console real:** o Mestre recebeu `scene=none`, `source=none`, `targets=invalid` apesar de o jogador estar na cena correta. Em `updateActor`, Foundry pode enviar somente as propriedades **alteradas** do objeto `flags.multiverse-d616.nativeSupportPlayerRequest`, e o receptor tratava esse diff parcial como requisição completa.
- **Correção de arquitetura:** substituídos os objetos aninhados de solicitação/resposta por strings JSON únicas, com novas chaves `nativeSupportPlayerRequestV2` e `nativeSupportPlayerResultV2`. Cada atualização é atômica; cena, token, poder, alvos e custo trafegam juntos, mesmo quando parte do conteúdo é idêntica à solicitação anterior. Nenhum socket genérico de remetente não autenticado foi introduzido.
- **Segurança:** permanece `updateActor` do Actor mundial, com `userId` autenticado pelo Foundry, validação DONO sobre canal e Actor efetivo do token, poder oficial, cena/alvos, alcance, custos e execução única pelo Mestre. Payload inválido ou parcial é ignorado; resposta também é atômica.
- **Testes:** regressão nova que simula diff aninhado do Foundry e confirma a perda do `sceneId` no modelo antigo; testes fim a fim de cinco poderes (Healing Hands, Soothing Touch, Rally on Me, Inspiration, Battle Plan), com tokens sintéticos, confirmação do Mestre, gasto único, replay e acesso negado. Atualização das expectativas dos testes legados para o novo protocolo, preservando cobertura anterior.
- **Preservação:** nenhuma mudança de fórmulas de cura/Focus/Edge, lógica de combate, HUD ou automações de outros poderes. `README.md` e sete compêndios permanecem idênticos à v0.2.195. Necessária validação com dois clientes no Foundry v14; sem publicação no GitHub.

## v0.2.195 — 2026-11-19 — Suporte: resolução de token por pertença à cena (experimental)
- **Base:** ZIP completo v0.2.194 experimental. Consoles reais da v0.2.194 mostram 5 rejeições em `resolveSupportGMContext()` com “Token de origem inválido na cena selecionada.”
- **Correção pontual:** troca a dependência rígida de `TokenDocument.parent.id` por resolução do documento pelo ID dentro da **coleção real da Scene**. A mesma validação é usada para token lançador, alvos e seleção pelo jogador. Um token fora da cena informada continua proibido.
- **Fallback restrito:** se o ID de token informado pelo jogador não existir na coleção da cena do Mestre, o sistema só aceita recuperar a origem quando o canal for o Actor-base informado, houver **um único token** desse Actor na mesma cena, e o jogador autenticado tiver permissão DONO no Actor efetivo. Múltiplos tokens do mesmo Actor são recusados por ambiguidade. Nunca procura em outra cena, executa scripts ou eleva permissões.
- **Diagnóstico claro:** mensagens diferentes para cena inexistente, canal de Actor inválido, token ausente, token ambíguo ou vínculo de Actor-base incompatível. O console do Mestre registra uma linha textual com presença da cena, token, quantidade de tokens, IDs e validações de permissão, em vez de um objeto recolhido no log exportado.
- **Preservação:** não altera fórmulas, Focus, cura, Edge, duração, HUD, RD, dados, status, Central, automações já validadas, sete compêndios nem README.
- **Validação:** novos testes que reproduzem a falha de parent/coleção, fallback sem ambiguidade e rejeições indevidas, além da regressão Node completa. Exige teste real Mestre/Jogador no Foundry v14 antes de aprovação.
- **Arquivos:** `scripts/native-power-support.mjs`, `system.json`, `CHANGELOG.md`, expectativas de versão, novos testes, relatório/checklist. Sem GitHub.

## v0.2.194 — 2026-11-19 — Macros_D616: validação de autorização por posse do personagem (experimental)
- **Base:** v0.2.193 experimental, após repetição do erro no Foundry com jogador e Mestre. O console do Mestre indica quatro rejeições na comparação estrita entre `requestActor.id` e `sourceToken.actorId` (linha 84 da v0.2.193).
- **Correção:** a atualização do Actor mundial continua servindo apenas como canal de transporte autenticado (`userId` real do hook). O Mestre determina o token pela cena e pelo ID recebido e valida, **independentemente**, que esse jogador é DONO tanto do Actor que enviou a solicitação quanto do **Actor efetivo do token de origem**. Não se exige mais igualdade entre o Actor usado para transportar a solicitação e o `actorId` do token, já que ambos precisam ter autorização de posse e o canal nunca executa poderes.
- **Segurança:** o Mestre valida na cena o token, a permissão DONO do lançador, o poder instalado no personagem e a identidade oficial (`powerId`) contra o registro; só executa operações predefinidas. Solicitações para personagens não controlados, tokens inexistentes, poderes errados e macros arbitrárias continuam rejeitadas. Nenhuma permissão adicional é concedida a jogadores.
- **Sem mudanças:** interface de seleção, gastos de Focus, cura, Edge, ações, dano, RD, HUD, dados, Macros_D616 e demais efeitos. Compêndios e README preservados.
- **Testes:** regressão Node e novos cenários de canais Actor diferentes do Actor-base do token, autenticação de remetente e tentativas de ativação não autorizada. Validação real em Foundry com Mestre/Jogador ainda obrigatória.
- **Arquivos:** `scripts/native-power-support.mjs`, `system.json`, `CHANGELOG.md`, testes de versão, novos testes de autorização e checklist. Não publicar no GitHub.

## v0.2.193 — 2026-11-19 — Macros_D616: canal estável de autorização Mestre/Jogador (experimental)
- **Base:** v0.2.192 experimental; a v0.2.189 continua como última versão estável aprovada. Corrige a rejeição de solicitações de suporte no Mestre (`resolveSupportGMContext`), comprovada pelo console da sessão v0.2.192.
- **Causa:** pedidos e respostas circulavam pelo Actor sintético de tokens não vinculados. O delta de token e o Actor-base podem não ter a mesma identidade de documento entre Mestre/Jogador, provocando rejeição no vínculo do token e impedindo a confirmação no cliente.
- **Correção:** o jogador envia somente uma atualização autenticada do Actor-base do personagem (referência estável `TokenDocument.baseActor` / `actorId`). O Mestre verifica o `userId` fornecido pelo Foundry, permissão DONO no Actor-base e no Actor efetivo do token, `actorId`, cena, token, e ID oficial do poder. O efeito e os recursos permanecem aplicados **exclusivamente ao Actor efetivo do token**. A confirmação também volta pelo Actor-base; não há solicitação de macro arbitrária, socket confiado ao cliente ou permissões elevadas para jogadores.
- **Seleção e mecânicas:** a janela e o seletor por mapa continuam os mesmos da v0.2.191. Não altera custos, alcance, recuperação Health/Focus, efeitos de Edge, expiração, concentração, rolagem de dados, chat, HUD ou RD.
- **Testes:** cenários de Actor-base e token sintético separados, IDs de Itens divergentes, confirmação de GM no mesmo canal, proibição de solicitação a outro personagem e ausência de escrita no Actor sintético para mensagens. Regressão Node completa e integridade de compêndios; a validação prática em Foundry v14 segue obrigatória.
- **Arquivos:** `scripts/native-power-support.mjs`, `system.json`, `CHANGELOG.md`, testes de versão e `tests/native-support-world-channel-v193.test.mjs`, novo checklist. `README.md` e os sete compêndios permanecem sem alteração. Não publicar no GitHub.

## v0.2.192 — 2026-11-19 — Macros_D616: autorização de poderes em tokens não vinculados (experimental)
- **Base:** v0.2.191, sem alterar as mecânicas de cura, Focus, Edge, Concentração, dano, Redução de Dano ou HUD. Corrige falhas reais identificadas nos consoles de Mestre/Jogador: “Selecione o token do personagem na cena dos alvos” e “Poder oficial indisponível neste personagem”.
- **Causa:** a solicitação autenticada do jogador era recebida pelo Mestre em um Actor-base, mas o despachante usava esse Actor também para localizar o item e executar a operação, embora o token de origem pudesse possuir um Actor sintético e coleção de Itens diferentes. Assim, a validação falhava antes de aplicar a automação.
- **Correção:** após confirmar a origem do pedido por atualização de Actor com `userId` autenticado, permissão DONO e vínculo `actorId`/cena/token, o Mestre passa a resolver o **Actor e Item efetivos do token**. A identidade oficial do poder segue verificada pelo registro interno, com ID de compêndio transmitido no pedido e conferido novamente pelo Mestre. Quando o ID do item embutido diverge entre Actor-base e token, só é permitido encontrar um único poder oficial correspondente já possuído pelo token; pedidos sem poder, ambiguidades ou personagens sem permissão continuam rejeitados.
- **Cobertura:** Healing Hands, Soothing Touch, Rally on Me, Inspiration, Battle Plan e os demais poderes do mesmo despachante compartilham a correção. A janela de seleção de alvos da v0.2.191 permanece obrigatória e o cancelamento continua sem gasto de recursos. Não houve concessão de acesso DONO às macros nem código arbitrário executado como Mestre.
- **Testes:** adicionados testes reais de ponta a ponta para cinco poderes com itens e recursos distintos entre Actor-base e token não vinculado; testes de token vinculado, falsificação do token/poder, ambiguidade de IDs, ausência de propriedade e recepção autenticada no hook do Mestre. Mantida a regressão dos 398 poderes, sete compêndios e HUD. Validação prática no Foundry v14 com Mestre e Jogador permanece necessária.
- **Integridade:** README.md, seis compêndios de origem, Macros_D616 com 66 referências e demais arquivos funcionais preservados. Alterações limitadas a `scripts/native-power-support.mjs`, `system.json`, `CHANGELOG.md`, expectativas de versão e novos testes/documentação. Não publicar no GitHub.

## v0.2.191 — 2026-11-19 — Macros_D616: seleção de alvos dos poderes de suporte (experimental)
- **Base:** v0.2.190, sem alterar os cálculos dos poderes. Correção localizada na escolha de alvos e no reconhecimento do token de origem para solicitações autenticadas do Jogador ao Mestre.
- **Healing Hands, Soothing Touch, Rally on Me, Inspiration e Battle Plan:** agora abrem obrigatoriamente a janela nativa existente **Seleção de Alvos** ao serem usados pelo HUD ou pela ficha, mesmo quando a preferência geral de alvos está configurada como manual. Oferecem utilizar os alvos já marcados ou selecionar diretamente no mapa. A opção **Sem alvo** não é oferecida para poderes que exigem alvos.
- **Cancelamento seguro:** fechar a janela, cancelar ou tentar confirmar sem nenhum alvo interrompe a ativação **antes** da escolha/gasto de Focus, do consumo de ações e do envio de solicitações ao Mestre; as marcações anteriores são preservadas. Seguem existindo as confirmações narrativas próprias dos poderes táticos.
- **Jogador/Mestre com token não vinculado:** comparação do token de origem usa a identidade do Actor e, quando os UUIDs sintéticos divergem entre clientes, o `actorId` base e a cena. O Mestre continua verificando propriedade, alvo, alcance e recursos na transação, sem autorizar execução de macros privilegiadas por jogadores.
- **Escopo preservado:** as mesmas janelas passam a ser usadas pelos outros poderes do despachante de suporte (Keep Moving e On Your Feet), sem mudar suas regras. Anger, Energy Absorption, Defense Stance, Elemental Protection, dano/RD, Edge/Trouble manual, HUD, veículos e Team Maneuvers não foram alterados.
- **Integridade:** seis compêndios originais, `Macros_D616` com 66 entradas e `README.md` idênticos à v0.2.190. Atualizados `scripts/smart-targets.mjs`, `scripts/native-power-support.mjs`, manifesto, `CHANGELOG.md` e expectativas de versão; incluídos testes específicos e `audit/native-support-target-dialog-v191.md`.
- **Validação:** regressão Node offline e checklist de validação em Foundry VTT v14 com Mestre e Jogador. A v0.2.191 permanece experimental até aprovação prática. Não publicar no GitHub.

## v0.2.190 — 2026-11-18 — Macros_D616: lote maior de suporte, cura e modificadores (experimental)
- **Base:** v0.2.189 validada pelo Mestre em Foundry VTT v14. 28 poderes auditados no compêndio original (398 poderes/27 Power Sets), registrados em `audit/native-support-batch-v190.csv`. **9 integrações funcionais novas/ampliadas: 3 completas e 6 parciais**; 4 referências a cálculos genéricos já existentes, nunca contadas como novas automações.
- **Healing Hands e Soothing Touch (completas):** selecionam um alvo por toque, respeitam Focus mínimo 10, limite 5×Rank, disponibilidade e máximos Health/Focus. Recuperação do alvo e gasto do lançador são validados e aplicados uma única vez pela autoridade do Mestre, por meio de solicitação autenticada no Actor. Sem macros executadas como GM e sem acesso DONO generalizado.
- **Keep Moving (parcial):** remove Atordoado ou Desmoralizado do aliado marcado. Reaplicação automática de Desmoralizado enquanto Focus permanece zero e avaliação de alcance/voz exigem Mestre.
- **On Your Feet (parcial):** remove Caído dos aliados marcados e capazes; incapazes não são alterados. Alcance da voz é confirmado narrativamente.
- **Rally on Me (parcial):** recuperação de Focus igual a 5×Rank por aliado selecionado, respeitando máximos e limite por Vigilance e uma utilização por combate. O deslocamento de até meia velocidade e o alcance da voz dependem de execução e confirmação do Mestre; só alvos ao alcance após o movimento recebem a cura.
- **Inspiration e Battle Plan (parciais):** adicionam uma fonte de Edge por aliado marcado por meio de efeito temporário nativo. Não fazem rerolls automáticos. A fonte expira no próximo turno do lançador e ao fim do combate; requisitos narrativos de audição/voz ainda são confirmados pelo Mestre.
- **Lucky Me (completa):** fornece Edge em testes enquanto a Concentração própria e sua manutenção atual continuarem válidas. Não cria custo ou Concentração duplicados; usa o mecanismo existente.
- **Shield Wall (parcial):** concede Trouble em ataques direcionados ao personagem enquanto a Concentração estiver ativa; movimentação do token encerra a Concentração da postura. Movimentos forçados e equivalência exata a uma ação de Movimento precisam de arbitragem do Mestre.
- **Registros existentes:** Elemental Blast, Bolts of Balthakk e Smash usam o parser atual de escalonamento de dano por Focus. Supernova tem o mesmo bônus, mas dano em área/meio dano continua parcial. Essas quatro entradas não são automações novas.
- **Segurança:** nenhuma execução arbitrária de macro; pedidos de jogadores transportados por atualização do Actor autenticada pelo Foundry, com verificação de OWNER, poder oficial, alvos, cena, recurso e custo pelo Mestre. Na ausência de Mestre para alvos de terceiros, a ativação não é autorizada. As funções de combate, RD e HUD permanecem intactas.
- **Macro library:** 66 referências em 27 pastas, com ícones oficiais; os seis compêndios de origem e `README.md` permanecem inalterados. Adicionados `scripts/native-power-support.mjs`, `scripts/native-power-guarded-passives.mjs`, novos testes e inventário de cobertura. Alterados `multiverse-d616.mjs`, `scripts/condition-edge.mjs`, `scripts/native-power-automations.mjs`, gerador, registro, Macro Pack, manifesto e `CHANGELOG.md`.
- **Validação:** testes Node offline e checklist `audit/native-support-batch-v190.md`. Versão experimental até teste no Foundry v14 com Mestre e Jogador (personagens vinculados e não vinculados). Nenhuma publicação no GitHub.

## v0.2.189 — 2026-11-17 — Macros_D616: Focused Strike e Focused Fury (experimental)
- **Base:** v0.2.188, validada pelo Mestre no Foundry VTT v14. Entrega ZIP completo; nenhum commit ou publicação no GitHub.
- **Focused Strike (Martial Arts):** corrige a ausência de bônus de Focus por texto oficial não reconhecido pelo parser genérico. Agora cada **2 Focus investidos** acrescentam **+1 ao bônus fixo de dano Melee** no ataque; custo mínimo 10 Focus, seleção limitada pelo Rank e disponibilidade. O bônus entra uma única vez na flag existente `focusDamageBonus`, fica congelado no card e é aplicado pelo motor de dano/RD já validado. Em Fantástico, o Atordoado continua com o controlador de condições existente.
- **Focused Fury (Melee Weapons):** usa a mesma regra tipada de +1 dano fixo por 2 Focus, com mínimo 5. A implementação substitui a dependência de texto para o cálculo, sem somar duas vezes ao resultado anterior. O **Edge** inerente permanece no resolvedor de Edge/Trouble, com reroll **manual** (v188). Efeitos especiais da arma no Fantástico não foram reimplementados; registro conservador `native-partial`.
- **Infraestrutura:** novo módulo puro `scripts/native-power-focused-attacks.mjs`, chamado somente para os IDs/Power Sets oficiais reconhecidos no registro; executado dentro de `Item.roll()` pelo HUD/ficha, sem macros manuais ou permissões extras. O mesmo cálculo é usado para edição retrocompatível de Focus em cards antigos. Sem novas escritas de Actor fora do custo existente, sem alterações em RD, multiplicador, danos já aplicados ou consumo de ações.
- **Compêndio:** 53 macros catalogadas nas mesmas 27 pastas, com ícones oficiais copiados do compêndio Powers original; apenas `Macros_D616` foi reconstruído. Seis compêndios originais e `README.md` preservados sem mudança.
- **Validação:** testes específicos de Focus investido, Edge, Fantástico, escopo de nomes/IDs, não duplicação e compatibilidade com dano/RD e suíte completa `node --test tests/*.test.mjs`; validação real no Foundry pendente.

## v0.2.188 — 2026-11-17 — Defense Stance e Edge/Trouble manuais (experimental)
- **Base estável:** v0.2.187 validada pelo Mestre no Foundry VTT v14. ZIP completo, sem publicação no GitHub.
- **Defense Stance:** encerra somente a Concentração deste poder quando o portador sofrer perda real de Health (após redução de dano/proteção). Dano igual a zero, perda de Focus e cura não interrompem a postura. A remoção do efeito específico utiliza o mecanismo de Concentração existente para atualizar o indicador genérico, sem encerrar Anger ou outros poderes mantidos simultaneamente. Funciona tanto com dano direto quanto com dano contínuo que realmente reduza Health. A detecção observa atualizações reais de Actor/Token e a escrita fica com o Mestre ativo (ou com o proprietário quando não houver Mestre conectado).
- **Edge e Trouble líquidos:** nenhum reroll situacional é aplicado automaticamente, nem quando há exatamente um Trouble líquido. As fontes, cancelamentos, quantidade líquida e avaliações de múltiplos alvos continuam iguais; o jogador/Mestre usa os botões **EDGE**/**TROUBLE** sob o dado desejado. Os fluxos de ação, ataque, habilidades, turnos e condições compartilham a alteração central e não exigem macros manuais.
- **Card de chat:** quadro de Condições/Automações centralizado, com texto maior, separação de fontes, resultado líquido em destaque e orientação clara para escolher os rerolls manualmente. A seleção dos dados e os controles de reroll originais não foram redesenhados.
- **Compatibilidade:** preservados README.md, os sete compêndios incluindo `Macros_D616`, dados/efeitos de poderes, cálculos de dano e RD, HUD, Anger, Energy Absorption, proteções, Team Maneuvers e veículos. Modificados apenas `scripts/native-power-martial-stances.mjs`, `scripts/condition-edge.mjs`, `css/multiverse-d616.css`, `system.json`, `CHANGELOG.md` e testes.
- **Validação:** testes automatizados e checklist de Mestre/Jogador em `audit/defense-stance-manual-edge-v188.md`; a v0.2.188 permanecerá experimental até validação real no Foundry.

## v0.2.187 — 2026-11-17 — Macros_D616: posturas de Artes Marciais (experimental)
- **Base estável:** v0.2.186 validada no Foundry v14. O ZIP completo preserva os 398 poderes e os 6 compêndios originais.
- **Attack Stance (Martial Arts):** nova automação nativa. Mantém o efeito de Concentração existente e adiciona, somente em ataques Melee, uma segunda parcela igual ao bônus de habilidade de Melee no dano. Assim o bônus de habilidade é efetivamente dobrado, sem alterar multiplicador, RD ou outras habilidades. O valor é registrado no card do ataque; alterações posteriores de Concentração não modificam dano histórico. O efeito termina automaticamente com a Concentração. Não há custo de Focus adicional ou macro executável pelo jogador.
- **Unflappable Poise (Martial Arts):** nova automação **parcial** de Trouble contra ataques corpo a corpo direcionados ao portador. A fonte permanente aplica um Trouble pelo resolvedor de alvos. A descrição oficial prevê um segundo Trouble enquanto Defense Stance estiver válida; este é registrado separadamente e exige adjudicação do Mestre quando houver dois rerolls, conforme os limites atuais do resolvedor. **Defense Stance ainda precisa ser encerrada pelo Mestre ao primeiro ataque corpo a corpo bem-sucedido**, tal como antes. Não classificamos essa parte como automação completa.
- **Cinco referências de movimento:** Flight 1–2 (Basic), Jump 2–3 (Super-Strength), Speed Swim (Super-Speed) remetem aos efeitos/movimento existentes. Nenhuma velocidade é somada ou multiplicada novamente.
- **Macros_D616:** 51 macros de referência, 27 pastas por Power Set, ícones originais e permissão padrão de leitura para jogadores. Nenhum script privilegiado foi habilitado.
- **Integração limitada:** `scripts/native-power-martial-stances.mjs` novo; pequenas ligações no registro, no resolvedor situacional e no snapshot de dano do card. Os 7 compêndios são preservados, exceto a inclusão de novas entradas no `macros-d616`. `README.md`, Charactermancer, Central, Energy Absorption, Anger, Real Jinx, HUD, veículos e Team Maneuvers não têm comportamento alterado.
- **Validação:** testes de snapshot de dano, acúmulo de Trouble e resolução multialvo em `tests/native-martial-stances-v187.test.mjs` e regressão `node --test tests/*.test.mjs`; validação presencial do Mestre ainda pendente.

## v0.2.186 — 2026-11-17 — Macros_D616: Regain Focus e Do This All Day (experimental)
- **Base estável:** v0.2.185, validada pelo Mestre em Foundry VTT v14. ZIP completo do sistema; não publicar diretamente no GitHub.
- **Três novas automações nativas de recuperação:** `Regain Focus` (Martial Arts) restaura Focus igual ao atributo Vigilance, até o máximo; `Do This All Day` (Martial Arts e Shield Bearer) recupera 2 Health por Focus investido, com mínimo oficial de 5 Focus. As duas variantes repetidas possuem IDs e Power Sets próprios.
- **Fluxo existente preservado:** ativação pelo HUD ou ficha com `Item.roll()`, custo variável pelo seletor do sistema, limites de 5×Rank, gasto único de Focus e controle de Ação Padrão existente; resumo de recuperação no card normal de chat. A macro não executa código privilegiado. Não foi incluída nova automação na Central.
- **Proteção contra desperdício:** recursos já no máximo ou com dados inválidos bloqueiam o uso antes do gasto e da Ação; a recuperação nunca excede o máximo. O estorno existente atua se a atualização nativa falhar após um gasto. Não altera o máximo de recursos nem faz curas repetidas por turno.
- **Três referências passivas adicionais:** `Reinforced Skeleton` (RD Health pelo Active Effect existente), `Speed Run 1` e `Speed Run 2` (movimento pelo motor existente, sem multiplicar os dois níveis). Nenhuma mecânica foi duplicada por essas três macros.
- **Macros_D616:** total 44 referências em 27 pastas; ícones copiados dos Powers originais; 3 novos controladores ativos e 3 referências existentes adicionados nesta versão. O status de referência não equivale a uma nova automação.
- **Compatibilidade:** não alterados README, 6 compêndios de itens originais, dano/RD, Energy Absorption, Lightning Actions, Anger, Real Jinx, Concentração, HUD, chat pós-dano, Team Maneuvers, Veículos ou Central. Testes específicos de recuperação e regressão em `tests/native-resource-recovery-v186.test.mjs`.
- **Validação:** suíte automatizada e checklist em `audit/native-recovery-batch-v186.md`; aprovação prática no Foundry do Mestre ainda necessária.

## v0.2.185 — 2026-11-16 — Macros_D616: primeiro lote de passivos e Real Jinx (validação pendente)
- **Base estável:** v0.2.184, aprovada no Foundry pelo Mestre. ZIP completo para Foundry v14; não publicar no GitHub.
- **31 novas referências oficiais, total 38 macros:** preservadas as 27 pastas do `Macros_D616`, os 7 registros anteriores e os ícones originais extraídos do compêndio real. As macros continuam apenas informativas, sem executar scripts com privilégios de Mestre; acesso de Jogador permanece OBSERVER.
- **24 modificadores permanentes reaproveitados:** Accuracy 1–4, Brilliance 1–4, Discipline 1–4, Mighty 1–4, Sturdy 1–4 e Uncanny 1–4. Todos já possuíam Active Effects `transfer=true` no compêndio; o registro apenas os associa ao motor existente. `UPGRADE` preserva o valor maior, sem somar níveis nem duplicar dano ou RD.
- **4 defesas alternativas reaproveitadas:** Brawling, Evasion, Integrity e Wisdom. Registradas no catálogo de macros com diagnóstico, mantendo a resolução de Defesa já implementada pelo sistema.
- **Danger Sense:** associado ao controlador de Rodada Bônus já existente; nenhum turno adicional é criado fora daquele fluxo. **Healing Factor:** associado à recuperação já existente no fim do turno; a Central continua controlando a ativação/desativação dessa automação. Não é executado um segundo processo de cura.
- **Real Jinx (Luck) — primeira nova passiva deste lote:** Trouble de uma fonte identificada em ataques diretos explicitamente direcionados ao portador. O modificador é capturado na rolagem, não em uma alteração permanente de Actor, e não acumula com Trouble já existente no mesmo teste. Ataques não direcionados ou testes sem ataque não recebem o efeito. Combinações de alvos com modificadores diferentes permanecem sujeitas à decisão do Mestre; não se aplica uma rerrolagem de um alvo a todos.
- **Escopo delimitado:** nenhuma alteração no cálculo de dano/RD, HUD, Concentration, Energy Absorption, Elemental Protection, Lightning Actions, veículos ou Team Maneuvers. `scripts/condition-edge.mjs` passa a consultar um resolvedor puro e sem permissões adicionais para Real Jinx. Sem novos hooks de escrita, alterações de Actor, migrações, gastos ou comandos arbitrários.
- **Diagnóstico:** `game.multiverseD616.nativePowerAutomations` descreve as famílias reaproveitadas como controladores existentes, sem declarar que uma macro os executa. Healing Factor é reportado como dependente da Central; status `power-owned` não equivale a comprovação da aplicação de Active Effects no Foundry.
- **Auditoria:** `audit/native-passive-batch-v185.md` registra cobertura, critérios, funcionamento e testes manuais Mestre/Jogador. O README e os seis compêndios originais foram preservados sem alterações.
- **Validação:** execução da suíte Node e conferência de integridade do ZIP; a aprovação no Foundry v14 depende do teste do Mestre.

## v0.2.184 — 2026-11-16 — Chat de Combate 2.0: rolagem automática após DANO (validação pendente)
- **Base:** v0.2.183, que foi validada pelo Mestre em testes de Energy Absorption e Elemental Protection.
- **Correção visual pontual:** ao confirmar DANO / 1/2 DANO / CURA no card do Mestre, rolar automaticamente o ChatLog ao resultado mais recente. Quando um ataque exige seleção de proteção antes da confirmação, rolar ao card técnico recém-criado; o botão legado de geração de dano também acompanha o novo card. Acertos recusados (sem dano aplicado) exibem o resumo após liberação.
- **Compatibilidade Foundry v14:** usa a API oficial `ui.chat.scrollBottom({popout:true,...})` após dois quadros de renderização, incluindo a janela desacoplada (pop-out). Nenhum listener global interfere na leitura de mensagens antigas ou em outros eventos do chat.
- **Segurança do fluxo:** nenhum cálculo de dano, RD, poderes, Health, Focus, permissões, HUD, Concentração ou dados de personagens foi alterado. Erro ao rolar a tela é ignorado, sem cancelar a aplicação do dano.
- **Arquivos:** `multiverse-d616.mjs`, `scripts/damage-reduction-helper.js`, novo `scripts/combat-chat-scroll.mjs`, `system.json`, `CHANGELOG.md` e testes de versão/rolagem. `README.md` e os sete compêndios preservados integralmente.
- **Entrega:** ZIP completo experimental v0.2.184; sem publicação no GitHub. Testar no Foundry v14 com Mestre e Jogador antes de considerar estável.

## v0.2.183 — 2026-11-16 — Energy Absorption: autorização do Jogador e integridade da Reação (validação pendente)
- **Base:** v0.2.182; a versão estável de referência continua v0.2.181 até a validação do Mestre.
- **Falha identificada:** o Controle de Turno usava um segundo argumento do canal `game.socket.on` como identidade autenticada do remetente. O canal básico de socket não garante esse identificador; solicitações do Jogador podiam ser recusadas e o Focus estornado, com o HUD de Reação em estado inconsistente.
- **Correção limitada ao Energy Absorption:** Jogador DONO do Actor envia pedido por `Actor.update` (o próprio Foundry autentica o usuário e impõe permissões); o Mestre valida `userId` recebido no hook `updateActor`, ownership, o item do poder, combate/combatente e Reação disponível. Só então o controlador original do Energy Absorption é chamado pelo Mestre, gastando 15 Focus e 1 Reação juntos, criando a condição Preparado. A resposta também é enviada por `Actor.update` e vinculada a um identificador único de pedido.
- **Segurança:** sem `eval`, sem execução privilegiada de macros, sem confiança em ID declarado no payload e sem conceder permissão OWNER a todos. Solicitações repetidas com mesmo ID não duplicam gastos; falha antes da confirmação não consome recursos no cliente Jogador. Se o Mestre não responder, o cliente exibe aviso e não efetua gastos locais; confira o HUD antes de repetir.
- **Continuidade:** o uso pelo Mestre permanece no fluxo original; a recuperação de Focus, limite dobrado, status, RD, combate, Anger, Lightning Actions, Elemental Protection, Central, HUD e Veículos não foram reimplementados ou alterados. Não há migração de dados; macros continuam em acesso de leitura (OBSERVER) para Jogador, sem exigência de execução manual.
- **Testes:** novos casos de permissão, assinatura do documento, consumo uma única vez, Reação indisponível, ID incompatível, duplicatas e regressão geral. Se um recurso ficou consumido em uma tentativa anterior da v0.2.182, este patch não reembolsa automaticamente um gasto preexistente cuja legitimidade não possa comprovar. Recomenda-se iniciar nova rodada no teste.
- **Entrega:** ZIP completo; `README.md` e os sete compêndios preservados byte a byte. Nenhuma publicação no GitHub.

## v0.2.182 — 2026-11-16 — Consolidação de automações existentes no Macros_D616 (validação pendente)
- **Base estável validada:** v0.2.181. Integração conservadora dos 6 registros legados do compêndio Macros_D616, sem alterar fórmulas, concentrações, danos, RD, HUD, veículos, regras de turno ou Central.
- **Energy Absorption:** o desvio antecipado existente em `Item.roll()` usa agora um adaptador explícito do registro nativo, que chama o **mesmo** `activateEnergyAbsorption` uma única vez, antes de qualquer gasto genérico. Preserva Focus 15, Reação, estados Preparado/Ativo, limite temporário 2×, crédito e limpeza. Poderes antigos com o mesmo nome continuam com o caminho original.
- **Elemental Protection 1–4:** registros ligados ao controlador `elemental-shields.mjs` (Concentração + proteção durante a resolução do dano); não instala novas condições, não repete custos e não altera o cálculo ou a absorção. Diagnóstico somente leitura informa proteção ativa e limiar 10/20/30/40 quando a Concentração existir.
- **Lightning Actions:** registro identifica explicitamente a dependência da regra passiva habilitada na Central (`passivePowerBenefits`). Não cria passiva automática nova, não duplica Ação/Reação, não converte a iniciativa duas vezes. Diagnóstico somente leitura diferencia regra completa, parcial, desabilitada e ausente; macro informa que a configuração ainda é necessária.
- **Macros_D616:** mantém 27 pastas, 7 referências e os ícones copiados do compêndio de poderes. Cada registro agora possui `handlerId` estável, `executionMode` real e status transparente. Macros continuam sem privilégios de Mestre e não executam lógica de combate.
- **API de inspeção:** `game.multiverseD616.nativePowerAutomations.getControllerByItem(item)` e `inspectController(item, actor, settings?)`, sem efeitos colaterais. O registro por Power Set + nome com verificação de IDs de origem permanece; Anger continua nativo.
- **Segurança/compatibilidade:** sem novas rotinas em `preUpdateActor`, sem importação automática de scripts de macros e sem mudanças nos seis compêndios anteriores ou `README.md`. Nenhuma publicação no GitHub. A v0.2.182 só será estável após testes no Foundry v14 do Mestre e Jogador.
- **Testes:** integração do adaptador, gasto único de Energy Absorption, quatro níveis de Elemental Protection, estado de configuração de Lightning Actions, isolamento de controladores, regressões de Anger e suíte geral. Documentação e checklist de validação em `audit/native-legacy-integration-v182.md`.

## v0.2.181 — 2026-11-16 — Anger nativo via Macros_D616 (experimental)
- Corrige a lacuna funcional da prova de conceito v0.2.180: Anger é agora a primeira automação nativa executada pelo fluxo de `Item.roll()` (HUD/ficha), via registro interno seguro; a macro do compêndio continua apenas referência e não recebe permissões de Mestre.
- Gasto variável de Focus continua utilizando o diálogo e limites existentes (5×Rank). O valor escolhido é registrado no efeito de Concentração de Anger: por cada 10 Focus investidos, `+15` de bônus FIXO ao dano dos ataques Melee e `-2` em Logic (inclusive sua Defesa derivada). Não aumenta o multiplicador de dano e não é reaplicado como dano adicional após MMDR.
- O bônus é congelado no card do ataque, aplicado antes de fantástico no cálculo existente de dano (respeita RD, zero com multiplicador efetivo zero, ataques múltiplos). Identificação do bônus visível no detalhamento de dano do Mestre e resumo da ativação no chat.
- Anger bloqueia outros poderes que exigem Concentração enquanto estiver ativo. Para iniciar Anger, encerre quaisquer outras Concentrações. Reativação atualiza bônus e penalidade sem empilhar mudanças. Desativar/remover o efeito de Concentração apaga os modificadores automaticamente.
- Compêndio Macros_D616: 27 pastas e 7 entradas preservadas; apenas o registro de Anger passou de `planned` a `native-active`, com ícone e Power ID originais. Energy Absorption, Lightning Actions e Elemental Protection permanecem em seus controladores validados.
- Sem alterações em README, seis compêndios originais, Central, Veículos, HUD, Team Maneuvers ou regras globais de RD. Não publicado no GitHub. Versão experimental aguardando validação no Foundry v14.
- Testes: cobertura dedicada da ativação, escalas, reativação, exclusividade de Concentração, limpeza, bônus Melee e integração com RD/Fantástico, mais suíte geral de regressão.

## v0.2.180 — 2026-11-16 — Auditoria e prova de conceito Macros_D616 (experimental)
- Base imutável: v0.2.178; NÃO foram incorporadas mudanças experimentais da v0.2.179. Não alterados o motor de combate, o HUD, as fichas, a Central, Health/Focus, iniciativa, permissão de atores e os seis compêndios originais.
- Novo compêndio `Macros_D616` (tipo Macro, 27 pastas por Power Set). Sete entradas de referência: Anger (planejada), Energy Absorption, Lightning Actions e Elemental Protection 1–4 (existentes). Cada macro copia o ícone exato do poder oficial no LevelDB. Apenas consulta o registro seguro; NÃO executa regras nem pode elevar permissões ao Mestre.
- Registro read-only `game.multiverseD616.nativePowerAutomations` com resolução por ID de origem, UUID e escopo Power Set + nome; checagem de conflitos e ferramenta `inspect`. Sem interceptar Item.roll() nesta fase; Energy Absorption e Lightning Actions continuam seguindo seu caminho anterior.
- Inventário estático de 398 poderes em 27 Power Sets, exportado JSON/CSV, relatório de cobertura conservador e divergências entre LevelDB instalado e powers.json (4 ícones, 4 descrições de efeitos). Nenhum dado de catálogo foi corrigido ou regravado nesta etapa.
- Anger: requisitos e efeitos confirmados no compêndio; aplicar +15 de bônus de dano FIXO por 10 Focus, e não +15 ao multiplicador; integração total ficará para a etapa de execução, após validação no Foundry.
- O campo de download remoto não aponta para release inexistente: esta versão é distribuída apenas como ZIP local para testes. README preservado. Status **experimental** até aprovação no Foundry v14; não publicar no GitHub.
- Testes: estrutura do compêndio LevelDB, referências e isolamento de automações, integridade dos 398 poderes e testes de regressão anteriores.

## v0.2.178 — 2026-11-14 — Corrigir cancelamento global de atualizações de Health e Focus
- **Correção crítica (Foundry v14):** o hook `preUpdateActor` do Energy Absorption devolvia `false` quando não havia crédito absorvido para gastar. O Foundry interpreta esse `false` como cancelamento da **atualização inteira** do Actor — inclusive dano de Health, gasto de Focus, cura e outras alterações de recursos em qualquer personagem/NPC. O hook continua calculando o crédito quando necessário, mas agora nunca devolve `false` ao motor do Foundry.
- **Combate restaurado:** o motor de dano, RD, HUD e custos não foi substituído nem reescrito; as atualizações normais voltam a ser processadas pelo Foundry, preservando a mecânica de Energy Absorption preparada/ativa e a capacidade 2× da v0.2.177.
- **Regressões de integração:** testes novos simulam o cancelamento do próprio Foundry quando um hook `preUpdateActor` retorna `false`, comprovando a gravação de dano, Focus, cura e gasto do crédito. Cobrem também updates internos sem consumo duplicado, atributos não relacionados, e o efeito existente de 2× Focus.
- **Conservação:** base v0.2.177; README, LICENSE, compêndios, opções de combate, HUD, Central e automações não alterados. ZIP completo, sem publicar no GitHub. Requer validação real em Mestre/Jogador antes de aprovar como estável.

## v0.2.177 — 2026-11-14 — Energy Absorption: capacidade temporária, crédito persistente e gastos corrigidos
- **Focus 2× visível e funcional:** o máximo exibido pela ficha e pelo HUD dobra durante o combate de absorção enquanto houver crédito do poder, sem alterar permanentemente o máximo armazenado nem as regras de Health/Focus. Ex.: Thermal Prime com 60/60 gasta 15 ao preparar e absorve 24: fica com **69/120 Focus**; Health não é reduzido por esse dano.
- **Saldo da condição confiável:** o número de Focus obtidos pela absorção é gravado no Actor **e** na própria condição `Energy Absorption — Ativo (N Focus)`. A condição serve como registro de recuperação se o flag do Actor estiver ausente/atrasado, evitando o estado incorreto `Ativo (0 Focus)` após absorver dano. Novo uso permanece bloqueado até que todos os pontos creditados sejam gastos.
- **Gasto efetivo de Focus:** no `preUpdateActor`, cada gasto de Focus desconta do crédito restante atomicamente, inclusive atualizações aninhadas. O efeito ativo sincroniza seu nome e saldo e é removido quando chegar a zero. Dano recebido em Focus continua não sendo contado como gasto.
- **Compatibilidade e defesa contra truncamento:** caso algum fluxo limite a primeira gravação ao máximo antigo, o sistema atualiza novamente após a criação da condição que amplia o máximo. Se ainda houver divergência, a mensagem de erro pede verificação da ficha e o valor não é anunciado falsamente como totalmente creditado. Condições obsoletas v176 com 0 Focus e sem crédito válido são limpas ao reativar o poder.
- **Encerramento:** o máximo temporário volta ao normal após o combate; Focus que exceder o limite normal é descartado e abatido do crédito pendente, preservando a proibição de nova absorção caso ainda exista crédito não gasto.
- **Preservação:** v0.2.176 como base; HUD, Central, iniciativa, RD, condições de outros poderes, compêndios e README intactos. Novos testes cobrindo limite dobrado, saldo após gastos, flags ausentes/obsoletos, Focus damage, overflow, reparação de gravação limitada e compatibilidade com a versão anterior. ZIP completo, não publicado no GitHub.

## v0.2.176 — 2026-11-14 — Energy Absorption: Reação pelo HUD e Focus absorvido rastreado
- **Ativação reativa:** ao clicar em Energy Absorption na ficha ou HUD, o defensor valida o poder, Focus disponível e Reação no combate; gasta **15 Focus e 1 Reação** apenas nesse momento e ganha o status **Preparado**. O uso não faz rolagem, não gasta Ação Padrão e é comunicado no chat. Se a Reação não for autorizada, o Focus é estornado.
- **Dano confirmado:** ao selecionar **DANO** no card do Mestre, o MMDR utiliza o dano real **Health pós-Redução de Dano**, ignora a perda de Health e soma o valor ao Focus até **2× o máximo normal**, sem novo custo e sem segunda confirmação. Outros alvos e poderes seguem o fluxo existente.
- **Bloqueio persistente:** o status **Energy Absorption — Ativo (N Focus)** acompanha o Focus recebido pela absorção, inclusive quando o total fica abaixo do máximo normal. O HUD desabilita novo uso enquanto Preparado ou Ativo; o crédito diminui com os gastos reais de Focus e o status é automaticamente removido quando chega a zero. Dano recebido em Focus **não** conta como gasto para remover o bloqueio.
- **Fim do combate:** remove preparações pendentes, incluindo personagens retirados do rastreador; remove o Focus excedente ao máximo normal e deduz a parcela descartada do crédito absorvido. Mantém o bloqueio para crédito absorvido ainda não gasto e evita double-spend de Reações. Compêndios inalterados.
- **Migração da Central:** regras antigas com o efeito especial Energy Absorption ficam legíveis, mas não armam mais absorções gratuitas. Para utilizar o poder, basta clicar no HUD; condições legadas são limpas ao ativar. Central genérica, automações já cadastradas e demais funcionalidades preservadas.
- **Testes:** regressões para ativação, gasto único, cap de Focus, status Preparado/Ativo, bloqueio, gastos, Focus damage, limpeza sem combatente e formulário legado. README e licença intactos; ZIP completo, sem publicação no GitHub.

## v0.2.175 — 2026-11-14 — Correções da auditoria técnica (A-01, A-02, R-01, R-02)
- **Energy Absorption (A-02):** registra no próprio combate os UUIDs dos personagens cujo Focus ultrapassa o máximo. Ao encerrar ou excluir o combate, normaliza o Focus mesmo se o combatente tiver sido removido da iniciativa; compatível com atores de tokens não vinculados e limpeza idempotente. Se o registro falhar, a absorção não gasta a Reação nem modifica o Focus.
- **VFX por condição (A-01):** a Central passa a considerar o caminho **e a escala** do Sequencer. Alterar qualquer um recria o efeito; efeitos persistentes de uma sessão anterior são conciliados com a configuração atual, e VFX desconfigurados são encerrados.
- **Socket do Controle de Turno (R-01):** o Mestre valida o ID de usuário fornecido pelo transporte do Foundry v14 antes de aceitar operações do Jogador, em vez de confiar apenas em `payload.userId`; respostas e avisos do Mestre exigem remetente GM. Sem identidade autenticada, o pedido não é executado.
- **Central de Automações (R-02):** automações podem distinguir poderes de mesmo nome pelo **Power Set** e, opcionalmente, pelo **ID/UUID de origem**. A seleção do catálogo preserva o Power Set, inclusive nos nomes repetidos. Regras antigas apenas por nome continuam válidas sem migração nem mudança de comportamento.
- **Testes:** novas regressões para escala e VFX persistente, Focus após exclusão do combatente, falha no registro de excedente, identidade do remetente, nomes duplicados e compatibilidade das regras antigas. README e seis compêndios preservados; sem alteração de regras de dano, HUD ou mecânica de iniciativa. ZIP completo; nenhuma publicação no GitHub.

## v0.2.174 — 2026-11-14 — Central: M automático na iniciativa (Foundry v14)
- Corrigido o ponto de integração da conversão de iniciativa da Central: Foundry v14 chama `Combatant.getInitiativeRoll`, e não `Actor.getInitiativeRoll`. Agora a regra passiva vinculada ao poder alcança a rolagem efetivamente utilizada.
- O dado Marvel passa a exibir M e contar como 6 antes de o Foundry salvar a iniciativa, preservando o resultado Fantástico e a regra de Rodada Bônus; um M convertido não é confundido com um 6 M 6 natural.
- Preservados o Edge opcional de iniciativa, a automação salva do Lightning Actions e os bônus de Ação/Reação, sem cadastrar efeitos novos no personagem.
- Corrigida a captura do total anterior do pool antes da conversão, evitando reaplicar a diferença de valor quando o total do pool é recalculado.
- Testes regressivos para Combatant v14, poder presente/ausente, conversão e invariantes do HUD. README e compêndios preservados, sem publicação no GitHub.

## v0.2.173 — 2026-11-14 — Central de Automações: passivas de Ação, Reação e Iniciativa

- Novo gatilho **Passiva: enquanto possuir o poder**. Regras do Mestre só operam se o poder estiver na ficha e a Central estiver ativa; não criam Active Effects permanentes.
- Novos efeitos seguros e reutilizáveis: **+1 Ação Padrão/turno**, **+1 Reação/turno**, **Converter dado Marvel em M na Iniciativa** (automático) e **Edge na Iniciativa** (rerrolagem opcional).
- Limites do HUD/rastreador são calculados a partir das regras ativas; recursos extras são renovados no turno e respeitam consumo e validação no Mestre. Combat Reflexes continua cumulativo com bônus independentes.
- Iniciativa: o M convertido entra no resultado efetivo antes da atualização do Combatant e permanece protegido de rerrolagens; Edge usa o controle de iniciativa já existente, sem ser duplicado por Situational Awareness.
- Editor com exemplo **Lightning Actions** de 3 efeitos pronto para preencher e salvar; Edge de iniciativa fica como opção separada para outros poderes.
- Compatibilidade: Biblioteca, regras antigas, compêndios e README preservados. ZIP completo; não publicar no GitHub.

## v0.2.172 — 2026-11-14 — Retorno ao indicador MARVEL nativo do Foundry
- **Reversão solicitada:** removidas as duas configurações personalizadas “Combate — MARVEL atrás dos tokens” e “Combate — tamanho do MARVEL atrás dos tokens”. O sistema não intercepta mais o desenho nem altera a camada, escala ou renderização do marcador de turno nativo do Foundry v14.
- **Compatibilidade:** as escolhas antigas salvas no mundo deixam de ter qualquer efeito; a posição/camada do Token (Depth / Profundidade) e o marcador nativo passam a ser controlados exclusivamente pelo Foundry. Não houve alteração de fichas nem de tokens.
- **Central de Automações:** comportamento original preservado. A versão atual ainda não oferece efeitos genéricos de Ação/Reação extra ou conversão do dado Marvel na iniciativa; não serão simulados com mensagens ou Edge incorretos. O poder Lightning Actions requer esses controles antes de poder ser automatizado integralmente pela Central.
- **Preservação:** demais automações, compêndios e README intactos. ZIP completo, sem publicação no GitHub.

## v0.2.171 — 2026-11-14 — Marcador MARVEL adaptado ao tamanho dos tokens
- **Escala proporcional corrigida:** ao invés de multiplicar toda a largura do token por 1,60, o desenho do MARVEL recebe uma margem fixa de 0,60 quadrícula. Assim, 1×1 → 1,60 quadrículas; 2×2 → 2,60; 3×3 (Sentinel Huge) → 3,60, evitando o logotipo gigantesco.
- **Configuração existente preservada:** o ajuste “Combate — tamanho do MARVEL atrás dos tokens” continua de 1,25 a 2,30, mas agora representa a margem com base em uma quadrícula. Um valor salvo de 1,35 adiciona 0,35 quadrícula ao maior lado do token, independentemente do tamanho da criatura. Dica atualizada na configuração.
- **Camada e textura preservadas:** usa a mesma imagem do MARVEL do Foundry, na camada 650 abaixo de todos os tokens (700), sem alterar suas dimensões, a iniciativa ou efeitos de combate. Desligar a opção inferior ainda retorna ao marcador nativo; caso a textura não esteja disponível, o nativo permanece visível.
- **Regressões:** testes com tokens de 1×1, 2×2 e 3×3, escalas configuráveis e restauração do marcador nativo. Arquivos de personagem, compêndios e README preservados; ZIP completo, sem publicar no GitHub.

## v0.2.170 — 2026-11-13 — MARVEL atrás do token em tamanho compacto configurável
- **Tamanho corrigido:** o MARVEL inferior deixa de aproveitar dimensões infladas do marcador nativo (até 2,5×); usa tamanho padrão de **1,60× o token**, mantendo a mesma textura e camada inferior (sortLayer 650, tokens 700).
- **Ajuste pelo Mestre:** nova configuração de mundo **Combate — tamanho do MARVEL atrás dos tokens** (1,25× a 2,30×, passo 0,05), aplicada imediatamente, sem precisar desativar o MARVEL inferior. É possível reduzir para 1,25× ou ampliar conforme os tokens do mapa.
- **Compatibilidade:** mantém a opção existente **Combate — MARVEL atrás dos tokens** ativa; desativá-la retorna ao marcador nativo do Foundry, que, por projeto do core, aparece na frente. Falhas de textura mantêm o fallback original; troca de turno preserva a limpeza e restauração.
- **Escopo estritamente visual:** não altera iniciativa, HUD, regras, chat, automações, compêndios ou conteúdo dos personagens. README preservado; pacote ZIP completo, sem publicação no GitHub. Testes específicos de escala, camada, restauração e não duplicação.

## v0.2.169 — 2026-11-13 — MARVEL original atrás dos tokens, com restauração segura
- **Indicador de turno restaurado:** a configuração da v0.2.168 deixava o token sem indicador perceptível. Não usamos mais o anel dourado invisível sob o retrato. A própria imagem MARVEL do marcador nativo é reaproveitada como cópia gráfica abaixo da camada de tokens (PrimaryCanvasGroup sortLayer 650, tokens na 700), visível ao redor do token ativo mas sem cobrir personagens vizinhos.
- **Fallback obrigatório:** se textura ou camada gráfica estiver indisponível, mantém o marcador original do Foundry sem ocultar nada. É possível desativar em Configurações de Jogo → Combate — MARVEL atrás dos tokens para usar sempre o marcador original em primeiro plano. A configuração já salva na v0.2.168 permanece válida.
- **Estados protegidos:** aplica o desenho somente ao combatente ativo na cena correspondente; não modifica turno, documento de Token, imagem, vídeo, condição, iniciativa ou mecânica. Restaura o objeto nativo ao encerrar turno, mudar configuração ou trocar cena. Faz uma segunda checagem breve para a criação assíncrona do marcador do Foundry v14.
- **Validação:** regressões de camada, mesma textura, troca de turno, fallback, cenas e visibilidade; suíte total do sistema. README, compêndios e recursos de automação idênticos à v0.2.168; ZIP completo sem publicação no GitHub. O visual deve ser confirmado em uma sessão real do Foundry v14.

## v0.2.168 — 2026-11-13 — Indicador sob tokens, VFX por condição e absorção reativa
- **Indicador de turno sem obstrução:** o marcador gigante do Foundry v14 é ocultado somente na apresentação e substituído por um anel dourado discreto desenhado sob o token ativo. Configuração de mundo "Combate — indicador discreto sob tokens", habilitada por padrão, reversível. Barra compacta de iniciativa e ordem dos combatentes preservadas.
- **Animações de condições na Central:** seção "Animações nos tokens por condição (Sequencer)" na aba de regras personalizadas. O Mestre associa uma condição (como Paralisado ou Atordoado) a um arquivo de animação e escala. O sistema inicia VFX persistente quando a condição aparece e o encerra quando ela termina; não altera condições ou regras de combate. Requer Sequencer e caminho de arquivo válido; sem o módulo, nenhum efeito é aplicado.
- **Energy Absorption como automação opcional:** novo efeito da Central "Preparar reação Energy Absorption (15 Focus)" e condição "Energy Absorption (preparado)" no catálogo. Quando o portador receber dano real de Health após RD e proteções, Mestre escolhe se quer gastar 1 Reação e 15 Focus: o dano é ignorado e adicionado ao Focus, limitado a 2× o máximo normal. A preparação é consumida, e Focus acima do máximo é normalizado ao encerrar o combate. Não concede automaticamente o poder Rank 4 a personagens sem esse poder.
- **Avisos de condições no início do turno:** reforço do processamento por `combatTurn`, além de `updateCombat`, com deduplicação. Uma primeira consulta vazia não bloqueia avisos de condições aplicadas posteriormente no mesmo turno. Ex.: Paralisado por Elemental Blast — Ice.
- **Segurança:** não foram alterados motor de rolagens, fórmulas de RD e Sucessos Fantásticos, compêndios nem README. Validação automatizada adicionada. ZIP completo, sem publicação no GitHub.

## v0.2.167 — 2026-11-13 — Chat 2.0: fidelidade visual, efeitos únicos e confirmação de áreas
- **Resultado do ataque como no conceito:** removida a imagem/miniatura do alvo. Alvo e Defesa ficam em texto; ACERTOU, ERROU, ACERTO FANTÁSTICO, FALHA FANTÁSTICA e SUCESSO FANTÁSTICO (6 M 6) agora aparecem em painel largo com ícone, cores suaves e tipografia destacada. A Defesa permanece ?? para jogadores; antes da confirmação, veem só ATAQUE REALIZADO.
- **Efeito especial elemental sem duplicação:** eliminado o aviso prematuro disparado apenas porque o dado foi M; removida a mensagem redundante de confirmação. Após o Mestre aplicar DANO ou 1/2 DANO, o efeito Fantástico realmente aplicado aparece uma única vez em mensagem de chat **depois da mensagem DANO aplicado**, para alvos com dano efetivo maior que zero. Nenhum efeito especial é aplicado/publicado quando o dano foi zero, o ataque falhou, houve proteção total ou o Mestre usou CURA.
- **Desenho de área por jogador:** o botão passa a enviar solicitação com ID, aguarda confirmação real e informa sucesso, recusa, erro ou ausência de resposta. Mestre ativo recebe janela para APROVAR ou RECUSAR o desenho; só cria a região/parede após autorizar. Ambos recebem comunicação clara da decisão, inclusive erros de permissão/concentração. As geometrias e a mecânica de estruturas ficam intactas.
- **Preservação:** mantidos três botões exclusivos do Mestre, Resolução do Dano recolhida por padrão, RD e bônus de Focus existentes, cálculos, poderes, compêndios e alterações da v0.2.165. README sem mudanças, nenhum envio ao GitHub.

## v0.2.166 — 2026-11-13 — Chat de Combate 2.0: apresentação fiel ao conceito
- **Sem quarta ação:** removido o botão redundante “Preparar dano / proteção” dos ataques que já oferecem os três comandos DANO, 1/2 DANO e CURA exclusivos do Mestre. Esses comandos continuam preparando e aplicando com o motor existente; barreiras e proteções que exigem decisão continuam abrindo o card reservado ao Mestre automaticamente.
- **Dano Final em destaque:** um único quadro, com valor numérico grande, sem repetir o número nos badges dos alvos. Suporta vários alvos e visibilidade do Jogador somente após confirmação do Mestre; a Defesa continua ?? para o Jogador.
- **Explicação conforme o conceito:** “Resolução do Dano” continua recolhida por padrão com seta. Ao expandir, o Mestre vê dado Marvel, multiplicador ofensivo, RD reduzindo multiplicador, multiplicador efetivo, bônus da habilidade, bônus de Focus e automações, dano normal, Fantástico e valor efetivamente aplicado (inclusive 1/2 Dano, Cura e bloqueios).
- **Caso real da Zima:** 4 × (3 − 2) + 6 Agility + 7 Focus = 17. A tela anterior apresentava 17 sem explicitar o +7 Focus.
- **Escopo e segurança:** somente interface e funções de formatação; motor de combate, efeitos, dados dos personagens, compêndios e as alterações de pré-requisitos da v0.2.165 permanecem preservados. README intacto; nenhuma publicação no GitHub.

## v0.2.165 — 2026-11-13 — Auditoria de pré-requisitos dos Powers
- **Energy Absorption:** pré-requisito **Rank 4** restaurado conforme Tony’s Workshop / Core Rulebook; anteriormente estava vazio, permitindo seleção indevida por Rank 3.
- **Outros erros confirmados no catálogo:** **Blazing Fast Fists** (Rank 2), **Grow 2** (Grow 1) e **Do This All Day** (Rank 2; entradas Martial Arts e Shield Bearer). Total de **5 registros** corrigidos, representando **4 poderes distintos**.
- **Compêndio e Charactermancer:** sincronizados os pré-requisitos dos **398 poderes** no LevelDB com o catálogo. Foram corrigidos **23 IDs de compêndio adicionais** com divergências preexistentes (inclusive Speed Run 2: Rank 2 → 3, Return Fire: Rank 8 → 2, e dependências digitadas incorretamente). Um total de **7 registros** recebe proteção em runtime contra requisitos antigos de itens no Mundo (os cinco corrigidos no catálogo, Speed Run 2 e Return Fire), sem apagar outros requisitos mais restritivos definidos pelo Mestre. Poderes concedidos legitimamente por origens/traits continuam preservados.
- **Auditoria adicional:** analisadas as 398 entradas para requisitos vazios, referências a poderes inexistentes e cadeias de Rank. Divergências editoriais de Rank presentes nas próprias regras (como Blur / Speed Blast dependerem de Speed Run 2) não foram alteradas sem errata; demais casos suspeitos permanecem para revisão, sem correção especulativa.
- **Segurança:** sem alterações de ficha, remoção automática de poderes existentes, motor de combate, HUD, README ou publicação no GitHub. Personagens já criados com Rank inferior devem ser revisados pelo Mestre.
- **Testes:** adicionados testes de auditoria e regressão cobrindo os 398 requisitos do catálogo contra o compêndio e a normalização de cópias antigas; suíte geral de 954 testes aprovada.

## v0.2.164 — 2026-11-12 — Chat de Combate 2.0: resultados e resolução reservada
- **Cinco resultados no card:** ACERTOU, ERROU, ACERTO FANTÁSTICO, FALHA FANTÁSTICA e SUCESSO FANTÁSTICO (6 M 6 natural). Mantido o valor 6 do M; 6 M 6 acerta independentemente da Defesa e os botões retroativos de Trouble são bloqueados, inclusive no handler.
- **Privacidade por etapa:** jogador vê antes da confirmação apenas ATAQUE REALIZADO e Defesa ??; após o Mestre aplicar DANO/1/2 DANO/CURA, vê o resultado e dano final de cada alvo, sem Defesa ou cálculo. A mensagem técnica de preparação do dano fica exclusiva dos Mestres.
- **Comandos integrados:** os três botões DANO, 1/2 DANO e CURA aparecem abaixo da avaliação do card de ataque, apenas para o Mestre. Utilizam o mesmo pipeline MMDR já existente; preservam proteção/Barreira (quando necessário, solicitar confirmação no card de preparação clássico), múltiplos alvos, automações e conferência de rolagem.
- **Cálculo visual do Mestre:** DANO FINAL fica visível; os detalhes da RD aplicada ao multiplicador, bônus e resultado ficam sob Resolução do Dano, com seta e recolhidos por padrão. O cálculo de dano do sistema não foi modificado, inclusive RD que zera o multiplicador e regras específicas de Powers.
- **Segurança e 6 M 6:** confirmação idempotente e divulgação de resultado somente após aplicação pelo Mestre; dados de Defesa, multiplicadores e RD nunca entram no resumo público de confirmação. Um 6 M 6 natural também prevalece sobre revisão de Edge/Trouble por alvo. Usar o card técnico clássico continua possível quando precisar ajustar o modo de proteção.
- **Validação:** regressões do Chat 2.0 e suíte geral; README preservado sem alteração, compêndios intactos, sem publicar no GitHub.

## v0.2.163 — 2026-11-11 — HUD 4.0: remover ícones genéricos de Active Effects
- **Correção definitiva de poluição visual:** removida a coleta de Active Effects do HUD, incluindo efeitos transferidos de Traits, Powers, Origins, Occupations e equipamentos. O HUD não consulta mais `actor.effects` ou `allApplicableEffects` para gerar ícones.
- **Casos reais corrigidos:** `initiative edge` da característica Situational Awareness (Jean Grey Amaldiçoada e Sentinel) e `Extra Focus` de Battle Ready (Sentinel). Efeitos de tamanho, bônus permanentes e temporários de itens também não viram ícones adicionais.
- **Escopo visível:** a faixa mostra condições reais do sistema e Manobras de Equipe Ofensivas/Defensivas da rodada; Concentração e Movimento continuam com seus indicadores existentes. Danos contínuos continuam sendo processados, mas não geram ícones genéricos a partir de Active Effects (uma condição existente pode continuar sendo exibida).
- **Mecânicas preservadas:** nenhuma alteração, exclusão ou desativação de Active Effects, regras, atributos, Focus, dano, automações, compêndios ou migração do mundo. Mudança restrita à visualização do HUD clássico e persistente.
- **Regressão:** testes com efeitos transferidos representando os JSONs fornecidos e com acesso a Active Effects deliberadamente bloqueado, garantindo que o HUD não volte a consultá-los.
- **Entrega:** ZIP completo, README canônico preservado e GitHub não atualizado.

## v0.2.162 — 2026-11-11 — HUD 4.0: ocultar Active Effects derivados de poderes
- **Faixa de efeitos mais limpa:** Active Effects derivados de poderes deixam de aparecer no HUD 4.0, incluindo bônus passivos e temporários originados por Powers (como buffs de iniciativa). Os poderes continuam funcionando normalmente; a alteração é apenas visual.
- **Mantidos na faixa:** Manobras de Equipe, condições exibidas pelo sistema, danos contínuos da Central de Automações e outros efeitos temporários não derivados de poderes com duração explícita.
- **Concentração preservada sem duplicação:** o medidor próprio de Concentração continua sendo a referência visual; efeitos de poderes em Concentração e outros Active Effects originados de Powers não ocupam mais espaço na faixa.
- **Average Effects e efeitos técnicos:** continuam ocultos; nenhum Active Effect é removido das fichas.
- **Validação:** novos testes de regressão para buffs derivados de poderes, origem `power` e origem por `Item` do tipo `power`, além da suíte geral.
- **Entrega:** ZIP completo, README preservado e nenhuma publicação direta no GitHub.

## v0.2.161 — 2026-11-11 — HUD 4.0: somente efeitos temporários
- **Faixa de efeitos sem poluição visual:** removida a exibição de Poderes Permanentes, modificadores passivos, efeitos transferidos permanentemente de itens/equipamentos e Healing Factor. Todos continuam funcionando normalmente; apenas não ocupam ícones no HUD.
- **Average Effects explicado e ocultado:** este é um Active Effect técnico de tamanho Average (médio), sem benefício temporário. Os demais efeitos técnicos de tamanho também não são mostrados. Nenhum Active Effect é removido ou alterado nas fichas.
- **Permanecem visíveis:** Manobras Ofensivas e Defensivas da rodada, condições, poderes ativos por Concentração, danos contínuos (incluindo Chamas de Faltine) e outros Active Effects com duração explicitamente limitada em rodadas, turnos ou segundos.
- **Mesma organização:** Equipe, indicador de Concentração, movimento e faixa horizontal compacta, nos HUDs clássico e persistente. Sem alteração de regras de combate, cálculos, automações, compêndios ou migração do mundo.
- **Validação:** testes de regressão da filtragem de passivos, itens, técnica de tamanho, temporários, concentração e duração, além da suíte geral.
- **Entrega:** ZIP completo, README inalterado e nenhuma publicação direta no GitHub.

## v0.2.160 — 2026-11-11 — HUD 4.0: Efeitos Ativos
- **HUD clássico e persistente:** nova faixa horizontal compacta de ícones para todos os estados ativos identificáveis nas fontes nativas do sistema: Manobras de Equipe Ofensivas 1–3 e Defensivas 1–3, condições, Concentrações nomeadas, Active Effects do personagem, efeitos transferidos de poderes/equipamentos, dano contínuo da Central de Automações e Chamas de Faltine. Healing Factor (passiva sem Active Effect) é indicado somente quando o sistema reconhece o poder.
- **Leitura sem duplicação:** as condições existentes são exibidas uma única vez, junto com os benefícios no mesmo painel. O medidor de Concentração mantém sua posição e os estados de nível de concentração não recebem ícones duplicados. Efeitos desabilitados, suprimidos e expirados não aparecem; poderes e equipamentos usam `allApplicableEffects` do Foundry v14 quando disponível.
- **Visual:** ícones coloridos por categoria (Ofensivo, Defensivo, Dano contínuo, Concentração, Passivo e Efeito genérico) com nome, origem e duração no tooltip. O Mestre e o jogador podem rolar a faixa horizontalmente, inclusive com teclado, sem deslocar Equipe, Concentração ou Movimento.
- **Mecânicas intocadas:** nenhuma alteração de cálculos de dano, Focus, Edge/Trouble, status, durações, duração de rodada, condições, Concentration, consumos, hooks de negócio ou compêndios. O painel não cria nem modifica efeitos.
- **Limite do inventário:** efeitos puramente instantâneos de uma rolagem e passivas sem representação de estado (exceto Healing Factor, reconhecida explicitamente) não têm ícones próprios. A lista mostra efeitos com estado real, evitando inventar bônus ou durações.
- **Distribuição:** ZIP completo, README preservado sem alterações; sem publicação no GitHub e sem migração de mundo.

## v0.2.159 — 2026-11-11 — Consolidação do Combate: transações e durações seguras
- **Revisão geral:** auditados os fluxos de Manobras de Equipe com Focus, Edge/Trouble, Ofensiva 3 (Fantástico por alvo e dado M visível), RD das Defensivas, Reações e transições de rodada; preservadas as mecânicas aprovadas na v0.2.158, os poderes e os compêndios.
- **Focus e rodada:** se o Mestre mudar a rodada enquanto o sistema desconta Focus dos participantes ou salva o benefício, a confirmação é cancelada e os gastos efetuados são reembolsados; efeitos de rodadas anteriores são removidos mesmo quando a gravação terminou após a mudança.
- **Concorrência:** confirmações simultâneas de manobras diferentes no mesmo combate, feitas pelo mesmo cliente, não conseguem processar o mesmo Focus em paralelo. A escrita das flags de manobra e a limpeza de fim de rodada são serializadas para evitar a perda de benefícios novos por uma limpeza antiga atrasada.
- **Reembolso:** em caso de falha, devolve somente o custo cobrado pela manobra, sem restaurar uma fotografia antiga de Focus que poderia descartar outras alterações feitas durante a operação.
- **Chat:** a confirmação registra a rodada efetiva da manobra mesmo quando a iniciativa avança imediatamente após a gravação.
- **Testes:** acrescentados cenários de regressão com mudanças de rodada durante atualizações assíncronas de Actor e Combat, disputa entre confirmações, limpezas atrasadas, duração de Edge/RD, Fantástico por Rank e reinicialização de recursos de turno.
- **Limitações:** testes automatizados em Node não substituem testes com jogadores conectados no Foundry v14; serialização de escrita é local ao cliente autorizado e não é uma trava distribuída entre Mestres em máquinas diferentes.
- **Distribuição:** ZIP completo; README preservado integralmente, alterações documentadas neste CHANGELOG; nenhuma publicação no GitHub e nenhuma migração de dados.

## v0.2.158 — 2026-11-10 — Ofensiva 3: M visível e alvos já selecionados
- **Ofensiva 3:** quando todos os alvos marcados têm Rank igual ou superior ao atacante, a rolagem agora força o próprio dado Marvel a M (1), atualizando dados, total, Fantástico, dano e condições no card original. **Usar/manter alvos já selecionados** funciona sem selecionar o alvo novamente.
- **Múltiplos Ranks:** com alvos mistos, mantém o dado físico compartilhado e calcula M/Fantástico apenas por alvo elegível; nunca força um M indevido contra inimigo de Rank inferior.
- **Chat:** resultado por alvo exibe ACERTO FANTÁSTICO (ou FALHA FANTÁSTICA), e o aviso da manobra informa M (6) e total efetivo contra aquele alvo. O card de dano continua usando o benefício Fantástico e seu multiplicador corretamente.
- **Escopo:** ataques com poder/arma e ataques básicos de Melee do HUD; não altera as Ofensivas 1–2, as Defensivas, Rally, compêndios ou README.

## v0.2.157 — 2026-11-10 — Manobras de Equipe: todos os bônus de Ofensiva e Defensiva
- **Ofensiva 1:** mantém Edge situacional nos ataques, com expiração ao trocar de rodada.
- **Ofensiva 2:** cada card de ataque oferece um reroll completo único (três dados) durante a rodada; o sistema conserva o melhor total, desempatando em favor do Fantástico, sem novo gasto de Focus.
- **Ofensiva 3:** calculadora de acerto, dano e condições avalia o dado Marvel como M somente para alvos com Rank igual ou superior ao atacante; alvos de Rank menor não recebem conversão indevida. As permissões ficam registradas no card do ataque.
- **Defensiva 1–3:** concede RD 2/4/8 de forma transitória (Health e Focus), prevalecendo a maior RD entre manobra e proteções preexistentes, integrando danos de ataque, MMDR, danos contínuos e seguimentos.
- **Rally:** continua apenas texto, sem adicionar efeitos automáticos.
- **Escopo:** flags do combate por rodada; sem escrever modificadores permanentes no Actor ou empilhar RD de forma artificial.

## v0.2.156 — 2026-11-10 — Manobras de Equipe: tradução e Ofensiva Nível 1 automática
- **Idioma:** descrições dos nove benefícios (Ofensiva, Defensiva e Reagrupamento, níveis 1–3) exibidas em português brasileiro na janela de confirmação e no chat; nomes de manobras também traduzidos nos seletores das fichas; catálogo e valores originais mantidos, sem afetar compêndios ou dados do mundo.
- **Ofensiva 1:** após confirmação exclusiva do Mestre e desconto de 5 Focus por participante, grava benefício vinculado ao combate e à rodada, aplicando 1 Edge automaticamente nas rolagens de ataque de cada participante. A seleção do dado a rerrolar continua com o jogador, conforme o fluxo existente de Edge/Trouble. Não aplica Edge em testes comuns.
- **Duração:** benefício válido apenas na rodada em que foi ativado; deixa de se aplicar na rodada seguinte mesmo antes da limpeza assíncrona, que remove registros expirados. Não fica gravado permanentemente na ficha.
- **Consistência:** pagamento e registro do efeito constituem uma transação com reversão de Focus se a gravação falhar; impede confirmação repetida da mesma manobra para a mesma equipe e rodada. O chat informa exatamente qual benefício foi automatizado.
- **Demais níveis:** permanecem sob acompanhamento do Mestre, sem automação presumida de Redução de Dano, recuperação ou modificação de dados. Sem alterações nas regras de outros poderes, HUD, compêndios ou manuais. README preservado; GitHub não atualizado.

## v0.2.155 — 2026-11-10 — Manobras de Equipe: legibilidade do chat e posição no HUD
- **Chat:** corrigido o contraste dos relatórios de manobras confirmadas e propostas. O cartão no chat passa a ter fundo claro opaco, títulos escuros e textos de custos, participantes, Rank e descrição legíveis; o aviso de Focus permanece destacado com alto contraste. A janela de confirmação conserva o visual escuro.
- **HUD:** removido o atalho de Manobra de Equipe da grade de Powers e adicionado um botão compacto **Equipe**, imediatamente **antes de Concentração**, na faixa de status do HUD clássico e do HUD persistente. O botão funciona independentemente da aba selecionada e mantém a seleção e validações originais.
- Preservados a ordenação dos favoritos, os indicadores Concentração/Movimento/Condições, consumo de Focus, permissões do Mestre, veículos, compêndios, automações e regras de combate. Sem migração. `README.md` mantido sem alterações; nenhuma publicação no GitHub.

## v0.2.154 — 2026-11-10 — Team Maneuvers 1.0: assistente de manobras de equipe
- Integrado o catálogo **Team Maneuvers** já existente (Offensive, Defensive e Rally, níveis 1–3) ao fluxo do Foundry v14. As descrições, faixas de Rank médio e custos de Focus são lidos de `CONFIG.MULTIVERSE_D616.teamManeuvers`, sem inventar novas regras.
- Novo botão **Manobra** junto dos campos Team Maneuver na ficha de Personagem e atalho **Manobra de Equipe** na aba Powers do HUD nativo, também disponível no HUD persistente e no personagem embarcado em veículo.
- Assistente permite selecionar pelo menos dois participantes distintos da iniciativa, visualizar Rank médio, faixa cadastrada, custo individual, total e Focus disponível. Verificações impedem seleções inválidas, participantes removidos e Focus insuficiente.
- Jogadores podem publicar **propostas** no chat sem gastar recursos de outros personagens. Apenas o Mestre confirma a manobra, desconta o Focus de cada participante após nova validação e publica um relatório de custo e efeito.
- Proteção contra gasto parcial: se alguma atualização de Focus falhar, o sistema tenta restaurar os valores dos participantes já atualizados e alerta explicitamente se uma restauração falhar.
- **Escopo conservador:** Edge/Trouble, Redução de Dano, novos testes, recuperação e modificação de dado Marvel **não são aplicados automaticamente** nesta primeira fase. O relatório apresenta a descrição do catálogo para adjudicação pelo Mestre, evitando alterar o motor de combate sem validar timing e requisitos completos das regras.
- Nenhum novo compêndio ou migração. Preservados os poderes, automações, Veículos 2.0, HUD, iniciativa, MMDR e as condições. `README.md` mantido integralmente sem alterações; histórico registrado apenas neste CHANGELOG. Nenhuma publicação no GitHub.

## v0.2.153 — 2026-11-07 — Veículos: iniciativa sem duplicar tripulantes
- Corrigida a duplicação de um personagem embarcado na iniciativa quando o Foundry já havia incluído outro token da mesma ficha (Actor). A inclusão da tripulação agora verifica `actorId` além de `tokenId`.
- Incluída proteção na criação nativa de Combatants para impedir uma segunda entrada de um personagem já representado no mesmo combate. Duplicatas existentes da tripulação são reconciliadas quando processadas, preservando preferencialmente o combatente ativo ou com iniciativa já rolada.
- A prevenção é restrita aos tripulantes de veículos: inimigos distintos que utilizam tokens da mesma ficha NPC permanecem independentes.
- O HUD veicular reconhece o combatente do personagem mesmo quando o registro usa outro token da mesma ficha, preservando os custos de Ação/Reação.
- Mantidos os botões de alternância de HUD, desembarque gratuito, permissões OWNER permanentes, cálculos de Health/Focus e todos os compêndios.
- README.md preservado sem alterações; documentação desta correção somente no CHANGELOG.md. Sem migração de mundo.

## v0.2.152 — 2026-11-07 — Veículos 2.0: iniciativa da tripulação e HUDs intercambiáveis
- O veículo não recebe Combatant próprio quando inserido no combate: apenas os tripulantes presentes na cena recebem entradas individuais de iniciativa, mesmo se estiverem ocultos no mapa. A inclusão pode ser feita pelo Mestre ou solicitada por um jogador proprietário; o botão de iniciativa na ficha do veículo também encaminha a rolagem para a tripulação.
- O HUD nativo prioriza o personagem embarcado e oferece atalhos na aba Poderes para alternar entre o personagem e a nave, além de Desembarcar sem custo de movimento.
- Jogadores podem solicitar desembarque ao Mestre pelo socket do sistema com validação de propriedade do personagem; ações internas de embarque/desembarque não registram deslocamento no Turn Tracker.
- Poderes da nave passam a consumir a Ação/Reação do tripulante que a utiliza, se estiver no combate, sem criar um turno extra do veículo; recursos Health/Focus da nave permanecem próprios.
- Permissões OWNER seguem a regra permanente: são concedidas no embarque e não removidas no desembarque.
- README.md preservado integralmente; histórico documentado apenas neste CHANGELOG.md.

## v0.2.151 — 2026-11-07 — README canônico e documentação permanente
- Substituído `README.md` pela estrutura de documentação enviada pelo mantenedor, preservando apresentação, instruções de instalação, funcionalidades nativas, compatibilidade, créditos e referências.
- Conferido o README com o conteúdo da distribuição: acrescentadas somente informações permanentes sobre Veículos e tripulação, acesso `OWNER` que permanece após o desembarque, Health/Focus automáticos, Central de Automações, Central de Diagnóstico e compêndios.
- Atualizada a descrição em inglês para não afirmar, sem auditoria de conteúdo, que a distribuição está isenta de todo material dos livros oficiais; preservados os avisos de não afiliação e de necessidade das publicações oficiais.
- **Política de manutenção:** o README não contém notas ou números de versões; novidades e correções futuras permanecem em `CHANGELOG.md`, salvo solicitação expressa de atualização do README.
- Esta versão altera somente documentação, manifesto de versão e verificações de documentação/distribuição. Nenhuma alteração em scripts, estilos, templates, dados de personagens ou compêndios. Nenhuma migração do mundo.

## v0.2.150 — 2026-11-07 — Veículos: OWNER permanente e documentação somente no CHANGELOG
- **Embarque:** os usuários proprietários do personagem embarcado recebem nível `OWNER` no Actor do veículo, podendo controlar seu token e usar seus poderes. Não são concedidas permissões a jogadores sem controle do personagem.
- **Desembarque:** não altera nenhuma permissão do veículo. OWNER permanece concedido depois que o tripulante sai; o Mestre pode modificar manualmente quando quiser.
- Removidas as rotinas de reconciliação/restauração de permissões no desembarque, ao excluir tokens e ao abrir/recarregar cenas. Não são mais enviados operadores de exclusão (`ForcedDeletion`/`ownership.-=...`) nem manipulados backups de permissão antigos.
- Novas permissões são concedidas mediante atualização `ownership` com níveis inteiros e preservação das demais entradas existentes, compatível com Foundry VTT v14.
- **Política de documentação restaurada:** `README.md` permanece exatamente igual ao da v0.2.149. Apenas `CHANGELOG.md` recebe a descrição desta versão.
- Preservados ficha de três colunas, tripulação, Movimento, HUD, Health/Focus automáticos, poderes, automações e os bancos de todos os compêndios. Sem migração de dados do mundo.

## v0.2.149 — 2026-11-07 — Veículos: restauração de permissões compatível com Foundry v14
- **Falha corrigida em ownership:** a reconciliação de tripulação deixava de funcionar ao desembarcar/restaurar permissões, pois enviava `ownership.-=ID: null`, formato legado rejeitado pelo `DocumentOwnershipField` do Foundry v14.
- A operação agora envia uma única atualização `ownership` com os IDs de usuário como chaves e o operador nativo `foundry.data.operators.ForcedDeletion` para retirar concessões temporárias sem atribuir `null` a níveis de permissão.
- Preservado o acesso `OWNER` dos jogadores que controlam personagens embarcados. Ao último desembarque, a permissão explícita anterior volta ao seu valor original; concessões antes inexistentes são removidas. Outras permissões e o nível padrão não são alterados.
- **Segurança contra falhas:** backups de permissões de novos tripulantes são salvos antes da concessão, mas backups de desembarques são excluídos apenas depois de o Foundry confirmar a atualização. Se a atualização falhar, pode ser repetida sem perder os valores originais.
- Mantidos o layout restaurado na v0.2.148, a tripulação, Health/Focus automáticos, as automações, o HUD, o MMDR e os compêndios. Nenhuma migração de mundo ou criação de veículo necessária.
- Adicionados testes de restauração explícita, remoção de permissão temporária, preservação de outras permissões, edição manual pelo Mestre e recuperação após falha de atualização.

## v0.2.148 — 2026-11-07 — Veículos: correção pontual da grade da ficha
- **Layout de Veículo restaurado:** removido um `</div>` adicional da v0.2.147 que encerrava prematuramente o painel superior e empilhava Retrato/Health/Focus, Abilities e Damage/Movimento em largura total. A ficha volta às **três colunas** aprovadas: retrato e recursos à esquerda, Abilities ao centro e Damage sobre Movimento à direita.
- Mantidas as seções **Powers e Traits & Tags** lado a lado, com **Tripulação** ao final da ficha. Layout compartilhado por Mestre e jogadores, respeitando permissões anteriores.
- Nenhuma alteração em cálculos automáticos de Health/Focus, permissões de tripulantes, movimento, poderes, automações, Active Effects ou compêndios.
- Adicionado teste estrutural de HTML/Handlebars para detectar fechamento indevido de contêineres que afeta a grade, além de conferir os três painéis e a ordem das seções.
- Atualização somente de template/documentação/versão e testes: **sem migração** de mundo.

## v0.2.147 — 2026-11-07 — Veículos 1.5 e recursos automáticos globais
- **Rolagem preservada:** embarque, desembarque, mudança de função e visibilidade da tripulação preservam a posição vertical e horizontal da ficha, inclusive após atualizações de Actor/Token e renderizações do Foundry.
- **Health e Focus em todos os Atores:** personagens, NPCs e veículos compartilham cálculo do máximo (Health = máx(10, Resilience × 30); Focus = máx(10, Vigilance × 30)). A preparação ocorre antes dos Active Effects, que continuam podendo modificar máximos ou atributos. Os máximos passam a ser somente leitura nas três fichas; o controle manual e a caixa **Recursos automáticos** foram removidos.
- **Recursos atuais:** mudanças diretas de Resilience/Vigilance preservam dano acumulado e Focus consumido; poderes que apenas elevam a capacidade não restauram os pontos gastos. Ao criar ficha nova, os recursos começam completos. No carregamento do mundo, o Mestre executa uma migração única dos valores legados já salvos, preservando o gasto/dano anterior ao alinhar os máximos. A migração exige **backup do mundo** antes de instalar.
- **Tripulação com propriedade:** todos os usuários que possuem cada personagem embarcado ganham `OWNER` no Actor do veículo e podem movimentar o token e rolar poderes. Embarques múltiplos preservam o acesso enquanto houver pelo menos um dos personagens controlados pelo usuário a bordo. No último desembarque, sua permissão anterior é restaurada; uma mudança manual do Mestre não é sobrescrita. Tripulantes que já possuíam acesso o preservam. Propriedade é sincronizada também ao abrir a cena e ao remover tokens.
- **Visual do jogador:** mesma estrutura da ficha do Mestre, incluindo poderes clicáveis para quem possui o veículo; controles administrativos e edição de dados continuam exclusivos do Mestre na interface.
- Nenhuma mudança no MMDR, automações, condições, animações ou bancos dos seis compêndios. Sem publicação no GitHub.

## v0.2.146 — 2026-11-06 — Veículos 1.4: criação do zero e recursos automáticos
- Retirado o botão **Criar cópia como veículo** da ficha NPC. Veículos agora são criados como atores do tipo Veículo diretamente pela lista de Atores; os NPCs e veículos existentes não são excluídos nem convertidos.
- Novo cálculo automático de máximos de Health (Resilience × 30, mínimo 10) e Focus (Vigilance × 30, mínimo 10), igual ao usado no Charactermancer e nas regras oficiais. Novos veículos começam com os recursos preenchidos.
- O cálculo ocorre antes dos Active Effects: bônus transferidos de poderes, traços e tags sobre `system.health.max` e `system.focus.max` continuam funcionando (ex.: Extra Focus +30). Efeitos que alteram Resilience/Vigilance também recalculam a parcela de atributo.
- Mudanças diretas de Resilience/Vigilance preservam a quantidade de dano e Focus gasto, em vez de reiniciar recursos indevidamente. Adicionar/remover um efeito passivo altera a capacidade, sem conceder cura/Focus automaticamente.
- Veículos existentes permanecem em modo manual até o Mestre habilitar **Recursos automáticos** na ficha, evitando substituir máximos personalizados de modelos já usados. No modo automático, os campos máximos são de leitura; Health/Focus atuais continuam editáveis e utilizáveis por MMDR.
- Mantidos movimento, tripulação, HUD, combate, fichas de NPC, conteúdo de compêndios e permissões de jogadores. Nenhuma migração automática de dados do mundo.

## v0.2.145 — 2026-11-06 — Veículos 1.3: tripulação e visualização do piloto
- Corrigido o atraso percebido pelo Mestre no modo Oculto: os tokens embarcados acompanham a animação do veículo mesmo quando aparecem semitransparentes para o GM.
- Sincronização usa a posição renderizada da nave depois do quadro nativo e mantém o acompanhamento até a gravação do destino, sem criar outra animação dos passageiros.
- Quadro Tripulação movido para depois das seções Powers e Traits & Tags.
- Ficha do jogador conserva o mesmo layout de controles, painéis e cartões, porém com opções de administração inativas; somente o Mestre pode alterá-las.
- Adicionada tradução do tipo de Actor Veículo nas interfaces en/pt-BR.
- Preservados compêndios, automações, NPCs originais e os veículos já convertidos.

## v0.2.144 — 2026-11-05
- Veículos: sincronização visual dos passageiros visíveis diretamente com a animação do token da nave no Foundry v14, eliminando o atraso entre os tokens.
- Veículos: atualização dos documentos da tripulação após a animação, sem uma segunda animação independente.
- Ficha Veículo: novo quadro Movimento, abaixo de Damage, com modos ativos e velocidades de combate e fora de combate.
- Sem alterações em dados de compêndios, motor de combate ou automações.

## v0.2.143 — Correção da conversão de NPC para Veículo (2026-11-05)

- Corrigida falha ao usar **Criar cópia como veículo** em NPCs com Active Effects legados, como o **Flight speed 2** do Blackbird: `duration.value: null` era revalidado pelo Foundry v14.369 e impedia a criação do Actor.
- A cópia recebe uma normalização pontual dos valores legados de duração **nos efeitos associados aos itens**. Valores inteiros válidos e campos como `transfer`, `changes` e `expiry` são preservados; a duração indefinida é deixada ao padrão do Foundry, sem convertê-la para zero segundos.
- O NPC original, seus itens, tokens e efeitos não são modificados. A solução mantém a conversão por cópia e as demais funcionalidades de tripulação da v0.2.142.
- Novos testes reproduzem a estrutura de Flight 2, validam o dado enviado a `Actor.create` e protegem a duração de efeitos temporários.
- Nenhuma migração do mundo ou alteração dos compêndios. Recomendado reiniciar o Foundry e repetir a conversão do Blackbird.

## v0.2.142 — Veículos 1.0: tripulação embarcada e visibilidade por veículo (2026-11-05)

- Novo tipo de Actor **Veículo** no Foundry v14, com ficha própria baseada no visual do NPC e preservando Health, Focus, habilidades, poderes e itens.
- **Conversão não destrutiva**: NPCs existentes como Blackbird possuem o botão *Criar cópia como veículo*. O NPC e os seus tokens existentes continuam intactos.
- **Embarque por arrastar** Actor ou Token para a área Tripulação da ficha, com alternativa por token selecionado. Nesta primeira versão, cada tripulante precisa ter token na mesma cena da nave.
- **Tripulação por token de veículo**, para não misturar os passageiros de duas naves do mesmo tipo. Funções: piloto, copiloto, operador e passageiro.
- **Visibilidade por veículo**: modo Oculto (padrão: apenas a nave aparece) ou Visível (tokens dos tripulantes acompanham a nave). A opção pode ser trocada pelo Mestre sem alterar fichas originais.
- **Movimento conjunto**: mudar as coordenadas do veículo transporta seus passageiros; os passageiros embarcados não podem arrastar independentemente o próprio token. A movimentação técnica dos passageiros não deve gastar ações de movimento. A pilotagem por usuários depende das permissões nativas do Foundry para o Actor Veículo.
- **Desembarque**: devolve o token à cena próximo ao veículo, recupera sua visibilidade anterior e remove seu vínculo com a nave.
- **Escopo e limitações da 1.0**: apenas uma cena por viagem; sem transferência entre cenas, sem combate veicular dedicado ou automação de permissões por função. O Mestre deve evitar mover/deletar os tokens ocultos à mão e usar Desembarcar. Testar no Foundry v14 antes da aprovação.
- Preservados os seis compêndios e as automações e regras de combate existentes. Nenhuma publicação automática no GitHub.

## v0.2.141 — Correção da expiração de condições por turno (2026-11-04)

- Corrigido `powerConditionExpiryDecision`: condições nativas configuradas para durar **1 turno do alvo** (incluindo Atordoado) não são mais removidas na vez do próximo participante ou na passagem de rodada.
- Após o primeiro turno afetado, a condição expira **apenas quando a iniciativa retornar ao mesmo combatente**, inclusive ao passar da Rodada Bônus para a Rodada 1.
- Preservadas as durações ancoradas no atacante (`round`), condições manuais, MMDR e Central de Automações.
- Corrigidos testes legados que aceitavam a remoção prematura; novos cenários de regressão cobrem múltiplos participantes e Rodada Bônus.
- Nenhuma migração de dados. Efeitos já removidos prematuramente antes da instalação não podem ser restaurados automaticamente.

## v0.2.140 — Revisão de estabilidade: inicialização e atualização das fichas (2026-11-04)

- **Recuperação de condições:** corrigida a inicialização das observações de Health. A rotina era registrada no evento `ready` depois de esse evento já ter ocorrido; agora inicializa imediatamente quando seus hooks são ativados e renova as observações em `canvasReady`. O comportamento de cura de Sangrando, os testes de remoção e as regras de combate não foram modificados.
- **Eventos de combate e fichas abertas:** eventos simultâneos de criação/atualização de combate e combatentes passam a solicitar no máximo uma atualização das fichas por quadro visual. Mudanças apenas nas flags do combate deixam de provocar renderização de fichas; alterações de rodada, turno, estado ativo, participantes e cena continuam sendo consideradas.
- **Testes de estabilidade:** testes para inicialização pós-`ready`, agrupamento dos eventos de combate e preservação dos gatilhos relevantes; verificação adicional dos caminhos de módulos, estilos, idiomas e arquivos LevelDB do manifesto.
- **Escopo:** não modifica poderes, fórmulas, dano, MMDR, HUD, estrutura visual, automações salvas ou dados dos compêndios. Não requer migração do mundo. Recomenda-se validação no Foundry v14, pois a suíte é automatizada e não mede desempenho em sessões reais.

## v0.2.139 — Otimização conservadora das automações por alvo (2026-11-04)

- **Condições nativas de poderes:** assinatura da rolagem, decisões individuais do Mestre, confirmação de dano e metadados de cada poder são consultados uma única vez por processamento de card, em vez de novamente para cada alvo. A defesa, o acerto, a redução e a aplicação de condições continuam individuais por alvo.
- **Automações personalizadas por alvo:** para cada personagem atingido, a decisão de acerto e Sucesso Fantástico é avaliada uma vez e reutilizada somente pelas regras que correspondem ao mesmo poder. A condição exigida, o destinatário e os efeitos de cada regra continuam sendo avaliados separadamente.
- **Segurança de rerrolagens:** nenhuma decisão, resultado ou rolagem é guardada entre mensagens ou chamadas. Novas rolagens e alterações de Edge/Trouble continuam forçando avaliação atualizada. O registro de efeitos já executados no card permanece preservado, inclusive com múltiplos alvos.
- **Escopo:** otimização do processamento no card. Nenhuma mudança de fórmulas, dano, MMDR, duração, HUD, interface, compêndios ou configurações. Não requer migração de mundo.
- **Validação:** testes novos reproduzem três regras em dois alvos, resultados distintos para cada alvo, proteção contra duplicidades e reconciliação das condições após uma nova rolagem. Ganhos de desempenho no Foundry real ainda precisam ser medidos.

## v0.2.138 — Otimização conservadora das fichas de personagem e NPC (2026-11-04)

- **Itens preparados em uma única passagem de serialização:** as fichas `ActorSheetV2` reutilizam os itens já destacados no `Actor#toObject(false)`, evitando repetir `Item#toObject(false)` para cada poder, arma e traço a cada renderização. Quando um Actor não disponibiliza a lista de itens no snapshot, a rotina anterior continua como fallback.
- **Atributos derivados preservados:** o contexto de exibição mantém a cópia independente de `actor.system.toObject(false)`, para continuar mostrando valores calculados como NON-COMBAT CHECKS e impedir alterações acidentais no DataModel original.
- **Agrupamento de inventário:** fichas de personagem e NPC passam a atribuir os grupos de itens ao contexto somente após classificar tudo, inclusive em fichas vazias, em vez de repetir várias atribuições para cada item.
- **Biografia:** textos estáticos sem referências dinâmicas não são enriquecidos novamente quando seus conteúdos, permissões e idioma não mudaram. Edições, alteração de permissões, mudança de idioma e links ou rolagens dinâmicos continuam atualizando normalmente.
- **Salvamento de campos:** eventos de alteração de um valor escalar idêntico ao já armazenado não solicitam `Actor.update()` desnecessariamente. Novas alterações continuam usando o fluxo individual de persistência do Foundry v14.
- **Escopo:** otimizações de preparação e persistência visual das fichas. Sem alterações de layout, fórmulas, poderes, efeitos, HUD, MMDR, combate ou compêndios. Não há migração de dados.
- **Validação:** testes de regressão de fichas, serialização de inventário com 514 poderes, textos dinâmicos, edição, permissões e salvamento; repetir a suíte completa sobre o ZIP extraído. Ganhos em tempo de abertura e FPS ainda dependem de medição no Foundry real.

## v0.2.137 — Otimização da prévia de movimento e iniciativa (2026-11-04)

- **Etiqueta de distância/movimento sem reconstrução por quadro:** durante o arrasto de tokens, os elementos da linha principal e do aviso secundário são criados uma vez e reutilizados. Texto, estado de movimento excedido e avisos continuam atualizados; o conteúdo não é mais recriado no DOM a cada atualização de mouse.
- **Barra compacta de iniciativa:** quando uma atualização não muda os combatentes, rodada, turno ou imagem, a barra não recalcula repetidamente o posicionamento por `getBoundingClientRect()`. Mudanças reais do conteúdo, redimensionamento da janela e alterações da posição salva continuam reposicionando a barra.
- **Escopo:** exclusivamente apresentação e desempenho. Nenhuma alteração em regras de combate, cálculos de movimento, transmissão temporária de prévias, permissões, fichas, automações, MMDR ou compêndios.
- **Testes:** regressão das prévias de distância e avisos, atualização de estado, reutilização de nós DOM, reposicionamento da iniciativa e testes de sistema completos. O ganho de desempenho ainda deverá ser confirmado no Foundry real.

## v0.2.136 — Otimização dos eventos do HUD (2026-11-04)

- **Atualizações incrementais em combate:** os eventos de mudança de turno/rodada e de cartões do chat continuam acionando a leitura de recursos, Concentração, movimento e condições, mas deixam de **forçar** a reconstrução da grade de poderes quando os atalhos não mudaram. A assinatura de itens/poderes existente continua acionando a reconstrução quando necessário.
- **Active Effects sem listeners duplicados:** havia dois ouvintes para cada evento de criação, alteração e remoção de efeitos. Agora há somente um por evento. Alterações de efeitos do personagem selecionado continuam atualizando integralmente comandos contextuais (por exemplo, remover condição); mudanças em outros alvos atualizam a apresentação de forma incremental para preservar Concentração e poderes sustentados.
- **Coalescência preservada:** mudanças simultâneas de combate/chat são processadas no mesmo quadro visual (requestAnimationFrame), com prioridade ao redesenho completo se um evento relevante ocorrer durante o intervalo.
- **Segurança:** nenhuma mudança na lógica de ações, reações, dano, Focus, condições, iniciativa, poderes, MMDR, HUD clássico/persistente ou preferências de favoritos. Os seis compêndios são idênticos à v0.2.135. Os ganhos de FPS não foram medidos em jogo real.
- **Testes adicionais:** roteamento de eventos, não duplicação de hooks, atualização de efeito local, preservação de atualização por Item e agrupamento de eventos em um quadro.

## v0.2.135 — Otimização conservadora de atualização dos HUDs (04/11/2026)
- **Atualização incremental dos indicadores:** Concentração, movimento atual e ícones de condições dos HUDs clássico e persistente preservam seus elementos DOM quando o estado exibido não muda; continuam sendo reconstruídos quando há alteração real de personagem, condição, concentração ou modo de movimento.
- **Ações, reações e quatro setas de movimento:** substituição dos elementos apenas quando a quantidade ou o consumo muda, mantendo leitura do rastreador oficial do combate e sem armazenar um segundo estado de recursos.
- **Seis botões de atributos no HUD persistente:** reutilização dos botões, com atualização pontual de valor, tooltip e permissão, inclusive na alternância entre NON-COMBAT CHECKS e valores de combate.
- **Segurança:** caches `WeakMap` associados aos nós visuais, descartados automaticamente quando a interface é removida. Sem alterações de regras, fichas, automações, compêndios, cálculos de rolagem, favoritos ou movimento.
- **Testes:** regressões novas comprovam ausência de reconstruções desnecessárias e atualização correta quando dados mudam. Validar também no Foundry real antes de aprovar como estável.

## v0.2.134 — Correção da duração de efeitos elementais de 1 rodada (03/11/2026)
- Efeitos elementais de status temporários (ex.: Ice → Paralisado) que atingem um combatente não expiram mais na simples virada da rodada: o alvo recebe seu turno afetado e o efeito termina quando volta a vez desse alvo.
- Para esses efeitos o temporizador nativo de `1 rodada` é substituído por uma marca de expiração vinculada ao turno do alvo; a remoção ocorre somente para o Active Effect criado pela automação elemental, sem remover condições preexistentes.
- A limpeza agora antecede o aviso de condições no chat, evitando anunciar um efeito no turno em que ele acabou.
- Corrigido o mesmo tipo de contagem para as demais condições elementais temporárias de uma rodada quando o alvo está na iniciativa.
- Nenhuma alteração nas regras da Central de Automações, no MMDR ou nas animações.

## v0.2.133 — Aviso de condições elementais no início do turno (2026-11-02)
- **Correção de disparo do chat:** o hook de avanço do combate não depende mais da presença de `combat.previous`. Em Foundry v14, essa referência pode estar ausente ou incompleta, inclusive com rastreador compacto ou após mudanças de rodada; antes isso impedia o resumo das condições de ser publicado. Agora o turno atual é processado quando há um avanço solicitado; navegação comprovadamente regressiva continua ignorada.
- **Efeitos elementais nativos:** o aviso reconhece metadados de `elementalFantastic` e informa a duração de efeitos como **Paralisado (Ice) por 1 rodada**, além da descrição e da forma de remoção presentes no mesmo catálogo do indicador superior.
- **Sem duplicação:** o controle por ID de combate, rodada, turno e combatente permanece. Atualizações repetidas do mesmo turno não repetem o card. A rotina não aplica nem remove condições e não muda o ciclo de vida de efeitos de Elemental Blast, MMDR ou Concentração.
- **Teste de regressão:** reproduz Zima aplicando Paralisado ao Pensativo Sentinel, avançando o turno com `combat.previous` ausente ou parcial. Garante anúncio, duração, deduplicação e ausência de alterações nos efeitos. Também cobre retrocesso de turno.
- **Distribuição:** seis compêndios e conteúdo de poderes preservados; pacote completo para Foundry VTT v14.

## v0.2.132 — Chat de Condições com descrições do indicador (2026-11-02)
- **Avisos no início do turno:** cada condição ativa exibe o **nome, duração restante, descrição e orientação de remoção**, quando houver. As descrições e instruções são as mesmas do indicador superior de condições, inclusive personalizações do Mestre.
- **Fonte única:** o indicador publica o catálogo já carregado (condições nativas e edições do mundo) para os avisos de turno; evita duplicar descrições e perder atualizações.
- **Remoção:** prevalece a instrução personalizada da automação quando fornecida; do contrário, usa a orientação do indicador. Se o indicador não especificar como remover, o chat não inventa testes ou dificuldades.
- **Segurança:** todo conteúdo inserido pelo Mestre é escapado antes de chegar ao chat. Sem botões de remoção no chat nem mudança nos controles de duração, efeitos ou permissões do indicador.
- **Regressão:** testes cobrem Cego, Em Chamas, Agarrado, condições personalizadas, notas de remoção e escaping de HTML. Os seis compêndios mantidos sem modificações.

## v0.2.131 — HUD 3.4: Non-Combat Checks fora das rodadas (2026-11-02)
- **Atributos do HUD persistente e do HUD clássico:** fora de uma rodada de combate iniciada, os seis botões exibem `system.abilities.<atributo>.noncom` (os mesmos valores derivados apresentados na coluna **NON-COMBAT CHECKS** da ficha). Dentro do combate, continuam exibindo `system.abilities.<atributo>.value`.
- **Rolagem coerente com os valores exibidos:** ao usar os botões de atributo fora do combate, a fórmula emprega `@abilities.<atributo>.noncom`; durante o combate, conserva a rolagem existente com `.value`. Uma rolagem de Melee fora do combate não é interpretada como ataque pelo simples fato de haver alvo marcado.
- **Atualização imediata:** a apresentação acompanha a entrada/saída de rodadas e mudanças nos valores dos atributos, sem precisar reabrir o HUD.
- **Escopo:** sem mudanças no cálculo nativo de atributos, demais atalhos, poderes, MMDR, HUD de condições, movimentos, favoritos, automações ou compêndios.

## v0.2.130 — HUD 3.3: tooltips compactos de condições (2026-11-02)
- **Indicadores de condições do HUD clássico e persistente:** tooltip e rótulo acessível mostram apenas o **nome da condição** (ex.: `Confuso`), sem duplicar duração nem instrução de remoção já disponíveis no indicador nativo do Foundry.
- **Indicador `+N`:** quando existirem mais de cinco condições, lista somente os nomes das condições adicionais.
- **Escopo:** nenhuma alteração nos Active Effects, expiração, avisos de turno, movimento, favoritos, concentração, automações ou regras de combate. Seis compêndios preservados.

## v0.2.129 — HUD 3.2 (2026-11-02) — Movimentos nativos e atalhos por coluna
- **Mesmos ícones do Foundry:** indicador de movimento lê `CONFIG.Token.movement.actions` (ícone ou imagem) para representar o modo selecionado no Token HUD. A ação nativa `blink` agora aparece corretamente como **Teleporte (Piscar)**. O teleporte temporário concedido por poderes segue priorizado via flag do Combatant; nenhuma mudança no controle de movimento.
- **Ordenação global dos atalhos:** favoritos **A–Z** primeiro e depois demais atalhos **A–Z**, independentemente de serem poderes próprios, armas ou poderes anexados. A estrela continua apenas indicativa; clique esquerdo usa o atalho e direito alterna favorito.
- **Grade persistente por colunas:** preenche de cima para baixo e só depois avança para a direita, sem lacunas artificiais, respeitando largura disponível e rolagem. HUD clássico utiliza a mesma ordenação de nomes, em sua lista.
- **Segurança:** nenhuma alteração nos cálculos de combate, MMDR, Concentração, automações, Active Effects ou compêndios.

## v0.2.128 — HUD 3.1 (2026-11-02) — Favoritos com clique direito e organização dinâmica
- Clique **direito** em atalhos de poderes, armas equipadas e poderes vinculados a itens para alternar Favorito; clique **esquerdo** mantém o uso normal de `Item.roll()`/poder.
- Favoritos sempre aparecem primeiro, no topo à esquerda, e são salvos separadamente por usuário e personagem; estrela do tamanho original é apenas sinalização.
- HUD persistente preenche a grade da esquerda para direita e de cima para baixo, sem lacunas artificiais e ajustando o número de colunas ao tamanho disponível.
- Indicadores maiores e ordem fixa: **Concentração → modo de Movimento atual → condições ativas**, em ambos os HUDs.
- Nenhuma alteração nas regras de combate, MMDR, Concentração ou movimentação; dados dos compêndios preservados.

## v0.2.127 — HUD 3.0 (2026-11-02)

- HUD clássico e persistente: visual levemente modernizado com mais contraste, estados de foco e detalhes de borda, sem mudar dimensões configuradas, consumo de ações ou execução dos itens.
- Condições ativas aparecem no HUD com ícone nativo, duração e instrução de remoção no tooltip, utilizando a mesma leitura de condições que a Central de Automações já usa para avisos de turno.
- Concentração: indicador compacto `usada/limite`, derivado do rastreador nativo, mostrando os nomes dos poderes sustentados ao passar o mouse.
- Favoritos: ícone de estrela nos atalhos de poderes e armas. Preferências por personagem e por usuário (scope client), sem alterar fichas ou compêndios. Favoritos são priorizados na ordem da lista; no HUD persistente são priorizados na grade.
- Todos os indicadores são informativos; não há novas automações, ações ou alterações no motor de combate.
- Testes de regressão específicos do HUD 3.0 e conferência dos compêndios dentro do ZIP.

## v0.2.126 — Reposição dos seis compêndios no ZIP e diagnóstico de índices vazios (2026-11-02)

- **Correção urgente do pacote v0.2.125:** o ZIP anterior omitiu os seis arquivos LevelDB `000002.log` dos compêndios, apesar de o código-fonte conter os dados. Isso fazia os compêndios parecerem vazios e provocava 398 erros de poderes ausentes na Central de Diagnóstico.
- **Compêndios restaurados no ZIP:** Powers (398 registros), Traits, Tags, Origins, Occupations e Items. Os bancos são preservados da v0.2.124, incluindo as correções e os IDs da v0.2.122. Nenhum poder foi recriado artificialmente.
- **Diagnóstico mais claro:** se o índice completo de um compêndio estiver vazio, a Central emite um erro de pacote vazio e não centenas de falsos erros individuais de poderes ausentes.
- **Regressão de empacotamento:** teste para verificar os seis arquivos de dados e seus arquivos de controle. A integridade do **ZIP final**, e não apenas do diretório de desenvolvimento, também deve ser conferida na geração da release.
- **Instalação:** faça backup do mundo e instale o ZIP completo com o Foundry totalmente encerrado; depois reinicie o servidor e execute novamente o diagnóstico. A ferramenta de diagnóstico não modifica fichas nem compêndios por conta própria.
- **Escopo:** nenhuma alteração nas regras de combate, Central de Automações, HUD, efeitos visuais ou compêndios do mundo.

## v0.2.125 — Central de Diagnóstico 1.0 (2026-11-02)

- **Nova Central de Diagnóstico exclusiva para o Mestre** nas configurações do Multiverse-D616. Interface em ApplicationV2 com identidade visual coerente com a Central de Automações. Execução **sob demanda e somente leitura**; não realiza correções automáticas.
- **Compêndios:** verifica a presença dos seis compêndios do sistema, lê os índices e compara os IDs e nomes de Powers com o catálogo incluído no Charactermancer. Distingue registros faltantes, nomes divergentes e poderes adicionais. Uma fonte inacessível faz a comparação aparecer como **não verificada**, nunca como sucesso.
- **Automações e Biblioteca:** valida os dados brutos das regras salvas, detecta IDs duplicados, gatilhos/efeitos inválidos, referências a poderes personalizados e exceções de grupos não reconhecidos. Mantém intactas as opções do Mestre; poderes personalizados são informativos, não erros automáticos.
- **Fichas e efeitos:** conta fichas, poderes e efeitos ativos/cadastrados; sinaliza poderes sem nome, condições do namespace do sistema não registradas e metadados inválidos de duração/dano contínuo. Não marca condições de módulos externos como defeituosas apenas por não estarem no sistema.
- **Integrações opcionais:** informa a disponibilidade do Sequencer; alerta apenas quando regras habilitadas dependem de VFX e o módulo não está ativo. Não exige Sequencer para funcionar nem para executar o diagnóstico.
- **Relatório exportável em JSON:** inclui versão, verificações realizadas, ocorrências classificadas por gravidade e referências técnicas. O Mestre decide quando exportar/compartilhar; o relatório pode conter nomes de fichas e do mundo.
- **Segurança e escopo:** nenhuma operação que altere documentos, compêndios, módulos, configurações ou automações. Sem teste de combate simulado, sem reabrir desenvolvimento de Animações ou da Central de Automações. As rotinas de combate e os 398 poderes permanecem como na v0.2.124.

## v0.2.124 — Correção pontual: Speed Blast aplica Caído no alvo (2026-11-02)

- **Speed Blast:** corrigido o destinatário de **Caído** em Sucesso Fantástico. O efeito estava marcado incorretamente como `self`, derrubando o atacante. Agora a vítima atingida recebe **Atordoado** por 1 turno e, em Sucesso Fantástico, também **Caído**. Nenhuma condição do Speed Blast é aplicada ao atacante.
- **Rerolagens e prevenção de duplicidade:** o mecanismo existente continua removendo Caído quando o resultado é alterado para acerto comum e ambas as condições em caso de falha, sem remover efeitos manuais não relacionados. O card não cria efeitos repetidos.
- **Escopo:** correção apenas no mapeamento da condição e teste de regressão com atacante e alvo diferentes. Mantidos os 398 poderes, os compêndios, a Central de Automações, o HUD e os demais efeitos de combate.

## v0.2.123 — Auditoria Geral dos Poderes: fase 2 (2026-11-02)

- **Revisão dos 12 casos** do relatório v0.2.121, baseada no texto dos efeitos já incluídos no catálogo. Sem modificar os 398 registros nem o compêndio do Foundry.
- **Oito testes não danosos:** Command Animal (teste situacional), Time Travel Other, Dimensional Travel Other, Multiversal Travel Other, Webcasting, Speed Blast, Steal Power e Steal Powers passam a emitir testes de defesa sem botão de dano, preservando suas condições nativas e decisões narrativas.
- **Reação não danosa:** Hurled Shield Deflection não solicita uma rolagem de ataque inexistente no seu texto; mantém o fluxo de ativação/reação e os controles de escudo do sistema.
- **Ataques danosos:** Brain Drain passa a processar dano em Focus (Ego vs Vigilance); Supernova passa a processar dano em Health (Ego vs Resilience), **metade** em sucesso comum e **total** no Fantástico; o Banging Heads da categoria Martial Arts passa a ser reconhecido como ataque danoso, tal como a variante de Super-Strength.
- **Banging Heads:** exigir dois alvos marcados antes da ativação e só gerar o card de dano se **ambos** forem atingidos pela rolagem; condição Caído já automatizada permanece vinculada ao dano confirmado. Mesma verificação nas duas versões do poder.
- **Limites declarados:** a recuperação de Focus do lançador descrita em Brain Drain não foi automatizada nesta fase; seleção/posicionamento de área de Supernova e transferências de poder/viagem continuam dependendo da decisão do Mestre. As rotinas existentes não passam a inventar esses resultados.
- **Prevenção:** auditoria agora não sinaliza erroneamente uma reação sem rolagem como ataque; novos testes cobrem classificação, dano, condições e regra conjunta de dois alvos. Todos os ajustes ocorrem no resolvedor, sem sobrescrever itens dos mundos.

## v0.2.122 — Compêndio Powers: restauração de seis poderes ausentes (2026-11-02)

- **Correção do compêndio:** restaurados os seis itens existentes no catálogo do Charactermancer, mas ausentes do banco LevelDB do compêndio `MMRPG Content / Powers`: **Control Emotion, Control Group Emotion, Sense Emotion, Sway Emotion, Iconic Item e Power Cosmic**.
- **Causa raiz:** o compêndio era idêntico nas versões 0.2.120 e 0.2.121; as seis ausências eram anteriores à auditoria. Não havia exclusão feita pela v0.2.121.
- **Correções de nomes:** quatro itens com ID correto, mas nome divergente, foram harmonizados com o catálogo: Invisibility → Mirror Images, Extend Invisiblity → Extend Invisibility, Elemental Richochet → Elemental Ricochet e Steal Powers → Steal Power. Efeitos, atributos, pastas e IDs foram mantidos.
- **Preservação:** mantidos os 392 registros anteriores, com somente as quatro correções pontuais de nome. Os seis itens restaurados foram copiados do catálogo original, preservando IDs e descrição, sem alterar fichas existentes ou automações.
- **Auditoria preventiva:** teste automático de correspondência por ID e nome entre os 398 poderes do catálogo e o banco LevelDB distribuído; também valida as quatro entradas da Telepatia.
- **Motor:** mantida a correção da v0.2.121 para testes de Ego contra Ego sem dano direto. Nenhuma alteração adicional nas rolagens.
- **Instalação:** atualize o sistema completo e reinicie o Foundry para recarregar o índice do compêndio. Faça backup do mundo antes de instalar; os compêndios do mundo e personagens já importados não são modificados.

## v0.2.121 — Auditoria Geral dos Poderes: fase 1 (2026-11-02)

- **Auditoria baseada no catálogo:** análise automatizada dos 398 poderes do Charactermancer, conferindo metadados, resoluções de ataque/defesa, campos de ações e anomalias de importação. Relatório `POWER_AUDIT.md` incluído no ZIP; nenhum julgamento das regras oficiais é feito sem validar o texto correspondente.
- **Correção de 4 poderes de Telepatia:** Control Emotion, Control Group Emotion, Sense Emotion e Sway Emotion agora rolam Ego vs defesa Ego como **testes sem dano**. Seus registros importados vinham com `attack: true`, mas sem defesa, e poderiam acionar indevidamente o processamento de dano. O ajuste conservador é aplicado somente pelo resolvedor de rolagem, sem reescrever compêndios ou fichas.
- **Prevenção de regressões:** adicionada auditoria sem efeitos colaterais e testes cobrindo catálogo completo, itens legados, danos de outros poderes e lista de possíveis inconsistências para revisão futura.
- **Pendências não alteradas:** 12 entradas com `attackKind` mas sem classificação de dano/check, a divergência de campos de Environmental Protection e descrição resumida ausente de Iconic Weapon. Sem alteração automática por falta de confirmação específica da regra.
- **Compatibilidade:** Central de Automações 5.0, MMDR, VFX, HUD, Charactermancer, equipamentos, manuais e configurações existentes permanecem sem mudanças funcionais além dos quatro testes de Telepatia.

## v0.2.120 — Central de Automações 5.0: Biblioteca, exportação e importação (2026-11-02)

- **Biblioteca de Automações:** nova aba independente da lista de automações ativas, com armazenamento de modelos no mundo, navegação, instalação de cópias e remoção confirmada.
- **Guardar modelo:** cada regra do Mestre pode ser guardada como modelo inativo, preservando gatilho, poder, condição, resultado, todas as ações ordenadas (até 8), durações, recuperação, dano extra e dano contínuo.
- **Compartilhamento JSON:** exportação de todas as automações pessoais ou dos modelos da biblioteca; importação de arquivos JSON validados, com confirmação do número de novos modelos e duplicatas ignoradas. Formato próprio versionado e sem código executável.
- **Instalação segura:** importar não executa nada; instalar um modelo cria uma nova regra desativada e não altera as regras nativas nem substitui regras pré-existentes. Identidades dos mundos anteriores não são reutilizadas.
- **Validação:** arquivo de no máximo 1 MB e 100 entradas; todos os campos passam pelo mesmo normalizador e whitelist do criador; erros de importação cancelam todo o lote; duplicatas idênticas não sobrescrevem, variantes são permitidas; apenas Mestre pode modificar.
- **Compatibilidade:** regras legadas continuam válidas e são convertidas em sequências de um efeito somente ao exportar. Configurações existentes preservadas; sem alteração do motor de combate/MMDR, compêndios ou manuais.

## v0.2.119 — Central 4.7: dano contínuo personalizado (2026-11-02)

- **Criador de Automações:** novo tipo `Dano contínuo por turno (Health/Focus)` com quantidade por turno (1–100), recurso afetado (Health/Focus) e duração de 1–20 turnos do personagem atingido; disponível como efeito principal ou adicional das regras do Mestre.
- **Efeito controlado por combate:** cria um ActiveEffect temporário com flags próprias. Começa a causar dano no próximo início de turno do destinatário, acompanha a quantidade de ativações e remove-se ao concluir ou encerrar o combate. Não modifica nem prolonga condições nativas existentes.
- **Motor/MMDR:** cada tick reutiliza a aplicação nativa de dano, com tratamento de Health/Focus, redução de dano (5 por nível, conforme dano contínuo do HUD) e proteções pessoais; dano pode ser absorvido ou reduzido a zero. Não cria um card de confirmação adicional a cada turno, pois se trata de dano recorrente automático.
- **Chat:** publica o dano efetivo e os turnos restantes no início do turno afetado. Só o Mestre ativo processa os efeitos. Travamento e checkpoint por turno evitam lançamentos duplicados ao receber eventos de combate repetidos.
- **Compatibilidade:** automações anteriores continuam com seus formatos originais. A nova opção não permite scripts nem ignora outros efeitos; sem combate ativo ou personagem na iniciativa, a regra não cria um dano recorrente sem duração verificável. Documentação e testes atualizados.

## v0.2.118 — Central 4.6: multiplicadores personalizados de dano (2026-11-02)

- **Novo modo de dano no Criador:** em `Modificar dano (cálculo nativo/MMDR)`, além de valor fixo e atributo, o Mestre pode escolher **Multiplicar dano calculado ×2 ou ×3**. Exige gatilho `Após acertar um alvo` e permite filtros por sucesso comum/Fantástico e condição no atacante/alvo.
- **Integração com o motor nativo:** bônus fixos e de atributos entram na base do cálculo antes das regras especiais. O multiplicador personalizado atua **sobre o dano já calculado** (depois da RD e do fator especial/Fantástico). `damage` e `rawDamage` são multiplicados conjuntamente antes de criar o card e seguem para MMDR, barreiras e confirmação pelo Mestre.
- **Sem duplicidade/exagero:** caso mais de uma regra multiplicativa se aplique ao mesmo alvo, vale **apenas o maior multiplicador** (×2 ou ×3); eles não se multiplicam entre si. Dano originalmente zero permanece zero. Multiplicador não cria ataque nem subtrai Health diretamente.
- **Editor atualizado:** opções de ×2 e ×3 no efeito principal e nos efeitos adicionais, prévia da regra, persistência, edição, salvamento automático e compatibilidade com as regras existentes sem migração manual. A sequência de condições, cura, mensagens e VFX mantém o fluxo anterior.
- **Escopo:** modificadores de dano para ataques de poderes com alvos confirmados; não adiciona dano contínuo, nem modifica a categoria Health/Focus, nem altera poderes nativos ou compêndios.
- **Entrega:** ZIP completo instalável para Foundry v14; README e MIGRATION_NOTES atualizados, sem modificar os manuais nem publicar no GitHub.

## v0.2.117 — Central 4.5: dano adicional personalizado no cálculo nativo (2026-11-02)

- **Novo efeito no Criador:** `Dano adicional (cálculo nativo/MMDR)` configurável dentro das sequências da Central, para o gatilho **Após acertar um alvo**. Modos: valor fixo de 1 a 100 ou valor do atributo Melee, Agility, Resilience, Vigilance, Ego ou Logic do atacante. Podem coexistir até oito efeitos por regra.
- **Bônus condicionais:** o Mestre pode exigir acerto ou Sucesso Fantástico confirmado e uma condição no lançador ou no alvo. O bônus é calculado isoladamente para cada alvo efetivamente atingido, usando o resultado e a defesa já resolvidos pelo motor. Erros, alvos pendentes e poderes diferentes não recebem o modificador.
- **Integração antes da confirmação:** o bônus entra no parâmetro de dano da própria rotina `calculatePowerDamage` ao GERAR o card, somado aos bônus existentes, antes do fator de dano especial/Fantástico e com RD nativa aplicada na fórmula. `rawDamage` para barreiras e `damage` para MMDR já chegam atualizados ao card. Não há segundo débito de Health/Focus após o Mestre confirmar.
- **Casos especiais:** poderes com fator zero continuam sem dano em sucessos comuns. Dano por atributo usa o valor atual da ficha no momento de criar o card; valores negativos não geram bônus. Bônus por efeito limitados e total protegido contra números fora dos limites.
- **Fluxo MMDR preservado:** proteção/barreiras, meio dano, RD, diferenciação Health/Focus, decisões individuais de alvo, confirmação do Mestre e proteção contra duplicidade seguem pelo pipeline existente. Efeitos adicionais (Condição, Chat, Cura, Sequencer) mantêm sua execução pós-confirmação.
- **Compatibilidade:** regras de versões anteriores lidas sem migração; o novo tipo só pode ser criado com gatilho por alvo. HUD, compêndios, dados de mundo e manuais mantidos. ZIP completo entregue para instalação manual, sem publicação no GitHub.
- **Limitação:** esta etapa acrescenta dano à fórmula do poder. Não cria um ataque separado, não altera multiplicadores/RD arbitrariamente, não inventa dano contínuo e não converte ataques sem dano em ataques ofensivos.

## v0.2.116 — Central 4.4: múltiplos efeitos por automação (2026-11-02)

- **Editor de sequência:** o Mestre pode associar **1 a 8 efeitos ordenados** à mesma regra; botões para adicionar, remover e mover efeitos. Cada condição recebe sua própria duração (manual, turnos ou rodadas) e instrução de remoção; cada cura/mensagem tem seu valor/texto próprio.
- **Motor nativo compartilhado:** uma regra por Sucesso Fantástico validado pode aplicar condição, recuperar Health e publicar mensagem em ordem, para cada alvo realmente atingido, depois da confirmação de dano do MMDR. Gatilhos de turno e rolagem de poder continuam usando as rotinas anteriores.
- **Animação opcional:** novo efeito para reproduzir a animação já configurada na aba Visuais do poder via Sequencer, somente para gatilhos de poder ou acerto. Não se configura arquivo JS nem mídia arbitrária na Central; sem módulo ou animação válida a etapa visual é ignorada, sem bloquear os demais efeitos.
- **Edge/Trouble:** podem compor sequências de rolagem de poder, mas entram **antes** da rolagem; efeitos posteriores executam após o evento de rolagem. Regras passivas continuam limitadas a modificadores de rolagem e Edge/Trouble pós-acerto continua proibido.
- **Antiduplicação granular:** para ataques confirmados, cada efeito possui sua própria chave de execução por regra e alvo, impedindo uma segunda cura/mensagem se outra etapa falhar e precisar ser repetida. Cards antigos com chave única são respeitados.
- **Compatibilidade:** regras existentes das versões 0.2.109–0.2.115, com somente um efeito, são lidas como sequência de um efeito, sem regravar configurações do mundo na instalação. Os 107 controles nativos, HUD, compêndios e motor de dano permanecem inalterados.
- **Limitação intencional:** esta versão **não adiciona dano numérico personalizado**. Dano adicional exige integração específica ao cálculo/redução e confirmação do MMDR para não bypassar barreiras nem aplicar DR duas vezes.
- ZIP integral entregue para instalação manual, sem publicação automática no GitHub. Manuais do Mestre e do Jogador permanecem independentes e sem alteração.

## v0.2.115 — Central 4.3: salvar edições ao fechar ou trocar de regra (2026-11-02)

- **Correção de perda de edições:** ao editar uma regra existente, o fechamento da Central e a seleção de outra regra aguardam o salvamento dos campos modificados no mundo. O botão **Salvar automação** continua disponível.
- **Aviso de salvamento:** o editor diferencia configuração salva, alterações pendentes e nova regra. Novas regras continuam exigindo **Salvar automação** para evitar criar automações incompletas ao fechar.
- **Erros não são silenciosos:** se a validação do formulário ou a gravação de configurações falhar, a Central não fecha nem troca de regra, preservando os dados digitados para correção.
- **Compatibilidade:** nenhuma alteração nos gatilhos, efeitos, automações nativas, durações, condições existentes ou chaves persistidas. O salvamento continua limitado ao Mestre.

## v0.2.114 — Central 4.2: duração e avisos de condições (2026-11-02)

- Criador de Automações: ao aplicar condição, o Mestre escolhe duração até remoção, de 1 a 20 turnos do alvo ou de 1 a 20 rodadas. Pode informar também uma orientação personalizada para remover a condição.
- Condições criadas pela Central passam a usar ActiveEffects nativos do Foundry v14, com metadados de duração em flags e expiração por avanço real de combate. Condições já presentes não são substituídas nem prorrogadas.
- No começo do turno, o chat informa as condições ativas do personagem, tempo restante e forma de remoção: regras nativas verificadas para Sangrando, Em Chamas e Envenenado, ou orientação do Mestre quando fornecida. Não são inventados testes ou TNs para outras condições.
- Evita notificações duplicadas por turno, preserva autorizações do Mestre ativo, mantém condições permanentes e remove efeitos temporários personalizados ao apagar o combate.
- Regras salvas nas versões anteriores recebem por padrão duração até remoção, sem migração destrutiva; todos os controles e recursos anteriores permanecem intactos.
- Observação: turnos e rodadas exigem combate ativo e participação do alvo na iniciativa; efeitos já existentes anteriores à versão não passam a expirar retroativamente.

## v0.2.113 — Central de Automações 4.1: destino explícito e teste Fast Attacks (2026-11-02)

- **Correção de experiência do Mestre:** o gatilho **Ao rolar um poder** passa a avisar claramente que aplicar condição/recuperar Health age no **próprio personagem**, não no alvo. O dado M sozinho não é um acerto.
- **Conversão guiada de regras existentes:** botão **Converter para efeito no alvo atingido** no editor, preservando nome, poder e efeito. Quando a regra exigia M, a conversão exige **Sucesso Fantástico confirmado contra o alvo**; caso contrário, exige acerto comum. O Mestre revisa e salva, sem migração silenciosa.
- **Detecção do dado Marvel:** a execução do gatilho de M também lê o dado original da estrutura D616 serializada no ChatMessage, evitando depender exclusivamente de propriedades opcionais da mensagem.
- **Regressão com Fast Attacks:** novo teste de fluxo completo com M, acerto confirmado, confirmação de dano pelo Mestre e condição Confuso no alvo; deduplicação e preservação do atacante verificadas.
- **Compatibilidade:** mantém as 107 exceções nativas, regras personalizadas anteriores, dados de mundo, mecanismos de combate/Concentração, manuais e compêndios. Nenhuma automação existente é alterada automaticamente; não há publicação no GitHub.

## v0.2.112 — Central de Automações 4.0: seleção de poderes e integração por alvo (2026-11-02)

- **Seletor de poderes:** lista pesquisável pelas opções nativas do navegador, a partir dos Itens de Poder dos atores do mundo e dos índices dos compêndios de Itens acessíveis ao Mestre. Mantido campo manual para homebrew ou poderes ainda fora do catálogo; nenhuma ficha ou compêndio é modificado.
- **Novo gatilho “Após acertar um alvo”:** a regra utiliza `getMarvelOutcome`, `normalizeConditionDefense` e `adjudicateTargetOutcome` do motor existente. Mestre escolhe qualquer acerto ou Sucesso Fantástico confirmado por alvo; M no dado isolado não basta.
- **Alvo da automação:** aplicar uma condição, recuperar Health ou enviar mensagem para cada alvo validado, verificando condição opcional no lançador ou no alvo. Edge/Trouble permanece exclusivamente pré-rolagem.
- **Dano e múltiplos alvos:** para ataques com dano, o efeito aguarda o card MMDR confirmado e jamais dispara em dano bloqueado; condições de ataque sem dano são resolvidas contra defesas reais. Decisões ambíguas de Edge/Trouble aguardam a revisão manual do Mestre. Barreiras atravessadas não liberam efeitos do alvo protegido.
- **Segurança e repetição:** cada automação por alvo executa uma vez por alvo e por card original; edição de dados, rerender do chat e confirmação repetida não reaplicam curas. Efeitos já criados não são automaticamente revertidos quando um resultado é alterado posteriormente. Regras de Concentração e duração continuam exclusivas do mecanismo nativo, sem inferência a partir do texto do poder.
- **Compatibilidade:** 107 controles nativos e regras das versões 0.2.109–0.2.111 mantidos. Configuração de mundo sem migração destrutiva, testes de regressão atualizados. Manuais preservados; GitHub não publicado.

## v0.2.111 — Central de Automações 3.2: Edge/Trouble para poderes ativos (2026-11-01)

- **Criador de Automações:** gatilho "Ao rolar um poder" agora oferece Edge e Trouble no próprio ataque. Escolha o nome do poder e o escopo (corpo a corpo, à distância ou todos) para executar antes da rolagem, integrado ao resolvedor de condições.
- **Elemental Blast:** exemplo pronto de Edge à distância. Como o poder de catálogo já concede Edge nativo, o criador evita contabilizar a mesma vantagem duas vezes quando a regra personalizada é idêntica.
- **Condições:** ampliadas as opções de pré-requisito e aplicação para as condições regulares do catálogo do sistema; reservados para seus fluxos próprios Concentração, Agarrado (físico/de poder) e Escudo Arremessado.
- **Validação:** Edge/Trouble condicionado ao resultado Marvel M da própria rolagem é rejeitado (o bônus deve existir antes de lançar os dados). Gatilhos de turno continuam com efeitos instantâneos e não simulam bônus temporários futuros.
- Mantidas as regras existentes, os oito grupos nativos, as 107 exceções, os poderes passivos e o estado de rolagem da v0.2.110. Configurações anteriores preservadas; não exige migração.

## v0.2.110 — Criador de Automações 3.1: poderes passivos e Edge/Trouble (Foundry VTT v14) — 01/11/2026

- **Blazing Fast Fists e poderes permanentes:** novo gatilho `Passiva: ao realizar um ataque`. Exige que o personagem tenha o poder indicado em seus Itens de Poder; enquanto o poder estiver na ficha, o modificador é consultado em cada ataque, sem clicar/rolar a própria habilidade passiva. Quando o poder é retirado, o modificador para de existir.
- **Resultados personalizados:** novas ações passivas `Conceder Edge (vantagem)` e `Impor Trouble (desvantagem)` com escopo `Ataques corpo a corpo`, `Ataques à distância` ou `Todos os ataques`, além de condição prévia opcional. As regras são computadas no resolvedor compartilhado de Edge/Trouble e somadas/canceladas com condições já existentes. Rolagens que só testam atributos, sem ataque, não recebem o benefício.
- **Editor guiado:** formulário adapta campos e opções conforme o gatilho; exemplo preenchível de Blazing Fast Fists. Validação rejeita efeitos passivos em gatilhos de turno e vice-versa. Sem código livre, escrita de Active Effects ou modificação dos poderes originais.
- **Fluxos integrados:** poderes/armas cujo dado esteja marcado como ataque, ataques adicionais, ricochetes e rolagens Melee do HUD ou macro de atributo quando há alvo marcado. Na ausência de um tipo de ataque reconhecido, regras corpo a corpo/à distância não presumem a categoria; `Todos os ataques` continua aplicável. A regra passiva só beneficia quem possui o poder, não todos os personagens do mundo.
- **Compatibilidade:** chaves e regras existentes da v0.2.109 preservadas, 107 controles nativos preservados e manuais independentes não alterados. Pausa geral e pausa das regras personalizadas interrompem também os modificadores passivos. Instalação por ZIP completo; GitHub não publicado automaticamente.

## v0.2.109 — Central de Automações 3.0: criador de regras + rolagem preservada (Foundry VTT v14) — 01/11/2026

- **Correção de rolagem:** a lista das rotinas nativas preserva `scrollTop` em interações, expansões, pesquisas e salvamentos; o estado é guardado também ao alternar entre as abas. A lista de regras próprias tem rolagem independente do editor.
- **Nova aba "Minhas Automações":** editor sem programação com nome, gatilho, condição opcional, ação resultante, opção de habilitar/desabilitar, edição e exclusão confirmada. Regras gravadas nas novas configurações de mundo `customAutomationRules` e `customAutomationsEnabled`.
- **Mecanismo executável:** gatilhos ao rolar um poder específico (opcional M no dado, sem confundir com acerto), início e fim de turnos avançados. Condição opcional prévia no próprio personagem. Efeitos: aplicar uma condição nativa permitida, recuperar 1–100 Health respeitando o máximo ou enviar mensagem escapada ao chat. Só o Mestre ativo executa; eventos de mensagens e turnos são deduplicados em memória.
- **Segurança e escopo:** validação estrita de entrada, limite de 100 regras, nenhuma execução de código arbitrário. Efeitos aplicados ao conjurador/personagem do turno; não há manipulação de alvos do ataque, conclusão de dano nem testes de sucesso até implementações futuras. A pausa geral inclui personalizadas; pausa individual não modifica as nativas.
- **Compatibilidade:** 107 controles da v0.2.108 preservados, sem alterar configurações anteriores e com regras próprias desligadas apenas ao pausar; novos mundos começam sem regras próprias. Manuais não alterados, ZIP integral para publicação manual.

## v0.2.108 — Central de Automações 2.0 (Foundry VTT v14) — 01/11/2026

- **Controles individuais auditados em mais quatro grupos:** ataques adicionais (Unstoppable Assault, Unrelenting Smash, Hellfire Chains, Coiling Crush, Rico-Shield e Elemental Ricochet), efeitos de Sucesso Fantástico por elemento (14 elementos com efeito automático), condições contínuas (Envenenado, Em Chamas, Sangrando, Corroído), Flames of the Faltine e Healing Factor, e remoção automática de Sangrando ao curar. Os interruptores chamam verificações reais no motor correspondente — não são apenas visuais.
- **Dependências e estados efetivos:** a Central verifica também a opção independente de dano automático do HUD de Condições. Mostra aviso quando desligada e sinaliza Em Chamas/Sangrando/Corroído como dependentes; diferencia pausa global, grupo desativado, exceção individual e dependência ausente.
- **Interface:** nomes e descrições específicos para poderes, condições e elementos; filtro **Só alteradas**; pesquisa preservada; contadores ajustados para rotinas configuráveis; indicação clara de Concentração e Turn Tracker como grupos indivisíveis por segurança das regras.
- **Compatibilidade:** continuam as nove configurações originais mais o mesmo objeto `automationPowerOverrides` da v0.2.107, preservando automaticamente exceções anteriores e mantendo tudo ligado por padrão. Não muda o custo de Focus, o controle de ações, as regras de dano/defesa ou os efeitos já aplicados. A desativação individual atua nas próximas execuções; efeitos em andamento expiram/removem-se pelas regras existentes.
- **Entrega:** ZIP integral e README atualizado com a documentação permanente da Central 2.0. Manuais independentes não alterados; publicação do GitHub continua manual.

## v0.2.107 — Central de Automações (Foundry VTT v14) — 01/11/2026

- **Nova Central de Automações:** acesso em **Configurações → Configurar Configurações → Multiverse-D616 → Abrir Central de Automações**, exclusivo para Mestres. Interface própria em ApplicationV2, visual escuro, contadores, categorias expansíveis e pesquisa de poderes ou comportamentos.
- **Oito grupos originais preservados:** painel geral com chaves independentes; botão **Pausar todas** suspende temporariamente as automações opcionais sem apagar escolhas dos grupos nem de poderes. O menu substitui a apresentação das nove opções soltas na tela de configurações. Configurações de mundo antigas permanecem exatamente com as mesmas chaves e valores, sem migração.
- **Exceções reais por poder:** nas categorias **Condições automáticas** e **Dano especial**, cada poder com rotina específica tem controle independente (padrão: ligado). Desligar um poder impede novas condições automáticas desse poder ou sua fórmula especial de dano, respectivamente, sem desligar os demais poderes. Nas outras seis categorias há apenas o controle geral, identificado claramente na interface. As exceções são mantidas num novo objeto de configurações do mundo, inicialmente vazio.
- **Compatibilidade:** sem alterar efeitos que já estão ativos (continuam com seus ciclos normais), fórmulas padrão, dano manual, jogadas, botões de condições ou a lógica do HUD, movimento, combate e Concentração. A interface guarda as preferências imediatamente no mundo, com tratamento de falha de gravação e bloqueio de gravações concorrentes.
- **Testes:** catálogo pesquisável, compatibilidade das chaves anteriores, prioridade dos três níveis (geral/grupo/poder) e proteção contra configuração individual inválida.
- README atualizado somente com documentação permanente sobre a Central. Manuais independentes mantidos; ZIP completo para instalação, sem publicar no GitHub.

## v0.2.106 — Ação/Reação/Movimento também no HUD clássico (Foundry VTT v14) — 31/10/2026

- Adicionada uma faixa compacta entre as abas **ABILITIES / POWERS** e a lista de atalhos do HUD clássico: **Ação e Reação à esquerda** (círculos marrom/azul, ícones brancos), **quatro setas de Movimento à direita** (verdes ou cinzas e frações de 25%).
- A faixa utiliza a mesma função `hudResourceState` e o mesmo renderizador do HUD persistente, sem copiar contadores nem alterar regras; atualiza com consumo, recuperação, Rodada Bônus e renovação na Rodada 1, seleção e atualizações de combate.
- Visibilidade privada: apenas o combatente realmente selecionado na cena e em combate, sujeito a permissões; não exibe indicadores de alvos em hover nem no mapa. Oculta a faixa fora de combate, no HUD minimizado e no modo persistente.
- Preservados os ícones no retrato do HUD persistente, a organização de powers/armas, a iniciativa, a sincronização de distância e as correções da v0.2.105.
- README e manuais independentes sem alterações; GitHub não publicado automaticamente.

## v0.2.105 — Renovação de recursos entre Rodada Bônus e Rodada 1 (Foundry VTT v14) — 31/10/2026

- Corrigida a transição após iniciativa Fantástica (Marvel Die = M): o participante da Rodada Bônus passa a ter um banco de recursos próprio, independente do seu turno na Rodada 1.
- Na entrada da Rodada Bônus, uma renovação explícita registra a fase `bonus` mesmo quando o primeiro participante já ocupa o índice zero da iniciativa e não ocorre mudança numérica de turno.
- Ao terminar a Rodada Bônus, a primeira pessoa da Rodada 1 recupera Ação Padrão, Reação e Movimento integralmente, incluindo o caso em que foi a última pessoa a agir na fase bônus e o índice de turno continua zero.
- Gastos de recursos, movimentação e renovações usam uma fila serializada por combatente no Mestre para impedir que um gasto da fase anterior sobrescreva uma renovação recém-aplicada.
- A renovação permanece individual: outros combatentes aguardam seu próprio turno; a fase bônus não concede recursos extras fora da transição definida.
- Mantidos HUD no retrato do personagem, iniciativa compacta, sincronização de movimento, ações e habilidades da v0.2.104; README e manuais mantidos. Publicação no GitHub continua manual.

## v0.2.104 — Recursos privados no retrato do HUD persistente (Foundry VTT v14) — 31/10/2026

- Nova apresentação: Ações Padrão e Reações em círculos brancos sobre fundo marrom/azul na parte superior do retrato do personagem; as quatro setas de Movimento aparecem na parte inferior, mantendo o progresso em quartos (incluindo frações).
- Indicadores são exibidos **somente no HUD persistente do token selecionado e participante do combate**; nenhuma Ação/Reação/Movimento é mostrada no mapa, sobre tokens de aliados ou inimigos, nem ao passar o mouse sobre alvos. O Mestre pode selecionar qualquer combatente para inspecionar seu próprio painel; jogadores veem somente seus tokens controlados.
- Mantidos o estado autoritativo do Turn Tracker, velocidade/movimento temporário de Teleporte e atualização em tempo real por `updateCombatant`, início/fim de combate e seleção. Sem cópia de contadores nem escrita de flags.
- Habilidades (Melee, Agility, Resilience, Vigilance, Ego e Logic) com fonte maior, valores mais legíveis e fundo preto; rolagens e botões mantidos.
- O retrato continua clicável para abrir a ficha; camadas de ícones não capturam eventos do mouse.
- Barra de iniciativa compacta e régua de distância sincronizada permanecem; renderização de ícones sobre tokens removida (canvas e fallback HTML).
- Sistema completo e instalável. Sem atualizar o GitHub; README e manuais não alterados.

## v0.2.103 — Régua nativa silenciosa, ícones brancos e distância próxima — 31/10/2026

- **Eliminada a duplicação do Foundry v14:** o sistema deixa de desenhar linhas, pontos de rota, indicadores de caminhada e balões nativos de movimento do token. A alteração atua exclusivamente nos estilos e na etiqueta visual do `TokenRuler`, sem tocar no registro, cálculo, custo, pontos ou execução do movimento. A régua manual (tecla R) permanece independente. Ao desligar a medição nativa do Multiverse, a visualização original do Foundry retorna.
- **Ícones corrigidos:** SVGs do punho e escudo têm preenchimento branco explícito para renderização consistente no PIXI; desenho interno ampliado de 12 para 15 pixels e cor de desenho branca, preservando os círculos marrom/azul e a camada inferior aos tokens.
- **Distância mais próxima:** etiqueta ancorada no topo do token, centrada e posicionada imediatamente acima dos ícones de Ação/Reação; evita o afastamento causado pelo deslocamento vertical duplicado na v0.2.102.
- **Mestre e jogadores:** a prévia transmitida pela rede inclui a posição de ancoragem, mantendo o mesmo posicionamento em outros clientes. Mantidos o HUD persistente, o foco simultâneo (seleção + hover), as quatro setas e as demais regras.
- README e manuais independentes inalterados. GitHub não atualizado automaticamente.

## v0.2.102 — Refinos dos indicadores e da medição nativa (Foundry VTT v14) — 31/10/2026

- Removidas da visualização as decorações extras de medição do arrasto (balões/caixas pretas secundárias com valores acumulados), mantendo apenas a prévia principal do Multiverse-D616.
- A pill principal de distância/reposicionamento agora é ancorada acima dos indicadores de Ação/Reação para não disputar espaço com os ícones do token.
- Indicadores de Ação e Reação reposicionados alguns pixels mais acima para melhorar a leitura.
- Indicadores do canvas agora usam assets vetoriais locais (`.svg`) para recuperar a nitidez dos desenhos originais de punho, escudo e setas de movimento.
- Mantidas as correções da v0.2.101: hover em alvos visíveis, seleção + hover simultâneos e movimento abaixo do nome do token.

## v0.2.101 — Correções visuais e foco simultâneo dos indicadores (Foundry VTT v14) — 31/10/2026

- Restaurados os desenhos originais dos indicadores: punho (Ação Padrão), escudo (Reação) e setas verdes/cinzas de Movimento. As imagens Font Awesome Free agora são PNGs locais integrados ao sistema, independentes da fonte de ícones do navegador (atribuição/licença em `ui/compact-combat-icons/ATTRIBUTION.txt`).
- Seleção do token e hover sobre outro são **simultâneos**: o personagem controlado não perde os indicadores quando o Mestre ou jogador aponta outro combatente.
- Um jogador pode visualizar indicadores de um **alvo visível** ao passar o mouse, mesmo que não seja proprietário do alvo; tokens ocultos para o jogador não revelam dados. Só combatentes presentes no combate recebem indicadores.
- Indicador de Movimento deslocado para uma posição **abaixo do nome do token**, fora da área da etiqueta. Mantida a renderização em camada anterior à imagem dos tokens e a escala constante durante zoom.
- Fallback HTML também suporta dois conjuntos (seleção + hover) e o deslocamento do movimento.
- Mantidos sincronização de régua da v0.2.100, HUD persistente, lógica de combate e demais recursos. README e manuais inalterados, GitHub permanece sob atualização manual.

## v0.2.100 — Prévia de movimento compartilhada e indicadores abaixo dos tokens (Foundry VTT v14) — 31/10/2026

- **Sincronização:** durante o arrasto de um token, a régua de distância, o modo de movimento, os espaços restantes e o aviso sobre uso da Ação Padrão são transmitidos em tempo real por socket para todos os clientes que podem ver o token, especialmente o Mestre. Todos recebem a mesma informação mostrada pelo jogador que está movimentando.
- **Somente prévia:** envio temporário limitado a aproximadamente 12 quadros por segundo. A linha desaparece ao soltar/cancelar/mover a peça ou após período sem atualizações. O rastreador de movimento e a contabilização oficial continuam nativos e inalterados.
- **Camada visual:** ícones de Ação, Reação e quatro frações do Movimento passam a ser desenhados no canvas primário, em camada entre o mapa e os tokens (sortLayer 650, abaixo dos tokens em 700). Combatentes próximos não ficam encobertos por ícones.
- **Foco:** um único combatente exibe indicadores por vez: prioridade ao token sob o mouse, depois ao último selecionado. Jogadores veem os recursos apenas dos tokens que controlam; o Mestre pode selecionar ou inspecionar qualquer combatente visível. Sem foco, os indicadores desaparecem.
- **Compatibilidade:** se a renderização gráfica do cliente estiver indisponível, há fallback de indicadores HTML limitado ao token em foco. A barra de iniciativa, HUD persistente, regras, automações e manuais permanecem inalterados.
- **Testes:** regressão de preview remoto, parada de arrasto, controles de visibilidade/permissão, zoom, quantidade e ordem dos ícones, e compatibilidade com v0.2.99. ZIP completo para atualização manual no GitHub.

## v0.2.99 — HUD persistente redimensionável e hotbar inteligente (Foundry VTT v14) — 27/10/2026

- Para o Mestre, o HUD persistente desaparece quando nenhum token está selecionado, liberando automaticamente a hotbar nativa do Foundry para macros. Ao selecionar um token novamente, o HUD persistente retorna e a hotbar nativa é ocultada.
- Mantido para jogadores o comportamento anterior: personagem atribuído continua visível mesmo quando nenhum token está selecionado.
- O botão de minimizar do modo persistente foi substituído por um controle no canto superior direito: arraste para a direita/esquerda para mudar a largura, para cima/baixo para mudar a altura. O modo clássico preserva sua minimização original.
- A área dos poderes reorganiza os atalhos alfabeticamente, preenchendo colunas de cima para baixo conforme a largura disponível, com rolagem vertical quando a altura não comportar todos os poderes. Ícones permanecem quadrados de 39 px, sem superposição.
- Dimensões escolhidas são salvas individualmente para cada usuário; alteração não muda o motor de ataque, dano, Focus ou efeitos de equipamento.
- README e manuais mantidos; pacote único completo para atualização manual do GitHub após validação.

## v0.2.98 — Correção definitiva do grid do HUD persistente (Foundry VTT v14) — 26/10/2026

- Corrigido o conflito entre o layout antigo de cinco colunas flexíveis (`1fr`) e o novo layout vertical: os atalhos agora usam colunas explícitas de 39 px e cinco linhas, eliminando o esmagamento e a aparência de ícones sobrepostos.
- Preservada a ordem alfabética, com preenchimento de cima para baixo e depois da esquerda para a direita; a largura continua acompanhando a quantidade de colunas.
- Corrigida também a regra responsiva para manter largura fixa dos ícones em janelas menores, com rolagem horizontal quando necessário.
- Mantidos a posição vertical da v0.2.97, os indicadores vermelhos de equipamentos, os tooltips, o HUD clássico e as automações existentes.
- Acrescentado teste de regressão específico do conflito CSS. Validado visualmente em Chromium nas resoluções 1366×768, 1920×1080, 800×800 e 620×720 com diferentes números de atalhos, sem sobreposição.
- `README.md` e manuais não alterados; GitHub permanece sem publicação automática.

## v0.2.97
- HUD persistente: reduziu a margem inferior para aproximar a dock da borda inferior da tela, sem voltar a ficar escondida atrás da barra do sistema.
- HUD persistente: corrigiu a sobreposição visual dos ícones, fixando posicionamento relativo e recorte interno das células do grid.
- HUD persistente: ajustou o reposicionamento da lista de jogadores para acompanhar a nova altura/offset da dock persistente.

## v0.2.96 — Correção de entrega e validação da dock persistente (Foundry VTT v14) — 26/10/2026

- Correção da estrutura do ZIP completo: pasta raiz obrigatória `multiverse-d616/` com todos os arquivos do sistema.
- Manifesto `system.json` atualizado e sincronizado com a versão e o caminho da release `v0.2.96`.
- Preservadas as melhorias de v0.2.95: dock mais alta para não cortar a quinta linha de ícones, deslocamento vertical e lista de jogadores posicionada acima do painel.
- Adicionadas verificações de regressão para altura da grade de cinco linhas, manifestação do sistema e política de documentação; documentação `README.md` e manuais preservados.
- Nenhuma modificação nas regras ou no motor de automações do D616. Publicação no GitHub permanece manual, após os testes no Foundry v14.

## v0.2.95
- HUD persistente: elevou a dock acima da borda inferior da tela para evitar corte atrás da barra do sistema operacional.
- HUD persistente: aumentou a altura total para acomodar corretamente a grade com 5 ícones por coluna sem sobreposição visual.
- HUD persistente: reposicionou a lista de jogadores para acompanhar a nova altura da dock persistente.


## v0.2.94
- HUD persistente: oculta a hotbar padrão do Foundry enquanto o HUD persistente estiver visível.
- HUD persistente: atalhos reorganizados em colunas de 5 ícones, preenchidos da esquerda para baixo e depois para a direita.
- HUD persistente: atalhos ordenados alfabeticamente com largura do painel ajustada ao número real de colunas.
- HUD persistente: poderes vindos de armas/equipamentos recebem destaque visual com borda vermelha.
- HUD persistente: atalhos associados a arma/equipamento passam a mostrar melhor o nome da origem no hover.
## v0.2.93 — Persistent HUD 2.1: dock no canto e atributos acionáveis (Foundry VTT v14) — 26/10/2026

- HUD persistente ancorado ao **canto inferior esquerdo**, sem margens laterais/inferiores e sem seletor de posição. A lista nativa de jogadores é reposicionada acima do painel enquanto o HUD expandido estiver visível.
- Hotbar de POWERS agora exibe **apenas ícones quadrados compactos** (39 × 39 px); nomes completos, inclusive equipamento associado, continuam disponíveis em tooltips e atributos de acessibilidade. Demais atalhos são acessíveis pela rolagem vertical.
- Seis atributos (**Melee, Agility, Resilience, Vigilance, Ego, Logic**) exibidos por extenso com valor abaixo; botões executam a mesma rotina `rollAbility()` do HUD clássico, preservando permissões, Edge/Trouble e demais efeitos existentes.
- Eliminada a aba ABILITIES do **modo persistente** (somente POWERS fica na área direita). Removido o botão Fixar; o painel segue o token selecionado ou, sem seleção, o personagem atribuído ao usuário. Configuração de posição retirada; preferências antigas ocultas continuam registradas para compatibilidade com mundos existentes.
- HUD tradicional permanece inalterado quando o modo persistente está desligado. Sem mudanças em combate, dano, Focus, Concentração, Active Effects, animações ou compêndios.
- README e manuais preservados; somente CHANGELOG e manifesto de versão atualizados. ZIP completo para instalação manual; GitHub não publicado automaticamente.

## v0.2.92 — Persistent HUD 2.0: hotbar horizontal compacta (Foundry VTT v14) — 26/10/2026

- Reformulado o HUD persistente opcional para visual de hotbar horizontal: retrato grande à esquerda, nome/Rank, barras de Health e Focus, Karma, seis atributos da ficha e grade compacta de atalhos à direita, próxima em organização ao Persistent HUD do PF2e HUD, sem copiar seus arquivos ou lógica.
- Abas ABILITIES e POWERS mantidas, agora com slots quadrados uniformes, ícones dos poderes/armas, nome compacto, texto detalhado no tooltip e acessibilidade pelo nome completo. Ações continuam usando os mesmos handlers e Item.roll() do D616.
- Até dez atalhos aparecem simultaneamente (duas linhas de cinco); outros atalhos permanecem acessíveis pela rolagem interna, sem exclusão de poderes. Os slots vazios são apenas visuais, sem clique ou tecla associada.
- Retrato abre ficha, fixação por proprietário e escolha de posição (inferior esquerda/central/direita) preservadas, assim como a opção individual de voltar ao HUD clássico.
- Visual responsivo para telas menores, sem ampliar painéis sobre o mapa; nenhuma mudança mecânica em Focus, ações, reações, condições, RD, poderes ou armas.
- CHANGELOG atualizado; README e manuais preservados. ZIP completo para atualização manual, sem publicação direta no GitHub.

## v0.2.91 — HUD persistente experimental D616 (Foundry VTT v14) — 26/10/2026

- Criado modo opcional **D616 — HUD persistente experimental** nas configurações individuais do usuário. Desativado por padrão para preservar integralmente o HUD clássico da v0.2.90.
- O modo persistente exibe um painel ancorado com retrato, Health, Focus, Karma, Rank e as abas ABILITIES/POWERS; as armas equipadas e poderes associados usam exatamente o motor de atalhos existente, sem duplicar lógica de combate.
- Botão **Fixar** permite manter um personagem com permissão de proprietário no painel mesmo quando outro token é selecionado. Sem fixação, o painel acompanha o token selecionado ou o personagem atribuído ao usuário.
- Clicar no retrato abre a ficha; ao usar um atalho de personagem fixado, o sistema seleciona seu token na cena, quando disponível, preservando os alvos e o fluxo existente de Item.roll().
- Configuração de posição individual: inferior esquerdo, central ou direito. Layout responsivo, com grade de poderes e rolagem vertical para múltiplos atalhos.
- Esta primeira etapa **não** inclui edição de slots por arrastar e soltar (prevista para evolução futura); a estrutura é original do D616 e apenas inspirada conceitualmente no Persistent HUD do PF2e HUD.
- README e manuais preservados. Nenhum arquivo do PF2e HUD foi copiado. Sem publicação automática no GitHub.

## v0.2.90 — HUD de POWERS compacto com uma coluna (Foundry VTT v14) — 26/10/2026

- Corrigida a largura mínima fixa de 294 px que deixava espaço vazio à direita quando a lista de POWERS tinha apenas uma coluna.
- A janela com uma coluna passa a ajustar-se automaticamente à **largura da maior célula + margens**, mantendo botões uniformes e seus rótulos completos, sem alargar cada atalho.
- O controle **↔ Largura** agora permite reduzir abaixo dos antigos 294 px quando o conteúdo comporta; ao soltar em uma largura que ainda suporta apenas uma coluna, o HUD encaixa no tamanho exato. Ao ampliar para duas ou mais colunas, a grade segue distribuindo da esquerda para a direita.
- O ajuste automático considera os poderes visíveis do personagem selecionado, sem sobrescrever a preferência salva ao trocar de ator. A aba ABILITIES mantém seu comportamento.
- Mudança exclusiva de layout: nenhuma alteração em ações, armas, poderes, Sequencer, dano, Focus ou regras. README e manuais preservados; changelog atualizado.

## v0.2.89 — HUD de atalhos com largura ajustável e células uniformes (Foundry VTT v14) — 26/10/2026

- HUD de **ABILITIES/POWERS** pode ser ampliado horizontalmente pelo novo controle **↔ Largura** na borda inferior. O tamanho escolhido é salvo por usuário; a janela continua movível como antes.
- Células de Poderes e Armas mantêm **a mesma largura dentro do HUD**, adaptando essa largura automaticamente ao maior nome exibido, como no comportamento anterior; as células não são esticadas individualmente quando a janela fica mais larga.
- Ao aumentar a largura, os atalhos se distribuem **da esquerda para a direita, de cima para baixo**, em múltiplas colunas; títulos **ARMAS EQUIPADAS** e **PODERES DOS ITENS** ocupam a linha inteira.
- Poderes vinculados a Armas ou Itens agora exibem **duas linhas**: nome do poder na primeira e **(Nome do equipamento)** na segunda, sem duplicar os botões nem modificar o modo de ativação.
- Mantidas as animações Sequencer/JB2A da v0.2.88, o cálculo de poderes, Focus, RD, condições e Concentração. `README.md` e os manuais não foram alterados; o GitHub não foi atualizado automaticamente.

## v0.2.88 — VFX persistentes vinculados à Concentração e camadas de token (Foundry VTT v14) — 25/10/2026

- Nova opção **Persistente (até terminar a Concentração)** na aba VISUAIS, inclusive no editor das cópias de poderes associados a armas/itens. Shield of the Seraphim tem Persistente habilitado por padrão, podendo ser desativado explicitamente.
- Nova opção **Camada da animação** (acima/abaixo do token) e escala ajustável para que escudos e auras apareçam por fora da figura; recomendamos 1,5–2 para escudos.
- Efeitos persistentes são anexados ao token e vinculados ao Active Effect próprio do poder em Concentração (`tieToDocuments`); encerram ao perder/remover/desativar a Concentração, e não duplicam ao renovar o poder. Nenhum efeito persistente é criado sem a Concentração correspondente.
- **Testar animação** continua reproduzindo uma prévia não persistente. Normalização de datapaths `JB2A.` maiúsculos para acesso à biblioteca Sequencer; animações não alteram regras, Focus, condições ou ações.
- README permanece documentação permanente; manuais não foram alterados. Nenhuma publicação automática no GitHub.

## v0.2.87 — Correção da visibilidade do seletor de animações (Foundry VTT v14) — 25/10/2026

- Corrigida a aba **VISUAIS** nas fichas de Poderes e Armas: o botão de acesso ao navegador Sequencer estava oculto atrás da camada decorativa `::before` do campo de texto.
- O botão **Abrir biblioteca de animações** agora aparece em linha própria logo abaixo do datapath, com contraste, foco de teclado e acesso à mesma pesquisa/prévia/seleção da v0.2.86.
- Corrigida também a visibilidade da legenda da opção **Ativada** nesse campo, preservando a configuração existente e sem alterar as permissões de edição.
- Mantida a biblioteca de efeitos e seu uso em poderes copiados para Armas/Itens. Nenhuma alteração nas regras, Focus, dano, movimentação, Concentração ou automações.
- Histórico registrado apenas neste CHANGELOG; README e manuais preservados.

## v0.2.86 — Navegador visual integrado ao Sequencer (Foundry VTT v14) — 25/10/2026

- Na aba **Visuais** de Poder e Arma, adicionado botão **Biblioteca** ao lado do datapath: abre um seletor próprio do D616 com pesquisa em português ou inglês, filtros por Fogo/Gelo/Energia/Teleporte/Proteção/Magia, visualização do arquivo (vídeo ou imagem) e **Selecionar esta animação**.
- Os resultados vêm exclusivamente das entradas públicas registradas pelo Sequencer em tempo de execução; preserva as bibliotecas realmente instaladas pelo jogador, sem inventar IDs ou exigir arquivos JB2A dentro do sistema. O campo continua aceitando datapaths/arquivos digitados manualmente.
- **Testar no mapa** no próprio navegador reproduz somente uma animação visual sobre o token selecionado, sem gastar Focus, Ação Padrão, Reação ou Movimento. O botão existente de testar o poder continua disponível na ficha.
- O editor de **Poderes associados a Armas/Itens** também permite abrir a biblioteca. A seleção preenche somente o campo da cópia; o usuário confirma a alteração ao clicar em **Salvar Poder**, sem alterar o poder original.
- Com Sequencer ausente/inativo ou biblioteca vazia, o sistema exibe aviso e preserva totalmente a utilização normal de poderes. Interface responsiva, navegação por teclado e resultados paginados (60 por vez) para bibliotecas extensas.
- Manuais do Mestre/Jogador preservados sem atualização; `README.md` mantido como documentação permanente, histórico exclusivo neste CHANGELOG. Nenhuma alteração intencional de dano, Focus, iniciativa, condições, efeitos ou movimento.

## v0.2.85 — Fase 1: animações visuais de poderes (Foundry VTT v14) — 25/10/2026

- Integração opcional com **Sequencer** (sem dependência obrigatória) para reproduzir animações ao usar Powers e Weapons, inclusive poderes associados a Armas/Itens; a reprodução acontece apenas após validações, consumo de Focus e registro da ação, sem afetar cálculos, alvos, dano ou Concentração.
- Nova aba **Visuais** nas fichas de Poder e Arma: habilitar/desabilitar a animação, informar arquivo local ou chave da biblioteca Sequencer/JB2A, escolher modo (automático, projétil, impacto no alvo ou no personagem), escala e executar teste visual sem custo de recursos.
- Editor de cópias de Poderes associados a equipamentos ganhou configuração visual independente, sem alterar o Poder original ou outras armas.
- Presets iniciais e conservadores quando a biblioteca disponibiliza as entradas: Elemental Blast de fogo (`jb2a.fire_bolt.orange`); Teleport 1/2/Blind e Blink (`jb2a.misty_step.02.blue`). Outros elementos, poderes e armas permitem associação manual; nenhuma mídia JB2A é distribuída no ZIP.
- Configuração global do Mundo **D616 — Animações dos Poderes (Sequencer)** permite desligar a camada visual. Em ausência de Sequencer, recurso desativado ou arquivo não localizado, a jogada prossegue normalmente. Somente os primeiros alvos selecionados (até 6) recebem VFX para evitar cargas excessivas.
- Mantido o `README.md` como documentação permanente: apenas o item de recurso nativo foi acrescentado. Os manuais do Mestre e Jogador permanecem inalterados conforme solicitação.
- Mudanças isoladas de interface e VFX; sem alterações intencionais no motor de regras, compêndios, ações, Focus, condições, RD e movimentação.

## v0.2.84 — Teleport v14 sem alteração de modo inválido (Foundry VTT v14) — 24/10/2026

- Corrigido `DataModelValidationError: movementAction: teleport is not a valid choice` ao usar Teleport 1/2, Teleport Blind e Blink. O poder não tenta mais gravar `teleport` em `TokenDocument.movementAction`, que aceita somente modos registrados no Foundry v14.
- Preservada a reserva temporária de teleporte no Combatant e o Active Effect no portador; a distância e o alcance continuam sendo calculados pela reserva especial e não gastam Caminhada/Voo. Após executar o movimento ou iniciar novo turno, a reserva é limpa, sem mudar o modo de movimento anteriormente escolhido.
- Mantida a recuperação de Ação Padrão, Reação e Movimento no **início do próprio próximo turno**, inclusive para quem participou da Rodada Bônus; não há restauração imediata de recursos só pela transição para Rodada 1.
- Adicionados testes de regressão para validação do modo do token, continuidade da reserva e renovação dos recursos. Sem mudanças no README e sem publicação no GitHub.

## v0.2.83 — Teleport e aviso antecipado de movimento adicional (Foundry VTT v14) — 24/10/2026

- Corrigida leitura do Rank dos personagens (`system.attributes.rank.value`) ao ativar Teleport 1/2, Teleport Blind ou Blink. A reserva temporária de deslocamento usa o Rank efetivo em vez de retornar 0.
- Fortalecida a criação do efeito visual de movimento temporário: duração compatível com Active Effects v14, e reserva de teleporte preservada caso falhe apenas a criação do ícone de efeito. Teleporte continua separado do movimento comum e é consumido no próximo deslocamento.
- Durante o arrasto, ao ultrapassar a velocidade normal da rodada e ainda possuir Ação Padrão disponível, aparece **abaixo da medição de distância** o aviso “Esse Movimento usará também sua Ação Padrão.”. Consumo autoritativo continua apenas ao soltar o token.
- A prévia distingue deslocamento sem Ação Padrão disponível ou além da capacidade total; o tooltip adapta seu tamanho/posição para não cortar a segunda linha.
- Documentação estável no README preservada; histórico registrado exclusivamente neste CHANGELOG. Sem publicação no GitHub.

## v0.2.82 — Recursos por rodada, teleporte e movimento extra (Foundry VTT v14) — 24/10/2026

- Medidor de distância recebe prioridade visual sobre HUD, etiquetas e dados de token durante medição, sem interceptar ponteiro.
- A chave de reinício do turno diferencia **Rodada Bônus** e **Rodada regular**: recursos são reiniciados no primeiro turno regular mesmo se o índice de combate for igual ao da Rodada Bônus. Continua restaurando ações/reação ao início de cada turno.
- Usar Teleport 1/2, Teleport Blind ou Blink cria um Active Effect temporário no portador e uma reserva de deslocamento de teleporte em espaços, acompanhada de seleção do modo Teleporte no token. O próximo deslocamento consome a reserva e remove o efeito sem abater Caminhada/Voo. Alcance em combate: 10×Rank para Teleport, Rank para Blink. A reserva não é uma velocidade permanente e expira ao novo turno. Teleportes de objeto/outros não concedem movimento livre.
- Movimento comum que ultrapassa a velocidade selecionada gasta automaticamente uma Ação Padrão disponível (como segunda Ação de Movimento), com aviso ao Mestre e ao proprietário; exceder o limite disponível gera alerta sem bloquear o token. O consumo e o movimento são registrados atomicamente no Combatant para evitar gasto duplo entre clientes.
- README mantido como documentação permanente; demais recursos do sistema preservados. Corrigidos somente os pontos acima.

## v0.2.81 — Refinamentos de distância e movimento nativo (Foundry VTT v14) — 24/10/2026

- **Visualização transitória:** a medição de deslocamento só é desenhada enquanto o token é arrastado; ao soltar ou confirmar o movimento, linha e tooltip são removidos imediatamente. Removido o armazenamento/desenho de trajetos anteriores do turno. A contagem autoritativa `movementUsed` e as quatro setas de movimento permanecem intactas.
- **Distância entre tokens durante combate:** passar o mouse sobre outro token mostra exatamente o mesmo texto simples `Distância: X espaços` utilizado fora de combate, sem acrescentar velocidade e restante do turno. O sistema também reconhece o combatente ativo quando não há token selecionado (respeitando propriedade e visibilidade).
- **Aviso Hover Distance:** ao entrar no mundo com o medidor nativo habilitado e o módulo `hover-distance` ativo, aparece um aviso único sugerindo desativar o módulo em Gerenciar Módulos para evitar sobreposição. A configuração do módulo não é modificada automaticamente.
- Corrigido possível erro `Uncaught` por movimento do ponteiro durante inicialização, antes de o canvas do Foundry v14 estar pronto.
- Mantidas as medições por modo de deslocamento e todos os recursos anteriores de combate, iniciativa, poderes e equipamentos. README permanece como documentação permanente; changelog registra a atualização.

## v0.2.80 — Distância e deslocamento nativos por modo de movimento (Foundry VTT v14) — 24/10/2026

- Integrado medidor nativo e independente do Hover Distance: ao selecionar um token e passar sobre outro, mostra a distância em espaços da cena; exibe linha informativa, sem interceptar cliques. Durante o arrasto de um token selecionado, mostra prévia da distância e o movimento disponível; segmentos já percorridos no turno podem ser visualizados. O rastreio é apenas informativo e não bloqueia movimento.
- O máximo de Movimento consumido pelo Controle de Turno e pelas quatro setas passa a ler a ação de movimento selecionada no token (`TokenDocument.movementAction`) e a velocidade de combate do modo correspondente na ficha (`system.movement.<modo>.value`). Assim Voo 30 utiliza 30 espaços, sem herdar Caminhada 5; não utiliza os multiplicadores fora de combate (`noncom`).
- Suporte explícito aos modos Caminhada, Voo, Natação, Escalada, Salto, Planar, Balanço e Levitação. Teleporte não cria reserva automática de movimento; configurações ausentes têm fallback seguro. Ações/Reações, fechamento de combate, concentração e o motor de dano não foram modificados.
- Configuração individual `nativeTokenDistance` permite desligar o visual caso deseje manter o módulo externo. O README recebeu apenas uma linha de recurso integrado; histórico permanece no CHANGELOG.
- Mantida a contagem autoritativa do Controle de Turno nas flags do Combatant, com sincronização pelo Mestre. Testes automatizados acrescentados para resolução de modos, distâncias e conservação do estado ao alternar modos.

## v0.2.79 — Barra de iniciativa móvel e botão Encerrar Combate (Foundry VTT v14)

- A barra compacta de iniciativa pode ser reposicionada arrastando a área **Rodada/Iniciativa** (ícone de alça). A posição é salva individualmente por usuário no navegador via configuração cliente do Foundry e restaurada ao reabrir a cena; o posicionamento é limitado à área visível, inclusive após redimensionamento da janela.
- Adicionado botão **Encerrar Combate** (bandeira quadriculada) na própria barra, disponível apenas para o Mestre durante combates iniciados. Reutiliza `turnTracker.controlCombat('end')`, com a confirmação já existente antes de finalizar, sem duplicar rotinas de encerramento.
- A área de arrastar não interfere nos botões de iniciar, voltar/avançar turno e abrir o controle tradicional. Indicadores sobre os tokens e cálculos de combate não foram alterados.
- Nenhuma alteração funcional ou conteúdo de atualização inserido no README; ele permanece com a documentação permanente do sistema.

## v0.2.78 — HUD compacto de combate (experimental, Foundry VTT v14) — 24/10/2026

- Novo modo visual de combate, ativado por padrão e **opcional por cliente** (`Combate — HUD compacto sobre tokens e iniciativa no topo`, nas configurações do sistema): ícones de Ação Padrão e Reação acima dos tokens, removidos à medida que os recursos são consumidos; quatro setas abaixo indicam 25% cada do Movimento total, com preenchimento proporcional ao movimento restante.
- Faixa horizontal no topo com retratos dos combatentes na ordem de iniciativa do Foundry; combatente ativo destacado, rodada e valor de iniciativa. Combatentes ocultos não aparecem para jogadores. Mestre possui controles de iniciar iniciativa, turno anterior e próximo turno.
- A nova interface consome os **mesmos estados sincronizados** do `turn-tracker` existente (uso de poderes/armas, reação, movimento e reinício de turno); não modifica a mecânica de turnos nem aplica limites adicionais a deslocamentos.
- A janela detalhada do Controle de Turno deixa de abrir automaticamente no modo compacto, mas pode ser aberta manualmente pelo botão na faixa superior ou ferramenta da camada Tokens; o modo anterior pode ser restaurado desligando a opção de cliente.
- Incluídos utilitários e testes de regressão para a visualização proporcional de Movimento, ações/reação, visibilidade e integração v14; nenhuma alteração de regras ou compêndios. O `README.md` recebeu apenas uma linha de recurso integrado e a descrição desta versão permanece exclusivamente neste `CHANGELOG.md`.

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
