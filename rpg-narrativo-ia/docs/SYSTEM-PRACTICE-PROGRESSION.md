# Sistema 13 — Progressão por prática e recompensas do Sistema

## Estado da decisão

**Aprovado pelo autor em 15 de setembro de 2026 para especificação. A implementação ainda não foi iniciada nem autorizada por este documento.**

O Sistema 13 conecta os ciclos já consolidados de treinamento, Árvore de habilidades e combate. Seu objetivo é fazer ações legítimas do personagem produzirem desenvolvimento compreensível, sem criar experiência genérica, loot, equipamentos ou uma fórmula definitiva de poder.

Os números, limiares, nomes e recompensas do primeiro ciclo são **conteúdo de protótipo**. O contrato modular, a origem verificável da prática, a atomicidade e o sigilo de conteúdo são requisitos do sistema.

## Problema de diversão e imersão

Hoje o jogador pode treinar uma habilidade, liberar ações e vencer um confronto, mas esses momentos ainda não fecham um ciclo contínuo de fortalecimento:

- treinamento aumenta proficiência, porém o uso real da habilidade não a desenvolve;
- o nível existe no Status, mas permanece sem significado operacional;
- uma vitória concede apenas a consequência simples do encontro;
- a Árvore não comunica claramente quanto falta para um próximo marco conhecido;
- o Sistema ainda não relata a evolução causada por uma ação concreta.

O resultado desejado é:

```text
explorar e treinar
        ↓
descobrir e enfrentar um desafio
        ↓
usar uma habilidade conhecida
        ↓
o domínio valida a prática realizada
        ↓
proficiência e marcos são atualizados
        ↓
o Sistema explica o desenvolvimento
        ↓
novos métodos e ações tornam-se possíveis
        ↓
o jogador volta ao mundo mais preparado
```

O crescimento deve representar o que o personagem praticou. Usar uma técnica de Corpo desenvolve aquela habilidade ou seu caminho relacionado; não distribui pontos abstratos para qualquer área.

## Decisões confirmadas

### 1. Prática precisa de uma origem verificável

O React não informa que o personagem merece progresso. O domínio deriva prática apenas de resultados já validados pelos sistemas responsáveis.

As fontes iniciais são:

- **treinamento concluído:** mantém os efeitos declarados e validados pelo Sistema 11;
- **vitória em combate:** usa somente a `CombatResolution` terminal reproduzida e validada pelo Sistema 12;
- **marco alcançado:** é derivado do estado resultante, nunca enviado pela interface.

Exploração, crafting, interações narrativas e outras fontes poderão fornecer prática no futuro, mas não entram automaticamente no primeiro recorte.

```ts
type MasteryEvidence =
  | {
      type: 'training.completed';
      methodId: string;
    }
  | {
      type: 'combat.victory';
      encounterId: string;
      playerActionIds: readonly string[];
    };
```

`MasteryEvidence` é um valor interno produzido durante uma transação já autorizada. Ele não entra no save e não é aceito diretamente da UI.

### 2. Proficiência cresce na habilidade realmente praticada

Uma ação de combate só produz prática quando declara um `skillId` válido e essa habilidade era conhecida pelo personagem ao iniciar o confronto.

No primeiro recorte:

- apenas vitória concede prática de combate;
- cada habilidade usada recebe no máximo um incremento por encontro vencido, mesmo que sua ação tenha sido repetida em vários turnos;
- ações básicas sem `skillId` não concedem proficiência;
- derrota e fuga não concedem proficiência;
- o encontro resolvido não pode conceder novamente a mesma recompensa;
- o incremento protótipo é `+1` por habilidade elegível utilizada.

Essas regras evitam que repetir a mesma ação dentro de um confronto, fugir ou recarregar a página se torne uma fonte infinita de progresso. A quantidade `+1` é substituível por conteúdo, não uma curva definitiva.

```ts
interface PracticeRuleDefinition {
  id: string;
  source: {
    type: 'combat.victory';
    encounterId: string;
  };
  reward: {
    type: 'used-skill.proficiency.increase';
    amount: number;
    maximumPerSkill: number;
  };
}
```

O catálogo protótipo associa a vitória em `clearing-predator` a `amount: 1` e `maximumPerSkill: 1`. Novas regras precisam declarar seus próprios encontros e não tornam toda vitória futura recompensadora por suposição.

O treinamento continua sendo uma fonte independente e voluntária. O Sistema 13 não duplica os efeitos que o `TrainingPlan` já aplicou; ele observa o estado resultante para avaliar marcos.

