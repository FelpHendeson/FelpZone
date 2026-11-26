# Idle de Personagem Único (nome de trabalho) — GDD

Idle RPG em que o jogador **sorteia um único personagem** e o acompanha por toda a vida do jogo. Você não controla as ações do personagem: escolhe **a atividade que ele executa** (treinar, coletar, produzir, aprender, combater) e **onde** ele a executa. O personagem trabalha sozinho, até 12 horas com o jogo fechado.

Este documento é a fonte de verdade do design. Ele mistura decisões do autor e propostas; **cada bloco tem um rótulo** para não confundir as duas coisas:

| Rótulo | Significado |
| --- | --- |
| **[Autor]** | Decisão do Felipe. Só muda por pedido dele. |
| **[Proposta]** | Sugestão para fechar uma lacuna. Vale como padrão até o autor aprovar ou trocar. |
| **[Em discussão]** | Ponto aberto; está também em `DECISOES.md`. |
| **[Calibrar]** | Número provisório; deve ser ajustado pelo bot de ritmo (ver `ARQUITETURA.md`). |

Plataforma: **primeiro 100% web** (Next, mobile-first, instalável como PWA). Depois do jogo completo na web, o port mobile (React Native/Expo) usa o mesmo motor.

---

## 1. Visão e pilares

1. **Escolher é mais importante que clicar.** O jogador decide *o que* o personagem faz, *onde* e *com qual equipamento/habilidades*; a execução é automática. [Autor]
2. **Um personagem, muitas identidades.** Raça + habilidade core + dons raros fazem cada personagem sorteado ser diferente de verdade, inclusive combinações excêntricas. [Autor]
3. **Sem fim.** Sempre haverá conteúdo novo; o jogo cresce por atualizações (Atos), não termina. [Autor]
4. **Tudo conversa.** Habilidades afetam coleta e produção; o mapa decide onde cada atividade acontece; pets abrem atividades próprias; hora do dia e clima mexem em recursos e poder. [Autor + Proposta]
5. **Mesmo molde para tudo.** Raridade, afixos e modificadores seguem o mesmo modelo em equipamentos, ferramentas, acessórios, relíquias, habilidades e pets. [Autor]
6. **Gráficos são secundários no início.** Interface limpa e funcional; personalização leve (cor de cabelo, cor da roupa, miniatura de perfil). Arte pesada fica para depois. [Autor]

## 2. Resumo das decisões do autor

| # | Decisão | Rótulo |
| --- | --- | --- |
| 1 | Uma atividade por vez. | [Autor] |
| 2 | Limite offline de **12 horas**. | [Autor] |
| 3 | O jogo não tem fim; haverá combinações livres, bots, torneios, rankings, temporadas e recompensas. | [Autor] |
| 4 | Sem *permadeath*. Morte envia o personagem a um reino da morte onde só combate por um tempo e pode receber itens, inclusive um set nomeado único. | [Autor] (detalhes em §10: [Proposta]) |
| 5 | Sorteio **ponto a ponto**, cada passo limitando o seguinte; número limitado de chances; combinações excêntricas permitidas; até **3 personagens por conta** no início, o 2º/3º via item de reroll. | [Autor] |
| 6 | Itens **nomeados** ficam fora da raridade convencional; **1 unidade de cada** por personagem. | [Autor] |
| 7 | Gold entra por **venda a estabelecimentos do jogo** e sai em produção, fusões e estabelecimentos. Sem troca entre jogadores. | [Autor] |
| 8 | Habilidades ativas disparam sozinhas, como no LionHearth (prioridade + recarga). | [Autor] |
| 9 | Dentro da cidade não há tempo de deslocamento; entre locais há uma viagem curta (≤ 10 s) com texto "Movendo-se até…". | [Autor] |
| 10 | Projeto novo, independente do LionHearth (`idle-guilda`). | [Autor] |
| 11 | Web completa primeiro; port mobile depois. | [Autor] |
| 12 | **Cada personagem é independente**: ficha, mochila, gold, missões e rank próprios. Só um personagem joga por vez. | [Autor] (23/11) |
| 13 | **Pets por atividade**: 1 pet por atividade (inicialmente); o mesmo pet pode estar em todas; **só trabalha quando o personagem trabalha ali**. Treino, descanso e alimentação do pet são separados. | [Autor] (23/11) |
| 14 | **Origens**: personagens comuns têm lore básica; **personagens especiais** têm lore única e podem nascer com uma **besta espiritual vinculada**. Abre espaço para mecânicas de história depois. | [Autor] (23/11) |
| 15 | **Conta compartilhada**: conquistas e o que o agente achar justo compartilhar; "cada personagem é uma existência diferente". | [Autor] (23/11) |
| 16 | **Cuidados do pet dependem da atividade**: se o pet está na atividade de descanso, o personagem não está trabalhando ali. | [Autor] (23/11) |
| 17 | **Origens inspiradas em obras de ficção** (manhwa, anime, mangá, filmes, fantasia e ficção científica), com origens próprias criadas a partir de arquétipos. | [Autor] (23/11) |

---

## 3. O personagem

Ficha do personagem (ver lista completa de campos em `ARQUITETURA.md`):

| Campo | Descrição |
| --- | --- |
| **Nome** | Escolhido pelo jogador após o sorteio. |
| **Nível e XP** | Sobe por combate, missões, atividades e maestrias. |
| **Status** | Oito status treináveis (§5). |
| **Raça** | Define piso/teto dos status e as habilidades de raça. |
| **Habilidades de raça** | Comuns (inerentes, todos da raça têm) e **dons** (raros, sorteados). |
| **Habilidade core** | Núcleo do personagem. Não é equipável; define afinidades e direções. |
| **Técnicas e habilidades** | Aprendidas, equipáveis, com maestria. |
| **Aparência** | Cor do cabelo, cor da roupa básica, miniatura de perfil. |
| **Origem e lore** | Comum (lore básica) ou **especial** (lore única, às vezes com besta espiritual vinculada). Ver §3.4. |
| **Vínculos** | Pets, guilda, títulos, crônica. |

### 3.1 Raças iniciais [Proposta]

Oito raças para o Ato I. Cada uma tem um perfil de status (§5), uma habilidade de raça **comum** e uma lista de **dons** possíveis. A raridade da raça decide a chance de sair no sorteio.

| Raça | Raridade | Perfil (destaque / fraqueza) | Habilidade comum (inerente) |
| --- | --- | --- | --- |
| **Humano** | Comum | Equilibrado; maior piso, menor teto. Aprende mais rápido (+XP de maestria). | *Adaptável*: +8% XP de maestria. |
| **Anão** | Comum | Vigor, Resistência / Agilidade. | *Pele de Pedra*: reduz dano de queda e de armadilhas; bônus em mineração. |
| **Elfo** | Comum | Percepção, Intelecto / Vigor. | *Passo Silvestre*: viagens entre locais naturais 30% mais rápidas; bônus em colheita. |
| **Orc** | Comum | Força, Vigor / Intelecto. | *Fúria Ancestral*: ganha ataque ao cair abaixo de 40% de vida. |
| **Lobisomem** | Incomum | Agilidade, Percepção, Força / Espírito. | *Sentidos Aguçados*: detecta recursos e monstros raros; +chance de encontros especiais. |
| **Sangue-Pálido** | Incomum | Intelecto, Espírito / Vigor sob a luz do dia. | *Fome da Noite*: fica mais forte à noite; recupera vida ao causar dano. |
| **Draconato** | Rara | Força, Resistência, Espírito; teto alto, piso baixo (cresce devagar, vai longe). | *Escamas Vivas*: resistência elemental passiva que melhora com o nível. |
| **Silfo** | Rara | Agilidade, Espírito, Sorte / Resistência. | *Corpo de Vento*: maior velocidade em todas as atividades; flutua por terrenos difíceis. |

