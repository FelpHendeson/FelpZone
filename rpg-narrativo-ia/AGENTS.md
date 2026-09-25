# Instruções para o agente codificador

Antes de implementar, leia o `README.md` e todos os documentos em `docs/`.

## Objetivo atual

A Fase 2 — consolidação do motor — está concluída. As etapas 1 a 6 da evolução sandbox e as Fatias 7.1 a 7.5 estão implementadas. O Sistema 7 continua sendo a base histórica do loop integrado, mas o conteúdo atual do Dia 1 foi revisado: sinais humanos antecedem Mira, o contato é opcional e a noite não depende do encontro.

Os Sistemas 1 a 29 estão implementados e consolidados. O Sistema 13 — Progressão por prática e recompensas do Sistema — entrega prática por treino e vitória no módulo `mastery`. Os Sistemas 14 a 17 avançam o save até o schema 11: itens e preparação, condições e elementos, Jardim de habilidades e NPCs persistentes. O Sistema 18 persiste pontos de interesse em `sandbox.interactables` no schema 12. O Sistema 19 persiste relações direcionais em `bonds` no schema 13. O Sistema 20 persiste acesso, patentes e rankings reconhecidos em `registry` no schema 14. O Sistema 21 persiste filiação e cargos em `organizations` no schema 15. O Sistema 22 persiste reservas e recargas em `execution` no schema 16. O Sistema 23 persiste tática e vitalidade da party em `party` no schema 17. O Sistema 24 persiste ocorrências de calendário em `calendar` no schema 18. O Sistema 25 persiste laços, lares e marcos em `family` no schema 19. O Sistema 26 persiste concessões e prática em `civic` no schema 20. O Sistema 27 persiste carteiras, estoques e propriedade em `economy` no schema 21. O Sistema 28 persiste reivindicações, projetos e produção em `settlements` no schema 22. O Sistema 29 persiste mandatos, relações, acordos e leis em `politics` no schema 23. A revisão narrativa do Dia 1 adiciona `character.sex` no schema 24 e `guidance` no schema 25; a Fatia A do Dia 2 adiciona `activities.consumedActivityIds` no schema 26; saves schema 23 migram com `sex: 'unspecified'`, e saves schema 24 migram com a ajuda básica já marcada como vista para evitar popups retroativos. A Fatia C não altera o schema: objetivos e `world-events` passam a ler `system.skill.proficiency.min`, e `world-events` também aceita `world.day.min`, sempre sobre estado canônico e ordem declarada do pack. A Fatia D também não altera o schema: após a aptidão inicial, o pack conduz `eteris-introduction → numen-introduction → sandbox`; o treino `focused-perception-drill` é a primeira prática real e o trigger `first-numen-practice` abre a reação narrativa ao atingir proficiência 1 em `sharpened-senses`. A Fatia E reorganiza `first-steps` como **Primeiro dia**, coloca `human-footprints`/`human-cut-branch` antes de `mira-nearby` e torna Mira opcional. A Fatia F adiciona `world.time.reached` e a condição `crafting.structure.active`: a noite reage a confiança, fogueira e energia, retorna ao sandbox sem simular descanso e o Dia 2 só nasce do avanço real do relógio. A Fatia G fecha o prólogo com playtest integrado das rotas com/sem Mira; o pacing aprovado mantém a Clareira em 10% por exploração, antecipa os sinais humanos e `path-spring-lake` para 10%, `mira-nearby` para 20%, e trata a Nascente como deslocamento/leitura local de 0 períodos. C–G mantêm o schema 25; o schema 26 começa no Dia 2. O primeiro dia vive no pack JSON `content/first-day/`; o motor valida o conteúdo na borda e não persiste catálogo. Leia [Motor e pack de mundo](docs/CONTENT-PACK.md).

O programa dos Sistemas 18 a 29 está **implementado e consolidado** dentro do recorte aprovado. Antes de um eixo novo, leia [Visão do motor de mundo](docs/WORLD-ENGINE-VISION.md) e [Roadmap](docs/ROADMAP.md). Não implemente mais de um sistema nem antecipe uma dependência.

Leia [Sistema 14](docs/SYSTEM-ITEMS-EQUIPMENT-PREPARATION.md), [Sistema 15](docs/SYSTEM-CONDITIONS-ELEMENTS-COMBAT.md), [Sistema 16](docs/SYSTEM-SKILL-GARDEN.md) e [Sistema 17](docs/SYSTEM-PERSISTENT-NPCS-LIVING-WORLD.md) antes de propor código. Números, nomes e conteúdo continuam protótipos.

O Sistema 11 — Núcleo do Sistema, Eteris, Númen e Progressão — está **implementado e consolidado nas Fatias 11.1 a 11.7** nos módulos `energetics`, `skills`, `training` e `system-interface`: vocabulário energético, catálogos validados, `GameState.system` no schema 7, ação de treino com custo temporal único, Árvore de habilidades com sigilo e a aba mobile `Sistema`. Leia [Sistema 11](docs/SYSTEM-ETERIS-NUMEN-PROGRESSION.md), [Estado, metas e horizonte](docs/PROJECT-STATUS.md) e [Roadmap](docs/ROADMAP.md) antes de propor código. Números, nomes e conteúdo de habilidades são protótipos. O combate já reutiliza os contratos públicos do Sistema 11, mas fórmulas e balanceamento definitivo continuam sem aprovação.

