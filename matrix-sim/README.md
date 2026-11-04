# Matrix Sim

Experimento de simulação inspirado na ideia de uma realidade construída de Matrix. Nome provisório.

## Estado atual

Etapa 3: primeira espécie, os Folhins, em um mundo com ciclos ambientais. Implementado em React, TypeScript e Canvas 2D, com território procedural de 96 × 96 regiões, solo, clima, vegetação e pequenos herbívoros. As escolhas podem mudar conforme os testes.

## Executar localmente

Requer Node.js 24 LTS e npm. Dentro de `matrix-sim`:

```bash
npm install
npm run dev
```

Abra a URL exibida pelo Vite. Para verificar as regras, execute `npm test`. Para verificar os tipos e gerar a versão de produção, execute `npm run build`.

## Interface

- O mundo ocupa a janela inteira. A barra superior mostra semente, estação, dia, ano, população e bandos vivos, além de iniciar ou pausar, avançar um dia, velocidade e progresso do dia. Os botões nas pontas recolhem os painéis laterais.
- O mapa fica no centro, quadrado e no maior tamanho que cabe. Camadas, territórios, opções (chuva e neve, animação, grade e ajuda), legenda recolhível e zoom flutuam sobre ele. A roda do mouse aproxima e afasta mantendo o ponto sob o cursor.
- O painel esquerdo tem abas: **Habitantes** (bandos e o Folhim acompanhado), **Região** (a célula fixada e o bando que a influencia), **Mundo** (ambiente, composição, criar outro mundo e exportar) e **Códice** (habilidades e formas de evolução). Clicar no terreno abre Região; clicar num Folhim abre Habitantes.
- A **Voz do Mundo**, à direita, narra os acontecimentos do mais recente ao mais antigo, com filtros por Vida, Bandos e Mundo e um atalho para acompanhar o Folhim citado. Chegadas, mudanças de liderança e de cultura, trocas de estação e bandos extintos também aparecem como anúncio sobre o mapa. Estações e extinções são deduzidas na interface a partir de estados consecutivos e não entram no JSON exportado.
- Abaixo de 1000 px de largura, as áreas se empilham com o mapa primeiro e a página volta a rolar.

## O que já existe

- População inicial de 20 Folhins em uma área conectada com alimento. Em mapas sem habitat adequado, nenhum indivíduo é introduzido.
- Alimentação que consome frutos e biomassa de cobertura rasteira e arbustos; árvores não são comidas diretamente.
- Decisões por necessidade de energia, percepção local, curiosidade individual, memória de alimento por até 14 dias e lembrança dos últimos oito lugares visitados.
- Movimento por caminhos transitáveis, evitando água e montanhas, um deslocamento de até uma região por dia. O tempo e os multiplicadores existentes controlam o ritmo das decisões.
- Reprodução entre dois adultos próximos e bem alimentados, morte por fome ou velhice, identidade e geração dos filhotes, histórico individual e acontecimentos da população.
- Habitantes selecionáveis no mapa e botão “Localizar um Folhim”, com câmera acompanhando o indivíduo. Clique no terreno para deixar de acompanhar.