**Dons de raça** (a parte sorteada): cada raça tem uma tabela própria com 12 a 20 dons, de **Incomum a Primordial** (no Ato I: **13 por raça**, 5 Incomum, 4 Raro, 2 Épico, 1 Ancestral, 1 Primordial; catálogo em `packages/motor/src/dados/dons.ts`). Exemplos para o Lobisomem: *Faro de Caçador* (Incomum), *Matilha Fantasma* (Raro: invoca ecos de lobo no combate), *Lua Cheia Plena* (Épico), *Primeira Presa* (Primordial: dano enorme contra a primeira espécie abatida a cada dia). Os dons são escritos por raça, coerentes com o tema dela. [Proposta]

### 3.2 Habilidade core [Autor, com catálogo inicial: Proposta]

O **core** é o núcleo do personagem. **Não é equipável.** Ele:

- define **afinidades** (que tipos de técnica o personagem aprende melhor, que ramos de evolução se abrem);
- define **direções** (o core tem ramos de técnicas; o personagem escolhe por onde seguir);
- libera **técnicas e habilidades** próprias, que **estas sim** são equipáveis;
- pode **evoluir** ao atingir marcos de maestria (Ser das Trevas → Soberano das Sombras, por exemplo).

Exemplo do autor, mantido como referência de formato:

> **Core — Ser das Trevas.** *As trevas te reconhecem como um deles e portanto te acolhem.*
> - **Sentido das Sombras** (Passiva): enxerga e sente através das sombras.
> - **Abraço das Sombras** (Passiva): oculta presença, cheiro, respiração; todos os traços somem.
> - **Invocação do Manto das Trevas** (Ativa): converte parte da mana em trevas e cobre uma área; debuff no inimigo conforme o tipo, buff em você (+ataque, +esquiva).

Catálogo inicial de cores [Proposta]: **Ser das Trevas**, **Portador da Chama**, **Filho da Tempestade**, **Guardião da Terra**, **Alma da Luz**, **Predador Nato**, **Mente Lúcida** (mental), **Alma Antiga** (espiritual), **Artífice Nato** (produção), **Andarilho** (coleta e viagem), **Domador** (pets), **Sem Chama** (core de "nenhuma afinidade", raro: fraco no começo, mas aceita qualquer técnica).

Cada core tem **tags de afinidade** (por exemplo `sombra`, `noite`, `furtivo`, `mental`). A raça também tem tags. A compatibilidade entre raça e core é a sobreposição dessas tags (§4.2).

### 3.3 Habilidades de raça e core: regra de design [Autor]

- Habilidades de raça são escritas **de acordo com a raça**.
- Habilidades de core são **mais gerais** e **não equipáveis**; as técnicas que saem delas é que se equipam.

### 3.4 Origem e lore [Autor: ideia; catálogo e números: Proposta]

Todo personagem tem uma **origem**. Ela é puro sabor no começo, mas **abre mecânicas de história depois**.

**Origem comum** (a grande maioria). Lore curta e gerada por modelo, sem ficar igual à do vizinho:

> *Fulano de Tal, nascido numa vila rural, há 12 anos na estrada em busca de renome.*

O modelo combina **berço** (vila rural, porto, acampamento nômade, mosteiro, cortiço da capital...), **anos de estrada** e **motivação** (renome, dívida, curiosidade, fugir do passado). Não dá poder; no máximo um **pequeno bônus de ofício inicial** coerente com o berço.

**Origem especial** (rara). Lore **escrita à mão**, única, com **ganhos próprios** e, em alguns casos, uma **besta espiritual vinculada** desde o nascimento. Exemplos do autor, mantidos como referência:

| Origem especial | Lore | Efeitos propostos |
| --- | --- | --- |
| **Fruto do Vínculo** | Nasceu de um projeto cujo único fim era estudar o vínculo de bestas espirituais com bebês, para medir o possível aumento de potencial do indivíduo. | Começa com uma **besta espiritual vinculada** (única, não se perde); mais **Sincronia** no modo União; ganchos de história sobre quem o criou. |
| **12º Filho do Clã Ironblood** | Décimo segundo filho do patriarca; trama a ruína do próprio clã em busca de vingança. | Reputação inicial hostil com o clã Ironblood e aliada com inimigos dele; bônus contra os inimigos do clã; **cadeia de missões própria**. |

O catálogo completo (22 origens especiais e o gerador de origem comum) está em **[`ORIGENS.md`](ORIGENS.md)**, inspirado em arquétipos de manhwas, animes, mangás, filmes e livros de fantasia e ficção científica, sempre com nomes e regras originais [Autor, 23/11].

**Ganchos de história** (futuro, [Autor: "podemos até adicionar alguma mecânica de história depois"]): origens especiais abrem **arcos** de missões, NPCs e escolhas próprias. Entram depois do jogo base e não alteram o motor, porque missões já são dados (§11).

## 4. Sorteio e criação do personagem

### 4.1 Fluxo [Autor + Proposta]

1. O jogador entra, e o jogo **sorteia o personagem** em cascata (§4.2).
2. Ele tem **5 chances** [Proposta, Calibrar] de rerolar. Pode **aceitar a qualquer momento**; ao esgotar as chances, **aceita o último resultado**. Implementado (F1) como **5 tentativas no total** (a 1ª + 4 rerolagens); a 5ª é obrigatória. O estado das tentativas vive no save, então recarregar não devolve chances.
3. Aceito o resultado, escolhe **nome**, **cor do cabelo**, **cor da roupa básica**; o jogo gera a **miniatura de perfil** conforme raça/core.
4. Entra no jogo com um **kit básico** (uma ferramenta de cada ofício, arma e roupa simples).

**Personagens por conta:** até **3** no início. O 2º e o 3º só são criados ao usar um item de reroll (*Pergaminho do Novo Destino*), obtido no jogo. [Autor]

**Conta e existências** [Autor, 23/11]: cada personagem é **uma existência diferente**. O que é **da conta** (compartilhado) e o que é **do personagem** (separado):

| Da **conta** (compartilhado) [Proposta, aprovada na regra geral] | Do **personagem** (separado) |
| --- | --- |
| **Conquistas** (sem poder; dão cosméticos, títulos de conta e marcos) | Ficha, nível, status, raça, core, dons, origem |
| **Cofre da Conta**: *Pergaminhos do Novo Destino* | Mochila, gold, ferramentas, equipamento |
| **Cosméticos de perfil** (cores, molduras, miniaturas) | Missões, rank e Mérito da guilda |
| **Álbum de Descobertas** (raças, cores, origens, monstros já vistos; só informação, sem poder) | Pets e bestas vinculadas |
| **Histórico de temporadas** e troféus de torneio | Títulos com bônus, Bestiário de abates, Crônica |
| Nome da conta e configurações | Limiar, Eco da Morte, mapa descoberto |

