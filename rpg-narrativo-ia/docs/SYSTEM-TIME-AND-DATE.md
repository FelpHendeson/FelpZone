# Sistema 1 — Horário e data

## Objetivo

Criar um relógio determinístico, dirigido por ações, que represente dias após o Reset e períodos do dia. O sistema deve funcionar isoladamente antes de ciclo diário, navegação ou sobrevivência.

## Decisões

- O tempo não corre em tempo real.
- Ler textos e abrir menus não consome tempo.
- Ações autorizadas informam explicitamente seu custo.
- A unidade mínima é um período, não minutos.
- A data inicial é `Dia 1 após o Reset`.
- A lista de períodos é configurável e ordenada.

Períodos iniciais:

```json
[
  { "id": "alvorecer", "label": "Alvorecer" },
  { "id": "manha", "label": "Manhã" },
  { "id": "meio-dia", "label": "Meio-dia" },
  { "id": "tarde", "label": "Tarde" },
  { "id": "entardecer", "label": "Entardecer" },
  { "id": "noite", "label": "Noite" }
]
```

## Estado conceitual

```ts
interface TimeState {
  day: number;
  periodId: string;
}

interface TimeCost {
  periods: number;
}
```

O estado não deve armazenar simultaneamente índice e ID se isso permitir divergência. A configuração resolve a posição do ID na sequência.

Os IDs acima preservam o contrato persistido pelo MVP. Não os renomear apenas por preferência de idioma.

## Operações públicas

- criar estado inicial;
- consultar período atual;
- formatar data e horário para a interface;
- calcular avanço sem mutação;
- avançar um ou mais períodos;
- informar quantos limites de dia foram atravessados;
- validar configuração e estado persistido.

Exemplo conceitual de retorno:

```ts
interface TimeAdvanceResult {
  previous: TimeState;
  current: TimeState;
  crossedPeriods: string[];
  daysAdvanced: number;
}
```

## Condições e efeitos futuros

```ts
type TimeCondition =
  | { type: 'time.day.min'; day: number }
  | { type: 'time.day.max'; day: number }
  | { type: 'time.period.is'; periodId: string }
  | { type: 'time.period.in'; periodIds: string[] };

type TimeEffect =
  | { type: 'time.advance'; periods: number };
```

Não adicionar alteração arbitrária de data como efeito comum. Ajustes administrativos, se necessários, ficam restritos a testes ou migrações.

## Validações

- dias são inteiros positivos;
- períodos possuem IDs únicos e não vazios;
- configuração possui ao menos um período;
- estado referencia um período existente;
- custos são inteiros não negativos;
- avanço grande atravessa dias corretamente;
- operações não mutam o estado anterior.

## Testes obrigatórios

- estado inicial no dia e período corretos;
- avanço dentro do mesmo dia;
- avanço da noite para o próximo dia;
- avanço por múltiplos períodos e dias;
- custo zero não altera o estado;
- configuração inválida é rejeitada;
- estado persistido inválido é rejeitado;
- formatação em português;
- imutabilidade.

## Fora da etapa

- efeitos de fome ou energia;
- aparência diurna ou noturna;
- agendas de NPCs;
- eventos automáticos;
- custo de viagem;
- calendário com meses e anos;
- cronômetro em tempo real.

## Critérios de aceite

- módulo independente e testado;
- configuração de períodos separada da lógica;
- avanço determinístico;
- nenhuma alteração perceptível no fluxo atual do MVP;
- documentação reflete o contrato implementado.
