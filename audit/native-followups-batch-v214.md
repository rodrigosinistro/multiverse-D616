# Multiverse-D616 v0.2.214 — Auditoria de 27 poderes

Base: **v0.2.213 aprovada**. Foram auditados 27 poderes de Melee Weapons (2), Ranged Weapons (2), Martial Arts (6), Super-Speed (3), Tactics (1), Healing (3) e Elemental Control (10). **Dois** receberam funcionalidade adicional; 25 continuam sem novas implementações.

## Stopping Power — segundo tiro de verdade

- O ataque original utiliza o poder oficial e seu custo normal de 5 Focus e Ação Standard.
- O Mestre confirma DANO ou 1/2 DANO de um ataque **Fantástico que causou dano efetivo**. A implementação liga o cartão técnico à assinatura atual do dado e ao único alvo escolhido. Se foi erro, dano 0, alvo trocado ou cura, nenhum segundo tiro é liberado.
- Um card separado habilita **↪ Stopping Power: segundo disparo (grátis)**. O usuário escolhe se ativa. O sistema faz nova rolagem Marvel de Agility contra Agility usando os modificadores atuais e gera o card normal de ataque, sujeito ao botão DANO do Mestre.
- Exatamente o mesmo alvo e cena; sem Focus ou Standard adicionais; uso único por ataque original e apenas na mesma rodada. O segundo tiro não reativa Stopping Power.
- **Parcial:** efeitos narrativos de equipamento, alvo que desaparece, mudança de rodada e eventual falha de transmissão requerem arbitragem do Mestre. Não confundir com dano automático.

## Hit n Run — deslocamento gratuito contabilizado

- **Edge não duplicado:** já existia em `attackEdgeMode='edge'` no compêndio oficial.
- Depois que o Mestre confirmar um acerto Melee, o combate ganha crédito de deslocamento de **Run Speed ÷ 2 espaços** ligado ao Combatant, à rodada e ao turno corrente.
- O Mestre contabiliza o próximo movimento do token no rastreador: primeiro desconta crédito, depois movimentação comum. Exemplo: Run Speed 8 e movimento de 6 espaços = 4 gratuitos e 2 comuns. O crédito é consumido e expira ao mudar turno.
- Movimento é feito manualmente no mapa, não por script que escolhe destino. Não cria Ação Standard adicional. Lote classificado parcial por alcance e efeitos de arma dependentes do Mestre.

## Cobertura após o lote

| Classificação | Poderes |
|---|---:|
| Nativas ativas | 14 |
| Parciais | 48 |
| Referências a mecanismos existentes | 91 |
| Dependentes de configuração | 2 |
| Não catalogados | 243 |
| **Total** | **398** |

**155 macros catalogadas**, não 155 automações completas.

## Checklist no Foundry v14

1. PLAYER usa Stopping Power contra 1 alvo. Em Fantástico, após Mestre confirmar DANO, aparece um card de segundo disparo com botão. Jogador clica e deve rolar dados novos, sem Focus/Standard extra. Mestre aplica o segundo dano somente pelo DANO.
2. Testar um acerto normal, um Fantástico sem dano efetivo (RD/barreira), 1/2 DANO e rerolls manuais Edge/Trouble; apenas o Fantástico com dano real habilita o segundo tiro. Clique duplo ou novo alvo não deve repetir.
3. PLAYER usa Hit n Run e Mestre confirma DANO; mover o token 2 espaços (todos gratuitos), depois 4 espaços (2 gratuitos, 2 Movimento comum) para Run Speed=8. Próximo turno deve ignorar saldo antigo. Não pode haver Edge extra além do original.
4. Testar dano original, Counterstrike Technique, Hurled Shield Block, Always Ready/Fast Hands com dois clientes.

## Preservações

README e seis compêndios oficiais idênticos à v0.2.213. Protocolo atômico v196 preservado. Nenhuma publicação GitHub. A versão é experimental até ser validada pelo usuário no Foundry.