Conquistas **não dão poder** aos personagens, para respeitar "cada um é uma existência diferente".

**Implementado na F9** [Proposta, Calibrar]: o **Pergaminho do Novo Destino** vem da guilda: cada personagem ganha um ao chegar aos ranks **C** e **A** (máximo de 9 guardados). Criar o 2º ou o 3º personagem gasta um pergaminho no início do sorteio. **Conquistas** (10, sem poder) e o **Álbum de Descobertas** (raças, cores, origens e monstros vistos) são calculados a partir dos personagens. Cosméticos e histórico de temporadas ficam para a competição e o acabamento. A conta online é **opcional**: sem ela o jogo continua 100% local.

**Personagens são independentes** [Autor, 23/11]: cada um tem ficha, mochila, gold, missões, rank de guilda e pets próprios. Só **um personagem joga por vez** (o ativo); os outros ficam parados até serem escolhidos. Troca livre entre eles. [Proposta, aprovada na regra geral]

### 4.2 Cascata ponto a ponto [Autor, mecânica: Proposta]

Cada passo sorteia usando pesos que dependem dos passos anteriores, e consome um **orçamento de raridade** para que o jogador não "tire tudo raro" de uma vez.

1. **Raça.** Peso por raridade da raça: Comum 70%, Incomum 22%, Rara 8% [Calibrar].
2. **Core.** O conjunto de cores possíveis é o mesmo para todas as raças, mas o peso muda pela compatibilidade:
   - afinidade alta: 70% do total;
   - afinidade média: 25%;
   - **excêntrica** (sem tags em comum): 5% [Calibrar].
   Combinações excêntricas são permitidas de propósito. Para não serem só "piores", ganham a **Marca da Anomalia**: uma habilidade de sinergia única e narrativa para aquele par (por exemplo, *Lobisomem + Ser das Trevas* → **Lua sem Luz**). A marca existe para todo par excêntrico.
3. **Dom de raça.** Raridade do dom: Incomum 60%, Raro 28%, Épico 9%, Ancestral 2,5%, Primordial 0,5% [Calibrar]. O **orçamento de raridade** limita o teto: cada passo raro gasta pontos (raça rara, core de afinidade alta ou excêntrica, dom raro), e se o saldo acabou o passo seguinte só sorteia até a raridade permitida.
4. **Origem.** Pesos [Calibrar]: **origem comum 92%**, **origem especial 8%**. A origem especial também gasta **orçamento de raridade** (uma origem especial muito forte reduz o que o dom de raça ainda pode ser). Algumas origens têm **restrição de raça** (o Clã Ironblood só faz sentido para determinadas raças) e filtram o sorteio de raça/core de acordo.
5. **Detalhes finais.** Dons menores e um traço de personalidade (puramente narrativo; aparece na Crônica). Na F1 só o **traço de personalidade** existe (12 traços); "dons menores" ficam para quando houver conteúdo.

O sorteio é **determinístico por semente** (a semente é guardada para o servidor poder reproduzir e validar o resultado).

**Orçamento de raridade (F1)** [Calibrar]: saldo inicial **100**. Custos: raça Comum 0 / Incomum 10 / Rara 25; core alta 0 / média 5 / excêntrica 15; dom Incomum 5 / Raro 15 / Épico 30 / Ancestral 50 / Primordial 80; origem comum 0 / especial 15 (+15 com besta vinculada). Em cada passo só entram as opções que cabem no saldo (pesos renormalizados); se nada couber, vale a de menor custo. Ordem implementada: **raça → core → dom → origem → detalhes**; a restrição de raça das origens filtra o passo de origem (não o de raça). Números observados e propostas em [`CALIBRACAO.md`](CALIBRACAO.md).

## 5. Status e treino

### 5.1 Status

Oito status treináveis [Proposta]:

| Status | Efeito |
| --- | --- |
| **Vigor** | Vida máxima e regeneração. |
| **Força** | Dano físico; carga da mochila. |
| **Resistência** | Defesa física; redução de dano. |
| **Agilidade** | Velocidade de ataque, esquiva, velocidade das atividades físicas. |
| **Intelecto** | Dano mágico, mana, velocidade das atividades de produção. |
| **Espírito** | Defesa mágica, regeneração de mana, força de pets espirituais. |
| **Percepção** | Chance de raros, detecção, crítico. |
| **Sorte** | Chance de drop, de sucesso em fusões e eventos. |

### 5.2 Piso e teto por nível [Autor, fórmula: Proposta/Calibrar]

- Cada **nível** define, para cada status, um **piso** (ganho automático ao subir de nível) e um **teto** (máximo daquele nível), e **o teto muda conforme a raça** (Draconato tem teto alto e piso baixo; Humano tem piso alto e teto baixo).
- O **treino** de um status move o valor entre o piso e o teto. O ganho por ciclo **diminui** à medida que o valor se aproxima do teto.
- Há **uma atividade de treino para cada status** (ou conjunto de status, quando fizer sentido: por exemplo "Corrida de resistência" treina Vigor + Agilidade).
- Ao subir de nível, piso e teto sobem; quem treinou no nível anterior chega ao novo piso sem perder nada.

Fórmula inicial: `teto(L) = base_raça × (1 + 0,10 × (L − 1))`, `piso(L) = 0,55 × teto(L)`, `ganho = ganho_base × (1 − (valor − piso)/(teto − piso))^0,6` [Calibrar].

**Implementado na F2** [Calibrar] (números e bot de ritmo em [`CALIBRACAO.md`](CALIBRACAO.md)):

- **Piso por raça:** `piso(L) = fração_da_raça × teto(L)`, para cumprir "Humano piso alto, Draconato piso baixo": Humano 0,65, Silfo 0,50, Draconato 0,45, demais 0,55 (antes: 0,55 para todas).
- **Perfis:** destaque 13, fraqueza 7, resto 10 (Draconato: 11 e destaques 14), coerentes com a tabela do §3.1.
- **Ganho:** `ganho_base = 0,6% × teto(L)` por ciclo; o status nunca passa do teto. Ao subir de nível, quem está abaixo do novo piso sobe até ele.
- **XP:** 10 por ciclo de treino de 30 s; `XP(L → L+1) = 150 × L²` (F7; era `200 × L^1,5`). Com combate e missões, o nível 50 sai em ~5 semanas.
- **Modificadores aplicados:** `status.<id>` (valor efetivo), `teto`, `teto.<id>`, `ganho-treino`, `xp-personagem` e `velocidade-atividade`. Exemplos: Corpo de Vento (+10% de velocidade), Órfão do Templo (+2 Espírito), A Voz do Poço (+2 Percepção), Soldado (+2 Resistência), Cria da Matilha (+2 Agilidade), O Reencarnado (−5% Vigor), O Despertado Tardio (teto −10%; +50% de XP e de treino até o nível 20), Coração de Dragão (teto de Força e Espírito +10%).

### 5.3 Nível máximo

Cresce com os Atos: Ato I vai até o **nível 50** [Proposta]. Novos Atos aumentam o teto de nível, abrem mapas, monstros, raças e cores. [Autor: o jogo não acaba]

