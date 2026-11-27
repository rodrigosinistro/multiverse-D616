# Validação v0.2.207 — Hurled Shield Block

## Novo fluxo

1. Jogador (Zima) tem Shield 2 (seu próprio poder ativo); um inimigo faz ataque contra Agility de Thermal Prime.
2. Zima clica Hurled Shield Block (Reação) pelo HUD **depois do anúncio do ataque e antes da confirmação do dano**.
3. O usuário seleciona o token do aliado Thermal Prime; se cancelar, Focus/Reação ficam intactos.
4. O controlador verifica: jogador OWNER, item oficial Shield Bearer, cena, ambos os tokens, alcance (5 × Rank), aliado, 5 Focus, uma Reação e ausência de outro marcador pendente.
5. GM consome os 5 Focus e a Reação uma vez, cria o ActiveEffect de **RD de Health 2, para um ataque** no aliado e publica o card oficial completo no chat.
6. Quando o Mestre clicar **DANO** ou **1/2 DANO** do ataque original, o cálculo consulta a RD Shield atual, mesmo que o card já tenha sido rolado antes da reação. É usada a maior entre a RD Shield e a RD própria do alvo, nunca a soma; não altera Focus.
7. Ao concluir a aplicação no alvo, o sistema remove o ActiveEffect. Ataques posteriores não reutilizam a RD. Uma confirmação de dano contínuo não consome a proteção.

## Testar explicitamente

- **PLAYER + GM:** ativar como jogador, verificar card e efeito no aliado em ambos os clientes; um único gasto de 5 Focus e 1 Reação.
- **RD:** com dado Marvel 5, DM 5, atributo +3 e RD original 0: dano de Health **28** sem proteção, **18** com Shield 2. Com RD do alvo 3: continua usando RD 3, não RD 5.
- **Só 1 ataque:** após confirmar dano, efeito desaparece e o segundo ataque não recebe proteção.
- **Card criado antes da Reação:** comportamento idêntico (não usar RD antiga gravada no card).
- **1/2 DANO, Fantástico, Adamantium:** continuam respeitando as regras existentes. Dano de Focus e condições contínuas não utilizam a RD Shield.
- **Cancelamento / indisponibilidade:** sem alvo, inimigo, alvo longe, sem Reação/Focus, ou duplicação de um marcador pendente: nenhum novo gasto. Falha de chat/efeito tenta estorno.
- **Expiração:** ataque cancelado/não concluído: marker some no próximo turno de Zima ou ao fim do combate.
- **Regressões:** Shield 1–4 durante Concentração, Shield Deflection, Hurled Shield Deflection, Slow-Motion Dodge, Spider-Dodge, Scatter, Healing Hands, Jinx You, veículos e turno de combate.

## Limites honestos

O sistema ainda depende do Mestre/jogadores para confirmar se o ataque elegível realmente mira a **Defesa de Agility** do aliado e arbitrar a indisponibilidade do escudo do lançador até o início do próximo turno. Esta versão não altera automaticamente os outros poderes Shield Bearer do lançador. A remoção automática só acontece ao confirmar a resolução do ataque no motor D616; alterações manuais de Health fora desse fluxo não acionam o consumo.
