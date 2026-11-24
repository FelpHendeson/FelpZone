# Decisões e perguntas abertas

Mantém separado o que o **autor decidiu** do que é **proposta**. Em divergência, a solicitação mais recente do autor prevalece.

## Decisões do autor (23/11/2026)

1. Projeto **novo**, independente do LionHearth (`idle-guilda`).
2. Nome de pasta de trabalho: `idle-personagem-unico` (pode ser trocado; o autor ainda não escolheu o nome do jogo).
3. **Primeiro 100% web, depois port mobile.**
4. **Uma atividade por vez** (combate também é atividade).
5. Offline: **12 horas**.
6. O jogo **não tem fim**; mais conteúdo entra sempre. Combinações livres, bots, torneios, rankings, temporadas e recompensas.
7. **Sem permadeath.** Morte leva a um reino da morte onde só se combate, com itens e um set nomeado único. (Nome, duração, Barqueiro, Eco da Morte e *O Retornado* são propostas do agente.)
8. Sorteio **ponto a ponto**, com chances limitadas; pode aceitar antes; permite combinações excêntricas; **até 3 personagens por conta**, via item de reroll.
9. Itens **nomeados** estão fora da raridade convencional; **uma unidade de cada** por personagem.
10. Gold: entra por venda aos estabelecimentos do jogo; sai em produção, fusões e estabelecimentos.
11. Habilidades ativas **como no LionHearth**.
12. Viagem entre locais ≤ 10 s com "Movendo-se até…"; dentro da cidade, instantânea.
13. Estrutura de interface: abas inferiores + sub-abas no topo; abas Atividades, Combate, Inventário, Mapa, Missões.
14. Ranks da guilda **F → SSS → Lendário → Mítico → Supremo → Divino**.
15. Habilidades: físicas e mágicas (subtipos), passivas/ativas, permanentes/com duração, podem afetar coleta e produção.
16. Pets: reais e espirituais, raridade, nome, atividades próprias, modo União.
17. Acessórios e relíquias no mesmo molde do resto.

### Decisões de 23/11 (tarde)

18. **Cada personagem é separado**: ficha, mochila, gold, missões e rank de guilda próprios. Só um joga por vez.
19. **Pets por atividade**: 1 pet por atividade (inicialmente), o mesmo pet pode estar em todas, e ele só trabalha quando o personagem trabalha naquela atividade. Treino, descanso e alimentação do pet são separados.
20. **Origens**: personagens comuns têm lore básica; personagens **especiais** têm lore única e podem nascer com **besta espiritual vinculada** (exemplos: *Fruto do Vínculo*, *12º Filho do Clã Ironblood*). **Mecânicas de história** podem vir depois.
21. **Aprovou as propostas do agente** listadas abaixo (P1 a P12), exceto o que estiver em "Perguntas abertas".
22. O trabalho pode ir direto para a `main`.

### Decisões de 23/11 (fim da tarde)

23. **Conta compartilhada** (conquistas e o que o agente achar justo): cada personagem é uma existência diferente. Ver GDD §4.1 para a divisão conta × personagem.
24. **Cuidados do pet dependem da atividade**: se o pet está na atividade de descanso, o personagem não está trabalhando ali. São atividades do personagem, uma de cada vez.
25. **Origens** inspiradas em obras de ficção, com origens próprias criadas; catálogo em `ORIGENS.md`.

## Propostas do agente aguardando aprovação

| # | Proposta | Onde |
| --- | --- | --- |
| P1 | **5 chances** no sorteio (a última é obrigatória). | GDD §4.1 |
| P2 | **Raridades**: Comum → Incomum → Raro → Épico → **Ancestral** → **Primordial**, para não colidir com os ranks Lendário/Mítico. | GDD §9.1 |
| P3 | Oito raças e doze cores iniciais. | GDD §3 |
| P4 | **Marca da Anomalia** para combinações excêntricas. | GDD §4.2 |
| P5 | **Orçamento de raridade** na cascata do sorteio. | GDD §4.2 |
| P6 | Oito status; fórmula de piso/teto. | GDD §5 |
| P7 | Viagem **só ao mudar de local** (não a cada ciclo). | GDD §8.1 |
| P8 | **O Limiar**, Barqueiro, Eco da Morte, set *O Retornado*. | GDD §10 |
| P9 | **Recuo automático** por % de vida. | GDD §7 |
| P10 | Postgres (Neon) + Redis; **adiar banco até a F9**. | ARQUITETURA §6 |
| P11 | Motor com ciclos para atividades e passos de 0,5 s para combate. | ARQUITETURA §3.1 |
| P12 | Nível máximo 50 no Ato I. | GDD §5.3 |
| P13 | Origem comum gerada por modelo (92%) e origem especial escrita à mão (8%), com restrições de raça. | GDD §3.4 e §4.2 |
| P14 | Pets com **Fome** e **Energia**; cuidados por cronômetro próprio. | GDD §13 |

