# Estado, metas e horizonte do projeto

Este documento é a fonte principal para distinguir o que já existe, o que foi definido pelo autor e o que ainda é apenas possibilidade. Ele não substitui as especificações técnicas de cada sistema; organiza o nível de decisão antes de uma nova especificação ser escrita.

## Legenda obrigatória

| Estado | Significado |
| --- | --- |
| **Implementado e consolidado** | Existe no código, possui testes e passou pela revisão da etapa. |
| **Protótipo** | Existe para validar a experiência, mas conteúdo, balanceamento, apresentação ou contrato ainda podem mudar. |
| **Definido pelo autor** | Faz parte da direção desejada e foi explicitamente discutido, mesmo que ainda não exista no código. |
| **Em discussão** | A ideia apareceu na conversa ou funciona como referência, mas o formato final e a decisão de implementar ainda estão abertos. |
| **Ainda não discutido / sem certeza de implementação** | É uma hipótese técnica ou de produto levantada pela documentação ou pelos agentes. Não constitui roadmap aprovado. |
| **Fora do escopo atual** | Não deve ser implementado agora. Isso não significa necessariamente rejeição definitiva. |

Uma mesma área pode ter dois estados. Exemplo: exploração percentual é uma direção **definida pelo autor** e seu primeiro recorte está **implementado e consolidado**.

## Identidade confirmada do projeto

As decisões abaixo foram definidas pelo autor:

- o jogo é um RPG narrativo sandbox modular e expansível;
- a experiência prioriza celular e sessões confortáveis de leitura;
- texto, imagens estáticas e uma interface funcional substituem a necessidade de Unity, Unreal ou outro motor gráfico pesado;
- a IA participa da concepção, escrita, revisão e programação, mas não roda dentro do jogo publicado;
- a versão inicial não depende de backend, chave de API ou serviço pago;
- os sistemas são especificados, implementados, testados e consolidados separadamente antes de uma integração maior;
- o Sistema é uma interface diegética: menus, mensagens e ações podem representar o personagem consultando e operando essa ferramenta dentro do mundo;
- conteúdo de habilidades, personagens e história deve permanecer modular, validado e substituível sem reescrever o motor;
- o jogo é um motor de mundos: sistemas são blocos reutilizáveis, packs configuram leis e conteúdo e campanhas vestem esse motor com histórias;
- o mesmo personagem deve poder viver, crescer, pertencer e liderar, conciliando aventura, relações, família, profissão, comércio e construção social;
- depois de uma abertura dirigida, o jogador deve ganhar liberdade para explorar, mapear o mundo e encontrar conteúdo por suas próprias ações;
- narrativa e escolhas devem surgir durante encontros, diálogos, descobertas e outros acontecimentos, em vez de formarem o único loop do jogo.

## Premissa e objetivos narrativos definidos

- A existência passou por um Reset.
- Os planetas cresceram e a geografia foi refeita.
- Não restaram construções ou objetos da civilização anterior; não é um cenário centrado em ruínas pós-apocalípticas.
- Humanos mantiveram memórias, foram espalhados pelo novo mundo e receberam poderes, capacidades mágicas e acesso a um Sistema.
- O Sistema existe para toda a humanidade e ajuda a orientá-la; o protagonista não é um escolhido exclusivo.
- Eteris é a energia existente no mundo; quando um ser vivo a absorve e individualiza, ela se torna Númen.
- Númen pode alimentar aplicações de Corpo e de Poder, incluindo reforço corporal, técnicas e magia.
- Sem as estruturas anteriores, assentamentos, facções e diferentes modelos de sociedade começam a surgir sob relações de poder ainda instáveis.
- O jogador define nome e sobrenome de um jovem que acabara de atingir a maioridade e desperta sozinho, sem familiares ou aliados.
- A trajetória pode misturar aventura, drama, fantasia e ficção especulativa; o tom deve responder às decisões do jogador.
- A causa do Reset, a origem do Sistema e o desenvolvimento amplo da trama continuam **em discussão** e devem ser construídos em conjunto.

