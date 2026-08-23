# Checklist de teste — v0.1.73

Use uma cópia do mundo no Foundry VTT v14 antes de substituir a versão usada na campanha.

## Instalação

1. Feche o mundo.
2. Faça backup de `Data/worlds` e da pasta atual `Data/systems/multiverse-d616`.
3. Substitua a pasta do sistema pela pasta `multiverse-d616` deste ZIP.
4. Desative **D616 Extempore Effects**, **Token Action HUD Multiverse-D616** e **Token Action HUD Core**.
5. Reinicie o Foundry VTT e confirme a versão **0.1.73**.

## Fórmula e total dos ataques

1. Use um Power de ataque configurado com Agility em um personagem que tenha Agility diferente de 0.
2. Confirme que o card mostra `{1d6,1dm,1d6} + X`, sendo `X` o valor atual de Agility.
3. Confirme que o total é a soma dos três dados (tratando MARVEL como 6) mais Agility.
4. Repita com um ataque de Melee e com uma arma equipada.
5. Repita pela ficha, por macro e pelo Token Action HUD.
6. Aplique Edge ou Trouble no card e confirme que o atributo permanece na fórmula e no total atualizado.
7. Use uma fórmula personalizada que já contenha `@agl.value` e confirme que Agility é somada somente uma vez.

## Compêndio Powers e pastas de Power Set

1. Entre no mundo como Mestre e aguarde o carregamento completo do mundo.
2. Abra **Compêndios → MMRPG Content → Powers**.
3. Confirme que existem **27 pastas** de Power Set.
4. Confirme exemplos: **Basic**, **Magic**, **Martial Arts**, **Telepathy**, **Teleportation** e **Weather Control**.
5. Confirme que os 392 Powers aparecem dentro de suas respectivas pastas, sem entradas soltas na raiz.
6. Feche e reabra o mundo; confirme que não há duplicação de pastas.
7. Confirme que nenhum Power aparece solto por perda de referência à pasta.

## Active Effects e Sturdy

1. Abra um ator com **Sturdy 2** e confirme `Health Damage Reduction = 2` na ficha.
2. Abra o Active Effect transferido pelo poder e confirme que continua habilitado.
3. Ataque esse ator e clique em **DAMAGE**.
4. Confirme que o card mostra `DR 2` e reduz o Damage Multiplier em 2.
5. Desabilite o efeito de Sturdy e repita; a ficha e o card devem voltar para `DR 0`.
6. Repita com um Trait/Origin que altere habilidade, defesa ou movimento.
7. Confirme no console que não surgem mensagens `ActiveEffect application phase ... has already completed`.

## Condições

1. Abra o Token HUD e confirme que as condições padrão do Foundry não aparecem.
2. Confirme que aparecem somente as condições nativas do D616 e condições customizadas.
3. Use um Power de duração **Concentração** e confirme a criação automática de duas condições no token: **Concentração 1** e a condição com o nome do Power.
4. Passe o mouse sobre a condição do Power e confirme que o tooltip mostra exatamente seu campo **Descrição**.
5. Confirme que a condição usa o ícone do próprio Power e não aparece na paleta de atalhos nem no gerenciador customizado.
6. Use o mesmo Power novamente e confirme que a condição é atualizada, sem duplicação e sem aumentar Concentração.
7. Use outro Power de Concentração e confirme a mudança para **Concentração 2** e a presença das duas condições de Power.
8. Remova uma condição de Power e confirme a redução de Concentração 2 para Concentração 1.
9. Remova a condição genérica Concentração 1 e confirme que todas as condições de Powers concentrados são apagadas.
10. Cadastre uma condição externa no gerenciador customizado e confirme que somente ela aparece no Token HUD.
11. Leve Health a 0 e confirme **Incapacitated** somente no token atingido.
12. Leve Focus a 0 e confirme **Demoralized**.
13. Use dois tokens não vinculados do mesmo ator-base e confirme que o status não passa para a outra cópia.
14. Aplique Ablaze/Bleeding/Corroding, encerre o turno e confirme o dano uma única vez.
15. Com Health Damage Reduction, confirme a redução do dano contínuo.
16. Teste uma condição custom pelo menu de configurações.

## Controle de Turno

