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

**Implementada como marco histórico do loop integrado.** A Fatia 7.5 provou gatilhos de mundo e retorno ao sandbox. Na revisão atual do Dia 1, `first-priority-event` não revela mais Mira nem força a noite: sinais humanos e o encontro opcional foram desacoplados nas Fatias E/F.

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

**Implementada e revisada.** O mecanismo de presenças permanece o mesmo, mas o conteúdo atual revela Mira somente por `mira-nearby`, depois de sinais humanos. O jogador pode observar, conversar por `survivor-meet` ou evitar contato. Na Mata Densa, o coelho chifrudo continua podendo ser observado ou evitado sem combate. `first-priority` permanece apenas como mecanismo/conteúdo legado compatível, não como porta obrigatória para Mira.

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

**Implementada, revisada e consolidada.** O ID persistente `first-steps` agora representa a jornada **Primeiro dia** e conecta aptidão inicial, primeira prática real de Númen, reconhecimento da clareira, fonte de água e sinais humanos. Fogueira/refeição ficam em `camp-comfort` e a decisão sobre Mira em `other-survivor`, sem bloquear a jornada principal.

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

### Consolidação do Sistema 12 (Fatias 12.8–12.12)

**Implementada e consolidada.** Fonte: [Consolidação do Sistema 12](SYSTEM-12-CONSOLIDATION.md).

- **12.8** — descoberta e disponibilidade declarativa de ameaças.
- **12.9** — ponte entre saúde do mundo, vitalidade e resolução terminal.
- **12.10** — tempo, necessidades e consequências em uma transação atômica.
- **12.11** — consolidação visual do encontro e da tela de combate.
- **12.12** — prova ponta a ponta, revisão e gates finais.

Balanceamento definitivo, posicionamento, condições de status ricas, grupos e múltiplos oponentes permanecem fora do escopo.

### Etapa 13 — Progressão por prática e recompensas do Sistema

**Implementada e consolidada nas Fatias 13.1 a 13.7.** O Sistema 13 conecta treino, vitórias verificadas, proficiências, marcos de nível e revelação de métodos sem introduzir experiência genérica, equipamentos ou Jardim. Fonte: [Sistema 13 — Progressão por prática e recompensas do Sistema](SYSTEM-PRACTICE-PROGRESSION.md).

- **13.1** — vocabulário, catálogo e validação isolada de prática e marcos;
- **13.2** — motor puro e idempotente de evidências, incrementos e marcos;
- **13.3** — prática de habilidades integrada à vitória de combate na transação terminal;
- **13.4** — nível por marco e requisitos declarativos de treinamento;
- **13.5** — interface diegética e feedback mobile;
- **13.6** — ciclo ponta a ponta até nova habilidade e nova ação de combate;
- **13.7** — consolidação, segurança, compatibilidade e gates.

O ciclo protótipo usa `Sentidos Aguçados` em proficiência 3 para alcançar nível 2, revelar a `Rotina de Reforço do Corpo`, aprender `Corpo Firme` e liberar `Estancar Ferida`. Os valores são provisórios e substituíveis por conteúdo.

## Sequência aprovada depois do Sistema 13

Os Sistemas 14 a 17 foram ordenados e especificados pelo autor em 15 de setembro de 2026. A existência das especificações autoriza planejamento, mas cada implementação deve respeitar a dependência da etapa anterior e seus próprios gates.

### Etapa 14 — Itens, equipamentos e preparação

**Implementada e consolidada.** Materiais e objetos sustentam loadout, espaços de preparação, consumíveis em combate, benefícios declarativos e recompensas materiais determinísticas. O save evolui para schema 8. Fonte: [Sistema 14](SYSTEM-ITEMS-EQUIPMENT-PREPARATION.md).

- **14.1** — catálogos e contratos puros;
- **14.2** — estado de equipamento e preparação;
- **14.3** — crafting e recompensas determinísticas;
- **14.4** — persistência e migração;
- **14.5** — integração com combate;
- **14.6** — interface mobile e conteúdo protótipo;
- **14.7** — ciclo ponta a ponta e consolidação.

### Etapa 15 — Condições, elementos e aprofundamento do combate

**Implementada e consolidada.** Condições temporárias, afinidades elementais e respostas de preparação ampliam decisões sem abandonar determinismo. Consequências persistentes mínimas usam o schema 9. Fonte: [Sistema 15](SYSTEM-CONDITIONS-ELEMENTS-COMBAT.md).

- **15.1** — catálogos de elementos e condições;
- **15.2** — motor puro de condições;
- **15.3** — matriz elemental determinística;
- **15.4** — integração com ações, IA e replay;
- **15.5** — persistência de consequências;
- **15.6** — itens, habilidades e interface mobile;
- **15.7** — ciclo ponta a ponta e consolidação.

### Etapa 16 — Jardim de habilidades

**Implementada e consolidada.** Receitas curadas e não destrutivas integram habilidades conhecidas em técnicas híbridas, usando pontos de cultivo concedidos por marcos explícitos. O save evolui para schema 10. Fonte: [Sistema 16](SYSTEM-SKILL-GARDEN.md).

