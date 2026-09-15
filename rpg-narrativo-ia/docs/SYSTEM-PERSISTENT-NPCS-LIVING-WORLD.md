# Sistema 17 — NPCs persistentes, agenda e mundo vivo

## Estado da decisão

**Aprovado e especificado pelo autor em 15 de setembro de 2026. Implementação posterior à consolidação do Sistema 16.**

O Sistema 17 faz personagens existirem no mundo além de uma presença pontual. NPCs passam a possuir estado persistente mínimo, localização derivada por agenda, memória de fatos relevantes e disponibilidade coerente com horário, narrativa e consequências.

O sistema é determinístico e dirigido por dados. Não usa IA generativa, simulação em tempo real ou comportamento procedural irrestrito.

## Problema de diversão e imersão

Hoje Mira e outras entidades aparecem como ocorrências locais. Depois de uma interação, o mundo pouco comunica que pessoas continuam vivendo, mudando de lugar ou reagindo ao tempo.

```text
conhecer um NPC
        ↓
o mundo registra identidade e estado mínimo
        ↓
o relógio avança por ações reais
        ↓
a agenda determina onde o NPC pode estar
        ↓
o jogador procura, encontra ou perde uma oportunidade
        ↓
interações alteram memória, relação ou agenda autorizada
        ↓
o NPC continua existindo após save/reload
```

O objetivo é produzir continuidade e expectativa sem simular cada segundo do mundo.

## Decisões confirmadas

### 1. Entidade, presença e NPC persistente são camadas distintas

- `EntityDefinition` continua descrevendo identidade e conteúdo estático;
- `PresenceDefinition` continua descrevendo uma ocorrência interativa em um local;
- `NPCDefinition` declara agenda e capacidades persistentes;
- `NPCState` guarda somente fatos mutáveis;
- a presença visível de um NPC é derivada do estado, agenda, horário e local.

Criaturas genéricas e recursos não recebem `NPCState` automaticamente.

### 2. Estado persistente é mínimo e validado

```ts
interface NPCStateEntry {
  npcId: string;
  known: boolean;
  status: 'active' | 'unavailable' | 'departed';
  locationOverrideId: string | null;
  memoryFactIds: readonly string[];
  scheduleOverrideId: string | null;
}

interface NPCsState {
  entries: readonly NPCStateEntry[];
}
```

Relações numéricas existentes permanecem no módulo de relações. O NPC guarda IDs de fatos autorizados, não transcrições completas nem histórico redundante.

### 3. Agenda é declarativa por período

```ts
interface NPCScheduleDefinition {
  id: string;
  npcId: string;
  entries: readonly {
    period: DayPeriod;
    locationId: string;
    availability: 'available' | 'busy' | 'hidden';
  }[];
  fallbackLocationId: string;
}
```

- agenda usa os períodos já consolidados;
- mudança acontece quando o relógio avança, nunca por timer real;
- consultar agenda não avança tempo;
- deslocamento entre pontos da agenda é uma atualização derivada, não uma ação simulada passo a passo;
- overrides narrativos explícitos prevalecem sobre a agenda base.

### 4. Disponibilidade não equivale a localização

Um NPC pode estar em um local e ainda estar ocupado, oculto ou impedido de conversar. A consulta deriva:

- desconhecido;
- ausente;
- presente e indisponível;
- presente e disponível;
- partido.

Motivos exibidos usam apenas informações conhecidas. A agenda completa de um NPC não é revelada automaticamente ao jogador.

### 5. Memória usa fatos fechados

```ts
interface NPCMemoryFactDefinition {
  id: string;
  npcId: string;
  revealRule: NPCFactRevealRule;
}
```

Fatos podem registrar que uma conversa ocorreu, ajuda foi prestada, promessa foi feita ou evento foi presenciado. Eles são adicionados por resultados narrativos ou ações de mundo verificadas.

- fato repetido é idempotente;
- texto narrativo não entra no estado;
- memória não interpreta frases livres;
- NPC não conhece automaticamente todo o `GameState`;
- reações futuras consultam apenas fatos declarados e relações públicas.

### 6. Atualização do mundo ocorre numa única sincronização temporal

```text
uma ação válida cobra tempo
        ↓
relógio e ciclo diário avançam
        ↓
necessidades, recursos e condições são atualizados
        ↓
agendas dos NPCs são reavaliadas
        ↓
presenças derivadas são sincronizadas
        ↓
objetivos e feedback observam o estado final
```

Cada ação cobra o tempo uma vez. Reavaliar agendas sem mudança de relógio é idempotente.

### 7. Movimento é determinístico e localmente consistente

- toda localização de agenda precisa existir;
- NPC não aparece simultaneamente em dois locais;
- presença antiga some quando a nova se torna efetiva;
- localização bloqueada ou ainda não descoberta não revela o NPC;
- overrides inválidos falham antes de alterar estado;
- NPC `departed` não retorna sem resultado explícito de conteúdo.

### 8. Narrativa continua controlando cenas

O Sistema 17 pode solicitar uma sessão narrativa por uma interação disponível, usando o mecanismo consolidado. A campanha define escolhas e efeitos. O módulo de NPCs não escreve diálogos, não escolhe fala por IA e não avança a história sozinho.

## Estado e persistência

A implementação evolui o save para `schemaVersion: 11`.

- `sandbox.npcs` guarda estado mínimo;
- definições, agendas, textos, índices e regras não entram no JSON;
- saves v1–v10 migram com NPCs ainda não conhecidos, reconciliando apenas fatos canônicos já persistidos quando necessário;
- migração não avança relógio, move NPC, abre conversa ou altera relação;
- leitura não regrava `localStorage`;
- IDs desconhecidos, duplicações, localização inválida e fato de outro NPC falham de forma controlada.