Assentamentos e facções estão confirmados como parte do universo narrativo. Administração de base, território, assentamento, diplomacia e facções jogáveis foram definidos e especificados nos Sistemas 28 e 29, mas ainda não foram implementados.

## Metas de experiência definidas

O resultado desejado pelo autor é um jogador que:

1. cria sua identidade;
2. desperta e escolhe uma capacidade inicial;
3. entra em um mundo navegável;
4. explora cada ambiente e aumenta seu conhecimento local;
5. encontra itens, passagens, áreas bônus, pontos de coleta, NPCs, animais e criaturas;
6. coleta materiais limitados ou renováveis;
7. transforma materiais por crafting e cozinha;
8. encontra NPCs ou criaturas e, então, entra em diálogos, narrativa e escolhas;
9. pode avançar uma rota principal ou procurar conteúdo opcional e conclusão de áreas;
10. retorna à exploração depois das sessões narrativas;
11. desenvolve relações, vínculos, família e um lar ao longo do calendário;
12. pode pertencer e liderar grupos, guildas, clãs, assentamentos ou facções;
13. segue trajetórias sociais e econômicas, como cidadão, artesão, comerciante ou nobre;
14. desenvolve poder, combate e reconhecimento sem ser obrigado a abandonar a vida civil.

O formato exato de “100%” global, de rotas e de campanha está **em discussão**. Hoje existem progresso local e conclusão agregada de zona, não um sistema completo de conclusão do mundo.

## Sistemas existentes