## 6. Atividades

Só **uma atividade por vez**. Todas rodam em **ciclos**: a atividade tem um tempo base, que cai com velocidade/eficiência, e cada ciclo produz XP e itens. O progresso offline é calculado ao abrir o jogo, por no máximo **12 horas**. [Autor]

Regras da F2 [Proposta]: só ciclos **completos** contam; o que sobra de um ciclo fica guardado. **Trocar de atividade descarta o ciclo parcial.** Tempo além de 12 h é descartado; relógio que volta no tempo não dá ganho. Só o personagem ativo trabalha.

### 6.1 Treino de status [Autor]

Descrito em §5.2. Atividades da F2 (uma por status, ciclo de 30 s [Calibrar]): Corrida de fôlego (Vigor), Levantamento de pedras (Força), Treino de impacto (Resistência), Circuito de obstáculos (Agilidade), Estudo de tomos (Intelecto), Meditação (Espírito), Vigília na torre (Percepção) e Jogos na taverna (Sorte). Atividades combinadas (ex.: Corrida de resistência) ficaram para depois.

### 6.2 Coleta [Autor]

Madeira, mineração, pesca, agricultura e outras (ervas, caça de pele, escavação) [Proposta]. Cada coleta:

- só acontece em **locais** que têm o recurso; escolher "Carvalho Escuro" **obriga** o personagem a ir à floresta correspondente (§8);
- tem **nível de ofício** próprio (Lenhador, Minerador, Pescador, Fazendeiro...), que sobe com o uso e abre recursos melhores;
- usa a **ferramenta** do ofício; a ferramenta define eficiência (rendimento) e velocidade, e a **raridade** da ferramenta aumenta os dois;
- sofre efeito de **habilidades**, **pets**, **clima** e **hora do dia**.

**Implementado na F3** [Proposta, números Calibrar em [`CALIBRACAO.md`](CALIBRACAO.md)]: 4 ofícios (Lenhador, Minerador, Pescador, Fazendeiro), 3 recursos por ofício (tiers liberados nos níveis 1, 10 e 20 do ofício), XP de ofício com curva própria, rendimento fracionário e **achado raro** por ciclo (âmbar, geodo, pérola, semente), ambos sorteados pelo RNG do save. Status passam a valer: **Agilidade** acelera a coleta, **Percepção** e **Sorte** aumentam achados raros e **Força** aumenta a mochila. A coleta também dá XP ao personagem (metade do treino). Bônus de ofício de berço e origem somam níveis de ofício.

### 6.3 Produção [Autor]

Transforma materiais em itens: forja de equipamento, carpintaria, alquimia, culinária, costura [Proposta]. Exige o **estabelecimento** certo (Ferreiro, Alquimista, Taverna...), que fica numa subárea da cidade. A forja também faz **fusão** (§9.4).

**Implementado na F8** [Proposta, números Calibrar em [`CALIBRACAO.md`](CALIBRACAO.md)]: 3 ofícios de produção (Ferreiro, Alquimista, Cozinheiro) com nível e XP próprios, 19 receitas em Pedravau (Ferreiro, Alquimista e Taverna). A produção é uma atividade em ciclos: consome os materiais da mochila, guarda o produto e para sozinha quando falta material ou espaço. **Intelecto** acelera a produção; Fornalha Interior e os berços de ferreiro/taverna também. Carpintaria e costura ficam para depois.

### 6.4 Aprendizado e treino de habilidade [Autor]

O personagem treina uma habilidade que já possui. Ela ganha **maestria** (nível de domínio) que:

- melhora efeitos e status da habilidade;
- em marcos, **evolui** a habilidade (versão superior) ou abre uma variação.

Habilidades **novas** são aprendidas por livros e mestres (NPCs), pelo core, por drops e pela guilda.

### 6.5 Combate [Autor]

Combate também é uma atividade (e é exclusivo). Tem aba própria (§7).

### 6.6 Cuidados do pet [Autor: depende da atividade; detalhes: Proposta]

**Alimentar**, **Descansar** e **Treinar** o pet são **atividades** como as outras. O personagem as executa **uma de cada vez**, e o pet atribuído a elas é o que recebe o cuidado. Se o pet está na atividade de **descanso**, o personagem **não está trabalhando em outro lugar**: o pet só rende quando o personagem trabalha na atividade onde ele está (§13).

### 6.7 Missões não são atividades

Missões são **objetivos**: avançam enquanto o personagem faz atividades que contam para elas (§11).

## 7. Combate

Tem aba própria, com sub-abas **Áreas**, **Bestiário** e **O Limiar** (reino da morte). [Autor, estrutura: Proposta]

- O jogador **escolhe uma área** e o personagem passa a caçar nela, sozinho, em combates contínuos.
- Cada monstro tem **taxa de aparição própria** (comuns e raros) e **tabela de drops** com taxa por item. Monstros raros e **chefes de área** (a cada N abates [Calibrar]) têm tabelas melhores.
- Habilidades ativas disparam **como no LionHearth** [Autor]: recarga + ordem de prioridade; curas/escudos só quando precisam; no máximo 5 habilidades ativas equipadas; passivas ficam sempre ativas.
- Motor em **passos de 0,5 s**, igual aberto ou fechado. [Proposta, herdado do LionHearth]
- Cada área tem **nível recomendado**; o jogo mostra o risco (verde/amarelo/vermelho).
- **Recuo automático** [Proposta]: o jogador define "recuar com X% de vida". O personagem volta à cidade, descansa e retoma; custa tempo, mas evita a morte.
- **Bestiário**: marcos de abates (100/1.000/5.000) dão bônus permanente contra a espécie, como no LionHearth. [Proposta]
- **Elementos, críticos, escudos, DoT, buffs e debuffs** seguem o mesmo modelo de modificadores (§12).

**Implementado na F4** [Proposta; números Calibrar em [`CALIBRACAO.md`](CALIBRACAO.md)]: 6 áreas (Trilha dos Lobos 1, Galeria dos Ratos 5, Juncal Escuro 10, Coração do Bosque 15, Margem Afogada 20, Poço sem Fundo 25), cada uma com 2 monstros comuns, 1 raro (5%) e 1 chefe a cada 50 abates; drops de material e de equipamento do tier da área. Status de combate: **vida** (Vigor), **ataque** (Força), **defesa** (Resistência), **velocidade de ataque e esquiva** (Agilidade), **crítico** (Percepção), mais o equipamento. Dano = ataque² ÷ (ataque + defesa). A simulação roda em passos de 0,5 s também offline, com o estado da luta no save. **Recuo automático** de 0 a 90% (padrão 30%). Ataque básico só; habilidades chegam na F5. O risco da área (verde/amarelo/vermelho) é a vida média perdida por luta. Bestiário conta abates; os marcos com bônus ficam para a F11.

## 8. Mapa e viagem

### 8.1 Hierarquia [Autor]

```
Região
 └── Local            (floresta, cidade, masmorra, pico, pântano...)
      └── Subárea     (ordem/distrito da cidade, clareira, câmara...)
```

