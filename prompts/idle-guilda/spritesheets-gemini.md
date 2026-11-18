# Spritesheets com o Gemini: LionHearth

Prompts para gerar a arte do jogo no Gemini. As folhas voltam para a sessão, que recorta, reduz e coloca no jogo.

## Como usar

1. Em cada geração, **anexe a imagem de referência** indicada, que fica em [`referencias/`](referencias). São os sprites atuais ampliados; servem para manter cores e visual. Depois da primeira folha aprovada, anexe também ela, para manter o estilo entre os personagens.
2. Cole o **bloco de estilo** e, logo depois, o prompt específico.
3. Peça imagem **quadrada (1:1)**. Os cenários são a exceção: **16:9**.
4. Devolva com o **nome de arquivo** indicado.
5. Se vier com texto, grade desenhada, fundo que não é magenta liso ou personagem mudando de tamanho entre os quadros, gere de novo. Isso quebra o recorte automático.

**Comece pelo teste:** `heroi-leao.png`, `monstro-gosma.png` e `cenario-ilha.png`. Com essas três no jogo, dá para ajustar o processo antes de fazer o resto.

## Bloco de estilo (cole antes de todo prompt)

```text
Pixel art sprite sheet for a 2D idle RPG, 16-bit SNES-era JRPG style.
Crisp hard-edged pixels, no anti-aliasing, no blur, no gradients, no dithering noise.
Every frame is designed on a 32x32 pixel grid and each pixel is drawn as an 8x8 block, so every cell is exactly 256x256 px.
Limited palette (at most 24 colors), 1-pixel dark outline (#1b1b2a) around the character.
The sheet is a grid of 4 columns x 4 rows = 1024x1024 px. No gaps, no borders, no grid lines.
Background: one solid flat magenta color #FF00FF everywhere outside the character. No floor, no shadow, no scenery, no glow on the background.
Same character, same size and same proportions in every cell; feet always on the same baseline, 2 pixels above the bottom of the cell; character horizontally centered.
No text, no numbers, no labels, no UI, no watermark, no signature.
Use the attached image as the reference for the design and colors.
```

## Heróis (virados para a DIREITA)

Mesma grade para todos:
- **Linha 1:** parado, 4 quadros (respiração leve).
- **Linha 2:** ataque básico, 4 quadros (preparo, golpe, impacto, volta).
- **Linha 3:** lançando habilidade, 4 quadros.
- **Linha 4:** 2 quadros levando dano, depois 2 quadros caído.

### `heroi-leao.png`: Sir LionHearth (referência: `heroi-leao.png`)

```text
Character: Sir LionHearth, a young human knight of the kingdom of Hope, heir of the steel island.
Silver plate armor with gold trim, helmet with a small golden lion-mane crest, short red cape,
a longsword in the right hand and a red round shield with a golden lion emblem on the left arm.
Proud, disciplined posture. Side view facing RIGHT.
Row 1: idle, 4 frames, subtle breathing, cape moving slightly.
Row 2: sword slash, 4 frames: wind-up, horizontal slash, impact, recover.
Row 3: raising the shield and sword, golden light glowing on the shield, 4 frames.
Row 4: frames 1-2 flinching from a hit (leaning back); frames 3-4 knocked down on one knee, then lying on the ground.
```

### `heroi-leao-chamas.png`: Leão das Chamas (referência: `heroi-leao-chamas.png` e a folha do Leão aprovada)

```text
Character: the same knight Sir LionHearth in his berserk form "Lion of Flames".
Same armor and sword, but his body is wrapped in orange and yellow fire, and behind him a large
silhouette of a roaring lion head made of flames. Eyes glowing orange, aggressive forward-leaning stance.
Side view facing RIGHT. The flames may go beyond the body but must stay inside the cell.
Row 1: idle, 4 frames, flames flickering and the lion silhouette breathing.
Row 2: flaming sword slash, 4 frames, fire trail on the blade.
Row 3: roar, 4 frames, the flame lion opens its mouth, sparks around.
Row 4: four frames of a lunging flaming charge (dash forward).
```

### `heroi-quentin.png`: Quentin Salamander (referência: `heroi-quentin.png`)

```text
Character: Quentin Salamander, a young salamander-folk squire: reptilian humanoid with orange-red scales,
yellow eyes, a thick tail with a small flame at the tip. Heavy dark-gray plate armor, open helmet,
a big wooden tower shield with iron rim on his left arm, short sword in the right hand.
Sturdy, defensive tank posture, shield in front. Side view facing RIGHT.
Row 1: idle behind the shield, 4 frames, tail flame flickering.
Row 2: shield bash, 4 frames.
Row 3: taunt: slamming the sword on the shield, sparks and a small fire burst, 4 frames.
Row 4: frames 1-2 blocking a heavy hit (pushed back); frames 3-4 falling down.
```

### `heroi-cyrus.png`: Cyrus Viper (referência: `heroi-cyrus.png`)

