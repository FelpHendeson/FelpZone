# Sistema 10 — Objetivos, jornadas e registro de descobertas

## Estado da decisão

**Aprovado pelo autor em 11 de setembro de 2026 e em implementação.** O Sistema 10 deve conectar os sistemas já existentes em metas compreensíveis de curto e médio prazo. Ele não autoriza combate, agenda, equipamentos, facções jogáveis ou conteúdo extenso.

## Problema de diversão e imersão

O jogador já pode explorar, navegar, coletar, fabricar, sobreviver e interagir. Essas ações funcionam, mas ainda não formam uma trajetória visível. Sem uma camada de objetivos, o ciclo corre o risco de parecer uma sucessão de tarefas sem propósito.

O Sistema 10 transforma fatos do mundo em jornadas acompanháveis:

```text
agir livremente no mundo
        ↓
alcançar um marco conhecido ou oculto
        ↓
registrar progresso sem repetir a ação
        ↓
apresentar contexto no diário
        ↓
concluir uma etapa ou jornada
        ↓
continuar explorando ou abrir novos caminhos
```

Objetivos orientam, mas não substituem a autonomia do sandbox. O jogador pode ignorar uma jornada e continuar agindo.

## Vocabulário

- **objetivo:** definição dirigida por dados que reúne uma intenção e suas etapas;
- **jornada:** nome apresentado ao jogador para um objetivo acompanhado;
- **etapa:** marco individual e permanente de uma jornada;
- **critério:** fato verificável no estado atual, como visitar um local ou construir uma estrutura;
- **ativação:** momento em que a jornada passa a ser conhecida;
- **diário:** apresentação derivada de jornadas, descobertas e registros já conhecidos;
- **objetivo oculto:** definição cuja identidade não aparece antes da ativação.

## Princípios

- o catálogo é conteúdo; o estado guarda somente progresso;
- etapas concluídas nunca voltam a ficar incompletas quando um item é consumido ou o jogador muda de local;
- sincronizar repetidamente o mesmo estado é idempotente;
- consultar ou abrir o diário não consome tempo;
- conteúdo oculto não vaza por listas, contagens, mensagens ou motivos de bloqueio;
- critérios observam fontes canônicas existentes, sem duplicá-las;
- conclusão não força narrativa nem muda o modo de jogo por si só;
- nenhuma regra de objetivo vive em componentes React.

## Modelo conceitual

```ts
type ObjectiveKind = 'main' | 'side' | 'hidden';
type ObjectiveStepMode = 'sequential' | 'parallel';
type ObjectiveStatus = 'locked' | 'active' | 'completed';

interface ObjectiveDefinition {
  id: string;
  title: string;
  description: string;
  kind: ObjectiveKind;
  stepMode: ObjectiveStepMode;
  activation: ObjectiveActivation;
  steps: ObjectiveStepDefinition[];
  completionText?: string;
}

interface ObjectiveStepDefinition {
  id: string;
  title: string;
  description?: string;
  criteria: ObjectiveCriterion[];
}

interface ObjectiveProgress {
  objectiveId: string;
  completedStepIds: string[];
  completed: boolean;
}

interface ObjectivesState {
  entries: ObjectiveProgress[];
}
```

Um objetivo ausente do estado está bloqueado ou ainda é desconhecido. Uma entrada existe quando o objetivo foi ativado. `completed` precisa ser coerente com todas as etapas concluídas. Status é derivado e não é armazenado separadamente.

## Categorias

- `main`: conduz a direção principal sem impedir exploração livre;
- `side`: conteúdo opcional conhecido;
- `hidden`: identidade omitida até que os critérios de ativação sejam satisfeitos.

A categoria não determina prioridade de execução nem exclusividade de rota. Rotas incompatíveis e falhas definitivas de objetivo não fazem parte deste sistema.

## Ordem das etapas

- `sequential`: somente a primeira etapa ainda incompleta pode ser concluída;
- `parallel`: qualquer etapa pode ser concluída quando seus critérios forem satisfeitos.

Em ambos os casos, uma etapa já concluída permanece registrada. Uma jornada é concluída exatamente uma vez quando todas as etapas estiverem concluídas.

## Critérios aprovados

O primeiro contrato observa apenas fatos que já possuem fonte canônica:

```ts
type ObjectiveCriterion =
  | { type: 'progression.ability.has'; abilityId: string }
  | { type: 'navigation.location.visited'; locationId: string }
  | { type: 'exploration.discovery.revealed'; discoveryId: string }
  | { type: 'inventory.item.quantity'; itemId: string; quantity: number }
  | { type: 'crafting.structure.active'; structureId: string; locationId?: string }
  | { type: 'presence.discovered'; presenceId: string }
  | { type: 'presence.resolved'; presenceId: string }
  | { type: 'flag.is'; flag: string; value: boolean }
  | { type: 'world.day.min'; day: number };
```

Todos os critérios de uma etapa precisam ser satisfeitos. Contadores genéricos de ações, porcentagens arbitrárias, condições temporais por período e expressões lógicas aninhadas ficam fora do primeiro recorte.

## Ativação

```ts
type ObjectiveActivation =
  | { type: 'automatic' }
  | { type: 'criteria'; criteria: ObjectiveCriterion[] };
```

Objetivos automáticos entram no estado inicial do módulo. Objetivos por critérios são ativados na primeira sincronização em que todos os critérios forem satisfeitos. Ativar novamente é idempotente.

Objetivos ocultos só podem ser apresentados depois de ativados. O catálogo completo continua disponível apenas para o motor e para validação de conteúdo.

