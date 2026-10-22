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
