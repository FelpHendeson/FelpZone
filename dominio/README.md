# Domínio — Porto Neon

Jogo de navegador de gestão de gangue, por turnos, numa cidade fictícia.
Você cria o seu personagem e funda um bonde. Na **Campanha**, começa no colégio (Era Escola), salta anos no tempo para o próprio bairro (Era Bairro) e depois parte pra guerra de gangues da cidade. No **Modo Livre: Cidade**, vai direto pra Porto Neon.

Versão publicada: https://dominio-porto-neon.vercel.app

## Como jogar

- Arraste o mapa (mouse ou dedo) e dê zoom (roda ou pinça). Toque num ponto para ver as ações; toque no vazio para fechar.
- Pontos com círculo pontilhado estão ao seu alcance para ataque.
- Você tem 3 ações (⚡) por dia para atacar ou negociar. Mover guardas, recrutar e melhorar pontos não gastam ação.
- "Encerrar dia" recebe a renda, paga os soldados, faz os rivais jogarem e pode disparar batidas policiais.
- Vence quem tomar os três QGs rivais. Perde quem tiver o próprio QG tomado.
- Atacar um QG é uma **briga de bonde**: 3 rodadas de Avançar, Segurar ou Cercar (Avançar vence Cercar, Cercar vence Segurar, Segurar vence Avançar). Uma "leitura" do inimigo dá uma pista (acerta 70%), e o seu personagem pode entrar na briga uma vez.
- **Bairro e Cidade:** lotes vazios 🚧 se compram (não se tomam na força) e viram o que você construir; o 🔫 Arsenal compra armas de fornecedores (mais força, munição diária, mais visada; os rivais também se armam); eventos (bailão, racha, churrasco, ação social) dão bônus; o inferninho traz boatos e marca com ⚠️ o ponto que um rival vai atacar amanhã.
- **Cidade (F4):** mapa gerado por semente (~50 pontos, 4 gangues), zonas neutras (hospital, igreja, escola; delegacia não dá pra atravessar), pontos especiais (assalto, sequestro com resgate, extorsão), trégua, aliança (pode trair), assassinato do braço direito, emboscada com boato, política dos capitães (segura, lucro, equilibrada, agressiva) e +1 ⚡ a cada 10 pontos seus.
- **Mercado (📈, Bairro e Cidade):** produto das bocas (erva, pó, sintético), fornecedor (custo, qualidade, risco de apreensão), preço (barato rouba freguês e irrita os rivais; caro dá margem) e atração dos inferninhos; eventos de mercado mexem na demanda.
- **Expansão (campanha): Estado → País → Mundo.** Ao dominar Porto Neon, abre o mapa do estado. Em cada cidade nova você escolhe **mandar alguém** do bonde (leal, com apoio, forasteiro) ou **achar alguém** (personagem novo que se filia ao fazer nome). Cidade dominada vira sua, com patrão e tributo diário pra organização. Com caixa, dá pra **anexar na negociação** (menos o último lugar de cada nível). Completo o nível, sobe pro País e depois pro Mundo (apoio maior, rivais mais fortes). **Finais:** dominar o Mundo ou **largar a vida** a qualquer momento, com epílogo.
- **Tenentes:** até 2 por capitão (+8% de defesa no ponto, +2% de ataque do bonde); assumem se o capitão morrer ou trair.
- **Era Escola:** o "Barulho" gera advertências da diretoria (3 = suspensão de 2 dias), motos na oficina deixam atacar a duas ruas de distância, e um tutorial guiado mostra um objetivo por vez (dá pra pular). Ninguém morre na escola.
- **O bonde (👥):** você é o Comandante, com atributos, nível e origem. O vice e os capitães comandam pontos e dão bônus pelos traços. Cuide da lealdade: abaixo de 25, alguém pode trair. Membro com nome que morre não volta (exceto no modo leve).
- O progresso é salvo automaticamente no navegador.

## Rodar localmente

O jogo usa módulos ES, que o navegador não abre direto do arquivo (`file://`). Sirva a pasta com qualquer servidor estático:

```bash
cd dominio
```

```bash
python3 -m http.server 8000
```

Depois abra http://localhost:8000. Não há build: a Vercel publica a pasta como está.

## Testes e simulação (Node 18+)

```bash
node sim/save.test.mjs
```

```bash
node sim/bridge.test.mjs
```

```bash
node sim/campaign.test.mjs
```

```bash
node sim/balance.mjs 40 --era escola
```