| Base ou sistema | Situação técnica | O que existe hoje | Limite atual |
| --- | --- | --- | --- |
| MVP narrativo | **Implementado e consolidado** | Personagem, atributos, escolhas, condições, efeitos, inventário, relações, histórico, títulos e campanha inicial. | O conteúdo é curto e provisório. |
| Motor e validação | **Implementado e consolidado** | Estado imutável, validação de campanha, trajetórias, ciclo de vida, erros controlados e validação profunda de save. | Não é um editor de campanhas. |
| Persistência e PWA | **Implementado e consolidado** | `localStorage`, schema 23, migrações v1–v22, continuar/apagar partida e build PWA offline. | Não há conta nem sincronização entre aparelhos. |
| Sistema 1 — Horário e data | **Implementado e consolidado** | Relógio determinístico por períodos e dias, dirigido pelo custo das ações. | Sem calendário de meses/anos ou tempo real. |
| Sistema 2 — Ciclo diário | **Implementado e consolidado** | Eventos de início/fim de período e dia, além de fase visual derivada. | A fase ainda não troca o tema da interface. |
| Sistema 3 — Navegação | **Implementado e consolidado** | Mapa JSON hierárquico, posição, descoberta, desbloqueio, movimento entre pai, filhos e irmãos e primeira representação visual dos arredores. | O mapa visual mostra relações adjacentes; não há visão global, atalhos ou viagem rápida. |
| Sistema 4 — Exploração | **Implementado e consolidado** | Progresso por local, descobertas dirigidas por dados, passagens e conclusão agregada de zona. | Balanceamento e conteúdo ainda são protótipos. |
| Sistema 5 — Recursos e ecologia | **Implementado e consolidado** | Pontos limitados, coleta, renovação curta/longa e população que pode sofrer pressão ou extinção local. | A caça atual é uma abstração de coleta. |
| Sistema 6 — Crafting e cozinha | **Implementado e consolidado** | Receitas, consumo atômico, fogueira, estruturas locais e cozinha por estação. | Poucas receitas; combustível e ferramentas não funcionam ainda. |
| Sistema 7 — Integração explorável | **Implementado e consolidado** | Estado sandbox no save, orquestrador com custo único, superfície mobile, retorno da narrativa e mecanismo genérico de gatilhos de mundo. | O catálogo da campanha `first-day` não dispara mais o encontro da Clareira automaticamente. |
| Camada de UI/UX jogável | **Implementado; apresentação em protótipo** | Hierarquia “aventura primeiro, dados sob demanda”: HUD compacto, cena e decisões contextuais, navegação inferior com quatro destinos, ações locais em painel, mapa adjacente vertical, presenças expansíveis, Jornadas, Mochila e Sistema diegético. | Ícones e imagens ainda são placeholders; a consolidação reorganiza conteúdo existente e não adiciona regras ao domínio. |
| Sistema 8 — Presenças e interações | **Implementado e consolidado** | Catálogo, sincronização, planejamento, `PresenceState` no schema 4, `presence.interact`, interface mobile e conteúdo jogável de Mira (social/narrativa) e do coelho chifrudo (observar/evitar, sem combate). | Sem agenda, IA, combate ou conteúdo extra. |
| Sistema 9 — Necessidades e sobrevivência leve | **Implementado e consolidado** | Modelo puro; `sede` integrada; schema 5; desgaste por custo temporal; ações atômicas; superfície mobile; prova persistida de oito dias com conteúdo atual. | Sem combate, morte permanente ou novos recursos. |
| Sistema 10 — Objetivos, jornadas e diário | **Implementado e consolidado** | Fatias 10.1–10.5: catálogo, dez critérios, schema 6, sincronização após ações/escolhas, diário mobile e jornada `Primeiros passos` ponta a ponta. | O acompanhamento não persiste por decisão do recorte; não há recompensas automáticas. |
| Sistema 11 — Núcleo do Sistema, Eteris, Númen e Progressão | **Implementado e consolidado (Fatias 11.1 a 11.7)** | Vocabulário de Eteris/Númen e Corpo/Poder; catálogos de habilidades, caminhos e treino; `GameState.system` no schema 7; ação de treino com custo temporal único; Árvore de habilidades com sigilo; aba mobile `Sistema` com Status e confirmação de treino. | Balanceamento, Jardim e conteúdo definitivo seguem fora do escopo; números e nomes são protótipos. |
| Sistema 12 — Banco de ações e combate | **Implementado e consolidado (12.1–12.12)** | Catálogos, motor determinístico, IA por regras, habilidades liberando ações e encontro jogável; a consolidação (12.8–12.12) adiciona ameaça gatilhada por descoberta, vitalidade vinda da saúde do mundo, custo temporal único e desfecho aplicado como uma transação atômica (tempo, necessidades, saúde, flag, recompensa). | Posicionamento, status ricos, grupos, balanceamento definitivo e itens seguem fora do escopo. |
| Sistema 13 — Progressão por prática e recompensas | **Implementado e consolidado (13.1–13.7)** | Treino e vitórias verificadas desenvolvem proficiências; marcos dão significado ao nível e revelam métodos na mesma transação. | Fórmulas definitivas ficaram fora do recorte. |
| Sistema 14 — Itens, equipamentos e preparação | **Implementado e consolidado (14.1–14.7)** | Catálogo de itens, loadout de 3 espaços, 2 reservas de combate, receitas de ferramenta/unguento, recompensa fixa do predador e `GameState.items` no schema 8. | Sem raridade, peso, durabilidade, comércio ou loot aleatório. |
| Sistema 15 — Condições, elementos e combate | **Implementado e consolidado (15.1–15.7)** | Sangramento, exposição, ferida persistente, matriz Físico/Brasas/Água, `ember-cut` do predador e schema 9. | Sem chance oculta, posicionamento, grupos ou fórmulas definitivas. |
| Sistema 16 — Jardim de habilidades | **Implementado e consolidado (16.1–16.7)** | Receita `Sentinela Interior`, pontos de cultivo no marco de nível 2, ação `garden.cultivate` e schema 10. | Sem geração procedural, sacrifício, reversão ou IA. |
| Sistema 17 — NPCs persistentes, agenda e mundo vivo | **Implementado e consolidado (17.1–17.7)** | Mira conhecida após a conversa inicial, agenda por período, fatos fechados e `sandbox.npcs` no schema 11. | Sem simulação contínua, IA generativa, economia ou administração. |
| Sistema 18 — Cenário interativo | **Implementado e consolidado (18.1–18.7)** | Marcas da Grande Árvore, `sandbox.interactables` e schema 12. | Sem física, minijogos ou construção. |
| Sistema 19 — Relacionamentos | **Implementado e consolidado (19.1–19.7)** | Dimensões direcionais, vínculo explícito de amizade com Mira e `GameState.bonds` no schema 13. | Sem casamento, IA conversacional ou remoção de agência. |
| Sistema 20 — Registro e rankings | **Implementado e consolidado (20.1–20.7)** | Política universal para humanos, rankings locais derivados, patente `clearing-scout` por reivindicação e `GameState.registry` no schema 14. | Sem placar online, economia de ranking ou fórmula universal de poder. |
| Sistema 21 — Grupos e organizações | **Implementado e consolidado (21.1–21.7)** | Grupo da Clareira com Mira, cargos/permissões declarados e `GameState.organizations` no schema 15. | Sem tesouro, território, diplomacia ou combate em grupo — o combate coletivo ficou no Sistema 23. |
| Sistema 22 — Númen e execução avançada | **Implementado e consolidado (22.1–22.7)** | Reservas de Númen, fases, recarga, interrupção determinística e `GameState.execution` no schema 16. | Sem fórmulas definitivas, tempo real, grade ou criação livre de feitiços. |
| Sistema 23 — Party, companheiros e combate coletivo | **Implementado e consolidado (23.1–23.7)** | Party sobre o grupo da Clareira, Mira como aliada, segundo oponente e `GameState.party` no schema 17. | Sem grade espacial, exércitos, PvP ou controle irrestrito de NPCs. |
| Sistema 24 — Calendário e ciclo de vida | **Implementado e consolidado (24.1–24.7)** | Contagem do Reset compacta, idade derivada, fronteiras idempotentes e `GameState.calendar` no schema 18. | Sem clima, astronomia, tempo real ou morte por velhice. |
| Sistema 25 — Família, lar e linhagem | **Implementado e consolidado (25.1–25.7)** | Parceria com Mira, acampamento compartilhado, Rowan como dependente e `GameState.family` no schema 19. | Sem gravidez simulada, herança econômica ou árvore infinita. |
| Sistema 26 — Profissões e cidadania | **Implementado e consolidado (26.1–26.7)** | Residência da Clareira, ofício de coletor, prática verificável e `GameState.civic` no schema 20. | Sem mercado, construção, política entre facções ou simulação de emprego de NPCs. |
| Sistema 27 — Economia e propriedade | **Implementado e consolidado (27.1–27.7)** | Marcas de brasa, venda/compra atômica com Mira, esconderijo como direito e `GameState.economy` no schema 21. | Sem inflação, bolsa, leilão ou monetização. |
| Sistema 28 — Bases e assentamentos | **Implementado e consolidado (28.1–28.7)** | Acampamento da Clareira, abrigo com custo/tempo, vigia de Mira, produção limitada e `GameState.settlements` no schema 22. | Sem cidade, guerra territorial, grade ou automação infinita. |
| Sistema 29 — Facções e política | **Implementado e consolidado (29.1–29.7)** | Mandato do acampamento, pacto assimétrico com a Clareira, lei local e `GameState.politics` no schema 23. | Sem exércitos, eleição em tempo real ou vitória política única. |
| Motor e pack de mundo | **Implementado** | `ContentSource`, `composeWorld` e pack JSON `first-day`. O motor valida catálogos hostis; a UI lê nomes do índice. `RemoteSource` reusa o mesmo compose. | Sem CMS, banco real, editor no jogo ou mudança de schema. |

