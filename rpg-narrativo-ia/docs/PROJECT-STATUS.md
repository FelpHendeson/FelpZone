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
- depois de uma abertura dirigida, o jogador deve ganhar liberdade para explorar, mapear o mundo e encontrar conteúdo por suas próprias ações;
- narrativa e escolhas devem surgir durante encontros, diálogos, descobertas e outros acontecimentos, em vez de formarem o único loop do jogo.

## Premissa e objetivos narrativos definidos

- A existência passou por um Reset.
- Os planetas cresceram e a geografia foi refeita.
- Não restaram construções ou objetos da civilização anterior; não é um cenário centrado em ruínas pós-apocalípticas.
- Humanos mantiveram memórias, foram espalhados pelo novo mundo e receberam poderes, capacidades mágicas e acesso a um Sistema.
- O Sistema existe para toda a humanidade e ajuda a orientá-la; o protagonista não é um escolhido exclusivo.
- Sem as estruturas anteriores, assentamentos, facções e diferentes modelos de sociedade começam a surgir sob relações de poder ainda instáveis.
- O jogador define nome e sobrenome de um jovem que acabara de atingir a maioridade e desperta sozinho, sem familiares ou aliados.
- A trajetória pode misturar aventura, drama, fantasia e ficção especulativa; o tom deve responder às decisões do jogador.
- A causa do Reset, a origem do Sistema e o desenvolvimento amplo da trama continuam **em discussão** e devem ser construídos em conjunto.

Assentamentos e facções estão confirmados como parte do universo narrativo. Um sistema de administração de assentamento, diplomacia ou facções jogáveis **ainda não foi discutido nem aprovado**.

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
10. retorna à exploração depois das sessões narrativas.

O formato exato de “100%” global, de rotas e de campanha está **em discussão**. Hoje existem progresso local e conclusão agregada de zona, não um sistema completo de conclusão do mundo.

## Sistemas existentes

| Base ou sistema | Situação técnica | O que existe hoje | Limite atual |
| --- | --- | --- | --- |
| MVP narrativo | **Implementado e consolidado** | Personagem, atributos, escolhas, condições, efeitos, inventário, relações, histórico, títulos e campanha inicial. | O conteúdo é curto e provisório. |
| Motor e validação | **Implementado e consolidado** | Estado imutável, validação de campanha, trajetórias, ciclo de vida, erros controlados e validação profunda de save. | Não é um editor de campanhas. |
| Persistência e PWA | **Implementado e consolidado** | `localStorage`, schema 3, migrações v1/v2, continuar/apagar partida e build PWA offline. | Não há conta nem sincronização entre aparelhos. |
| Sistema 1 — Horário e data | **Implementado e consolidado** | Relógio determinístico por períodos e dias, dirigido pelo custo das ações. | Sem calendário de meses/anos ou tempo real. |
| Sistema 2 — Ciclo diário | **Implementado e consolidado** | Eventos de início/fim de período e dia, além de fase visual derivada. | A fase ainda não troca o tema da interface. |
| Sistema 3 — Navegação | **Implementado e consolidado** | Mapa JSON hierárquico, posição, descoberta, desbloqueio, movimento entre pai, filhos e irmãos e primeira representação visual dos arredores. | O mapa visual mostra relações adjacentes; não há visão global, atalhos ou viagem rápida. |
| Sistema 4 — Exploração | **Implementado e consolidado** | Progresso por local, descobertas dirigidas por dados, passagens e conclusão agregada de zona. | Balanceamento e conteúdo ainda são protótipos. |
| Sistema 5 — Recursos e ecologia | **Implementado e consolidado** | Pontos limitados, coleta, renovação curta/longa e população que pode sofrer pressão ou extinção local. | A caça atual é uma abstração de coleta. |
| Sistema 6 — Crafting e cozinha | **Implementado e consolidado** | Receitas, consumo atômico, fogueira, estruturas locais e cozinha por estação. | Poucas receitas; combustível e ferramentas não funcionam ainda. |
| Sistema 7 — Integração explorável | **Implementado e consolidado** | Estado sandbox no save, orquestrador com custo único, superfície mobile, retorno da narrativa e primeiro gatilho de mundo. | Há somente um encontro acionado pelo mundo. |
| Camada de UI/UX jogável | **Implementado; apresentação em protótipo** | HUD persistente, cena dominante, progresso contextual, navegação inferior, mapa adjacente, painéis de ações, mochila visual, ficha do personagem, feedback de descoberta e apresentação própria de encontros. | Ícones e imagens ainda são placeholders; não adiciona clima, nível, peso ou outras regras inexistentes no domínio. |
| Sistema 8 — Presenças e interações | **Fatias 8.1 a 8.3 implementadas; demais fatias aguardando** | Catálogo isolado, estado mínimo, sincronização explícita com descobertas, consulta de presenças conhecidas e planejamento puro de interações. | Sem save, UI, aplicação de tempo, abertura de narrativa, agenda, IA ou combate. |

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

