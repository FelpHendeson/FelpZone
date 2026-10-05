# Prompts para geração de arte (IA externa)

Este documento é uma lista de encomenda: cada item é uma imagem opcional que o motor já sabe exibir (contrato em [Imagens opcionais dos packs](VISUAL-ASSETS.md)), com um prompt pronto para gerar em qualquer ferramenta de IA de imagem (Midjourney, DALL·E, Stable Diffusion, etc.).

**Nada aqui é obrigatório.** Sem a imagem, a interface mostra o placeholder acessível normalmente. Gere só o que quiser, na ordem que quiser.

**Fora de escopo deste documento, de propósito:** arte específica de cenas de eventos de campanha (as telas narrativas dos Dias 1 a 7, campo `image`/`portrait` em `campaign/events.json`). Descrever essas cenas aqui entregaria por escrito decisões e reviravoltas da história antes de você jogar. Se quiser arte para uma cena de evento específica, peça por dia/evento quando quiser — cada pedido pode ser respondido sem espalhar spoiler dos demais.

---

## 1. Direção de arte (use em todo prompt)

Para manter consistência visual entre todas as imagens, acrescente este bloco de estilo a cada prompt gerado (já incluído em cada prompt abaixo, mas repita se for gerar variações):

> Painterly semi-realistic fantasy illustration, digital painting, cinematic natural lighting, muted earthy color palette (moss green, clay brown, overcast blue-grey, warm amber highlights), atmosphere of a quiet, unsettling wilderness the day after a world-reset — nothing overtly magical or glowing, no UI, no text, no watermark, no logo, no signature, no border, no frame, no game HUD, no numbers, no icons overlaid on the image, single coherent scene or subject, high detail, 4k.

Parâmetros técnicos por tipo (definidos em `VISUAL-ASSETS.md`):

| Tipo (`kind`) | Proporção | Observação |
| --- | --- | --- |
| `scene` | 16:9 | cena ampla, sem texto importante embutido |
| `portrait` | 1:1 | sujeito centralizado, enquadramento de busto/rosto |
| `icon` | 1:1 | leitura nítida a ~48px — silhueta simples, fundo neutro ou transparente, objeto único e centralizado |

Depois de gerar, exporte como `.webp` (preferido), `.png`, `.jpg`/`.jpeg` ou `.avif`, mantenha cada arquivo abaixo de 2 MB, e salve com o nome de arquivo exato sugerido em cada item (nomes estáveis evitam problemas de cache na PWA).

Todo caminho final deve começar com `/images/first-day/...` — os arquivos físicos vão em `public/images/first-day/...` (ver `VISUAL-ASSETS.md`).

---

## 2. Locais (`world/map.json`, campo `image`, tipo `scene`)

### 2.1 Novo Mundo (capa de região)
- **id:** `new-world`
- **Arquivo sugerido:** `/images/first-day/locations/new-world.webp`
- **Prompt:**
  > A wide, hazy establishing shot of an unfamiliar wilderness continent seen from a high vantage point at dawn — young dense forest, a distant river bend, rolling hills, no roads, no ruins, no structures, no people, as if the world itself is newly re-formed and still settling. Painterly semi-realistic fantasy illustration, digital painting, cinematic natural lighting, muted earthy color palette (moss green, clay brown, overcast blue-grey, warm amber highlights), atmosphere of a quiet, unsettling wilderness the day after a world-reset — nothing overtly magical or glowing, no UI, no text, no watermark, no logo, no signature, no border, no frame, no game HUD, no numbers, no icons overlaid on the image, single coherent scene, high detail, 4k, 16:9.

### 2.2 Floresta dos Coelhos Chifrudos
- **id:** `horned-rabbit-forest`
- **Arquivo sugerido:** `/images/first-day/locations/horned-rabbit-forest.webp`
- **Prompt:**
  > A dense young forest where the vegetation looks like it grew unnaturally fast — thin but tightly packed trees, undergrowth still low, dappled midday light filtering through immature canopy, a narrow game trail cutting through ferns and moss. No creatures visible, no people, no path markers. Painterly semi-realistic fantasy illustration, digital painting, cinematic natural lighting, muted earthy color palette (moss green, clay brown, overcast blue-grey, warm amber highlights), atmosphere of a quiet, unsettling wilderness the day after a world-reset, no UI, no text, no watermark, no logo, no signature, no border, no frame, no HUD, no numbers, single coherent scene, high detail, 4k, 16:9.