A interface jogável segue o princípio **aventura primeiro, dados sob demanda**. A navegação persistente possui cinco destinos — `Mundo`, `Jornadas`, `Personagem`, `Mochila` e `Menu` — e abre telas focadas para mapa, pessoas, progressão, Registro, sociedade e domínio. Ações locais continuam contextuais. Preserve essa hierarquia e consulte [UI/UX 2.0](docs/UI-UX-2-NAVIGATION.md) antes de acrescentar novas superfícies.

## Regras obrigatórias

- Use React, TypeScript e Vite.
- Priorize telas de celular e valide também em desktop.
- Mantenha regras do jogo fora dos componentes React.
- Modele campanhas e eventos como dados; não codifique a história diretamente na interface.
- Não adicione API de IA, backend, login, telemetria ou serviço pago.
- Não crie imagens finais sem pedido explícito. Preserve placeholders locais, mas aceite referências de arte opcionais do pack conforme [Imagens opcionais dos packs](docs/VISUAL-ASSETS.md).
- Cada módulo deve expor tipos e funções públicas sem acessar internamente outro módulo.
- Prefira funções puras para condições, escolhas e efeitos.
- Salve uma versão do esquema junto com a partida para permitir migrações futuras.
- Inclua testes para regras e efeitos centrais.
- Não expanda facções, assentamentos, combate complexo ou geração procedural além da etapa explicitamente autorizada e de sua spec.
- Trate dados persistidos e conteúdo de campanha como entradas não confiáveis e valide-os nas fronteiras.
- Toda nova garantia do motor deve possuir teste automatizado que falhe sem a correção.
- Preserve os rótulos de decisão de `docs/PROJECT-STATUS.md`: hipótese de agente não é requisito de produto.
- O motor narrativo será uma camada acionada pelo mundo; não deve permanecer como único loop de jogo.
- Preserve autoria de mapas em JSON hierárquico e navegação somente entre pai, filhos diretos e irmãos.
- Mantenha exploração, coleta e crafting como sistemas distintos, conectados por contratos.
- Cada local explorável possui progresso próprio; conclusão de zona é uma métrica agregada separada.
- Recursos renováveis possuem estado e tempo de recuperação; coleta nunca cria materiais infinitos.
- Trate o Sistema como interface diegética: menus e mensagens podem ser percebidos pelo personagem, mas regras continuam fora do React.
- Preserve a distinção conceitual: Eteris é energia ambiental; Númen é Eteris interiorizado e individualizado por um ser vivo.
- Não invente atributos, fórmulas definitivas, curvas, velocidade de conjuração, raças ou consequências fora das especificações. Equipamentos, condições, Jardim e agenda obedecem estritamente aos contratos dos Sistemas 14 a 17.
- Separe catálogos de habilidades, personagens e campanhas do estado persistido; prefira dados declarativos validados e nunca código executável em JSON.
- O cânone atual garante Sistema a todos os humanos. Protagonista não humano, raças não humanas concretas e Sistema universal para todos os seres permanecem em discussão.
- Preserve a diferença entre cânone e capacidade do motor: o `first-day` mantém Sistema para todos os humanos; o Sistema 20 especifica políticas configuráveis para packs futuros, sem retcon automático.
- Preserve a arquitetura LEGO: leis reutilizáveis pertencem ao motor, entidades e parâmetros pertencem ao pack, acontecimentos pertencem à campanha e o save guarda somente IDs e estado mutável.
- O contrato de combatente do Sistema 12 não equivale oponente a monstro: pessoas e criaturas compartilham o mesmo contrato, diferindo apenas por conteúdo.
- Preserve as Fatias 12.8 a 12.12: revele ameaças somente por pré-requisitos declarativos, derive a vitalidade do jogador da `saude` atual e persista somente um resultado terminal verificável.
- Um confronto completo cobra o tempo exatamente uma vez no desfecho; turnos individuais nunca avançam o relógio.
- Vitória, derrota ou fuga devem formar uma única transação de mundo. React não calcula nem aplica consequências persistentes.
- No Sistema 13, prática só nasce de treino validado ou resolução de combate reproduzida; não aceite proficiência, nível, marco ou recompensa informados pela UI.

## Entrega esperada

- implementação limitada à etapa explicitamente autorizada;
- integração por contratos com o motor já consolidado;
- testes automatizados para cada nova regra;
- documentação atualizada para refletir apenas contratos implementados;
- nenhuma chave, segredo ou dependência de rede durante a partida.

Quando houver ambiguidade, preserve a modularidade e escolha a menor solução capaz de validar a experiência.


O fechamento da revisão do Dia 1 está em [Dia 1 — Playtest da Fatia G](docs/DAY-1-PLAYTEST.md). O Dia 2 está especificado em [Dia 2 — narrativa](docs/DAY-2-NARRATIVE-SPEC.md) e [Dia 2 — implementação](docs/DAY-2-IMPLEMENTATION-SPEC.md). As **Fatias A–G do Dia 2 estão implementadas**: Atividades Contextuais, mundo, jornada, atividades de Davi e água, encerramento pelo relógio e playtest completo das rotas de cooperação, afastamento e ausência de encontro. O schema permanece 26. O [Dia 3 — especificação narrativa](docs/DAY-3-NARRATIVE-SPEC.md) está concluído; defina e revise um recorte técnico próprio antes de iniciar sua implementação.