- **Dentro de um local** (por exemplo, entre os distritos da cidade) a movimentação é **instantânea**, sem custo de tempo. [Autor]
- **Entre locais** há **viagem curta de até 10 s** (algo como 3 a 10 s, mais curto entre locais vizinhos), com a tela "**Movendo-se até Floresta Escura**". É só sensação de deslocamento, não um custo de recurso. [Autor]
- A viagem acontece **quando a atividade muda de local**, não a cada ciclo. Ao abrir o jogo com a mesma atividade em andamento, não há viagem. [Proposta]
- Escolher uma atividade em outro local **move o personagem automaticamente**. [Autor]
- **Estabelecimentos são subáreas**: Ferreiro, Loja, Guilda, Estábulo, Alquimista, Taverna. Usá-los exige estar na subárea correta (gratuito dentro da cidade). [Proposta]
- **NPCs fixos** ficam em subáreas e geram o **nível extra** de mapa citado pelo autor: algumas subáreas só existem para quem tem certa missão ou rank.

**Implementado na F3** [Proposta]: região **Vale de Pedravau** com 4 locais — **Pedravau** (cidade: Praça, Mercado, Ferreiro, Campo de Treino, Hortas do Muro, Guilda, Taverna), **Bosque Raso**, **Mina Velha** e **Lago Espelho** — e viagens de 4 a 9 s [Calibrar]. Durante a viagem o personagem continua no local de origem; mudar o destino recomeça dali, voltar à origem cancela. "Ir para" um local sem atividade também existe (para vender, por exemplo). Os treinos da F2 acontecem no Campo de Treino.

### 8.2 Exemplo

> "Carvalho" coleta nos arredores da Cidade X → **Carvalho Escuro** só existe numa floresta selvagem sem cidade por perto. Trocar de uma para a outra mostra "Movendo-se até Floresta Escura" por ~8 s e o ciclo recomeça lá.

### 8.3 Tempo e clima [Proposta]

Ciclo de **dia e noite** (acelerado, por exemplo 1 h real = 1 dia do jogo) e **clima** por região. Ambos mudam:

- recursos disponíveis (peixes noturnos, ervas que só florescem na chuva);
- monstros que aparecem;
- poder de raças e cores (Sangue-Pálido e **Ser das Trevas** são mais fortes à noite).

**Implementado na F11** [Proposta, Calibrar]: 1 h real = 1 dia; **noite das 19h às 5h** (42% do tempo). O **clima** muda a cada 2 h reais e é o mesmo para todos (o Vale de Pedravau é uma região só no Ato I): céu limpo (40%), nublado (30%), chuva (20%) e neblina (10%).

- **Noite:** quem tem tag de noite, trevas ou lua (Sangue-Pálido, Lobisomem, Ser das Trevas) ganha +10% de ataque e +8% de defesa; monstros raros aparecem o dobro; peixes raros +30%.
- **Dia:** a Alma da Luz ganha +5% de ataque e +10% de regeneração.
- **Chuva:** +15% na lavoura e na pesca; viagem 10% mais lenta. **Neblina:** +15% de achados raros e +2 p.p. de esquiva.
- O roubo de vida da Fome da Noite continua pendente.

## 9. Itens, equipamentos e forja

### 9.1 Raridades (escala única) [Proposta]

Uma escala só para **itens, ferramentas, habilidades, dons e pets**:

**Comum → Incomum → Raro → Épico → Ancestral → Primordial**

Os nomes **Lendário** e **Mítico** ficam com os **ranks da guilda** (decisão do autor), para não haver dois sistemas com o mesmo vocabulário. Se o autor preferir usar esses nomes nos itens, é só trocar os dois últimos e renomear os ranks.

**Nomeados** ficam **fora dessa escala** [Autor]: itens únicos com nome, história e status especiais. O personagem só pode ter **uma unidade de cada**. Alguns só vêm por drop (inclusive do Limiar), outros podem ser **forjados** com receita especial.

### 9.2 Equipamento [Proposta, no molde do LionHearth]

- Combate: elmo, peitoral, manoplas, calças, botas, arma, mão secundária, **2 acessórios**, **1 relíquia**.
- **Ferramentas de ofício** têm slots **próprios**, separados do combate: machado, picareta, vara de pesca, enxada/foice, faca de coleta, martelo de forja, caldeirão. Todo personagem **começa com a versão básica de cada**. [Autor]
- Itens têm **raridade**, **afixos** (modificadores) e, se aplicável, **conjunto** (bônus 2/4/5 peças).
- **Acessórios e relíquias** seguem o mesmo molde [Autor]; relíquias têm efeitos únicos vindos de chefes, Limiar e ranks da guilda.
- **F4:** arma, elmo, peitoral, calças e botas em 3 tiers (couro, ferro, aço) mais o kit básico (porrete e gibão). Tiers 1 e 2 no Ferreiro; tier 3 só por drop.
- **F8:** **2 acessórios** (anéis e amuletos, forjados ou preparados) e **1 relíquia** (de chefes de área e do Limiar). O tier 3 de aço passa a ser forjável. **Afixos aleatórios ainda não** (fora do escopo da F8); no lugar, cada equipamento comum tem versões **+1 a +3** pela fusão. Manoplas e mão secundária ficam para depois.

### 9.3 Mochila [Proposta]

Capacidade em espaços (aumenta com Força, ampliações e baú na cidade). Filtros e **venda em lote** para não cobrar microgestão de um jogo idle.

**F8:** ampliação no Mercado (+5 espaços por compra, preço crescente, até +30). "Vender tudo" deixa de fora poções e nomeados.

**Implementado na F3** [Calibrar]: 20 espaços + 0,5 por ponto de Força efetiva; cada espaço guarda uma pilha (100 materiais ou 20 achados raros). **Com a mochila cheia, a coleta continua dando XP, mas o que não cabe se perde** (contado no resumo "Enquanto você estava fora"). Venda por item e "vender tudo" no Mercado de Pedravau. Ferramentas: básica (kit inicial), de ferro e de aço por ofício, compradas no Ferreiro; a antiga fica com ele.

### 9.4 Forja e fusão [Autor]

- **Fusão:** combinar equipamentos para **subir a raridade**. [Autor]
- Regras iniciais [Proposta, Calibrar]: 3 itens do mesmo tipo e raridade → 1 item da raridade seguinte; custo em gold e material crescente; chance de sucesso com falha parcial (perde um item, não os três); **Sorte** aumenta a chance; garantia (*pity*) depois de N falhas seguidas; **itens nomeados não entram em fusão**.
- Itens nomeados forjáveis usam **receita especial** (fragmentos de chefes + material raro + item de raridade mínima).
- **Implementado na F8** [Calibrar]: fusão no Ferreiro de Pedravau, 3 iguais → versão +1 (até +3, cada nível sobe a raridade em um degrau e dá +20% nos bônus); chance 70/55/40%, Sorte soma até +20 p.p., *pity* depois de 3 falhas, falha perde 1 dos 3; custo em gold e material crescente. Sorteio com o RNG do save. Nomeados forjáveis: **Presa da Matriarca** e **Coroa do Afogado** (fragmentos de chefe + material raro + item +2). Nomeados de origem: **Lâmina Desperta** (cresce com o nível), **Martelo do Pai** (+15% na fusão) e **Bússola Quebrada**. Nomeados não se vendem nem se fundem, e só existe um de cada por personagem.

