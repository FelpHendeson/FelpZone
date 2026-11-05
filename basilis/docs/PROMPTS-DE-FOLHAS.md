# Prompts para gerar folhas — Basilis: O Novo Mundo

Prompts para gerar com IA as folhas de personagem, camadas, equipamentos, armas e efeitos, no formato de [PERSONAGEM.md](PERSONAGEM.md) e [ARMAS-E-COMANDOS.md](ARMAS-E-COMANDOS.md) e nas regras da [direção de arte](DIRECAO-DE-ARTE.md). Os prompts estão em inglês porque os geradores de imagem seguem melhor o inglês; as explicações estão em português.

## 1. O que a IA faz bem e o que não faz

Geradores de imagem **não respeitam uma grade de pixels** sozinhos: os "pixels" saem de tamanhos diferentes, a grade entorta, sobram cores e a mesma peça muda de um quadro para outro. Por isso:

- **Sempre parta do molde.** Cada lab baixa a folha gerada por código (o molde, com o corpo e as posições certas). Envie o molde como **imagem de referência** e peça para pintar por cima, mantendo cada quadro no lugar.
- **Gere ampliado.** Amplie o molde 8 vezes sem suavização (um quadro de 32 × 32 vira 256 × 256) antes de enviar. A IA trabalha melhor em tamanho grande; depois o lab reduz de volta.
- **Limpe no lab.** A ferramenta de importar folhas (prevista no Lab 05) reduz para a grade com o vizinho mais próximo, quantiza nas rampas da paleta-mestra, tira o fundo e mostra o resultado sobre o molde. Retoques de 1 ou 2 pixels são feitos à mão (Aseprite ou Pixelorama).
- **Uma camada por pedido.** Peça só o cabelo, só a roupa, só a armadura, sobre o manequim. Pedir o personagem inteiro e tentar separar depois não funciona.
- **Peças pequenas demais** (olhos de 2 px, sobrancelhas, botões) saem melhor à mão ou por código.
- **Conceito primeiro.** Para um personagem ou conjunto novo, gere antes uma **folha de conceito** em tamanho livre, escolha o visual e só depois peça a camada no molde, mostrando o conceito junto.

## 2. Bloco de estilo (vai em todos os prompts)

```text
Original pixel art for a top-down action RPG in the style of late Game Boy Advance
adventure games: 3/4 overhead view, clean readable silhouettes, rich but limited
palette (max 15 colors per sprite plus transparency), colored dark outlines (darkest
tone of each material, never pure black), selective outline lighter on the lit side,
light always from the top-left, flat cel shading with 3-4 tones per material, little
or no dithering. Every pixel is a hard square on a strict grid. Transparent background.
```

Negativo (se o gerador aceitar):

```text
no anti-aliasing, no blur, no soft gradients, no glow halos, no drop shadows outside
the sprite, no text, no labels, no grid lines, no frame borders, no watermark, no 3D
render, no painterly brushwork, no perspective change between frames, no extra
characters, not copied from any existing game.
```

## 3. Folha de conceito (estilo e personagem)

Para fixar o visual antes das camadas.

```text
[STYLE BLOCK]
Character concept sheet for "a young adult human just transported to an ancient
fantasy world, still wearing worn modern clothes: faded t-shirt, jeans, sneakers".
Show the same character small (about 16x24 pixel proportions, big head, short body)
facing down, up and right, plus a larger front view (64x96) for an equipment menu.
Neutral expression, idle pose, arms relaxed. Keep the colors identical in all views.
```

Troque a descrição entre aspas para outros personagens: Caio, Davi, um santo de Shemesh, um Marcado de Mykol.

## 4. Manequim (corpo base)

Envie o molde do Lab 05 ampliado.

```text
[STYLE BLOCK]
Paint over the attached template exactly. It is a sprite sheet of 32x32 frames
(shown enlarged 8x). Each row is one animation, each column one frame; do not move,
add or remove frames. Draw a bald, barefoot human mannequin wearing only simple
underwear, body type [A: narrower shoulders | B: broader shoulders], about 16x24
pixels inside each 32x32 frame, feet on the marked anchor point. Skin in exactly
4 tones of [warm medium brown] plus a darker outline tone. Keep the body identical in
size and proportion across every frame, only the pose changes as in the template.
```

Gere um tom de pele só: os outros tons saem da troca de rampa no lab.

## 5. Cabelos

```text
[STYLE BLOCK]
Paint ONLY the hair over the attached mannequin template; everything else stays
transparent. Hairstyle: [short messy | long straight past the shoulders | braided |
curly afro | shaved sides with top knot | bob cut | spiky | ponytail]. Use exactly
4 tones of [neutral mid gray] plus an outline tone, so it can be recolored later.
Hair follows the head in every frame (bob with the walk, flip with the side view).
Split long hair: the part that falls behind the shoulders goes on a separate sheet
called "back hair", the fringe and top on "front hair".
```