Estas metas fazem parte da visão, mas ainda precisam de especificação antes de implementação:

### Presença e interação com NPCs e criaturas — sistema aprovado

Explorar deve permitir encontrar NPCs, animais ou criaturas no mundo. Quando o encontro acontecer, diálogo, narrativa e escolhas podem assumir temporariamente o controle e depois devolver o jogador à exploração.

O Sistema 8 foi aprovado para representar entidades, presenças descobertas por local, disponibilidade derivada, resolução e ações contextuais. Seu estado persistente futuro será mínimo e registrará ocorrências descobertas e resolvidas. `NPCState` completo, agenda, deslocamento autônomo, reaparecimento, hostilidade e modelo de comportamento continuam sem aprovação.

### Interações com elementos do cenário

O jogador deverá interagir com elementos e pessoas presentes na localização, além de navegar e explorar. Coleta e crafting já cobrem parte disso, mas ainda não existe um sistema genérico de objetos interativos.

### Expansão de exploração, recursos, crafting e cozinha

O conceito de áreas com exploração própria, passagens escondidas, recursos renováveis de curto ou longo prazo, populações esgotáveis, materiais, fogueira, fabricação e cozinha foi definido pelo autor. O núcleo está implementado; novos conteúdos e regras devem ser discutidos em fatias menores.

### Trama principal, conteúdo opcional e conclusão

O jogador deve poder avançar a trama principal, desenvolver encontros e descobrir conteúdo opcional. A ideia de concluir rotas ou buscar 100% foi discutida como referência de experiência. Critérios globais, finais, rotas incompatíveis e recompensas ainda não foram definidos.

### Assentamentos, facções e novos modelos de sociedade

São parte confirmada do mundo e da trama futura. Mecânicas de construção, administração, reputação, política, território ou guerra não foram definidas.

## Ideias em discussão, sem compromisso de implementação

- minijogos dentro de interações ou encontros;
- expansão do mapa visual para uma visão global ou regional;
- objetivos e notificações mais amplos do Sistema;
- progressão extensa de NPCs;
- rotas principais e opcionais com métricas próprias;
- itens e áreas bônus encontrados dentro de áreas exploráveis;
- aprofundamento de caça e manejo ecológico além da coleta abstrata.

Esses tópicos podem virar sistemas, conteúdo simples ou ser descartados. Precisam ser discutidos antes de entrarem no roadmap aprovado.

## Ainda não discutido / sem certeza de implementação

Os itens abaixo apareceram como possibilidades técnicas ou foram inferidos pelos agentes, mas não foram definidos pelo autor:

- `NPCState` persistente como estrutura própria do save;
- agenda e deslocamento automático de NPCs por horário;
- comportamento autônomo ou IA de criaturas;
- combate, seja tático, automático ou baseado em escolhas;
- grupo ou sistema de companheiros;
- sobrevivência automática que reduza fome, energia, água ou saúde com o tempo;
- clima, estações e efeitos ambientais;
- ferramentas, equipamentos, durabilidade, qualidade e combustível consumível;
- comércio, mercado e economia;
- administração jogável de assentamentos ou facções;
- viagem rápida, portais e conexões especiais;
- geração procedural;
- multiplayer, conta, backend ou sincronização em nuvem;
- monetização, anúncios ou loja;
- editor de campanhas;
- arte final e estilo visual definitivo.

Não crie numeração de sistema, contrato, schema ou prompt de implementação para esses itens até que o autor os discuta e autorize.

## Decisões negativas atuais

- IA em runtime não faz parte do projeto atual.
- Backend, login, telemetria e serviços pagos não fazem parte do protótipo atual.
- Unity, Unreal e motores gráficos pesados não são necessários para a experiência pretendida.
- Nenhum sistema futuro é autorizado apenas por aparecer nesta documentação.

## Meta atual e próxima decisão

O marco mínimo da integração explorável foi atingido: o jogador desperta, escolhe uma capacidade, explora, aciona o primeiro encontro e retorna ao sandbox.

**O Sistema 8 foi aprovado e especificado.** As Fatias 8.1 a 8.3 estão implementadas isoladamente. A próxima implementação autorizada é a Fatia 8.4 — estado integrado e orquestração — somente depois de revisão e autorização. Consulte [Sistema 8 — Presenças e interações](SYSTEM-PRESENCES.md).

Antes de qualquer próxima implementação:

1. revisar a Fatia 8.3 contra o contrato;
2. obter autorização antes de iniciar a Fatia 8.4;
3. não promover possibilidades futuras a requisitos.
