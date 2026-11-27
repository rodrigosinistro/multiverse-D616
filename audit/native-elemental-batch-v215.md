# v0.2.215 — Lote Elemental / Macros_D616

**Base:** v0.2.214; compêndio oficial LevelDB com 398 poderes. Versão **experimental** para Foundry VTT v14.

## Melhoria funcional: Elemental Ricochet

Esta automação já existia no motor desde a v0.2.64, mas não figurava no Macros_D616. Agora só autoriza novo ataque após **Sucesso Fantástico que causa dano positivo** efetivamente confirmado pelo Mestre (DANO ou 1/2 DANO), contra o mesmo alvo do card técnico, com assinatura vigente do dado. Erro, cura, absorção total, ataque adulterado, card defasado e reenvio não podem liberar a sequência. O novo ataque usa rolagem e card de dano independentes, sem nova Ação Padrão ou gasto adicional de Focus. A escolha do novo alvo é manual e validada: não pode ser um já visitado, deve estar na mesma cena, ter linha de visão sem bloqueio confirmado e respeitar alcance acumulado de até **10 × Rank espaços**. Avaliações ambíguas ainda dependem do Mestre.

A rotina está vinculada a **Elemental Control/Elemental Ricochet**, diferente de **Shield Bearer/Rico-Shield**. Nenhum nome coincidente em outro Power Set executa o controle. Falha de criação da rolagem não consome o uso único.

## Seis registros documentais — mecanismos existentes

| Poder | Mecanismo já existente |
|---|---|
| Elemental Barrage | Dano metade em sucesso comum; inteiro em Fantástico |
| Elemental Burst | Ataque e efeito Fantástico elemental |
| Elemental Grab | Agarrar/escapar e Concentração |
| Elemental Prison | Estrutura/prisão e Concentração |
| Elemental Push | Teste, deslocamento e condições |
| Elemental Suffocation | Checagem de agarrão e ataque |

Esses seis são **referências** ao código já implementado; não são seis novas automações integrais nem alteram o motor compartilhado.

## Cobertura

- 14 nativas ativas;
- 49 nativas parciais;
- 97 referências existentes;
- 2 dependentes de configuração;
- 236 não catalogados;
- **398 poderes**, dos quais **162 macros** registradas (as macros são referencias inertes, não scripts com poderes de Mestre).

Testes offline: **1.237 aprovados, 0 falhas**. Preservados byte a byte README e seis compêndios oficiais; nenhum GitHub alterado.

## Verificação necessária em Foundry v14 (Mestre + Jogador)

1. Em Elemental Ricochet, rolar Fantástico, o Mestre confirmar dano real, escolher novo alvo válido e repetir sem nova Ação ou Focus.
2. Testar Fantástico com dano final zero, cura, erro, troca de alvo, reroll Edge/Trouble posterior, clique duplicado e combate/turno encerrados; nenhum ricochete extra deve ocorrer.
3. Testar múltiplos Fantásticos sequenciais, ataque comum que encerra a cadeia, alcance acumulado, obstáculos e troca de cena.
4. Regressão de Rico-Shield, Stopping Power, Hit n Run, Counterstrike Technique, dano e condições em dois clientes. Testes automatizados não substituem validação real.