Cinza neutro de propósito: o cabelo é recolorido no jogo.

## 6. Roupa padrão (roupa da Terra)

```text
[STYLE BLOCK]
Paint ONLY the clothes over the attached mannequin template: a worn, slightly faded
short-sleeve t-shirt, jeans with frayed hems and old sneakers. Clothes follow the body
in every frame, folds move with the walk. Use separate tone groups: t-shirt in 4 tones
of [neutral gray], jeans in 4 tones of [blue], sneakers in 3 tones of [white/gray].
Transparent where there is no cloth.
```

## 7. Equipamentos e armaduras

Uma peça por pedido, sobre o manequim **já vestido com a roupa padrão** (para a peça cobrir o que precisa).

```text
[STYLE BLOCK]
Paint ONLY the [chest piece] over the attached template: [a hardened leather jerkin
with stitched panels and a belt | chainmail shirt over a padded tunic | polished plate
breastplate with pauldrons | flowing robe embroidered with violet-cyan Eteris runes].
It must cover the t-shirt completely. Materials as separate tone groups: [leather in
4 tones of brown, metal in 4 tones of neutral gray, cloth in 4 tones of gray].
Same position in every frame, following the body.
```

Variações de tema:

- **Sagrado:** `geometric shapes, perfect symmetry, gold trims, sun or halo motifs, clean lines`.
- **Profano:** `organic shapes, asymmetry, deep colors (wine, dark teal, bruised purple), bone, thorns, scales`.
- **Por divindade:** Selene `pale silver and blood red, crescent shapes`; Mykol `furs, wolf teeth, night blue`; Yovel `broken chains, open circles`.

Capacetes e chapéus: acrescente `the hair is hidden under it` ou `only the top of the hair is hidden`.

## 8. Boneco do menu e ícones

```text
[STYLE BLOCK]
Front view of the attached character, larger: 64x96 pixels, standing idle, for an
equipment screen. Same colors and same items as the small sprite. Then 4 idle frames
(breathing) side by side.
```

```text
[STYLE BLOCK]
Inventory icons, each exactly 16x16 pixels (shown enlarged), one item per icon,
centered, readable at small size, slight top-left light: [leather jerkin, iron
helmet, travel boots, wooden shield, health potion, Eteris crystal].
```

## 9. Armas

Cada arma é uma **folha de orientações**, não uma animação.

```text
[STYLE BLOCK]
A [longsword with a leather-wrapped grip and simple crossguard] drawn in 16
orientations, one per cell, in a 4x4 grid of 32x32 cells (enlarged 8x). Orientation
0 points straight right, then rotates counter-clockwise in steps of 22.5 degrees.
The grip is always at the exact center of the cell (the hand point). Same size and
details in every orientation, redrawn as pixel art for each angle (not rotated
pixels). Blade in 4 tones of neutral gray, grip in 3 tones of brown.
```

Troque a arma: `short dagger`, `two-handed greatsword`, `long spear with leaf-shaped head`, `iron-banded mace`, `short wooden bow (string side visible)`, `throwing knife`, `gnarled wooden staff with a violet-cyan Eteris crystal`. Para armas longas (lança, cajado), use células de 48 × 48.

## 10. Efeitos e partículas

```text
[STYLE BLOCK]
Slash trail effect for a longsword, 6 frames in a row, each frame 48x48: a wide
crescent arc that appears, sweeps and fades in pieces, colors white to pale cyan with
a darker blue edge, no soft glow, hard pixel edges only.
```

```text
[STYLE BLOCK]
Magic projectile, 4 looping frames of 16x16 plus 5 impact frames of 32x32:
[a violet-cyan Eteris orb | a blood-red crescent of Selene | a pale gold sun spark of
Shemesh]. Pixel particles of 1-3 pixels around it, hard edges, limited palette.
```

```text
[STYLE BLOCK]
Dash afterimage reference: the attached character in 3 fading silhouettes, solid
[pale cyan], each one more transparent, no internal detail.
```

## 11. Conferência depois de gerar

1. Carregue a folha no lab e confira **quadro por quadro** sobre o molde: corpo no mesmo lugar, pés na âncora.
2. Veja animando: cabelo e roupa não podem "tremer" entre quadros.
3. Confira as cores depois da quantização: cada grupo de tons deve cair numa rampa só.
4. Corrija à mão o que sobrar (contornos falhados, pixels soltos).
5. Anote no README do lab o que precisou de retoque: isso decide se a IA vale para cada tipo de camada.