- Terreno com água, areia, planície, floresta e montanha, gerado por semente reproduzível.
- Controle do nível da água, aplicado ao gerar. O valor é um limite de altitude e não uma porcentagem de área inundada.
- Camadas de terreno, altitude, umidade, fertilidade, vegetação e alimento; grade opcional.
- Camada **Clima** com chuva e neve localizadas, e cores para 0–6, 7–13, 14–27 ou 28+ dias sem precipitação. A inspeção mostra o tempo local, a tendência climática e os dias secos da região. A camada inclui os corpos d'água, mas dias sem precipitação não significam automaticamente solo sem água.
- Inspeção de região por clique ou pelas setas com o mapa em foco.
- Legendas de terreno com cores e símbolos, e escalas numéricas de cor em cada camada ambiental. A cor da escala usa a mesma função do desenho do mapa.
- Prévia ao passar o mouse, seleção fixada com contorno e resumo de recursos junto ao mapa; link para os detalhes completos.
- Zoom de 1× a 4×, arraste com o mouse ou rolagem por toque, centralização da seleção e retorno à visão completa.
- Ajuda de navegação e explicação dos indicadores, distinguindo biomassa de contagem de plantas. No mapa em foco: setas movem a seleção, `+` e `-` alteram o zoom e `0` mostra o mundo inteiro.
- Visão naturalista em Canvas 2D, com margens interpoladas, texturas procedurais, relevo sombreado, água colorida por profundidade e vegetação desenhada com volume e sombras. O zoom revela os detalhes sem baixar imagens externas.
- Paletas de primavera, verão, outono e inverno, incluindo cobertura clara em áreas elevadas no inverno. As formas e a densidade da vegetação refletem a biomassa de cada região; árvores são uma representação dessa biomassa, não indivíduos simulados.
- Água e paisagem sem animação contínua. O controle “Mostrar chuva e neve” permite precipitação visual apenas enquanto o tempo está rodando e o dia tem precipitação; nas regiões com temperatura de 0 °C ou menos aparecem flocos. Pausar, ocultar o mapa ou desativar o controle interrompe os efeitos. A preferência de movimento reduzido do sistema é respeitada.
- Composição do território e total de alimento disponível.
- Exportação do mundo em JSON, incluindo configuração e células. Importação ainda não implementada.
- Tempo pausável, avanço manual de um dia e velocidades de 0,5×, 1×, 2×, 5× e 10×. Em 1×, cada dia dura aproximadamente 10 segundos; em 0,5×, 20 segundos; em 2×, 5 segundos; em 5×, 2 segundos; em 10×, 1 segundo. Gerar um mundo reinicia o dia, zera seu progresso e pausa o tempo.
- Quatro estações de 90 dias e temperatura influenciada pela estação e altitude. Faixas espaciais de tendência seca, intermediária ou úmida alteram a propensão à precipitação. Frentes são interpoladas espacialmente e evoluem gradualmente entre estados de 18 dias, permitindo chuva localizada e períodos secos prolongados. As tendências não mudam os biomas nem representam um modelo meteorológico real.
- Solo que recebe umidade com chuva ou neve e, semanalmente, pela proximidade da água. A secagem é simples e lenta: perde 2,5 pontos percentuais a cada 7 dias consecutivos sem precipitação, sem cálculo diário de evaporação.
- Crescimento da vegetação e renovação dos frutos a cada 7 dias. Nos dias intermediários, esses recursos ficam estáveis.
- Decomposição a cada 14 dias, devolvendo fertilidade ao solo. O crescimento consome parte dela.
- Vegetação perde 2% da biomassa apenas no ciclo de 14 dias e após pelo menos 14 dias consecutivos com umidade abaixo de 12% ou temperatura inferior a −3 °C. Condições favoráveis zeram essa contagem.
- Resumo do último dia, com as mudanças efetivamente observadas em umidade, vegetação, frutos e decomposição. O painel explica os intervalos; cada avanço automático processa um único dia, independentemente da velocidade.

Altitude, umidade e fertilidade usam escalas relativas. Vegetação, frutos e matéria em decomposição usam unidades abstratas de biomassa. Temperatura em °C é um parâmetro de jogo simplificado. Este é um modelo experimental, sem pretensão de reproduzir ecologia ou clima reais.

Os efeitos gráficos não avançam o relógio, não consomem recursos e não usam a aleatoriedade da simulação. O solo usa interpolação visual entre centros de regiões para suavizar as margens; a grade e a inspeção continuam mostrando as células originais. As camadas de dados mantêm cores exatas e não recebem chuva, vegetação decorativa ou sombras da paisagem.

## Desempenho

- O cálculo dos passos roda em um Web Worker. O React recebe atualizações parciais e não executa o motor em atualizações de estado, evitando o cálculo duplicado das verificações do modo estrito de desenvolvimento.
- O desenho roda em outro Web Worker com OffscreenCanvas. Apenas o quadro pronto é transferido para a interface; cada ImageBitmap é liberado após uso ou descarte.
- Há no máximo um desenho em andamento e um estado pendente substituível. Mudanças rápidas de camada e zoom descartam resultados incompatíveis. Quadros anteriores do mesmo mundo e da mesma visão podem ser apresentados enquanto o mais recente aguarda, evitando que máquinas lentas fiquem sem imagem.
- O relógio preserva a fração do dia ao pausar ou trocar de velocidade. A barra de progresso é atualizada diretamente, sem redesenhar a paisagem ou renderizar novamente todos os painéis. Há no máximo um passo em processamento, sem fila de dias atrasados. Pausar impede novos passos; um passo já enviado termina normalmente. Gerar outro mundo invalida resultados anteriores.
- A vegetação é armazenada em blocos de 16 × 16 regiões. Cada bloco é redesenhado apenas quando sua representação visível muda, com uma margem que preserva copas e sombras entre blocos.
- O fundo do terreno é reutilizado por semana simulada e atualizado na troca de estação. Essa frequência afeta apenas o tom visual do chão; umidade, recursos e demais dados continuam atualizados nas fases de cada região ao longo do dia.
- A resolução da paisagem é de 12 pixels por região na visão inteira e 24 no zoom. Seleção e grade são sobreposições independentes e não exigem redesenhar o terreno.