## Sincronização com o jogo

A integração futura recebe um `GameState` válido e um catálogo indexado, sem mutar nenhum dos dois:

1. ativa objetivos elegíveis na ordem do catálogo;
2. avalia etapas elegíveis de cada objetivo ativo;
3. em objetivos sequenciais, para na primeira etapa ainda incompleta que falhar;
4. em objetivos paralelos, registra todas as etapas satisfeitas;
5. conclui objetivos que passaram a ter todas as etapas;
6. devolve o estado anterior, o novo estado e os IDs recém-ativados, recém-concluídos e das etapas novas.

A sincronização observa o estado final de uma ação. Por isso, uma etapa de inventário é registrada permanentemente no momento em que a quantidade necessária existe, mesmo que o item seja consumido depois.

## Persistência

A Fatia 10.2 deverá incluir `ObjectivesState` no save e elevar o schema somente porque o formato persistido mudará.

- catálogo, textos, critérios e status derivados não entram no JSON;
- saves anteriores recebem o estado inicial e são sincronizados contra fatos já alcançados;
- migração não avança tempo, não aplica efeitos e não regrava durante a leitura;
- estado restaurado precisa referenciar exatamente objetivos e etapas existentes;
- uma etapa concluída precisa respeitar a ordem sequencial;
- um objetivo marcado como concluído precisa conter todas as etapas.

## Diário e registro de descobertas

O diário será uma visão derivada, não um segundo histórico do mundo. Ele reunirá:

- jornadas conhecidas e seu progresso;
- localização visitada e descobertas já reveladas;
- NPCs, animais e criaturas já conhecidos;
- registros narrativos já presentes em `history`.

O diário não copiará descrições secretas nem persistirá listas redundantes. A Fatia 10.3 definirá view-models seguros para a interface.

## Interface mobile

- uma área “Jornadas” ficará acessível sem consumir tempo;
- a interface separará principal, opcionais e concluídas;
- objetivo oculto não ocupará espaço antes da ativação;
- uma jornada poderá ser acompanhada para mostrar sua próxima etapa no contexto do mundo;
- conclusão será comunicada sem modal obrigatório;
- progresso será textual, não dependerá apenas de cor;
- alvos de toque terão pelo menos 48 px;
- a tela não exibirá recompensas ou sistemas ainda inexistentes.

## Primeira jornada jogável

O conteúdo protótipo validará uma jornada “Primeiros passos” usando somente fatos atuais:

```text
✓ Escolher uma capacidade inicial
✓ Explorar a Clareira do Despertar
✓ Encontrar a nascente
✓ Construir uma fogueira
✓ Preparar uma refeição
○ Investigar os sinais de outra pessoa
○ Conhecer Mira
```

Os textos e a ordem final são protótipos. O fluxo não exigirá combate, não criará recursos e não mudará o balanceamento do Sistema 9.

## Fatias aprovadas

### Fatia 10.1 — Modelo puro de objetivos

**Implementada, revisada e consolidada.** `modules/objectives` fornece catálogo profundamente validado, índice imutável em runtime, estado isolado, ativação idempotente, etapas sequenciais ou paralelas, conclusão automática, status derivado e consultas que omitem objetivos desconhecidos. Entradas hostis, lacunas, ordens divergentes e inconsistência entre lista e índice são rejeitadas. A entrega acrescenta 40 testes e passou pela suíte completa de 533 testes, lint, tipos e build/PWA. Não altera `GameState`, schema, persistência, orquestrador ou UI.

### Fatia 10.2 — Integração e persistência

Adicionar critérios e sincronização contra o `GameState`, persistir `ObjectivesState`, migrar saves anteriores e preservar atomicidade. Ainda sem atualização automática pelas ações e sem UI.

### Fatia 10.3 — Atualização e diário derivado

Sincronizar objetivos no fluxo jogável depois de ações do sandbox e produzir o modelo derivado do diário com jornadas, descobertas, presenças e histórico. Não adicionar tela nesta fatia.

### Fatia 10.4 — Interface mobile

Adicionar Jornadas/Diário à navegação, objetivo acompanhado, progresso e feedback discreto. Validar celular, tablet e desktop.

### Fatia 10.5 — Primeira jornada ponta a ponta

Adicionar o conteúdo “Primeiros passos” e provar ativação, progresso, persistência, conclusão, ausência de vazamento oculto e continuidade do sandbox usando apenas o conteúdo atual.

## Fora do Sistema 10

- combate, inimigos, dano e estatísticas de batalha;
- agenda, deslocamento ou comportamento autônomo de NPCs;
- equipamentos, ferramentas, durabilidade e peso;
- recompensas materiais automáticas ou efeitos de conclusão;
- falha definitiva, prazo, abandono ou rota incompatível;
- marcadores de mapa, bússola, rastreamento por distância ou caminho automático;
- administração de assentamentos ou facções;
- árvore de habilidades;
- novos locais, recursos, receitas, NPCs ou capítulos;
- backend, conta, sincronização e IA em runtime;
- arte final.

## Critérios de conclusão

- objetivos e etapas são conteúdo validado e imutável;
- progresso é persistente, monotônico e idempotente;
- fatos dos sistemas existentes atualizam jornadas sem duplicar fontes canônicas;
- objetivos ocultos não vazam antes da ativação;
- diário deriva apenas conhecimento já adquirido;
- “Primeiros passos” conecta introdução, exploração, sobrevivência e Mira;
- abrir menus não consome tempo;
- testes, lint, tipos, build/PWA, revisão de código e revisão visual passam.