## Próximos sistemas especificados

Os Sistemas 18 a 29 foram definidos e especificados em 17 de setembro de 2026. **Os Sistemas 18 a 29 estão implementados.** A ordem e as dependências estão no [Roadmap](ROADMAP.md), e a regra arquitetural comum está em [Visão do motor de mundo](WORLD-ENGINE-VISION.md).

| Sistema | Estado | Núcleo do contrato |
| --- | --- | --- |
| 18 — Cenário interativo | **Implementado e consolidado (18.1–18.7)** | Descobrir, examinar e alterar pontos de interesse declarativos. |
| 19 — Relacionamentos | **Implementado e consolidado (19.1–19.7)** | Relações direcionais, dimensões e vínculos explícitos com agência. |
| 20 — Registro e rankings | **Implementado e consolidado (20.1–20.7)** | Política de acesso, registro, patentes, rankings e títulos separados. |
| 21 — Grupos e organizações | **Implementado e consolidado (21.1–21.7)** | Filiação, cargos, permissões, parties, guildas, clãs e base para facções. |
| 22 — Númen e execução avançada | **Implementado e consolidado (22.1–22.7)** | Reservas, custos, fases, velocidade, recarga e interrupção. |
| 23 — Companheiros e combate coletivo | **Implementado e consolidado (23.1–23.7)** | Equipes, papéis, táticas, agência e consequências de grupo. |
| 24 — Calendário e ciclo de vida | **Implementado e consolidado (24.1–24.7)** | Calendários configuráveis, idade, estágios e processos longos. |
| 25 — Família, lar e linhagem | **Implementado e consolidado (25.1–25.7)** | Parceria, parentesco, responsáveis, dependentes e residência. |
| 26 — Profissões e posição social | **Implementado e consolidado (26.1–26.7)** | Profissão, cidadania, ofício, títulos, reputação e permissões. |
| 27 — Economia e propriedade | **Implementado e consolidado (27.1–27.7)** | Moedas, estoques, comércio atômico e direitos de propriedade. |
| 28 — Bases e assentamentos | **Implementado e consolidado (28.1–28.7)** | Reivindicação, projetos, estruturas, moradores e produção. |
| 29 — Facções e política | **Implementado e consolidado (29.1–29.7)** | Relações diplomáticas, representação, acordos, leis e influência. |