O navegador precisa oferecer Web Workers e OffscreenCanvas. Falhas aparecem na interface, sem voltar silenciosamente ao cálculo pesado na thread dos controles. Ainda não há renderização restrita à área visível ou motor em WebGL; essas opções podem ser avaliadas se o mapa crescer.

Para diagnóstico, abra a aplicação com `?perfil=1`. O console registra separadamente o tempo de cálculo no worker, o desenho no worker e a apresentação do quadro pronto na interface. Esses números não representam FPS nem incluem todo o custo de composição do navegador. As medições ficam desligadas na navegação normal.

O alimento deriva de 20% da cobertura rasteira, 30% dos arbustos e dos frutos disponíveis, com arredondamento por região na interface. Os Folhins consomem o estoque real, priorizando frutos, depois cobertura rasteira e arbustos. A quantidade efetivamente consumida determina a energia recuperada. Água, areia e montanha não sustentam vegetação nesta versão. A vegetação é tratada por grupos, sem espécies individuais. Os biomas e corpos d'água são fixos: ainda não há rios, fluxo de água, inundação, salinidade, erosão ou mudança de bioma.

## Essência

Cada mundo nasce com 3 a 5 **nascentes de essência**, com nomes gerados pela semente e sempre em terra firme, afastadas entre si. A essência natural de cada região combina a proximidade das nascentes, o bioma (mais em florestas e montanhas, menos na água) e um ruído suave. Ela usa uma sequência aleatória própria: o terreno, a umidade e o alimento das sementes antigas continuam idênticos.

- **Recomposição e difusão:** a cada dia, a essência recupera 3% da diferença até o nível natural. Nos dias múltiplos de 7, também se aproxima 15% da média das regiões vizinhas.
- **Morte:** onde um Folhim morre, a região recebe um pulso de essência, maior quanto mais essência ele carregava. O nível natural sobe 0,4 ponto percentual e não volta: lugares de muitas mortes ficam mais intensos com o tempo.
- **Absorção:** cada Folhim tem uma afinidade de 30% a 100%. Ele absorve essência do chão onde está (o que entra na criatura sai exatamente da região) e perde 1% dos seus pontos por dia. O equilíbrio fica em cerca de 120 × essência do chão × afinidade, com teto de 100 pontos.
- **Atração:** Folhins sem fome preferem caminhar para regiões de essência forte, tanto mais quanto maior a afinidade.
- **Despertar:** ao passar de 50 pontos, o Folhim desperta para a essência uma única vez. A Voz do Mundo anuncia, a ficha registra o dia e o token ganha uma aura. Na semente `origem-001`, os primeiros despertares chegam por volta do dia 90; no dia 120, cerca de 10 de 66 estão despertos.

A camada **Essência** do mapa vai do violeta escuro (ausente) ao ciano claro (intensa). As nascentes aparecem como pontos brilhantes com nome, nas camadas Terreno e Essência; clicar numa delas fixa a região. A aba Região mostra a essência atual, o nível natural e a nascente mais próxima. A Voz do Mundo abre cada mundo narrando suas nascentes e ganhou o filtro Essência. Nesta etapa, despertar ainda não altera o comportamento: é a base para habilidades e evolução.

## Habilidades e evolução

As habilidades são **declaradas** em [`src/simulation/skills.ts`](src/simulation/skills.ts), não escritas dentro do motor. Cada uma diz o que precisa ser vivido para conquistá-la (`needs`), se exige um Folhim desperto, a raridade, o caminho para onde aponta e o efeito. Os efeitos ficam reunidos em `modifiers`, que o motor consulta para visão, custo de andar, gasto diário, disputas e afinidade. Para criar uma habilidade, basta acrescentar um bloco em `skills` e, se ela tiver um efeito novo, uma linha em `modifiers`.

