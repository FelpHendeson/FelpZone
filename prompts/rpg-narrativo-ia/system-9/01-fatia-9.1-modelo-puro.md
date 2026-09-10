# Prompt — Fatia 9.1: modelo puro de necessidades

Implemente somente a Fatia 9.1 do Sistema 9 — Necessidades e sobrevivência leve.

Antes de alterar código, leia integralmente:

- `rpg-narrativo-ia/AGENTS.md`;
- `rpg-narrativo-ia/README.md`;
- `rpg-narrativo-ia/docs/PROJECT-STATUS.md`;
- `rpg-narrativo-ia/docs/SYSTEMS-1-8-CONSOLIDATION.md`;
- `rpg-narrativo-ia/docs/SYSTEM-NEEDS.md`;
- `rpg-narrativo-ia/docs/SYSTEM-TIME-AND-DATE.md`;
- `rpg-narrativo-ia/docs/SYSTEM-DAY-CYCLE.md`;
- `rpg-narrativo-ia/docs/SYSTEM-RESOURCES.md`;
- `rpg-narrativo-ia/docs/SYSTEM-CRAFTING.md`;
- `rpg-narrativo-ia/docs/SYSTEM-INTEGRATION.md`;
- módulos e testes atuais de tempo, recursos, crafting e sandbox.

## Objetivo

Criar um módulo TypeScript puro `src/modules/needs` que prove o contrato de desgaste e recuperação antes de qualquer integração com o estado principal.

## Escopo obrigatório

1. Defina um snapshot isolado com `saude`, `energia`, `fome` e `sede`, todos inteiros de `0` a `100`.
2. Defina e valide a configuração de desgaste por período:
   - fome `+3`;
   - sede `+5`;
   - energia `-2`;
   - fome em `100`: saúde `-2` por período;
   - sede em `100`: saúde `-3` por período;
   - energia em `0`: saúde `-1` por período;
   - dano de necessidades respeita piso de saúde `1`.
3. Implemente operação pura para aplicar de `0` a `10_000` períodos, retornando estado anterior, atual e um resumo agregado das mudanças.
4. Defina catálogo validado de consumíveis com os IDs e efeitos aprovados em `SYSTEM-NEEDS.md`.
5. Implemente planejamento puro de consumo de uma unidade, sem receber nem alterar `InventoryItem[]` nesta fatia.
6. Defina as duas modalidades de repouso e uma operação pura que devolva seus efeitos e custo, sem consultar mapa ou crafting.
7. Derive as faixas `stable`, `attention`, `urgent` e `critical` sem persistir rótulos.
8. Preserve cópias defensivas e imutabilidade profunda dos catálogos indexados.
9. Use erros de domínio controlados e mensagens em português.

## Testes obrigatórios

- configuração, snapshot, IDs duplicados e limites inválidos são rejeitados;
- zero períodos não altera valores;
- um e vários períodos aplicam desgaste exatamente uma vez;
- penalidades críticas se acumulam e saúde não cai abaixo de 1;
- todos os valores ficam entre 0 e 100;
- consumo conhecido devolve os efeitos esperados;
- item desconhecido ou não consumível falha sem alteração;
- repouso simples e junto à fogueira devolvem custo e efeitos corretos;
- faixas derivadas respeitam os limites documentados;
- entradas congeladas não são mutadas;
- uma simulação pura de sete dias demonstra demanda média menor ou igual a 1 água por dia, 1 carne por dia e repouso possível, usando os valores aprovados. Essa simulação ainda não substitui o teste ponta a ponta da Fatia 9.5.

## Proibições desta fatia

- não alterar `GameState`, `Attributes`, `SCHEMA_VERSION`, migrações ou persistência;
- não alterar `executeSandboxAction` nem criar novas ações nele;
- não alterar React, CSS, HUD, mochila ou painéis;
- não mudar mapas, descobertas, recursos, populações ou receitas atuais;
- não implementar combate, morte, doença, intoxicação, combustível ou novos itens;
- não criar backend nem IA em runtime;
- não antecipar as Fatias 9.2 a 9.5.

## Gates

Execute ao final:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Faça uma revisão final de escopo e relate claramente arquivos alterados, decisões tomadas, testes executados e pendências reais. Não faça push sem autorização explícita do autor.