### 2.3 Clareira do Despertar
- **id:** `awakening-clearing`
- **Arquivo sugerido:** `/images/first-day/locations/awakening-clearing.webp`
- **Prompt:**
  > An irregular, sunlit clearing in a young forest, patchy grass flattened in one spot as if someone recently lay there, loose scattered leaves, a fallen branch nearby, soft morning light breaking through the tree line, an empty and quiet mood — the very first place someone would open their eyes after waking up in an unfamiliar world. No person visible, no camp, no fire. Painterly semi-realistic fantasy illustration, digital painting, cinematic natural lighting, muted earthy color palette (moss green, clay brown, overcast blue-grey, warm amber highlights), no UI, no text, no watermark, no logo, no signature, no border, no frame, no HUD, no numbers, single coherent scene, high detail, 4k, 16:9.

### 2.4 Grande Árvore
- **id:** `great-tree`
- **Arquivo sugerido:** `/images/first-day/locations/great-tree.webp`
- **Prompt:**
  > A single disproportionately massive, ancient-looking tree towering over the surrounding young forest, its scale clearly wrong for how new everything else looks, thick gnarled roots breaking the soil surface, deep grooves and scratch-like marks visible on the lower bark, dramatic late-afternoon side light casting long shadows across the roots. No person visible. Painterly semi-realistic fantasy illustration, digital painting, cinematic natural lighting, muted earthy color palette (moss green, clay brown, overcast blue-grey, warm amber highlights), no UI, no text, no watermark, no logo, no signature, no border, no frame, no HUD, no numbers, single coherent scene, high detail, 4k, 16:9.

### 2.5 Oco da Grande Árvore
- **id:** `great-tree-hollow`
- **Arquivo sugerido:** `/images/first-day/locations/great-tree-hollow.webp`
- **Prompt:**
  > A low, narrow hollow gap between thick tree roots, easy to miss unless you are looking for it, dark interior barely lit by a sliver of light from outside, damp earth and root fibers framing the opening, a sense of something deliberately hidden rather than naturally formed. No person visible, no glowing objects, no treasure implied. Painterly semi-realistic fantasy illustration, digital painting, cinematic natural lighting, muted earthy color palette (moss green, clay brown, overcast blue-grey, warm amber highlights), no UI, no text, no watermark, no logo, no signature, no border, no frame, no HUD, no numbers, single coherent scene, high detail, 4k, 16:9.

### 2.6 Nascente e Pequeno Lago
- **id:** `spring-lake`
- **Arquivo sugerido:** `/images/first-day/locations/spring-lake.webp`
- **Prompt:**
  > Clear water welling up from the ground and pooling into a shallow, calm lake a short walk from a forest clearing, smooth stones visible beneath the clear water at the edges, reeds and low plants around the bank, soft overcast morning light reflecting on the water's surface. No person visible, no boats, no structures. Painterly semi-realistic fantasy illustration, digital painting, cinematic natural lighting, muted earthy color palette (moss green, clay brown, overcast blue-grey, warm amber highlights), no UI, no text, no watermark, no logo, no signature, no border, no frame, no HUD, no numbers, single coherent scene, high detail, 4k, 16:9.

### 2.7 Margem Rochosa
- **id:** `rocky-bank`
- **Arquivo sugerido:** `/images/first-day/locations/rocky-bank.webp`
- **Prompt:**
  > A fold of exposed rock running alongside a stream, forming a rough, low, barely-defensible shelter — a shallow rock overhang just tall enough to sit or lie under, a small improvised camp feel (a cold or low fire pit, a folded cloth or blanket) but no people visible in the shot itself, streamside pebbles, overcast late-afternoon light, a sense of "someone hurt has been resting here." Painterly semi-realistic fantasy illustration, digital painting, cinematic natural lighting, muted earthy color palette (moss green, clay brown, overcast blue-grey, warm amber highlights), no UI, no text, no watermark, no logo, no signature, no border, no frame, no HUD, no numbers, single coherent scene, high detail, 4k, 16:9.

