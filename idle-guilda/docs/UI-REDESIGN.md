# LionHearth — Spec de UI/UX: mochila, tooltips e redesign do front

Nov 19, 2026 · @Felipe Hendeson

## 1. Contexto e objetivos

Esta spec dá à Mochila uma tela própria, troca o tooltip de uma linha por um cartão de item e refaz o visual do `idle-guilda` (LionHearth) para o nível dos idle RPGs atuais. Ela foi escrita para o Claude Code executar em fases (seção 10).

**Problemas observados** (print de idle-guilda.vercel.app, 19/11/2026, e leitura do código):

- A mochila não existe como tela. O inventário (`estado.inventario`, máximo de 60) só aparece dentro de Cidade (Ferreiro e Loja) e no modal de equipar da Ficha do herói.
- O contador "🎒 60/60" da barra superior só tem `title="Itens no inventário"` e não responde ao clique.
- Com 60/60, o motor vende o loot novo na hora (`guardarItem` em `src/motor/itens.ts`), mas a interface não avisa nada. O jogador perde itens sem saber.
- O visual é uma coluna de painéis planos e iguais, com emojis no lugar de ícones, texto monoespaçado em tudo e largura fixa de 620 px até no desktop.

**Objetivos**

1. Mochila como destino de primeira classe: tela própria, filtros, ordenação, ações em lote e capacidade visível.
2. Um único cartão de item (hover no desktop, toque no celular) com comparação contra o equipado, usado em todas as telas.
3. Sistema visual coeso (cores, tipografia, componentes, movimento) inspirado em AFK Journey e outros idle RPGs, sem perder a identidade pixel art.
4. Uso confortável no celular e aproveitamento do desktop.

**Fora de escopo:** regras do motor (`src/motor/`), balanceamento, formato do save e arte nova. Reaproveitar os sprites e ícones que já existem em `public/sprites/`.

## 2. Diagnóstico do estado atual

O front tem \~4.600 linhas (`src/ui/*.tsx` + `src/style.css` com 1.636 linhas), é React puro sem biblioteca de UI e todo o CSS está num arquivo só. A base é boa para reformar: `Modal`, `SubAbas`, `Medidor`, `Recurso`, `IconeItem`, `CanvasPixel` e `DADOS_RARIDADE` (com cor por raridade) já existem e devem ser reaproveitados.

| Área | Onde | Como está hoje | Problema |
| --- | --- | --- | --- |
| Navegação | `App.tsx` (`ABAS`), tipo `Destino` em `motor/objetivos.ts` | 5 abas fixas: Batalha, Party, Cidade, Expedições, Mundo | Sem Mochila |
| Barra superior | `Barra.tsx` | Ouro, material, essência e "🎒 n/60"; fica vermelho a partir de 55 | Só `title` nativo, sem clique, sem explicar o que acontece quando enche |
| Item | `comum.tsx` (`DetalheItem`) | Bloco de texto: nome, raridade, atributos, afixos | Mesmo bloco em três listas longas; comparação com o equipado só no modal de equipar |
| Inventário em listas | `Cidade.tsx` (Ferreiro: melhorar/desmontar; Loja: vender), `Ficha.tsx` (`EscolherItem`) | Três listas diferentes, sem filtro nem ordenação | Não dá para ver tudo de uma vez nem achar uma peça |
| Tooltips | 8 usos de `title=` (Barra, `Recurso`, recargas em Batalha, Mundo, Ficha) | Texto nativo do navegador | Aparece com atraso, não tem formatação e não existe no toque |
| Estilo | `style.css`, `:root` com 11 variáveis | Fundo `#11121c`, painéis `#1e2033`, borda de 3 px por `box-shadow`, fonte monoespaçada do sistema | Sem escala de espaçamento, sem hierarquia visual, cores de raridade fora do CSS |
| Layout | `.app { max-width: 620px }` e só duas consultas de largura, a de 420 px e `@media (min-width: 560px)` | Uma coluna centralizada | Desktop quase todo vazio; nenhum layout em duas colunas |
| Movimento | 2 animações `steps()` (pulsar e brilhar) | Quase só indicadores | Sem números de dano, sem feedback de loot ou de subir de nível |

A tela de Batalha já desenha a cena num canvas (`desenharBatalha`) com spritesheets, então o jogo tem uma boa base visual. O que falta é a camada de interface em volta dela.

