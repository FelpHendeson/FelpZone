# Sistema 8 — Presenças e interações no mundo

## Estado da decisão

**Aprovado pelo autor em 2 de setembro de 2026.**

O objetivo de experiência, os limites e a sequência de fatias deste documento estão aprovados. As Fatias 8.1 a 8.3 estão implementadas. As fatias seguintes dependem de validação e consolidação da anterior.

## Problema de diversão e imersão

O sandbox já permite explorar, viajar, coletar e fabricar, mas pessoas e criaturas ainda aparecem apenas como parte de um gatilho narrativo isolado. O mundo precisa comunicar que existem seres presentes nos locais e permitir que o jogador decida como se relacionar com eles.

O Sistema 8 transforma NPCs, animais e criaturas descobertos em presenças visíveis e interativas no local. A narrativa continua sendo responsável por diálogos e escolhas; presença apenas conecta o mundo explorável a essas experiências.

## Resultado jogável

```text
explorar um local
        ↓
revelar uma presença ou seus sinais
        ↓
ver a presença entre as possibilidades do local
        ↓
observar, investigar, aproximar, conversar ou evitar
        ↓
aplicar custo da ação uma única vez
        ↓
abrir narrativa quando a interação definir um evento
        ↓
registrar consequências
        ↓
retornar ao mesmo local do sandbox
```

Nem toda presença precisa iniciar diálogo. Rastros podem apenas produzir informação; um animal pode ser observado; um NPC pode oferecer conversa; uma criatura pode permanecer como ameaça narrativa sem combate implementado.

## Vocabulário

- **entidade:** registro de conteúdo que descreve quem ou o que existe, como Mira ou um coelho chifrudo;
- **presença:** ocorrência de uma entidade em um local específico;
- **descoberta:** fato produzido pelo Sistema 4 que pode revelar uma presença;
- **interação:** ação explícita escolhida pelo jogador sobre uma presença disponível;
- **resolução:** marca de que uma presença de ocorrência única já concluiu sua função;
- **disponibilidade:** resultado derivado das condições atuais, não uma rotina autônoma.

Uma entidade pode futuramente possuir mais de uma presença, mas isso não significa que ela se move sozinha. Cada ocorrência continua declarada como conteúdo.

## Responsabilidades

### Entidades

- fornecer identidade, tipo, nome, descrição e referência visual;
- não guardar posição, agenda, relacionamento ou inteligência artificial;
- não executar lógica.

### Presenças

- associar uma entidade a uma localização;
- indicar qual descoberta a revela;
- declarar condições de disponibilidade;
- informar se a ocorrência pode ser resolvida;
- oferecer interações definidas por dados.

### Exploração

- continuar responsável por aumentar o conhecimento do local;
- revelar IDs de descoberta;
- não criar entidades nem iniciar interações diretamente.

### Narrativa

- continuar responsável pelo texto, diálogo, escolhas e consequências;
- ser aberta por uma interação somente quando o conteúdo declarar um evento;
- devolver o jogador ao sandbox ao terminar a sessão.

### Orquestrador sandbox

- validar a interação;
- aplicar seu custo temporal exatamente uma vez;
- sincronizar os demais sistemas depois do avanço do relógio;
- persistir apenas o estado final composto.

## Modelo conceitual aprovado

Os nomes podem receber pequenos ajustes durante a Fatia 8.1 se os padrões do código exigirem, mas as responsabilidades devem permanecer.

```ts
type WorldEntityKind = 'npc' | 'animal' | 'creature';

interface WorldEntityDefinition {
  id: string;
  kind: WorldEntityKind;
  name: string;
  description: string;
  image?: ImageReference;
}

interface WorldPresenceDefinition {
  id: string;
  entityId: string;
  locationId: string;
  discoveryId: string;
  availabilityConditions?: GameCondition[];
  resolvable: boolean;
}

interface PresenceState {
  discoveredPresenceIds: string[];
  resolvedPresenceIds: string[];
}
```

Estados apresentados na interface são derivados:

```ts
type PresenceStatus =
  | 'hidden'
  | 'available'
  | 'unavailable'
  | 'resolved';
```

- `hidden`: a descoberta vinculada ainda não revelou a presença;
- `available`: descoberta, no local correto, com condições satisfeitas e não resolvida;
- `unavailable`: descoberta, mas com alguma condição atual não satisfeita;
- `resolved`: ocorrência resolvível já concluída.

Não persistir `available` ou `unavailable`, pois ambos dependem do estado atual. Não representar uma presença oculta em consultas comuns de interface.

## Interações dirigidas por dados

O contrato da Fatia 8.3 está implementado. A direção aprovada é:

```ts
type PresenceInteractionKind =
  | 'observe'
  | 'investigate'
  | 'approach'
  | 'talk'
  | 'avoid';

interface PresenceInteractionDefinition {
  id: string;
  presenceId: string;
  kind: PresenceInteractionKind;
  label: string;
  hint?: string;
  timeCost: TimeCost;
  conditions?: GameCondition[];
  effects?: GameEffect[];
  feedback?: string;
  narrative?: {
    campaignId: string;
    eventId: string;
  };
  resolvesPresence: boolean;
}

interface PresenceInteractionPlan {
  interactionId: string;
  presenceId: string;
  timeCost: TimeCost;
  effects: GameEffect[];
  feedback?: string;
  narrative?: {
    campaignId: string;
    eventId: string;
  };
  resolvesPresence: boolean;
}
```

Os tipos acima descrevem intenções de interação, não resultados fixos. `observe` pode abrir narrativa ou apenas produzir efeito; `talk` não garante sucesso; `avoid` não remove automaticamente a presença. O plano da Fatia 8.3 não aplica efeitos, não avança o relógio, não resolve a presença e não abre `narrativeSession`.

## Estado mínimo e persistência

O Sistema 8 terá estado próprio apenas para registrar presenças descobertas e ocorrências resolvidas. Isso foi aprovado como parte desta etapa.

Esse estado mínimo **não é um `NPCState` completo**. Continuam sem aprovação:

- posição autônoma individual;
- agenda por horário;
- memória social genérica;
- inventário de NPC;
- saúde ou atributos de criatura;
- reaparecimento dinâmico;
- máquina de estados comportamental;
- IA ou tomada de decisão autônoma.

Relacionamentos continuam em `GameState.relationships`. Resultados narrativos continuam em flags, atributos, inventário e histórico existentes.

## Disponibilidade

Uma presença só pode ser consultada como disponível quando:

1. sua definição e estado são válidos;
2. ela foi descoberta;
3. pertence à localização atual;
4. ainda não foi resolvida, quando `resolvable: true`;
5. suas `availabilityConditions` são satisfeitas.

A indisponibilidade deve retornar motivo controlado para a UI quando for seguro exibi-lo. Condições não podem revelar antecipadamente a identidade de conteúdo oculto.

## Integração com exploração

- `discoveryId` precisa existir nas definições de exploração;
- a descoberta precisa pertencer ao mesmo `locationId` da presença;
- a sincronização adiciona a presença exatamente uma vez;
- reavaliar o mesmo estado é idempotente;
- revelar uma presença não inicia narrativa automaticamente;
- descobertas antigas de um save migrado também precisam ser sincronizadas;
- a exploração não passa a depender internamente do módulo de presenças.

## Integração com narrativa

- uma interação pode declarar `campaignId` e `eventId` existentes;
- abrir a narrativa não marca a presença como resolvida por si só;
- a resolução acontece somente no ponto definido pelo contrato da interação;
- falha ao abrir a narrativa não pode consumir tempo nem resolver a presença parcialmente;
- ao terminar, `currentLocationId` permanece inalterado;
- histórico, relações e flags continuam sendo aplicados pelo motor narrativo existente.

## Interface mobile aprovada

O local ganhará uma seção “Presenças neste local”. Ela aparece somente quando houver conteúdo descoberto relevante.

