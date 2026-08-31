# Arquitetura

## Abordagem

Usar um **monólito modular**: uma única aplicação estática, dividida internamente em módulos. Não usar microserviços.

React apresenta o estado e envia ações. O motor em TypeScript decide regras e retorna um novo estado. Componentes não devem modificar diretamente atributos, inventário ou relações.

```text
Interface → ação → motor → módulos/regras → novo estado → persistência → interface
```

Na evolução sandbox, a aplicação alternará entre modos explícitos:

```ts
type GameMode =
  | 'introduction'
  | 'exploration'
  | 'narrative'
  | 'dialogue'
  | 'interaction'
  | 'summary';
```

O motor narrativo deixa de ser o loop externo da aplicação. Exploração passa a ser o modo padrão após a introdução. Eventos e diálogos são sessões temporárias iniciadas por gatilhos do mundo e normalmente terminam devolvendo o controle à exploração.

```text
Exploração → ação → tempo/navegação → gatilhos → narrativa/diálogo → efeitos → exploração
```

## Estrutura sugerida

```text
src/
├── core/
│   ├── engine/
│   ├── events/
│   ├── effects/
│   └── state/
├── modules/
│   ├── character/
│   ├── progression/
│   ├── inventory/
│   ├── relationships/
│   ├── world/
│   ├── time/
│   ├── day-cycle/
│   ├── navigation/
│   └── narrative/
├── campaigns/
│   └── first-day/
├── infrastructure/
│   └── persistence/
├── ui/
│   ├── components/
│   ├── screens/
│   └── styles/
└── tests/
```

A estrutura é uma direção, não uma obrigação de criar pastas vazias. `modules/time/` está implementado. `day-cycle/` e `navigation/` continuam apenas planejados.

## Responsabilidades

- `core`: estado global, execução de escolhas, condições e efeitos compartilhados.
- `character`: identidade, atributos e condições pessoais.
- `progression`: capacidades, recompensas e títulos.
- `inventory`: itens, recursos e consumo.
- `relationships`: confiança e estado de vínculos.
- `world`: estado persistido do mundo, incluindo dia e período; delega o relógio a `time`.
- `time`: relógio determinístico por períodos, avanço de data e validação do horário.
- `day-cycle`: reações do mundo à mudança de período e dia (ainda não implementado).
- `navigation`: mapa hierárquico, posição, descoberta e deslocamento (ainda não implementado).
- `narrative`: resolução do evento atual e transições.
- `campaigns`: dados específicos de cada campanha.
- `persistence`: adaptação entre o estado e armazenamento do navegador.
- `ui`: apresentação e captura de ações.

## Comunicação

Os módulos compartilham tipos públicos e recebem dados por parâmetros. Um módulo não importa arquivos internos de outro. Efeitos são descritos como dados e aplicados pelo motor.

Exemplo conceitual:

```ts
type GameEffect =
  | { type: 'attribute.change'; attribute: 'energy' | 'humanity'; amount: number }
  | { type: 'inventory.add'; itemId: string; quantity: number }
  | { type: 'relationship.change'; characterId: string; amount: number }
  | { type: 'flag.set'; flag: string; value: boolean };
```

Novos efeitos podem ser acrescentados sem alterar componentes React ou reescrever campanhas existentes.

## Estado e persistência

O estado salvo deve conter no mínimo:

- `schemaVersion`;
- personagem;
- evento atual;
- atributos;
- inventário;
- relações;
- flags narrativas;
- histórico;
- data da última atualização.

A leitura do salvamento valida profundamente cada um desses campos. Um objeto com `schemaVersion` atual e estrutura interna incompleta ou malformada retorna `status: 'corrupt'`. Uma versão diferente retorna `status: 'incompatible'`. O parser não lança exceção.

Antes de o estado chegar à interface, `bindSavedState` confere o `currentEventId` contra a campanha: o evento precisa existir e cumprir as próprias condições. Falhas viram `corrupt` e a UI não tenta renderizar o evento.

Use uma interface de persistência para permitir trocar `localStorage` por IndexedDB futuramente. O MVP pode começar com `localStorage`.

`schemaVersion` permanece `1`. O formato persistido de `world` continua `{ day, period }`, em que `period` é o identificador do período. Saves válidos da versão atual continuam carregando.