- `save.test.mjs`: um save antigo (v0.1–v0.4) abre na versão atual.
- `bridge.test.mjs`: todo botão do HTML chama uma função que existe.
- `campaign.test.mjs`: Escola até vencer, salto no tempo, Cidade; briga de bonde; objetivos; save no meio da campanha.
- `balance.mjs`: um bot joga N partidas, com e sem suborno, e mede vitórias, duração, caixa final, visada, traições e mortes. `--sem-bonde` (bot ignora capitães) e `--cuidar` (bot dá agrado quando a lealdade cai). Rode a cada mudança de regra.

## Estrutura

```text
dominio/
├── index.html, style.css      # página e visual
├── manifest.json, icon*       # instalar na tela inicial (tela cheia, horizontal)
├── src/
│   ├── data/                  # dados: eras (eras/escola.js, eras/cidade.js), tipos de ponto, rivais, mapas, bonde,
│   │                          #        aparência, bandeiras, cenas e dicas
│   ├── core/                  # regras puras (sem DOM): estado, save versionado, combate, IA, polícia, negócios (business.js),
│   │                          #        bonde (crew.js), era ativa (era.js), briga de bonde (brawl.js),
│   │                          #        gerador de cidades (mapgen.js), operações especiais (ops.js),
│   │                          #        mercado (market.js), expansão Estado/País/Mundo e finais (estado.js)
│   └── ui/
│       ├── main.js            # mapa com câmera, HUD, painéis, relatório, rádio, tela cheia
│       ├── art.js             # avatares e bandeiras em SVG em camadas
│       ├── create.js          # criação do personagem e editor de bandeira/jaqueta
│       ├── crewui.js          # tela do bonde e escolha de capitão
│       ├── brawlui.js         # tela da briga de bonde
│       ├── arsenalui.js       # arsenal e fornecedores
│       ├── marketui.js        # mercado das bocas e atrações
│       ├── estadoui.js        # mapa do estado e escolha do braço
│       └── dialog.js          # cenas de diálogo e dicas do tutorial (puláveis)
├── sim/                       # simulador de equilíbrio e testes (Node)
└── docs/
    ├── gdd.md                 # documento de design: campanha em eras e roadmap
    └── layout.md              # spec do layout
```

- **Regras x interface:** `src/core` não toca na tela. Ele avisa a interface pelos `hooks` (`changed`, `newGame`, `dayEnded`, `gameOver`). Por isso a simulação roda no Node.
- **Eras** (`src/core/era.js`): `TYPES`, `RIVALS`, `MAP`, `UPKEEP` etc. são exportados como ligações vivas da era ativa; `useEra(id)` troca tudo. Uma era nova = um arquivo em `src/data/eras/`.
- **Save versionado** (`src/core/save.js`): cada mudança de formato ganha uma migração em `MIGRATIONS`, e partidas antigas continuam abrindo.

## Estado atual

v1.1 (F6 do roadmap: País, Mundo, tenentes e finais):
- **Níveis da expansão:** Estado → **País** (Sertão, Metrópole, Floresta, Fronteira Sul, Capital Federal) → **Mundo** (Sombra Alta, Porto Austral, Velha Marsala, Neo-Hakuro, Nexus). Lugares e gangues fictícios; gangues do país e do mundo geradas por lugar.
- **Dificuldade crescente:** cidades menores e apoio maior a cada nível, mas rivais que crescem e atacam mais. O último lugar de cada nível é o "chefe".
- **Anexar na negociação** com o caixa da organização (dá destino ao dinheiro que sobra).
- **Tenentes** com sucessão automática.
- **Finais:** Dono do Mundo ou Largar a vida, com epílogo (lugares, patrões, quem caiu, caixa, dias).

v1.0 (F5 do roadmap: mercado e Estado):
- **Mercado** das bocas e atração dos inferninhos, com eventos de mercado e apreensão de carga.
- **Estado:** 5 cidades (Porto Neon, Vale do Ferro, Praia Dourada, Serra Azul e a Capital), cada uma com 4 gangues próprias e dificuldade crescente. Expansão por braços (mandar ou achar), filiação ao fazer nome (normal ou cobrando caro), patrões e tributo. Final "o estado é seu".
- Save v7.