Cada Folhim acumula **feitos**: regiões percorridas, unidades de alimento comidas, dias em seca (região com 14 ou mais dias sem chuva), dias de inverno, dias em essência forte (60% ou mais), disputas vencidas e perdidas. Uma vez por dia, ele conquista toda habilidade cujos requisitos foram atingidos, e a Voz do Mundo registra.

| Habilidade | Raridade | Caminho | Como conquistar | Efeito |
|---|---|---|---|---|
| Faro de Água | Comum | Errante | 45 dias em seca | Com fome, enxerga 1 região a mais |
| Passo Leve | Comum | Errante | 1.200 regiões percorridas | Andar custa metade da energia |
| Estômago Firme | Comum | Guardião | 60 unidades de alimento | Gasta 12% menos energia por dia |
| Pelagem de Inverno | Comum | Guardião | 40 dias de inverno | No inverno, gasta 20% menos energia |
| Couro Grosso | Comum | Guardião | 2 disputas perdidas | Disputas custam metade da energia |
| Garra de Bando | Rara | Guardião | 3 disputas vencidas | Mais força em qualquer disputa |
| Elo da Nascente | Rara | Vidente | Desperto, 40 dias em essência forte | Afinidade +25 pontos |
| Sentido Desperto | Única | Vidente | Desperto, 150 dias em essência forte e 1.500 regiões | Enxerga 2 regiões a mais |

**Evolução:** um Folhim desperto, com 3 habilidades e 70 de essência, evolui uma única vez. Cada habilidade vale um voto para o seu caminho; em empate vale a ordem Guardião, Errante, Vidente. A forma ganha 140 dias de vida e bônus próprios: o **Guardião** tem mais força nas disputas; o **Vidente**, mais afinidade e visão; o **Errante**, mais visão e passo ainda mais leve. No mapa, os evoluídos aparecem maiores e com marca própria (chifres e crista, olho violeta ou capa de folha).

Na semente `origem-001`, as primeiras evoluções chegam por volta do dia 150. No dia 300 são 10 evoluídos (7 Errantes e 3 Guardiões); na `essencia-a`, 3 Errantes. A ficha do Folhim mostra as habilidades, as três mais próximas com progresso, os requisitos da evolução e os feitos. A aba **Códice** lista todas as habilidades e formas, com quantos vivos carregam cada uma.

## Primeira espécie: Folhins

### Variações regionais e bandos

#### Territórios, tendências e animação

A camada **Territórios** colore a área de influência de cada bando, com fronteiras e nomes clicáveis. A expansão parte de uma região ocupada por um integrante, respeita água e montanhas e tem alcance limitado pelo tamanho da população. Zonas com influência semelhante de dois bandos recebem listras. O centro acompanha a distribuição dos integrantes uma vez por dia; bandos extintos perdem a área. Isso representa presença regional, sem construções, conquista ou propriedade permanente. A legenda permite acompanhar o líder e inspecionar a quantidade de regiões do bando.

Cada bando começa com tendências reproduzíveis de ataque, defesa, união e ímpeto de agressão, exibidas de 0 a 100. Ataque favorece o iniciador de um confronto; defesa e até três aliados próximos ajudam quem resiste. União aumenta a proximidade ao líder. Vitórias contra outros bandos aumentam o ímpeto, e derrotas favorecem defesa e união. A prática também melhora lentamente a capacidade usada no confronto. Uma adaptação diária considera o líder atual, a fome e o medo dos integrantes. Os valores ficam entre 10 e 95. Os perfis “Defensivo”, “Ousado”, “Coeso” e “Equilibrado” descrevem a tendência atual e podem mudar; mudanças relevantes ficam no histórico recente do bando. Grupos com ímpeto muito alto também podem disputar sua área quando encontram outro grupo por perto.

Os habitantes viram para a direção horizontal do passo, alternam as patas e movimentam o corpo ao caminhar, mastigam ao comer e reagem visualmente às disputas. A marca colorida liga cada indivíduo ao bando. Pausa, preferência de movimento reduzido e a opção **Animar habitantes** interrompem essas animações. A camada territorial usa um canvas próprio, recalculado quando centro, alcance ou existência dos bandos mudam; energia, gestos e passos dentro do dia não invalidam essa camada.

