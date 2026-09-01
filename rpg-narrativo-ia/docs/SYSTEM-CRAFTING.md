# Sistema 6 — Crafting, estruturas locais e cozinha

## Dependências

Horário/data, ciclo diário, navegação hierárquica, exploração e descobertas, e pontos de recurso e ecologia já estão implementados, testados e consolidados.

## Objetivo

Transformar materiais coletados em itens, estruturas locais e alimento por receitas declarativas. O primeiro recorte prova fogueira e cozinha sem criar uma árvore extensa de crafting.

O módulo `modules/crafting` é determinístico, independente e ainda não altera o save principal nem a interface. Crafting não explora, não move o jogador, não coleta recursos e não aplica o custo no relógio: apenas devolve um `TimeCost` validado.

## Separação de responsabilidades

- **navegação:** onde o jogador está e, portanto, onde a estrutura é construída;
- **recursos:** originam os materiais brutos;
- **inventário:** array independente recebido e devolvido pela execução;
- **crafting:** receitas, consumo atômico, estruturas locais e estações;
- **tempo:** o Sistema 7 aplicará o custo exatamente uma vez.

Nenhuma API pública muta o inventário, o estado de crafting, a navegação, o `GameState` ou as definições recebidas.

## Receitas

```ts
type RecipeKind = 'item' | 'structure' | 'cooking';

interface RecipeIngredient {
  itemId: string;
  quantity: number;
}

interface RecipeDefinition {
  id: string;
  name: string;
  kind: RecipeKind;
  inputs: RecipeIngredient[];
  outputs?: RecipeIngredient[];
  createsStructureId?: string;
  requiredStationTags?: string[];
  timeCost: { periods: number };
  conditions?: GameCondition[];
  discovery:
    | { type: 'known' }
    | { type: 'flag'; flag: string };
}
```

Receitas são dados. Toda receita precisa de ID e nome válidos, pelo menos um material de entrada, quantidades inteiras positivas e seguras, custo temporal de pelo menos um período, IDs únicos em `inputs` e em `outputs`, tags de estação únicas e não vazias, e política de descoberta válida.

Regras específicas:

- `structure` exige `createsStructureId` e não produz itens nesta etapa;
- `item` e `cooking` exigem pelo menos um output e não podem criar estrutura;
- `cooking` exige pelo menos uma tag de estação;
- `item` pode exigir estação, para expansões futuras;
- o mesmo item pode aparecer em inputs e outputs, desde que o cálculo final seja atômico;
- IDs desconhecidos, campos ambíguos, duplicações e números inseguros são rejeitados;
- dados inválidos não são corrigidos, arredondados nem normalizados.

## Receitas conhecidas

`CraftingState.knownRecipeIds` guarda o conhecimento do jogador.

- receitas com `discovery.type === 'known'` entram no estado inicial;
- receitas com `discovery.type === 'flag'` só podem ser aprendidas quando a flag declarada estiver ativa;
- `synchronizeKnownRecipes` é pura, idempotente e não avança o tempo;
- uma receita liberada por flag, mas ainda ausente de `knownRecipeIds`, não pode ser produzida;
- receitas desconhecidas são bloqueadas com `Esta receita ainda não é conhecida.`

Condições reutilizam `GameCondition`. Elas podem bloquear uma receita já conhecida. O avaliador recebe uma cópia defensiva somente leitura; um callback malicioso não altera estado, inventário, estruturas ou definições.

## Estruturas locais e estações

```ts
interface StructureDefinition {
  id: string;
  name: string;
  tags: string[];
  uniquePerLocation: boolean;
  activeByDefault: boolean;
  initialFuel?: number;
}

interface WorldStructureState {
  structureId: string;
  locationId: string;
  active: boolean;
  fuel?: number;
}

interface CraftingState {
  knownRecipeIds: string[];
  structures: WorldStructureState[];
}
```

As estações disponíveis são derivadas exclusivamente das estruturas existentes no `CraftingState`, localizadas no `currentLocationId`, marcadas como ativas, com tags da `StructureDefinition`. Estruturas em outro local ou inativas não atendem à receita.

A construção ocorre no local atual da navegação, que precisa existir no mapa. Quando `uniquePerLocation` é verdadeiro, não pode haver outra estrutura do mesmo tipo no mesmo local. A mesma estrutura pode existir em locais diferentes. A duplicação é detectada antes de consumir materiais.

## Combustível

`fuel` é um campo opcional validado (inteiro seguro e não negativo) para evolução futura. Nesta etapa **não** há:

- consumo automático de combustível;
- extinção automática;
- reabastecimento;
- duração da fogueira;
- degradação de estruturas.

A fogueira inicial permanece ativa depois de construída.

## Conteúdo inicial

Receitas de cozinha exigem a tag `cooking`. A fogueira declara `heat` e `cooking`, então atende. Não foi criada uma árvore extensa de receitas; itens extras e descoberta por flag existem só em fixtures de teste.

- estrutura `campfire`, nome “Fogueira”, tags `heat` e `cooking`, única por localização, ativa ao ser construída;
- receita `build-campfire`: tipo `structure`, consome 3 `fallen-branch`, cria `campfire`, sem estação, 1 período, conhecida;
- receita `cook-horned-rabbit-meat`: tipo `cooking`, consome 1 `raw-horned-rabbit-meat`, produz 1 `cooked-horned-rabbit-meat`, exige tag `cooking`, 1 período, conhecida.

## Atomicidade

Antes de produzir qualquer resultado a operação valida o inventário, o conhecimento da receita, as condições, as estações, todos os materiais, os consumos, os outputs e o overflow do inventário final. Somente então gera um estado novo.

Se qualquer etapa falhar:

- nenhum item é consumido ou produzido;
- nenhuma estrutura é criada;
- nenhum tempo é aplicado;
- nenhuma referência original é alterada.

Entradas que chegam a zero saem do inventário. Itens não relacionados são preservados. O inventário recebido nunca é modificado in-place; as transformações são puras e não reutilizam `addItem`/`removeItem` enquanto a entrada não estiver validada, porque esses helpers arredondam quantidades.

## Consulta e execução

`inspectRecipeAccess` não altera estado, inventário nem relógio. Diferencia receita desconhecida, condição não atendida, materiais insuficientes, estação ausente, estrutura duplicada e dados inválidos, e informa faltas relevantes quando for seguro.

```ts
interface CraftingAccess {
  craftable: boolean;
  blockedReason?: string;
  missingInputs: RecipeIngredient[];
  missingStationTags: string[];
  timeCost: TimeCost;
}
```

`craftRecipe` recebe estado de crafting, inventário, definições, ID da receita, navegação/local atual e o contexto de condições. O resultado expõe estados anterior e novo, inventários anterior e novo, receita, materiais consumidos, itens produzidos, estrutura criada quando houver, localização e `TimeCost`. Falhas lançam `CraftingError`. O módulo não chama `advanceTime`.

## Persistência isolada

O estado é serializável em JSON. `createInitialCrafting`, `serializeCraftingState`, `restoreCraftingState` e `inspectCraftingState` validam o roundtrip. A restauração rejeita receitas conhecidas inexistentes, IDs duplicados, estruturas desconhecidas, localizações inexistentes, duplicação de estrutura única, tipos incorretos, booleanos inválidos, combustível inseguro e referências inconsistentes.

Não há integração com `GameState`, save principal, `localStorage` ou schema global nesta fase.

## Operações públicas

- `inspectCraftingDefinitions` e `indexCraftingDefinitions`;
- `createInitialCrafting` e `inspectCraftingState`;
- `serializeCraftingState` e `restoreCraftingState`;
- `inspectRecipeAccess` e `canCraftRecipe`;
- `craftRecipe`;
- `synchronizeKnownRecipes`;
- `getRecipe` e `getStructureDefinition`;
- `createCraftingEvaluator`.

## Integração inicial

- o fluxo narrativo atual permanece intacto;
- não há menu de crafting, inventário visual nem aplicação do custo no relógio;
- a demonstração do fluxo fica nos testes;
- interface, save global e o loop completo pertencem ao Sistema 7.

## Fora da etapa

- integração visual e menus definitivos;
- inventário visual;
- aplicação real do custo no relógio;
- save global e `localStorage`;
- consumo, duração ou extinção de combustível;
- ferramentas, durabilidade e qualidade aleatória;
- crafting automático e desmontagem;
- construção de assentamentos e comércio;
- minijogos;
- árvore extensa de receitas;
- combate, backend, autenticação e IA em runtime.

## Critérios de aceite

- fogueira pode ser construída com gravetos no local atual;
- carne crua pode ser preparada usando a fogueira ativa;
- criação consome materiais atomicamente e apenas devolve o custo temporal;
- estruturas pertencem ao local onde foram construídas;
- receitas conhecidas e descoberta por flags funcionam sem avançar o tempo;
- sistema é dirigido por dados e separado da UI;
- testes, lint, tipos e build passam.