### 9.5 Economia [Autor]

- **Entra gold:** venda a estabelecimentos do jogo.
- **Sai gold:** produção, fusões, compras em estabelecimentos, ampliação de mochila, estábulo.
- **Sem troca entre jogadores** no início (evita fraude e inflação).
- Moedas secundárias [Proposta]: **Essência do Limiar** (pedágio do Barqueiro) e **Mérito da Guilda** (promoções de rank). O **Pergaminho do Novo Destino** (reroll de personagem) é um item raro, não uma moeda.

## 10. Morte e O Limiar [Autor: ideia; detalhes: Proposta]

> **Implementado na F6** [Proposta; números Calibrar em [`CALIBRACAO.md`](CALIBRACAO.md)]. O desmaio provisório da F4 deixou de existir. Escolhas de implementação: no Limiar o **personagem** luta com 75% do ataque e da defesa, contra monstros do nível em que entrou; a vida chegar a zero lá dentro não é uma segunda morte (ele se recompõe em 3 s e volta a lutar contra o mesmo monstro); ao sair, acorda em Pedravau e a **atividade anterior volta sozinha** (com viagem, se for longe); com o jogo fechado, tudo isso é simulado em sequência. Ações fora do combate ficam bloqueadas no Limiar (equipar, habilidades, recuo e pedágio continuam valendo). Os títulos por mortes existem, mas os bônus de títulos ficam para a F11.


Sem *permadeath*. Quando a vida chega a zero e o recuo não foi acionado, o personagem **atravessa para o Limiar**: um reino entre a vida e a morte onde só pode **combater sem parar** por um tempo.

**Como funciona**

- **Duração base:** 10 min, mais perigo da área em que caiu, menos redução por habilidades/itens [Calibrar]. A atividade anterior fica pausada e **volta sozinha** depois.
- **Dentro do Limiar:** combate contínuo contra **Almas Penadas** e **Ceifeiros Menores**, com atributos reduzidos, mas **drops exclusivos**: **Essência do Limiar** e materiais que só existem lá.
- **O Barqueiro Sem Rosto:** NPC que cobra um **pedágio** para sair antes do tempo (em Essência do Limiar). Dá lore e uma escolha ao jogador.
- **Eco da Morte:** cada morte em pouco tempo acumula uma carga; mais cargas = Limiar mais longo, mas com **drops melhores**. As cargas decaem com o tempo. Risco e recompensa.
- **O Retornado (set nomeado único):** quatro peças nomeadas, **só caem no Limiar** (chefes raros: *O Cobrador*, *A Rainha Pálida*...). O set dá bônus que **ficam mais fortes quanto mais mortes o personagem acumulou**. Um personagem só tem uma unidade de cada peça.
- **Sinergias:** o core **Ser das Trevas** e a raça **Sangue-Pálido** têm bônus no Limiar; algumas habilidades reduzem o tempo ou melhoram drops.
- **Limiar offline:** se o personagem morre com o jogo fechado, o tempo no Limiar é simulado e o resto do período offline vira **espera** na cidade (o custo real da morte é o tempo produtivo perdido).
- **Títulos:** *Visitante Frequente*, *O Que Voltou*, *Sem Medo da Morte* (por quantidade de mortes).

## 11. Missões e Guilda de Aventureiros

### 11.1 Três tipos de missão [Autor]

| Tipo | Origem | Recompensa |
| --- | --- | --- |
| **Missões de NPC** | NPCs fixos em subáreas; o NPC só aparece onde a história diz. | XP, gold e **itens**. |
| **Metas próprias** | O próprio jogo dá ("coletar 500 madeiras", "abater 100 lobos"). | **Só XP.** |
| **Missões da Guilda** | Quadro de missões da Guilda de Aventureiros local, filtrado por **rank**. | XP, gold, **Mérito** e itens. |

- As missões avançam sozinhas quando a atividade contribui para o objetivo. [Proposta]
- Podem ser **encadeadas** (cadeias de NPC contam uma história) e **repetíveis** (diárias/semanais). [Proposta]
- As **metas próprias** também servem de tutorial e de bússola para o jogador novo. [Proposta]

### 11.2 Ranks da Guilda [Autor]

**F → E → D → C → B → A → S → SS → SSS**, e acima disso **Lendário → Mítico → Supremo → Divino**.

- Cada rank tem **bônus próprios em interações com NPCs** (descontos, diálogos novos, acesso a lojas e subáreas) e em outros pontos (espaço de baú, vagas de pet, bônus de coleta).
- O rank **filtra o tipo de missão** disponível.
- Subir de rank exige **Mérito** e uma **prova de promoção** [Proposta]: um desafio específico (derrotar um chefe de área, coletar algo raro, sobreviver a uma sequência de ondas).

**Implementado na F7** [Proposta; números Calibrar em [`CALIBRACAO.md`](CALIBRACAO.md)]:

- **Progresso automático** por contadores do personagem (abates no bestiário, itens obtidos, ciclos de treino, mortes) e por estado (nível, ofício, maestria): uma missão conta o que acontece **depois de aceita**. Recompensas saem ao **entregar**.
- **Metas próprias**: 10, encadeadas (a primeira já começa ativa), só XP.
- **NPCs**: Velha Iolanda (Taverna), Brom (Ferreiro), Tico (Mercado) e o Pescador Mudo (Lago Espelho), com cadeias curtas; aceita-se e entrega-se no local do NPC.
- **Guilda** (em Pedravau): 3 contratos repetíveis por rank (caça, encomenda e instrução), a cada 20 h; quadro com o rank atual e o anterior.
- **Ranks F → S** no Ato I (a escala inteira do autor está nos dados); promoção com Mérito e a **prova** do rank (o chefe da área correspondente). Bônus por rank: −2% nas compras e +2% de rendimento de coleta. O Soldado de uma Guerra Perdida começa em E.
- Ainda não: reputação com facções, diálogos, acesso a lojas e subáreas por rank, arcos das origens (F11).

## 12. Habilidades [Autor, estrutura: Proposta]

Quatro eixos independentes:

| Eixo | Valores |
| --- | --- |
| **Natureza** | **Física** (ataques físicos, buffs de status físicos) ou **Mágica**, com subtipos: elemental, mental, espiritual, trevas/luz, outros. |
| **Modo** | **Passiva** ou **Ativa**. |
| **Duração** | **Permanente**, **com duração**, ou **aura** (ligada enquanto algo for verdadeiro). |
| **Escopo** | Combate, **coleta**, **produção**, viagem, social/guilda, pets. |

- Habilidades físicas **também sofrem** buffs e debuffs mágicos, e habilidades mágicas podem alterar status físicos. [Autor]
- Habilidades de **escopo não-combate** (coleta, produção) são **equipadas** e afetam atividades; por isso é preciso **escolher o build** conforme a atividade. [Autor]
- **Slots** [Proposta]: 5 ativas; passivas crescem com o nível (começa com 3).
- **Raridade** de cada habilidade e de cada dom segue a escala de §9.1.
- **Maestria**: nível de domínio que fortalece a habilidade e permite **evoluir** (§6.4).
- **Habilidades de raça e core** não ocupam slot: são inerentes. **Técnicas** vindas do core, sim.