### 2.8 Mata Densa
- **id:** `dense-woods`
- **Arquivo sugerido:** `/images/first-day/locations/dense-woods.webp`
- **Prompt:**
  > Thick, tightly packed forest where the trunks crowd together and visibility drops to a few meters, low light filtering unevenly through a closed canopy, undergrowth dense enough to hide movement, small animal tracks visible in soft mud in the foreground, a faint sense of being watched. No person or creature clearly visible. Painterly semi-realistic fantasy illustration, digital painting, cinematic natural lighting, muted earthy color palette (moss green, clay brown, overcast blue-grey, warm amber highlights), no UI, no text, no watermark, no logo, no signature, no border, no frame, no HUD, no numbers, single coherent scene, high detail, 4k, 16:9.

### 2.9 Caverna Oculta
- **id:** `hidden-cave`
- **Arquivo sugerido:** `/images/first-day/locations/hidden-cave.webp`
- **Prompt:**
  > A low cave opening almost completely concealed by tangled tree roots and damp moss-covered rock, the entrance barely wide enough to crouch through, cool blue-grey shadow spilling from the gap, a single narrow beam of daylight catching the wet stone just inside the mouth of the cave. No person visible, nothing overtly supernatural or glowing. Painterly semi-realistic fantasy illustration, digital painting, cinematic natural lighting, muted earthy color palette (moss green, clay brown, overcast blue-grey, warm amber highlights), no UI, no text, no watermark, no logo, no signature, no border, no frame, no HUD, no numbers, single coherent scene, high detail, 4k, 16:9.

---

## 3. Pessoas e criaturas (`world/presences.json`, campo `image`)

### 3.1 Mira Vale — retrato (`portrait`)
- **id:** `mira-vale`
- **Arquivo sugerido:** `/images/first-day/npcs/mira-vale.webp`
- **Prompt:**
  > Portrait of a young woman survivor in her early twenties, practical and slightly worn clothing suited for the wilderness, alert but guarded expression, hair tied back out of the way, a small water-carrying container visible near her, centered head-and-shoulders framing against a softly blurred forest background, natural outdoor light. She keeps her distance and makes her own decisions — her expression should read as self-reliant and watchful, not friendly or hostile by default. Painterly semi-realistic fantasy illustration, digital painting, cinematic natural lighting, muted earthy color palette (moss green, clay brown, overcast blue-grey, warm amber highlights), no UI, no text, no watermark, no logo, no signature, no border, no frame, no HUD, no numbers, single subject, high detail, 4k, 1:1, subject centered.

### 3.2 Caio Nascimento — retrato (`portrait`)
- **id:** `caio-nascimento`
- **Arquivo sugerido:** `/images/first-day/npcs/caio-nascimento.webp`
- **Prompt:**
  > Portrait of a lean, watchful young man survivor, practical torn or patched clothing, scanning eyes as if constantly assessing risk in the environment, a slight tension in posture, centered head-and-shoulders framing against a softly blurred rocky riverside background, overcast natural light. He is protective of the people around him and pays close attention to tracks and danger — the expression should read as vigilant and responsible, not aggressive. Painterly semi-realistic fantasy illustration, digital painting, cinematic natural lighting, muted earthy color palette (moss green, clay brown, overcast blue-grey, warm amber highlights), no UI, no text, no watermark, no logo, no signature, no border, no frame, no HUD, no numbers, single subject, high detail, 4k, 1:1, subject centered.

### 3.3 Davi Moura — retrato (`portrait`)
- **id:** `davi-moura`
- **Arquivo sugerido:** `/images/first-day/npcs/davi-moura.webp`
- **Prompt:**
  > Portrait of an injured young survivor, visible fatigue and a bandaged wound (arm or leg, tastefully depicted, not graphic), leaning slightly as if favoring the uninjured side, wrapped in a simple blanket or cloth, centered head-and-shoulders or half-body framing against a softly blurred rocky shelter background, soft late-afternoon light. His expression should read as weary but not broken — someone getting by on found shelter, not a battlefield casualty. Painterly semi-realistic fantasy illustration, digital painting, cinematic natural lighting, muted earthy color palette (moss green, clay brown, overcast blue-grey, warm amber highlights), no UI, no text, no watermark, no logo, no signature, no border, no frame, no HUD, no numbers, single subject, high detail, 4k, 1:1, subject centered.

