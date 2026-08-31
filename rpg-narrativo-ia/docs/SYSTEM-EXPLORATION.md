# Sistema 4 — Exploração e descobertas

## Dependências

Horário/data, ciclo diário e navegação hierárquica já estão implementados, testados e consolidados.

## Objetivo

Permitir que o jogador conheça gradualmente cada ambiente. Explorar aumenta um percentual local e revela conteúdo previamente definido: itens encontrados, marcos, passagens, subáreas bônus, pontos de recurso, NPCs, criaturas e eventos.

O módulo `modules/exploration` é determinístico, independente e ainda não altera o save principal nem a interface. Explorar revela o que existe no local; não move o jogador, não coleta recursos, não adiciona itens ao inventário, não inicia encontros, não executa eventos narrativos, não instancia NPCs ou criaturas e não aplica o custo no relógio.

## Separação de responsabilidades

- **navegação:** onde o jogador está e quais locais conhece;
- **exploração:** aumenta o conhecimento do local atual;
- **descoberta:** registra que algum conteúdo foi encontrado;
- **coleta futura:** utilizará pontos de recurso já descobertos;
- **crafting futuro:** utilizará materiais obtidos pela coleta;
- **narrativa futura:** poderá reagir às descobertas retornadas.

## Estado

```ts
interface LocationExplorationState {
  locationId: string;
  progress: number;
  revealedDiscoveryIds: string[];
  explorationCount: number;
}

interface ExplorationState {
  locations: LocationExplorationState[];
}
```

- cada local possui progresso independente;
- progresso é inteiro entre `0` e `100` e nunca diminui nem ultrapassa `100`;
- `explorationCount` é inteiro seguro não negativo;
- descobertas reveladas não se repetem no estado;
- IDs de locais e descobertas precisam existir nas definições;
- a mesma localização não aparece duas vezes em `ExplorationState`;
- locais ainda não explorados podem não possuir entrada;
- a primeira exploração de um local cria seu estado inicial;
- estado e definições nunca são mutados.

`ExplorationState` é serializável por `JSON.stringify`/`JSON.parse` e validado isoladamente. Ainda não entra em `GameState`.

## Definições

```ts
type DiscoveryKind =
  | 'landmark'
  | 'item'
  | 'resourceNode'
  | 'passage'
  | 'subarea'
  | 'npc'
  | 'creatureHabitat'
  | 'event';

interface DiscoveryDefinition {
  id: string;
  kind: DiscoveryKind;
  revealAt: number;
  completionWeight: number;
  conditions?: GameCondition[];
  targetId?: string;
  unlockTarget?: boolean;
  once: true;
}

interface LocationExplorationDefinition {
  locationId: string;
  progressPerAction: number;
  timeCost: TimeCost;
  discoveries: DiscoveryDefinition[];
}
```

O conteúdo inicial vive em `src/modules/exploration/initial-exploration.ts`:

- Clareira do Despertar: marco do despertar, ponto futuro de gravetos e um item encontrado;
- Grande Árvore: marco da árvore e marcações ambientais;
- Nascente e Pequeno Lago: marco da nascente e ponto futuro de água;
- Mata Densa: vegetação densa, habitat de coelhos chifrudos e a Caverna Oculta.

`revealAt` é inteiro entre `0` e `100`. `completionWeight` e `progressPerAction` são inteiros seguros positivos. `timeCost` reutiliza `inspectTimeCost`. IDs de descoberta são únicos globalmente. Nesta etapa, toda descoberta precisa de `once: true`; `once: false` é rejeitado porque redescobertas repetíveis ainda não possuem semântica definida.

Definições e estados restaurados são entradas não confiáveis.

## Ação de explorar

`exploreCurrentLocation` usa somente `NavigationState.currentLocationId`. Não aceita explorar um local diferente da posição atual.

Fluxo:

1. validar mapa, navegação, definições e estado;
2. confirmar que existe definição de exploração para o local atual;
3. calcular o ganho e limitar o progresso a `100`;
4. incrementar `explorationCount` somente quando a ação ocorre;
5. localizar descobertas cujo limiar foi alcançado;
6. avaliar condições com `GameCondition` / `evaluateConditions`;
7. registrar descobertas novas exatamente uma vez, na ordem da definição;
8. aplicar somente efeitos de navegação autorizados (`subarea` e `passage`);
9. devolver o custo de tempo sem aplicá-lo.

```ts
interface ExplorationResult {
  previous: ExplorationState;
  current: ExplorationState;
  location: {
    previous: LocationExplorationState;
    current: LocationExplorationState;
  };
  progressGained: number;
  discoveries: DiscoveryDefinition[];
  timeCost: TimeCost;
  navigation: {
    previous: NavigationState;
    current: NavigationState;
  };
}
```

## Local em 100%

Quando o progresso local já está em `100`:

- nova exploração não aumenta o progresso;
- não incrementa `explorationCount`;
- não gera novamente descobertas já reveladas;
- o ganho é zero e o custo de tempo não é aplicado;
- descobertas condicionais pendentes continuam reavaliáveis por `reevaluateDiscoveries`, sem consumir tempo.

