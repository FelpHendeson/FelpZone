# UI/UX 3.0 — Rework visual e de informação

## Estado da decisão

**Implementado — Fatias 3.1 a 3.5.** O plano foi aprovado e aplicado sem mudança de schema, mecânica ou regra:

- **3.1 — Tokens e motivo visual:** `--accent-social` e `--accent-domain` em `global.css`; cada domínio expõe sua cor em `--tone`. O canto-trava (`SystemCorners`, em `src/ui/components/Icon.tsx`) marca HUD, cartão-herói do local, cabeçalho da Central do Sistema, cabeçalhos de tela focada, Personagem e Mochila. A barra de acento lateral substitui a sombra nos cartões; `--shadow` fica para HUD e diálogos.
- **3.2 — Menu agrupado:** `GameMenuPanel` mostra os mesmos 8 destinos em três grupos (Eu e o Sistema / Pessoas / Mundo e referência); `Sociedade` vive em Pessoas.
- **3.3 — Domínio em sub-telas:** `Menu → Domínio` abre `DomainPanel`, um hub com Base e território / Economia / Política; cada sub-tela (`domain-territory`, `domain-economy`, `domain-politics`) reaproveita o conteúdo de `SystemPanel` para um único sistema de save.
- **3.4 — Retratos onde já há `src`:** `BondCharacterView.portraitSrc` e `ExplorationView.abilityImageSrc` vêm da arte já declarada no pack; Relacionamentos, a confiança residual e os cartões de Relacionamentos/Família na Central usam `Portrait`/`PortraitStack`, com iniciais como fallback. Progressão mostra o ícone da aptidão inicial. O avatar do jogador continua sendo iniciais.
- **3.5 — Iconografia SVG:** `Icon` (traço 1.5px, 24×24, sem preenchimento) substitui os glifos do rodapé, da Central do Sistema, do hub de Domínio e dos atalhos "Ao seu redor".

Cobertura em `src/tests/ui-redesign-3.test.tsx`.

Este rework não substitui [UI/UX 2.0](UI-UX-2-NAVIGATION.md); ele herda a arquitetura de cinco destinos e a separa "consulta vs. ação" que já está certa, e ataca dois problemas que surgiram depois que ela foi implementada: a Central do Sistema (`Menu`) cresceu mais rápido do que a navegação em grade plana aguenta, e a chegada de arte real (`docs/ART-GENERATION-PROMPTS.md`, `docs/VISUAL-ASSETS.md`) abriu um espaço visual que a interface ainda não usa.

## Diagnóstico — o que existe hoje

Levantamento direto do código (`src/ui/`), não suposição:

1. **`Menu` virou uma parede de 8 cartões iguais** (`GameMenuPanel.tsx`): Progressão, Registro, Sociedade, Domínio, Relacionamentos, Família, Mapa completo, Ajuda — todos no mesmo grid, mesmo peso visual, sem agrupamento. É exatamente o ponto que a própria UI/UX 2.0 tentou evitar ("domínios complexos entram por cartões-resumo, não por uma parede única de sanfonas") — só que agora a parede é de cartões, não de sanfonas. Mais sistemas chegaram desde então (18 a 29), e o Dia 7 fechou o primeiro arco citando decisões de conteúdo futuro que tendem a crescer `Domínio` e `Sociedade` ainda mais.
2. **`SystemPanel.tsx` tem 808 linhas e cobre 5 domínios num único arquivo** (`progression`, `registry`, `society`, `family`, `domain`). `Domínio` sozinho já empilha território (`settlements`), economia (`economy`) e política (`politics`) — três sistemas de save distintos — numa única tela por `section`.
3. **A paleta por domínio descrita na UI/UX 2.0 nunca virou token.** O documento promete "tons quentes" para Pessoas/Relacionamentos/Família e "tons terrosos" para Domínio, mas `global.css` só define `--accent` (verde-água), `--accent-system` (azul), `--gold` e `--danger` (terracota, reservado a combate/perigo). Visualmente, hoje, quase tudo usa o mesmo verde-água — a distinção por domínio é só textual, não visual.
4. **Ícones são glifos Unicode** (`❖ ▣ ⚑ ⌂ ♙ ♡ ⌖ ☰ ⌕ ⌁`) em todo lugar — documentado como provisório na própria UI/UX 2.0 ("ícones continuam tipográficos e a arte continua provisória"). Isso era razoável quando não existia nenhuma arte; agora Mira, Caio, Davi, os 13 itens, as 3 habilidades, os 5 títulos e os locais já têm `src` (ver `docs/ART-GENERATION-PROMPTS.md`), mas a arte só aparece onde alguém já ligou `ImagePlaceholder` — `WorldPanel`, `InventoryPanel`, `PeoplePanel`. Em `GameMenuPanel`, `CharacterPanel`, `RelationshipsPanel`, os ícones continuam sendo glifo puro mesmo quando já existe retrato ou ícone correspondente.
5. **Hierarquia de cartão é uniforme demais.** `--radius: 16px` e `--shadow` são aplicados igual em `hub-card`, `presence-card`, `threat-card`, `location-hero` — o cartão "herói" do local atual (uma cena cheia, com imagem, progresso e CTA primário) usa o mesmo tratamento visual de um cartão de navegação secundário do Menu. Isso é o padrão genérico de "kit de cartão SaaS": mesmo raio, mesma sombra, em tudo, independente de hierarquia.
6. **O que já está certo e deve ser preservado:** a dualidade tipográfica (`--font-story`, serifada, só para texto narrativo/descrição de mundo; `--font-ui`, sem serifa, para interface) é uma escolha deliberada e funciona — não mexer. O princípio "aventura primeiro, dados sob demanda" também está certo. O HUD persistente com necessidades em tempo real é enxuto e deve continuar enxuto.

