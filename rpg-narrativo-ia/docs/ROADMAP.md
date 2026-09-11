# Roadmap de evolução sandbox

## Princípio

O motor narrativo consolidado será mantido como camada de eventos e diálogos. A exploração será construída por sistemas independentes, um de cada vez, sempre seguindo o ciclo:

```text
especificar → implementar → testar → revisar → corrigir → consolidar → próxima etapa
```

Não iniciar duas etapas simultaneamente. Cada sistema deve estar estável antes de servir de dependência para o seguinte.

## Sequência aprovada

### Etapa 1 — Horário e data

**Implementada e integrada.** O módulo `modules/time` fornece um relógio determinístico por períodos e avanço de dias. O Sistema 7 passou a aplicar os custos das ações sandbox.

Fonte: `SYSTEM-TIME-AND-DATE.md`.

### Etapa 2 — Ciclo diário

**Implementada e integrada.** O módulo `modules/day-cycle` interpreta o avanço do relógio e produz eventos de início e encerramento de períodos e dias, além da fase visual derivada. O Sistema 7 usa esses eventos para recuperação populacional; tema por fase, sobrevivência, agenda e clima não possuem implementação aprovada.

Fonte: `SYSTEM-DAY-CYCLE.md`.

### Etapa 3 — Navegação hierárquica

**Implementada e integrada.** O módulo `modules/navigation` carrega o mapa JSON aninhado e controla localização, descoberta, bloqueios e movimento entre pai, filhos diretos e irmãos. O Sistema 7 persiste o estado, aplica custo e expõe destinos na superfície mobile. A UI possui uma primeira representação visual dos arredores adjacentes, sem mapa global.

Fonte: `SYSTEM-NAVIGATION.md`.

### Etapa 4 — Exploração e descobertas

**Implementada e integrada.** O módulo `modules/exploration` aumenta o percentual de conhecimento de cada local, revela conteúdo dirigido por dados e deriva a conclusão da zona. O Sistema 7 persiste o estado, aplica custo, oferece a ação na interface e conecta uma descoberta ao primeiro encontro.

Fonte: `SYSTEM-EXPLORATION.md`.

### Etapa 5 — Recursos e ecologia

**Implementada e integrada.** O módulo `modules/resources` modela pontos de coleta com capacidade limitada, coleta atômica, renovação curta ou longa e populações que podem ser pressionadas ou extintas localmente. O Sistema 7 persiste, aplica custo e expõe coleta na interface.

Fonte: `SYSTEM-RESOURCES.md`.

### Etapa 6 — Crafting e cozinha

**Implementada e integrada.** O módulo `modules/crafting` declara receitas, consome materiais atomicamente, constrói estruturas no local atual e cozinha quando há estação ativa. O Sistema 7 persiste, aplica custo e expõe receitas na interface.

Fonte: `SYSTEM-CRAFTING.md`.

### Etapa 7 — Integração explorável

Fonte: `SYSTEM-INTEGRATION.md`.

#### Fatia 7.1 — Estado integrado e persistência principal

**Implementada.** `GameState` passou a incluir `sandbox`; esta fatia introduziu `schemaVersion: 2` e migração de partidas v1. A Fatia 7.3 evoluiu o formato para schema 3. A Fatia 8.4 evoluiu o formato atual para schema 4.

#### Fatia 7.2 — Orquestrador de ações e tempo

**Implementada.** `executeSandboxAction` aplica o custo uma vez, recupera populações, sincroniza renovação e reavalia descobertas e receitas sem alterar a interface.

#### Fatia 7.3 — Da introdução à exploração livre

**Implementada.** Depois da capacidade inicial o jogador permanece `playing` sem sessão narrativa, na Clareira do Despertar.

#### Fatia 7.4 — Superfície mobile

**Implementada.** Destinos, explorar, coletar e fabricar estão na interface mobile.

#### Fatia 7.5 — Gatilho de mundo e primeiro encontro

**Implementada.** O jogador desperta, escolhe uma capacidade, explora a Clareira e encontra a criatura e Mira por consequência da descoberta `first-priority-event`. Depois da noite, retorna ao sandbox. O marco mínimo do Sistema 7 foi atingido.

### Etapa 8 — Presenças e interações no mundo

**Aprovada, especificada, implementada e consolidada.** As Fatias 8.1 a 8.6 estão encerradas. Fonte: [Sistema 8 — Presenças e interações](SYSTEM-PRESENCES.md) e [Consolidação dos Sistemas 1 a 8](SYSTEMS-1-8-CONSOLIDATION.md).

#### Fatia 8.1 — Catálogo e estado isolado

**Implementada.** `modules/presences` valida entidades e presenças, mantém estado mínimo serializável e deriva status. Não altera `GameState`, schema, persistência, UI, tempo ou narrativa.

#### Fatia 8.2 — Sincronização com descobertas

**Implementada.** Descobertas reveladas em `ExplorationState` passam a presenças descobertas de forma explícita e idempotente. A consulta por local deriva `available`, `unavailable` e `resolved` sem expor ocultas.

#### Fatia 8.3 — Interações

**Implementada.** Observar, investigar, aproximar, conversar e evitar são dados de catálogo. `planPresenceInteraction` valida presença, condições e custo e devolve um plano com efeitos e possível pedido narrativo, sem aplicar tempo, resolver presença ou abrir sessão.