```text
┌──────────────────────────────────┐
│ PRESENÇAS NESTE LOCAL          2 │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ [retrato] MIRA VALE          │ │
│ │ Sobrevivente · Disponível    │ │
│ │ Confiança: 2                 │ │
│ │                              │ │
│ │ [Conversar]     [Observar]   │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ [?] MOVIMENTO NOS ARBUSTOS   │ │
│ │ Criatura não identificada    │ │
│ │                              │ │
│ │ [Investigar]       [Evitar]  │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

Regras de UX:

- não mostrar conteúdo ainda oculto;
- diferenciar NPC, animal e criatura sem depender apenas de cor;
- mostrar por que uma interação conhecida está bloqueada;
- mostrar custo temporal antes da confirmação;
- manter alvos de toque com pelo menos 48 px;
- usar placeholders locais até existir arte aprovada;
- evitar uma nova página longa: detalhes e interações podem usar cartão expansível ou painel inferior;
- não exibir combate, nível, vida de criatura, chance de sucesso ou hostilidade enquanto essas regras não existirem.

## Fatias aprovadas

### Fatia 8.1 — Catálogo e estado isolado

**Implementada.** O módulo puro `modules/presences` indexa entidades e presenças, valida o catálogo contra mapa e exploração, mantém `PresenceState` serializável e deriva `hidden` / `available` / `unavailable` / `resolved`. Condições de disponibilidade são copiadas e congeladas em profundidade. Os índices `byEntity`, `byPresence` e `presenceIdsByLocation` não são `Map` mutáveis: a API continua `ReadonlyMap`, mas a implementação rejeita `set`, `delete` e `clear` em runtime e recusa catálogos indexados cujos mapas não sejam consistentes com as listas. O catálogo inicial reutiliza as descobertas já existentes `first-priority-event` (Clareira) e `horned-rabbit-tracks` (Mata Densa) só para validar Mira e o coelho chifrudo; não está ligado ao jogo, ao save nem à UI.

### Fatia 8.2 — Sincronização com descobertas

**Implementada.** `synchronizeDiscoveredPresences` converte descobertas já reveladas em `ExplorationState` nas presenças correspondentes, na ordem do catálogo, sem mutar as entradas, iniciar narrativa, aplicar tempo ou alterar a exploração. `listKnownPresencesAtLocation` lista somente presenças conhecidas do local com status `available`, `unavailable` ou `resolved`. Condições de disponibilidade afetam o status derivado, não a descoberta.

### Fatia 8.3 — Interações

**Implementada.** O catálogo `INITIAL_PRESENCE_INTERACTIONS` indexa interações por ID e por presença. Mira oferece `talk` com referência ao evento existente `first-priority`; o coelho oferece `observe` sem diálogo. `listKnownPresenceInteractions` lista interações de presenças descobertas, inclusive bloqueadas com motivo seguro, e omite as de presenças ocultas. `planPresenceInteraction` devolve um plano com cópias defensivas de custo, efeitos e narrativa. O plano não aplica efeitos, não avança o relógio, não resolve a presença e não abre `narrativeSession`.

### Fatia 8.4 — Estado integrado e orquestração

Adicionar presenças ao sandbox persistido, criar migração de schema e integrar `presence.interact` ao orquestrador com custo único e atomicidade.

### Fatia 8.5 — Interface mobile

Expor presenças conhecidas no local, estados compreensíveis, ações contextuais e transição para narrativa.

### Fatia 8.6 — Conteúdo protótipo

Usar Mira e os coelhos chifrudos para validar ao menos uma presença social, uma presença de criatura, uma interação narrativa e uma interação sem diálogo.

## Fatia 8.1 — Contrato de implementação

### Entrega

- `src/modules/presences/types.ts`;
- `src/modules/presences/index.ts` e arquivos internos necessários;
- catálogo inicial pequeno o suficiente para validar Mira e coelho chifrudo, sem conectá-lo ao jogo;
- testes unitários do módulo;
- documentação ajustada somente se a implementação exigir precisão adicional.

### Operações públicas mínimas

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

Os nomes podem acompanhar convenções já usadas nos módulos existentes, desde que exista equivalência clara.

### Invariantes

- IDs de entidade e presença são strings não vazias e únicos;
- tipos desconhecidos são rejeitados;
- toda presença referencia entidade, localização e descoberta existentes;
- presença e descoberta pertencem ao mesmo local;
- referências visuais reutilizam `ImageReference` válido;
- condições reutilizam os formatos de `GameCondition` já suportados;
- listas de estado não possuem IDs repetidos ou inexistentes;
- uma presença resolvida também precisa estar descoberta;
- presença não resolvível não pode constar como resolvida;
- descobrir ou resolver novamente é idempotente;
- funções não mutam definições nem estado recebido;
- consultas comuns não retornam presenças ocultas;
- definições e estado são tratados como entradas não confiáveis;
- cada `GameCondition` armazenada é uma cópia independente e congelada;
- índices não aceitam mutação em runtime (`set`, `delete`, `clear`);
- catálogo indexado com listas e mapas inconsistentes é rejeitado de forma controlada.

### Testes obrigatórios

- catálogo válido é indexado;
- IDs duplicados ou vazios são rejeitados;
- tipo de entidade desconhecido é rejeitado;
- referência inexistente de entidade, localização ou descoberta é rejeitada;
- divergência entre local da presença e da descoberta é rejeitada;
- estado inicial é vazio e serializável;
- descoberta adiciona exatamente um ID sem mutação;
- descoberta repetida é idempotente;
- resolução exige presença descoberta e resolvível;
- resolução repetida é idempotente;
- estado restaurado malformado é rejeitado;
- consulta por local retorna somente presenças descobertas daquele local;
- status oculto, disponível, indisponível e resolvido é derivado corretamente;
- arrays e objetos devolvidos não permitem alterar os índices internos.

### Fora da Fatia 8.1

- alteração de `GameState` ou `schemaVersion`;
- migração ou persistência principal;
- sincronização automática com exploração;
- nova `SandboxAction`;
- aplicação de custo temporal;
- abertura de narrativa;
- mudanças na interface;
- agenda, movimento ou reaparecimento;
- combate, dano, captura ou domesticação;
- aleatoriedade;
- sobrevivência automática.

## Fatia 8.2 — Contrato de implementação

### Entrega

- operação pura `synchronizeDiscoveredPresences(catalog, presenceState, explorationState)`;
- resultado com estado anterior, estado novo e IDs descobertos nesta sincronização;
- consulta `listKnownPresencesAtLocation` com status derivado visível;
- testes unitários da sincronização e das consultas;
- documentação ajustada somente ao comportamento implementado.

### Invariantes

- uma presença só é descoberta quando seu `discoveryId` já está revelado no estado do local correto;
- o vínculo catálogo → descoberta da Fatia 8.1 permanece a fonte da associação;
- sincronizar o mesmo estado repetidamente é idempotente;
- IDs novos não se repetem e seguem a ordem do catálogo indexado;
- presenças já descobertas ou resolvidas são preservadas;
- a operação não remove descobertas nem resoluções;
- uma descoberta pode revelar mais de uma presença;
- nenhuma presença é resolvida automaticamente;
- condições de disponibilidade não impedem a descoberta;
- consultas comuns não expõem presenças ocultas;
- catálogo, `PresenceState` e `ExplorationState` recebidos não são mutados;
- estados malformados são rejeitados de forma controlada.

### Fora da Fatia 8.2

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

## Fatia 8.3 — Contrato de implementação

### Entrega

- catálogo de interações indexado por ID e por presença;
- `inspectPresenceInteractionCatalog` e `indexPresenceInteractionCatalog`;
- consulta `listKnownPresenceInteractions`;
- planejamento puro `planPresenceInteraction`;
- protótipo mínimo com Mira (`talk` → `first-priority`) e coelho (`observe` sem diálogo);
- testes unitários do catálogo, da consulta e do planejamento;
- documentação ajustada somente ao comportamento implementado.

### Operações públicas mínimas

- `inspectPresenceInteractionCatalog`;
- `indexPresenceInteractionCatalog`;
- `listKnownPresenceInteractions`;
- `planPresenceInteraction`.

### Invariantes

- IDs globais de interação não vazios e únicos;
- tipo pertencente a `observe`, `investigate`, `approach`, `talk` ou `avoid`;
- `presenceId` existente no catálogo de presenças;
- rótulo não vazio; dica e feedback válidos quando presentes;
- `timeCost` validado por `inspectTimeCost`;
- condições e efeitos validados nos formatos existentes, sem aplicar regras do motor;
- referência narrativa aponta para campanha e evento existentes, com `canStartSession`;
- `resolvesPresence` é booleano e só pode ser verdadeiro se a presença for resolvível;
- presença oculta, indisponível ou resolvida não aceita planejamento;
- a interação precisa pertencer à presença solicitada;
- condições da presença e da interação precisam estar satisfeitas para o plano ser válido;
- a consulta pode mostrar interação conhecida bloqueada com motivo seguro e não revela interação de presença oculta;
- o plano devolve cópias defensivas e não altera `PresenceState`, `GameState` ou catálogos;
- a existência de `narrative` não inicia sessão; `resolvesPresence` é intenção, não resolução imediata.

### Fora da Fatia 8.3

- nova `SandboxAction`;
- aplicação de efeitos ou de tempo;
- resolução efetiva da presença;
- abertura de `narrativeSession`;
- alteração de `GameState`, `SandboxState`, schema, save ou migrações;
- UI;
- conteúdo completo da Fatia 8.6;
- agenda, IA, combate ou sobrevivência.

## Critérios de conclusão do Sistema 8

O sistema completo estará consolidado quando:

- exploração puder revelar presença sem iniciar automaticamente uma conversa;
- a localização mostrar somente presenças descobertas pertinentes;
- o jogador puder escolher uma interação válida;
- custos forem apresentados antes e aplicados uma única vez;
- interações narrativas abrirem e devolverem ao sandbox corretamente;
- ocorrências resolvidas não reaparecerem indevidamente;
- save e migração preservarem o estado mínimo;
- Mira e coelhos chifrudos validarem caminhos diferentes;
- testes, lint, tipos, build e revisão passarem.

## Fora do Sistema 8

- combate e estatísticas de batalha;
- IA ou comportamento autônomo;
- agenda e deslocamento automático;
- sistema de grupo;
- domesticação;
- caça detalhada além das abstrações existentes;
- respawn procedural;
- sobrevivência automática;
- clima, economia ou facções jogáveis;
- arte final.