## Direção de arte

### Paleta — estende, não substitui

| Token | Valor | Uso | Status |
| --- | --- | --- | --- |
| `--bg` | `#090e12` | fundo base | já existe |
| `--accent` | `#73d7b4` | Mundo, ações primárias | já existe |
| `--accent-system` | `#83cbea` | Progressão, Sistema | já existe |
| `--gold` | `#e6c97a` | Registro, conquistas | já existe |
| `--danger` | `#d67a6a` | combate, perigo, ruptura | já existe |
| `--accent-social` | `#e3a868` | **novo** — Pessoas, Relacionamentos, Família | a criar |
| `--accent-domain` | `#a9825a` | **novo** — Domínio (economia, base, política) | a criar |

`--accent-social` e `--accent-domain` fecham a promessa que a UI/UX 2.0 já tinha feito por escrito. Escolhi dois tons de âmbar/terra distintos o bastante entre si e de `--danger` (que fica reservado só a perigo/combate, nunca reaproveitado como "cor de domínio") para não confundir "isso é perigoso" com "isso é social" ou "isso é território".

### Tipografia

Sem mudança. `--font-story` (Palatino/Georgia) continua exclusivo de trechos narrativos e descrições de mundo; `--font-ui` (Segoe UI/system-ui) continua em toda a interface de controle. É a maior força visual que o jogo já tem — um rework que a descartasse estaria jogando fora a única coisa que hoje diferencia esta UI de um painel genérico.

### O motivo condutor: "o Sistema está desenhando isto"

AGENTS.md já declara o princípio: *"Trate o Sistema como interface diegética: menus e mensagens podem ser percebidos pelo personagem."* Hoje isso é só uma regra de conteúdo (o texto fala do Sistema na primeira pessoa). O rework propõe levar esse princípio para o tratamento visual, mas com moderação — um elemento de assinatura, não uma reforma de tudo:

- **Cantos-trava** (pequenos traços em L nos quatro cantos, como um visor sendo focado) em superfícies que a ficção já trata como "renderizadas pelo Sistema": o HUD, o cartão-herói do local, os cabeçalhos de domínio em `Menu`. Não em cartões comuns de lista — o motivo marca momento, não decora tudo.
- **Uma barra de acento lateral fina** (2–3px, cor do domínio) substitui sombra uniforme como forma primária de dar peso a um cartão. Sombra (`--shadow`) continua existindo, mas só em elementos realmente flutuantes (diálogos, popups) — não em todo cartão de lista.
- Isso é a "uma coisa ousada" deste rework. Tudo ao redor (grid, espaçamento, tipografia) permanece contido e já está bom.

### Ícones

Trocar os glifos Unicode mais usados na navegação (os cinco do rodapé, os da Central do Sistema) por um conjunto pequeno de ícones SVG inline no mesmo espírito — traço fino, monocromático, sem preenchimento — construídos como parte da interface (não arte de pack, não precisa de IA externa, não entra no fluxo de `VISUAL-ASSETS.md`). Glifo Unicode continua aceitável em rótulos secundários (contadores, estados). Isso é uma fatia de implementação separada e pequena; o plano aqui só define a direção (traço fino, 1.5px, 24×24, cantos levemente arredondados, sem contraste pesado) para quem desenhar os SVGs depois.

### Arte de pack — usar onde já existe `src`

Nenhuma imagem nova precisa ser gerada para esta fase. O rework consome o que **já foi commitado** (`public/images/first-day/...`) em lugares que hoje só mostram glifo:

