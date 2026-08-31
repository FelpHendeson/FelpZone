# Sistema 2 — Ciclo diário

## Dependência

Só iniciar após o sistema de horário e data estar implementado, testado e consolidado.

## Objetivo

Interpretar a passagem do tempo e produzir mudanças de ciclo que outros módulos possam consumir. O relógio calcula quando o tempo mudou; o ciclo diário informa o significado dessa mudança para o mundo.

## Separação de responsabilidades

`time`:

- conhece dia, período e ordem;
- calcula avanço.

`day-cycle`:

- identifica início e fim de períodos;
- identifica encerramento e início de dia;
- produz sinais determinísticos;
- fornece fase visual derivada;
- futuramente coordena atualizações diárias.

## Eventos conceituais

```ts
type DayCycleEvent =
  | { type: 'period.ended'; day: number; periodId: string }
  | { type: 'period.started'; day: number; periodId: string }
  | { type: 'day.ended'; day: number }
  | { type: 'day.started'; day: number };
```

Se uma ação atravessar vários períodos, os eventos devem respeitar ordem cronológica.

## Fase visual

A aparência é derivada do período, sem relógio paralelo:

```ts
type DaylightPhase = 'daylight' | 'twilight' | 'night';
```

A configuração associa período a fase. O módulo de UI usa essa informação para tema, ícone ou texto, sem decidir regras.

## Passagem de data

Depois do último período:

1. encerrar período atual;
2. encerrar dia atual;
3. incrementar o dia;
4. iniciar primeiro período;
5. iniciar novo dia.

O sistema não deve, nesta etapa, aplicar fome, dano ou descanso. Ele produz os sinais que permitirão essas mecânicas depois.

## Testes obrigatórios

- mudança simples de período;
- ordem correta ao virar o dia;
- avanço que atravessa múltiplos períodos;
- avanço que atravessa múltiplos dias;
- fase visual correta para cada período;
- mesmos dados produzem mesmos eventos;
- nenhum evento duplicado;
- imutabilidade.

## Integração inicial

- mostrar dia e período na interface existente;
- permitir uma ação técnica ou cenário de teste para demonstrar avanço;
- preservar o fluxo narrativo atual;
- não adicionar ainda consequências de sobrevivência.

## Fora da etapa

- agenda de NPC;
- clima;
- encontros noturnos;
- fome, sono ou recuperação;
- bloqueio de locais por horário;
- navegação;
- animações complexas.

## Critérios de aceite

- eventos do ciclo são derivados exclusivamente do avanço do relógio;
- virada de dia está coberta por testes;
- UI não contém regras de ciclo;
- nenhuma regressão no MVP;
- módulo pronto para ser consumido pela navegação e por gatilhos futuros.