- **16.1** — catálogo e estado isolado;
- **16.2** — derivação segura e planejamento;
- **16.3** — pontos e integração com marcos;
- **16.4** — persistência e ação atômica;
- **16.5** — habilidade híbrida e combate;
- **16.6** — interface diegética mobile;
- **16.7** — ciclo ponta a ponta e consolidação.

### Etapa 17 — NPCs persistentes, agenda e mundo vivo

**Implementada e consolidada.** NPCs ganham estado mínimo, agenda por período, memória de fatos fechados e presenças derivadas. A atualização ocorre somente pelo relógio canônico; o save evolui para schema 11. Fonte: [Sistema 17](SYSTEM-PERSISTENT-NPCS-LIVING-WORLD.md).

- **17.1** — catálogo e estado isolado;
- **17.2** — derivação temporal determinística;
- **17.3** — memória e integração com relações;
- **17.4** — presenças derivadas e orquestração;
- **17.5** — persistência e migração;
- **17.6** — Mira e interface mobile;
- **17.7** — ciclo ponta a ponta e consolidação.

## Programa especificado depois do Sistema 17

O pack de mundo `content/first-day/` está implementado: o motor valida JSON na borda e uma fonte remota futura reusa o mesmo `composeWorld`. O Sistema 29 levou o save ao schema 23; a Fatia A da revisão narrativa do Dia 1 levou-o ao schema 24 com `character.sex`; a Fatia B levou-o ao schema 25 com orientação e ajuda persistidas. As Fatias C–G ampliaram comportamento, conteúdo e cobertura sem novo schema: marcos por proficiência/dia/tempo, introdução Etéris/Númen, sandbox com sinais humanos e Mira opcional, primeira noite adaptativa, transição canônica ao Dia 2 e playtest integrado das duas rotas obrigatórias. Fonte: [Motor e pack de mundo](CONTENT-PACK.md). CMS e banco reais continuam fora do escopo.

Em 17 de setembro de 2026, o autor definiu o projeto como um **motor de mundos jogáveis**: sistemas reutilizáveis formam os blocos; packs configuram as leis e o conteúdo; campanhas contam histórias por cima deles. A arquitetura e os critérios permanentes estão em [Visão do motor de mundo](WORLD-ENGINE-VISION.md).

As etapas abaixo foram **especificadas e implementadas** nas Fatias 18.1 a 29.7. A ordem original reduziu retrabalho entre dependências. Cada sistema continua exigindo revisão e gates próprios antes de uma expansão.

### Etapa 18 — Cenário interativo e pontos de interesse

**Implementada e consolidada nas Fatias 18.1 a 18.7.** Objetos descobertos em locais ganham estado e ações declarativas, sem se confundir com recursos, estruturas ou presenças. O save evolui para schema 12. Fonte: [Sistema 18](SYSTEM-18-INTERACTABLE-WORLD.md).

### Etapa 19 — Relacionamentos e vínculos persistentes

**Implementada e consolidada nas Fatias 19.1 a 19.7.** Relações direcionais, dimensões e vínculos explícitos sustentam amizade, rivalidade, mentoria e romance com agência dos NPCs. O save evolui para schema 13. Fonte: [Sistema 19](SYSTEM-19-RELATIONSHIPS.md).

### Etapa 20 — Registro do Sistema, patentes e rankings

**Implementada e consolidada nas Fatias 20.1 a 20.7.** Políticas configuráveis de acesso ao Sistema, registro diegético e separação entre nível, patente, ranking, título e cargo social. O `first-day` mantém acesso universal para humanos. O save evolui para schema 14. Fonte: [Sistema 20](SYSTEM-20-SYSTEM-REGISTRY-RANKINGS.md).

### Etapa 21 — Grupos e organizações

**Implementada e consolidada nas Fatias 21.1 a 21.7.** Filiação, cargos e permissões formam a base comum de parties, guildas, clãs e facções. O save evolui para schema 15. Fonte: [Sistema 21](SYSTEM-21-GROUPS-ORGANIZATIONS.md).

### Etapa 22 — Númen avançado, habilidades e execução

**Implementada e consolidada nas Fatias 22.1 a 22.7.** Reservas, custos, fases de preparação/execução/recuperação, velocidade, recarga e interrupção aprofundam o banco de ações. O save evolui para schema 16. Fonte: [Sistema 22](SYSTEM-22-ADVANCED-NUMEN-SKILLS.md).

### Etapa 23 — Party, companheiros e combate coletivo

**Implementada e consolidada nas Fatias 23.1 a 23.7.** Equipes, alvos múltiplos, papéis, táticas e agência de companheiros ampliam o combate determinístico. O save evolui para schema 17. Fonte: [Sistema 23](SYSTEM-23-PARTY-COMPANIONS-GROUP-COMBAT.md).

### Etapa 24 — Calendário de longo prazo e ciclo de vida

**Implementada e consolidada nas Fatias 24.1 a 24.7.** Meses, ciclos, anos, idade e estágios de vida criam a base temporal para família, profissão e projetos longos. O save evolui para schema 18. Fonte: [Sistema 24](SYSTEM-24-LONG-TERM-CALENDAR-LIFE-CYCLE.md).