### 3.4 Coelho chifrudo — ícone (`icon`)
- **id:** `horned-rabbit`
- **Arquivo sugerido:** `/images/first-day/creatures/horned-rabbit.webp`
- **Prompt:**
  > A small herbivorous rabbit-like creature with short, solid horns on its head, otherwise ordinary rabbit proportions and fur, calm/neutral pose (sitting or standing, not attacking), simple, clean silhouette readable at very small sizes, centered on a plain neutral or transparent background, soft even studio-like lighting despite the natural-painting style. Painterly semi-realistic fantasy illustration, digital painting, muted earthy color palette (moss green, clay brown, overcast blue-grey, warm amber highlights), no UI, no text, no watermark, no logo, no signature, no border, no frame, no HUD, no numbers, single subject, clean readable icon shape, 4k, 1:1, subject centered, plain background.

---

## 4. Ponto de interesse (`world/interactables.json`, campo `image`, tipo `scene`)

### 4.1 Marcas no tronco
- **id:** `great-tree-bark-marks`
- **Arquivo sugerido:** `/images/first-day/interactables/great-tree-bark-marks.webp`
- **Prompt:**
  > A close-up of deep, old grooves carved into the bark of a massive tree trunk, the marks forming a pattern too regular and deliberate to be natural weathering — not readable as any real-world alphabet, just a clearly intentional repeating pattern of cuts and lines, raking side light emphasizing the depth of the grooves, textured bark detail. No person visible, no glow, no magic effects. Painterly semi-realistic fantasy illustration, digital painting, cinematic natural lighting, muted earthy color palette (moss green, clay brown, overcast blue-grey, warm amber highlights), no UI, no text, no watermark, no logo, no signature, no border, no frame, no HUD, no numbers, single coherent scene, high detail, 4k, 16:9.

---

## 5. Itens do inventário (`system/items.json` e `campaign/campaign.json.items`, campo `image`, tipo `icon`)

Todos os ícones de item seguem o mesmo enquadramento: objeto único, centralizado, fundo neutro ou transparente, leitura nítida em ~48px, sem sombra pesada de cena.

### 5.1 Graveto (`fallen-branch`)
- **Arquivo:** `/images/first-day/items/fallen-branch.webp`
- **Prompt:**
  > A single fallen wooden branch/stick, weathered bark, slightly bent, no leaves, isolated on a plain neutral background, simple readable icon-style object rendering. Painterly semi-realistic fantasy illustration style, muted earthy color palette, no UI, no text, no watermark, no logo, no signature, no border, no frame, single object centered, clean icon silhouette, 4k, 1:1.

### 5.2 Água bruta (`raw-water`)
- **Arquivo:** `/images/first-day/items/raw-water.webp`
- **Prompt:**
  > A simple improvised container (cupped leaf, hollow stone, or crude bark cup) holding slightly cloudy, untreated water, isolated on a plain neutral background, simple readable icon-style object rendering. Painterly semi-realistic fantasy illustration style, muted earthy color palette, no UI, no text, no watermark, no logo, no signature, no border, no frame, single object centered, clean icon silhouette, 4k, 1:1.

### 5.3 Água limpa (`agua-limpa`)
- **Arquivo:** `/images/first-day/items/agua-limpa.webp`
- **Prompt:**
  > A small hollow stone cupping a portion of perfectly clear, still water, catching a soft highlight on the surface, isolated on a plain neutral background, simple readable icon-style object rendering. Painterly semi-realistic fantasy illustration style, muted earthy color palette, no UI, no text, no watermark, no logo, no signature, no border, no frame, single object centered, clean icon silhouette, 4k, 1:1.

### 5.4 Carne crua de coelho chifrudo (`raw-horned-rabbit-meat`)
- **Arquivo:** `/images/first-day/items/raw-horned-rabbit-meat.webp`
- **Prompt:**
  > A raw cut of pale reddish meat resting on a flat leaf or piece of bark, clearly uncooked, simple and not gory, isolated on a plain neutral background, simple readable icon-style object rendering. Painterly semi-realistic fantasy illustration style, muted earthy color palette, no UI, no text, no watermark, no logo, no signature, no border, no frame, single object centered, clean icon silhouette, 4k, 1:1.

