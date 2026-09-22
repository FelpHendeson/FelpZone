# Reset — RPG Narrativo Modular

Protótipo jogável de um RPG narrativo sandbox mobile-first sobre uma humanidade obrigada a recomeçar depois que a própria existência passou por um Reset.

O jogo é uma aplicação web estática, modular e expansível. A IA participa somente da criação do projeto: ajuda a definir o mundo, escrever conteúdo e implementar o código. O jogo publicado não chama APIs de IA, não exige chave e não possui custo operacional inicial.

**Versão publicada:** [felp-rpg.vercel.app](https://felp-rpg.vercel.app/)

## Premissa

Durante o Reset, os planetas aumentaram drasticamente, a geografia foi refeita e todos os vestígios materiais da civilização desapareceram. Os humanos mantiveram suas memórias, mas foram espalhados pelo novo mundo e receberam poderes, capacidades mágicas e acesso individual a um Sistema.

Sem governos ou infraestrutura, a humanidade passa a viver sob a lei do mais forte. Assentamentos, facções e novos modelos de sociedade surgem enquanto cada pessoa tenta sobreviver e compreender o que aconteceu.

O jogador cria o nome e o sobrenome de um jovem que acabara de atingir a maioridade. Ele desperta sozinho, sem parentes ou aliados, e constrói sua identidade por meio das próprias escolhas.

## Documentação para implementação

Leia nesta ordem:

1. [Continuação em outro computador](docs/HANDOFF-HOME.md): estado atual e prompt pronto para contextualizar um novo chat.
2. [Estado, metas e horizonte](docs/PROJECT-STATUS.md): fonte de verdade sobre o que foi definido, implementado, está em discussão ou ainda não foi decidido.
   - [Fundação narrativa](docs/NARRATIVE-FOUNDATION.md): regra geográfica do Reset, primeiro arco dos Sete Dias, elenco inicial, assentamento, ranking, romance e onboarding.
   - [Dia 1 — especificação narrativa e jogável](docs/DAY-1-NARRATIVE-SPEC.md): fluxo completo do despertar à primeira noite, onboarding de Etéris/Númen e lacunas técnicas mínimas.
     - [Implementação do Dia 1](docs/DAY-1-IMPLEMENTATION-SPEC.md): schemas 24–25, conteúdo, fatias e testes.
     - [Playtest do Dia 1](docs/DAY-1-PLAYTEST.md): rotas integradas, achados de pacing e fechamento da Fatia G.
   - [Dia 2 — especificação narrativa e jogável](docs/DAY-2-NARRATIVE-SPEC.md): Caio, Davi, Margem Rochosa, tensão da água, autonomia dos sobreviventes e entrada gradual na convivência.
     - [Implementação do Dia 2](docs/DAY-2-IMPLEMENTATION-SPEC.md): schema 26 proposto, fatias A–G, pack, NPCs, jornada e playtest.
     - [Atividades Contextuais](docs/MECHANIC-CONTEXTUAL-ACTIVITIES.md): ações compartilhadas com tempo, participantes e consequências sem criar Sistema 30.
     - [Orientação e Central de Ajuda](docs/MECHANIC-SYSTEM-GUIDANCE.md): onboarding contextual persistido e dirigido pelo pack.
     - [Marcos narrativos](docs/MECHANIC-NARRATIVE-MILESTONES.md): gatilhos por proficiência e passagem de dias sobre world-events.
3. [Visão do produto](docs/PRODUCT.md): universo, experiência e limites conceituais.
4. [Visão do motor de mundo](docs/WORLD-ENGINE-VISION.md): sistemas como blocos, packs como configuração e campanhas como histórias.
5. [Escopo do MVP](docs/MVP.md): o que deve e não deve ser implementado agora.
6. [Arquitetura](docs/ARCHITECTURE.md): módulos, responsabilidades e fluxo de dados.
7. [Conteúdo e interface](docs/CONTENT-AND-UI.md): formato dos eventos, telas e placeholders.
8. [Consolidação de UI/UX](docs/UI-UX-CONSOLIDATION.md): hierarquia visual, navegação e regras de densidade da interface jogável.
   - [UI/UX 2.0 — Navegação por focos](docs/UI-UX-2-NAVIGATION.md): cinco destinos principais e telas separadas por domínio.
9. [Fase 2 — Consolidação do motor](docs/PHASE-2-ENGINE.md): registro da fase concluída.
10. [Visão sandbox](docs/SANDBOX-FLOW.md): novo loop de exploração e papel do motor narrativo.
11. [Horário e data](docs/SYSTEM-TIME-AND-DATE.md): relógio determinístico por períodos, já implementado.
12. [Ciclo diário](docs/SYSTEM-DAY-CYCLE.md): eventos de período e dia derivados do relógio, já implementado.
13. [Navegação hierárquica](docs/SYSTEM-NAVIGATION.md): mapa aninhado, posição e movimento entre pai, filhos e irmãos, já implementado.
14. [Exploração e descobertas](docs/SYSTEM-EXPLORATION.md): percentual por local e revelação determinística de conteúdo, já implementado.
15. [Recursos e ecologia](docs/SYSTEM-RESOURCES.md): coleta, renovação e risco de esgotamento, já implementado.
16. [Crafting e cozinha](docs/SYSTEM-CRAFTING.md): receitas, estruturas locais e transformação de materiais, já implementado.
17. [Integração explorável](docs/SYSTEM-INTEGRATION.md): estado composto, persistência, superfície mobile e primeiro encontro acionado pelo mundo.
18. [Presenças e interações](docs/SYSTEM-PRESENCES.md): Sistema 8 aprovado e implementado nas Fatias 8.1 a 8.6.
19. [Consolidação dos Sistemas 1 a 8](docs/SYSTEMS-1-8-CONSOLIDATION.md): revisão integrada, gates e ponto seguro de continuidade.
20. [Necessidades e sobrevivência leve](docs/SYSTEM-NEEDS.md): Sistema 9 implementado e consolidado nas Fatias 9.1 a 9.5.
21. [Objetivos, jornadas e registro de descobertas](docs/SYSTEM-OBJECTIVES.md): Sistema 10 implementado e consolidado nas Fatias 10.1 a 10.5.
22. [Núcleo do Sistema, Eteris, Númen e Progressão](docs/SYSTEM-ETERIS-NUMEN-PROGRESSION.md): Sistema 11 implementado e consolidado nas Fatias 11.1 a 11.7.
23. [Banco de ações e combate](docs/SYSTEM-ACTION-COMBAT.md): Sistema 12 implementado e consolidado nas Fatias 12.1 a 12.7.
24. [Consolidação do Sistema 12](docs/SYSTEM-12-CONSOLIDATION.md): Fatias 12.8 a 12.12 implementadas — descoberta, saúde, tempo, consequências atômicas e UI de combate.
25. [Progressão por prática e recompensas do Sistema](docs/SYSTEM-PRACTICE-PROGRESSION.md): Sistema 13 implementado e consolidado nas Fatias 13.1 a 13.7.
26. [Itens, equipamentos e preparação](docs/SYSTEM-ITEMS-EQUIPMENT-PREPARATION.md): Sistema 14 implementado e consolidado nas Fatias 14.1 a 14.7.
27. [Condições, elementos e aprofundamento do combate](docs/SYSTEM-CONDITIONS-ELEMENTS-COMBAT.md): Sistema 15 implementado e consolidado nas Fatias 15.1 a 15.7.
28. [Jardim de habilidades](docs/SYSTEM-SKILL-GARDEN.md): Sistema 16 implementado e consolidado nas Fatias 16.1 a 16.7.
29. [NPCs persistentes, agenda e mundo vivo](docs/SYSTEM-PERSISTENT-NPCS-LIVING-WORLD.md): Sistema 17 implementado e consolidado nas Fatias 17.1 a 17.7.
30. [Motor e pack de mundo](docs/CONTENT-PACK.md): o código conhece leis; o primeiro dia entra como JSON validado.
    - [Imagens opcionais dos packs](docs/VISUAL-ASSETS.md): como adicionar cenas, retratos e ícones sem tornar arte obrigatória.
31. [Cenário interativo e pontos de interesse](docs/SYSTEM-18-INTERACTABLE-WORLD.md): Sistema 18 implementado e consolidado nas Fatias 18.1 a 18.7.
32. [Relacionamentos e vínculos persistentes](docs/SYSTEM-19-RELATIONSHIPS.md): Sistema 19 implementado e consolidado nas Fatias 19.1 a 19.7.
33. [Registro do Sistema, patentes e rankings](docs/SYSTEM-20-SYSTEM-REGISTRY-RANKINGS.md): Sistema 20 implementado e consolidado nas Fatias 20.1 a 20.7.
34. [Grupos e organizações](docs/SYSTEM-21-GROUPS-ORGANIZATIONS.md): Sistema 21 implementado e consolidado nas Fatias 21.1 a 21.7.
35. [Númen avançado, habilidades e execução](docs/SYSTEM-22-ADVANCED-NUMEN-SKILLS.md): Sistema 22 implementado e consolidado nas Fatias 22.1 a 22.7.
36. [Party, companheiros e combate coletivo](docs/SYSTEM-23-PARTY-COMPANIONS-GROUP-COMBAT.md): Sistema 23 implementado e consolidado nas Fatias 23.1 a 23.7.
37. [Calendário de longo prazo e ciclo de vida](docs/SYSTEM-24-LONG-TERM-CALENDAR-LIFE-CYCLE.md): Sistema 24 implementado e consolidado nas Fatias 24.1 a 24.7.
38. [Família, lar e linhagem](docs/SYSTEM-25-FAMILY-HOUSEHOLD-LINEAGE.md): Sistema 25 implementado e consolidado nas Fatias 25.1 a 25.7.
39. [Profissões, cidadania e posição social](docs/SYSTEM-26-PROFESSIONS-CITIZENSHIP-STATUS.md): Sistema 26 implementado e consolidado nas Fatias 26.1 a 26.7.
40. [Economia, comércio e propriedade](docs/SYSTEM-27-ECONOMY-COMMERCE-PROPERTY.md): Sistema 27 implementado e consolidado nas Fatias 27.1 a 27.7.
41. [Bases, territórios e assentamentos](docs/SYSTEM-28-BASES-TERRITORIES-SETTLEMENTS.md): Sistema 28 implementado e consolidado nas Fatias 28.1 a 28.7.
42. [Facções, diplomacia e poder político](docs/SYSTEM-29-FACTIONS-DIPLOMACY-POLITICS.md): Sistema 29 implementado e consolidado nas Fatias 29.1 a 29.7.
43. [Roadmap de mecânicas](docs/ROADMAP.md): etapas consolidadas até o Sistema 29; o Dia 1 está fechado em A–G e o Dia 2 já possui especificação narrativa/técnica. A próxima implementação é a Fatia A do Dia 2: Atividades Contextuais + schema 26.
44. [Instruções para agentes](AGENTS.md): regras práticas para trabalhar nesta pasta.

## Como executar

Requisitos: Node.js 20 ou superior.

```bash
cd rpg-narrativo-ia
npm install
npm run dev
```

A aplicação sobe em `http://localhost:5173`. No celular da mesma rede, use o endereço local que o Vite mostrar.

Outros comandos:

```bash
npm test        # testes do motor, persistência, sandbox, superfície mobile e gatilhos de mundo
npm run lint    # ESLint
npm run typecheck
npm run build   # build de produção com PWA
npm run preview # serve o conteúdo de dist/
```

A partida fica em `localStorage` neste navegador. Não há login, backend nem chave.

## Estrutura implementada

```text
content/
└── first-day/        # pack JSON do mundo (mapa, sistema, campanha)
src/
├── core/             # estado, condições, efeitos e motor imutável
├── modules/          # personagem, progressão, inventário, relações, mundo, horário, ciclo diário, navegação, exploração, recursos, crafting, sandbox, ações, gatilhos, presenças, objetivos, energéticos, habilidades, treino, interface do Sistema, combate, maestria, conteúdo e narrativa
├── campaigns/        # adapters da campanha do primeiro dia sobre o pack JSON
├── infrastructure/   # persistência com schemaVersion
├── ui/               # HUD, superfícies contextuais, telas mobile-first e placeholders
└── tests/            # testes automatizados do núcleo
```

O fluxo da interface dispara ações; o motor em TypeScript puro devolve um novo estado. Campanhas são dados, não JSX.

## Estado atual

**MVP narrativo e consolidação do motor concluídos.** As etapas 1 a 6 da evolução sandbox, o Sistema 7 e o Sistema 8 estão implementados e consolidados. O jogador desperta, escolhe uma capacidade, explora livremente e encontra conteúdo por suas próprias ações.

O Sistema 8 — Presenças e interações no mundo — está implementado e consolidado nas Fatias 8.1 a 8.6: catálogo, sincronização, planejamento, save schema 4, `presence.interact`, interface mobile e conteúdo jogável de Mira e do coelho chifrudo. Consulte [Sistema 8](docs/SYSTEM-PRESENCES.md), [Consolidação dos Sistemas 1 a 8](docs/SYSTEMS-1-8-CONSOLIDATION.md) e [Estado, metas e horizonte](docs/PROJECT-STATUS.md).

O Sistema 9 — Necessidades e sobrevivência leve — está implementado e consolidado nas Fatias 9.1 a 9.5: existe um modelo puro, `sede` integra `Attributes` e o save schema 5, o orquestrador aplica desgaste, consumo e repouso, a interface mobile expõe condição e recuperação e uma rota automatizada sustenta oito dias sem combate usando apenas o conteúdo atual.

O Sistema 10 — Objetivos, jornadas e registro de descobertas — está implementado e consolidado nas Fatias 10.1 a 10.5. Na revisão do Dia 1, o ID persistente `first-steps` agora representa a jornada **Primeiro dia**: aptidão, primeira prática real de Númen, reconhecimento da clareira, fonte de água e sinais humanos. Fogueira/refeição e contato com Mira ficam em jornadas laterais e não bloqueiam a progressão principal.

O Sistema 11 — Núcleo do Sistema, Eteris, Númen e Progressão — está implementado e consolidado nas Fatias 11.1 a 11.7. Os módulos `energetics`, `skills`, `training` e `system-interface` entregam o vocabulário de Eteris/Númen e Corpo/Poder, os catálogos validados de caminhos, habilidades e métodos de treino, o estado de progressão persistido em `GameState.system` (schema 7), a ação de treino que cobra o relógio uma vez, a Árvore de habilidades com sigilo de conteúdo oculto e a aba mobile `Sistema` com Status e confirmação de custo.

O Sistema 12 — Banco de ações e combate — está implementado e consolidado nas Fatias 12.1 a 12.7. O módulo `combat` entrega catálogos de ações, combatentes e encontros; um motor de turno determinístico com dano, cura e escudo; uma IA de oponente por regras; a liberação de ações extras pelas habilidades conhecidas do Sistema 11; um encontro jogável no mundo com desfecho aplicado ao `GameState`; e uma tela de combate mobile. O Jardim está implementado no Sistema 16.

As Fatias 12.8 a 12.12 estão implementadas: a ameaça só aparece após a descoberta exigida (`wary-predator-tracks` aos 30% na Clareira), a saúde do mundo é a vitalidade de combate, ferimentos persistem, cada confronto cobra um período e a interface apresenta custo e consequência. O desfecho é aplicado como uma transação atômica pelo orquestrador. Consulte [Consolidação do Sistema 12](docs/SYSTEM-12-CONSOLIDATION.md).

O Sistema 13 — Progressão por prática e recompensas do Sistema — está **implementado e consolidado nas Fatias 13.1 a 13.7**. O módulo `mastery` conecta treino e o uso verificado de habilidades em vitórias a proficiência, marcos de nível e revelação de métodos, tudo na mesma transação atômica, sem introduzir experiência genérica, equipamentos ou Jardim. Consulte [Sistema 13](docs/SYSTEM-PRACTICE-PROGRESSION.md).

Os Sistemas 14 a 29 estão **implementados e consolidados**: itens/equipamentos/preparação; condições/elementos/combate; Jardim de habilidades; NPCs persistentes/agenda/mundo vivo; pontos de interesse; relacionamentos direcionais; Registro/patentes/rankings; grupos/organizações; Númen avançado com fases, custo e interrupção; party e combate coletivo; calendário e ciclo de vida; família, lar e linhagem; profissões e cidadania; economia e propriedade; bases e assentamentos; facções e política. O save atual é o schema 25; o schema 23 continua sendo o marco em que `politics` entrou pelo Sistema 29, o 24 adicionou `character.sex` e o 25 adicionou orientação persistida. O primeiro dia (mapa, habilidades, eventos, Mira) vive no pack JSON `content/first-day/`; o motor valida o pack na borda e não persiste catálogo. O começo atual já encadeia aptidão inicial, percepção de Etéris, orientação de Númen, treino real de `Sentidos Aguçados`, sinais humanos, contato opcional com Mira e primeira noite adaptativa. O relógio do sandbox aciona a noite por `world.time.reached`; o descanso real continua em `needs.rest` e a passagem canônica do relógio aciona o início do Dia 2. Consulte [Sistema 14](docs/SYSTEM-ITEMS-EQUIPMENT-PREPARATION.md), [Sistema 15](docs/SYSTEM-CONDITIONS-ELEMENTS-COMBAT.md), [Sistema 16](docs/SYSTEM-SKILL-GARDEN.md), [Sistema 17](docs/SYSTEM-PERSISTENT-NPCS-LIVING-WORLD.md), [Sistema 18](docs/SYSTEM-18-INTERACTABLE-WORLD.md), [Sistema 19](docs/SYSTEM-19-RELATIONSHIPS.md), [Sistema 20](docs/SYSTEM-20-SYSTEM-REGISTRY-RANKINGS.md), [Sistema 21](docs/SYSTEM-21-GROUPS-ORGANIZATIONS.md), [Sistema 22](docs/SYSTEM-22-ADVANCED-NUMEN-SKILLS.md), [Sistema 23](docs/SYSTEM-23-PARTY-COMPANIONS-GROUP-COMBAT.md), [Sistema 24](docs/SYSTEM-24-LONG-TERM-CALENDAR-LIFE-CYCLE.md), [Sistema 25](docs/SYSTEM-25-FAMILY-HOUSEHOLD-LINEAGE.md), [Sistema 26](docs/SYSTEM-26-PROFESSIONS-CITIZENSHIP-STATUS.md), [Sistema 27](docs/SYSTEM-27-ECONOMY-COMMERCE-PROPERTY.md), [Sistema 28](docs/SYSTEM-28-BASES-TERRITORIES-SETTLEMENTS.md), [Sistema 29](docs/SYSTEM-29-FACTIONS-DIPLOMACY-POLITICS.md) e [Motor e pack de mundo](docs/CONTENT-PACK.md).

O programa dos Sistemas 18 a 29 está **implementado e consolidado** dentro do recorte aprovado. Consulte [Visão do motor de mundo](docs/WORLD-ENGINE-VISION.md) e [Roadmap](docs/ROADMAP.md).

## Decisões já tomadas

- React, TypeScript e Vite.
- Aplicação responsiva, priorizando celular.
- Motor determinístico e conteúdo estruturado localmente.
- Sem backend, autenticação, banco remoto ou API de IA no MVP.
- Salvamento local no navegador.
- PWA instalável e preparada para funcionar offline.
- Imagens substituídas inicialmente por placeholders identificáveis.
- Módulos independentes dentro de um único aplicativo.

## Limitações atuais

- Textos e nomes ainda são provisórios.
- Cenas, retratos e ícones são placeholders locais, sem arte final.
- Só existe a campanha do primeiro dia.
- O salvamento local usa `schemaVersion: 25`, persiste `character.sex`, `guidance`, `sede`, `narrativeSession` (nula na exploração livre), `sandbox.presences`, `sandbox.npcs`, `sandbox.interactables`, `items`, `lingering`, `garden`, `bonds`, `registry`, `organizations`, `execution`, `party`, `calendar`, `family`, `civic`, `economy`, `settlements`, `politics`, o progresso mínimo de objetivos e o estado de progressão do Sistema (`system`: nível e proficiências por habilidade). Valida sandbox, objetivos e progressão contra seus catálogos e migra saves v1 a v24 válidos na leitura, sem regravar o `localStorage` até o próximo `save`. Contextos, mapas, textos, critérios, índices e definições não entram no JSON. Falha de forma controlada se a versão for incompatível ou se a estrutura interna estiver malformada.
- Balanceamento definitivo ainda não existe no código; o Jardim está implementado no Sistema 16, e nomes, números e conteúdo permanecem protótipos.
- Fora da implementação atual: persistência de combate em andamento, posicionamento, mapa aberto, geração procedural, editor e qualquer serviço pago.
- A instalação PWA e o modo offline dependem de HTTPS ou `localhost`.
- A evolução sandbox tem horário, data, ciclo diário, navegação, exploração, recursos, crafting, estado integrado persistido, orquestrador de ações, superfície mobile e o mecanismo genérico de gatilhos de mundo.
- O Sistema 8 está implementado. As Fatias 8.1 a 8.6 existem no código: catálogo, sincronização, planejamento, save schema 4, orquestração de `presence.interact`, interface mobile e conteúdo jogável de Mira e do coelho chifrudo.

## O que foi validado nesta entrega

- `npm test`: 92 arquivos / 928 testes no fechamento da Fatia G, incluindo duas rotas completas do Dia 1 (contato com Mira e evasão), jornada **Primeiro dia**, primeira noite adaptativa, transição ao Dia 2, persistência schema 25, migrações v1–v24 e os Sistemas 1 a 29.
- `npm run lint` e `npm run typecheck`.
- `npm run build`: bundle estático com `sw.js` e manifesto.
- Na Clareira do Despertar, pegadas e outros sinais humanos aparecem antes de `mira-nearby`. Mira pode ser observada, abordada ou evitada; conversar abre `survivor-meet` e retorna ao sandbox após a troca. A primeira noite é acionada pelo relógio, não pela conversa, e o Dia 2 começa depois do avanço real de tempo pelo sandbox.
- Presenças conhecidas aparecem no painel Mundo; conteúdo oculto permanece invisível.