**Implementado na F5** [Proposta; números Calibrar em [`CALIBRACAO.md`](CALIBRACAO.md)]:

- As **31 técnicas** escritas na F1 viraram habilidades com efeito (o texto do Ser das Trevas segue o do autor). O personagem nasce conhecendo as técnicas do próprio core, com as ativas e até 3 passivas úteis já equipadas.
- **Ramos do core** (GDD §3.2, "direções"): 2 por core, escolhidos uma vez a partir do nível 10; cada um ensina uma técnica nova (24 no total).
- **Livros** de habilidades gerais (11: combate, coleta e viagem), vendidos no Livreiro do Mercado e deixados por monstros raros e chefes.
- **Ativas** disparam sozinhas na luta, na ordem de prioridade dos slots, com recarga: golpe, cura (só abaixo de 50% de vida), reforço, enfraquecimento e atordoamento. O estado (recargas e efeitos) fica no save, igual online e offline.
- **Passivas** viram modificadores; **auras** valem só com a vida abaixo de um limite. Passivas de coleta afetam a coleta, as de viagem a viagem.
- **Maestria** de 1 a 30, por uso e pela atividade de **Aprendizado** (praticar no Campo de Treino); **evolução** em estágios II (maestria 10) e III (25), com o nome da habilidade ganhando o numeral.
- Ainda sem efeito: habilidades de **produção** (F8) e de **pets** (F10).

## 13. Pets [Autor, estrutura: Proposta]

Dois grandes grupos:

| Tipo | Como se obtém | Característica |
| --- | --- | --- |
| **Pets reais (físicos)** | Domados em combate/áreas ou comprados no Estábulo. | Têm corpo; podem ser levados em atividades; precisam ser alimentados. |
| **Pets espirituais (familiares)** | Rituais, habilidades, eventos e marcos. | Sempre acompanham; não podem ser perdidos; crescem com Espírito. |

- Todos têm **nome** (o jogador dá), **raridade**, **nível** e **vínculo**.
- **Pet por atividade** [Autor, 23/11]: cada **atividade** tem **1 slot de pet** (inicialmente; mais slots podem vir depois). O **mesmo pet pode estar em todas** as atividades. Ele **só trabalha quando o personagem trabalha naquela atividade**: não existe atividade paralela e a regra de "uma atividade por vez" fica intacta.
- **Cuidados do pet** [Autor: depende da atividade; mecânica: Proposta]: o pet tem **Fome** e **Energia**. Com fome ou sem energia, **não ajuda** (bônus cai a zero). **Alimentar** gasta comida (comprada ou produzida); **Descansar** recupera Energia; **Treinar** sobe nível e atributos do pet. Todos são **atividades do personagem** (§6.6): consomem a atividade dele, e o pet só está "ali" quando o personagem está.
- **Besta espiritual vinculada:** personagens de **origem especial** (§3.4) podem nascer com uma. É um pet espiritual **único**, com lore própria, **não pode ser perdido nem trocado**, e cresce junto com o personagem.
- **Habilidades de pet** afetam combate e **outros aspectos** (coleta, produção, viagem).
- **Modo União** (só espirituais): o pet se funde ao personagem por um tempo, libera **habilidades de união** e fortalece outras. Tem barra de **Sincronia** que enche com o uso e esfria depois. [Proposta]
- **Domar:** chance de domar ao final de certos combates, com item de laço; aumenta com Domador/Percepção. [Proposta]

**Implementado na F10** [Proposta, números Calibrar em [`CALIBRACAO.md`](CALIBRACAO.md)]:

- **Reais:** 6 domáveis (lobo, javali, morcego-de-veio, sapo-cão, aranha de casca, enguia-navalha) e 4 do **Estábulo** de Pedravau (cão de caça, mula, gato de celeiro, coruja). Até 5 por personagem. Bônus de 10% a mais por nível (até o 20).
- **Espirituais:** as 3 bestas vinculadas das origens; não sentem fome, não se soltam, o bônus cresce com o Espírito e têm o **modo União** (Sincronia cheia com 1 h de trabalho; 10 min de bônus dobrado; o Fruto do Vínculo tem 50% a mais).
- **Vagas:** Treino (inclui aprendizado), Coleta, Produção, Combate e Cuidados. O pet só cansa (Energia: 8 h; Fome: 12 h de trabalho) quando o personagem trabalha na atividade onde ele está.
- **Cuidados** no Estábulo: alimentar (ração 3 h, pão 1 h, ensopado 4 h, torta 6 h, lambari 30 min), descansar (30 min de Energia a cada 5 min) e treinar (XP do pet, gasta Energia).
- **Doma:** com Laço de doma na mochila, 0,07% por abate de monstro domável (Voz Mansa aumenta); gasta o laço. Habilidades próprias dos pets ficam para depois.

## 14. Sistemas extras [Proposta]

- **Crônica do personagem:** diário automático (raça, core, traço de personalidade, mortes, marcos, encontros). Ótimo para o lado narrativo.
- **Eventos aleatórios** durante atividades: viajante, achado raro, emboscada; dão escolhas simples.
- **Títulos e conquistas** com bônus.
- **Bestiário** e **catálogo de itens** (completar dá bônus).
- **Arcos de origem** (história): cadeias de missões e escolhas ligadas à origem especial do personagem. Depois do jogo base. [Autor, futuro]

**Implementado na F11** [Proposta, Calibrar]: **Crônica** (abertura com raça, core, traço e lore; 11 marcos; registros de escolhas e capítulos), **5 eventos** com 2 escolhas cada (um sorteio a cada hora de trabalho, 35%, até 3 esperando), **bônus dos títulos** por mortes, **marcos do Bestiário** (+5/+10/+15% de dano contra a espécie em 100/1.000/5.000 abates) e **arcos** de 3 capítulos para cada uma das 22 origens especiais (nível 10, o Guardião de Casca Negra e nível 25), escritos a partir do gancho de cada origem. Escolhas ramificadas nos arcos e costura ficam para depois.
- **Casa/baú** na cidade, ampliável (de cada personagem).
- **Profissões secundárias:** alquimia, culinária, costura.
- **Selo do Destino** (item raro): ao rerolar na criação, trava um elemento do sorteio. Fica para depois do MVP.

## 15. Competição: bots, torneios e temporadas [Autor: ideia; mecânica: Proposta]

O jogo não termina, então a **competição** dá objetivo de longo prazo.

- **Campo de Provas:** simula o seu personagem contra um bot (ou contra o *build* de outro jogador) **muitas vezes** e mostra a taxa de vitória. Incentiva testar combinações. Roda no **motor determinístico**.
- **Arena assíncrona:** o jogador **registra um build** (retrato do personagem); o servidor simula as lutas contra outros builds e bots. Sem tempo real.
- **Bots de Arena:** gerados por semente, por arquétipos (tanque de Draconato, assassino Sangue-Pálido...), para a Arena nunca estar vazia.
- **Torneios** semanais em chave, resolvidos pelo servidor numa hora fixa, com **replay** reproduzível pela semente.
- **Temporadas** (por exemplo, 8 semanas): ranking, recompensas cosméticas, **um item nomeado de temporada**, modificadores temáticos ("Temporada da Lua Negra: sombras +20%"). Reiniciam o ranking, **nunca** o personagem.
- Ponto técnico: simular em lote exige CPU de servidor. Isso fica **depois** do jogo completo na web e define a infraestrutura (§ `ARQUITETURA.md`).