### 5.5 Carne cozida de coelho chifrudo (`cooked-horned-rabbit-meat`)
- **Arquivo:** `/images/first-day/items/cooked-horned-rabbit-meat.webp`
- **Prompt:**
  > A simple skewered piece of roasted meat, browned and lightly charred at the edges, resting on a flat piece of bark, isolated on a plain neutral background, simple readable icon-style object rendering. Painterly semi-realistic fantasy illustration style, muted earthy color palette, no UI, no text, no watermark, no logo, no signature, no border, no frame, single object centered, clean icon silhouette, 4k, 1:1.

### 5.6 Fruto desconhecido (`fruto-desconhecido`)
- **Arquivo:** `/images/first-day/items/fruto-desconhecido.webp`
- **Prompt:**
  > A single unfamiliar, softly rounded fruit with dense pulp and an unusual dusty-purple or deep amber skin — not matching any common real-world fruit exactly, faint sheen suggesting it might be edible or might not, isolated on a plain neutral background, simple readable icon-style object rendering. Painterly semi-realistic fantasy illustration style, muted earthy color palette, no UI, no text, no watermark, no logo, no signature, no border, no frame, single object centered, clean icon silhouette, 4k, 1:1.

### 5.7 Couro de coelho chifrudo (`horned-rabbit-hide`)
- **Arquivo:** `/images/first-day/items/horned-rabbit-hide.webp`
- **Prompt:**
  > A folded piece of tanned, resilient animal hide with short fur on one side, roughly rectangular, isolated on a plain neutral background, simple readable icon-style object rendering. Painterly semi-realistic fantasy illustration style, muted earthy color palette, no UI, no text, no watermark, no logo, no signature, no border, no frame, single object centered, clean icon silhouette, 4k, 1:1.

### 5.8 Chifre de coelho chifrudo (`horned-rabbit-horn`)
- **Arquivo:** `/images/first-day/items/horned-rabbit-horn.webp`
- **Prompt:**
  > A single short, solid, slightly curved horn, smooth pale surface with a darker tip, isolated on a plain neutral background, simple readable icon-style object rendering. Painterly semi-realistic fantasy illustration style, muted earthy color palette, no UI, no text, no watermark, no logo, no signature, no border, no frame, single object centered, clean icon silhouette, 4k, 1:1.

### 5.9 Ossos de coelho chifrudo (`horned-rabbit-bones`)
- **Arquivo:** `/images/first-day/items/horned-rabbit-bones.webp`
- **Prompt:**
  > A small, light bundle of clean animal bones, simple and pale, arranged loosely, isolated on a plain neutral background, simple readable icon-style object rendering. Painterly semi-realistic fantasy illustration style, muted earthy color palette, no UI, no text, no watermark, no logo, no signature, no border, no frame, single object centered, clean icon silhouette, 4k, 1:1.

### 5.10 Galho resistente (`galho-resistente`)
- **Arquivo:** `/images/first-day/items/galho-resistente.webp`
- **Prompt:**
  > A sturdier, thicker wooden branch than an ordinary stick, straighter grain, slightly polished-looking from handling, isolated on a plain neutral background, simple readable icon-style object rendering. Painterly semi-realistic fantasy illustration style, muted earthy color palette, no UI, no text, no watermark, no logo, no signature, no border, no frame, single object centered, clean icon silhouette, 4k, 1:1.

### 5.11 Presa do predador (`predator-fang`)
- **Arquivo:** `/images/first-day/items/predator-fang.webp`
- **Prompt:**
  > A single sharp, curved predator fang/tooth, pale ivory color with a faint reddish stain near the root, isolated on a plain neutral background, simple readable icon-style object rendering. Painterly semi-realistic fantasy illustration style, muted earthy color palette, no UI, no text, no watermark, no logo, no signature, no border, no frame, single object centered, clean icon silhouette, 4k, 1:1.

