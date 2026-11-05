## v0.2.141 — Expiração no turno correto do alvo (sem migração)

Condições nativas de 1 turno criadas por poderes agora permanecem no personagem durante os turnos dos demais participantes e só expiram quando a iniciativa retorna ao alvo após o primeiro turno afetado. Efeitos já removidos na versão anterior não são restaurados automaticamente; reaplique-os para o teste. Nenhuma alteração em compêndios, fichas ou configurações.

## v0.2.140 — Revisão de estabilidade (sem migração)

Não há migração de dados de fichas, efeitos, automações ou compêndios. Instale o ZIP completo com o servidor Foundry encerrado e mantenha um backup do mundo. Teste: abrir fichas de personagens/NPCs, iniciar combate, alternar turnos, criar/remover combatentes e atualizar condições de Sangrando. O fluxo de cura deve continuar removendo Sangrando conforme a regra; apenas a inicialização de observações e a frequência de atualização das fichas foram ajustadas.

## v0.2.139 — Processamento de automações e combate

Sem migração de dados. As automações salvas, condições ativas, configurações do Mestre e os seis compêndios são preservados. Instale o ZIP completo com o Foundry encerrado e backup do mundo. Para verificar, faça ataques contra múltiplos alvos, incluindo Sucesso Fantástico, rerrolagens Edge/Trouble e dano confirmado pelo MMDR; cada alvo deve receber apenas seus próprios efeitos uma vez. A mudança reduz leituras duplicadas dentro do mesmo card, sem armazenar resultados entre ataques.

## v0.2.138 — Otimização das fichas (sem migração)

Nenhuma migração de personagens, configurações ou compêndios é necessária. Feche o servidor Foundry v14, faça backup do mundo e substitua a instalação completa do sistema. Teste abrir fichas com muitos poderes, alternar abas, editar atributos, adicionar/remover poderes e verificar a biografia. Os textos com referências Foundry continuam sendo enriquecidos a cada atualização; campos inalterados não disparam gravações extras.

## v0.2.137

Nenhuma migração de dados do mundo é necessária. Otimização interna da prévia de movimento e da barra de iniciativa compacta.

## v0.2.136 — Otimização interna do HUD

- Não exige migração de dados do mundo nem reconfiguração de HUD, favoritos ou automações.
- Instale o ZIP completo com o Foundry desligado, preservando backup do mundo.
- Valide no Foundry: alternância de turnos, recursos Ação/Reação/Movimento, indicadores de condições e Concentração; adicionar/remover condições; inserir/remover poderes e atalhos de itens; atualizações de chat.

## v0.2.135 — atualização visual incremental (sem migração)
- Nenhuma migração de dados do mundo, fichas, compêndios ou preferências.
- Atualização restrita aos elementos DOM do HUD: botões e indicadores são reaproveitados quando seus valores não mudaram; os dados continuam vindo das rotinas já existentes.
- Faça backup, substitua a instalação completa com o Foundry encerrado e teste com um personagem dentro e fora do combate, incluindo mudanças de condição, concentração e movimento.

## v0.2.134 — efeitos elementais temporários
Sem migração obrigatória. Novas condições elementais com duração de uma rodada passam a ser controladas pelo retorno do turno do alvo, sem expiração nativa ao mudar de rodada. Efeitos antigos já criados podem manter seu temporizador original; reaplique-os para testar a correção.

## v0.2.133 — Avisos de condições elementais no chat
- Nenhuma migração de fichas ou configurações. As condições que já estiverem ativas passam a ser anunciadas no início do turno quando o Foundry não fornecer `combat.previous` completo.
- O texto do chat informa duração elemental de 1 rodada, descrição e remoção cadastradas no indicador superior, sem alterar as condições, seus efeitos ou quando expiram.
- Faça backup do mundo, instale o ZIP completo com o servidor encerrado e reinicie o Foundry. Teste Elemental Blast (Ice) com Sucesso Fantástico contra um alvo na iniciativa e avance até o turno dele.

## v0.2.132 — Avisos de condições no chat
- Nenhuma migração de fichas ou automações. O aviso do início do turno passa a incluir a descrição e a forma de remover cadastradas no indicador superior de condições.
- Para condições em que o indicador não informa a remoção, nenhuma instrução nova é presumida. A remoção manual no indicador continua com as permissões de antes.
- Atualize o ZIP completo com o Foundry desligado; os seis compêndios são preservados. Faça backup antes da instalação.

