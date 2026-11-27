# v0.2.235 — Power Control

Base validada: v0.2.234. Fontes de regra: Copy Power (Nxyy9AWiSUua6qcs) e Dampen Power (mCxCY7qZZw1XlEST), catálogo integrado `apps/charactermancer/data/powers.json`.

## Copy Power
- Ação Padrão, 5 Focus, Concentração, alvo até 10 espaços. Escolha de alvo e Item antes de gastar; Mestre autoriza no chat. Item temporário com nome e sistema originais, efeitos próprios transferíveis, novos IDs, sem alterar propriedade do alvo. Custos do poder copiado seguem o uso comum.
- Finalizar Concentração remove Item temporário e sua Concentração dependente. Um poder já possuído não é duplicado. Poderes de equipamento não incluídos nesta versão. Transformações permanentes ou efeitos especiais já produzidos podem exigir limpeza manual pelo Mestre.

## Dampen Power
- Ação Padrão, Concentração, alvo até 20 espaços. Ego contra Ego sem dano; Mestre confirma o resultado final depois de Edge/Trouble. Custo de Focus do poder escolhido no sucesso, inclusive valor variável declarado. Falha não cobra esse custo. Item original preservado; ActiveEffect temporário identificado pelo ID do Item; limpeza pela fonte. M conta numericamente como 6 no fluxo normal, mas não dá benefício Fantástico ou 6-M-6 automático. Não edita rolagens anteriores.
- Integração automática: alcance numérico/RANK/Reach no preflight; novas áreas do controlador ambiental (Darkness, Silence Area, Control Fog, Mists of Munnopor, Vapors of Valtorr); alcance dos novos grupos de Flight/Levitation/Extend Invisibility; duração finita da manutenção de Focus (arredondada para baixo, mínimo um turno); alterações de multiplicador/DR em efeitos passivos transferíveis, DM direto quando explicitamente modificado, e Venom Sword.
- Limites: áreas e grupos já ativos não são redimensionados; efeitos temporais especiais, durações fracionárias, alcance codificado em controladores específicos, efeitos em ataques indiretos/ataques de seguimento e outros poderes que não usam o fluxo comum precisam de intervenção do Mestre. O preflight de alcance ainda permite exceções. Não é correto declarar cobertura universal dos 398 poderes.
- Cancelar o diálogo inicial não cobra recursos. Se o Mestre não autorizar uma ativação já anunciada, o card fica pendente e o ajuste/estorno deve ser resolvido pelo Mestre. O custo do Dampen foi interpretado como devido após confirmar o sucesso.

## Teste funcional sugerido
1. Copy Power em Elemental Blast: confira 5 Focus, novo poder na ficha/HUD, custo normal do ataque e remoção da cópia ao parar de concentrar. Verifique que o alvo continua com o poder original.
2. Dampen Power em Elemental Blast: Ego vs Ego, escolha 5 Focus, resolução de sucesso; alcance de 10 para 5 espaços e dano comum mesmo com M. Encerre Concentração e repita sem restrição.
3. Dampen Power em Mighty 2: conferir somente redução do benefício de DM em 1; outro bônus superior permanece. Testar falha, custo insuficiente e remoção após Concentração.
4. Testar nova Darkness após Dampen, raio pela metade; não modificar o funcionamento da Darkness comum.

Sem publicação no GitHub. Testes automatizados Node com Hooks simulados; não substituem execução real no Foundry v14.
