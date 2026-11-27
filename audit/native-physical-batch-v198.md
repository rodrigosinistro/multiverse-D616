# Multiverse-D616 — v0.2.198 | lote físico/movimento e correção Jinx You

**Estado:** experimental até validação em Foundry v14 com Mestre e Jogador.
**Base:** ZIP completo v0.2.197, cujo lote de sorte estava funcionando exceto pelo ataque de toque do Jinx You.

## Correção principal: Jinx You

A descrição oficial exige teste de Melee para tocar o alvo antes de impor Trouble. A versão anterior omitia essa rolagem. Agora o fluxo é: escolher alvo → verificar toque e custo → **card Marvel de Melee vs Defesa de Melee** → Edge/Trouble com rerolls manuais → confirmar → verificação da rolagem real pelo Mestre → pagamento e efeitos. O cliente não envia uma alegação confiável de que acertou. O Mestre verifica uma mensagem assinada pelo usuário que criou a rolagem, vinculada a cena, token, item, poder e alvo. A mesma mensagem não pode disparar duas aplicações.

- Acerto: consome 5 Focus, Ação Standard, ativa Trouble e Concentração/5 Focus de manutenção por turno.
- Erro: consome os 5 Focus e a Ação, mas **não** aplica Trouble nem Concentração.
- Sucesso Fantástico: habilita dano de Melee **normal**, não dobrado; acerto comum não causa dano pelo toque.
- A aplicação de dano continua pelo card do Mestre; não cria uma segunda chamada de dano/RD.
- Após confirmar o teste, não é permitido alterar dados com Edge/Trouble no mesmo card.

## Lote examinado

**27 poderes auditados**, listados no CSV ao lado. **14 incorporados à biblioteca:** três comportamentos novos ou ampliados (Additional Limbs, Blazing Fast Fists e parte do Spider Sense) e 11 referências a mecânicas previamente existentes. Outros 13 auditados permanecem sem macro e sem alegação de automação. Além disso, Jinx You, já catalogado na versão anterior, teve sua ativação corrigida.

- **Additional Limbs (completo no escopo da rolagem):** +1 Edge em testes de Melee ou Agility, sem rolagem automática.
- **Blazing Fast Fists (completo no escopo de Edge):** +1 Edge em ataques corpo a corpo; sem duplicar a mesma vantagem se a Central já a forneceu.
- **Spider Sense (parcial):** 1 Trouble em ataques com Agility contra defesa de Vigilance do portador. Efeitos permanentes que já existem permanecem intactos; sentidos narrativos não são automatizados.

## Cobertura do catálogo e compêndios

- **398 poderes oficiais** no inventário, inalterados.
- **88 macros de referência** em **27 pastas** por Power Set.
- Classificação atual do inventário: native-active: 12, native-partial: 18, not-registered: 310, reference-existing: 56, requires-configuration: 2.
- **19 arquivos** conferidos por SHA-256 contra a versão anterior, incluindo `README.md` e todos os arquivos dos seis compêndios originais.
- A pasta do Power Set Plasticity aparece com a grafia correta na biblioteca; o compêndio original não foi alterado.

## Teste no Foundry

1. Com Zima PLAYER e Mestre conectado, use **Jinx You** em inimigo adjacente que possa receber Trouble.
2. Confirme que aparece um card de **teste Melee** antes do efeito; utilize EDGE/TROUBLE manualmente se desejar.
3. Em um erro, confira que Trouble/Concentração **não** aparecem e 5 Focus e uma Ação são consumidos.
4. Em um acerto, confira que Trouble é aplicado apenas após **Concluir teste**; Concentração e manutenção começam.
5. Em Fantástico, confira que o card oferece **dano Melee normal**, não o dobro.
6. Teste Additional Limbs em ataques e testes Melee/Agility; não deve aplicar Edge em Ego.
7. Teste Blazing Fast Fists em ataque corpo a corpo, com e sem regra similar ativa na Central.
8. Teste Spider Sense contra ataques de Agility que visam Vigilance e compare com ataques que visam outra defesa.
9. Regressão: Healing Hands, Soothing Touch, Focus Fire, Anger, Energy Absorption e Edge/Trouble manuais entre jogadores.

**Regra de arquitetura preservada:** protocolo atômico da v0.2.196 (`nativeSupportPlayerRequestV2` e `nativeSupportPlayerResultV2`) e aplicação dos efeitos pelo Mestre. Sem atribuir permissões DONO às macros nem executar JavaScript arbitrário com acesso de GM. O README não foi editado. Não publicar no GitHub.

**Limite da validação:** testes Node e conferência estática concluídos; teste prático com dois clientes Foundry não foi executado aqui.