## v0.2.131 — HUD e Non-Combat Checks
- Não há migração de dados. As seis estatísticas do HUD refletem `abilities.*.noncom` fora de rodada e `abilities.*.value` durante combate ativo.
- As rolagens pelo HUD acompanham o valor exibido. Atalhos de poderes, armas e regras permanecem intactos.

## v0.2.130 — Tooltips compactos de condições no HUD

Nenhuma migração necessária. O HUD clássico e persistente agora exibem apenas o nome da condição no tooltip, mantendo ícones, efeitos ativos, expiração, avisos de turno e indicador de condições nativo do Foundry inalterados. Os favoritos, posição e tamanho do HUD são preservados. Instale o ZIP completo após fazer backup.

## v0.2.129 — HUD 3.2
Nenhuma migração de ficha ou mundo. Favoritos salvos na v0.2.128 permanecem associados aos mesmos itens; muda somente a ordenação dos atalhos e o ícone/identificação do movimento. `blink` é reconhecido como Teleporte (Piscar) no indicador HUD, sem reescrever `TokenDocument.movementAction`. A atualização preserva os seis compêndios; faça backup antes de instalar e teste com uma ficha que use o Teleporte do HUD nativo.

## v0.2.128 — HUD 3.1

Nenhuma migração de dados do mundo. A nova chave client `nativeActionHudFavorites` começa vazia; as configurações de posição, tamanho, aba e modo clássico/persistente são preservadas. O clique direito nos atalhos passa a alternar favoritos; o clique esquerdo continua executando a ação normal. A grade adaptativa reorganiza os favoritos no início. Indicadores apenas leem Active Effects, Concentração e modo de movimento do token selecionado.

## v0.2.126 — Reposição de compêndios omitidos na v0.2.125

**Backup recomendado:** copie a pasta de dados do mundo antes de instalar. Encerre totalmente o servidor Foundry VTT antes de substituir a pasta `Data/systems/multiverse-d616` pelo conteúdo do ZIP completo. Não mescle apenas arquivos `.mjs`: os seis bancos LevelDB e seus `000002.log` precisam acompanhar o pacote. Após iniciar o servidor, reabra `MMRPG Content` e execute a Central de Diagnóstico. Esperado: Powers com 398 itens e os demais cinco compêndios preenchidos. Não é necessário recriar poderes ou fichas. A ferramenta é somente leitura e não causou o desaparecimento dos registros. Caso tenha alterado manualmente compêndios do **sistema**, preserve backup deles antes de substituir a pasta do sistema.

## v0.2.125 — Central de Diagnóstico (nenhuma migração de dados)

- Ferramenta nova e independente, exclusiva para o Mestre; não altera o esquema de fichas nem o formato das automações.
- A execução é manual e somente leitura. Recomenda-se conferir o relatório antes de qualquer intervenção, mantendo backup do mundo.
- O sistema não corrige problemas automaticamente; erros de consulta são apresentados como não verificados.
- Instale o ZIP completo da v0.2.125 e reinicie o Foundry v14 para registrar a nova entrada de menu.

## v0.2.124 — Correção do destinatário de Speed Blast

Sem migração de dados. Reinstale o ZIP completo e reinicie o Foundry. A alteração atua em novas rolagens: em Sucesso Fantástico de Speed Blast, **Caído** passa a ser aplicado ao **alvo atingido**, nunca ao atacante. **Atordoado** continua no alvo por um turno. Se o atacante já tiver recebido Caído incorretamente em uma rolagem anterior, remova manualmente aquele Active Effect antigo, pois a atualização não apaga efeitos históricos do mundo. Faça backup antes de atualizar.

## v0.2.123 — Auditoria Geral dos Poderes, fase 2

Sem migração de dados. Os 398 registros do compêndio e as fichas existentes são preservados. O sistema corrige em tempo de execução a classificação de 12 poderes, distingue testes sem dano, reação sem rolagem e ataques danosos, e reforça os dois alvos obrigatórios de Banging Heads. Brain Drain calcula dano em Focus, mas sua recuperação correspondente continua manual; Supernova preserva metade do dano em acerto comum. Recomenda-se fazer backup do mundo e testar no Foundry antes de publicar a versão.