A introdução padrão distribui 20 habitantes em quatro bandos de até cinco, buscando origens em floresta (Bosque, pelagem verde) e planície (Campina, dourada). Mundos sem um desses habitats usam o que estiver disponível. A variação indica origem, não outra espécie: permanece durante deslocamentos e o filhote acompanha a variação e o bando do primeiro progenitor. Membros saciados tendem a permanecer perto do líder quando conseguem percebê-lo. O losango no mapa identifica a liderança; os cartões de bando localizam seu líder.

Adultos em contato podem disputar alimento escasso, reagir à lembrança de uma agressão ou desafiar o líder do próprio bando. Isso permite conflitos internos, entre bandos da mesma variação e entre variações. A diferença de origem não basta para iniciar uma briga. O ímpeto individual, a energia e uma decisão reproduzível pela semente influenciam o início e o resultado. Cada participante perde seis pontos de energia, sem morrer diretamente pelo confronto; o perdedor recua e passa a evitar o adversário. Há pelo menos 12 dias entre confrontos de um indivíduo. Não há ferimentos ou combate letal nesta etapa.

Cada Folhim lembra até seis adversários: medo e raiva diminuem diariamente. Medo forte prioriza afastamento, enquanto raiva persistente pode motivar outra disputa após o intervalo. Os acontecimentos registram motivo e resultado; desafios vitoriosos mudam o líder, e sua morte abre uma sucessão entre os integrantes vivos. A liderança é uma preferência de proximidade, sem ordens ou estratégia coletiva. Os cartões mostram também bandos extintos.

Herbívoros fictícios controlados por algoritmos, sem chamadas a modelos ou serviços pagos. Cada um tem percepção de 3 a 5 passos transitáveis, curiosidade, apetite, energia e expectativa de vida próprios. Descansam, exploram, procuram alimento e comem conforme o estado atual; a ordem de atualização alterna para não favorecer sempre os mesmos indivíduos.

Dois indivíduos com pelo menos 28 dias, energia mínima de 82 e separados por até três regiões podem gerar um filhote após um intervalo mínimo de 35 dias desde sua chegada ou reprodução anterior. Ambos gastam energia e recebem o intervalo de espera. Não há distinção sexual nesta versão. As características dos filhotes variam por semente e identidade, sem herança genética implementada.

A população tem limite experimental de 200 indivíduos. Cada histórico individual mantém oito registros, a população mantém 40 acontecimentos e os 20 últimos mortos ficam disponíveis para inspeção. O histórico registra alimentação, fome, nascimento e morte; as disputas são não letais, sem predação.

`createWorld()` cria o ambiente sem habitantes para permitir experimentos ambientais isolados. A aplicação introduz o grupo inicial com `populateWorld()` ao abrir ou gerar um mundo. Todo o comportamento continua sendo calculado no worker da simulação e faz parte dos snapshots reproduzíveis.

O calendário e os habitantes têm ritmos separados: cada dia contém 20 passos, de 500 ms em 1×. Os Folhins decidem nesses intervalos e o mapa interpola seus deslocamentos; descanso e alimentação ainda podem mantê-los parados. Idade, gasto de energia, consumo e emoções são proporcionais ao tempo simulado, sem acelerar vinte vezes só porque há mais passos. As probabilidades de confronto também são ajustadas à fração do dia.

Cada região tem uma fase fixa de atualização ambiental dentro do dia. Chuva, solo, crescimento semanal, renovação e apodrecimento semanal dos frutos e decomposição quinzenal são processados nessas fases, evitando uma mudança simultânea do mapa inteiro. Os prazos continuam em dias; a perda de vegetação segue a tolerância ao estresse já existente. Árvores ainda representam biomassa coletiva, sem idade ou morte individual de cada árvore.

O worker envia apenas os habitantes e as células alteradas em cada mensagem. O cenário é redesenhado no máximo uma vez por segundo durante a reprodução; mudanças de camada ou zoom são imediatas. Os habitantes se movem numa camada própria. O relógio agrupa passos em velocidades altas e descarta atrasos grandes, sem criar fila de recuperação. Em carga alta, o tempo real pode levar mais que o prazo nominal para preservar a sequência de estados. O avanço manual completa os passos restantes até a próxima virada de dia.

