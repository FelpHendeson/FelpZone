# Prompt — Fatia 10.2: integração e persistência

Implemente somente a Fatia 10.2 do Sistema 10 — Objetivos, jornadas e registro de descobertas.

## Base consolidada

A Fatia 10.1 criou o módulo puro de objetivos. Preserve seus contratos e não adicione interface ou conteúdo jogável nesta etapa.

## Objetivo

Avaliar critérios contra as fontes canônicas do `GameState`, sincronizar progresso explicitamente e persistir `ObjectivesState` com migração segura.

## Escopo obrigatório

1. Avaliação pura dos nove critérios aprovados em `SYSTEM-OBJECTIVES.md`.
2. Sincronização idempotente que ativa objetivos elegíveis, conclui etapas e relata somente mudanças novas.
3. Objetivos sequenciais avançam enquanto a próxima etapa estiver satisfeita; objetivos paralelos registram todas as etapas satisfeitas.
4. Catálogo inicial vazio até a Fatia 10.5.
5. `ObjectivesState` no `GameState` persistido e `schemaVersion: 6`.
6. Contrato explícito de `GameStateV5` e migração v5 → v6.
7. Saves v1 a v4 continuam atravessando a cadeia até v6.
8. Migração cria o estado inicial e o sincroniza contra fatos já existentes, sem tempo, efeitos ou escrita no armazenamento.
9. Schema 6 rejeita estado de objetivos ausente ou malformado.
10. Persistência aceita catálogo customizado para testes sem acoplar conteúdo ao parser.

## Fora da fatia

- chamada automática depois de ações ou escolhas;
- diário, view-model, UI ou CSS;
- objetivo acompanhado;
- feedback de progresso;
- conteúdo “Primeiros passos”;
- recompensas ou efeitos de conclusão;
- qualquer outro sistema.

## Gates

Adicione testes de todos os critérios, sincronização, imutabilidade, migrações v1–v5, schema atual e leitura sem regravação. Execute suíte completa, lint, tipos, build/PWA, revisão e gate de avanço. Não faça push.
