# Validação manual — v0.2.180 (experimental, Foundry VTT v14)

Esta versão é uma **prova de conceito de registro/compêndio**. Não modifica a execução de `Item.roll()` e **não automatiza Anger**. As macros são apenas referências e mostram informações. Não utilizar os resultados deste build como evidência de regras de combate novas.

1. **Faça backup do mundo e dos personagens**. Instale o ZIP completo em um ambiente de teste, sem sobrescrever uma campanha em andamento.
2. Reinicie o Foundry v14 e abra **Compêndios → Automações Nativas → Macros_D616**. Confirme as 27 pastas de Power Set e as 7 entradas em Basic, Super-Speed e Elemental Control.
3. Veja se cada macro tem o **mesmo ícone** que o respectivo poder no compêndio Powers. Um clique manual na macro deve apenas exibir aviso, **sem modificar Focus, Health, concentração ou ações**.
4. No console do navegador, com um personagem de teste selecionado que possua Anger, confira o registro sem executar mecânica:

```js
const actor = canvas.tokens.controlled[0]?.actor;
const power = actor?.items.find(i => i.name === 'Anger' && i.system.powerSet === 'Basic');
game.multiverseD616.nativePowerAutomations.inspect(power);
// Esperado: { matched:true, mode:'planned', powerId:..., macroId:..., handlerId:'anger' }
```

5. Confirme o comportamento **inalterado** de Energy Absorption (preparo e gasto únicos), Lightning Actions **com a configuração atual da Central**, Elemental Protection, concentração, HUD, ações/reação e dano. A macro não executa nem substitui o controlador existente.
6. Confirme acesso com jogador de teste (permissão de leitura no compêndio), sem executar scripts privilegiados. Teste um personagem importado (ID diferente do original) e Token não vinculado; a busca deve usar Power Set + nome além de possíveis IDs de origem.
7. Observe o console por erros de leitura do pack ou registro. Um erro de carregamento do compêndio/ícone invalida a prova de conceito e deve ser corrigido **antes** de integrar `Item.roll()`.

## Etapas posteriores — não incluídas no ZIP

- Dispatcher no ponto único `Item.roll()`, com validação de permissões, execução única e reuso do motor.
- Anger: custo variável, bônus **aditivo** de dano Melee, penalidade Logic, concentração exclusiva, bloqueio e limpeza automática.
- Migração **somente quando justificada** de rotinas já validadas. Lightning Actions ainda depende das regras passivas previamente configuradas na Central.
- Editor visual de Animações de Status com estética do Visual do Poder: projeto independente, ainda não implementado.

## Ícones

A geração do `Macros_D616` usa o campo `img` real de cada Power no LevelDB (ferramenta `tools/build-native-macro-pack.py`). Ao alterar os ícones oficiais, reconstruir o pack numa nova versão e revalidar os IDs. **Ainda não há sincronização em tempo real** quando o mestre edita o ícone de um poder.
