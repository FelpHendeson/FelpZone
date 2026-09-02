# Prompt — Sistema 8, Fatia 8.1: catálogo e estado isolado

> Estado: implementada no commit `7b36993`. Não execute novamente sem solicitação de auditoria, correção ou reconstrução.

```text
Implemente somente a Fatia 8.1 do Sistema 8 — Presenças e interações no mundo.

Trabalhe dentro de `rpg-narrativo-ia`. Antes de alterar arquivos, leia integralmente `AGENTS.md`, `README.md`, `docs/PROJECT-STATUS.md`, `docs/SYSTEM-PRESENCES.md`, `docs/SYSTEM-EXPLORATION.md`, `docs/SYSTEM-NAVIGATION.md`, `docs/ARCHITECTURE.md` e os módulos usados como referência.

Objetivo:

Criar o módulo TypeScript puro `modules/presences`, responsável por catálogo de entidades e presenças, estado isolado, validação, descoberta, resolução, status derivado e consultas por localização.

Entregue:

- `WorldEntityKind`: `npc`, `animal` e `creature`;
- definições de entidades;
- definições de presenças vinculadas a entidade, localização e descoberta;
- indexação segura do catálogo;
- `PresenceState` com presenças descobertas e resolvidas;
- criação e validação do estado;
- descoberta e resolução idempotentes;
- status `hidden`, `available`, `unavailable` e `resolved`;
- consulta de presenças descobertas por localização;
- catálogo inicial mínimo para Mira e coelho chifrudo, sem integração ao jogo;
- testes unitários completos.

Operações públicas mínimas:

- `inspectPresenceCatalog`;
- `indexPresenceCatalog`;
- `createInitialPresenceState`;
- `inspectPresenceState`;
- `discoverPresence`;
- `resolvePresence`;
- `getPresence`;
- `getEntity`;
- `listDiscoveredPresencesAtLocation`;
- `getPresenceStatus`.

Invariantes:

- IDs não vazios e únicos;
- tipos desconhecidos rejeitados;
- referências de entidade, localização e descoberta existentes;
- presença e descoberta pertencem ao mesmo local;
- presença resolvida também está descoberta e é resolvível;
- nenhuma mutação de entrada ou de índice interno;
- consultas comuns não expõem conteúdo oculto;
- entradas restauradas são não confiáveis;
- condições reutilizam `GameCondition` e imagens reutilizam `ImageReference`.

Não implemente:

- alteração de `GameState`, `SandboxState` ou `schemaVersion`;
- persistência ou migração;
- sincronização automática com exploração;
- `SandboxAction`, tempo ou narrativa;
- UI;
- qualquer parte das Fatias 8.2 a 8.6;
- agenda, IA, combate, sobrevivência ou aleatoriedade.

Inclua testes para catálogo válido, entradas inválidas, referências quebradas, divergência de local, serialização, imutabilidade, idempotência, resolução inválida, estados malformados, consultas por local e todos os status.

Execute ao final:

npm test
npm run lint
npm run typecheck
npm run build

Relate arquivos alterados, decisões técnicas, testes e pendências reais. Não amplie o escopo.
```
