# Sistema 5 — Pontos de recurso e ecologia

## Dependências

Só iniciar depois de exploração e descobertas estarem implementadas, testadas e consolidadas.

## Objetivo

Representar fontes locais de materiais com capacidade limitada, coleta explícita e recuperação baseada no tempo. O jogador precisa escolher quando e quanto extrair, pois alguns recursos retornam rapidamente, outros levam dias e populações podem ser esgotadas.

## Ponto de recurso

Um ponto só pode ser utilizado depois de descoberto.

```ts
type RenewalPolicy =
  | { type: 'none' }
  | { type: 'short'; periods: number }
  | { type: 'long'; days: number }
  | { type: 'population'; populationId: string };

interface ResourceNodeDefinition {
  id: string;
  locationId: string;
  name: string;
  capacity: number;
  collectionCost: { periods: number };
  renewal: RenewalPolicy;
  yields: ResourceYield[];
  conditions?: GameCondition[];
}

interface ResourceNodeState {
  nodeId: string;
  availableUnits: number;
  lastCollectedAt?: TimeState;
  nextRenewalAt?: TimeState;
  exhausted: boolean;
}
```

Quantidade, disponibilidade e datas devem ser validadas e persistidas. Coletar não pode produzir mais unidades do que as disponíveis.

## Classes de renovação

### Não renovável

Quando esgotado, não retorna pelo ciclo normal. Exemplo: depósito pequeno de mineral ou item único.

### Curto prazo

Recupera em poucos períodos ou na próxima virada diária. Exemplo: gravetos caídos, água acumulada ou frutos muito comuns.

### Longo prazo

Leva vários dias e pode depender de condições futuras. Exemplo: plantas raras, árvores e colônias de fungos.

### População ecológica

A disponibilidade depende de uma população viva compartilhada por habitats e encontros. Exemplo: toca de coelhos chifrudos.

## Populações

```ts
interface PopulationDefinition {
  id: string;
  speciesId: string;
  carryingCapacity: number;
  recoveryPerDay: number;
  warningThreshold: number;
  criticalThreshold: number;
}

interface PopulationState {
  populationId: string;
  current: number;
  pressure: number;
  locallyExtinct: boolean;
}
```

A fórmula final será balanceada na implementação, mas deve preservar:

- coleta ou caça reduz população;
- abaixo do limite de alerta, rendimento e frequência caem;
- abaixo do limite crítico, recuperação desacelera ou exige proteção;
- zerar pode causar extinção local e consequências narrativas;
- recuperação acontece na virada de dias, nunca por recarregar a página;
- o jogador recebe sinais qualitativos antes de causar dano irreversível.

## Toca de coelhos chifrudos

A toca é um ponto de habitat ligado a uma população. Uma ação de caça ou captura pode produzir uma carcaça ou materiais brutos:

- carne crua;
- pele;
- chifres;
- ossos ou outros materiais futuros.

Não entregar automaticamente alimento pronto. Cozinha transforma carne crua em comida segura. A quantidade retirada pressiona a população local; repetir a ação sem recuperação reduz disponibilidade e pode esgotar o habitat.

O sistema de criaturas futuro poderá reutilizar o mesmo `populationId`, evitando uma população para coleta e outra desconectada para encontros.

## Gravetes, nascente e outros exemplos

- gravetos: renovação curta, usados como combustível e material;
- nascente: fonte renovável de água, limitada por ação e recipiente futuro;
- plantas: renovação curta ou longa conforme espécie;
- pedra solta: capacidade local com recuperação lenta ou inexistente;
- animais: renovação populacional.

## Coleta

Uma coleta:

1. exige ponto descoberto e acessível no local atual;
2. valida condições, ferramentas futuras e disponibilidade;
3. informa custo de tempo;
4. determina quantidade retirada dentro do limite;
5. adiciona materiais ao inventário;
6. atualiza ponto e, se aplicável, população;
7. agenda renovação;
8. devolve sinais para narrativa e interface.

## Feedback ao jogador

Não é obrigatório mostrar números exatos de população. Estados qualitativos são suficientes inicialmente:

- abundante;
- estável;
- diminuindo;
- ameaçada;
- esgotada.

O jogador deve conseguir entender que insistir tem consequência.

## Testes obrigatórios

- ponto indisponível não pode ser coletado;
- coleta respeita capacidade e inventário;
- renovação curta e longa usa o relógio do jogo;
- fechar e abrir o jogo não acelera renovação;
- coleta populacional reduz a população correta;
- limites alteram estado qualitativo;
- extinção local impede nova coleta;
- virada diária recupera sem ultrapassar capacidade;
- operações são imutáveis e determinísticas;
- estado inválido é rejeitado e persistência é preservada.

## Fora da etapa

- combate contra criaturas;
- ferramentas e durabilidade;
- estações ou receitas;
- mercado;
- ecossistema completo entre predador e presa;
- estações do ano;
- geração procedural de recursos.

## Critérios de aceite

- nenhum ponto fornece recursos infinitos;
- curto, longo e populacional possuem comportamentos distintos;
- a toca de coelhos demonstra risco de sobre-exploração;
- renovação depende exclusivamente do tempo do jogo;
- coleta permanece separada de exploração e crafting;
- testes, lint, tipos e build passam.
