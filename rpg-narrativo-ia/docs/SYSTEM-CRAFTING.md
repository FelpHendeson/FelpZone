# Sistema 6 — Crafting e cozinha

## Dependências

Só iniciar depois de tempo, navegação, exploração e recursos estarem implementados, testados e consolidados.

## Objetivo

Permitir transformar materiais coletados em itens, estruturas locais e alimento por receitas declarativas. O primeiro recorte deve provar fogueira e cozinha sem criar uma árvore extensa de crafting.

## Receitas

```ts
type RecipeKind = 'item' | 'structure' | 'cooking';

interface RecipeDefinition {
  id: string;
  name: string;
  kind: RecipeKind;
  inputs: Array<{ itemId: string; quantity: number }>;
  outputs?: Array<{ itemId: string; quantity: number }>;
  createsStructureId?: string;
  requiredStationTags?: string[];
  timeCost: { periods: number };
  conditions?: GameCondition[];
  discovery?: { type: 'known' | 'flag'; flag?: string };
}
```

Receitas são dados. Componentes React apenas exibem requisitos, disponibilidade e resultado.

## Estruturas locais

Algumas criações não entram no inventário. Uma fogueira existe em um local:

```ts
interface WorldStructureState {
  structureId: string;
  locationId: string;
  active: boolean;
  fuel?: number;
}
```

Estruturas futuras podem oferecer tags como `heat`, `cooking`, `shelter` ou `workbench`. No primeiro recorte, implementar somente o necessário para fogueira e cozinha.

## Fogueira

Exemplo conceitual:

```json
{
  "id": "campfire",
  "name": "Fogueira",
  "kind": "structure",
  "inputs": [
    { "itemId": "fallen-branch", "quantity": 3 }
  ],
  "createsStructureId": "campfire",
  "timeCost": { "periods": 1 }
}
```

A quantidade e materiais finais serão balanceados depois. Criar uma fogueira consome recursos e tempo, registra a estrutura no local atual e habilita receitas que exigem calor.

## Cozinha

Carne crua não é equivalente a refeição preparada. Uma receita de cozinha:

- exige uma estrutura ativa com tag `cooking` ou `heat`;
- consome matéria-prima e, se definido, combustível;
- consome tempo;
- produz alimento cozido;
- pode alterar qualidade ou quantidade futuramente.

Exemplo:

```json
{
  "id": "cook-horned-rabbit-meat",
  "name": "Assar carne de coelho chifrudo",
  "kind": "cooking",
  "inputs": [
    { "itemId": "raw-horned-rabbit-meat", "quantity": 1 }
  ],
  "outputs": [
    { "itemId": "cooked-horned-rabbit-meat", "quantity": 1 }
  ],
  "requiredStationTags": ["heat"],
  "timeCost": { "periods": 1 }
}
```

## Operação de crafting

1. validar receita conhecida;
2. conferir local, estação e condições;
3. conferir todos os materiais antes de remover qualquer um;
4. calcular custo de tempo;
5. consumir entradas atomicamente;
6. produzir saídas ou estrutura;
7. avançar tempo pela integração;
8. retornar resultado para histórico e possíveis eventos.

Se qualquer requisito falhar, nada é consumido e o estado permanece intacto.

## Interface mobile

- receitas conhecidas por categoria;
- requisitos presentes e ausentes;
- custo de tempo;
- estação necessária;
- botão bloqueado com motivo explícito;
- confirmação para receitas caras ou irreversíveis;
- resultado resumido após criação.

Não criar grade complexa ou minijogo de crafting no primeiro recorte.

## Testes obrigatórios

- receita válida consome e produz quantidades corretas;
- ausência de material não altera estado;
- estação ausente bloqueia cozinha;
- fogueira é criada no local atual;
- materiais são consumidos atomicamente;
- tempo é calculado sem duplicação;
- IDs e quantidades inválidos são rejeitados;
- estrutura não é duplicada quando a receita não permite;
- persistência preserva receitas conhecidas e estruturas;
- imutabilidade.

## Fora da etapa

- ferramentas e durabilidade;
- qualidade aleatória;
- árvore extensa de receitas;
- desmontagem;
- crafting automático;
- construções de assentamento;
- minijogos culinários;
- comércio.

## Critérios de aceite

- fogueira pode ser construída com recurso coletado;
- carne crua pode ser preparada usando a fogueira;
- criação consome tempo e materiais atomicamente;
- estruturas pertencem ao local onde foram construídas;
- sistema é dirigido por dados e separado da UI;
- testes, lint, tipos e build passam.
