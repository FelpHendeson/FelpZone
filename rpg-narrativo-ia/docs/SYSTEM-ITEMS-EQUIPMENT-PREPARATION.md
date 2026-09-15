# Sistema 14 — Itens, equipamentos e preparação

## Estado da decisão

**Aprovado e especificado pelo autor em 15 de setembro de 2026. Implementação ainda não iniciada.**

O Sistema 14 transforma materiais e objetos do inventário em decisões de preparação. O jogador poderá fabricar ou obter itens determinísticos, equipá-los, preparar um conjunto limitado de consumíveis e usar essa preparação no mundo e no combate.

Valores, nomes, espaços de equipamento e conteúdo do primeiro ciclo são protótipos substituíveis. O contrato modular, a validação de conteúdo, a atomicidade e a separação entre catálogo e save são requisitos.

## Problema de diversão e imersão

O jogador já coleta, fabrica, cozinha, treina e combate, mas o inventário ainda funciona principalmente como uma lista de quantidades. Falta transformar recursos em escolhas anteriores ao risco:

```text
explorar e coletar
        ↓
fabricar ou encontrar um item determinado
        ↓
comparar função e custo
        ↓
equipar e preparar consumíveis
        ↓
entrar em um encontro com um plano
        ↓
consumir, desgastar ou preservar recursos
        ↓
voltar ao mundo e se preparar novamente
```

O objetivo não é criar um simulador de inventário, e sim dar consequência às decisões tomadas antes de um confronto ou viagem.

## Decisões confirmadas

### 1. Catálogo e posse são separados

Definições vivem em catálogos locais validados. O save guarda somente IDs, quantidades, equipamentos ativos e preparação atual.

```ts
interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  kind: 'material' | 'consumable' | 'equipment';
  stackLimit: number;
  tags: readonly string[];
}

interface EquipmentDefinition extends ItemDefinition {
  kind: 'equipment';
  slot: EquipmentSlot;
  grants: readonly EquipmentGrant[];
}

interface ConsumableDefinition extends ItemDefinition {
  kind: 'consumable';
  use: ConsumableUseDefinition;
}
```

JSON nunca contém código executável. IDs são estáveis e referências são validadas na composição.

### 2. Equipamento é um conjunto pequeno e explícito

O primeiro recorte usa espaços protótipo:

- `main-hand`;
- `body`;
- `accessory`.

Cada espaço aceita no máximo um item. Equipar troca o item do espaço atomicamente; desequipar devolve o item à disponibilidade normal. Capacidade por peso, mãos múltiplas, raridade, qualidade e conjuntos permanecem fora do primeiro recorte.

### 3. Preparação não é o inventário inteiro

O jogador possui inventário, mas somente consumíveis colocados em espaços de preparação podem ser usados durante combate. O primeiro recorte oferece dois espaços.

```ts
interface PreparationState {
  slots: readonly {
    index: number;
    itemId: string | null;
  }[];
}
```

Preparar, remover ou trocar um consumível ocorre fora do combate e não consome tempo no protótipo. A preparação não duplica quantidades: ela reserva unidades existentes e a validação impede reservar mais do que o inventário possui.

### 4. Benefícios são declarativos e fechados

O primeiro recorte aceita somente:

```ts
type EquipmentGrant =
  | { type: 'combat.action.available'; actionId: string }
  | { type: 'combat.value.modify'; target: 'damage' | 'guard' | 'healing'; amount: number };

type ConsumableUseDefinition =
  | { type: 'combat.heal'; amount: number }
  | { type: 'need.restore'; need: 'fome' | 'sede'; amount: number };
```

Modificadores são inteiros finitos e limitados por validação. O domínio de combate ou necessidades aplica o resultado; itens não acessam internos desses módulos.

### 5. Recompensas materiais são determinísticas

Encontros e interações podem conceder itens por resultados declarados e verificáveis. O primeiro recorte não possui rolagem aleatória, raridade ou tabela de loot.

- a mesma resolução terminal não concede recompensa duas vezes;
- capacidade e limites de pilha são validados antes da transação;
- se a recompensa não puder ser aplicada, nenhuma consequência parcial permanece;
- itens ocultos não aparecem antes de sua origem ser conhecida.

### 6. Crafting continua responsável por fabricar

Receitas podem produzir equipamentos e consumíveis ao referenciar IDs válidos do catálogo. `crafting` consome materiais e produz posse; `items` valida a definição; `equipment` e `preparation` controlam uso. Não existe segunda implementação de receitas.

### 7. Equipar e preparar são intenções de domínio

React envia somente IDs e posições. As operações públicas validam posse, tipo, espaço, quantidade reservada e estado do combate.

```ts
type LoadoutIntent =
  | { type: 'equipment.equip'; itemId: string }
  | { type: 'equipment.unequip'; slot: EquipmentSlot }
  | { type: 'preparation.assign'; slot: number; itemId: string }
  | { type: 'preparation.clear'; slot: number };
```

Não é permitido alterar equipamento ou preparação durante um combate iniciado.

## Estado e persistência

A implementação evolui o save para `schemaVersion: 8`.

```ts
interface ItemsState {
  equipment: Readonly<Record<EquipmentSlot, string | null>>;
  preparation: PreparationState;
}
```

- a posse continua na fonte canônica do inventário;
- `GameState.items` guarda somente loadout e preparação;
- saves v1–v7 migram com espaços vazios;
- migração não concede item, não fabrica, não equipa e não avança tempo;
- catálogo, receitas, efeitos e textos não entram no JSON;
- entradas hostis, item inexistente, tipo incorreto e reserva impossível falham de forma controlada;
- leitura não regrava `localStorage`.