#### Fatia 8.4 — Estado integrado e orquestração

**Implementada.** `sandbox.presences` entra no save com schema 4. Saves v1, v2 e v3 são migrados na leitura. `presence.interact` executa o plano da Fatia 8.3 com custo único e atomicidade.

#### Fatia 8.5 — Interface mobile

**Implementada.** O painel Mundo mostra presenças conhecidas do local, estados compreensíveis e ações contextuais. Regras continuam no view-model e no motor; o React só apresenta e dispara `presence.interact`.

#### Fatia 8.6 — Conteúdo protótipo

**Implementada.** Explorar a Clareira revela Mira sem abrir conversa. Conversar abre `first-priority` e devolve ao mesmo local. Na Mata Densa, o coelho chifrudo pode ser observado ou evitado sem combate. O gatilho automático da 7.5 na campanha `first-day` foi desligado; o mecanismo genérico permanece. Saves com `world.trigger.first-priority.consumed` reconciliam Mira como resolvida.

## Depois do Sistema 8

### Etapa 9 — Necessidades e sobrevivência leve

**Implementada e consolidada.** As Fatias 9.1 a 9.5 estão consolidadas. O conteúdo atual sustenta uma rota automatizada de oito dias sem combate. Fonte: [Sistema 9 — Necessidades e sobrevivência leve](SYSTEM-NEEDS.md).

#### Fatia 9.1 — Modelo puro e prova matemática

**Implementada, revisada e consolidada.** Módulo isolado de necessidades, desgaste, consumíveis, repouso, faixas derivadas e simulação determinística, sem alterar `GameState`.

#### Fatia 9.2 — Estado principal e migração

**Implementada, revisada e consolidada.** `sede` integra os atributos, novas partidas começam em 25 e o schema 5 migra saves v1 a v4 sem executar gameplay ou regravar durante a leitura.

#### Fatia 9.3 — Ações e passagem do tempo

**Implementada, revisada e consolidada.** O orquestrador aplica desgaste por período cobrado e oferece consumo e repouso atômicos, ainda sem controles visuais. A entrega passou por 8 testes próprios e pela suíte completa de 487 testes, além de lint, tipos, build/PWA e revisão sem achados acionáveis.

#### Fatias 9.4 e 9.5

**Fatias 9.4 e 9.5 implementadas, revisadas e consolidadas.** A prova usa somente sistemas e conteúdo atuais, atravessa oito dias após a preparação, mantém a população local e não exige combate nem ajuste de balanceamento.

## Depois do Sistema 9

### Etapa 10 — Objetivos, jornadas e registro de descobertas

**Aprovada e em implementação.** O sistema conectará ações e conhecimento já existentes em jornadas persistentes e em um diário derivado, sem retirar a liberdade do sandbox. Fonte: [Sistema 10 — Objetivos, jornadas e registro de descobertas](SYSTEM-OBJECTIVES.md).

#### Fatia 10.1 — Modelo puro

**Implementada, revisada e consolidada.** Catálogo, estado isolado, validação, ativação e conclusão manual de etapas, sem `GameState`, save ou UI. A entrega passou por 40 testes próprios e pela suíte completa de 533 testes.

#### Fatias 10.2 a 10.5

**Aprovadas como sequência; Fatia 10.2 é a próxima.** Integração/persistência, atualização/diário, interface mobile e primeira jornada ponta a ponta entram somente depois da consolidação da fatia anterior.

## Depois do Sistema 10

Não existe Sistema 11 aprovado nem uma ordem fechada posterior. A classificação completa está em [Estado, metas e horizonte](PROJECT-STATUS.md).

### Direções definidas pelo autor, ainda sem próxima especificação

- interagir com elementos do cenário além de coleta, crafting e presenças;
- ampliar exploração, passagens, áreas bônus, recursos, crafting e cozinha;
- permitir trama principal, conteúdo opcional e alguma forma futura de conclusão de áreas ou rotas;
- desenvolver assentamentos, facções e modelos de sociedade como partes do universo narrativo.

### Em discussão

- minijogos;
- expansão do mapa visual para visão regional ou global;
- notificações mais amplas do Sistema além do feedback de jornadas;
- progressão extensa de NPCs;
- formato de rotas e de conclusão global.

### Ainda não discutido / sem certeza de implementação

- estado persistente próprio, agenda e deslocamento autônomo de NPCs;
- comportamento ou IA de criaturas;
- ferramentas, equipamentos, durabilidade e combustível;
- grupo ou companheiros;
- combate;
- clima, economia, comércio ou viagem rápida;
- administração jogável de assentamentos ou facções;
- geração procedural, backend, sincronização, monetização e editor.

Nenhum item desta seção autoriza implementação. Uma etapa posterior só recebe número depois de ser discutida, especificada e aprovada pelo autor.

## Regra de entrada de um sistema

Antes de implementar, definir:

1. problema de diversão ou imersão resolvido;
2. estado lido e alterado;
3. contratos públicos;
4. apresentação mobile;
5. relação com tempo, navegação e narrativa;
6. menor sequência jogável;
7. testes e critérios de aceite;
8. itens explicitamente fora da etapa.