### 3. Nível é um marco, não uma moeda de experiência

O nível representa uma síntese de desenvolvimento reconhecida pelo Sistema. Ele não substitui as proficiências e não cria, neste recorte, uma barra universal de experiência.

Regras:

- o nível começa em `1` e nunca diminui;
- somente o avaliador de marcos pode alterá-lo;
- um marco declara requisitos verificáveis e o nível resultante;
- cumprir um marco pode revelar possibilidades conhecidas, mas não concede poderes sem uma regra explícita;
- reavaliar o mesmo estado é idempotente;
- não existe ganho fracionário, aleatório ou enviado pela interface.

```ts
interface MasteryMilestoneDefinition {
  id: string;
  level: number;
  requirements: readonly MasteryRequirement[];
  reveals: readonly MasteryReveal[];
}

type MasteryRequirement =
  | {
      type: 'skill.proficiency';
      skillId: string;
      minimum: number;
    }
  | {
      type: 'skill.known';
      skillId: string;
    }
  | {
      type: 'level.minimum';
      level: number;
    };

type MasteryReveal =
  | {
      type: 'training.available';
      methodId: string;
    };
```

Os catálogos devem impedir níveis repetidos, regressivos, requisitos impossíveis, referências inexistentes e ciclos de revelação.

### 4. O primeiro ciclo jogável do protótipo

O primeiro ciclo utilizará conteúdo que já existe:

1. `Sentidos Aguçados` começa conhecida, com proficiência `0`;
2. `Treino de Percepção Focada` aumenta sua proficiência em `+1` por execução, como hoje;
3. vencer o `Predador Arisco` tendo usado `Golpe Preciso` aumenta `Sentidos Aguçados` em `+1`, no máximo uma vez naquela vitória;
4. ao atingir proficiência `3` em `Sentidos Aguçados`, o personagem alcança o nível `2`;
5. esse marco torna conhecida a possibilidade da `Rotina de Reforço do Corpo`;
6. concluir a rotina mantém a responsabilidade existente do treinamento e ensina `Corpo Firme`;
7. conhecer `Corpo Firme` libera a ação `Estancar Ferida` pelo contrato já usado pelo combate.

```text
Sentidos Aguçados 0
        ↓ treino ou prática verificada
Sentidos Aguçados 3
        ↓ marco reconhecido
Nível 2 + Rotina de Reforço disponível
        ↓ treino de 2 períodos
Corpo Firme conhecido
        ↓
Estancar Ferida disponível em combate
```

Proficiência `3`, nível `2` e incremento `+1` são valores de protótipo destinados a provar o ciclo. Não definem o balanceamento final do jogo.

### 5. Métodos de treino podem possuir requisitos de domínio

O catálogo de treinamento poderá declarar requisitos fechados e validados. Um método oculto não aparece antes de o Sistema reconhecer seus requisitos; um método conhecido, porém momentaneamente bloqueado, pode aparecer com o motivo compreensível.

```ts
interface TrainingMethodDefinition {
  // campos existentes
  requirements?: readonly MasteryRequirement[];
}
```

No conteúdo inicial, a `Rotina de Reforço do Corpo` exige nível `2` ou o marco equivalente definido pelo catálogo. A implementação deve escolher uma única fonte de verdade e não duplicar a mesma condição em React, `training` e `system-interface`.

### 6. Toda progressão entra na mesma transação da ação

Uma ação não pode consumir tempo, conceder recompensa e falhar ao atualizar a progressão pela metade.

Para treinamento:

```text
validar e planejar treino
        ↓
aplicar efeito de treino
        ↓
avaliar marcos no estado resultante
        ↓
aplicar custo temporal uma vez
        ↓
sincronizar sistemas derivados
        ↓
produzir um único GameState
```

Para combate:

```text
validar disponibilidade do encontro
        ↓
reproduzir a resolução terminal
        ↓
aplicar saúde, flag e consequência
        ↓
derivar prática das ações verificadas
        ↓
avaliar marcos
        ↓
aplicar custo temporal uma vez
        ↓
sincronizar sistemas derivados
        ↓
produzir um único GameState
```

Se qualquer validação falhar, nenhuma proficiência, nível, flag, recompensa, desgaste ou avanço temporal permanece.

### 7. O Sistema explica causa e consequência

O resultado do domínio inclui um resumo estruturado, sem exigir que a UI compare estados ou invente mensagens.

```ts
interface MasteryResult {
  previous: SkillsProgressState;
  current: SkillsProgressState;
  proficiencyGains: readonly {
    skillId: string;
    amount: number;
    source: 'training' | 'combat';
  }[];
  reachedMilestoneIds: readonly string[];
  revealedTrainingIds: readonly string[];
}
```

