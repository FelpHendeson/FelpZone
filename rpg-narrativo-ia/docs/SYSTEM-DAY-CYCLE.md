# Sistema 2 — Ciclo diário

## Dependência

Só iniciar após o sistema de horário e data estar implementado, testado e consolidado.

## Objetivo

Interpretar a passagem do tempo e produzir mudanças de ciclo que outros módulos possam consumir. O relógio calcula quando o tempo mudou; o ciclo diário informa o significado dessa mudança para o mundo.

## Separação de responsabilidades

`time`:

- conhece dia, período e ordem;
- calcula avanço;
- valida estado, configuração e custo.

`day-cycle`:

- identifica início e fim de períodos;
- identifica encerramento e início de dia;
- produz sinais determinísticos;
- fornece fase visual derivada;
- futuramente coordena atualizações diárias.

A UI apenas consome resultados. Não existe relógio paralelo nem fase visual persistida em `GameState`.

## Eventos

```ts
type DayCycleEvent =
  | { type: 'period.ended'; day: number; periodId: string }
  | { type: 'period.started'; day: number; periodId: string }
  | { type: 'day.ended'; day: number }
  | { type: 'day.started'; day: number };
```

Os eventos são derivados exclusivamente de `TimeAdvanceResult`. Custo zero produz lista vazia. Não há evento inicial antes do primeiro avanço. Cada fronteira atravessada aparece exatamente uma vez, incluindo períodos intermediários.

Transição comum, de `alvorecer` para `manha`:

1. `period.ended` para `alvorecer`;
2. `period.started` para `manha`.

Virada de `noite` do dia 1 para `alvorecer` do dia 2:

1. `period.ended`, dia 1, `noite`;
2. `day.ended`, dia 1;
3. `period.started`, dia 2, `alvorecer`;
4. `day.started`, dia 2.

A detecção da virada usa o primeiro período da configuração de `time`, não nomes fixos na lógica.

## Fase visual

A aparência é derivada do período, sem relógio paralelo:

```ts
type DaylightPhase = 'daylight' | 'twilight' | 'night';
```

A associação padrão, em `modules/day-cycle/phases.ts`:

- `alvorecer`: `twilight`;
- `manha`: `daylight`;
- `meio-dia`: `daylight`;
- `tarde`: `daylight`;
- `entardecer`: `twilight`;
- `noite`: `night`.

O módulo de UI usará essa informação para tema, ícone ou texto, sem decidir regras. Nesta etapa a fase fica disponível no contrato e não altera o tema atual.

## Operações públicas

- `advanceDayCycle`: avança o relógio por meio de `advanceTime` e interpreta o resultado;
- `interpretDayCycle`: interpreta um `TimeAdvanceResult` já calculado;
- `getDaylightPhase`: consulta a fase visual de um período;
- `inspectDaylightPhaseConfig`: valida a configuração de fases sem exceção.

O retorno é:

```ts
interface DayCycleResult {
  time: TimeAdvanceResult;
  events: DayCycleEvent[];
  phase: DaylightPhase;
}
```

`phase` corresponde ao período final. Operações não mutam estado, custo, configuração, fases nem o `TimeAdvanceResult` recebido. Erros de `advanceTime` são relançados como `DayCycleError`.

## Validações

- configuração de fases vazia, com IDs vazios ou repetidos, ou com fase desconhecida é rejeitada;
- quando confrontada com a lista de períodos, a configuração precisa cobrir todos eles;
- período sem fase visual é rejeitado na consulta;
- o limite operacional e o overflow de dia continuam sendo os do relógio.

## Testes obrigatórios

- mudança simples de período;
- ordem correta ao virar o dia;
- avanço que atravessa múltiplos períodos;
- avanço que atravessa múltiplos dias;
- custo zero não emite eventos;
- fase visual correta para cada período;
- fase final correspondente ao período final;
- mesmos dados produzem mesmos eventos;
- nenhum evento duplicado;
- nenhum período intermediário omitido;
- imutabilidade;
- configuração de fase inválida é rejeitada;
- avanço no limite operacional do relógio;
- erros de `advanceTime` propagam de forma controlada.

## Integração inicial

- o cabeçalho existente continua mostrando dia e período;
- a demonstração dos avanços fica nos testes, sem botão técnico na interface;
- o fluxo narrativo atual permanece intacto;
- sobrevivência, tema visual e gatilhos do mundo ainda não são aplicados.

## Fora da etapa

- agenda de NPC;
- clima;
- encontros noturnos;
- fome, sono ou recuperação;
- bloqueio de locais por horário;
- navegação;
- animações complexas;
- alteração de `schemaVersion` ou do formato persistido.

## Critérios de aceite

- eventos do ciclo são derivados exclusivamente do avanço do relógio;
- virada de dia está coberta por testes;
- UI não contém regras de ciclo;
- nenhuma regressão no MVP;
- módulo pronto para ser consumido pela navegação e por gatilhos futuros.
