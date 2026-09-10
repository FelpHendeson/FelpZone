# Prompt — Fatia 9.3: ações e passagem do tempo

Implemente somente a Fatia 9.3 do Sistema 9 — Necessidades e sobrevivência leve.

Antes de alterar código, leia integralmente:

- `rpg-narrativo-ia/AGENTS.md`;
- `rpg-narrativo-ia/README.md`;
- `rpg-narrativo-ia/docs/PROJECT-STATUS.md`;
- `rpg-narrativo-ia/docs/SYSTEM-NEEDS.md`;
- `rpg-narrativo-ia/docs/SYSTEM-INTEGRATION.md`;
- os módulos e testes de necessidades, inventário, crafting, tempo, ciclo diário, sandbox e orquestração.

## Objetivo

Compor necessidades com o loop jogável: criar consumo e repouso e aplicar desgaste exatamente uma vez para cada período efetivamente cobrado por qualquer ação sandbox.

## Escopo obrigatório

1. Adicione `needs.consume` e `needs.rest` a `SandboxAction`.
2. Consumo remove exatamente uma unidade do inventário, aplica o plano puro da 9.1 e custa zero períodos.
3. Repouso simples funciona em qualquer localização atual válida, custa dois períodos e aplica o efeito antes do desgaste.
4. Repouso junto à fogueira exige uma `campfire` ativa no local atual, custa dois períodos e aplica saúde/energia antes do desgaste.
5. Depois da ação primária e de seus efeitos, avance o relógio uma única vez e aplique desgaste para exatamente `timeCost.periods`.
6. Use os atributos resultantes do desgaste nas reavaliações gratuitas seguintes.
7. Preserve recuperação populacional e renovação somente quando o relógio avançar.
8. Exponha no resultado um resumo defensivamente copiado do desgaste aplicado.
9. Preserve humanidade, cautela, sessão narrativa, localização e demais sistemas quando a ação não os alterar.
10. Falhas de item, modalidade, fogueira, estado ou tempo são atômicas e não atualizam `updatedAt`.

## Testes obrigatórios

- ação existente de um período aplica fome `+3`, sede `+5` e energia `-2` uma vez;
- repouso aplica recuperação antes dos dois períodos de desgaste;
- penalidades críticas acumulam e saúde respeita o piso 1;
- consumo remove uma unidade, não avança tempo e não aplica desgaste;
- recuperação limitada em `0..100` é informada;
- item ausente ou não consumível falha sem estado parcial;
- repouso aprimorado falha sem fogueira, com fogueira inativa ou em outro local;
- fogueira ativa no local permite o repouso aprimorado;
- ações e estados congelados não são mutados;
- o estado final permanece válido e persistível;
- regressões das ações, ecologia, presença e narrativa continuam passando.

## Proibições desta fatia

- não alterar React, CSS, HUD, mochila ou painéis;
- não criar bloqueio por fome, sede ou energia;
- não implementar morte, game over ou perda de save;
- não adicionar combate, itens, recursos, receitas ou locais;
- não adicionar combustível, doença, intoxicação, clima ou agenda;
- não antecipar as Fatias 9.4 e 9.5.

## Gates

Execute ao final:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Revise custo temporal único, ordem transacional, atomicidade e imutabilidade antes de aprovar. Não faça push sem autorização explícita do autor.
