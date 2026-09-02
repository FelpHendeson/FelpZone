# Prompt — Sistema 8, Fatia 8.4: estado integrado, save e orquestração

> Executar somente após revisão e consolidação da Fatia 8.3.

```text
Implemente somente a Fatia 8.4 do Sistema 8 — Integração do estado de presenças, migração e orquestração de interações.

Trabalhe dentro de `rpg-narrativo-ia`. Leia integralmente:

- `AGENTS.md` e `README.md`;
- `docs/PROJECT-STATUS.md`;
- `docs/SYSTEM-PRESENCES.md`;
- `docs/SYSTEM-INTEGRATION.md`;
- `docs/SYSTEM-TIME-AND-DATE.md`;
- `docs/SYSTEM-DAY-CYCLE.md`;
- implementação e testes de `core/state`, persistência, sandbox, sandbox-actions, world-events, narrativa, efeitos e presenças.

Pré-condição: Fatias 8.1, 8.2 e 8.3 implementadas e consolidadas. Não continue se os contratos necessários não existirem.

Objetivo:

Adicionar o estado mínimo de presenças ao sandbox persistido e integrar `presence.interact` ao mesmo orquestrador atômico das demais ações. Toda interação válida aplica custo temporal no máximo uma vez, executa efeitos, registra resolução quando definida e abre narrativa quando solicitada.

Entregas:

1. Composição

- adicionar `PresenceState` a `SandboxState` com nome consistente, preferencialmente `presences`;
- adicionar catálogos indexados de presenças e interações a `SandboxContext`;
- construir o contexto inicial usando os catálogos validados;
- validar profundamente o novo estado junto ao contexto.

2. Persistência

- incrementar `SCHEMA_VERSION` de 3 para 4;
- preservar leitura de saves v1, v2 e v3 válidos;
- migrar v3 criando estado inicial de presenças e sincronizando todas as descobertas já reveladas;
- não regravar `localStorage` durante `load`;
- rejeitar estado v4 malformado ou incompatível de forma controlada;
- manter contexto e definições fora do JSON salvo.

3. Ação integrada

- adicionar `presence.interact` ao union type de `SandboxAction`;
- receber `presenceId` e `interactionId`;
- planejar a interação pelo contrato puro da Fatia 8.3;
- aplicar efeitos pelas operações existentes do motor;
- aplicar `TimeCost` exatamente uma vez;
- executar renovação, recuperação e reavaliações somente em consequência real do avanço de tempo;
- sincronizar presenças depois de mudanças relevantes;
- resolver a presença somente quando o plano determinar;
- abrir `narrativeSession` somente quando a referência for válida e `canStartSession` permitir;
- retornar feedback declarado pela interação;
- persistir apenas o estado final composto no adaptador de UI existente.

Atomicidade obrigatória:

- validar tudo antes de comprometer mudanças;
- se efeitos, tempo, resolução ou narrativa falharem, nenhuma alteração parcial pode ser retornada ou persistida;
- a mesma ação nunca aplica o custo duas vezes;
- abrir narrativa não acrescenta custo implícito;
- sincronizações gratuitas não avançam o relógio;
- a localização atual não muda durante uma interação;
- `updatedAt` segue a convenção já usada pelo orquestrador;
- a operação pura continua separada da persistência.

Migração e compatibilidade:

- um save v3 que já revelou `first-priority-event` deve migrar com a presença correspondente descoberta;
- um save v3 que revelou `horned-rabbit-tracks` deve migrar com o coelho descoberto;
- saves sem essas descobertas recebem listas vazias;
- saves v1/v2 continuam atravessando a cadeia de migração;
- partidas `completed` legadas continuam abrindo o resumo;
- consumo antigo de `world.trigger.*.consumed` não pode corromper nem duplicar presença;
- a migração é determinística e não inventa resoluções.

Testes obrigatórios:

- estado inicial v4 contém presenças válidas;
- roundtrip de save v4;
- migrações v1→v4, v2→v4 e v3→v4;
- sincronização de descobertas antigas na migração;
- rejeição de presença inválida dentro do save;
- ação bloqueada não altera nem persiste estado;
- interação sem narrativa aplica efeitos/custo uma vez;
- interação narrativa abre sessão válida sem custo duplicado;
- resolução ocorre somente quando declarada;
- presença indisponível, oculta ou resolvida falha de forma controlada;
- localização permanece igual;
- renovação e recuperação só acontecem quando o tempo avança;
- persistência recebe exatamente o estado final;
- regressão completa das ações de navegação, exploração, coleta e crafting.

Não implemente:

- mudanças visuais ou botões de presença;
- novos eventos narrativos extensos;
- remoção prematura do gatilho antigo do primeiro encontro, salvo se estritamente necessário para impedir duplicação e coberto por teste;
- agenda, movimento autônomo, IA ou combate;
- sobrevivência automática;
- qualquer item fora do Sistema 8.

Atualize `SYSTEM-PRESENCES.md`, `SYSTEM-INTEGRATION.md`, `PROJECT-STATUS.md`, `ROADMAP.md`, README e handoff apenas com o estado realmente implementado. Marque apenas a Fatia 8.4 como concluída.

Execute:

npm test
npm run lint
npm run typecheck
npm run build

Relate migrações, fluxo atômico, testes e pendências reais. Não implemente a interface da Fatia 8.5.
```