## Contrato de horário e data

O módulo `modules/time` é a única fonte de verdade para ordem, rótulos e avanço de períodos. O tempo não corre em tempo real: só avança quando uma operação recebe um custo em períodos.

O estado de domínio é:

```ts
interface TimeState {
  day: number;
  periodId: string;
}
```

O estado persistido em `WorldState` permanece `{ day, period }` para não quebrar saves. `period` guarda o mesmo identificador que `periodId`. O índice do período nunca é armazenado; a posição é resolvida pela configuração ordenada.

A lista padrão, com IDs preservados do MVP, vive em `modules/time/periods.ts` e está separada da lógica:

`alvorecer`, `manha`, `meio-dia`, `tarde`, `entardecer`, `noite`.

Operações públicas:

- `createInitialTime`: dia 1 no primeiro período da configuração;
- `getPeriod`: consulta o período atual;
- `formatTime`: `Dia N · Rótulo` em português, igual ao cabeçalho atual do MVP;
- `advanceTime`: avanço imutável por zero ou mais períodos, devolvendo estado anterior, estado atual, períodos atravessados e dias avançados;
- `inspectTimeConfig`, `inspectTimeState` e `inspectTimeCost`: validação sem exceção.

Dias são inteiros positivos. Custos são inteiros não negativos. Configuração vazia, IDs repetidos ou vazios, período inexistente e custos fracionários ou não finitos são rejeitados.

O efeito de campanha `world.period` continua definindo o período sem avançar o dia. Condições e efeitos `time.*`, ciclo diário, temas visuais e sobrevivência não fazem parte deste contrato.

## Contratos do motor

- `applyChoice` só age com `status: 'playing'`.
- O evento atual e a escolha precisam existir e cumprir suas condições.
- `inventory.remove` falha de forma controlada se a quantidade for insuficiente; o estado anterior permanece intacto.
- Quantidades de item são inteiros positivos; variações numéricas precisam ser finitas.
- Relações, capacidades e títulos não são duplicados.
- `validateCampaign` devolve diagnósticos semânticos (IDs, referências, transições, interpolação, consumo protegido, conectividade estrutural e alcançabilidade semântica).
- Conectividade estrutural segue as transições; alcançabilidade semântica considera condições e efeitos.
- `walkCampaignTrajectories` percorre a árvore de escolhas válidas e identifica estados pelo evento, flags, inventário, atributos, relações, mundo e progressão.

O retorno de uma escolha continua sendo o novo `GameState`. Um `ChoiceOutcome` com estado anterior e efeitos aplicados não foi introduzido: a interface só precisa do estado seguinte, e o extra seria abstração prematura.

## Evolução do estado narrativo

O MVP exige `currentEventId` porque sempre está dentro de uma cena. No sandbox, o estado precisará distinguir uma sessão narrativa ativa da posição normal no mundo. O formato final deve permitir ausência de evento ativo durante exploração, sem usar IDs fictícios.

Uma direção conceitual é:

```ts
interface NarrativeSession {
  eventId: string;
  returnMode: 'exploration' | 'interaction';
}
```

A mudança provavelmente exigirá nova versão do schema e migração ou rejeição controlada de saves. Isso será decidido na etapa de integração, não antecipado nos três sistemas isolados.

## Testes prioritários

- condições habilitam e bloqueiam eventos corretamente;
- efeitos produzem um novo estado sem mutar o anterior;
- recursos não ficam negativos quando isso for proibido;
- remoção insuficiente de item falha sem alterar o estado;
- escolhas levam ao próximo evento correto;
- partida concluída rejeita novas escolhas;
- salvar e carregar preserva o estado;
- cada estrutura interna malformada retorna `corrupt`;
- partidas com versão incompatível falham de forma controlada;
- a campanha atual passa na validação ampliada e todas as trajetórias válidas terminam;
- eventos só são semanticamente alcançáveis quando condições e efeitos permitem;
- o evento salvo é conferido contra a campanha antes de chegar à UI;
- o relógio inicia no dia 1 ao alvorecer e avança de forma imutável por períodos;
- virada de dia, custo zero, configuração inválida e estado persistido inválido são rejeitados ou calculados de forma determinística.