## Conteúdo que permanece como protótipo

- nome “Reset” e nomes de regiões, criaturas, capacidades e itens;
- campanha do primeiro dia e seus textos;
- Clareira do Despertar, Grande Árvore, Nascente, Mata Densa e Caverna Oculta;
- Mira e a criatura do primeiro encontro;
- coelhos chifrudos, sua população e materiais;
- valores de progresso, capacidade, recuperação e custo;
- fogueira e duas receitas iniciais;
- identidade visual, placeholders, ícones e proporções de arte;
- atributos atuais e seus números de balanceamento.

Esses elementos podem ser usados para testar contratos sem se tornarem automaticamente conteúdo definitivo.

## Direções futuras já definidas pelo autor

Estas metas fazem parte da visão. Os Sistemas 11 a 17 estão consolidados:

### Sistema 11 — Núcleo do Sistema, Eteris, Númen e Progressão

Este eixo foi implementado nas Fatias 11.1 a 11.7. O Sistema funciona como interface existente dentro do universo; o personagem consulta por ele Status, habilidades, caminhos, métodos, receitas, registros e orientações.

Eteris é energia ambiental. Númen é Eteris interiorizado e individualizado por um ser vivo e pode ser aplicado ao Corpo ou ao Poder. Treinos consomem tempo. A Árvore apresenta caminhos; o Jardim recebe seu primeiro contrato determinístico no Sistema 16.

O contrato e as fatias propostas estão em [Sistema 11 — Núcleo do Sistema, Eteris, Númen e Progressão](SYSTEM-ETERIS-NUMEN-PROGRESSION.md).

### Banco de ações e combate — implementado no Sistema 12

O combate usa ações declaradas por dados (velocidade, alvo e efeitos de dano, cura e escudo), resolvidas por turno de forma determinística. Pessoas, criaturas e o personagem participam pelo mesmo contrato de combatente; inimigo não é monstro por definição. Habilidades conhecidas do Sistema 11 liberam ações extras, e o desfecho gera consequências no `GameState` sem alterar o schema.

