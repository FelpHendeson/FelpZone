# Prompt — Fatia 10.4: interface mobile de Jornadas e Diário

Implemente somente a Fatia 10.4 do Sistema 10 — Objetivos, jornadas e registro de descobertas.

## Base consolidada

As Fatias 10.1 a 10.3 consolidaram domínio, schema 6, sincronização após ações e `buildJournalView`. Preserve esses contratos e não adicione conteúdo jogável nesta etapa.

## Objetivo

Apresentar Jornadas e Diário na superfície mobile existente, permitir acompanhar uma jornada durante a sessão e comunicar progresso sem interromper o jogo.

## Escopo obrigatório

1. Adicionar a aba `Diário` à navegação inferior da exploração, mantendo todos os cinco alvos com pelo menos 48 px.
2. Exibir um painel mobile-first derivado exclusivamente de `buildJournalView`.
3. Separar jornadas principais ativas, opcionais/descobertas ativas e concluídas.
4. Mostrar progresso textual (`N de M etapas`) e barra acessível; não depender somente de cor.
5. Em jornadas ativas, exibir etapas concluídas e somente as próximas etapas elegíveis já fornecidas pelo view-model.
6. Permitir acompanhar uma jornada ativa por vez em estado efêmero da interface, sem alterar save ou schema.
7. Mostrar a próxima etapa da jornada acompanhada no painel Mundo, sem bloquear ações.
8. Exibir registros de locais visitados, descobertas reveladas, presenças conhecidas/resolvidas e histórico narrativo.
9. Fornecer estados vazios úteis enquanto o catálogo inicial continuar vazio.
10. Comunicar etapa/jornada concluída no feedback não modal após uma ação, sem vazar objetivo oculto não ativado.
11. Garantir ausência de overflow horizontal em 320 px, 375 px, tablet e desktop.

## Fora da fatia

- conteúdo “Primeiros passos” ou qualquer objetivo no catálogo inicial;
- persistência da jornada acompanhada;
- alteração de schema, domínio ou critérios;
- recompensas, modal obrigatório, notificações do sistema operacional;
- novos locais, itens, receitas, NPCs ou mecânicas;
- arte final.

## Gates

Adicione testes do view-model/superfície, navegação, acompanhamento, estados vazios, feedback e sigilo. Execute suíte completa, lint, tipos, build/PWA, revisão React, validação visual em celular e desktop e gate de avanço. Não faça push.
