# Arquitetura

## Abordagem

Usar um **monólito modular**: uma única aplicação estática, dividida internamente em módulos. Não usar microserviços.

React apresenta o estado e envia ações. O motor em TypeScript decide regras e retorna um novo estado. Componentes não devem modificar diretamente atributos, inventário ou relações.

```text
Interface → ação → motor → módulos/regras → novo estado → persistência → interface
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

A estrutura é uma direção, não uma obrigação de criar pastas vazias.

## Responsabilidades

- `core`: estado global, execução de escolhas, condições e efeitos compartilhados.
- `character`: identidade, atributos e condições pessoais.
- `progression`: capacidades, recompensas e títulos.
- `inventory`: itens, recursos e consumo.
- `relationships`: confiança e estado de vínculos.
- `world`: dia, período e variáveis globais.
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

`schemaVersion` permanece `1`: o formato persistido não mudou; só a validação ficou estrita. Saves válidos da versão atual continuam carregando.

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
- o evento salvo é conferido contra a campanha antes de chegar à UI.
