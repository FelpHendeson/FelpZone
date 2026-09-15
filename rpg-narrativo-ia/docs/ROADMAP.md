# Roadmap de evolução sandbox

## Princípio

O motor narrativo consolidado será mantido como camada de eventos e diálogos. A exploração será construída por sistemas independentes, um de cada vez, sempre seguindo o ciclo:

```text
especificar → implementar → testar → revisar → corrigir → consolidar → próxima etapa
```

Não iniciar duas etapas simultaneamente. Cada sistema deve estar estável antes de servir de dependência para o seguinte.

## Sequência aprovada

### Etapa 1 — Horário e data

**Implementada e integrada.** O módulo `modules/time` fornece um relógio determinístico por períodos e avanço de dias. O Sistema 7 passou a aplicar os custos das ações sandbox.

Fonte: `SYSTEM-TIME-AND-DATE.md`.

### Etapa 2 — Ciclo diário

**Implementada e integrada.** O módulo `modules/day-cycle` interpreta o avanço do relógio e produz eventos de início e encerramento de períodos e dias, além da fase visual derivada. O Sistema 7 usa esses eventos para recuperação populacional; tema por fase, sobrevivência, agenda e clima não possuem implementação aprovada.

Fonte: `SYSTEM-DAY-CYCLE.md`.

### Etapa 3 — Navegação hierárquica

**Implementada e integrada.** O módulo `modules/navigation` carrega o mapa JSON aninhado e controla localização, descoberta, bloqueios e movimento entre pai, filhos diretos e irmãos. O Sistema 7 persiste o estado, aplica custo e expõe destinos na superfície mobile. A UI possui uma primeira representação visual dos arredores adjacentes, sem mapa global.

Fonte: `SYSTEM-NAVIGATION.md`.

### Etapa 4 — Exploração e descobertas

**Implementada e integrada.** O módulo `modules/exploration` aumenta o percentual de conhecimento de cada local, revela conteúdo dirigido por dados e deriva a conclusão da zona. O Sistema 7 persiste o estado, aplica custo, oferece a ação na interface e conecta uma descoberta ao primeiro encontro.

Fonte: `SYSTEM-EXPLORATION.md`.

### Etapa 5 — Recursos e ecologia

**Implementada e integrada.** O módulo `modules/resources` modela pontos de coleta com capacidade limitada, coleta atômica, renovação curta ou longa e populações que podem ser pressionadas ou extintas localmente. O Sistema 7 persiste, aplica custo e expõe coleta na interface.

Fonte: `SYSTEM-RESOURCES.md`.

### Etapa 6 — Crafting e cozinha

**Implementada e integrada.** O módulo `modules/crafting` declara receitas, consome materiais atomicamente, constrói estruturas no local atual e cozinha quando há estação ativa. O Sistema 7 persiste, aplica custo e expõe receitas na interface.

Fonte: `SYSTEM-CRAFTING.md`.

### Etapa 7 — Integração explorável

Fonte: `SYSTEM-INTEGRATION.md`.

#### Fatia 7.1 — Estado integrado e persistência principal

**Implementada.** `GameState` passou a incluir `sandbox`; esta fatia introduziu `schemaVersion: 2` e migração de partidas v1. A Fatia 7.3 evoluiu o formato para schema 3. A Fatia 8.4 evoluiu o formato atual para schema 4.

#### Fatia 7.2 — Orquestrador de ações e tempo

**Implementada.** `executeSandboxAction` aplica o custo uma vez, recupera populações, sincroniza renovação e reavalia descobertas e receitas sem alterar a interface.

#### Fatia 7.3 — Da introdução à exploração livre

**Implementada.** Depois da capacidade inicial o jogador permanece `playing` sem sessão narrativa, na Clareira do Despertar.

#### Fatia 7.4 — Superfície mobile

**Implementada.** Destinos, explorar, coletar e fabricar estão na interface mobile.

#### Fatia 7.5 — Gatilho de mundo e primeiro encontro

