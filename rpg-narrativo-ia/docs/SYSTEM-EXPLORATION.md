# Sistema 4 — Exploração e descobertas

## Dependências

Só iniciar depois de horário/data, ciclo diário e navegação hierárquica estarem implementados, testados e consolidados.

## Objetivo

Permitir que o jogador conheça gradualmente cada ambiente. Explorar aumenta um percentual local e revela conteúdo previamente definido: itens encontrados, marcos, passagens, subáreas bônus, pontos de recurso, NPCs, criaturas e eventos.

Explorar não é o mesmo que navegar ou coletar. Navegação muda a posição; exploração revela o que existe ali; coleta utiliza um ponto de recurso já descoberto.

## Progresso por local

Cada local explorável possui progresso próprio entre `0` e `100`.

```ts
interface LocationExplorationState {
  locationId: string;
  progress: number;
  revealedDiscoveryIds: string[];
  explorationCount: number;
}
```

- progresso é inteiro e limitado a `0..100`;
- ações nunca reduzem o percentual;
- chegar a `100` significa que todas as descobertas contabilizadas daquele local foram resolvidas;
- continuar no local após `100` pode permitir coleta e interação, mas não gera exploração infinita.

## Progresso local e conclusão de zona

Não armazenar a porcentagem do pai como cópia da média dos filhos.

- **progresso local:** pertence a um ambiente específico e pode aumentar por ações nele;
- **conclusão da zona:** métrica derivada dos objetivos de exploração do pai e de seus descendentes.

Cada descoberta recebe um peso de conclusão. Conteúdo secreto também participa do total desde o início, embora sua identidade permaneça oculta. Assim, `100%` representa conclusão real, não apenas tudo o que já era conhecido.

```ts
interface ZoneCompletion {
  zoneId: string;
  completedPoints: number;
  totalPoints: number;
  percentage: number;
}
```

## Ação de explorar

Uma ação de exploração:

1. valida se o local pode ser explorado;
2. informa custo de tempo e, futuramente, energia;
3. calcula ganho de progresso;
4. limita o resultado a `100`;
5. resolve descobertas cujos requisitos foram atingidos;
6. devolve novo estado e lista de revelações;
7. permite que a camada de integração acione narrativas.

No primeiro contrato, descobertas devem ser determinísticas por limiar. Aleatoriedade só poderá entrar futuramente com semente reproduzível.

## Tipos de descoberta

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
  once: boolean;
}
```

Uma descoberta condicionada só é revelada quando o percentual e suas condições forem satisfeitos. Se o percentual já tiver passado do limiar, ela deve ser reavaliada quando o estado relevante mudar.

## Subáreas bônus

Uma caverna secreta ou passagem oculta já existe como filho no mapa JSON, mas começa invisível. Uma descoberta `subarea` ou `passage` revela e, se apropriado, desbloqueia o local.

O jogador não é teletransportado ao descobrir. Ele recebe informação e decide se deseja navegar até lá.

## Exemplo: Floresta dos Coelhos Chifrudos

```json
{
  "id": "horned-rabbit-forest",
  "name": "Floresta dos Coelhos Chifrudos",
  "children": [
    {
      "id": "forest-clearing",
      "name": "Clareira",
      "exploration": {
        "discoveries": [
          { "id": "fallen-branches", "kind": "resourceNode", "revealAt": 20, "completionWeight": 1, "once": true },
          { "id": "rabbit-tracks", "kind": "creatureHabitat", "revealAt": 45, "completionWeight": 1, "once": true },
          { "id": "hidden-cave", "kind": "subarea", "revealAt": 90, "completionWeight": 2, "targetId": "hidden-cave", "once": true }
        ]
      },
      "children": [
        { "id": "hidden-cave", "name": "Caverna Oculta", "visibility": "hidden" }
      ]
    },
    { "id": "great-tree", "name": "Grande Árvore" },
    { "id": "spring-lake", "name": "Nascente e Pequeno Lago" }
  ]
}
```

Os nomes e percentuais são exemplos de contrato, não balanceamento definitivo.

## Capacidades e modificadores

Capacidades podem modificar ganho, informação ou condições sem duplicar o sistema:

- percepção revela uma pista antes do limiar completo;
- conhecimento identifica melhor um recurso;
- rastreamento facilita encontrar habitat;
- cautela reduz risco durante a ação.

O modificador deve ser explícito e testável. Nenhuma capacidade pode alterar diretamente componentes React.

## Testes obrigatórios

- progresso começa e termina nos limites corretos;
- explorar produz novo estado sem mutação;
- descobertas surgem no limiar correto e apenas uma vez;
- condições impedem e posteriormente liberam descoberta;
- subárea oculta passa a descoberta sem mover o jogador;
- progresso local não sobrescreve conclusão agregada;
- conclusão da zona considera pesos e conteúdo secreto;
- local a `100%` não gera progresso adicional;
- definições e estados inválidos são rejeitados;
- persistência preserva percentuais e descobertas.

## Fora da etapa

- coleta e renovação de recursos;
- caça e população animal;
- crafting;
- minijogos;
- geração procedural;
- aleatoriedade não determinística;
- conclusão global do mundo.

## Critérios de aceite

- cada ambiente possui percentual independente;
- descoberta é dirigida por dados;
- ao menos uma área oculta pode ser revelada;
- conclusão da zona é derivada e não conflita com progresso local;
- exploração não depende da UI;
- testes, lint, tipos e build passam.
