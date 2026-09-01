# Sistema 7 — Integração explorável

O Sistema 7 conecta horário, ciclo diário, navegação, exploração, recursos e crafting ao estado principal, à persistência e, depois, à interface. Ele é fatiado. **Esta pasta documenta o andamento; o sistema inteiro ainda não está concluído.**

## Fatia 7.1 — Estado integrado e persistência principal

**Implementada.** O `GameState` passa a carregar um `SandboxState` e o save usa `schemaVersion: 2`. A interface narrativa do MVP permanece a mesma: não há orquestrador de ações, menus novos nem aplicação de custos.

## Fatia 7.2 — Orquestrador de ações e tempo

Ainda não implementada. Deve aplicar custos temporais exatamente uma vez, renovar recursos quando o relógio avançar e coordenar movimento, exploração, coleta e crafting sem duplicar regras.

## Fatia 7.3 — Da introdução à exploração livre

Ainda não implementada. Depois da capacidade inicial, o jogador deve sair do loop exclusivo de eventos e ocupar o mundo. `currentEventId` obrigatório será revisto nessa fatia, com migração se necessário.

## Fatia 7.4 — Superfície mobile

Ainda não implementada. Destinos, explorar, coletar e fabricar entram na interface sem minijogos nem mapa complexo.

## Estado integrado

```ts
interface SandboxState {
  navigation: NavigationState;
  exploration: ExplorationState;
  resources: ResourcesState;
  crafting: CraftingState;
}

interface GameState {
  schemaVersion: 2;
  status: GameStatus;
  character: CharacterIdentity;
  currentEventId: string;
  attributes: Attributes;
  inventory: InventoryItem[];
  relationships: Relationship[];
  flags: Record<string, boolean>;
  history: HistoryEntry[];
  world: WorldState;
  progression: ProgressionState;
  sandbox: SandboxState;
  updatedAt: string;
}
```

O módulo `modules/sandbox` indexa o mapa e as definições iniciais, cria o estado integrado e valida o conjunto. As definições, o mapa e os índices (`Map`) não entram no JSON.

## Fontes canônicas

- `GameState.world.day` e `GameState.world.period`: único relógio persistido;
- `GameState.inventory`: inventário de coleta e crafting;
- `GameState.flags`: flags de condições e descobertas;
- `GameState.sandbox.navigation`: posição e conhecimento do mapa;
- `GameState.sandbox.exploration`: progresso e descobertas;
- `GameState.sandbox.resources`: pontos e populações;
- `GameState.sandbox.crafting`: receitas conhecidas e estruturas.

Não existe `sandbox.time`, segundo inventário, flags duplicadas nem `DaylightPhase` persistida. A fase visual continua derivada do período.

`world` permanece `{ day, period }`. Adaptadores puros `worldToTimeState` e `timeStateToWorld` convertem para o contrato de `modules/time` sem mutar as entradas.

## Schema e migração

`SCHEMA_VERSION` passou de `1` para `2`. O schema 2 exige `sandbox`.

Um save v1 válido é inspecionado por `inspectGameStateV1`, copiado campo a campo e recebe o sandbox inicial das definições atuais. A migração:

- preserva personagem, status, evento, atributos, inventário, relações, flags, histórico, dia, período, progressão e `updatedAt`;
- não é uma ação de jogo;
- não avança o relógio;
- não adiciona itens, estruturas nem progresso de exploração;
- não muta o objeto antigo.

Saves v1 malformados e v2 malformados retornam `corrupt`. Versões diferentes de 1 e 2 retornam `incompatible`. JSON inválido continua `corrupt`; string vazia continua `empty`.

A leitura **não** regrava o `localStorage`. O estado migrado só é persistido na próxima chamada de `save`. A chave `reset.mvp.save` foi preservada.

Carregar não aplica tempo, não renova recursos e não recupera populações.

## Validação

`inspectGameState` valida o schema 2 e delega a `inspectNavigationState`, `inspectExplorationState`, `inspectResourcesState` e `inspectCraftingState`. Quantidades de inventário precisam ser inteiras, positivas, `Number.isSafeInteger` e únicas por `itemId`. O resultado é um objeto novo, sem reutilizar referências do JSON.

`serializeGameState` só grava um estado válido do schema atual.

## Fora desta fatia

- botões de navegação, explorar, coletar e fabricar;
- aplicação de custos temporais;
- renovação ou recuperação no carregamento;
- orquestrador de ações;
- troca automática da narrativa pelo sandbox;
- encontros, NPCs, combate, sobrevivência, clima, agenda, ferramentas, combustível, backend e IA em runtime.