## Perguntas abertas

1. **Origens especiais**: 8% de chance e restrição por raça (proposta) estão bons? Das 22 origens do catálogo, quais cortar, trocar ou reescrever?
2. **Cuidados do pet**: confirme a leitura de "depende da atividade": alimentar, descansar e treinar são atividades do personagem (uma de cada vez), e o pet só rende onde o personagem está.
3. **Nome do jogo.** Só para trocar o nome de trabalho e o projeto Vercel.
3. **Arte**: pixel art? Sem gráficos no começo, mas qual direção de estilo futura?
4. **Competição na infraestrutura**: ok adiar a decisão para a F12?
5. **Hobby da Vercel**: ok seguir enquanto o jogo for pessoal e não comercial?
6. **Tom**: o autor gosta de humor ácido e temas sombrios; os textos devem seguir esse tom (Limiar, Barqueiro, Trevas)?

### Da F1 (sorteio), para o autor conferir

**24/11/2026:** o autor aprovou a F1 "por ora". Os itens abaixo valem como estão até ele pedir mudança.

7. **Primordiais das raças raras**: com os custos do prompt da F1 (raça Rara 25, Primordial 80, saldo 100), Draconato e Silfo **nunca** tiram dom Primordial. Manter assim ou baixar o custo da raça Rara para 20? Ver `CALIBRACAO.md`.
8. **"5 chances"** foi lido como **5 tentativas no total** (a 1ª + 4 rerolagens), como no prompt ("a 5ª tentativa é obrigatória"). O GDD dizia "5 chances de rerolar"; se a intenção for 6 tentativas, é só mudar `CONFIG_SORTEIO.tentativas`.
9. **Tags de afinidade** de raças e cores (vocabulário de 30 tags em `dados/tipos.ts`) e, por consequência, quais pares são excêntricos. **Sem Chama** ficou **sem tags**: é excêntrico para todas as raças e sempre traz uma Marca da Anomalia. Lobisomem + Ser das Trevas ficou excêntrico, como no exemplo do GDD.
10. **Marca da Anomalia**: 7 marcas curadas à mão; as outras 58 saem de um gerador por modelos (núcleo da raça + complemento do core). Os nomes gerados são aceitáveis, mas o autor pode querer reescrever os pares que mais saem.
11. **Traço de personalidade** (12, narrativo) entrou como "detalhe final" da cascata e fica na ficha. "Dons menores" não entraram.
12. **Textos novos**: 104 dons, técnicas de 11 cores (o Ser das Trevas é do autor), 12 traços e as frases do gerador de origem comum foram escritos pelo agente, no tom sombrio com humor seco.

### Da F2 (treino), para o autor conferir

13. **Alvos de ritmo** propostos: nível 10 no 1º dia, nível 20 na 1ª semana, nível 50 em 6–8 semanas para quem abre o jogo 3×/dia (quem abre 1×/dia leva ~2×, por causa do limite de 12 h). Os números atuais batem com isso.
14. **Status lotam depois do nível 20** (77–97% da faixa): o treino perde peso no meio do Ato I. Proposta: revisar o ganho junto com coleta e combate (F3–F4), não agora. Ver `CALIBRACAO.md`.
15. **Trocar de atividade descarta o ciclo parcial** (no máximo 30 s perdidos). Alternativa: guardar o progresso por atividade.
16. **Fração de piso por raça** (Humano 0,65, Silfo 0,50, Draconato 0,45, demais 0,55) e **perfis numéricos** das 8 raças. O GDD tinha 0,55 fixo.
17. **Corpo de Vento** deixa o Silfo ~10% mais rápido também em XP (ciclos mais curtos). Manter ou fazer a velocidade valer só para status?
18. **Efeitos aplicados**: só os que dependem de status, teto, treino, XP ou velocidade (lista no GDD §5.2). *Centelha Humana* e *Sangue de Lua* continuam pendentes (dependem de regra por faixa de nível e de dia/noite).

### Da F3 (mapa e coleta), para o autor conferir

