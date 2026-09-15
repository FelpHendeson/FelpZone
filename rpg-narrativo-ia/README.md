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
3. [Visão do produto](docs/PRODUCT.md): universo, experiência e limites conceituais.
4. [Escopo do MVP](docs/MVP.md): o que deve e não deve ser implementado agora.
5. [Arquitetura](docs/ARCHITECTURE.md): módulos, responsabilidades e fluxo de dados.
6. [Conteúdo e interface](docs/CONTENT-AND-UI.md): formato dos eventos, telas e placeholders.
7. [Consolidação de UI/UX](docs/UI-UX-CONSOLIDATION.md): hierarquia visual, navegação e regras de densidade da interface jogável.
8. [Fase 2 — Consolidação do motor](docs/PHASE-2-ENGINE.md): registro da fase concluída.
9. [Visão sandbox](docs/SANDBOX-FLOW.md): novo loop de exploração e papel do motor narrativo.
10. [Horário e data](docs/SYSTEM-TIME-AND-DATE.md): relógio determinístico por períodos, já implementado.
11. [Ciclo diário](docs/SYSTEM-DAY-CYCLE.md): eventos de período e dia derivados do relógio, já implementado.
12. [Navegação hierárquica](docs/SYSTEM-NAVIGATION.md): mapa aninhado, posição e movimento entre pai, filhos e irmãos, já implementado.
13. [Exploração e descobertas](docs/SYSTEM-EXPLORATION.md): percentual por local e revelação determinística de conteúdo, já implementado.
14. [Recursos e ecologia](docs/SYSTEM-RESOURCES.md): coleta, renovação e risco de esgotamento, já implementado.
15. [Crafting e cozinha](docs/SYSTEM-CRAFTING.md): receitas, estruturas locais e transformação de materiais, já implementado.
16. [Integração explorável](docs/SYSTEM-INTEGRATION.md): estado composto, persistência, superfície mobile e primeiro encontro acionado pelo mundo.
17. [Presenças e interações](docs/SYSTEM-PRESENCES.md): Sistema 8 aprovado e implementado nas Fatias 8.1 a 8.6.
18. [Consolidação dos Sistemas 1 a 8](docs/SYSTEMS-1-8-CONSOLIDATION.md): revisão integrada, gates e ponto seguro de continuidade.
19. [Necessidades e sobrevivência leve](docs/SYSTEM-NEEDS.md): Sistema 9 implementado e consolidado nas Fatias 9.1 a 9.5.
20. [Objetivos, jornadas e registro de descobertas](docs/SYSTEM-OBJECTIVES.md): Sistema 10 implementado e consolidado nas Fatias 10.1 a 10.5.
21. [Núcleo do Sistema, Eteris, Númen e Progressão](docs/SYSTEM-ETERIS-NUMEN-PROGRESSION.md): Sistema 11 implementado e consolidado nas Fatias 11.1 a 11.7.
22. [Banco de ações e combate](docs/SYSTEM-ACTION-COMBAT.md): Sistema 12 implementado e consolidado nas Fatias 12.1 a 12.7.
23. [Consolidação do Sistema 12](docs/SYSTEM-12-CONSOLIDATION.md): Fatias 12.8 a 12.12 implementadas — descoberta, saúde, tempo, consequências atômicas e UI de combate.
24. [Roadmap de mecânicas](docs/ROADMAP.md): etapas consolidadas, Sistemas 11 e 12 implementados e horizonte posterior.
25. [Instruções para agentes](AGENTS.md): regras práticas para trabalhar nesta pasta.

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
src/
├── core/             # estado, condições, efeitos e motor imutável
├── modules/          # personagem, progressão, inventário, relações, mundo, horário, ciclo diário, navegação, exploração, recursos, crafting, sandbox, ações, gatilhos, presenças, objetivos, energéticos, habilidades, treino, interface do Sistema, combate e narrativa
├── campaigns/        # dados da campanha do primeiro dia
├── infrastructure/   # persistência com schemaVersion
├── ui/               # HUD, superfícies contextuais, telas mobile-first e placeholders
└── tests/            # testes automatizados do núcleo
```

O fluxo da interface dispara ações; o motor em TypeScript puro devolve um novo estado. Campanhas são dados, não JSX.

## Estado atual

**MVP narrativo e consolidação do motor concluídos.** As etapas 1 a 6 da evolução sandbox, o Sistema 7 e o Sistema 8 estão implementados e consolidados. O jogador desperta, escolhe uma capacidade, explora livremente e encontra conteúdo por suas próprias ações.

O Sistema 8 — Presenças e interações no mundo — está implementado e consolidado nas Fatias 8.1 a 8.6: catálogo, sincronização, planejamento, save schema 4, `presence.interact`, interface mobile e conteúdo jogável de Mira e do coelho chifrudo. Consulte [Sistema 8](docs/SYSTEM-PRESENCES.md), [Consolidação dos Sistemas 1 a 8](docs/SYSTEMS-1-8-CONSOLIDATION.md) e [Estado, metas e horizonte](docs/PROJECT-STATUS.md).

O Sistema 9 — Necessidades e sobrevivência leve — está implementado e consolidado nas Fatias 9.1 a 9.5: existe um modelo puro, `sede` integra `Attributes` e o save schema 5, o orquestrador aplica desgaste, consumo e repouso, a interface mobile expõe condição e recuperação e uma rota automatizada sustenta oito dias sem combate usando apenas o conteúdo atual.

O Sistema 10 — Objetivos, jornadas e registro de descobertas — está implementado e consolidado nas Fatias 10.1 a 10.5. Catálogo, estado, dez critérios, schema 6, sincronização após ações e escolhas, diário seguro e interface mobile sustentam a jornada principal `Primeiros passos`, da capacidade inicial ao encontro com Mira.

O Sistema 11 — Núcleo do Sistema, Eteris, Númen e Progressão — está implementado e consolidado nas Fatias 11.1 a 11.7. Os módulos `energetics`, `skills`, `training` e `system-interface` entregam o vocabulário de Eteris/Númen e Corpo/Poder, os catálogos validados de caminhos, habilidades e métodos de treino, o estado de progressão persistido em `GameState.system` (schema 7), a ação de treino que cobra o relógio uma vez, a Árvore de habilidades com sigilo de conteúdo oculto e a aba mobile `Sistema` com Status e confirmação de custo.

O Sistema 12 — Banco de ações e combate — está implementado e consolidado nas Fatias 12.1 a 12.7. O módulo `combat` entrega catálogos de ações, combatentes e encontros; um motor de turno determinístico com dano, cura e escudo; uma IA de oponente por regras; a liberação de ações extras pelas habilidades conhecidas do Sistema 11; um encontro jogável no mundo com desfecho aplicado ao `GameState` sem alterar o schema; e uma tela de combate mobile. O Jardim continua com direção conceitual e regras de fusão pendentes.

As Fatias 12.8 a 12.12 estão implementadas: a ameaça só aparece após a descoberta exigida (`wary-predator-tracks` aos 30% na Clareira), a saúde do mundo é a vitalidade de combate, ferimentos persistem, cada confronto cobra um período e a interface apresenta custo e consequência. O desfecho é aplicado como uma transação atômica pelo orquestrador. Consulte [Consolidação do Sistema 12](docs/SYSTEM-12-CONSOLIDATION.md).

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
- O salvamento local usa `schemaVersion: 7`, persiste `sede`, `narrativeSession` (nula na exploração livre), `sandbox.presences`, o progresso mínimo de objetivos e o estado de progressão do Sistema (`system`: nível e proficiências por habilidade). Valida sandbox, objetivos e progressão contra seus catálogos e migra saves v1 a v6 válidos na leitura, sem regravar o `localStorage` até o próximo `save`. Contextos, mapas, textos, critérios, índices e definições não entram no JSON. Falha de forma controlada se a versão for incompatível ou se a estrutura interna estiver malformada.
- Balanceamento definitivo e o Jardim de habilidades ainda não existem; nomes, números e conteúdo de habilidades e combate permanecem protótipos.
- Fora da implementação atual: persistência de combate em andamento, posicionamento, grupos, facções e assentamentos administráveis, mapa aberto, geração procedural, editor e qualquer serviço pago.
- A instalação PWA e o modo offline dependem de HTTPS ou `localhost`.
- A evolução sandbox tem horário, data, ciclo diário, navegação, exploração, recursos, crafting, estado integrado persistido, orquestrador de ações, superfície mobile e o mecanismo genérico de gatilhos de mundo.
- O Sistema 8 está implementado. As Fatias 8.1 a 8.6 existem no código: catálogo, sincronização, planejamento, save schema 4, orquestração de `presence.interact`, interface mobile e conteúdo jogável de Mira e do coelho chifrudo.

## O que foi validado nesta entrega

- `npm test`: 739 testes, incluindo a jornada `Primeiros passos`, o fluxo jogável de Mira e do coelho, persistência schema 7, migrações v1–v6, diário, superfície mobile, necessidades, orquestração, o ciclo de fortalecimento do Sistema 11, o combate por turnos do Sistema 12 e o ciclo de combate consolidado (descoberta → confronto → transação atômica).
- `npm run lint` e `npm run typecheck`.
- `npm run build`: bundle estático com `sw.js` e manifesto.
- Explorar a Clareira do Despertar revela Mira sem abrir narrativa; conversar inicia `first-priority` e devolve o jogador ao sandbox depois da noite.
- Presenças conhecidas aparecem no painel Mundo; conteúdo oculto permanece invisível.