## v0.2.122 — Reposição de poderes do compêndio

Nenhuma migração das fichas ou das automações do mundo. O sistema traz seis itens que faltavam no compêndio **MMRPG Content → Powers** (quatro poderes de Telepatia, Iconic Item e Power Cosmic), com os mesmos IDs do catálogo do Charactermancer. Quatro nomes divergentes no compêndio também foram ajustados sem substituir os dados de poderes já importados nas fichas. Instale o ZIP completo, reinicie o Foundry (não apenas feche a janela do compêndio) e busque os poderes novamente. Backups e personalizações existentes não são reescritos. A correção do resolvedor de rolagens da v0.2.121 permanece intacta.

## v0.2.121 — Auditoria Geral de Poderes (2026-11-02)

- Atualização sem migração de mundo. A correção dos quatro poderes de Telepatia (Control Emotion, Control Group Emotion, Sense Emotion, Sway Emotion) ocorre no resolvedor de rolagens, inclusive quando itens legados ainda têm `attack: true` sem `attackTarget`.
- Os quatro poderes passam a ser tratados como testes Ego vs Ego **sem geração de dano direto**. Outros ataques e poderes personalizados são preservados. Faça um backup do mundo e valide com uma cena de teste antes de publicar.
- `POWER_AUDIT.md` documenta achados ainda pendentes de conferência humana, sem alterar as fichas/compêndios automaticamente.

## v0.2.120 — Central 5.0: Biblioteca de Automações (2026-11-02)

- A biblioteca é criada vazia como configuração de mundo (`customAutomationLibrary`), sem migração de regras nem ativação automática. Regras do Mestre existentes seguem funcionando sem alterações.
- Na aba **Minhas Automações**, cada regra tem **Guardar modelo**; o botão **Exportar minhas regras** baixa um JSON com todas as regras do mundo.
- Na nova aba **Biblioteca**, **Importar JSON** adiciona modelos após validação e confirmação, ignora duplicatas idênticas, sem substituir dados; **Exportar biblioteca** baixa o conjunto de modelos.
- **Adicionar às minhas regras** instala uma cópia inicialmente **desativada**, para revisão do Mestre. Modelos são dados puros; scripts e efeitos não reconhecidos são rejeitados.
- Arquivos têm formato `multiverse-d616.automations`, versão 1; limite 100 modelos por biblioteca/arquivo, máximo 1 MB por importação; cópias preservam gatilhos, condições, até 8 efeitos e suas durações, mas não IDs de origem nem ativação.
- Para trocar de mundo: exporte JSON no mundo de origem, carregue o JSON na aba Biblioteca do outro mundo, instale os modelos desejados e ative cada um intencionalmente.
- Controles nativos de automação e dados das fichas/compêndios não são incluídos no arquivo exportado. Sem publicação automática no GitHub; manuais independentes inalterados.

## v0.2.119 — Dano contínuo por turno

- Nenhuma migração manual: as automações salvas antes da 0.2.119 continuam válidas, incluindo suas sequências de efeitos e edições automáticas.
- Novo efeito `ongoingDamage` com `ongoingAmount` (1–100), `ongoingResource` (`health`/`focus`) e `ongoingTurns` (1–20); cria ActiveEffect temporário com a flag `multiverse-d616.customAutomationOngoing`.
- Somente no combate ativo com o personagem na iniciativa; dispara no **próximo início de turno** do alvo após a aplicação, não no próprio instante do ataque. A mesma regra e mesmo efeito não se acumulam enquanto durar no mesmo combatente.
- A cada tick o Mestre ativo aplica dano pelo MMDR nativo, respeitando RD e proteção pessoal, sem gerar novo botão de confirmação por turno. O chat mostra valor efetivo e tempo restante. Um efeito existente continua mesmo após desativar a criação de novas automações.
- Ao encerrar o combate, os efeitos contínuos criados pela Central são limpos. Faça backup do mundo antes de instalar e valide uma regra de Elemental Blast em um combate de teste.

## v0.2.118 — Multiplicadores de dano na Central