**Implementada.** O jogador desperta, escolhe uma capacidade, explora a Clareira e encontra a criatura e Mira por consequência da descoberta `first-priority-event`. Depois da noite, retorna ao sandbox. O marco mínimo do Sistema 7 foi atingido.

### Etapa 8 — Presenças e interações no mundo

**Aprovada, especificada, implementada e consolidada.** As Fatias 8.1 a 8.6 estão encerradas. Fonte: [Sistema 8 — Presenças e interações](SYSTEM-PRESENCES.md) e [Consolidação dos Sistemas 1 a 8](SYSTEMS-1-8-CONSOLIDATION.md).

#### Fatia 8.1 — Catálogo e estado isolado

**Implementada.** `modules/presences` valida entidades e presenças, mantém estado mínimo serializável e deriva status. Não altera `GameState`, schema, persistência, UI, tempo ou narrativa.

#### Fatia 8.2 — Sincronização com descobertas

**Implementada.** Descobertas reveladas em `ExplorationState` passam a presenças descobertas de forma explícita e idempotente. A consulta por local deriva `available`, `unavailable` e `resolved` sem expor ocultas.

#### Fatia 8.3 — Interações

**Implementada.** Observar, investigar, aproximar, conversar e evitar são dados de catálogo. `planPresenceInteraction` valida presença, condições e custo e devolve um plano com efeitos e possível pedido narrativo, sem aplicar tempo, resolver presença ou abrir sessão.

#### Fatia 8.4 — Estado integrado e orquestração

**Implementada.** `sandbox.presences` entra no save com schema 4. Saves v1, v2 e v3 são migrados na leitura. `presence.interact` executa o plano da Fatia 8.3 com custo único e atomicidade.

#### Fatia 8.5 — Interface mobile

**Implementada.** O painel Mundo mostra presenças conhecidas do local, estados compreensíveis e ações contextuais. Regras continuam no view-model e no motor; o React só apresenta e dispara `presence.interact`.

#### Fatia 8.6 — Conteúdo protótipo

**Implementada.** Explorar a Clareira revela Mira sem abrir conversa. Conversar abre `first-priority` e devolve ao mesmo local. Na Mata Densa, o coelho chifrudo pode ser observado ou evitado sem combate. O gatilho automático da 7.5 na campanha `first-day` foi desligado; o mecanismo genérico permanece. Saves com `world.trigger.first-priority.consumed` reconciliam Mira como resolvida.

## Depois do Sistema 8

### Etapa 9 — Necessidades e sobrevivência leve

**Implementada e consolidada.** As Fatias 9.1 a 9.5 estão consolidadas. O conteúdo atual sustenta uma rota automatizada de oito dias sem combate. Fonte: [Sistema 9 — Necessidades e sobrevivência leve](SYSTEM-NEEDS.md).

#### Fatia 9.1 — Modelo puro e prova matemática

**Implementada, revisada e consolidada.** Módulo isolado de necessidades, desgaste, consumíveis, repouso, faixas derivadas e simulação determinística, sem alterar `GameState`.

#### Fatia 9.2 — Estado principal e migração

**Implementada, revisada e consolidada.** `sede` integra os atributos, novas partidas começam em 25 e o schema 5 migra saves v1 a v4 sem executar gameplay ou regravar durante a leitura.

#### Fatia 9.3 — Ações e passagem do tempo

**Implementada, revisada e consolidada.** O orquestrador aplica desgaste por período cobrado e oferece consumo e repouso atômicos, ainda sem controles visuais. A entrega passou por 8 testes próprios e pela suíte completa de 487 testes, além de lint, tipos, build/PWA e revisão sem achados acionáveis.

#### Fatias 9.4 e 9.5

**Fatias 9.4 e 9.5 implementadas, revisadas e consolidadas.** A prova usa somente sistemas e conteúdo atuais, atravessa oito dias após a preparação, mantém a população local e não exige combate nem ajuste de balanceamento.

## Depois do Sistema 9

### Etapa 10 — Objetivos, jornadas e registro de descobertas