v0.9 (F4 do roadmap: Cidade completa):
- **Cidade gerada por semente** (~50 pontos, ruas sem cruzamentos estranhos, sempre conectada) com **4 gangues** (entram os Lobos da Serra); a semente aparece no menu e pode ser escolhida no Modo Livre.
- **Zonas neutras** (hospital acelera a recuperação, igreja dobra a ação social, escola pune briga do lado) que dá pra atravessar.
- **Pontos especiais:** assalto (banco, joalheria, lotérica, supermercado, caixa 24h), sequestro (mansão, resgate em 2 dias) e extorsão (renda diária).
- **Contra gangues:** trégua, aliança (30% de traição no fim), assassinato do braço direito (o executor pode ser preso ou morrer) e emboscada (com boato do inferninho).
- **Política dos capitães**; o agressivo ataca sozinho. **+1 ⚡ a cada 10 pontos** seus.
- Save v6 (saves antigos seguem no mapa fixo).

v0.8 (F3 do roadmap: Era Bairro):
- **Campanha em 3 eras:** Escola → anos depois → **Bairro** (Morro do Farol, 3 gangues locais, 6 lotes) → expansão → Cidade. Na expansão ninguém sai do bonde; metade do caixa e todas as armas vêm junto.
- **Lotes e obras** (boca, bar, inferninho, desmanche, academia, depósito); 3 lotes novos na Cidade.
- **Arsenal:** faca/taco, pistola, escopeta e fuzil (só na Cidade), 4 fornecedores com preço e risco de rastreio; munição diária e visada. **Rivais se armam** quando sobra caixa.
- **Eventos** nos pontos com bônus temporários; **boatos** do inferninho mostram o próximo ataque rival.
- Save v5 (saves da Cidade ganham os lotes novos ao carregar).

v0.7 (F2 do roadmap: Era Escola):
- **Campanha** começando no colégio: mapa do Estadual e arredores, 3 colégios rivais (as futuras gangues da cidade), pontos próprios (quadra, banheiro dos fundos, cantina, oficina, lanchonete...).
- **Briga de bonde** nos QGs, em qualquer era.
- **Advertências e suspensão** no lugar da polícia; **motos**; **tutorial guiado** com objetivos e falas do vice.
- **Salto no tempo:** cena com narrador, quem tinha lealdade baixa segue outro caminho, renomear o bonde e redesenhar a bandeira, e a Cidade começa com o mesmo personagem e bonde.
- Save v4 (saves antigos viram partidas do Modo Livre: Cidade).

- **v0.6 (F1):** personagem, bonde, bandeira, diálogos e dicas.

- **Criação do personagem** em 4 passos: nome, vulgo, origem, aparência (avatar ilustrado), atributos, bandeira e jaqueta, modo leve.
- **Bonde:** vice e capitães com nome, traços, nível e lealdade; designar capitão a um ponto; promover; agrado; tentação dos rivais; traição; morte permanente (ou hospital no modo leve); prisão em megaoperação.
- **Comandante:** XP e nível, pontos de atributo; atributos afetam ataque, defesa, recrutamento, compra de pontos e visada.
- **Identidade:** bandeira hasteada nos seus pontos, avatar do capitão no mapa, bandeira no topo.
- **Cenas de diálogo** (abertura com escolha, traição, morte, nível, capitão novo) e **dicas** do tutorial, tudo pulável e desligável.
- Save v3: saves antigos ganham um Comandante e um bonde padrão.

- **v0.5:** código em módulos, save versionado, simulador e testes no Node.

- **v0.4:** layout de jogo de estratégia, com o mapa em tela cheia (arrastar e zoom), a interface flutuando nas bordas e ações conforme o ponto tocado. No celular, tela cheia na horizontal.
- **v0.2:** a "Visada" (atenção da polícia) anda até um alvo definido pelos seus pontos; o suborno dá 3 dias de vista grossa; dá pra "baixar a poeira" num ponto.

Equilíbrio atual: **Escola** (era tutorial) ~25 dias, o bot sempre vence. **Bairro** ~95% em ~40 dias. **Cidade gerada** (4 gangues): bot básico ~66% em ~120 dias; bot usando operações e armas ~90–95% em ~100–120 dias. Com assaltos, o caixa volta a sobrar no fim (~$70 mil): o mercado (F5) e novos gastos vão equilibrar. Sem cuidar da lealdade, ~0,7 traição por partida; cuidando, ~0,1. ~0,4 capitão morto por partida. Sem controlar a visada, ela fica perto de 75 no fim.

Expansão (bot usando operações e armas): cidades comuns do Estado ~95–100% em ~100 dias; os "chefes" (Capital, Capital Federal, Nexus) ~75–95% controlando a visada e bem menos ignorando a polícia.

**Próximo:** F7 do `docs/gdd.md`: polimento (animações, sons e música, mais falas e lore, conquistas).