- `GameMenuPanel`: cartão de Relacionamentos e Família ganham uma faixa com até 3 miniaturas de retrato (reaproveitando os mesmos `src` de `presences.json`), não um ícone novo.
- `RelationshipsPanel`: cada vínculo mostra o retrato do NPC em vez de glifo genérico.
- `CharacterPanel`: o "avatar" do jogador permanece glifo (não existe — e não deve existir — retrato gerado do próprio jogador; isso seria inventar a aparência de alguém que o jogador ainda está descobrindo).
- `SystemPanel` (Progressão): lista de habilidades ganha o ícone já existente (`olhar-atento`, `resiliencia`, `voz-calma`) em vez de glifo.

## Mudança de informação — Menu deixa de ser uma parede

O rodapé continua com os mesmos cinco destinos (`Mundo`, `Jornadas`, `Personagem`, `Mochila`, `Menu`) — a UI/UX 2.0 está certa em manter só os frequentes ali, e cinco é o limite documentado. A mudança é **dentro** de `Menu`: os 8 cartões passam a viver em 3 grupos nomeados, na mesma tela, sem profundidade extra de navegação (nenhum clique a mais para chegar a um domínio):

```text
Eu e o Sistema        Pessoas                  Mundo e referência
├─ Progressão          ├─ Relacionamentos       ├─ Domínio
├─ Registro            └─ Família e lar         ├─ Mapa completo
                                                 └─ Ajuda
```

`Sociedade` (grupos, party, ocupação, cidadania) entra em "Pessoas" — é sobre quem você é em relação aos outros, não sobre território. Ver wireframe completo em `UI-REDESIGN-3-SCREENS.md`.

`Domínio` (território + economia + política) recebe sub-navegação própria dentro da própria tela de Domínio — três cartões de entrada (Base e Território / Economia / Política) em vez de uma única tela que concatena os três. Mesma profundidade de clique que hoje (`Menu → Domínio → [sub-tela]` vs. hoje `Menu → Domínio` já rolando três seções longas).

## Princípios

- O Sistema é quem desenha a interface — a UI deve parecer percebida pelo personagem, não um painel de administração.
- Uma barra de acento e um motivo de "canto-trava" carregam a identidade; tudo ao redor fica quieto.
- Cor por domínio é um mapa mental, não decoração — cada domínio aparece sempre na mesma cor, em toda tela, sem exceção.
- Arte de pack substitui glifo sempre que `src` já existir; glifo continua como fallback honesto, nunca como escolha quando a arte já existe.
- Nenhuma tela nova aumenta a profundidade de navegação além do que já existe hoje (destino → tela → eventual sub-tela de domínio).
- Agrupar não é esconder: todo cartão de grupo mostra contagem, exatamente como hoje.

## Não-objetivos — fora deste recorte

- Nenhuma mecânica nova, nenhum atributo novo, nenhuma mudança de regra, custo ou saldo — isto é só apresentação.
- Nenhuma mudança de schema de save; a tela aberta continua não-persistida.
- Roteamento por URL continua fora do recorte (limite já declarado na UI/UX 2.0).
- Tema claro, animações amplas, busca e personalização de menu continuam fora — a única "ousadia" visual é o motivo de canto-trava descrito acima.
- Nenhuma tela para mecânicas do arco "Os Primeiros Senhores" ainda não implementado — o rework só reorganiza e redesenha o que já existe e está testado.

## Roteiro de fatias futuras (se aprovado)

Caso este plano seja aprovado, a implementação seguiria fatias pequenas, cada uma com spec própria antes do código, no mesmo padrão dos Dias 1–7:

1. **Fatia 3.1 — Tokens e motivo visual:** `--accent-social`, `--accent-domain`, o motivo de canto-trava e a barra de acento lateral, aplicados primeiro no HUD e no cartão-herói do mundo (menor superfície de risco visual).
2. **Fatia 3.2 — Menu agrupado:** reorganizar `GameMenuPanel` nos 3 grupos, sem tocar nas telas de destino.
3. **Fatia 3.3 — Domínio em sub-telas:** dividir `SystemPanel` (`section: 'domain'`) em três entradas (Base e Território / Economia / Política), reaproveitando os componentes internos que já existem.
4. **Fatia 3.4 — Retratos onde já há `src`:** `RelationshipsPanel`, `GameMenuPanel` (Relacionamentos/Família), ícones de habilidade em Progressão.
5. **Fatia 3.5 — Iconografia SVG do rodapé e da Central do Sistema:** substitui os glifos de navegação pelo conjunto de traço fino.

Cada fatia manteria lint, tipos, testes e build aprovados antes do commit, como de praxe.