**Implementada e consolidada nas Fatias 10.1 a 10.5.** O sistema conecta ações e conhecimento já existentes em jornadas persistentes e em um diário derivado, sem retirar a liberdade do sandbox. Fonte: [Sistema 10 — Objetivos, jornadas e registro de descobertas](SYSTEM-OBJECTIVES.md).

#### Fatia 10.1 — Modelo puro

**Implementada, revisada e consolidada.** Catálogo, estado isolado, validação, ativação e conclusão manual de etapas, sem `GameState`, save ou UI. A entrega passou por 40 testes próprios e pela suíte completa de 533 testes.

#### Fatia 10.2 — Integração e persistência

**Implementada, revisada e consolidada.** Os nove critérios originais observam fontes canônicas do `GameState`; a sincronização é explícita e idempotente; `ObjectivesState` integra o schema 6; saves v1 a v5 migram sem gameplay nem escrita durante a leitura. O catálogo inicial permaneceu vazio nesta fatia.

#### Fatia 10.3 — Atualização e diário derivado

**Implementada, revisada e consolidada.** Ações do sandbox sincronizam objetivos depois de todos os seus efeitos e o diário deriva somente jornadas, etapas e fatos conhecidos, sem persistir dados redundantes ou criar UI.

#### Fatia 10.4 — Interface mobile

**Implementada, revisada e consolidada.** A aba Diário apresenta o conhecimento derivado, permite acompanhar uma jornada durante a sessão e mostra feedback não modal, sem conteúdo novo nem mudança de schema. Foi validada de 320 px a desktop sem overflow horizontal.

#### Fatia 10.5 — Primeira jornada ponta a ponta

**Implementada, revisada e consolidada.** A jornada principal `Primeiros passos` usa dez critérios aprovados no total e conecta capacidade, exploração, nascente, fogueira, refeição e Mira. O fluxo foi provado de ponta a ponta, inclusive para saves schema 6 anteriores ao conteúdo.

## Depois do Sistema 10

### Etapa 11 — Núcleo do Sistema, Eteris, Númen e Progressão

**Implementada e consolidada nas Fatias 11.1 a 11.7.** O Sistema 11 transforma o Sistema canônico em interface diegética e estabelece fundamentos para crescimento do personagem: Eteris ambiental, Númen individualizado, Status, nível, proficiências, treino com custo temporal, Árvore de habilidades e pontos de extensão para o Jardim.

A etapa deve preparar um futuro banco de ações e combate sem implementá-los nem inventar atributos, fórmulas ou regras de fusão. Fonte: [Sistema 11 — Núcleo do Sistema, Eteris, Númen e Progressão](SYSTEM-ETERIS-NUMEN-PROGRESSION.md).

#### Fatia 11.1 — Vocabulário, catálogos e validação isolada

