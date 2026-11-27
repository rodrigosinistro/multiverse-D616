# v0.2.211 — Counterstrike Technique (Martial Arts)

## Escopo

Automação parcial, disparada pelo HUD/ficha **após** a confirmação do dano de um ataque corpo a corpo contra o defensor, com **Attack Stance** ativo. O poder exige uma Reação e 5 Focus. **Não faz rolagem própria e não executa dano automaticamente:** cria um card técnico padrão que o Mestre aplica clicando **DANO**.

## Regra oficial e cálculo

Fonte: [Marvel Multiverse RPG FAQ (27/03/2025)](https://cdn.marvel.com/u/prod/marvel/i/pdf/MMRPG_Rules-FAQ_20250327.pdf), seção sobre Counterstrike Technique. O dano devolvido é metade do dano **normal** do atacante (não usa o multiplicador de dano Fantástico). Aplica-se a **RD do atacante original** ao multiplicador **antes** de dividir por dois; arredonda-se para cima. Se a RD zera o multiplicador, nem o bônus de habilidade produz dano. A RD do defensor é utilizada exclusivamente na resolução da agressão original, para constatar dano real > 0; não altera a fórmula do contra-ataque.

Exemplo FAQ: dM 4 × DM 8 + Melee 5 = 37, retorno 19 se o atacante não tem RD. Com RD 2 do atacante: (4 × (8−2)+5) / 2 = 14,5 → **15 de Health**. Se a agressão foi Fantástica, ignora o ×2 para o retorno.

## Transação e segurança

1. O mestre confirma DANO no card de ataque original.
2. O jogador seleciona seu próprio token com Attack Stance ativo e clica Counterstrike Technique. Não seleciona manualmente o atacante.
3. O jogador identifica **apenas o card público do ataque confirmado**, que registra quanto dano foi causado. Um pedido JSON **atômico** em uma única string no Actor mundial é entregue ao Mestre.
4. O Mestre autentica o userId de `updateActor`, dono do canal mundial e do token sintético, Id oficial do poder, cena/atacante original, dados e recibo de dano real confirmado; calcula o retorno a partir do card técnico original reservado ao Mestre.
5. O Mestre reserva a Reação, consome 5 Focus, marca o gatilho como utilizado pelo defensor e publica um novo card de dano técnico cujo alvo é o token **atacante**. Em falhas ANTES da publicação, retorna a Reação/Focus/marcador.
6. O Mestre clica **DANO** no novo card: o motor MMDR atualiza o Health/Focus do atacante. Botões CURA e 1/2 DANO são ocultados e sua aplicação rejeitada para evitar divisão duplicada. Não há vínculo `sourceMessageId` com a agressão já resolvida, portanto o motor não confunde o contra-ataque com uma repetição da agressão.
7. Uma segunda ativação baseada no mesmo ataque é rejeitada sem novo custo; o próximo ataque confirmado pode criar nova reação, caso haja recurso disponível.

## Checklist Mestre + Jogador

- [ ] Ataque Melee (Clobber, por exemplo) contra Zima com Attack Stance. Mestre aplica DANO, com perda positiva de Health.
- [ ] Pelo Jogador, clicar Counterstrike Technique **depois** de aplicar DANO. Conferir 5 Focus e 1 Reação gastos uma única vez.
- [ ] No chat do Mestre, novo card do poder com a descrição oficial, origem do ataque, fórmula do dano normal, RD do atacante e valor final; botão **DANO** apenas.
- [ ] Antes de clicar DANO, Health do atacante permanece inalterado. Ao clicar, dano exato é aplicado ao **atacante** e aparece em ambos chats.
- [ ] Clobber Fantástico: retorno usa o dano normal original (sem ×2). RD zero/2/alta, metade ímpar e arredondamento para cima.
- [ ] Sem Attack Stance, com Focus insuficiente, ataque ranged, ataque que cause zero de dano: recusar antes de gastar Focus/Reação.
- [ ] Segundo clique para o mesmo ataque: sem nova cobrança, sem novo card. Novo ataque confirmado pode autorizar novo uso conforme saldo de Reações.
- [ ] Testar Jogador com token vinculado e não vinculado. Confirmar que a permissão OWNER e a identificação do token correto funcionam.
- [ ] Regressão: Always Ready, Fast Hands e Hurled Shield Block em telas separadas, conforme v0.2.210.

## Preservação

README sem alterações; 398 poderes e seis compêndios oficiais idênticos à v0.2.210. Biblioteca `Macros_D616` passou de 149 a 150 referências catalogadas. Nenhuma publicação GitHub.

## Testes

`node --test tests/*.test.mjs`: 1.212 aprovados, zero falhas. Testes específicos: `tests/native-counterstrike-v211.test.mjs` (13), incluindo protocolo PLAYER → Mestre autorizado/recusado, cálculo da FAQ, integração com MMDR e estornos. A validação real no Foundry permanece necessária.