### 5.12 Ferramenta improvisada (`improvised-tool`)
- **Arquivo:** `/images/first-day/items/improvised-tool.webp`
- **Prompt:**
  > A crude improvised weapon made from a sturdy branch lashed together with cordage and a sharpened bone or fang at the tip, handmade and asymmetric, clearly not a manufactured weapon, isolated on a plain neutral background, simple readable icon-style object rendering. Painterly semi-realistic fantasy illustration style, muted earthy color palette, no UI, no text, no watermark, no logo, no signature, no border, no frame, single object centered, clean icon silhouette, 4k, 1:1.

### 5.13 Unguento improvisado (`improvised-salve`)
- **Arquivo:** `/images/first-day/items/improvised-salve.webp`
- **Prompt:**
  > A small roll of prepared bandage/wrap made from tanned hide and plant fiber, tied with a simple knot, a faint herbal salve smear visible on part of the wrap, isolated on a plain neutral background, simple readable icon-style object rendering. Painterly semi-realistic fantasy illustration style, muted earthy color palette, no UI, no text, no watermark, no logo, no signature, no border, no frame, single object centered, clean icon silhouette, 4k, 1:1.

---

## 6. Habilidades (`campaign/campaign.json.abilities`, campo `image`, tipo `icon`)

Ícones simbólicos e abstratos (não retratos), no mesmo estilo de silhueta limpa dos itens.

### 6.1 Olhar Atento (`olhar-atento`)
- **Arquivo:** `/images/first-day/abilities/olhar-atento.webp`
- **Prompt:**
  > A symbolic icon representing heightened attention and perception — a single stylized open eye rendered in a painterly natural style (not a flat vector logo), surrounded by faint suggestions of forest leaves and light rays, centered composition, plain neutral background, clean readable silhouette at small sizes. Painterly semi-realistic fantasy illustration style, muted earthy color palette with a subtle warm highlight, no UI, no text, no watermark, no logo, no signature, no border, no frame, single centered symbol, 4k, 1:1.

### 6.2 Resiliência (`resiliencia`)
- **Arquivo:** `/images/first-day/abilities/resiliencia.webp`
- **Prompt:**
  > A symbolic icon representing physical endurance and toughness — a single sturdy, weathered tree root or a clenched but calm hand gripping stone, rendered in a painterly natural style (not a flat vector logo), centered composition, plain neutral background, clean readable silhouette at small sizes. Painterly semi-realistic fantasy illustration style, muted earthy color palette with a subtle warm highlight, no UI, no text, no watermark, no logo, no signature, no border, no frame, single centered symbol, 4k, 1:1.

### 6.3 Voz Calma (`voz-calma`)
- **Arquivo:** `/images/first-day/abilities/voz-calma.webp`
- **Prompt:**
  > A symbolic icon representing a calm, reassuring presence — a single softly glowing ember or a pair of gently open hands offering warmth, rendered in a painterly natural style (not a flat vector logo), centered composition, plain neutral background, clean readable silhouette at small sizes. Painterly semi-realistic fantasy illustration style, muted earthy color palette with a subtle warm amber highlight, no UI, no text, no watermark, no logo, no signature, no border, no frame, single centered symbol, 4k, 1:1.

---

## 7. Títulos (`campaign/campaign.json.titles`, campo `image`, tipo `icon`)

Emblemas simbólicos, não cenas — pensados como um selo/brasão pequeno.

### 7.1 Mão Partilhada (`mao-partilhada`)
- **Arquivo:** `/images/first-day/titles/mao-partilhada.webp`
- **Prompt:**
  > A small emblem-like icon of two hands reaching toward each other, one offering a small piece of food or a folded cloth, rendered as a simple painterly seal/badge shape, centered composition, plain neutral background, clean readable silhouette at small sizes. Painterly semi-realistic fantasy illustration style, muted earthy color palette with a warm amber highlight, no UI, no text, no watermark, no logo, no signature, no border, no frame, single centered emblem, 4k, 1:1.

### 7.2 Gesto Tardio (`gesto-tardio`)
- **Arquivo:** `/images/first-day/titles/gesto-tardio.webp`
- **Prompt:**
  > A small emblem-like icon of a single hand turning back or reaching backward, subtly suggesting a second attempt or a delayed return, rendered as a simple painterly seal/badge shape, centered composition, plain neutral background, clean readable silhouette at small sizes. Painterly semi-realistic fantasy illustration style, muted earthy color palette with a soft grey-blue highlight, no UI, no text, no watermark, no logo, no signature, no border, no frame, single centered emblem, 4k, 1:1.

