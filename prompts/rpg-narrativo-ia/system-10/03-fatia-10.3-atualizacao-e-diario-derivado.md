# Prompt — Fatia 10.3: atualização e diário derivado

Implemente somente a Fatia 10.3 do Sistema 10 — Objetivos, jornadas e registro de descobertas.

## Base consolidada

As Fatias 10.1 e 10.2 já consolidaram o catálogo, o estado monotônico, os nove critérios, a sincronização explícita e a persistência no schema 6. Preserve esses contratos.

## Objetivo

Fazer ações do sandbox sincronizarem objetivos exatamente uma vez sobre o estado final da transação e produzir um modelo de diário seguro, derivado apenas do conhecimento já adquirido pelo jogador.

## Escopo obrigatório

1. `executeSandboxAction` recebe um catálogo de objetivos opcional e usa o catálogo inicial vazio por padrão.
2. A sincronização ocorre depois dos efeitos, do custo temporal, das reavaliações gratuitas, das presenças e da eventual abertura narrativa da ação.
3. O resultado da ação expõe o resumo de objetivos recém-ativados, etapas recém-concluídas e jornadas recém-concluídas.
4. A ação continua cobrando tempo exatamente uma vez; sincronizar objetivos não altera `updatedAt`, inventário, necessidades, mundo, narrativa ou qualquer outro campo.
5. Falha de objetivo torna toda a ação atômica e não persiste estado parcial.
6. O diário é um view-model puro e não persistido que reúne:
   - jornadas conhecidas, sem objetivos ocultos/bloqueados;
   - etapas concluídas e apenas as próximas etapas elegíveis;
   - locais visitados e suas descobertas já reveladas;
   - presenças já descobertas, com estado resolvido ou conhecido;
   - cópias do histórico narrativo já registrado.
7. O diário mantém ordem canônica/determinística e devolve cópias defensivas.
8. Abrir ou reconstruir o diário não avança tempo, não sincroniza estado e não escreve no save.
9. O catálogo inicial de objetivos continua vazio até a Fatia 10.5.

## Fora da fatia

- componentes React, tela, navegação inferior, CSS ou feedback visual;
- objetivo acompanhado;
- conteúdo jogável “Primeiros passos”;
- alteração de schema ou nova migração;
- recompensas, efeitos de conclusão ou novos sistemas;
- sincronização automática em leitura do diário.

## Gates

Adicione testes de integração para todas as famílias de ação relevantes, custo único, idempotência, atomicidade, ausência de vazamento oculto e derivação completa do diário. Execute suíte completa, lint, tipos, build/PWA, revisão e gate de avanço. Não faça push.
