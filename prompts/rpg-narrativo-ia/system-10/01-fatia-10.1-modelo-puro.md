# Prompt — Fatia 10.1: modelo puro de objetivos

Implemente somente a Fatia 10.1 do Sistema 10 — Objetivos, jornadas e registro de descobertas.

## Leitura obrigatória

Antes de alterar código, leia integralmente:

- `rpg-narrativo-ia/AGENTS.md`;
- `rpg-narrativo-ia/README.md`;
- todos os arquivos de `rpg-narrativo-ia/docs/`;
- as skills locais indicadas pelo projeto;
- os módulos e testes de presenças, necessidades e exploração como referências de validação e imutabilidade.

## Objetivo

Criar um módulo puro `src/modules/objectives` que valide definições e mantenha progresso isolado de jornadas, sem conectá-lo ao jogo.

## Escopo obrigatório

1. Tipos públicos para categoria, modo de etapas, definição, etapa, estado, progresso e status.
2. `inspectObjectiveCatalog` e `indexObjectiveCatalog`.
3. `createInitialObjectivesState` com ativação somente dos objetivos automáticos.
4. `inspectObjectivesState` com validação profunda.
5. `activateObjective`, idempotente.
6. `completeObjectiveStep`, idempotente para etapas já concluídas.
7. Ordem sequencial obrigatória e conclusão livre no modo paralelo.
8. Conclusão automática do objetivo ao registrar sua última etapa.
9. `getObjectiveStatus`, `getObjective` e consultas somente de objetivos conhecidos.
10. Cópias defensivas e índices que rejeitam mutação em runtime.
11. Testes de caminhos válidos, entradas hostis, imutabilidade, idempotência e divergência entre lista e índice.

O catálogo pode usar fixtures nos testes. O conteúdo “Primeiros passos” pertence à Fatia 10.5 e não deve entrar agora.

## Invariantes

- IDs globais de objetivo não vazios e únicos;
- IDs de etapa não vazios e únicos dentro do objetivo;
- título, descrição e rótulos válidos;
- categorias somente `main`, `side` e `hidden`;
- modos somente `sequential` e `parallel`;
- ao menos uma etapa por objetivo;
- critérios e ativação têm forma válida, mas ainda não são avaliados contra `GameState`;
- estado contém no máximo uma entrada por objetivo;
- toda entrada referencia objetivo existente;
- etapas concluídas existem e não se repetem;
- modo sequencial não aceita lacunas;
- `completed` é verdadeiro se e somente se todas as etapas foram concluídas;
- operações não mutam catálogo nem estado recebido;
- consultas comuns não revelam objetivos ausentes do estado.

## Fora da Fatia 10.1

- alteração de `GameState`, `SandboxState` ou `schemaVersion`;
- migração, persistência ou `localStorage`;
- avaliação de critérios contra o jogo;
- sincronização automática;
- nova `SandboxAction`;
- alteração no fluxo narrativo;
- diário e view-model;
- UI, CSS ou navegação;
- conteúdo “Primeiros passos”;
- recompensas e efeitos;
- combate ou qualquer sistema fora do Sistema 10.

## Gates

- testes específicos do módulo;
- suíte completa;
- lint;
- typecheck;
- build/PWA;
- revisão Bugbot e gate de avanço.

Não faça push. O commit só pode ocorrer depois de revisão, correções e aprovação dos gates.