As integrações de descoberta, saúde persistente, custo temporal e apresentação foram implementadas nas Fatias 12.8 a 12.12: a ameaça surge após a descoberta exigida, a vitalidade de entrada vem da saúde do mundo, cada desfecho cobra um período e o resultado é aplicado como uma transação atômica. Posicionamento, iniciativa por frações de turno, condições de status ricas, grupos, itens e balanceamento definitivo permanecem fora do escopo. Consulte [Sistema 12 — Banco de ações e combate](SYSTEM-ACTION-COMBAT.md) e [Consolidação do Sistema 12](SYSTEM-12-CONSOLIDATION.md).

### Sistema 13 — Progressão por prática e recompensas — implementado

O próximo eixo aprovado conecta o fortalecimento do Sistema 11 ao combate do Sistema 12. Treinos continuam aplicando seus próprios efeitos; uma vitória reproduzida pode conceder prática às habilidades realmente usadas, no máximo uma vez por habilidade naquele encontro. Marcos declarativos dão significado ao nível e podem revelar novos métodos sem expor conteúdo oculto.

O primeiro ciclo protótipo usa `Sentidos Aguçados`, `Golpe Preciso`, nível 2, `Rotina de Reforço do Corpo`, `Corpo Firme` e `Estancar Ferida`. Valores e limiares não são balanceamento definitivo. O eixo está implementado e consolidado nas Fatias 13.1 a 13.7. Consulte [Sistema 13 — Progressão por prática e recompensas do Sistema](SYSTEM-PRACTICE-PROGRESSION.md).

### Sistema 14 — Itens, equipamentos e preparação — implementado

Loadout, consumíveis preparados, benefícios declarativos e recompensas materiais determinísticas. Consulte [Sistema 14](SYSTEM-ITEMS-EQUIPMENT-PREPARATION.md).

### Sistema 15 — Condições, elementos e aprofundamento do combate — implementado

Adiciona condições por turno, matriz elemental explícita, limpeza e consequências persistentes limitadas, preservando replay e ausência de aleatoriedade oculta. Consulte [Sistema 15](SYSTEM-CONDITIONS-ELEMENTS-COMBAT.md).

### Sistema 16 — Jardim de habilidades — implementado

Integra habilidades conhecidas por receitas curadas, não destrutivas e sigilosas. Um recurso de cultivo nasce somente de marcos explícitos e a técnica híbrida volta ao ciclo normal de prática. Consulte [Sistema 16](SYSTEM-SKILL-GARDEN.md).

### Sistema 17 — NPCs persistentes, agenda e mundo vivo — implementado

Introduz estado mínimo de NPC, agenda por período, memória de fatos fechados e presenças derivadas. A simulação avança somente pelo relógio canônico. Consulte [Sistema 17](SYSTEM-PERSISTENT-NPCS-LIVING-WORLD.md).

### Presença e interação com NPCs e criaturas — sistema aprovado

Explorar deve permitir encontrar NPCs, animais ou criaturas no mundo. Quando o encontro acontecer, diálogo, narrativa e escolhas podem assumir temporariamente o controle e depois devolver o jogador à exploração.

O Sistema 8 representa entidades, presenças descobertas por local, disponibilidade derivada, resolução e ações contextuais. O Sistema 17 especifica a futura camada persistente e temporal para NPCs sem substituir presenças.

### Interações com elementos do cenário

O jogador deverá interagir com elementos e pessoas presentes na localização, além de navegar e explorar. Coleta e crafting já cobrem parte disso, mas ainda não existe um sistema genérico de objetos interativos. O contrato agora está em [Sistema 18](SYSTEM-18-INTERACTABLE-WORLD.md).

### Expansão de exploração, recursos, crafting e cozinha

O conceito de áreas com exploração própria, passagens escondidas, recursos renováveis de curto ou longo prazo, populações esgotáveis, materiais, fogueira, fabricação e cozinha foi definido pelo autor. O núcleo está implementado; novos conteúdos e regras devem ser discutidos em fatias menores.

### Trama principal, conteúdo opcional e conclusão

O jogador deve poder avançar a trama principal, desenvolver encontros e descobrir conteúdo opcional. A ideia de concluir rotas ou buscar 100% foi discutida como referência de experiência. Critérios globais, finais, rotas incompatíveis e recompensas ainda não foram definidos.

### Assentamentos, facções e novos modelos de sociedade