19. **Mapa do Ato I**: Vale de Pedravau com Pedravau, Bosque Raso, Mina Velha e Lago Espelho (nomes e textos do agente). Agricultura acontece nas Hortas do Muro, dentro da cidade.
20. **Mochila cheia**: a coleta continua dando XP, mas o que não cabe se perde. Alternativa: o personagem para de coletar sozinho.
21. **Vender só em Pedravau**: quem está coletando longe precisa ir à cidade (a viagem para a atividade). Alternativa: vender à distância com taxa.
22. **Curva de ofício** ajustada pelo bot (base 40 → 150) para o tier 3 abrir em ~4 dias. Alvos propostos em `CALIBRACAO.md`.
23. **Gold sem destino até a F8**: além das ferramentas, não há o que comprar; os preços são provisórios.
24. **Náufrago das Estrelas**: "−5% no preço de compra" foi lido literalmente (paga 5% menos). A lore ("não entende de moeda") sugere o contrário; se for fraqueza, troca-se o sinal.

### Da F4 (combate), para o autor conferir

25. **Desmaio provisório**: até o Limiar (F6), vida zero = acordar em Pedravau com 50% de vida, ocioso, sem perder nada.
26. **Fórmula de dano** ataque² ÷ (ataque + defesa), em vez de ataque − defesa: defesa nunca anula o golpe.
27. **Recuos frequentes** (10–25/h mesmo preparado), que tiram ~20–30% do tempo de caça. Manter ou curar mais rápido entre lutas?
28. **Fugir do chefe o adia** por mais 50 abates (correção de um bug achado pelo bot).
29. **Equipamento sem afixos**, 5 slots e 3 tiers; tier 3 só por drop. Manoplas, mão secundária, acessórios e relíquia ficam para depois.
30. **Nomes e textos** das 6 áreas, 24 monstros e 17 equipamentos, escritos pelo agente.
31. **Bestiário** só conta abates; os bônus por marcos (100/1.000/5.000) ficam para a F11.

### Da F5 (habilidades), para o autor conferir

32. **Ramos do core**: 2 por core, no nível 10, escolha permanente, cada um com uma técnica nova (nomes e efeitos do agente).
33. **Técnicas reinterpretadas** quando o texto da F1 dependia de sistemas que não existem: Improviso virou reforço de ataque; Ordem de Ataque é um golpe (fica mais forte com pets na F10); Voto de Aurora dá +6% de ataque (não há tipos de criatura ainda); Folha em Branco dá +1 slot de passiva só por ser conhecida.
34. **Equilíbrio entre cores**: cores de combate (Chama, Tempestade, Domador) ajudam muito mais na caça que os de coleta (Andarilho, Sem Chama). Intencional, mas vale conferir.
35. **Maestria**: estágio II em 1,5 h de prática, III em 15 h, por habilidade.
36. **Livros** custam 300 g (comuns) e 900 g (incomuns); são o primeiro gasto de gold além das ferramentas e armas.
37. **Órfão do Templo Cinzento** passou a nascer sabendo Eco dos Antigos (a "técnica espiritual" do texto).

### Da F6 (O Limiar), para o autor conferir

38. **"Atributos reduzidos"** no Limiar foi lido como **do personagem** (75% de ataque e defesa), compensado pelos drops exclusivos.
39. **Sem segunda morte no Limiar**: com a vida a zero, o personagem se recompõe em 3 s e volta a lutar contra o mesmo monstro (sem isso, os chefes eram impossíveis).
40. **"Volta sozinha" × "espera na cidade"**: o GDD diz as duas coisas. Implementei a atividade anterior voltando sozinha (com viagem), o que dá o custo de tempo sem desperdiçar o resto do período offline.
41. **Eco da Morte** conta as outras mortes das últimas 2 h (1 h para o Devedor); morrer em sequência alonga cada estadia e melhora os drops.
42. **O Retornado** leva ~20 h de Limiar para completar; bônus de 1% por morte, até 25%.
43. **Essência do Limiar** é uma moeda do personagem (não ocupa a mochila) e por enquanto só serve para o pedágio.
44. **Títulos** por mortes aparecem em Personagem → Títulos, ainda sem bônus.

### Da F7 (missões e guilda), para o autor conferir

45. **Autorização**: o autor pediu para seguir da F7 à F13 "sem parar"; cada fatia continua com testes, revisão no navegador, documentação e relatório.
46. **Curva de XP** mudou para 150 × L² pelo bot da cadeia completa (nível 50 em ~5 semanas jogando tudo; quem só treina leva mais de 200 dias).
47. **Missões contam a partir do aceite** (nada retroativo) e só pagam ao entregar, no local de quem deu.
48. **Ranks F → S** no Ato I; prova de promoção = chefe da área do rank. Os ranks acima de S ficam para os próximos Atos.
49. **Bônus por rank**: −2% nas compras e +2% de coleta por rank (acesso a lojas, subáreas e vagas de pet fica para depois).
50. **NPCs e textos** (Iolanda, Brom, Tico, Pescador Mudo) são do agente.
51. **Meta "Ida e volta"** pede voltar do Limiar: quem nunca morre fica parado na 8ª meta.