O texto final é derivado de IDs já autorizados pelos catálogos. Conteúdo oculto nunca aparece em mensagens, contadores, descrições de bloqueio ou resultados antes de sua revelação.

## Persistência e compatibilidade

O primeiro recorte preserva `schemaVersion: 7`.

- `GameState.system.level` continua guardando o nível reconhecido;
- `GameState.system.entries` continua guardando somente habilidades conhecidas e suas proficiências;
- evidências, catálogos, limiares e mensagens não são persistidos;
- o encontro resolvido continua protegido pela flag existente;
- saves atuais não ganham progresso durante leitura ou migração;
- um save que já satisfaz um marco poderá reconhecê-lo na próxima ação de progressão válida, nunca silenciosamente ao carregar;
- nenhuma regravação do `localStorage` ocorre apenas por consultar o Status.

Se uma expansão futura precisar registrar recompensas reclamadas em encontros repetíveis, ela exigirá decisão e migração próprias. O protótipo inicial não antecipa esse estado.

## Fronteiras dos módulos

### `mastery` — novo módulo proposto

- valida o catálogo de marcos e regras de prática;
- transforma evidências confiáveis em incrementos de proficiência;
- avalia marcos de forma pura e idempotente;
- produz `MasteryResult` e efeitos declarativos;
- não acessa React, relógio, persistência nem arquivos internos de combate ou treinamento.

O nome evita confusão com o módulo legado `modules/progression`, que continua responsável por capacidades e títulos da campanha original.

### `skills`

- continua sendo a fonte de verdade para habilidades, caminhos, conhecimento e proficiência;
- expõe operações públicas para aplicar incrementos e nível validado;
- não interpreta combate nem avança tempo.

### `training`

- continua planejando treino, custo e efeitos;
- passa a validar requisitos de domínio declarados;
- não concede prática adicional além dos efeitos do próprio método;
- não calcula a interface.

### `combat`

- continua resolvendo e reproduzindo turnos;
- fornece ações verificadas na resolução terminal;
- não concede proficiência nem conhece marcos de nível.

### `sandbox-actions`

- compõe prática, consequência, tempo, necessidades e sincronizações;
- garante uma única transação;
- fornece o resumo estruturado à interface.

### `system-interface` e React

- derivam Status, progresso conhecido e feedback a partir dos contratos públicos;
- enviam intenções, nunca valores de proficiência, nível ou recompensas;
- não replicam requisitos nem fórmulas.

## Apresentação mobile

O Sistema 13 amplia a superfície existente sem criar uma nova aba principal.

### Status

- nível permanece no cabeçalho do Sistema;
- cada habilidade conhecida mostra sua proficiência;
- o próximo marco conhecido pode mostrar progresso e requisito compreensível;
- marcos ocultos não aparecem nem alteram contadores;
- consultar não consome tempo.

### Treinamento

- métodos ainda não revelados permanecem invisíveis;
- métodos revelados mostram custo temporal e requisitos;
- bloqueios informam somente conhecimento que o personagem possui;
- o diálogo de confirmação existente continua sendo usado.

### Resultado de ação

- vitória informa quais habilidades foram praticadas;
- aumento de nível recebe destaque curto e diegético;
- novos métodos são apresentados como orientação do Sistema;
- o resumo do combate continua priorizando saúde, tempo e desfecho antes dos detalhes de progressão;
- a interface funciona desde 320 px, sem rolagem horizontal e com alvos de pelo menos 48 px.

Exemplo conceitual:

```text
┌──────────────────────────────────┐
│ SISTEMA · DESENVOLVIMENTO        │
│ Nível 2 alcançado                │
├──────────────────────────────────┤
│ Sentidos Aguçados                │
│ Proficiência 3  ·  +1 em combate│
├──────────────────────────────────┤
│ Nova orientação reconhecida      │
│ Rotina de Reforço do Corpo       │
│ [Consultar método]               │
└──────────────────────────────────┘
```

## Relação com Jornadas e Diário

O Sistema 10 poderá observar fatos finais do Sistema 13, como nível alcançado, proficiência mínima ou habilidade conhecida. Ele não calcula progressão e não concede a mesma recompensa novamente.

O primeiro ciclo pode atualizar uma jornada existente ou uma jornada protótipo específica, desde que:

- o critério use o estado final como fonte de verdade;
- a sincronização aconteça depois da transação de progressão;
- objetivos ocultos não vazem marcos futuros;
- não sejam criadas recompensas automáticas fora do contrato desta etapa.

