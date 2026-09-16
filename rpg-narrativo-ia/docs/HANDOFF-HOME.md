# Continuação do projeto em outro computador

Este documento serve como contexto para abrir um novo chat de desenvolvimento depois de clonar ou atualizar o repositório em outra máquina.

## Estado no momento da passagem

- Repositório: `https://github.com/FelpHendeson/FelpZone.git`
- Branch: `main`
- Sistemas 1 a 6 estão implementados, testados e consolidados:
  - horário e data;
  - ciclo diário;
  - navegação hierárquica;
  - exploração e descobertas;
  - pontos de recurso e ecologia;
  - crafting, estruturas locais e cozinha.
- A Fatia 7.1 — estado integrado e persistência principal — está implementada: `GameState.sandbox` e migração de saves antigos.
- A Fatia 7.2 — orquestrador de ações e tempo — está implementada: `executeSandboxAction` aplica movimento, exploração, coleta e crafting sobre o `GameState`, com custo único, recuperação, renovação e reavaliações gratuitas. Não persiste.
- A Fatia 7.3 — da introdução à exploração livre — está implementada: `narrativeSession` opcional e retorno à exploração depois da capacidade inicial.
- A Fatia 7.4 — superfície mobile — está implementada: destinos, explorar, coletar e fabricar na tela de exploração, via `executeSandboxAction` e o mesmo `SandboxContext` da persistência.
- A Fatia 7.5 — gatilho de mundo e primeiro encontro — está implementada: o mecanismo genérico associa descobertas a sessões. A Fatia 8.6 desligou a ligação automática da Clareira; explorar revela Mira e a conversa abre `first-priority`.
- O marco mínimo do Sistema 7 foi atingido.
- A Fatia 8.1 — catálogo e estado isolado de presenças — está implementada em `modules/presences`.
- A Fatia 8.2 — sincronização com descobertas — está implementada: operação pura e consulta de presenças conhecidas.
- A Fatia 8.3 — interações dirigidas por dados — está implementada: catálogo, consulta e planejamento puro.
- A Fatia 8.4 — estado integrado, save e orquestração — está implementada: `sandbox.presences`, `schemaVersion: 4`, migração v1/v2/v3 e `presence.interact` atômico.
- A Fatia 8.5 — interface mobile de presenças — está implementada: o painel Mundo mostra presenças conhecidas do local e dispara `presence.interact`.
- A Fatia 8.6 — conteúdo jogável — está implementada e consolidada: Mira (observar/conversar) e o coelho chifrudo (observar/evitar). Saves com `world.trigger.first-priority.consumed` reconciliam Mira como resolvida.
- Os Sistemas 1 a 8 passaram pela revisão integrada registrada em `docs/SYSTEMS-1-8-CONSOLIDATION.md`.
- O Sistema 9 — necessidades e sobrevivência leve — está implementado e consolidado nas Fatias 9.1 a 9.5. `Attributes` inclui `sede`, o Sistema 9 introduziu o schema 5, o orquestrador aplica desgaste, consumo e repouso, a interface mobile expõe essas ações e a prova automatizada atravessa oito dias com o conteúdo atual.
- O Sistema 10 — objetivos, jornadas e registro de descobertas — está implementado e consolidado nas Fatias 10.1 a 10.5, incluindo a jornada `Primeiros passos`, sincronização narrativa, compatibilidade de saves schema 6 e acompanhamento efêmero.
- O Sistema 11 — Núcleo do Sistema, Eteris, Númen e Progressão — está implementado e consolidado nas Fatias 11.1 a 11.7 (progressão persistida no schema 7, treino com custo temporal, Árvore de habilidades e aba mobile `Sistema`). O contrato está em `docs/SYSTEM-ETERIS-NUMEN-PROGRESSION.md`.
- O Sistema 12 — Banco de ações e combate — está implementado e consolidado nas Fatias 12.1 a 12.7 (motor de turno determinístico, IA de oponente por regras, encontro jogável no mundo e desfecho aplicado ao `GameState`). O contrato está em `docs/SYSTEM-ACTION-COMBAT.md`. Balanceamento definitivo, posicionamento, grupos e simulação autônoma irrestrita permanecem fora do escopo.
- As Fatias 12.8 a 12.12 estão implementadas e consolidadas em `docs/SYSTEM-12-CONSOLIDATION.md`: descoberta da ameaça, saúde persistente, custo temporal único, consequência atômica e consolidação visual.
- O Sistema 13 — Progressão por prática e recompensas do Sistema — está implementado e consolidado nas Fatias 13.1 a 13.7 (módulo `mastery`, prática por vitória, marcos de nível e requisitos de treino). Fonte: `docs/SYSTEM-PRACTICE-PROGRESSION.md`.
- Os Sistemas 14 a 17 estão implementados e consolidados: itens/equipamentos/preparação; condições/elementos/combate; Jardim de habilidades; NPCs persistentes/agenda/mundo vivo. O save atual é o schema 11.
- `docs/PROJECT-STATUS.md` é a fonte principal para separar decisões do autor, protótipos, temas em discussão e hipóteses dos agentes.

## Como preparar a máquina

```bash
git clone https://github.com/FelpHendeson/FelpZone.git
cd FelpZone/rpg-narrativo-ia
npm install
npm test
npm run lint
npm run typecheck
npm run build
```

Se o repositório já existir:

```bash
git pull --ff-only
cd FelpZone/rpg-narrativo-ia
npm install
```

## Prompt para o novo chat

Copie o texto abaixo para o novo chat aberto na pasta `rpg-narrativo-ia`:

```text
Estamos continuando o projeto Reset — RPG Narrativo Modular, disponível em:

https://github.com/FelpHendeson/FelpZone.git

Trabalhe dentro da pasta rpg-narrativo-ia deste clone local.

O projeto é um RPG narrativo sandbox mobile-first feito com React, TypeScript e Vite. A IA participa apenas da criação e manutenção do projeto; o jogo não chama APIs de IA, não possui backend, login ou custo operacional inicial.

Premissa resumida:

A existência passou por um Reset. Os planetas cresceram, a geografia foi refeita, os vestígios materiais da civilização desapareceram e os humanos foram espalhados pelo mundo com poderes e acesso a um Sistema. O jogador é um jovem que acabou de atingir a maioridade, desperta sozinho e precisa explorar, sobreviver e construir sua trajetória nesse novo mundo.

Direção de produto:

- depois da introdução narrativa, o jogador deve ficar livre em um mundo navegável;
- narrativa e escolhas aparecem por encontros, descobertas, interações e gatilhos;
- os sistemas são construídos e consolidados separadamente antes da integração;
- a experiência prioriza celular;
- imagens finais ainda são placeholders;
- não expandir o escopo sem autorização explícita.

Antes de agir, leia integralmente:

- AGENTS.md
- README.md
- todos os arquivos em docs/, começando por PROJECT-STATUS.md, SYSTEM-ETERIS-NUMEN-PROGRESSION.md, PRODUCT.md, ARCHITECTURE.md, ROADMAP.md, SYSTEM-OBJECTIVES.md e SYSTEM-PRESENCES.md;
- os módulos e testes relacionados à tarefa atual.

Estado conhecido:

- Sistemas 1 a 6 estão consolidados;
- a Fatia 7.1 persistiu o sandbox no GameState;
- a Fatia 7.2 orquestra movimento, exploração, coleta e crafting com aplicação única do tempo;
- a Fatia 7.3 devolve o jogador à exploração depois da capacidade inicial, com sessão narrativa opcional;
- a Fatia 7.4 expõe destinos, explorar, coletar e fabricar na superfície mobile;
- a Fatia 7.5 oferece o mecanismo de gatilho de mundo; a campanha `first-day` não dispara mais `first-priority` ao explorar a Clareira;
- o marco mínimo do Sistema 7 foi atingido;
- a Fatia 8.1 isolou o catálogo e o estado de presenças em `modules/presences`;
- a Fatia 8.2 sincroniza descobertas reveladas com presenças conhecidas;
- a Fatia 8.3 planeja interações dirigidas por dados;
- a Fatia 8.4 persiste `sandbox.presences` no schema 4 e executa `presence.interact` no orquestrador;
- a Fatia 8.5 mostra presenças conhecidas no painel Mundo e dispara `presence.interact`;
- a Fatia 8.6 valida Mira e o coelho chifrudo ponta a ponta e reconcilia saves que já consumiram o gatilho da Clareira;
- presença e interação com NPCs e criaturas são metas definidas pelo autor;
- o estado mínimo de ocorrências descobertas e resolvidas foi aprovado no Sistema 8;
- `NPCState` mínimo e agendas determinísticas estão especificados para o Sistema 17; comportamento autônomo irrestrito continua fora do escopo;
- os Sistemas 1 a 10 estão consolidados;
- os Sistemas 11 e 12 estão implementados e consolidados;
- o Sistema 13 está implementado e consolidado nas Fatias 13.1 a 13.7;
- o Sistema é uma interface diegética; Eteris é energia ambiental e Númen é Eteris interiorizado e individualizado;
- Status, nível, proficiências, treino temporal e Árvore fazem parte do eixo; os próximos contratos estão em `SYSTEM-ITEMS-EQUIPMENT-PREPARATION.md`, `SYSTEM-CONDITIONS-ELEMENTS-COMBAT.md`, `SYSTEM-SKILL-GARDEN.md` e `SYSTEM-PERSISTENT-NPCS-LIVING-WORLD.md`.

Sua primeira tarefa é confirmar que a branch está atualizada e ler `docs/PROJECT-STATUS.md`, `docs/ROADMAP.md` e as especificações dos Sistemas 14 a 17. Os Sistemas 1 a 17 estão implementados e consolidados. Novos eixos precisam de especificação e autorização explícitas.

Execute:

npm test
npm run lint
npm run typecheck
npm run build

Se precisar confirmar a base antes da discussão, revise especialmente:

- explorar a Clareira revela Mira sem abrir `GameScreen`;
- conversar abre `first-priority` uma vez e devolve ao mesmo local;
- presença resolvida não repete o encontro;
- o coelho aparece só após `horned-rabbit-tracks` e permanece no sandbox;
- saves com `world.trigger.first-priority.consumed` não duplicam o encontro;
- overflow horizontal, alvos de 48 px e retorno da narrativa.

Não invente atributos, fórmulas, raças, fusões, minijogos ou regras de combate além do contrato aprovado. Preserve a classificação de `PROJECT-STATUS.md`: direções definidas, ideias em discussão e hipóteses sem certeza não são requisitos equivalentes.

Preserve o ciclo de trabalho:

especificar → implementar → testar → revisar → corrigir → consolidar → próxima etapa

Não faça push sem minha autorização. Preserve alterações existentes e mantenha a conversa em português do Brasil.
```

## Próxima decisão

Os Sistemas 1 a 17 estão completos dentro do recorte aprovado. O save atual é o schema 11. Novos eixos precisam de especificação e autorização explícitas. Balanceamento definitivo, posicionamento, grupos e comportamento autônomo irrestrito permanecem fora do escopo.