### Etapa 25 — Família, lar e linhagem

**Implementada e consolidada nas Fatias 25.1 a 25.7.** Parceria, parentesco, responsáveis, dependentes, residência e crescimento por estágios sustentam trajetórias de vida. O save evolui para schema 19. Fonte: [Sistema 25](SYSTEM-25-FAMILY-HOUSEHOLD-LINEAGE.md).

### Etapa 26 — Profissões, cidadania e posição social

**Implementada e consolidada nas Fatias 26.1 a 26.7.** Profissão, cidadania, ofício, título e reputação tornam possíveis trajetórias de artesão, comerciante, cidadão, autoridade ou nobre. O save evolui para schema 20. Fonte: [Sistema 26](SYSTEM-26-PROFESSIONS-CITIZENSHIP-STATUS.md).

### Etapa 27 — Economia, comércio e propriedade

**Implementada e consolidada nas Fatias 27.1 a 27.7.** Moedas, estoques, preços declarativos, transações atômicas e direitos de propriedade formam a base econômica. O save evolui para schema 21. Fonte: [Sistema 27](SYSTEM-27-ECONOMY-COMMERCE-PROPERTY.md).

### Etapa 28 — Bases, territórios e assentamentos

**Implementada e consolidada nas Fatias 28.1 a 28.7.** Reivindicações, projetos, estruturas, moradores, funções e produção limitada permitem construir e administrar. O save evolui para schema 22. Fonte: [Sistema 28](SYSTEM-28-BASES-TERRITORIES-SETTLEMENTS.md).

### Etapa 29 — Facções, diplomacia e poder político

**Implementada e consolidada nas Fatias 29.1 a 29.7.** Relações institucionais, representação, acordos, leis e influência conectam organizações e territórios. O save evolui para schema 23. Fonte: [Sistema 29](SYSTEM-29-FACTIONS-DIPLOMACY-POLITICS.md).

### Ideias que continuam em discussão

- minijogos de treino, interação ou experimentação;
- fórmulas e números definitivos de nível, proficiência, Eteris, Númen e velocidade;
- protagonista não humano e raças não humanas concretas;
- expansão do mapa visual para visão regional ou global;
- formato de rotas, finais e conclusão global;
- comportamento autônomo de criaturas fora de eventos e agendas;
- clima, viagem rápida, guerra em massa e morte permanente.

Geração procedural, backend, sincronização, monetização e editor continuam sem autorização. Uma spec autoriza planejamento; não transforma sua implementação em concluída nem permite desenvolver várias etapas simultaneamente.

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


### Revisão narrativa do Dia 1 — Fatia G

**Concluída em 22 de setembro de 2026.** O playtest integrado encontrou e corrigiu um gargalo de tempo entre treino, água, sinais humanos, Mira e primeira noite. A Clareira mantém 10% por exploração; sinais e caminho da Nascente entram em 10%, Mira em 20%; a Nascente é um destino local de custo 0. As rotas com contato e evasão chegam ao Dia 2 sem encerrar a partida. Consulte [Dia 1 — Playtest da Fatia G](DAY-1-PLAYTEST.md).

**Próxima etapa narrativa concluída:** Dia 2 especificado. A próxima implementação é a Fatia A do Dia 2.


### Dia 2 — Os outros

**Especificado em 22 de setembro de 2026. Fatias A–D implementadas.**

O segundo dia parte do estado real herdado da primeira noite e muda o foco de sobrevivência individual para convivência. Caio Nascimento e Davi Moura entram como sobreviventes que já possuem relação e decisões próprias; a Margem Rochosa amplia o mapa; a Nascente passa a gerar a primeira tensão social sobre recurso comum. Mira pode estar presente, distante, evitada ou sequer ter sido conhecida.

A implementação está dividida em A–G:

1. **Atividades Contextuais + schema 26 — implementada**;
2. **mundo do Dia 2 — implementada**;
3. **jornada e primeiro contato — implementada**;
4. **Davi + primeira atividade compartilhada — implementada**;
5. água e tensão social;
6. autonomia e encerramento;
7. playtest do Dia 2.

A mecânica transversal está em [Atividades Contextuais](MECHANIC-CONTEXTUAL-ACTIVITIES.md). Ela representa ações situadas com tempo e participantes sem transformar cooperação emergencial em profissão, party ou assentamento.

A Fatia A implementou domínio, schema 26, migração 25→26, pack, `activity.perform`, UI e guidance. A Fatia B acrescentou a Margem Rochosa, pistas condicionadas ao Dia 2 e Caio/Davi com agendas e presenças. A Fatia C acrescentou `day-two-others`, o evento dos rastros e as rotas de contato ou afastamento, com e sem Mira. A Fatia D publicou `escort-davi-to-clearing`, relocação persistente e a cena de chegada. **Próxima etapa: Fatia E — Água e tensão social.**

Consulte [Dia 2 — narrativa](DAY-2-NARRATIVE-SPEC.md) e [Dia 2 — implementação](DAY-2-IMPLEMENTATION-SPEC.md).