```text
Character: Cyrus Viper, a calm young human apprentice mage. Short black hair, long deep-blue robe
with a vertical golden-yellow trim line, a tall wooden staff with a small lightning crystal on top.
Calm, focused expression. Side view facing RIGHT.
Row 1: idle, 4 frames, a tiny spark crackling on the staff tip.
Row 2: pointing the staff forward and shooting a small lightning bolt, 4 frames.
Row 3: raising the staff, electric arcs swirling around him (area spell), 4 frames.
Row 4: frames 1-2 hit (staggering); frames 3-4 collapsing to the ground.
```

### `heroi-vesper.png`: Vesper Ashveil (referência: `heroi-vesper.png`)

```text
Character: Vesper Ashveil, a slender half-elf assassin woman: pale skin, silver hair under a dark purple hood,
pointed ear, violet eyes, a long crimson scarf, dark leather outfit, two daggers (one in each hand).
Agile crouched stance. Side view facing RIGHT.
Row 1: idle, 4 frames, scarf fluttering.
Row 2: fast double slash with both daggers, 4 frames.
Row 3: spinning blade dance with shadowy afterimages, 4 frames.
Row 4: frames 1-2 hit (recoiling); frames 3-4 knocked down.
```

### `heroi-odalys.png`: Odalys Thornwick (referência: `heroi-odalys.png`)

```text
Character: Odalys Thornwick, a sylph sorceress: small translucent cyan wings on her back, long mint-green hair,
cream-colored robe with small green leaf patterns, a gnarled wooden staff, small glowing green runes floating near her.
Gentle but mysterious. Side view facing RIGHT.
Row 1: idle, 4 frames, floating slightly, wings fluttering.
Row 2: casting a green rune from the staff, 4 frames.
Row 3: both hands raised, a circle of glowing runes around her (buff spell), 4 frames.
Row 4: frames 1-2 hit (wings folding); frames 3-4 falling down.
```

## Monstros (virados para a ESQUERDA)

Mesma grade para todos:
- **Linha 1:** parado, 4 quadros.
- **Linha 2:** ataque, 4 quadros.
- **Linha 3:** 2 quadros levando dano, depois 2 quadros morrendo ou se desfazendo.
- **Linha 4:** a **versão chefe**, maior (ocupa a célula toda), mais escura e com detalhes brilhantes, parada, 4 quadros.

Troque a primeira linha do bloco de estilo, *"Same character, same size..."*, por *"Same creature, same size in rows 1 to 3; row 4 is the larger boss version"*.

### `monstro-gosma.png` (referência: `monstro-gosma.png`)

```text
Creature: Rust Slime, a blob of living rust and old oil from the steel island, orange-brown with darker spots,
two small white eyes, little metal shavings stuck on it. Facing LEFT.
Row 1: idle bounce, 4 frames. Row 2: lunging forward and splashing, 4 frames.
Row 3: hit squash (2 frames), melting into a puddle (2 frames).
Row 4: boss "Rust Slime King": huge, with bolts and gears stuck in it and a crooked iron crown, idle, 4 frames.
```

### `monstro-lobo.png` (referência: `monstro-lobo.png`)

```text
Creature: Steel Wolf, a gray wolf whose fur hardened into metal plates, red eyes. Side view facing LEFT.
Row 1: idle growl, 4 frames. Row 2: leaping bite, 4 frames.
Row 3: hit (2 frames), falling (2 frames).
Row 4: boss "Alpha Steel Wolf": bigger, darker steel, glowing red eyes and scars, idle, 4 frames.
```

### `monstro-harpia.png` (referência: `monstro-harpia.png`)

```text
Creature: Harpy of the floating forest: woman-bird with teal-green wings, beige skin, red eyes, yellow talons. Facing LEFT.
Row 1: flying in place, wings flapping, 4 frames. Row 2: diving talon attack, 4 frames.
Row 3: hit (2 frames), falling with loose feathers (2 frames).
Row 4: boss "Storm Harpy Queen": larger, darker wings with crackling lightning, feather crown, 4 frames.
```

### `monstro-esqueleto.png` (referência: `monstro-esqueleto.png`)

```text
Creature: Skeleton Guardian, an old royal guard of the ruined capital, ivory bones, red glowing eye sockets,
a rusty half-helmet and a broken spear. Facing LEFT.
Row 1: idle, rattling, 4 frames. Row 2: spear thrust, 4 frames.
Row 3: hit (2 frames), collapsing into a pile of bones (2 frames).
Row 4: boss "Captain of the Old Guard": bigger, torn royal cape, crown helmet, purple aura, 4 frames.
```

### `monstro-espectro.png` (referência: `monstro-espectro.png`)