- Não exige migração. Regras existentes de `customAutomationRules`, incluindo bônus fixos/por atributo, continuam válidas; o novo campo `damageMultiplierFactor` usa opções fechadas ×2 ou ×3 apenas quando `damageBonusMode` é `multiplier`.
- O multiplicador atua sobre o dano calculado depois da Redução de Dano e das regras/Fantástico do poder, antes de gerar o card MMDR. O maior multiplicador prevalece quando duas regras se aplicam ao mesmo alvo; não há empilhamento entre regras. Os bônus fixos e por atributo continuam sendo somados à base como na v0.2.117.
- Cards de dano gerados antes da atualização mantêm seus valores antigos; é necessário realizar um novo ataque após ajustar a automação. Faça backup do mundo antes de atualizar e valide em uma cena de teste.

## v0.2.117 — Bônus de dano personalizados

- Nenhuma migração obrigatória. Automações 0.2.109–0.2.116 permanecem aceitas. A ação opcional `damageBonus` usa `damageBonusMode`, `damageBonusAmount` e `damageAbility`, sempre validada e restrita a `targetHit`.
- O bônus altera o cálculo do card de dano apenas quando este é gerado. Cards já criados não são reescritos; altere a regra e gere novo ataque/card para refletir alterações.
- O valor é somado como bônus de dano base antes do fator especial/Fantástico e respeita a Redução de Dano nativa (que reduz o Multiplicador de Dano), as barreiras e a confirmação do MMDR. Não é subtração adicional de Health.

## v0.2.116 — Sequências de efeitos

- **Não é necessária migração manual.** As regras anteriores (campos planos `effectType`, `effectStatus`, `healAmount`, `message` etc.) são interpretadas como uma lista com uma única ação. Ao salvar pelo editor da v0.2.116, a nova propriedade `effects` armazena as ações adicionais, preservando os campos compatíveis da primeira ação.
- Cada regra suporta até oito ações. Em gatilhos de ataque por alvo, o controle `customTargetExecutions` passa a acompanhar cada ação de regras com múltiplos efeitos, mas respeita as chaves de execução antigas para não repetir efeitos em cards de combate já processados.
- Animações novas referenciam a configuração visual já existente no poder, via Sequencer; continuam opcionais e não alteram fichas/compêndios.
- **Dano adicional customizado** não faz parte desta versão: continue usando o cálculo e aplicação de dano nativos do card MMDR.
- Faça backup do mundo, instale o ZIP integral e teste uma regra com condição + mensagem em um combate antes de publicar manualmente.

## v0.2.115 — Salvamento seguro ao editar regras

- Não exige migração. As regras do mundo em `customAutomationRules` permanecem no mesmo formato.
- Agora, fechar a Central ou escolher outra regra **salva automaticamente as edições de uma regra existente**. Para criar uma regra nova, continue clicando em **Salvar automação**.
- Se houver um valor inválido ou ocorrer um erro de gravação, a Central permanece aberta, evitando descarte silencioso. A dica abaixo do formulário mostra se há alterações pendentes.
- A aplicação retroativa de duração a efeitos já ativos não acontece; apenas alterações na regra são salvas.

## v0.2.114 — Duração e avisos de condições

- As regras antigas em `customAutomationRules` continuam válidas: duração ausente = `manual`.
- Opções novas `conditionDurationMode` (`manual`, `turns`, `rounds`), `conditionDurationCount` (1–20) e `conditionRemoval` (até 200 caracteres); somente condições utilizam estas opções.
- Efeitos temporários novos usam flags `multiverse-d616.customAutomationCondition` e são removidos automaticamente pelo Mestre ativo; nenhuma modificação é feita nas rotinas nativas de duração e Concentração.
- O chat mostra uma mensagem consolidada por início de turno quando existem condições ativas. Efeitos já ativos sem estas flags mantêm a duração original.

## v0.2.113 — Central de Automações 4.1

**Sem migração automática de regras.** As regras da versão 0.2.112 continuam salvas sem mudança de comportamento. Ao editar uma regra de condição com o gatilho `Ao rolar um poder`, o painel sinaliza que seu destinatário é o próprio atacante. Para converter uma regra como `Fast Attack - Teste` em um efeito no alvo, use **Converter para efeito no alvo atingido**, confira `Resultado necessário` e clique em **Salvar automação**. Uma exigência antiga de M passa a **Sucesso Fantástico contra a defesa do alvo**; ataques com dano aguardam confirmação do Mestre. Esta conversão é explícita e não se aplica a qualquer regra sem intervenção do Mestre. Faça backup do mundo antes de atualizar.

