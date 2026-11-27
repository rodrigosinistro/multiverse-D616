# Macros_D616 — v0.2.182 — Integração das automações existentes

## Cobertura nesta versão

| Poder | Power Set | Controlador original | Status do registro | Quando executa |
|---|---|---|---|---|
| Anger | Basic | `native-power-anger.mjs` | Nativo ativo | `Item.roll()` após Focus e Concentração (v0.2.181) |
| Energy Absorption | Basic | `energy-absorption-custom.mjs` | Existente delegado | `Item.roll()` antes do custo genérico; exatamente um chamado |
| Lightning Actions | Super-Speed | `custom-automations.mjs` | Requer configuração na Central | Passiva enquanto possuir o poder, se regra habilitada |
| Elemental Protection 1 | Elemental Control | `elemental-shields.mjs` | Existente delegado | Concentração e resolução de dano |
| Elemental Protection 2 | Elemental Control | `elemental-shields.mjs` | Existente delegado | Concentração e resolução de dano |
| Elemental Protection 3 | Elemental Control | `elemental-shields.mjs` | Existente delegado | Concentração e resolução de dano |
| Elemental Protection 4 | Elemental Control | `elemental-shields.mjs` | Existente delegado | Concentração e resolução de dano |

**Importante:** são sete referências no compêndio, não sete controladores reimplementados. Os seis poderes legados continuam executados exclusivamente pelos seus caminhos originais. O compêndio não concede bônus; as macros são apenas referências e consultas. O catálogo de 398 poderes e os 27 Power Sets não foram editados. Não há sincronização de ícones em tempo real: a ferramenta `tools/build-native-macro-pack.py` reconstrói o catálogo a partir dos ícones oficiais em uma nova versão.

## Validação no Foundry v14

1. Faça backup do mundo; instale a v0.2.182 em ambiente de teste e reinicie o Foundry. Confira 27 pastas / 7 macros / ícones originais. A macro deve informar o estado **sem gastar Focus**.
2. **Energy Absorption:** com personagem de teste em combate, ative uma vez. Deve gastar 15 Focus e 1 Reação, sem abrir fluxo normal de poder; tente reativar enquanto Preparado, bloqueando gasto adicional. Receba dano que possa ser absorvido e confira crédito, capacidade de Focus e limpeza já existentes. Teste Mestre e Jogador.
3. **Elemental Protection 1–4:** ative por HUD/ficha, confira Concentração e limites 10/20/30/40. Ataque para verificar absorção, rompimento e limpeza do efeito. Confirme que os cálculos de RD continuam inalterados.
4. **Lightning Actions:** com a regra passiva da Central **habilitada**, confira +1 Ação, +1 Reação e dado Marvel M na iniciativa, sem duplicação. Desabilite a regra **somente no mundo de testes**: o compêndio não deve conceder o bônus por si só. Reative a regra anterior no fim do teste.
5. **Anger:** teste +15 dano Melee / −2 Logic com 10 Focus e remoção ao encerrar Concentração. Faça ataque com RD e verifique o dano. Revalide também uso por ficha, HUD e token não vinculado.
6. Em um personagem de teste, selecione o token e abra o console do navegador (F12). O comando abaixo é **somente leitura**:

```js
const actor = canvas.tokens.controlled[0]?.actor;
const api = game.multiverseD616.nativePowerAutomations;
const powers = actor?.items.filter(i=>i.type==='power' && ['Energy Absorption','Lightning Actions','Elemental Protection 1','Elemental Protection 2','Elemental Protection 3','Elemental Protection 4'].includes(i.name)) ?? [];
console.table(powers.map(item=>({
  poder:item.name,
  modo:api.inspect(item).mode,
  controlador:api.getControllerByItem(item)?.controllerId,
  status:api.inspectController(item,actor)?.state,
})));
```

7. Não habilite manualmente macros do compêndio como scripts privilegiados. Teste com usuário Jogador e GM, verifique console por erros do registro, autorização e efeitos duplicados.

## Preservação e limites

- **Sem mudança funcional no controlador Lightning Actions:** exige regra de Central; o objetivo da v0.2.182 é integrar e documentar a implementação já aprovada, não migrá-la.
- **Elemental Protection:** o diagnóstico observa a condição atual. Não intervém no cálculo de proteção; a lógica original seleciona e consome o efeito.
- **Energy Absorption:** o adaptador encaminha a mesma chamada anterior para o controlador existente; não toca nos hooks de atualização de Health/Focus.
- **Sem mudança de código nos seis compêndios de Itens.** `README.md` preservado. Próximos lotes somente após validação real.
