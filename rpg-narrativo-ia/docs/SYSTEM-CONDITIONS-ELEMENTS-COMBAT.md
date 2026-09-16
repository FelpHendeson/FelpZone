# Sistema 15 — Condições, elementos e aprofundamento do combate

## Estado da decisão

**Aprovado, especificado e implementado pelo autor em 15 de setembro de 2026.**

O Sistema 15 aprofunda o combate determinístico com condições temporárias, afinidades elementais e novas escolhas de resposta. Ele reutiliza ações, habilidades, equipamento e preparação sem substituir o motor do Sistema 12.

Nomes, valores, duração e conteúdo do primeiro ciclo são protótipos. Não existe aleatoriedade oculta nem fórmula definitiva de atributos nesta etapa.

## Problema de diversão e imersão

O combate atual permite dano, cura, escudo e fuga, mas a decisão tende a se repetir turno a turno. Condições e elementos devem criar leitura, preparação e adaptação:

```text
reconhecer a ameaça
        ↓
preparar item, equipamento ou habilidade
        ↓
aplicar ou sofrer uma condição
        ↓
observar duração e consequência
        ↓
explorar afinidade ou escolher defesa
        ↓
resolver o encontro deterministicamente
        ↓
persistir somente consequências autorizadas
```

O jogador precisa entender por que um efeito ocorreu e quanto tempo resta, sem consultar uma planilha externa.

## Decisões confirmadas

### 1. Elementos são um catálogo, não strings livres

```ts
interface ElementDefinition {
  id: string;
  name: string;
  description: string;
}

interface ElementInteractionDefinition {
  sourceElementId: string;
  targetElementId: string;
  multiplier: number;
  label: 'resisted' | 'neutral' | 'effective';
}
```

O primeiro catálogo usa poucos elementos protótipo, incluindo um tipo neutro/físico e duas afinidades contrastantes. Toda combinação possui resultado explícito; ausência de relação não pode inventar multiplicador em runtime.

Multiplicadores são racionais positivos dentro de limites validados e aplicados uma única vez. A interface recebe o resultado já calculado.

### 2. Condições são efeitos declarativos com duração em turnos

```ts
interface ConditionDefinition {
  id: string;
  name: string;
  description: string;
  stacking: 'refresh' | 'replace-stronger' | 'none';
  timing: 'turn-start' | 'turn-end' | 'on-action';
  effects: readonly ConditionEffect[];
}

interface ActiveCondition {
  conditionId: string;
  remainingTurns: number;
  potency: number;
  sourceCombatantId: string;
}
```

O primeiro recorte prova três funções, com nomes protótipo:

- dano periódico;
- redução ou impedimento declarativo de uma categoria de ação;
- alteração temporária de dano, guarda ou cura.

### 3. Ordem de resolução é explícita

Cada turno segue uma ordem estável:

```text
efeitos de início do turno
        ↓
validar ação escolhida no estado resultante
        ↓
ordenar ações pela regra consolidada
        ↓
resolver custo, elemento, dano/cura/guarda e aplicação de condição
        ↓
efeitos de fim do turno
        ↓
reduzir durações e remover expiradas
        ↓
avaliar desfecho
```

Empates continuam seguindo o desempate determinístico existente. Condição nunca avança o relógio do mundo por turno.

### 4. Aplicação de condição não usa chance no primeiro recorte

Uma ação válida que declara uma condição aplica o efeito se seus requisitos forem satisfeitos. Resistência pode reduzir potência ou duração somente quando uma regra declarativa definir isso.

Não existem porcentagens invisíveis, acerto crítico aleatório, sorte ou resistência rolada.

### 5. Afinidades pertencem ao combatente e às ações

- uma ação pode declarar `elementId`;
- um combatente pode declarar afinidades de defesa;
- equipamento ou habilidade pode conceder afinidade por contrato público;
- condições podem alterar afinidade temporariamente somente por um efeito tipado;
- pessoas e criaturas usam os mesmos contratos.

Raça não é fonte implícita de afinidade nesta etapa.

### 6. Consequência persistente é limitada

Condições de combate são efêmeras por padrão e não entram no save. O Sistema 15 adiciona um estado persistente mínimo apenas para condições explicitamente marcadas como `lingering` após o desfecho.

```ts
interface PersistentConditionState {
  entries: readonly {
    conditionId: string;
    remainingPeriods: number;
    potency: number;
  }[];
}
```

A implementação evolui o save para `schemaVersion: 9`. Saves v1–v8 migram com lista vazia. Condições persistentes avançam somente quando o relógio do mundo avança por uma ação real.

### 7. Cura, limpeza e proteção são ações comuns

Remover ou reduzir uma condição usa efeitos declarativos:

```ts
type ConditionMutationEffect =
  | { type: 'condition.apply'; conditionId: string; duration: number; potency: number }
  | { type: 'condition.cleanse'; conditionId?: string; count: number }
  | { type: 'condition.duration.reduce'; amount: number };
```

Habilidades, itens preparados e ações inimigas podem referenciar esses efeitos. O catálogo valida todas as referências.

## Integração com sistemas existentes

### Combate