## 3. Referências e o que adotar

A referência principal é o AFK Journey, apontado em 2026 como o idle RPG mais polido visualmente (ver [Best Mobile Idle Games 2026](https://progameguides.com/mobile/best-idle-mobile-games)). Uma [análise do PocketGamer.biz](https://www.pocketgamer.biz/game-analysis-the-evolution-of-idle-rpg-systems) mostra que o jogo melhorou o gênero ao simplificar: juntou a gestão de personagens numa tela só, deixou trocar a party sem menus extras e tirou o mapa da campanha do centro da tela. Os padrões de inventário vêm de um [guia de padrões de UI para inventários](https://www.abratabia.com/game-ui-design/inventory-ui.php).

| Padrão | Origem | Como aplicar no LionHearth |
| --- | --- | --- |
| Menos telas de gestão, ação no mesmo lugar | AFK Journey | Equipar, comparar e vender direto da Mochila, sem passar pela Ficha ou pela Cidade |
| Troca de party e equipamento sem menu extra | AFK Journey | Da Mochila, "Equipar em…" abre a escolha do herói com a comparação já calculada |
| Grade com borda na cor da raridade e selos no canto | Padrões de inventário | Grade de células de 56–72 px no celular, 4–5 colunas; selo de nível e de melhoria (+N) no canto |
| Hover no desktop, toque abre painel no celular | Padrões de inventário | Um único cartão de item; no celular vira painel inferior (bottom sheet) |
| Comparação com setas verdes e vermelhas | Padrões de inventário | Cartão do item mostra ▲/▼ contra a peça equipada e um selo "melhor" na grade |
| Filtro e ordenação em inventários grandes | Padrões de inventário | O limite de 60 itens passa do ponto em que filtro ajuda; entram filtros por espaço, raridade e "para este herói" |
| Tocar para selecionar, tocar de novo para agir | Padrões de inventário | Sem arrastar no celular; seleção múltipla para venda e desmontagem em lote |
| Evitar rolagem aninhada | Padrões de inventário | A Mochila usa a altura inteira da tela; só a grade rola |

Não copiar de nenhuma referência: gacha, moedas premium, vitrines e qualquer pop-up de compra.

## 4. Navegação e arquitetura de telas

**Decisão:** a Mochila vira a terceira aba da barra inferior, entre Party e Cidade. A barra fica: Batalha · Party · Mochila · Cidade · Expedições · Mundo.

| Aba | O que mostra | Atalhos que levam até ela |
| --- | --- | --- |
| Batalha | Cena, onda, loot recente, party em combate, mapas | Objetivo atual |
| Party | Lista de heróis, pontos livres | Toque num herói abre a Ficha |
| **Mochila (nova)** | Grade de itens, filtros, ações, capacidade | Contador da barra superior, aviso de inventário cheio, "Equipar" na Ficha |
| Cidade | Ferreiro, Loja, Taverna, Jardim | Objetivo atual |
| Expedições | Missões e treino | — |
| Mundo | Ranking, mural, jogadores online | Menu |

**Como implementar**

1. Em `App.tsx`, criar `type DestinoUi = Destino | 'mochila'` e usar esse tipo em `aba`, `ABAS` e `irPara`. Não alterar `Destino` em `src/motor/objetivos.ts`, para manter o motor intacto.
2. Criar `src/ui/Mochila.tsx` e renderizá-la quando `aba === 'mochila'`.
3. Em `Barra.tsx`, transformar o contador do inventário num botão que chama `irPara('mochila')` (nova prop `aoMochila`). Mostrar uma barra fina de ocupação e o número, em três estados: normal (abaixo de 80%), atenção (80% ou mais, amarelo) e cheio (60/60, vermelho com selo "CHEIO").
4. Ponto de alerta (`.alerta`) na aba Mochila quando houver 55 itens ou mais, ou quando existir um item que possa ser melhoria para algum herói (ver 5.4).
5. A barra com 6 abas tem de caber em 360 px de largura: rótulo de 0,66 rem, ícone de 20 px, sem quebra de linha.

**Em telas largas (900 px ou mais)** a barra inferior vira uma coluna lateral fixa à esquerda e o conteúdo ganha duas colunas (detalhes na seção 7).

**Cidade:** Ferreiro e Loja passam a usar a grade e o cartão da Mochila nas listas de itens, em vez das três listas de texto atuais (fase 3).

## 5. Mochila

Tela nova em `src/ui/Mochila.tsx`. Ela lê `estado.inventario` e chama as ações que já existem em `src/motor/acoes.ts` (`equiparItem`, `desmontar`, `vender`), sem mudar o motor.

### 5.1 Layout (celular)

1. **Cabeçalho:** título, ocupação `n/60` com barra fina e botão "Selecionar".
2. **Filtros** (chips em linha com rolagem horizontal): Todos · Arma · Armadura · Mão secundária · Acessório · Relíquia; um seletor "Para: \[herói\]" que mostra só o que aquele herói pode usar (`podeUsar`); chips de raridade; alternador "Só possíveis melhorias".
3. **Ordenação** (seletor): mais recentes (padrão), raridade, nível do item, valor (`valorDoItem`), espaço, melhoria.
4. **Grade:** `grid-template-columns: repeat(auto-fill, minmax(60px, 1fr))`, células quadradas. Cada célula é um `<button>` com o ícone (`IconeItem`), borda e brilho na cor da raridade (`DADOS_RARIDADE[...].cor`), nível no canto superior esquerdo, `+N` de melhoria no inferior direito, ◆ se for de conjunto e ▲ verde se for possível melhoria. Os espaços livres até 60 aparecem como células vazias, para o jogador ver o quanto sobra.
5. **Cartão do item selecionado** (seção 6) abaixo da grade no celular e ao lado dela no desktop.

### 5.2 Ações no cartão

- **Equipar:** se só um herói pode usar a peça, equipa direto; se vários podem, abre a escolha do herói já com a comparação de cada um. Quando a peça cabe em dois espaços (acessórios), perguntar qual (`slotsDoItem`).
- **Melhorar no Ferreiro:** leva à Cidade, aba Ferreiro, modo Melhorar, com o item destacado.
- **Desmontar** e **Vender (+ouro)**: o motor não exige estar na Cidade, então ficam disponíveis na Mochila. Raro ou melhor pede confirmação (segundo toque em "Confirmar?") porque não dá para desfazer.
- **Seleção em lote:** "Selecionar" liga o modo múltiplo; barra de ação fixa no rodapé com "Vender (n) +ouro" e "Desmontar (n)". Atalho "Selecionar comuns e incomuns" reaproveita a lógica que a Loja já usa.

### 5.3 "Possível melhoria"

Criar `src/ui/mochila.ts` (funções puras, com testes em Vitest): `heroisParaItem(estado, item)` devolve os heróis para quem o item pode ser melhoria. Regra: o herói passa em `podeUsar`, o item cabe no espaço e, ou o espaço está vazio, ou a soma dos atributos de `statsDoItem(item)` supera a da peça equipada. É uma heurística; o rótulo é "possível melhoria" e nunca "melhor".

### 5.4 Capacidade e inventário cheio

Com 60/60, `guardarItem` vende o loot novo automaticamente pelo preço de venda. A interface passa a dizer isso:

- Faixa de aviso fixa no topo da Mochila e da Batalha: "Mochila cheia: itens novos são vendidos na hora". Botão "Liberar espaço" vende os comuns e incomuns.
- Mesmo texto no tooltip do contador da barra superior (seção 6).
- Sugestão para depois, fora desta spec: contar os itens vendidos automaticamente nas estatísticas (exige mudar o motor e migrar o save).

### 5.5 Detalhes

- Filtros e ordenação ficam em `useState`; guardar a última escolha em `localStorage` (chave `idle-guilda:ui:mochila`, sempre com `try/catch`).
- Estado vazio: ilustração simples e a dica "Monstros, chefes, expedições, a Loja e o Ferreiro dão itens" (texto que já existe em `Ficha.tsx`).
- Acessibilidade: cada célula tem `aria-label` completo ("Espada de Aço +3, raro, nível 12"), setas do teclado movem o foco na grade e o foco fica visível.
- Opcional (fase 4): aba interna "Equipados" com os 10 espaços de cada herói, usando `SubAbas`.

## 6. Tooltips e cartões de detalhe

Hoje todas as dicas são o atributo `title` do navegador: aparece com atraso, não aceita formatação e não existe no toque. Entram dois componentes novos, sem biblioteca externa (o projeto só depende de React).

### 6.1 `Dica` (`src/ui/Dica.tsx`)

Balão curto para recursos, recargas, nuvem e botões. Uso: `<Dica conteudo={…}>{elemento}</Dica>`.

- Desktop: abre em hover ou foco do teclado após \~150 ms, dentro de um portal em `document.body`, com posição que inverte de lado quando o balão sairia da tela.
- Celular (`pointer: coarse`): o toque abre o balão e um toque fora (ou 4 s) fecha. O toque no elemento não dispara a ação dele se for só para ler a dica, a menos que o elemento seja um botão de navegação.
- `role="tooltip"`, `aria-describedby` e respeito a `prefers-reduced-motion`.

### 6.2 Conteúdo novo das dicas

| Onde | Hoje | Passa a mostrar |
| --- | --- | --- |
| Contador da Mochila (`Barra.tsx`) | "Itens no inventário" | "Mochila 52/60 · 8 livres. Toque para abrir." Quando cheia: "Mochila cheia: itens novos são vendidos na hora." |
| Recursos (`Recurso` em `comum.tsx`) | Só o nome | Nome, para que serve e onde obter. Ouro: compra na Loja e paga forja e melhorias; vem de abates, expedições e vendas. Essência: pedida em melhorias a partir de +6 e na forja com essência; vem de peças raras desmontadas. Material de mapa: usado na forja e nas melhorias; vem do mapa e de desmontar itens |
| Recarga de habilidade (`Batalha.tsx`) | "Nome: 3 s" | Nome, rank, elemento (cor e nome), descrição (`hab.descricao`), recarga total e nível |
| Botão "+" de atributo (`Ficha.tsx`) | "+1.5" | "+1,5 ATQ por ponto. Você tem 3 pontos livres." |
| Nível da habilidade (`Ficha.tsx`) | "12/30 usos" | "Nível 3 · faltam 18 usos para o nível 4" |
| Ícone da nuvem (`Barra.tsx`) | Texto de uma linha | Estado (salvo, enviando, erro) e horário do último envio |

### 6.3 `CartaoItem` (substitui `DetalheItem`)

Um único cartão de item para Mochila, Ferreiro, Loja e Ficha. Manter `DetalheItem` como atalho até a migração terminar. De cima para baixo:

1. **Topo:** ícone de 48 px, nome na cor da raridade, linha "Raro · Peitoral · pesada · nível 12", selo `+N` e, se houver, ◆ com o nome do conjunto.
2. **Atributos:** duas colunas, uma linha por atributo, com a diferença contra a peça equipada (▲ verde, ▼ vermelho) usando `statsDoItem`.
3. **Afixos:** um por linha, com ponto na cor da raridade (texto de `descreverMod`).
4. **Conjunto:** bônus de 2, 4 e 5 peças (`CONJUNTOS`) com quantas peças o herói escolhido já tem.
5. **Quem pode usar:** retratos pequenos (`Retrato`) dos heróis que passam em `podeUsar`; os que não passam aparecem apagados com o motivo.
6. **Rodapé:** valor de venda e botões de ação.

A comparação usa um seletor "Comparar com: \[herói\]", que começa no primeiro herói que pode usar a peça.

**Desktop:** passar o mouse numa célula mostra a versão compacta (nome, raridade e os três principais atributos, sem botões); clicar fixa a versão completa no painel lateral. Isso evita o cartão enorme tapando a grade.

**Celular:** tocar seleciona e abre o cartão como painel inferior (variante `folha` do `Modal`), que fecha com ✕ ou toque fora.

### 6.4 Regras

- Nenhuma informação só pela cor: sempre acompanhar de ▲/▼, texto ou ícone.
- Contraste de texto de pelo menos 4,5:1 e fonte mínima de 13 px nos cartões.
- Números sempre pelos formatadores de `src/ui/texto.ts` (`inteiro`, `compacto`).

## 7. Sistema visual

A identidade continua pixel art em azul-noturno. A mudança é dar profundidade, hierarquia e consistência. Tudo começa num arquivo novo, `src/estilos/tokens.css`, importado antes de `style.css`; o resto do CSS migra para os tokens aos poucos.

### 7.1 Tokens

| Token | Valor | Uso |
| --- | --- | --- |
| `--fundo-0` | `#0d0e17` | Fundo da página |
| `--fundo-1` | `#151728` | Faixas e barras (topo, navegação) |
| `--fundo-2` | `#1e2033` | Painéis (o `--painel` de hoje) |
| `--fundo-3` | `#282b44` | Cartões dentro de painéis, células |
| `--linha` | `#3a3f6b` | Bisel claro e divisores |
| `--borda` | `#080810` | Moldura escura (já existe) |
| `--texto` / `--suave` | `#ecebf5` / `#a3a2c2` | Texto principal e secundário |
| `--ouro` | `#f2c14e` | Ação principal e moeda |
| `--acento` | `#5b9bff` | Seleção e foco |
| `--verde` / `--perigo` | `#5fcf5a` / `#e0603a` | Melhor ou cura / pior ou perigo |
| `--r-comum` … `--r-lendario` | `#c9c9d6`, `#7ed66a`, `#5b9bff`, `#c27bff`, `#ffb43a` | Raridade |
| `--el-fogo` … `--el-luz` | `COR_ELEMENTO` | Elementos |
| `--esp-1` … `--esp-6` | 4, 8, 12, 16, 24, 32 px | Espaçamento |

As cores de raridade e de elemento já existem em TypeScript (`DADOS_RARIDADE`, `COR_ELEMENTO`). Para não duplicar, `main.tsx` grava essas cores como variáveis CSS em `:root` na inicialização.

### 7.2 Moldura pixel dos painéis

Painéis e cartões ganham bisel, para parecerem objetos e não retângulos chapados:

```css
.painel {
  background: var(--fundo-2);
  box-shadow:
    inset 2px 2px 0 rgba(255, 255, 255, 0.06),
    inset -2px -2px 0 rgba(0, 0, 0, 0.35),
    0 0 0 3px var(--borda),
    0 5px 0 3px var(--borda);
}
```

### 7.3 Tipografia

- Títulos, números grandes e rótulos de aba: fonte pixel com licença aberta (sugestão: Pixelify Sans). Hospedar no próprio projeto, nunca por CDN, para funcionar offline. Se o pacote `@fontsource/pixelify-sans` existir no npm, usar; senão, colocar o arquivo `woff2` em `public/fonts/` e declarar com `@font-face`.
- Texto corrido (descrições, lore, dicas): fonte sem serifa do sistema. Hoje tudo é monoespaçado, o que cansa em parágrafos.
- Escala: tela 1,25 rem, seção 1 rem, corpo 0,94 rem, legenda 0,81 rem; nada abaixo de 13 px. Números com `font-variant-numeric: tabular-nums`.

### 7.4 Ícones

Troca dos emojis (⚔ 🛡 🏰 🧭 🌐 🎒 ☁ ☰) por ícones pixel do mesmo tamanho e traço. Criar `src/arte/ui.ts` no mesmo formato dos sprites que já existem em `src/arte/` e o componente `IconeUi` (`nome`, `tamanho`). Lista mínima: batalha, party, mochila, cidade, expedições, mundo, menu, nuvem, filtro, ordenar, cadeado, selecionar, vender, desmontar. Enquanto um ícone não existir, o `IconeUi` cai no emoji atual. Alternativa: gerar a folha de ícones no Gemini pelo pipeline de `scripts/fatiar.py`.

### 7.5 Botões e estados

- Três níveis: **principal** (dourado, bisel; `button.principal` já existe), **secundário** (`--fundo-3`) e **perigo** (vermelho, só para vender e desmontar).
- Estados: hover clareia, `:active` afunda 2 px, `:disabled` com 45% de opacidade e `cursor: not-allowed`, foco com contorno azul de 2 px (`:focus-visible`).
- Área de toque de pelo menos 44 × 44 px.

### 7.6 Responsivo

| Faixa | Layout |
| --- | --- |
| Menos de 560 px | Uma coluna, barra inferior com 6 abas |
| 560 a 899 px | Uma coluna mais larga (até 720 px), listas em duas colunas |
| 900 px ou mais | Navegação vira coluna lateral de 88 px à esquerda; `main` em duas colunas, largura máxima de 1100 px. Em Batalha, a cena fica à esquerda e fixa; party e mapas ficam à direita. Na Mochila, a grade fica à esquerda e o cartão do item à direita |

Remover o `max-width: 620px` de `.app` e de `.abas`, trocando por essas faixas.

## 8. Telas principais

Mudanças por tela, todas sobre o código atual e sem tocar no motor. Os nomes de componentes são os que já existem.

| Tela | Arquivo | Mudanças |
| --- | --- | --- |
| Barra superior | `Barra.tsx` | Recursos em pílulas com ícone pixel e `Dica`; a pílula da Mochila é botão (seção 4); ícone da nuvem com estado claro |
| Objetivo | `Objetivo.tsx` | Faixa de missão com barra de progresso dos capítulos ("Capítulo 8/21" vira 8 de 21 preenchidos) e a recompensa em destaque. O botão "ir" continua levando à aba certa |
| Batalha | `Batalha.tsx` | Mapa e onda como rótulo sobre a cena (hoje ficam numa linha abaixo); selo de chefe; "Party em combate" em cartões com retrato de 48 px, vida com escudo sobreposto em outra cor e as habilidades como ícones com anel de recarga (substituem as barrinhas) com `Dica`; herói caído apagado. "Mapas" vira grade de cartões com a miniatura do cenário (`public/sprites/cenario-*.png`), cadeado e "abre no nível N" |
| Party | `Party.tsx` | Cartão por herói com retrato maior, barra de XP, selo de pontos livres, resumo dos 10 espaços como miniícones e atalho "Equipar melhor" (usa `heroisParaItem`) |
| Ficha do herói | `Ficha.tsx` (428 linhas) | Se ainda não for assim, separar em `SubAbas`: Atributos, Habilidades, Equipamento. Em Equipamento, tocar num espaço abre a lista de peças com o `CartaoItem` e a comparação |
| Cidade | `Cidade.tsx` (441 linhas) | Ferreiro, Loja, Taverna e Jardim como abas com ícone. **Ferreiro:** item selecionado grande, barra de melhoria de +0 a +10 e custo com `Recurso` mostrando o que falta. **Loja:** grade e cartão iguais aos da Mochila; "Vender" reaproveita a seleção em lote |
| Jardim de habilidades | `Cidade.tsx` | Hoje cada canteiro tem três seletores. Passa a ter retratos para escolher o herói e duas ranhuras de semente que abrem a lista de habilidades; a prévia do resultado (`previaFusao`) aparece antes de plantar, e a fusão em andamento mostra barra e tempo restante |
| Expedições | `Expedicoes.tsx` | Missões em cartões com duração, recompensa esperada e heróis envolvidos; barra de progresso nas em andamento |
| Mundo | `Mundo.tsx` | Só migra para os tokens e para o novo cartão de painel |
| Janelas | `Modal.tsx` | Nova variante `folha` (painel inferior no celular, centralizado no desktop) com entrada de 120 ms; Esc, ✕ e toque fora continuam fechando |

## 9. Feedback e polimento

Idle RPG vive de pequenas recompensas visíveis. Hoje o jogo quase não mostra o que acontece. Tudo abaixo é feito só na interface, comparando o estado entre dois ticks; nada exige mudar o motor.

- **Feed de loot:** em `App.tsx`, guardar os `uid` do inventário do tick anterior (`useRef`); item novo gera um aviso com ícone e nome na cor da raridade. Épico e lendário ganham brilho e ficam 2 s a mais na tela. Com a mochila cheia, o aviso diz "vendido automaticamente" quando o ouro sobe sem item novo.
- **Números de dano:** na cena de batalha (`src/arte/batalha.ts`), números flutuantes calculados pela queda de vida entre ticks (heróis em `estado.batalha.herois`). Se o estado não tiver dados suficientes para os inimigos, entregar só os dos heróis e registrar a limitação como sugestão para o motor.
- **Subir de nível:** comparar `h.nivel` entre ticks e mostrar um selo animado no retrato e um aviso "Quentin chegou ao nível 6".
- **Avisos:** trocar o aviso único de 3,5 s (`aviso` em `App.tsx`) por uma fila de até 3 avisos empilhados, com ícone e tipo (informação, sucesso, erro) e `aria-live="polite"`.
- **Resumo offline** (`ResumoOfflineModal.tsx`): ícones, números que sobem até o valor final em \~600 ms e os itens raros em destaque. Se a mochila estiver cheia, dizer quantos itens foram vendidos.
- **Transições:** troca de aba com fade de 100 ms; ouro e materiais animam quando sobem.
- **Estados vazios:** toda lista vazia tem texto curto e a próxima ação possível (ex.: "Nenhum item. Lute em Bosque Suspenso ou visite a Loja").
- **Movimento:** animações de até 200 ms, exceto indicadores em loop, e tudo desligado com `prefers-reduced-motion` (o CSS atual já tem o bloco; estender).

**Cuidado de desempenho.** O laço do jogo chama `setEstado` a cada 250 ms (`App.tsx`), então toda a árvore re-renderiza várias vezes por segundo. A grade da Mochila (60 células) deve usar células em `React.memo` com `key={item.uid}`, e o portal da `Dica` não pode re-renderizar a cada tick. Medir no Chrome DevTools (aba Performance) antes e depois da Fase 2.

## 10. Plano de execução, aceite e restrições

Cinco fases, uma por vez, na ordem abaixo. A Fase 2 resolve o pedido mais urgente (mochila e tooltip); a Fase 1 existe só para a Fase 2 já nascer com os tokens certos.

| Fase | Entrega | Critério de aceite |
| --- | --- | --- |
| 1. Base visual | `src/estilos/tokens.css`, variáveis de raridade e elemento gravadas por `main.tsx`, moldura pixel, botões em três níveis, `IconeUi` com fallback para emoji | `npm run build` passa; telas atuais continuam iguais ou melhores; sem regressão de layout em 360 px |
| 2. Mochila e cartão de item | `Dica`, `CartaoItem`, `Mochila.tsx`, `mochila.ts` com testes, contador da barra clicável, aviso de mochila cheia, aba nova | Abrir a Mochila pelo contador e pela aba; filtrar, ordenar, equipar, vender e desmontar (um e em lote); cartão com comparação ▲/▼; os 8 `title=` substituídos; 60 células sem queda de desempenho perceptível; barra de 6 abas cabe em 360 px |
| 3. Layout e telas | Responsivo (coluna lateral a partir de 900 px), tipografia nova, Batalha, Party, Ficha, Objetivo, Expedições, Mundo | Desktop usa duas colunas; nenhum texto abaixo de 13 px; `Modal` com variante `folha` |
| 4. Cidade | Ferreiro, Loja e Jardim redesenhados com grade e cartão | Comprar, vender, forjar, melhorar, desmontar, plantar e colher funcionam como antes; a prévia de fusão aparece antes de plantar |
| 5. Feedback e polimento | Feed de loot, números de dano, aviso de nível, fila de avisos, resumo offline, transições | `prefers-reduced-motion` desliga tudo; sem perda de FPS na Batalha |

**Restrições para todas as fases**

- Não alterar `src/motor/`, o formato do save nem a chave `idle-guilda:save:v3`. Se uma melhoria exigir mudar o motor, parar e registrar como sugestão.
- Textos em português do Brasil, no estilo dos já existentes.
- Sem dependências novas além da fonte (7.3). Nada de CDN.
- Sem informação só por cor; área de toque de 44 px; foco visível; `prefers-reduced-motion` respeitado.
- `npm test` e `npm run build` precisam passar ao fim de cada fase. Testar no navegador em 360 px e em 1280 px.
- Commits pequenos, em uma branch `feat/ui-redesign`.
- Ao terminar cada fase, listar o que foi feito, o que ficou de fora e onde a spec divergiu do código.

**Como entregar ao Claude Code**

Exporte este doc como Markdown e salve em `idle-guilda/docs/UI-REDESIGN.md`. Depois, um prompt por fase (troque o número):

```markdown
Leia `idle-guilda/docs/UI-REDESIGN.md` inteiro e implemente apenas a Fase 1.
Siga as restrições da seção 10. Não comece a próxima fase.
Ao final, rode `npm test` e `npm run build`, confira o jogo em 360 px e 1280 px
e me diga o que foi feito, o que ficou de fora e onde a spec divergiu do código.
```

**Decisões que assumi (podem ser trocadas)**

1. Mochila como 6ª aba. Se a barra apertar demais em 360 px, mover Mundo para o menu e manter 5 abas.
2. Vender e desmontar liberados fora da Cidade, porque o motor não exige estar lá.
3. Fonte pixel Pixelify Sans para títulos e números, e fonte do sistema para texto corrido.
4. Ícones de interface como sprites em texto, no mesmo formato dos atuais, com a opção de gerar a folha no Gemini.
