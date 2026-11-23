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

**Dons de raça** (a parte sorteada): cada raça tem uma tabela própria com 12 a 20 dons, de **Incomum a Primordial**. Exemplos para o Lobisomem: *Faro de Caçador* (Incomum), *Matilha Fantasma* (Raro: invoca ecos de lobo no combate), *Lua Cheia Plena* (Épico), *Primeira Presa* (Primordial: dano enorme contra a primeira espécie abatida a cada dia). Os dons são escritos por raça, coerentes com o tema dela. [Proposta]

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
2. Ele tem **5 chances** [Proposta, Calibrar] de rerolar. Pode **aceitar a qualquer momento**; ao esgotar as chances, **aceita o último resultado**.
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
5. **Detalhes finais.** Dons menores e um traço de personalidade (puramente narrativo; aparece na Crônica).

O sorteio é **determinístico por semente** (a semente é guardada para o servidor poder reproduzir e validar o resultado).

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

### 5.3 Nível máximo

Cresce com os Atos: Ato I vai até o **nível 50** [Proposta]. Novos Atos aumentam o teto de nível, abrem mapas, monstros, raças e cores. [Autor: o jogo não acaba]

## 6. Atividades

Só **uma atividade por vez**. Todas rodam em **ciclos**: a atividade tem um tempo base, que cai com velocidade/eficiência, e cada ciclo produz XP e itens. O progresso offline é calculado ao abrir o jogo, por no máximo **12 horas**. [Autor]

### 6.1 Treino de status [Autor]

Descrito em §5.2.

### 6.2 Coleta [Autor]

Madeira, mineração, pesca, agricultura e outras (ervas, caça de pele, escavação) [Proposta]. Cada coleta:

- só acontece em **locais** que têm o recurso; escolher "Carvalho Escuro" **obriga** o personagem a ir à floresta correspondente (§8);
- tem **nível de ofício** próprio (Lenhador, Minerador, Pescador, Fazendeiro...), que sobe com o uso e abre recursos melhores;
- usa a **ferramenta** do ofício; a ferramenta define eficiência (rendimento) e velocidade, e a **raridade** da ferramenta aumenta os dois;
- sofre efeito de **habilidades**, **pets**, **clima** e **hora do dia**.

### 6.3 Produção [Autor]

Transforma materiais em itens: forja de equipamento, carpintaria, alquimia, culinária, costura [Proposta]. Exige o **estabelecimento** certo (Ferreiro, Alquimista, Taverna...), que fica numa subárea da cidade. A forja também faz **fusão** (§9.4).

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

### 8.2 Exemplo

> "Carvalho" coleta nos arredores da Cidade X → **Carvalho Escuro** só existe numa floresta selvagem sem cidade por perto. Trocar de uma para a outra mostra "Movendo-se até Floresta Escura" por ~8 s e o ciclo recomeça lá.

### 8.3 Tempo e clima [Proposta]

Ciclo de **dia e noite** (acelerado, por exemplo 1 h real = 1 dia do jogo) e **clima** por região. Ambos mudam:

- recursos disponíveis (peixes noturnos, ervas que só florescem na chuva);
- monstros que aparecem;
- poder de raças e cores (Sangue-Pálido e **Ser das Trevas** são mais fortes à noite).

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

### 9.3 Mochila [Proposta]

Capacidade em espaços (aumenta com Força, ampliações e baú na cidade). Filtros e **venda em lote** para não cobrar microgestão de um jogo idle.

### 9.4 Forja e fusão [Autor]

- **Fusão:** combinar equipamentos para **subir a raridade**. [Autor]
- Regras iniciais [Proposta, Calibrar]: 3 itens do mesmo tipo e raridade → 1 item da raridade seguinte; custo em gold e material crescente; chance de sucesso com falha parcial (perde um item, não os três); **Sorte** aumenta a chance; garantia (*pity*) depois de N falhas seguidas; **itens nomeados não entram em fusão**.
- Itens nomeados forjáveis usam **receita especial** (fragmentos de chefes + material raro + item de raridade mínima).

### 9.5 Economia [Autor]

- **Entra gold:** venda a estabelecimentos do jogo.
- **Sai gold:** produção, fusões, compras em estabelecimentos, ampliação de mochila, estábulo.
- **Sem troca entre jogadores** no início (evita fraude e inflação).
- Moedas secundárias [Proposta]: **Essência do Limiar** (pedágio do Barqueiro) e **Mérito da Guilda** (promoções de rank). O **Pergaminho do Novo Destino** (reroll de personagem) é um item raro, não uma moeda.

## 10. Morte e O Limiar [Autor: ideia; detalhes: Proposta]

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

## 14. Sistemas extras [Proposta]

- **Crônica do personagem:** diário automático (raça, core, traço de personalidade, mortes, marcos, encontros). Ótimo para o lado narrativo.
- **Eventos aleatórios** durante atividades: viajante, achado raro, emboscada; dão escolhas simples.
- **Títulos e conquistas** com bônus.
- **Bestiário** e **catálogo de itens** (completar dá bônus).
- **Arcos de origem** (história): cadeias de missões e escolhas ligadas à origem especial do personagem. Depois do jogo base. [Autor, futuro]
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

## 16. Interface (web, mobile-first) [Autor, detalhes: Proposta]

**Abas inferiores** (navegação principal): **Atividades · Combate · Mapa · Mochila · Missões · Personagem**.

**Sub-abas no topo** de cada uma:

| Aba | Sub-abas |
| --- | --- |
| **Atividades** | Treino · Coleta · Produção (inclui Forja) · Aprendizado · Pets (cuidados) |
| **Combate** | Áreas · Bestiário · O Limiar |
| **Mapa** | Região · Local atual · Estabelecimentos |
| **Mochila** | Equipados · Equipáveis · Ferramentas · Materiais · Consumíveis · Nomeados |
| **Missões** | NPC · Metas · Guilda |
| **Personagem** | Status · Habilidades · Pets · Títulos · Crônica |

Tela fixa de **atividade atual** (barra no topo: o que o personagem faz, onde, progresso do ciclo, ganho por hora). Avisos claros de **risco de morte**, **mochila cheia** e **tempo offline restante**.

## 17. Fora do escopo por enquanto

- Combate em tempo real e PvP direto.
- Troca/mercado entre jogadores.
- Arte final, animações e sons (ficam para depois do jogo completo na web).
- Port mobile (depois do web completo).
- Monetização. O projeto roda no plano Hobby da Vercel (uso pessoal e não comercial).