No JSON de versão 10, `day` e `tick` preservam inclusive um momento no meio do dia, junto ao ambiente e à população: identidades, características, energia, memórias, históricos, pais, variações, bandos, líderes, tendências coletivas, centro territorial, direção de movimento, relações sociais, essência, afinidade, despertar, feitos, habilidades, forma evoluída, nascentes de essência e próximo identificador. As decisões são derivadas da semente e do passo, e o resultado independe de agrupar os mesmos passos ou trocar de velocidade. Exportações anteriores não contêm todos os dados atuais. A neve é uma forma simplificada de precipitação, sem acumulação ou degelo próprios.

Gerar outro mundo substitui o atual; exporte antes se quiser guardá-lo. A aplicação não salva automaticamente ao fechar ou recarregar.

## Ponto de partida

Como hipótese de trabalho, a simulação será executada no navegador, com um mundo, entidades e regras que evoluem ao longo do tempo. O usuário poderá observar e intervir nesse mundo. O formato do mundo, os comportamentos e a experiência ainda serão definidos nas próximas etapas.

O primeiro experimento sugerido é um mundo pequeno em 2D, com entidades simples e controles para iniciar, pausar, avançar um passo e reiniciar. Essa sugestão não fecha o escopo nem exige que o projeto continue em 2D.

## Stack inicial proposta

- **TypeScript:** linguagem da aplicação e do motor da simulação; tipos explícitos para entidades, eventos e estado do mundo.
- **React:** interface de controles, inspeção de entidades e apresentação dos acontecimentos.
- **Vite:** ambiente de desenvolvimento e geração da aplicação para o navegador.
- **Canvas 2D nativo:** desenho inicial do mundo e das entidades, separado dos componentes de interface.
- **CSS:** estilos da interface, sem biblioteca visual adicional nesta etapa.
- **JSON:** exportação e importação de snapshots para guardar e compartilhar experimentos. Persistência automática fica para uma etapa posterior.
- **Vitest:** testes das regras, da passagem do tempo e da reprodução de experimentos quando o motor for implementado.
- **Node.js LTS e npm:** ferramentas locais de desenvolvimento; o primeiro protótipo será executado no navegador. As versões compatíveis serão fixadas ao criar a aplicação, com lockfile versionado.

## Organização prevista

As pastas serão criadas quando houver implementação que precise delas:

```text
src/
  simulation/  # Estado do mundo, entidades, regras, tempo e aleatoriedade
  rendering/   # Representação visual do estado da simulação
  ui/          # Controles e painéis em React
  storage/     # Importação e exportação de snapshots
```

O motor não dependerá de React nem de Canvas. A visualização lerá o estado do mundo e a interface enviará comandos ao motor. Assim, trocar a apresentação não exige reescrever as regras.

O tempo da simulação avançará em passos fixos, independentemente da frequência de desenho. A aleatoriedade usará uma semente explícita, para permitir repetir um experimento com as mesmas regras, versão do motor e sequência de comandos. Snapshots deverão registrar versão, semente, estado do gerador aleatório, passo atual e estado do mundo.

## Evoluções condicionadas aos testes

- **Three.js:** se a experiência pedir um ambiente em 3D, substituindo ou complementando a visualização em Canvas 2D.
- **Web Worker:** se o processamento do mundo começar a prejudicar a resposta da interface.
- **IndexedDB:** quando for necessário manter experimentos maiores no próprio navegador.
- **Backend e banco de dados:** quando houver necessidade de mundo persistente fora do navegador, contas ou acesso compartilhado. A escolha será feita a partir desses requisitos.
- **IA generativa:** se os testes pedirem linguagem, decisões ou narrativas geradas por modelos. Inicialmente, os comportamentos podem ser definidos por regras; chamadas a modelos exigirão uma camada de servidor para proteger credenciais.

## Próxima etapa

Observar os Folhins ao longo das estações: deslocamento, consumo, nascimentos e mortes. Ajustar o ritmo e os comportamentos a partir do que acontecer no mundo. Outras espécies e relações de predação ficam para etapas futuras.

## Referências

- [React](https://react.dev/learn/setup)
- [Vite](https://vite.dev/guide/)
- [Vitest](https://vitest.dev/guide/)
- [Three.js, possível evolução para 3D](https://threejs.org/docs/pages/WebGLRenderer)