```text
Creature: Specter, a floating lavender ghost of ancient magic, wispy tail, glowing cyan eyes, semi-transparent look
(use solid pixel colors, NOT real transparency). Facing LEFT.
Row 1: floating, 4 frames. Row 2: casting a wave of violet energy, 4 frames.
Row 3: hit flicker (2 frames), dissolving into sparkles (2 frames).
Row 4: boss "Archspecter": larger, darker purple with a ring of floating runes, 4 frames.
```

### `monstro-golem.png` (referência: `monstro-golem.png`)

```text
Creature: Magma Golem, a hulking humanoid of dark volcanic rock with glowing orange lava cracks and yellow eyes. Facing LEFT.
Row 1: idle, heavy breathing, lava pulsing, 4 frames. Row 2: overhead slam, 4 frames.
Row 3: hit (2 frames), crumbling into rocks (2 frames).
Row 4: boss "Heart of the Forge": huge, lava pouring from the chest, horns of obsidian, 4 frames.
```

### `monstro-diabrete.png` (referência: `monstro-diabrete.png`)

```text
Creature: Ember Imp, a small red fire imp with yellow horns, mischievous grin, a little flame in its hand. Facing LEFT.
Row 1: hopping in place, 4 frames. Row 2: throwing a fireball, 4 frames.
Row 3: hit (2 frames), bursting into embers (2 frames).
Row 4: boss "Imp Overlord": bigger, bat wings, crown of fire, 4 frames.
```

### `monstro-sentinela.png` (referência: `monstro-sentinela.png`)

```text
Creature: Celestial Sentinel, an ancient white stone automaton with blue glowing core and a gold top ornament,
floating stone shoulder plates. Facing LEFT.
Row 1: idle hover, core pulsing, 4 frames. Row 2: punching with a lightning fist, 4 frames.
Row 3: hit sparks (2 frames), shutting down and breaking apart (2 frames).
Row 4: boss "Warden of the Clouds": larger, golden halo, wings of floating stone plates, 4 frames.
```

## Cenários (16:9, sem personagens)

Use este bloco em vez do bloco de estilo:

```text
Pixel art background for a side-view 2D RPG battle, 16-bit SNES-era style, crisp pixels, no anti-aliasing.
Designed at 320x180 pixels, each pixel drawn as a 6x6 block (1920x1080 image), 16:9.
Flat ground strip across the bottom 25% of the image where characters will stand; keep the middle band clear of
large objects so characters on the left and monsters on the right stay readable. Slight parallax layers in the sky.
No characters, no creatures, no text, no UI, no watermark.
```

- `cenario-ilha.png`: *"Outskirts of the Steel Island: green grass over gray steel ground plates, distant floating islands with small towers, blue sky, a few clouds."*
- `cenario-bosque.png`: *"The Floating Forest: giant trees growing on top of clouds, roots hanging into the sky, light-blue sky, white cloud floor."*
- `cenario-ruinas.png`: *"Ruins of Old Hope: broken stone pillars and arches of an ancient capital, purple dusk sky, cracked stone pavement."*
- `cenario-vulcao.png`: *"The Volcanic Forge: dark volcanic rocks, rivers of glowing lava, red-black sky with ash, an ancient giant anvil in the distance."*
- `cenario-cidadela.png`: *"The Cloud Citadel: white marble towers with golden tops floating above the clouds, bright sky, cloud floor."*

## Ícones (1:1, grade 4×4, sem referência)

Use o bloco de estilo trocando a parte do personagem por *"Each cell contains one centered item icon, designed on a 32x32 grid, 8x8 blocks, magenta background #FF00FF"*.

### `icones-equipamentos.png`

```text
16 equipment icons in steel/silver tones with small gold details (rarity will be shown by the game frame), in this exact order,
left to right, top to bottom:
1 plate helmet, 2 plate chestplate, 3 plate gauntlets, 4 plate greaves (leg armor), 5 plate boots,
6 leather hood, 7 silk mage hat, 8 longsword, 9 spear, 10 dagger, 11 wooden staff with a crystal,
12 round shield, 13 magic orb, 14 spellbook, 15 ring with a gem, 16 amulet.
```

### `icones-reliquias.png`

```text
16 magical item icons, glowing and special-looking, in this exact order, left to right, top to bottom:
1 Ember Heart (a burning red-orange heart gem), 2 Thunder Prism (a yellow crystal prism with lightning inside),
3 Phoenix Feather (a red-gold feather with flames), 4 Die of Fate (a golden die with a glowing eye),
5 Broken Crown of Vel'Nora (a cracked silver crown), 6 Root-Mother (a twisted root around a green seed),
7 LionHearth Emblem (a gold lion crest badge), 8 Celestial Hourglass (a white-gold hourglass with stars),
9 Abyss Eye (a purple eye inside a dark stone), 10 Seed of Hope (a glowing golden seed),
11 rust chunk, 12 harpy feather (teal), 13 ancient bone, 14 living ember (small fire coal),
15 celestial core (blue glowing sphere), 16 skill essence (violet crystal shard).
```