### Da F8 (forja, produção e nomeados), para o autor conferir

52. **Ofícios de produção**: Ferreiro (forja), Alquimista e Cozinheiro, com a curva de XP da coleta. Carpintaria e costura ficam para depois.
53. **Fusão por "+N" em vez de raridade nova por item**: cada equipamento comum ganhou versões +1 a +3 (raridade sobe um degrau por nível). Assim "3 iguais → 1 da raridade seguinte" vale sem criar 4 vezes o catálogo à mão.
54. **Falha parcial** perde 1 dos 3; o material e o gold da tentativa são gastos sempre. *Pity* em 3 falhas seguidas no mesmo item.
55. **Poções automáticas** com vida abaixo de 40% (a mais forte primeiro, uma a cada 10 s). Não há botão de usar: é um jogo idle.
56. **Relíquias são nomeadas** (uma de cada, não se vendem nem se fundem) e caem de chefes de área e do Limiar.
57. **Nomeados de origem** chegam na mochila ao criar o personagem (e na migração v8 → v9 para quem já tinha a origem).
58. **"Vender tudo"** deixa de fora poções e nomeados, para não perder o que o combate usa nem o que é único.
59. **Receitas** (materiais e números) são do agente e foram recalibradas pelo bot (ver `CALIBRACAO.md`).

### Da F9 (conta e sincronização), para o autor conferir

60. **Banco não criado**: o autor não autorizou custo. A API está pronta e testada (inclusive no navegador, com um Redis local de mentira); sem as variáveis da Upstash, responde 503 e o jogo segue local. **Para ativar:** na Vercel, projeto `idle-personagem-unico` → Storage/Marketplace → Upstash (Redis), ligar ao projeto (cria `KV_REST_API_URL` e `KV_REST_API_TOKEN`) e fazer um novo deploy. O plano gratuito da Upstash basta para começar.
61. **Upstash (Redis) em vez de Postgres** na F9: conta e save cabem em chave-valor; Postgres fica para ranking/temporadas (F12), se precisar.
62. **Conta sem e-mail**: nome (3 a 20 caracteres) e senha (8 a 128). Sem recuperação de senha por enquanto (não guardamos dado pessoal).
63. **Token bearer** em vez de cookie `httpOnly`: o mesmo serve à web e ao app mobile. Fica no `localStorage`; sair apaga a sessão no servidor.
64. **Primeira sincronização**: o save do aparelho sobe para a conta (o relógio dele é limitado ao do servidor). Se a conta já tem jogo, a pessoa escolhe qual fica.
65. **Pergaminho do Novo Destino** nos ranks C e A de cada personagem (até 9 guardados); o 2º e o 3º personagem gastam um no início do sorteio, sem devolução.
66. **Conquistas sem instante**: o cofre guarda só quais foram obtidas (assim dividir o tempo não muda nada). Todas olham para o que nunca diminui (nível, mortes, rank, bestiário).
67. **Só o ativo avança**: os outros personagens ficam parados (o relógio é da conta). Trocar credita o tempo ao que estava ativo.

### Da F10 (pets), para o autor conferir

68. **Vaga por categoria**, não por atividade exata: Treino (com aprendizado), Coleta, Produção e Combate, mais a vaga de Cuidados. Assim "1 pet por atividade" fica simples de configurar.
69. **Energia e Fome em tempo de trabalho** (8 h e 12 h): o pet só gasta quando o personagem trabalha onde ele está; viagem, Limiar e cuidados não gastam.
70. **Pets ajudam com bônus**, não lutam como personagens. Cada espécie tem 1 ou 2 bônus (ataque, coleta, produção, achados, mochila, treino).
71. **Espirituais** = as bestas vinculadas das origens: sem fome, não se soltam, crescem com o Espírito. A União dobra o bônus por 10 min.
72. **Doma** por abate com Laço de doma (0,07%, ~1 pet a cada 5 h de caça na Trilha dos Lobos); o laço só se gasta quando doma.
73. **Laço Firme** (Domador) mudou: "cuidar dos pets leva menos tempo" (era "cansam mais devagar", que exigiria frações de tempo e quebraria a divisão exata do avanço).
74. **Fruto do Vínculo**: "+Sincronia" virou "União 50% mais longa" (efeito simples e verificável).
75. **Estábulo** em Pedravau (subárea nova), com 4 espécies à venda e o Laço de doma.