## v0.2.112 — Central de Automações 4.0

Nenhuma migração manual é necessária. As configurações `customAutomationRules` e `customAutomationsEnabled` são preservadas. Novos campos `hitOutcome` e `statusSubject` são preenchidos por padrão em regras existentes, sem alterar gatilhos antigos. A nova opção de gatilho por alvo utiliza confirmação de dano e seleção de alvos nativas. Regras antigas continuam aplicando efeitos ao lançador nos gatilhos anteriores.

## v0.2.111 — Central de Automações 3.2

Não exige migração de dados do mundo. As automações salvas nas versões 0.2.109 e 0.2.110 continuam válidas, inclusive as passivas de Edge/Trouble. A opção de Edge/Trouble na rolagem de poder só atua no próprio ataque, sem alterar o Item e sem somar novamente um Edge/Trouble nativo idêntico. Faça backup do mundo, atualize o sistema e recarregue o Foundry v14. Teste a janela no Foundry antes de publicar no GitHub.

## v0.2.76

Nenhuma migração de dados. Os poderes permanentes passivos armazenados em `flags.multiverse-d616.attachedPowers` continuam ativos pela regra de equipamentos da v0.2.75; apenas os atalhos de **uso** são filtrados da mesma forma que no personagem. Atualize o sistema e recarregue a sessão (Ctrl+F5). Fichas e compêndios permanecem inalterados.

## v0.2.75

Atualização sem migração destrutiva. Os poderes passivos de duração Permanent já associados a armas e itens são lidos diretamente das flags do equipamento durante o preparo do Actor. Nenhum Item ou Active Effect original é reescrito. Os efeitos são transitórios, e a retirada da arma/item desfaz seu bônus. Ações com resultado Permanent continuam dependendo de ativação.

## v0.2.74

Nenhuma migração de dados necessária: mantém `flags.multiverse-d616.attachedPowers` da v0.2.73. As cópias de poderes existentes em Armas e Itens são editáveis com o ícone de lápis. Proteções ativas associadas a equipamentos passam a ser resolvidas pelo ID do poder armazenado no próprio equipamento; para garantir a aplicação da proteção na sessão, ative o poder novamente com a arma equipada depois de atualizar.

## Publicação manual da v0.2.68 no GitHub (após testar)
1. Extraia `multiverse-d616-v0.2.68.zip` e copie **todos os arquivos do interior da pasta `multiverse-d616/`** para a raiz do repositório (onde fica `system.json`); não crie uma pasta `multiverse-d616/` dentro da raiz do projeto.
2. Confira que `system.json` tem `version: 0.2.68`, as entradas `esmodules`, `styles`, `packs` referenciam arquivos existentes e o manifesto aponta para a tag `v0.2.68`.
3. Faça commit/push **manualmente**. Crie a release GitHub `v0.2.68` e anexe o arquivo `multiverse-d616-v0.2.68.zip` com o nome exato. Até que a release exista, a URL de download do manifesto aponta a um arquivo ainda não publicado.
4. Mantenha o ZIP anterior aprovado para rollback. Não substitua compêndios já importados sem validar a compatibilidade; esta atualização não altera os dados dos packs.

## v0.2.10 — Rolagens de Poderes

As fichas antigas não são substituídas. Poderes cuja habilidade/defesa de teste esteja vazia recebem o padrão ao usar o poder (por nome), preservando escolhas explícitas do Narrador. Os poderes importados do compêndio na v0.2.10 já possuem os campos atualizados. Os controles Teste sem dano / TN fixo ficam disponíveis na ficha do Poder. Não há mudanças obrigatórias nos personagens. Faça backup antes de atualizar.

## v0.2.9 — Motor de Focus

Não há alterações destrutivas em fichas ou compêndios. Para os onze poderes de custo recorrente, a manutenção automática começa **quando o poder é usado novamente** depois da atualização: efeitos de Concentração legados em execução antes do upgrade não são debitados retroativamente. O novo acompanhamento de Focus usa os Active Effects do ator. Ao encerrar uma Concentração, a manutenção associada também é encerrada. Faça backup antes de atualizar.

# Atualização 0.2.8 (sobre v0.2.7)

