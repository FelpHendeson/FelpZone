# Sistema 3 — Navegação hierárquica

## Dependências

Só iniciar depois de horário/data e ciclo diário estarem implementados, testados e consolidados.

## Objetivo

Permitir que o jogador ocupe, descubra e percorra locais definidos em um mapa JSON aninhado. A navegação padrão ocorre somente entre pai, filhos diretos e irmãos.

## Modelo de autoria

O arquivo de conteúdo mantém a hierarquia visível:

```json
{
  "id": "new-world",
  "name": "Novo Mundo",
  "children": [
    {
      "id": "initial-valley",
      "name": "Vale Inicial",
      "children": [
        {
          "id": "clearing",
          "name": "Clareira",
          "children": [
            {
              "id": "root-shelter",
              "name": "Abrigo entre as raízes"
            }
          ]
        },
        { "id": "stream", "name": "Riacho" },
        { "id": "stone-hill", "name": "Morro de Pedra" }
      ]
    }
  ]
}
```

Na carga, o mapa pode ser normalizado em índices internos de `id → local` e `id → pai`. O formato de autoria continua aninhado.

## Regras de movimento

Do local atual, o destino padrão é válido quando for:

- pai direto;
- filho direto;
- irmão com o mesmo pai.

Não é permitido saltar para outro ramo da árvore. Atalhos, portais, estradas especiais e viagem rápida ficam para outra etapa.

Mover-se poderá consumir períodos, mas a integração do custo deve usar o sistema de tempo já consolidado. Consultar o mapa não consome tempo.

## Estado conceitual

```ts
interface NavigationState {
  currentLocationId: string;
  discoveredLocationIds: string[];
  unlockedLocationIds: string[];
  visitedLocationIds: string[];
}
```

- `discovered`: o jogador sabe que existe;
- `unlocked`: a entrada é permitida;
- `visited`: o jogador já esteve no local;
- `current`: posição atual.

Um local pode estar descoberto e bloqueado. Local desconhecido não deve aparecer como destino comum.

## Definição de local

```ts
interface LocationNode {
  id: string;
  name: string;
  description?: string;
  image?: ImageReference;
  travelCost?: { periods: number };
  unlockConditions?: GameCondition[];
  children?: LocationNode[];
}
```

O contrato final pode separar dados de apresentação, mas deve preservar o significado.

## Operações públicas

- validar e indexar mapa;
- obter local por ID;
- obter pai, filhos, irmãos e caminho hierárquico;
- listar destinos válidos no estado atual;
- explicar por que um local está bloqueado;
- descobrir e desbloquear local;
- mover de forma imutável;
- marcar destino como visitado;
- calcular custo da viagem sem aplicá-lo diretamente.

## Validação do mapa

- raiz única e válida;
- IDs únicos, não vazios e estáveis;
- ausência de ciclos ou referência duplicada de nó;
- filhos não duplicados;
- localização inicial existente;
- condições e custos válidos;
- estado salvo referencia IDs existentes;
- local atual está desbloqueado e visitado;
- conjuntos de descoberta, desbloqueio e visita não contêm duplicatas;
- todo local, exceto a raiz, possui um único pai.

## Comportamento mobile

A primeira UI pode usar cartões ou lista:

- localização atual e breadcrumb;
- placeholder da área;
- botão para voltar ao pai;
- destinos irmãos;
- locais filhos que podem ser acessados;
- locais descobertos bloqueados com motivo;
- indicação de custo de viagem.

Não é necessário desenhar um mapa gráfico.

## Testes obrigatórios

- indexação do JSON aninhado;
- consulta de pai, filhos, irmãos e caminho;
- movimento válido para pai, filho e irmão;
- rejeição de salto entre ramos;
- descoberta, desbloqueio e primeira visita;
- bloqueio por condição;
- custo retornado corretamente;
- mapa e estado malformados rejeitados;
- imutabilidade;
- persistência da localização e progresso de mapa.

## Fora da etapa

- NPCs e criaturas posicionados no mapa;
- gatilhos narrativos completos;
- atalhos e viagem rápida;
- fog of war gráfico;
- minimapa ilustrado;
- geração procedural;
- movimentação em tempo real.

## Critérios de aceite

- mapa autorado em JSON hierárquico;
- regras pai, filho e irmão aplicadas pelo motor;
- navegação não depende da UI;
- bloqueios possuem motivo consultável;
- estado é persistível e validado;
- testes, lint, tipos e build passam;
- fluxo narrativo atual permanece funcional até a etapa de integração.