**Implementada.** Os módulos `modules/energetics`, `modules/skills` e `modules/training` declaram os contratos mínimos e catálogos protótipo com validação profunda e isolada: energias (Eteris, Númen) e campos de aplicação (Corpo, Poder); caminhos e habilidades que referenciam um campo válido; e métodos de treino que resolvem um alvo de caminho ou habilidade e declaram um custo em períodos. Índices imutáveis, congelamento profundo, cópias defensivas e falha controlada protegem cada fronteira. Não altera `GameState`, schema, relógio, campanha nem UI. As decisões fechadas estão registradas em [Sistema 11](SYSTEM-ETERIS-NUMEN-PROGRESSION.md#decisões-fechadas-na-fatia-111).

#### Fatia 11.2 — Estado de progressão e migração

**Implementada.** `GameState.system` guarda nível e proficiências por habilidade sob `schemaVersion: 7`; a migração v1–v6 concede apenas a aptidão de base sem treinar, avançar tempo ou regravar durante a leitura.

#### Fatia 11.3 — Treinamento e tempo

**Implementada.** `planTraining` e a ação `training.train` executam o treino atomicamente, cobrando `TimeCost` uma única vez e reutilizando o ciclo consolidado de necessidades, ciclo diário, recursos e objetivos.

#### Fatia 11.4 — Árvore de habilidades

**Implementada.** `deriveSkillTree` deriva caminhos, requisitos, nós disponíveis e contagem de ocultos sem revelar conteúdo bloqueado; a consulta é pura e não consome tempo.

#### Fatia 11.5 — Status e interface diegética mobile

**Implementada.** O módulo `system-interface` e a aba mobile `Sistema` apresentam Status, energia, habilidades, proficiências, caminhos e treinos conhecidos a partir de 320 px, com confirmação que explica o custo, sem regras dentro do React.

#### Fatia 11.6 — Primeiro ciclo de fortalecimento ponta a ponta

**Implementada.** Consultar o Sistema, treinar, avançar o tempo, evoluir a proficiência, revelar uma habilidade oculta e persistir o progresso foi provado por teste automatizado e por validação visual.

#### Fatia 11.7 — Consolidação e ponte para combate

**Implementada.** Consolidação de atomicidade, imutabilidade, sigilo e gates; os contratos públicos reutilizáveis por um futuro banco de ações estão expostos sem revelar internos.

O Jardim só recebe implementação quando suas regras mínimas de fusão forem aprovadas.

### Etapa 12 — Banco de ações e combate

**Implementada e consolidada nas Fatias 12.1 a 12.7.** O combate usa ações declarativas com velocidade, alvo e efeitos (`damage`, `heal`, `guard`), resolvidas por turno de forma determinística. Pessoas e criaturas compartilham o contrato de combatente; inimigo não é sinônimo de monstro. Habilidades conhecidas do Sistema 11 liberam ações extras. O desfecho (vitória, derrota, fuga) gera consequências no `GameState` sem alterar o schema. Fonte: [Sistema 12 — Banco de ações e combate](SYSTEM-ACTION-COMBAT.md).

- **12.1** — catálogos de ações, combatentes e encontros validados e isolados.
- **12.2** — estado de combate e resolução de turno determinística (motor puro).
- **12.3** — IA de oponente determinística baseada em regras.
- **12.4** — integração com o mundo: encontros por local e consequências declarativas.
- **12.5** — interface mobile de combate a partir de 320 px.
- **12.6** — encontro jogável ponta a ponta com retorno ao sandbox.
- **12.7** — consolidação: determinismo, imutabilidade e gates.

Balanceamento definitivo, posicionamento, condições de status ricas, grupos e múltiplos oponentes permanecem fora do escopo.

## Horizonte depois do Sistema 12

### Outras direções definidas pelo autor

- interagir com elementos do cenário além de coleta, crafting e presenças;
- ampliar exploração, passagens, áreas bônus, recursos, crafting e cozinha;
- permitir trama principal, conteúdo opcional e alguma forma futura de conclusão de áreas ou rotas;
- desenvolver assentamentos, facções e modelos de sociedade como partes do universo narrativo.

### Em discussão

- Jardim de habilidades: fusão, preservação, reversibilidade, limites e resultados;
- minijogos de treino, interação ou experimentação;
- fórmulas de nível, proficiência, Eteris, Númen e velocidade de conjuração;
- protagonista não humano, raças não humanas concretas e extensão do Sistema a todos os seres;
- comportamento de oponentes e consequências do combate;
- expansão do mapa visual para visão regional ou global;
- notificações mais amplas do Sistema além do feedback de jornadas;
- progressão extensa de NPCs;
- formato de rotas e de conclusão global.

### Ainda não discutido / sem certeza de implementação

- estado persistente próprio, agenda e deslocamento autônomo de NPCs;
- comportamento autônomo de criaturas fora do combate;
- ferramentas, equipamentos, durabilidade e combustível;
- grupo ou companheiros;
- clima, economia, comércio ou viagem rápida;
- administração jogável de assentamentos ou facções;
- geração procedural, backend, sincronização, monetização e editor.

Nenhum item do horizonte autoriza implementação por si só.

## Regra de entrada de um sistema

Antes de implementar, definir:

1. problema de diversão ou imersão resolvido;
2. estado lido e alterado;
3. contratos públicos;
4. apresentação mobile;
5. relação com tempo, navegação e narrativa;
6. menor sequência jogável;
7. testes e critérios de aceite;
8. itens explicitamente fora da etapa.