### 7.3 Caminho Solitário (`caminho-solitario`)
- **Arquivo:** `/images/first-day/titles/caminho-solitario.webp`
- **Prompt:**
  > A small emblem-like icon of a single footprint or a lone winding path trailing into the distance, rendered as a simple painterly seal/badge shape, centered composition, plain neutral background, clean readable silhouette at small sizes. Painterly semi-realistic fantasy illustration style, muted earthy color palette with a cool grey-blue highlight, no UI, no text, no watermark, no logo, no signature, no border, no frame, single centered emblem, 4k, 1:1.

### 7.4 Primeiro Abrigo (`primeiro-abrigo`)
- **Arquivo:** `/images/first-day/titles/primeiro-abrigo.webp`
- **Prompt:**
  > A small emblem-like icon of a simple lean-to shelter shape with a small flame/fire glow beneath it, rendered as a simple painterly seal/badge shape, centered composition, plain neutral background, clean readable silhouette at small sizes. Painterly semi-realistic fantasy illustration style, muted earthy color palette with a warm amber highlight, no UI, no text, no watermark, no logo, no signature, no border, no frame, single centered emblem, 4k, 1:1.

### 7.5 Despertar (`despertar`)
- **Arquivo:** `/images/first-day/titles/despertar.webp`
- **Prompt:**
  > A small emblem-like icon of a single half-open eye above a simple horizon line, suggesting the moment of waking up into a new world, rendered as a simple painterly seal/badge shape, centered composition, plain neutral background, clean readable silhouette at small sizes. Painterly semi-realistic fantasy illustration style, muted earthy color palette with a soft dawn-light highlight, no UI, no text, no watermark, no logo, no signature, no border, no frame, single centered emblem, 4k, 1:1.

---

## 8. Capa e encerramento da campanha (`campaign/campaign.json`, `coverImage`/`endingImage`, tipo `scene`)

Estes dois campos existem no contrato mas ainda não têm valor definido no pack — estão livres para receber arte quando quiser.

### 8.1 Capa (`coverImage`)
- **Arquivo sugerido:** `/images/first-day/campaign/cover.webp`
- **Prompt:**
  > A wide cinematic shot of a lone figure seen from behind, standing at the edge of a sunlit clearing in a strange, too-young forest, facing outward into unexplored wilderness, dawn light breaking through the tree line ahead, a sense of quiet uncertainty and a world starting over. Painterly semi-realistic fantasy illustration, digital painting, cinematic natural lighting, muted earthy color palette (moss green, clay brown, overcast blue-grey, warm amber highlights), no UI, no text, no watermark, no logo, no signature, no border, no frame, no HUD, no numbers, single coherent scene, high detail, 4k, 16:9.

### 8.2 Encerramento (`endingImage`)
- **Arquivo sugerido:** `/images/first-day/campaign/ending.webp`
- **Prompt:**
  > A wide cinematic shot of a small improvised camp at dusk seen from a slight distance, a low fire burning, simple shelter nearby, calm and settled after a long first day, silhouettes suggested but not clearly detailed (keep this generic — not tied to a specific ending route), warm firelight against a cooling blue evening sky. Painterly semi-realistic fantasy illustration, digital painting, cinematic natural lighting, muted earthy color palette (moss green, clay brown, overcast blue-grey, warm amber highlights), no UI, no text, no watermark, no logo, no signature, no border, no frame, no HUD, no numbers, single coherent scene, high detail, 4k, 16:9.

---

## 8A. Arquétipos de aprendiz e equipamentos de assinatura

As cartas de arquétipo e de técnica usam, por padrão, **silhuetas em vetor sem rosto** (`src/ui/components/Silhouette.tsx`), para o jogador se imaginar ali. A arte gerada é opcional e entra por cima. A silhueta continua sendo a referência de pose e enquadramento.