Esta versão muda **somente a visibilidade dos poderes no HUD nativo**. Não requer migração dos itens, da ficha, dos Active Effects nem dos compêndios. As fichas já existentes com poderes nomeados `Resize Object` ou `Resize Other` passam a exibi-los nos atalhos automaticamente; o alias `Resize Others` também é reconhecido.

O clique executa `item.roll()` já existente, incluindo custo de Focus, rolagens configuradas e chat. Efeitos narrativos, como transformar objetos ou escolher aparências, continuam sujeitos ao mestre e às operações manuais existentes. Não altera Crescimento/Encolhimento, token X/Y/Z ou Concentration.

Testar localmente no Foundry VTT v14 antes de publicar. O GitHub não foi alterado automaticamente.

---

# Atualização 0.2.7 (sobre v0.2.6)

- **Backup recomendado:** redimensionamentos de token alteram documentos de tokens em cena e o token padrão do Actor vinculado.
- Grow e Shrink agora aplicam automaticamente X=Y=Z segundo a categoria escolhida (0,1 a 10 espaços de grade). Retornar ao normal restaura o tamanho natural, não obrigatoriamente 1×1×1.
- Personagens/NPCs antigos com Grow/Shrink ativos são sincronizados na cena carregada pelo GM; os demais atores recebem a atualização ao usar o poder ou alterar manualmente o tamanho.
- Efeitos antigos `prototypeToken.width` e `prototypeToken.height` adicionados por versões anteriores deixam de ser usados pelo sistema e são removidos dos Active Effects afetados na próxima aplicação. Não altera bônus de tamanho, defesa ou dano.
- Um Actor vinculado atualiza seu token padrão e seus tokens vinculados da cena atual. Um token desvinculado só redimensiona sua própria instância; o Actor original não sofre redimensionamento.
- **Atenção:** os valores modificam o espaço ocupado na grade, inclusive Z (depth), não apenas o tamanho visual da imagem. Posição x/y, elevação e escala da imagem não são modificadas.
- Não há nova versão dos compêndios; todas as funcionalidades de Grow/Shrink/atalhos permanecem intactas. Validar no Foundry VTT v14 antes de publicar no GitHub.

---

# Atualização 0.2.6 (sobre v0.2.5)

- Não há migração destrutiva ou alteração de conteúdo dos compêndios; **Shrink 1–4** existentes na ficha passam a abrir uma seleção ao serem usados.
- O sistema aplica Encolhimento por efeito do Actor, independente da categoria natural. A opção "Tamanho normal" desfaz a transformação e preserva o tamanho natural.
- Ao alternar entre Grow e Shrink, o efeito anterior é substituído. Selecionar manualmente o tamanho natural na ficha encerra Grow e Shrink.
- A aba POWERS do HUD nativo passa a mostrar Grow e Shrink 1–4 mesmo que a duração seja Permanente.
- Realize backup do mundo, substitua o sistema instalado e reinicie o Foundry v14 antes de testar. O ZIP não foi publicado no GitHub.

---

# Atualização 0.2.5 (sobre v0.2.4)

- Correção restrita ao Token Action HUD nativo: poderes `Grow 1–4` aparecem na aba POWERS mesmo sendo Permanente.
- Não há migração de dados necessária; nenhum item, Active Effect ou compêndio foi modificado.
- Faça backup antes de atualizar o sistema e reinicie o Foundry para carregar o módulo de atalhos alterado.
- As opções de tamanho e a janela de Grow da v0.2.4 permanecem as mesmas.

---

# Atualização 0.2.4 (sobre v0.2.3)

- Sem migração destrutiva de fichas. O poder Grow 1–4 continua com o mesmo ID e a mesma descrição no compêndio.
- Ao ativar um poder Grow já existente, o novo diálogo gera um efeito de Crescimento distinto que **não sobrescreve o tamanho natural**.
- Cancelar ou fechar não altera a ficha. Tamanho normal remove apenas efeitos criados pelo novo fluxo.
- Todos os recursos anteriores da 0.2.3 são mantidos.
- Faça backup do mundo e teste primeiro localmente no Foundry v14.

# Atualização 0.2.3 (sobre v0.2.2)

**Faça backup** do mundo e da pasta de sistema antes da instalação.