## Sequência de fatias

### Fatia 13.1 — Vocabulário, catálogo e validação isolada

Criar os contratos de evidência, regra de prática, requisito, marco e resultado. Validar referências entre habilidades, ações, treinamentos e encontros na camada de composição. Não alterar `GameState`, relógio ou UI.

### Fatia 13.2 — Motor puro de prática e marcos

Derivar incrementos de proficiência de evidências confiáveis, limitar uma recompensa por habilidade no encontro, avaliar marcos e produzir `MasteryResult` imutável e idempotente.

### Fatia 13.3 — Integração atômica com o combate

Depois de reproduzir uma vitória, conceder prática pelas ações com `skillId` e incluir o resultado na mesma transação terminal. Provar que derrota, fuga, repetição, recarga e resolução forjada não concedem progresso.

### Fatia 13.4 — Nível e requisitos de treinamento

Dar significado operacional ao nível por marcos declarativos, condicionar a disponibilidade de métodos e provar o ciclo `Sentidos Aguçados → nível 2 → Rotina de Reforço → Corpo Firme` sem alterar o schema.

### Fatia 13.5 — Interface diegética e feedback

Mostrar progresso conhecido, requisitos autorizados, ganhos de prática, nível alcançado e método revelado na aba Sistema e nos resultados contextuais. Validar 320 px e desktop.

### Fatia 13.6 — Ciclo jogável ponta a ponta

Provar treino ou combate → proficiência → marco → novo método → nova habilidade → nova ação de combate, com salvamento e recarga entre etapas.

### Fatia 13.7 — Consolidação e gates

Revisar atomicidade, idempotência, sigilo, imutabilidade, compatibilidade de saves e ausência de concessão indevida; executar testes, lint, tipos, build/PWA, revisão de código, segurança e validação visual.

Cada fatia precisa ser implementada, testada e revisada antes da seguinte. Esta especificação não autoriza a implementação automaticamente.

## Critérios de aceite

- somente treino validado ou vitória de combate reproduzida produz progresso no primeiro recorte;
- ações sem habilidade, derrota e fuga não concedem proficiência;
- repetir uma ação em vários turnos concede no máximo um incremento por habilidade naquela vitória;
- encontro resolvido não concede recompensa novamente;
- treinamento não recebe incremento duplicado do Sistema 13;
- nível é monotônico, dirigido por marcos e idempotente;
- o primeiro ciclo alcança nível 2, revela o treino e libera `Corpo Firme` e sua ação de combate;
- toda mudança de combate ou treino permanece na mesma transação do mundo;
- conteúdo oculto não vaza por árvore, treinamento, mensagens ou contadores;
- saves schema 7 continuam válidos e não mudam durante leitura;
- React não calcula proficiência, nível, requisitos nem recompensas;
- catálogos são profundamente validados, imutáveis e substituíveis;
- a UI funciona desde 320 px e preserva “aventura primeiro, dados sob demanda”;
- testes, lint, tipos, build/PWA e revisões passam em todas as fatias.

## Fora do Sistema 13

- experiência universal distribuída como pontos livres;
- fórmula ou curva definitiva de nível;
- progressão por derrota ou fuga;
- encontros repetíveis e histórico persistente de recompensas;
- loot, recompensas materiais, raridade e tabelas aleatórias;
- armas, armaduras, acessórios, equipamentos, peso e durabilidade;
- consumíveis usados em combate;
- condições de status ricas, elementos, resistências e fraquezas;
- posicionamento, distância, grupos e múltiplos oponentes;
- Jardim de habilidades e regras de fusão;
- classes, raças, bônus raciais ou protagonista não humano;
- minijogos de treinamento;
- balanceamento definitivo;
- IA generativa, backend, conta ou sincronização em nuvem.

Esses temas continuam em discussão ou sem certeza de implementação e precisam de autorização própria antes de receber contrato ou código.

## Decisões necessárias antes da implementação

1. confirmar se a implementação pode seguir continuamente pelas Fatias 13.1 a 13.7 ou se cada fatia exige autorização separada;
2. confirmar se o ciclo protótipo de proficiência `3` e nível `2` será usado como descrito;
3. definir se o método revelado fica totalmente oculto antes do marco ou aparece como possibilidade bloqueada sem detalhes;
4. decidir se a progressão será mostrada imediatamente no resultado do combate ou em uma notificação consultável do Sistema;
5. decidir se uma jornada protótipo acompanhará esse primeiro ciclo já no Sistema 13.