**Carta do arquétipo** (`system/archetypes.json`, campo `image`, tipo `portrait`, 4:5 ou 1:1). Mantenha a figura de costas ou em contraluz, sem rosto definido, para não impor uma identidade ao jogador.

- `apprentice-mage` → `/images/first-day/archetypes/apprentice-mage.webp`
  > A faceless backlit silhouette of a young apprentice mage holding a living wooden branch staff, a small sphere of pale violet energy gathering in the open palm, standing in a misty forest clearing at dawn, figure seen from behind three-quarter, no facial features visible. Painterly semi-realistic fantasy illustration, muted earthy palette with a single violet accent, no UI, no text, no watermark, no border, 4:5.
- `apprentice-swordsman` → `/images/first-day/archetypes/apprentice-swordsman.webp`
  > A faceless backlit silhouette of a young apprentice swordsman mid-slash with a crude chipped stone blade bound to a bone hilt, motion arc of the cut, forest clearing at dawn, no facial features visible. Painterly semi-realistic fantasy illustration, muted earthy palette with a warm amber accent, no UI, no text, no watermark, no border, 4:5.
- `apprentice-archer` → `/images/first-day/archetypes/apprentice-archer.webp`
  > A faceless backlit silhouette of a young apprentice archer drawing a rustic wooden bow, arrow nocked, wind moving the grass, edge of a forest at dawn, no facial features visible. Painterly semi-realistic fantasy illustration, muted earthy palette with a moss green accent, no UI, no text, no watermark, no border, 4:5.
- `apprentice-assassin` → `/images/first-day/archetypes/apprentice-assassin.webp`
  > A faceless shadowed silhouette of a young apprentice assassin crouched low, short bone dagger held forward, half hidden among ferns at dusk, no facial features visible. Painterly semi-realistic fantasy illustration, muted earthy palette with a dark crimson accent, no UI, no text, no watermark, no border, 4:5.
- `apprentice-pathless` → `/images/first-day/archetypes/apprentice-pathless.webp`
  > A faceless backlit silhouette of a young survivor standing still at the edge of a clearing at dawn, empty hands, a small worn satchel, looking at several diverging paths, no facial features visible. Painterly semi-realistic fantasy illustration, muted earthy palette with a pale blue-grey accent, no UI, no text, no watermark, no border, 4:5.

**Equipamentos de assinatura** (`system/items.json`, campo `image`, tipo `icon`, 1:1):

- `living-branch-staff` → `/images/first-day/items/living-branch-staff.webp`: *a short staff of a living branch with small leaves still growing, faint violet glow at the tip, single object centered, neutral background*.
- `chipped-stone-blade` → `/images/first-day/items/chipped-stone-blade.webp`: *a crude knapped stone blade bound to a bone hilt with sinew, single object centered, neutral background*.
- `rustic-bow` → `/images/first-day/items/rustic-bow.webp`: *a rustic short bow of bent wood and gut string, single object centered, neutral background*.
- `bone-dagger` → `/images/first-day/items/bone-dagger.webp`: *a short dagger carved from bone, wrapped grip, single object centered, neutral background*.

Acrescente a cada item o bloco de estilo da seção 1. Os 25 retratos prontos dos jogadores (5 por arquétipo) e os prompts detalhados das 4 armas estão em [Prompts: retratos de arquétipo e armas de assinatura](ART-PROMPTS-ARCHETYPE-PORTRAITS.md).

---

## 9. Como aplicar depois de gerar

1. Salve o arquivo exportado em `public/images/first-day/<subpasta>/<nome>.webp` (subpastas sugeridas acima: `locations/`, `archetypes/`, `npcs/`, `creatures/`, `interactables/`, `items/`, `abilities/`, `titles/`, `campaign/` — organização livre, o motor só valida o caminho, não a pasta).
2. No JSON do pack correspondente, adicione `src` ao objeto `image` já existente, por exemplo:

```json
"image": {
  "kind": "scene",
  "label": "Clareira do Despertar",
  "src": "/images/first-day/locations/awakening-clearing.webp"
}
```

3. Rode a suíte de testes normalmente — a validação de pack confere o formato do caminho, não a existência do arquivo; nenhuma migração de save é necessária.

Pode preencher um item de cada vez, não precisa gerar tudo de uma vez.