- Os efeitos antigos de Stilt Steps são atualizados para transferir os bônus permanentes à ficha; efeitos temporários da v0.2.2 são removidos.
- Flight 2 não força mais `jump.active=false`, inclusive em personagens que já o possuem.
- Shield 1–4 deixam de transferir redução de dano passivamente. Sua Concentração ativa passa a aplicar o DR e o remove ao acabar. Concentrações existentes são atualizadas automaticamente.
- Extended Reach 1/2 deixam de multiplicar diretamente `reach`. O modificador de maior nível (x4/x10) atua por `reachFactor`, combinando corretamente com efeitos de tamanho.
- A migração dos poderes é idempotente (pode rodar em cada carregamento); somente o Mestre ativo responsável a executa.
- Os compêndios atualizados não substituem itens antigos já copiados à ficha; a migração cobre ambos.

# v0.1.78

- Não há migração destrutiva de mundo.
- Esta versão corrige somente a autoridade/sincronização multiplayer do fluxo de troca de Concentração introduzido na v0.1.77.
- Recomenda-se **reiniciar o mundo e também reconectar os jogadores** depois de substituir a pasta do sistema, para que todos os clientes carreguem o novo listener de socket e o novo filtro de hooks.
- Nenhum Active Effect existente precisa ser recriado.

# v0.1.77

- Não há migração destrutiva de mundo.
- A partir desta versão, aceitar um novo Power quando **Concentração = Rank** exige escolher no chat qual Power concentrado será substituído.
- Mundos que já criaram Powers excedentes usando a v0.1.76 podem conter Active Effects transitórios com `countsTowardLevel: false`. Eles não contam como uma vaga; ao reutilizar esse mesmo Power em v0.1.77, o novo fluxo permite escolher uma concentração válida para substituir e converte o Power para a vaga escolhida.
- Recomenda-se reiniciar o mundo após substituir a pasta do sistema para garantir o registro do listener de socket da Concentração.

# v0.1.76

- Não há migração de mundo obrigatória.
- Os compêndios Powers, Traits, Tags e Origins foram sincronizados com os novos registros de Secret Wars já presentes no Charactermancer.
- Itens previamente importados para atores não são alterados automaticamente; arraste a nova entrada do compêndio se quiser usar a versão recém-adicionada.

# v0.1.75

Nenhuma migração destrutiva de dados é necessária. Reinicie o mundo após atualizar para recarregar CONFIG.statusEffects e a lista do Charactermancer. A condição Shield Thrown é criada apenas durante o uso de Powers de arremesso de Shield Bearer. Self-Sacrifice permanece sem automação nesta versão.

# Migração 0.1.74

Esta versão não altera Items, Combats ou compêndios. O HUD de Ações nativo da v0.1.72 e o fluxo de Powers em Concentração da v0.1.73 são preservados.

## AutoAnimations

Powers de duração **Concentração/Concentration** agora transferem sua configuração `flags.autoanimations` para o Active Effect transitório criado pelo sistema. Isso permite configurar animações persistentes diretamente no Power, inclusive efeitos **On Token**, sem depender de uma entrada com o mesmo nome em **Automatic Recognition → Active Effects**.

A integração é opcional: não há nova dependência obrigatória. Mundos sem AutoAnimations/JB2A continuam usando a Concentração normalmente.

## Módulos externos

Depois de substituir a pasta do sistema, desative no mundo:

1. **D616 Extempore Effects**;
2. **Token Action HUD Multiverse-D616**;
3. **Token Action HUD Core**.

O HUD de Ações continua funcionando diretamente pelo Multiverse-D616, sem Token Action HUD Core. O antigo módulo Extempore não é mais necessário: seu menu manual foi substituído pelo novo comportamento automático dos Powers em Concentração.

## Limpeza automática

Ao abrir o mundo como Mestre, registros transitórios reservados são removidos do cadastro `customConditions` e continuam fora de `CONFIG.statusEffects`. Essa limpeza não apaga Active Effects legados já aplicados nos tokens.

Ao usar um Power com duração Concentração, sua condição é criada somente como Active Effect no ator do token. O nome e o ícone vêm do Power, e o tooltip usa seu campo Descrição. Ao encerrar a concentração, esses documentos transitórios são apagados.

## Instalação manual

Feche o Foundry VTT, substitua integralmente a pasta `Data/systems/multiverse-d616`, desative os três módulos listados acima e abra o mundo novamente.