## Integração com combate

Ao iniciar um encontro, o domínio cria um retrato validado do loadout:

- ações concedidas por equipamento são resolvidas a partir do catálogo;
- modificadores são aplicados uma vez no cálculo apropriado;
- consumíveis preparados viram ações disponíveis enquanto houver unidade reservada;
- usar um consumível remove exatamente uma unidade do inventário e da reserva na transação do turno;
- recarregar a tela ou reproduzir resolução não restaura a unidade;
- oponente não acessa o inventário do jogador;
- trocar loadout durante combate é rejeitado.

O combate continua determinístico. Equipamento não altera diretamente a ordem do turno sem contrato próprio.

## Primeiro ciclo jogável do protótipo

1. coletar materiais já existentes;
2. fabricar um equipamento protótipo de mão principal;
3. equipá-lo e observar a ação ou o modificador autorizado;
4. cozinhar ou obter um consumível existente;
5. colocá-lo em um dos dois espaços de preparação;
6. iniciar o confronto conhecido;
7. usar o consumível ou a ação concedida;
8. concluir o encontro e receber uma recompensa material fixa de protótipo;
9. salvar, recarregar e verificar equipamento, preparação, consumo e recompensa.

Nomes e números serão definidos como conteúdo de protótipo durante a implementação, reutilizando materiais e receitas atuais sempre que possível.

## Fronteiras dos módulos

### `items`

- valida catálogos, pilhas e referências;
- fornece consultas defensivas;
- não fabrica, equipa, avança tempo ou resolve combate.

### `equipment`

- valida e altera loadout de forma pura;
- deriva concessões conhecidas;
- não calcula turno ou dano final.

### `preparation`

- reserva consumíveis possuídos;
- valida espaços e consumo;
- não duplica inventário.

### `inventory` e `crafting`

- continuam fontes de verdade para posse e fabricação;
- passam a validar produtos contra o catálogo de itens;
- não conhecem UI ou combate.

### `combat` e `sandbox-actions`

- `combat` consome um retrato público de loadout e produz resultados;
- o orquestrador aplica consumo e recompensas na mesma transação terminal;
- React não calcula benefícios, consumo ou recompensa.

## Apresentação mobile

`Mochila` recebe três níveis de informação:

```text
┌──────────────────────────────────┐
│ MOCHILA                          │
├──────────────────────────────────┤
│ PREPARAÇÃO  [1: Refeição] [2: —]│
│ EQUIPADO                         │
│ Mão: Ferramenta improvisada      │
│ Corpo: —        Acessório: —     │
├──────────────────────────────────┤
│ ITENS                            │
│ materiais · consumíveis · equipo │
└──────────────────────────────────┘
```

- filtros não escondem a quantidade real;
- benefícios e restrições são derivados por view-model;
- confirmação é exigida antes de substituir equipamento ou reserva;
- 320 px sem overflow horizontal e alvos de ao menos 48 px;
- combate mostra somente consumíveis preparados e concessões ativas;
- conteúdo desconhecido não aparece em espaços vazios ou contadores.

## Sequência de fatias

### Fatia 14.1 — Catálogos e contratos puros

Itens, equipamentos, consumíveis, espaços, benefícios e validação profunda, sem alterar `GameState`.

### Fatia 14.2 — Estado de equipamento e preparação

Operações puras de equipar, desequipar, reservar e remover; invariantes entre posse e reserva.

### Fatia 14.3 — Crafting e recompensas determinísticas

Produtos tipados em receitas e recompensas fixas verificáveis, sem loot aleatório.

### Fatia 14.4 — Persistência e migração

`GameState.items`, schema 8, migrações v1–v7 e validação hostil.

### Fatia 14.5 — Integração com combate

Ações e modificadores concedidos, consumíveis preparados e consumo atômico.

### Fatia 14.6 — Interface mobile e conteúdo protótipo

Mochila, equipamento, preparação e primeiro conjunto de itens/receitas/recompensas.

### Fatia 14.7 — Ciclo ponta a ponta e consolidação

Coletar → fabricar → equipar → preparar → combater → consumir/receber → salvar/recarregar, seguido de todos os gates.

## Critérios de aceite

- catálogos são profundamente validados, imutáveis e substituíveis;
- loadout referencia somente equipamento possuído e compatível;
- preparação nunca reserva mais unidades do que o inventário possui;
- não é possível trocar preparação durante combate;
- benefícios são aplicados uma única vez e pelo domínio responsável;
- consumível remove uma unidade exatamente uma vez;
- resolução repetida não duplica recompensa;
- crafting continua sendo a única fabricação;
- schema 8 migra saves anteriores sem gameplay;
- UI funciona desde 320 px;
- ciclo completo persiste após reload;
- testes, lint, typecheck, build/PWA, revisão funcional, segurança e visual passam.

## Fora do Sistema 14

- raridade, qualidade, peso, durabilidade e reparo;
- mãos múltiplas, conjuntos e comparação automática de poder;
- loot aleatório ou procedural;
- comércio e economia;
- equipamentos de NPCs persistentes;
- condições e elementos, pertencentes ao Sistema 15;
- Jardim, pertencente ao Sistema 16;
- agenda e mundo vivo, pertencentes ao Sistema 17;
- balanceamento definitivo, arte final, backend ou IA em runtime.