São parte confirmada do mundo e da trama futura. Construção, administração, território e política receberam contratos nos [Sistemas 28](SYSTEM-28-BASES-TERRITORIES-SETTLEMENTS.md) e [29](SYSTEM-29-FACTIONS-DIPLOMACY-POLITICS.md). Guerra em massa continua em discussão.

### Vida, poder, pertencimento e liderança

O motor deve permitir que a mesma trajetória combine vida familiar, crescimento de poder, participação em grupos e construção social. Relacionamentos, registro e rankings, organizações, Númen avançado, party, ciclo de vida, família, profissões, economia, assentamentos e política estão especificados nos Sistemas 19 a 29. Eles são blocos combináveis, não modos excludentes.

## Ideias em discussão, sem compromisso de implementação

- minijogos dentro de interações ou encontros;
- minijogos de treino ou experimentação ligados ao Sistema;
- permitir protagonista não humano, criar raças não humanas concretas ou estender o Sistema a todos os seres/raças;
- fórmulas definitivas de nível, proficiência, Eteris, Númen e velocidade de conjuração; o Sistema 13 aprovou somente um marco protótipo para provar seu ciclo;
- comportamentos avançados de oponentes além do contrato determinístico do Sistema 15;
- expansão do mapa visual para uma visão global ou regional;
- notificações mais amplas do Sistema além do feedback previsto para objetivos;
- progressão extensa de NPCs além do estado mínimo do Sistema 17;
- rotas principais e opcionais com métricas próprias;
- itens e áreas bônus encontrados dentro de áreas exploráveis;
- aprofundamento de caça e manejo ecológico além da coleta abstrata.
- guerra territorial e batalhas em massa;
- morte permanente, herança de protagonista e múltiplas gerações jogáveis;
- simulação ampla de oferta, demanda, eleições e comportamento político autônomo.

Esses tópicos podem virar sistemas, conteúdo simples ou ser descartados. Precisam ser discutidos antes de entrarem no roadmap aprovado.

## Ainda não discutido / sem certeza de implementação

Os itens abaixo apareceram como possibilidades técnicas ou foram inferidos pelos agentes, mas não foram definidos pelo autor:

- comportamento autônomo de criaturas fora do combate;
- consequências irreversíveis de sobrevivência, como morte permanente, perda de save ou bloqueio total de ações;
- clima, estações e efeitos ambientais;
- durabilidade, qualidade, combustível consumível e ferramentas especializadas além do Sistema 14;
- viagem rápida, portais e conexões especiais;
- geração procedural;
- multiplayer, conta, backend ou sincronização em nuvem;
- monetização, anúncios ou loja;
- editor de campanhas;
- arte final e estilo visual definitivo.

Não crie numeração de sistema, contrato, schema ou prompt de implementação para esses itens até que o autor os discuta e autorize. Esta restrição não se aplica aos Sistemas 18 a 29, que já possuem especificações próprias; os Sistemas 18 a 21 já foram implementados.

## Decisões negativas atuais

- IA em runtime não faz parte do projeto atual.
- Backend, login, telemetria e serviços pagos não fazem parte do protótipo atual.
- Unity, Unreal e motores gráficos pesados não são necessários para a experiência pretendida.
- Nenhum sistema futuro é autorizado apenas por aparecer nesta documentação.

## Meta atual e próxima decisão

O marco mínimo da integração explorável foi atingido: o jogador desperta, escolhe uma capacidade, explora e encontra conteúdo por ações no mundo.

**Os Sistemas 1 a 29 estão implementados e consolidados.** O save atual é o schema 23. O programa de mundo especificado em 17 de setembro de 2026 está completo dentro do recorte aprovado.

Antes de um novo eixo:

1. escolher uma única etapa especificada e obter autorização explícita para implementá-la;
2. preservar determinismo, aplicação única de tempo, sigilo e atomicidade em cada evolução de schema proposta;
3. não transformar detalhes fora das especificações — fórmulas definitivas, raças concretas, posicionamento, guerra ou simulação autônoma — em requisitos.