- `CombatState` passa a carregar condições ativas e afinidades resolvidas;
- replay da resolução reproduz exatamente os mesmos resultados;
- IA considera somente fatos públicos do estado e regras declaradas;
- feedback explica condição, duração, afinidade e valor final;
- desfecho continua uma única transação de mundo.

### Itens e preparação

- equipamento pode conceder afinidade ou ação de proteção;
- consumível preparado pode limpar ou reduzir condição;
- consumo permanece responsabilidade do Sistema 14;
- nenhum item aparece automaticamente por causa do Sistema 15.

### Habilidades e progressão

- uma habilidade conhecida pode liberar ação elemental ou de condição;
- prática continua seguindo o Sistema 13 e não aumenta por tick de condição;
- usar repetidamente uma condição não contorna o limite de prática por vitória.

### Tempo e necessidades

- turnos não avançam o relógio;
- o confronto completo cobra o custo consolidado uma única vez;
- condições persistentes avançam por períodos cobrados depois do combate;
- falha na aplicação terminal reverte saúde, condições, consumo, tempo e recompensa.

## Primeiro ciclo jogável do protótipo

1. descobrir uma ameaça com afinidade conhecida por observação;
2. consultar a informação autorizada e preparar uma resposta;
3. entrar no combate com um item ou habilidade apropriado;
4. aplicar uma condição de dano periódico;
5. sofrer uma condição que altera uma escolha;
6. usar limpeza, proteção ou afinidade favorável;
7. vencer com resolução totalmente reproduzível;
8. carregar uma condição persistente simples para o mundo;
9. avançar tempo e observar sua redução;
10. salvar e recarregar sem duplicar ticks ou resultados.

O encontro e os números são protótipos. O ciclo pode ampliar o Predador Arisco ou adicionar uma variação declarativa, sem criar geração procedural.

## Persistência e segurança

- schema 9 migra v1–v8 sem executar ticks;
- somente condições marcadas como persistentes entram no save;
- definições, relações elementais e condições efêmeras não são persistidas;
- IDs, duração e potência são validados e limitados;
- saves não podem injetar efeitos ou elementos desconhecidos;
- carregar não aplica dano, cura, limpeza ou passagem do tempo;
- resultados de combate enviados pela UI não são confiáveis; o domínio os reproduz.

## Apresentação mobile

```text
┌──────────────────────────────────┐
│ PREDADOR ARISCO       18 / 24    │
│ Afinidade conhecida: Brasas ↓    │
│ Condição: Exposto · 2 turnos     │
├──────────────────────────────────┤
│ VOCÊ                  21 / 30    │
│ Condição: Sangramento · 1 turno  │
├──────────────────────────────────┤
│ Ação selecionada                 │
│ Água Fria · eficaz               │
│ [Confirmar turno]                │
└──────────────────────────────────┘
```

- condição mostra nome, potência compreensível e duração;
- cor nunca é o único sinal;
- afinidade desconhecida não é revelada por multiplicador antecipado;
- resumo do turno apresenta causa antes do número final;
- 320 px sem overflow e alvos de 48 px;
- informações secundárias ficam em expansão progressiva.

## Sequência de fatias

### Fatia 15.1 — Catálogos de elementos e condições

Tipos, validação profunda, índices imutáveis e referências, sem alterar combate.

### Fatia 15.2 — Motor puro de condições

Aplicação, stacking, duração, ticks, limpeza e imutabilidade.

### Fatia 15.3 — Matriz elemental determinística

Afinidades, multiplicadores e cálculo reproduzível, sem UI.

### Fatia 15.4 — Integração com ações, IA e replay

Ordem do turno, ações condicionais e prova de determinismo.

### Fatia 15.5 — Persistência de consequências

Condições `lingering`, schema 9, migrações v1–v8 e avanço por período.

### Fatia 15.6 — Itens, habilidades e interface mobile

Proteção, limpeza, afinidades autorizadas e apresentação responsiva.

### Fatia 15.7 — Ciclo ponta a ponta e consolidação

Descobrir → preparar → aplicar/responder → concluir → persistir/recuperar, seguido de todos os gates.

## Critérios de aceite

- toda relação elemental é declarada e validada;
- condições resolvem em ordem estável e reproduzível;
- aplicação inicial não depende de aleatoriedade;
- stacking segue uma política explícita;
- ticks não concedem prática duplicada;
- turnos não avançam o relógio mundial;
- condição persistente avança somente com tempo real do jogo;
- UI não calcula multiplicador, potência ou duração;
- resolução forjada ou repetida não concede consequência;
- schema 9 migra sem gameplay;
- o ciclo completo funciona após save/reload;
- suíte, lint, tipos, build/PWA, revisão funcional, segurança e visual passam.

## Fora do Sistema 15

- posicionamento, alcance, área espacial e tabuleiro;
- múltiplos oponentes ou grupo;
- chance de acerto, crítico aleatório e fórmulas definitivas;
- dezenas de elementos ou combinações procedurais;
- clima alterando elementos;
- mutilação, morte permanente e perda de save;
- Jardim, pertencente ao Sistema 16;
- NPCs persistentes e agenda, pertencentes ao Sistema 17;
- backend, IA em runtime e PvP.