**Implementado na F12** [Proposta, Calibrar]:

- **Duelo** determinístico entre "retratos" (status de combate com equipamento e passivas; sem pets nem mundo), em passos de 0,5 s, até 2 min, com técnicas, crítico e esquiva. Reproduzível pela semente: os **replays** guardam só semente e retratos.
- **8 arquétipos** de bot (Tanque Draconato, Assassino Sangue-Pálido, Caçador Lobisomem, Berserker Orc, Arcano Elfo, Paladino Humano, Tempestade Silfo, Muralha Anã). Na Arena e no Campo de Provas são **pareados** pelo nível e pelo quanto o jogador já treinou.
- **Arena:** 10 lutas por dia, rating Elo (começa em 1.000), pontos de temporada, gold por vitória.
- **Torneio semanal:** chave de 16 (o jogador e 15 bots da semana), resolvida pela semente quando a semana acaba (segunda, 00:00 UTC); prêmio em pontos e gold.
- **Temporadas** de 8 semanas com tema em rodízio (Lua Negra, Sol Partido, Fera Solta, Pedra e Vento: +20% de ataque na Arena para quem combina). Com 2.500 pontos, a **insígnia** do tema (relíquia nomeada). Ranking contra 20 bots; a virada guarda os pontos no histórico e aproxima o rating de 1.000.
- Com banco (F9), o jogador **registra o build** e outros o testam no Campo de Provas. Arena e ranking globais entre jogadores ficam para quando houver banco e lote no servidor.

## 16. Interface (web, mobile-first) [Autor, detalhes: Proposta]

**Abas inferiores** (navegação principal): **Atividades · Combate · Mapa · Mochila · Missões · Personagem**.

**Sub-abas no topo** de cada uma:

| Aba | Sub-abas |
| --- | --- |
| **Atividades** | Treino · Coleta · Produção (inclui Forja) · Aprendizado · Pets (cuidados) |
| **Combate** | Áreas · Bestiário · O Limiar · Arena · Provas · Torneio (F12) |
| **Mapa** | Região · Local atual · Estabelecimentos |
| **Mochila** | Equipados · Equipáveis · Ferramentas · Materiais · Consumíveis · Nomeados |
| **Missões** | NPC · Metas · Guilda · História (F11) |
| **Personagem** | Status · Habilidades · Pets · Títulos · Crônica · Conta (F9) |

Tela fixa de **atividade atual** (barra no topo: o que o personagem faz, onde, progresso do ciclo, ganho por hora). Avisos claros de **risco de morte**, **mochila cheia** e **tempo offline restante**.

**Implementado na F13:** PWA instalável que abre sem rede (o save já é local); sons sintetizados, desligados por padrão; ícone do app; acessibilidade auditada com axe-core (sem violações em todas as telas), "pular para o conteúdo", foco visível e movimento reduzido. A barra mostra hora e clima (F11) e eventos aparecem no topo de qualquer aba.

## 17. Fora do escopo por enquanto

- Combate em tempo real e PvP direto.
- Troca/mercado entre jogadores.
- Arte final, animações e sons (ficam para depois do jogo completo na web).
- Port mobile (depois do web completo).
- Monetização. O projeto roda no plano Hobby da Vercel (uso pessoal e não comercial).

## Complemento de experiência do jogador — 24/11/2026

### Tutorial F13.5 — 26/11/2026

**[Implementação]** Tutorial por personagem, consultável no cabeçalho e Personagem → Guia. Novos personagens começam com sorteio reconhecido; os passos orientam iniciar treino/coleta, vender, equipar, iniciar caça e aceitar missão da Guilda. São reconhecidos por ações confirmadas em qualquer ordem, inclusive quando pausado. Pular/retomar não altera tentativas, RNG, tempo, itens ou gold. Não há recompensa nem bloqueio de sistemas. Os textos distinguem iniciar uma atividade de aguardar seu rendimento. Saves antigos recebem guia pausado, sem inventar histórico de ações; podem retomá-lo quando quiserem. O progresso sincroniza pela conta.

### Navegação F13.4 — 26/11/2026

**[Implementação]** Retrato, nome, nível, raça/core e atividade acompanham a jornada. Os seis sistemas mantêm os mesmos nomes/sub-abas, com navegação inferior no celular e lateral no desktop. Atalhos abrem a atividade atual, viagem, Limiar ou materiais quando a mochila enche, sem executar ações. O estado da conta fica no cabeçalho; sem confirmação do servidor, a conta permanece em leitura até reconectar ou entrar novamente. Ações, desbloqueios, fórmulas e saves não mudam. Tutorial permanece na F13.5.

### Entrada F13.3 — 26/11/2026

**[Implementação]** Apresentação antecede a criação. O jogador pode entrar, cadastrar ou recuperar conta sem sortear personagem neste aparelho. A seleção permite continuar suas jornadas ou retomar criação pendente, mantendo as tentativas existentes. Novo personagem continua sujeito aos slots/pergaminhos originais. Sair da conta volta à apresentação; modo local é uma escolha explícita. Nenhuma regra de sorteio ou progressão foi alterada.

### Contas F13.2 — 26/11/2026

**[Implementação]** A conta é continuada entre aparelhos por nome e senha. Cadastro mostra uma vez o código para recuperar acesso sem e-mail; o jogador o guarda fora do jogo. Recuperação preserva o personagem, troca a senha, encerra sessões anteriores e fornece outro código. Gerar código novo estando conectado exige a senha atual. Logout em um aparelho não desconecta outro; logout sem conexão não reconecta sozinho depois. Os detalhes de cookie e armazenamento ficam na arquitetura, sem alterar o balanceamento.

### Estabilização F13.1 — 26/11/2026

**[Implementação]** Conta online e convidado têm saves separados. O convidado continua jogável sem rede; a conta usa o relógio do servidor e, sem conexão, exibe apenas seu último estado confirmado até reconectar. O logout volta ao convidado, sem copiar o progresso online.

**[Implementação]** Ao conectar uma conta vazia, o jogador escolhe entre novo jogo online (sorteio criado pelo servidor) e importação única do jogo local. A importação preserva o progresso como casual e não pode substituir um jogo já existente. Jogos importados e legados continuam participando das lutas contra bots e dos sistemas já existentes, mas não podem publicar builds para outros jogadores. Essa distinção protege a procedência do conteúdo compartilhado; não cria PvP nem ranking global.

**[Autor]** A entrada deve apresentar o jogo e permitir autenticação em conta persistente entre dispositivos; navegador não define identidade. **[Autor]** A interface e navegação podem ser aprimoradas pelo agente sem seguir descrições anteriores literalmente, preservando princípios do jogo. **[Autor]** Incluir tutorial. **[Autor]** Quando spritesheets forem necessários, solicitar ao autor prompts técnicos para geração. [Proposta] Onboarding por ações reais, contextual, pulável e revisável; apresentação progressiva de sistemas e protagonismo visual do personagem. Ver [auditoria e critérios](AUDITORIA-CONSOLIDACAO.md).
