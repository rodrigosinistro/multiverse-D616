# Multiverse-D616 v0.2.204 — Auditoria do lote e validação

**Base estável:** v0.2.203, validada em Foundry v14. Versão v0.2.204 experimental até teste de Mestre/Jogador.

## Cobertura

- **27 poderes oficiais auditados**, antes não registrados: Basic (8), Spider-Powers (15), Super-Speed (4).
- **Três automações parciais novas:** Slow-Motion Dodge, Spider-Dodge e Spider-Pheromones.
- **Oito referências a mecanismos existentes:** Razorwebs, Spider-Strike, Venom Bash, Venom Blast, Webcasting, Webgrabbing, Venom Burst e Speed Blast. A referência cobre apenas as rolagens/condições já suportadas; não é uma implementação nova ou integral.
- **Dezesseis permanecem sem automação registrada.** Não se presume que seus efeitos sejam integralmente manuais ou automatizados sem uma verificação individual.
- `Macros_D616`: 125 → **136 macros**, 27 pastas com ícones originais. Os 398 poderes e os seis compêndios originais ficam intactos.

## Novos comportamentos e limites

### Basic / Slow-Motion Dodge — parcial

- O jogador ativa pelo HUD/ficha, **antes do ataque inimigo ser rolado**, quando uma Reação estiver disponível.
- Cria um marcador de Reação preparada sem custo de Focus. O Turn Tracker existente controla o gasto da Reação.
- O **primeiro ataque contra Defesa de Agility** recebe **1 Trouble** visível no card; o jogador escolhe o dado manualmente.
- Após publicação do card do ataque elegível, o GM principal remove o marcador. Ele também expira automaticamente no próximo turno do defensor.
- **Limite:** não é possível retroagir para um ataque já rolado; o momento de declaração da reação é responsabilidade da mesa.

### Spider-Powers / Spider-Dodge — parcial

- Mesma preparação segura, mas o gatilho é o **primeiro ataque de Agility** feito contra o usuário, qualquer que seja a defesa usada.
- O acerto/erro é determinado pelo card normal do atacante. O salto opcional após um erro continua manual, sem deslocamento automático do token.
- Não acumula com uma segunda reação preparada enquanto a primeira estiver pendente.

### Spider-Powers / Spider-Pheromones — parcial

- Enquanto a Concentração do Item estiver ativa, o card de um teste **não ofensivo de Ego** apresenta uma fonte condicional de **1 Edge**.
- O Mestre confirma se o teste é de intimidação/persuasão e a circunstância de atração descrita na regra oficial; o sistema não inventa informação sobre o alvo.
- O reroll não é automático. Encerrar a Concentração elimina imediatamente essa fonte.

## Testes em Foundry v14 — Mestre e Jogador

1. **Slow-Motion Dodge:** inicie combate e tenha um ataque adversário anunciado contra **Defesa Agility**. Antes da rolagem, ative Slow-Motion Dodge com jogador. Confirme consumo da Reação, Trouble no card do atacante e remoção do marcador após o card. Ataque contra outra defesa não deve consumi-lo.
2. **Spider-Dodge:** prepare antes de um ataque de Agility; verifique Trouble manual. Faça um ataque Melee e verifique que não dispara. Após um erro de Agility, escolha manualmente se realiza o salto permitido.
3. **Limites:** tente ativar outra esquiva enquanto uma estiver preparada; tente ativar após gastar a última Reação; avance ao próximo turno sem ataque e confirme limpeza.
4. **Spider-Pheromones:** ative Concentração e faça teste de Ego relevante; confirme fonte condicional no card, Edge manual e desaparecimento após encerrar Concentração. Em ataque Ego ofensivo, não deve aparecer como bônus social.
5. **Regressão:** Jinx You, Blur, Untouchable Position, Change of Plans, Combat Support, Energy Absorption e Healing Hands com jogador e Mestre conectados; cards completos, Edge/Trouble manuais e rolagem do chat após dano.

## Notas de arquitetura

As macros do compêndio são referências com código restrito apenas a `showMacroInfo`. O sistema registra apenas ActiveEffects de dados com IDs oficiais; **não executa macros como Mestre**. O protocolo atômico da v0.2.196 para solicitações que modificam outros personagens é preservado integralmente. O consumo da Reação depende do Turn Tracker habilitado. Nenhuma regra global de dano/RD foi reescrita.

**Arquivos funcionais alterados:** `multiverse-d616.mjs`, `scripts/native-power-spider-defenses.mjs` (novo), `scripts/native-power-automations.mjs`, `scripts/native-power-senses.mjs` e `scripts/condition-edge.mjs`. Também foram atualizados o gerador, registro, `packs/macros-d616`, `system.json`, `CHANGELOG.md`, novos testes e relatórios de auditoria.

Não publicar no GitHub. Não alterar `README.md` ou os seis compêndios originais.