Isso permite liberar uma descoberta depois que uma flag, item, atributo ou relação mudar, mesmo quando o progresso já passou do limiar.

## Condições

O módulo reutiliza `GameCondition` e `evaluateConditions`. A composição recebe `GameState` ou uma função avaliadora injetada via `createDiscoveryEvaluator`.

Uma descoberta só é revelada quando o progresso atingiu `revealAt`, suas condições foram satisfeitas e ela ainda não foi registrada. Se o limiar for atingido antes da condição, a descoberta permanece pendente e sua identidade não aparece na API comum.

## Integração com navegação

Descobertas comuns apenas retornam seus dados. Para `subarea` e `passage`:

- `targetId` é obrigatório e precisa existir no mapa;
- o alvo é revelado com `discoverLocation`;
- se `unlockTarget: true`, também é usado `unlockLocation`;
- `currentLocationId` não muda;
- o alvo não é marcado como visitado;
- o jogador não é teletransportado.

A operação pública `applyDiscoveryNavigationEffects` reutiliza as funções do Sistema 3. Não há manipulação manual das listas de navegação.

## Caverna oculta

A descoberta `hidden-cave` pertence a `dense-woods`, com limiar inicial próximo de `90%` e `unlockTarget: true`. Esse percentual não é balanceamento definitivo.

- antes do limiar, `hidden-cave` não aparece nos destinos;
- ao atingir o limiar, o ID entra em `discoveredLocationIds` e `unlockedLocationIds`;
- a posição atual permanece `dense-woods`;
- `visitedLocationIds` não recebe a caverna;
- a caverna passa a aparecer como filha navegável;
- entrar nela continua sendo responsabilidade do Sistema 3.

## Progresso local e conclusão da zona

```ts
interface ZoneCompletion {
  zoneId: string;
  completedPoints: number;
  totalPoints: number;
  percentage: number;
}
```

A conclusão da zona é derivada por `calculateZoneCompletion` e não é armazenada no estado.

- considera definições do próprio local e de todos os descendentes;
- `totalPoints` soma todos os `completionWeight`, inclusive conteúdo secreto e condicionado;
- `completedPoints` soma somente descobertas já reveladas;
- o resumo público não inclui nomes ou IDs secretos;
- a porcentagem é `Math.round((completedPoints / totalPoints) * 100)`, limitada a `0..100`;
- se `totalPoints` for zero, a zona é considerada `100%` concluída.

Progresso local mede a cobertura de exploração de um ambiente (`0..100` das ações naquele local). Conclusão de zona mede pesos de descoberta agregados. Um local pode ter `100%` de cobertura enquanto a conclusão agregada permanece abaixo de `100%` por causa de uma descoberta condicionada pendente ou de descendentes ainda não resolvidos.

## Operações públicas

- `inspectExplorationDefinitions` e `indexExplorationDefinitions`;
- `createInitialExploration` e `inspectExplorationState`;
- `getLocationExploration` e `canExploreLocation`;
- `exploreCurrentLocation` e `reevaluateDiscoveries`;
- `getRevealedDiscoveries` e `calculateZoneCompletion`;
- `applyDiscoveryNavigationEffects` e `createDiscoveryEvaluator`.

Capacidades do personagem ainda não modificam o ganho. Não há aleatoriedade, testes de perícia, risco, energia ou lógica em componentes React.

## Validações

Rejeite de forma controlada localização inexistente, definição duplicada, ID de descoberta vazio ou duplicado, tipo desconhecido, limiar fora de `0..100`, peso ou ganho inválidos, custo de tempo inválido ou acima de `MAX_ADVANCE_PERIODS`, condição malformada, `subarea`/`passage` sem alvo válido, alvo igual ao local atual, `unlockTarget` malformado, `once` diferente de `true`, estado com localização duplicada, progresso ou contador inválidos, descoberta inexistente, descoberta no local errado e revelações duplicadas.

## Integração inicial

- o fluxo narrativo atual permanece intacto;
- não há botão de explorar, barra visual, tela de mapa, popup de descoberta nem inventário novo;
- o custo ainda não é aplicado ao relógio;
- a demonstração do fluxo fica nos testes.

## Fora da etapa

- coleta e renovação de recursos;
- caça e população animal;
- itens adicionados ao inventário;
- crafting, cozinha e fogueira;
- agenda de NPC, criaturas ativas e encontros;
- eventos narrativos automáticos;
- aplicação do custo no relógio;
- energia, fome ou risco;
- aleatoriedade e geração procedural;
- conclusão global do mundo;
- alteração de `schemaVersion` ou do save principal;
- mudanças visuais.

## Critérios de aceite

- cada ambiente possui percentual independente;
- descoberta é dirigida por dados;
- ao menos uma área oculta pode ser revelada;
- conclusão da zona é derivada e não conflita com progresso local;
- exploração não depende da UI;
- testes, lint, tipos e build passam.