### Da F11 (mundo vivo), para o autor conferir

76. **1 h real = 1 dia**, noite das 19h às 5h. O relógio e o clima são funções do instante: o mundo é o mesmo para todos.
77. **Clima único** para o Vale de Pedravau (a única região do Ato I), em blocos de 2 h reais.
78. **Efeitos de noite e clima** são bônus pequenos (5% a 15%); a noite também dobra os monstros raros. Recursos e monstros exclusivos de um clima ficam para depois.
79. **Eventos** com semente própria (personagem + número do sorteio), separada do RNG das atividades: o que aparece não depende de como o tempo foi dividido. Até 3 esperando; os outros sorteios se perdem.
80. **Crônica**: marcos sem data (só o que nunca diminui) e registros com data (escolhas e capítulos), até 60.
81. **Bônus dos títulos** por mortes: −5% de Limiar; +3% de defesa e −5% de Limiar; +5% de ataque. Somam-se.
82. **Arcos de origem** gerados a partir do gancho de cada origem (3 capítulos iguais em estrutura). Textos próprios por origem e escolhas ramificadas são um bom trabalho para o autor.
83. A **Fome da Noite** (Sangue-Pálido) ganhou o bônus noturno; o roubo de vida continua pendente.

### Da F12 (competição), para o autor conferir

84. **Duelo próprio**, mais simples que o combate de área: só status de combate, técnicas de golpe, crítico e esquiva; 2 min no máximo (depois, vence quem tem mais vida em fração). Pets e mundo não entram.
85. **Arena contra bots** no próprio aparelho (sem banco); 10 lutas por dia; Elo K=32. O rating do bot oponente é o seu ± 150.
86. **Pareamento** pelo nível (±2) e pelo treino (ocupação da faixa de status ±10%), para o novato não perder sempre.
87. **Torneio** de 16 resolvido pela semente da semana, com o build inscrito; o prêmio é resgatado depois que a semana acaba.
88. **Temporada** de 8 semanas; tema em rodízio de 4; relíquia do tema com 2.500 pontos (~5 semanas para um jogador médio).
89. **Ranking** local: o jogador entre 20 bots com pontos pela semente e pelo andamento da temporada. Ranking global precisa de banco.
90. **Builds de outros jogadores** (com banco): registro e lista na API; só servem ao Campo de Provas por enquanto.
91. **Histórico de temporadas** guardado no personagem (o GDD põe no cofre da conta; fica para quando houver cosméticos).

### Da F13 (acabamento web), para o autor conferir

92. **Service worker** guarda só a interface (páginas e arquivos estáticos); a API nunca entra em cache. O jogo já salva no aparelho, então abre e joga sem rede.
93. **Sons** sintetizados no navegador (sem arquivos), **desligados por padrão**; liga em Personagem → Conta.
94. **Arte**: ícone do app desenhado em SVG pelo agente (figura sob a lua, no anel dourado). Ilustrações de monstros e personagens ficam para um artista.
95. **CSP** com `'unsafe-inline'` nos scripts por causa da hidratação do Next; *nonce* fica para quando houver tráfego (ver `docs/SEGURANCA.md`).
96. **Build da Arena** registrado na API passa a ser gerado do save do servidor (o aparelho não escolhe o próprio build).
97. **Balanceamento final**: nenhum número do jogo mudou na F13; o bot passou a usar fusão e ampliação de mochila, e o gold do 60º dia caiu de 4,6 milhões para 0,5 milhão. Os ralos funcionam; quem não os usa acumula.


## Diretrizes do autor pós-auditoria (24/11/2026)

98. **[Autor]** Tela de apresentação e autenticação; conta representa jogador, não navegador. Mesmo progresso em celular e computador; contas isoladas.
99. **[Autor]** Agente pode melhorar lógica, interface e navegação além das descrições literais; mudanças centrais de game design devem ser justificadas e documentadas.
100. **[Autor]** Criar tutorial para orientar o jogador.
101. **[Autor]** Solicitar spritesheets ao autor via prompts técnicos quando necessário (Gemini/ChatGPT); agente valida e integra.
102. **[Proposta]** Consolidar web em F13.1–F13.8 antes da F14; avaliar PostgreSQL e recuperação de conta, sem autorização de custo ou migração automática. Ver [auditoria consolidada](AUDITORIA-CONSOLIDACAO.md).