1. Entre como Mestre e confirme que a janela **Controle de Turno** pode ser aberta pelo cronômetro nas ferramentas de Token.
2. Entre como jogador e confirme que o mesmo cronômetro aparece e abre uma janela própria, arrastável, redimensionável, minimizável e fechável.
3. Confirme que combatentes ocultos pelo Mestre não aparecem no quadro do jogador.
4. Antes de começar o encontro, confirme que somente o Mestre vê os quatro controles de combate.
5. Clique em **Iniciar Combate** e confirme que cada jogador recebe um popup com apenas os personagens sob seu controle.
6. Confirme que o Mestre recebe um popup com os combatentes sem jogador ativo responsável.
7. Role a iniciativa de um personagem sem Edge/Trouble e confirme que o card não oferece modificadores indevidos.
8. Role a iniciativa de um personagem com **E** e confirme que somente os três botões **EDGE** e o botão **Manter iniciativa** ficam disponíveis.
9. Use EDGE em um dos dados e confirme que o total do card, o valor do Combatant e a ordem de iniciativa são atualizados.
10. Repita escolhendo **Manter iniciativa** e confirme que o resultado original é preservado.
11. Confirme que o mesmo Edge/Trouble não pode ser usado uma segunda vez no mesmo card.
12. Confirme que o combate somente começa automaticamente após todos os Edge/Trouble pendentes serem resolvidos.
13. Teste **Avançar Turno**, **Retroceder Turno** e **Finalizar Combate**; o último deve pedir confirmação.
14. Feche um popup de iniciativa sem rolar e clique novamente em **Iniciar Combate** para confirmar o reenvio dos pedidos pendentes.
15. Confirme que os recursos mostram somente `0`, sem frações como `0/1` ou `0/5`.
16. Use Ação Padrão, Reação e Movimento e confirme que cada número sobe para `1`, `2` etc., sempre com fundo vermelho e número branco em negrito.
17. Confirme que o jogador vê os números sendo atualizados, mas não consegue alterar manualmente os controles nem zerar combatentes.
18. Confirme que o Mestre ainda pode clicar para acrescentar, usar clique direito para desfazer, usar `Shift + Movimento` e zerar a linha do combatente.
19. Em uma cena quadrada/hexagonal, mova um Token combatente e confirme a soma de espaços.
20. Em uma cena sem grade, mova um Token combatente e confirme que a distância é convertida conforme a escala da cena.
21. Mova um Combatant que não está no turno ativo e confirme que o movimento é registrado na linha correta.
22. Durante o turno de outro combatente, use uma Reação com `Standard, movement or reaction`; confirme que o diálogo abre para o jogador e que o recurso escolhido é marcado no combatente correto.
23. Passe o turno e confirme que Ação, Reação e Movimento do novo combatente começam zerados conforme a regra implementada.
24. Feche e reabra a janela em contas diferentes e confirme que posição, tamanho e estado são preservados separadamente em cada navegador.
25. Confirme que abrir o quadro não troca a ferramenta ativa, não bloqueia o canvas e não causa atualização contínua da interface.
## Integrações

1. Confirme que os três módulos externos listados na seção Instalação estão desativados.
2. Selecione um token e confirme que o HUD nativo mostra **ABILITIES** e **POWERS** sem erros de dependência no console.
3. Confirme os seis atributos na ordem Melee, Agility, Resilience, Vigilance, Ego e Logic.
4. Role um atributo e confirme que seu modificador aparece na fórmula e no total.
5. Abra POWERS e confirme ordem alfabética, nomes completos em uma coluna e ausência de Powers com duração Permanent/Permanente.
6. Use um Power com custo de Focus e duração Concentração; confirme desconto de Focus, condições genérica/específica, rolagem, alvo salvo, dano e Controle de Turno.
7. Arraste o HUD pelo ícone M, minimize-o e recarregue; posição, aba e estado devem ser preservados neste navegador.
8. Abra o menu de contexto de uma mensagem e confirme que os três comandos **Extempore Effects** não existem mais.
9. Confirme que a condição automática do Power aparece na bandeja lateral, mas não cria nova opção na paleta do Token HUD.
10. Remova a condição e confirme que o Active Effect é apagado sem deixar entrada em `customConditions` ou `CONFIG.statusEffects`.

## Alvo preservado

1. Coloque dois tokens na cena: **Alvo A** e **Alvo B**.
2. Marque apenas **Alvo A** e faça um ataque.
3. Depois da rolagem, desmarque A e marque B.
4. Clique em **DAMAGE** no card original.
5. Confirme que o card de dano cita **Alvo A**, e não B.
6. Mude ou limpe novamente a seleção do Mestre.
7. Clique em **DANO**.
8. Confirme que somente a Health ou Focus de **Alvo A** foi alterada.

## Múltiplos alvos e redução

1. Marque dois alvos com valores diferentes de Damage Reduction.
2. Faça o ataque e clique em **DAMAGE**.
3. Confirme que o card mostra uma linha e um dano final para cada alvo.
4. Clique em **DANO** e confira os dois recursos individualmente.

## Meio dano e cura

1. Gere um novo card de dano contra um alvo.
2. Clique em **1/2 DANO** e confirme arredondamento para cima.
3. Em outro teste, reduza o recurso do alvo e clique em **CURA**.
4. Confirme que a cura não ultrapassa o valor máximo.

## Token não vinculado

1. Use dois tokens não vinculados criados a partir do mesmo Actor-base.
2. Ataque somente um deles.
3. Mude a seleção antes de gerar e antes de aplicar o dano.
4. Confirme que somente a cópia originalmente atacada é alterada.

## Regra de dano mínimo

1. Use um alvo cuja Damage Reduction seja igual ou maior que o Damage Multiplier.
2. Confirme que o dano final é **0**, nunca negativo.
3. Repita com Fantastic e confirme que o resultado continua **0**.

## Regressão do travamento do canvas — v0.1.64

1. Selecione as ferramentas de Token e clique no cronômetro.
2. Confirme que a janela abre sem trocar a ferramenta ativa.
3. Selecione, arraste e mova um Token imediatamente após abrir a janela.
4. Avance e recue turnos no Combat Tracker.
5. Confirme que o console registra movimento e que não há repetição contínua de 404 da janela para o mesmo retrato inválido.

## Card de iniciativa sem DAMAGE

1. Crie ou abra um encontro com pelo menos um combatente.
2. Role a iniciativa pelo Controle de Turno.
3. Confirme que o card de iniciativa não possui o botão **DAMAGE**.
4. Role um ataque comum e confirme que o botão **DAMAGE** continua aparecendo nesse card.
5. Teste uma mensagem antiga com o texto `Iniciativa` ou `Initiative` e confirme que o botão também é removido ao renderizar.
