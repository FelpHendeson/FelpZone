# Prompt — Sistema 8, Fatia 8.2: sincronização com descobertas

> Executar somente após revisão e consolidação da Fatia 8.1.

```text
Implemente somente a Fatia 8.2 do Sistema 8 — Sincronização de presenças com descobertas.

Trabalhe dentro de `rpg-narrativo-ia`. Antes de alterar arquivos, leia integralmente:

- `AGENTS.md`;
- `README.md`;
- `docs/PROJECT-STATUS.md`;
- `docs/SYSTEM-PRESENCES.md`;
- `docs/SYSTEM-EXPLORATION.md`;
- `docs/SYSTEM-NAVIGATION.md`;
- a implementação e os testes de `modules/presences`;
- a implementação e os testes de `modules/exploration`.

Confirme primeiro que a Fatia 8.1 está presente e que a suíte atual passa. Se houver divergência entre o prompt e o contrato implementado e documentado, preserve a documentação e relate o conflito antes de expandir o escopo.

Objetivo:

Converter descobertas já registradas em `ExplorationState` nas presenças correspondentes de `PresenceState`, explicitamente, sem iniciar narrativa, aplicar tempo, persistir ou modificar a exploração.

Entregue no módulo `modules/presences`:

1. Uma operação pura de sincronização equivalente a:

   `synchronizeDiscoveredPresences(catalog, presenceState, explorationState)`

2. Um resultado explícito contendo, no mínimo:

   - estado anterior de presenças;
   - novo estado de presenças;
   - IDs descobertos nesta sincronização, em ordem determinística.

3. Uma consulta que liste presenças conhecidas de um local com status derivado, sem expor presenças ocultas. Ela deve permitir distinguir `available`, `unavailable` e `resolved` usando localização e condições existentes.

4. Testes unitários específicos da sincronização e das consultas.

Regras obrigatórias:

- uma presença só é descoberta quando seu `discoveryId` já está revelado no estado do local correto;
- a associação catálogo → descoberta validada na Fatia 8.1 continua sendo a fonte do vínculo;
- sincronizar o mesmo estado repetidamente é idempotente;
- IDs retornados como novos não podem se repetir;
- a ordem segue o catálogo indexado, sem depender da ordem acidental de Maps externos;
- presenças previamente descobertas ou resolvidas são preservadas;
- a operação não remove descobertas nem resoluções;
- uma descoberta pode revelar mais de uma presença válida, se o catálogo permitir;
- nenhuma presença é resolvida automaticamente;
- nenhuma narrativa começa automaticamente;
- sincronização não possui custo temporal;
- condições de disponibilidade não impedem a descoberta: elas afetam apenas o status derivado;
- consultas comuns não revelam nome, entidade ou ID de presença oculta;
- nenhuma função muta catálogo, `PresenceState` ou `ExplorationState` recebidos;
- valide estados recebidos antes de usá-los e falhe com erro controlado.

Cenários mínimos de teste:

- estado sem descobertas não revela presença;
- `first-priority-event` revela a presença de Mira na Clareira;
- `horned-rabbit-tracks` revela a presença do coelho na Mata Densa;
- descoberta de outro local não revela presença indevida;
- duas presenças ligadas à mesma descoberta são sincronizadas deterministicamente;
- sincronização repetida não cria duplicatas e não relata IDs antigos como novos;
- presença já resolvida permanece resolvida;
- estado de exploração malformado é rejeitado;
- entradas congeladas continuam intactas;
- consulta exclui ocultas e deriva disponível, indisponível e resolvida corretamente.

Não implemente nesta fatia:

- alteração de `GameState`, `SandboxState` ou `schemaVersion`;
- migração ou persistência principal;
- chamada automática no orquestrador;
- nova `SandboxAction`;
- catálogo de interações;
- aplicação de tempo;
- abertura de narrativa;
- alterações na interface;
- conteúdo narrativo novo;
- agenda, movimento autônomo, IA, combate ou sobrevivência.

Atualize `docs/SYSTEM-PRESENCES.md`, `docs/PROJECT-STATUS.md` e `docs/ROADMAP.md` somente para registrar o que estiver realmente implementado. Marque a Fatia 8.2 como implementada, sem afirmar que a 8.3 começou.

Execute ao final:

npm test
npm run lint
npm run typecheck
npm run build

Relate arquivos alterados, contratos públicos, testes executados e pendências reais. Não antecipe a Fatia 8.3.
```