## Integração com presenças

`presences` continua sendo a superfície de interação local. Para NPCs persistentes:

- a sincronização cria ou disponibiliza a presença derivada no local atual do NPC;
- ações de observar, aproximar e conversar reutilizam o contrato existente;
- resolução de presença não apaga o NPC;
- uma conversa pode ficar resolvida, enquanto outras ações futuras permanecem possíveis por novas definições;
- criaturas sem identidade persistente continuam no fluxo anterior.

## Integração com objetivos e relações

- objetivos observam localização, fato conhecido, conversa ou relação final;
- NPCs não concluem objetivos diretamente;
- relação continua em sua fonte canônica e pode influenciar requisitos de disponibilidade;
- memória e relação não são duplicadas entre módulos;
- recompensas e consequências entram na mesma transação da interação ou cena.

## Primeiro ciclo jogável do protótipo

Mira será o primeiro NPC persistente:

1. o jogador a conhece pelo fluxo já existente;
2. `NPCState` registra Mira como conhecida e ativa;
3. uma agenda protótipo a coloca em locais conhecidos conforme manhã, tarde e noite;
4. o jogador chega ao local correto e vê sua presença derivada;
5. em outro período, encontra indicação segura de ausência ou indisponibilidade;
6. uma conversa registra um fato de memória e pode alterar relação;
7. um resultado narrativo autorizado cria um override temporário ou marca partida;
8. save/reload preserva estado, memória e agenda sem duplicar conversa;
9. avançar um período reavalia Mira exatamente uma vez.

Locais, horários e textos exatos são conteúdo de protótipo e devem reutilizar o mapa atual.

## Fronteiras dos módulos

### `npcs`

- valida definições, agendas, memórias e estado;
- deriva localização e disponibilidade;
- aplica fatos e overrides de forma pura;
- não avança relógio, abre narrativa ou renderiza UI.

### `day-cycle` e `sandbox-actions`

- fornecem transições temporais canônicas;
- chamam sincronização de NPCs uma vez após o avanço;
- preservam atomicidade com necessidades, recursos e objetivos.

### `presences`

- apresenta e planeja interações locais;
- consome uma visão pública do NPC;
- não persiste agenda ou memória.

### `narrative`, `relations` e `objectives`

- continuam fontes de verdade para cenas, relação e jornada;
- usam fatos/estado final por contratos públicos;
- não movimentam NPC diretamente sem resultado tipado.

### React

- mostra presença, disponibilidade e pistas autorizadas;
- envia intenção de interação;
- não calcula agenda, localização ou reação.

## Apresentação mobile

Em `Mundo`, NPCs aparecem na seção de presenças do local. A aba `Jornadas` ou um detalhe de personagem pode mostrar apenas informações aprendidas, nunca a agenda completa por padrão.

```text
┌──────────────────────────────────┐
│ PRESENÇAS DO LOCAL               │
│ Mira · disponível                │
│ Organiza o abrigo improvisado    │
│ [Conversar] [Observar]           │
├──────────────────────────────────┤
│ PISTA CONHECIDA                  │
│ Costuma buscar água pela manhã   │
└──────────────────────────────────┘
```

- ausência não expõe localização secreta;
- pistas são conteúdo explicitamente aprendido;
- estados não dependem apenas de cor;
- 320 px sem overflow e alvos de 48 px;
- atualização após tempo preserva posição de leitura quando possível;
- nenhuma nova aba principal é criada no primeiro recorte.

## Sequência de fatias

### Fatia 17.1 — Catálogo e estado isolado

NPCs, agendas, fatos, overrides, validação profunda e índices imutáveis.

### Fatia 17.2 — Derivação temporal determinística

Localização e disponibilidade por período, precedência e idempotência.

### Fatia 17.3 — Memória e integração com relações

Fatos fechados, requisitos e reações autorizadas sem texto livre.

### Fatia 17.4 — Presenças derivadas e orquestração

Sincronização após tempo, unicidade espacial e interações locais.

### Fatia 17.5 — Persistência e migração

Schema 11, migrações v1–v10 e reconciliação segura de conteúdo anterior.

### Fatia 17.6 — Mira e interface mobile

Primeira agenda, pistas conhecidas, disponibilidade e conversa persistente.

### Fatia 17.7 — Ciclo ponta a ponta e consolidação

Conhecer → acompanhar período → reencontrar → registrar memória → alterar disponibilidade → salvar/recarregar, seguido de todos os gates.

## Critérios de aceite

- NPC conhecido possui uma única localização efetiva;
- agenda muda somente por avanço canônico de tempo;
- sincronização repetida no mesmo instante é idempotente;
- local oculto não vaza por presença, erro ou pista;
- fatos de memória são fechados, validados e não duplicam;
- relação e memória permanecem fontes distintas;
- presença resolvida não apaga NPC persistente;
- ações e cenas aplicam consequências atomicamente;
- schema 11 migra sem mover NPC ou executar gameplay;
- Mira completa o ciclo após save/reload;
- UI funciona desde 320 px;
- suíte, lint, tipos, build/PWA, revisão funcional, segurança e visual passam.

## Fora do Sistema 17

- simulação contínua em tempo real;
- IA generativa, diálogo dinâmico ou planejamento autônomo;
- rotina individual para toda criatura;
- reprodução, fome, sede ou inventário completo de NPCs;
- combate entre NPCs fora da presença do jogador;
- grupo e companheiros controláveis;
- economia, comércio, política e administração de assentamentos;
- viagem procedural e pathfinding entre cada nó;
- multiplayer, backend ou sincronização em nuvem;
- morte permanente de NPCs sem especificação narrativa própria.
