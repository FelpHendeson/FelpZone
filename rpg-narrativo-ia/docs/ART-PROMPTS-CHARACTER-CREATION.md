# Prompts para geração de arte: criação de personagem

Esta é a lista de encomenda dos **fundos pintados da criação de personagem**: 8 imagens principais e 2 texturas opcionais. A tela já sabe exibi-las. Cada passo troca o fundo com um esmaecer suave, e um véu escuro mantém o texto legível. Onde não houver imagem, a tela continua com o fundo liso de hoje.

| Passo | Imagem | Arquivo |
| --- | --- | --- |
| Nome | O despertar | `creation/awakening.webp` |
| Arquétipo | Um fundo por arquétipo, trocado ao tocar na carta | `creation/apprentice-*.webp` (5) |
| Retrato | O reflexo na nascente; o retrato aparece "dentro" da água, com anéis | `creation/reflection.webp` |
| Confirmação | O registro do Sistema | `creation/registry.webp` |
| Cartas (opcional) | Textura atrás das cartas de arquétipo | `creation/card-texture.webp` |

Retratos e armas estão em [Prompts: retratos de arquétipo e armas](ART-PROMPTS-ARCHETYPE-PORTRAITS.md). O estilo geral está em [Prompts para geração de arte](ART-GENERATION-PROMPTS.md).

---

## 1. Direção de arte e formato

Acrescente este bloco de estilo ao fim de **todo** prompt. Ele já vem incluído em cada prompt abaixo:

> Painterly semi-realistic fantasy illustration, digital painting, cinematic natural lighting, muted earthy color palette (moss green, clay brown, overcast blue-grey, warm amber highlights), atmosphere of a quiet, unsettling wilderness the day after a world-reset, no people in the foreground unless described, no UI, no text, no watermark, no logo, no signature, no border, no frame, high detail.

### Regras de composição (valem para as 8 imagens principais)

- **Proporção vertical 9:16** (por exemplo, 1152×2048), pensada para o celular.
  - No computador, a imagem é recortada pelas laterais e pelo alto. Por isso, o assunto principal fica na **faixa central**, entre 30% e 70% da altura.
- **A metade de baixo precisa ser calma**: chão, água, névoa ou sombra, sem detalhes importantes. Formulários, cartas e botões ficam por cima dessa área, e o jogo escurece a imagem de cima para baixo.
- **Sem pessoas em destaque.** O jogador está se criando; uma figura definida no fundo competiria com o retrato dele. As exceções são o despertar (só marcas no chão) e o registro (figura pequena, de costas e em contraluz).
- **Cor de destaque por arquétipo**, a mesma da carta: violeta `#7b6cf0`, âmbar `#d9a441`, verde-musgo `#4fae6f`, carmim `#c2455a`, cinza-azulado `#8aa3b5`.
- **Consistência:** use a mesma ferramenta e o mesmo modelo nas 8 imagens. Se der, use a imagem do despertar como *style reference* das outras 7.

**Exportação:** `.webp`, abaixo de 2 MB (qualidade 80 costuma bastar). Os arquivos vão em `public/images/first-day/creation/`.

---

## 2. Passo do nome: o despertar

### 2.1 `awakening.webp`
> Vertical 9:16 view of a misty forest clearing at first light right after a world-reset, tall dark pines framing the top, pale cold dawn sky breaking through, a patch of flattened damp grass in the middle distance where someone has just woken up, a few faint thin threads of cold blue-white light floating in the air like dust catching the sun, the lower half fading into calm low ground mist and shadowed grass, no people, quiet and slightly unsettling. Painterly semi-realistic fantasy illustration, digital painting, cinematic natural lighting, muted earthy color palette (moss green, clay brown, overcast blue-grey, warm amber highlights), no UI, no text, no watermark, no logo, no signature, no border, no frame, high detail.

---

## 3. Passo do arquétipo: um fundo por aprendiz

Ao tocar numa carta, o fundo troca para a cena daquele arquétipo e ganha um leve brilho na cor dele no alto da tela. As cinco imagens precisam parecer o mesmo mundo em cinco cantos diferentes.

### 3.1 `apprentice-mage.webp`, Aprendiz de Mago
> Vertical 9:16 view of a quiet forest clearing at dawn where tiny motes of pale violet light drift upward from the grass like slow fireflies, an old leaning tree in the middle distance with a faint violet shimmer around its branches, soft beams of cold light through mist, the lower half calm with dark grass and low mist, no people. Painterly semi-realistic fantasy illustration, digital painting, cinematic natural lighting, muted earthy color palette with a single pale violet accent, no UI, no text, no watermark, no logo, no signature, no border, no frame, high detail.

### 3.2 `apprentice-swordsman.webp`, Aprendiz de Espadachim
> Vertical 9:16 view of an improvised training ground at the edge of a forest at sunrise, a few upright logs and stumps covered in fresh cut marks, wood chips scattered, a crude stone blade leaning against a stump in the middle distance, warm amber morning light cutting through dust in the air, the lower half calm with trampled earth in shadow, no people. Painterly semi-realistic fantasy illustration, digital painting, cinematic natural lighting, muted earthy color palette with a warm amber accent, no UI, no text, no watermark, no logo, no signature, no border, no frame, high detail.

### 3.3 `apprentice-archer.webp`, Aprendiz de Arqueiro
> Vertical 9:16 view from the edge of a forest looking over tall swaying grass toward a distant tree line, wind bending the grass in long waves, a single arrow stuck in a tree trunk in the middle distance, birds rising far away, soft moss green and grey morning light, the lower half calm with dark grass in shadow, no people. Painterly semi-realistic fantasy illustration, digital painting, cinematic natural lighting, muted earthy color palette with a moss green accent, no UI, no text, no watermark, no logo, no signature, no border, no frame, high detail.

### 3.4 `apprentice-assassin.webp`, Aprendiz de Assassino
> Vertical 9:16 view of a dense undergrowth of tall ferns at dusk, a narrow hidden path disappearing between dark trunks, deep shadows with a thin dark crimson glow of the setting sun low behind the trees, a faint glint of something sharp half hidden in the ferns, the lower half calm and nearly black with fern silhouettes, no people, tense and silent. Painterly semi-realistic fantasy illustration, digital painting, cinematic natural lighting, muted earthy color palette with a dark crimson accent, no UI, no text, no watermark, no logo, no signature, no border, no frame, high detail.

### 3.5 `apprentice-pathless.webp`, Aprendiz sem caminho
> Vertical 9:16 view of a crossroads of several narrow dirt trails splitting in different directions through a misty meadow at early morning, each trail fading into fog toward different landscapes (forest, hills, a distant floating island barely visible in the sky), soft pale blue-grey light, the lower half calm with the worn crossroads ground and low mist, no people, open and hopeful. Painterly semi-realistic fantasy illustration, digital painting, cinematic natural lighting, muted earthy color palette with a pale blue-grey accent, no UI, no text, no watermark, no logo, no signature, no border, no frame, high detail.

---

## 4. Passo do retrato: o reflexo na nascente

O retrato montado ou escolhido aparece no centro, com anéis de água animados ao redor. A imagem precisa deixar **o centro da tela livre e calmo**, como uma superfície de água onde o rosto vai "aparecer".

### 4.1 `reflection.webp`
> Vertical 9:16 view looking down at the still surface of a small clear forest spring at dawn, the water reflecting overhanging leaves and a pale sky, a calm empty circular area of smooth dark water in the exact center where a reflection would appear, a few gentle ripples spreading outward, mossy stones and ferns framing the edges, the lower half dark calm water, no people and no face in the water. Painterly semi-realistic fantasy illustration, digital painting, cinematic natural lighting, muted earthy color palette with soft teal water tones, no UI, no text, no watermark, no logo, no signature, no border, no frame, high detail.

---

## 5. Passo da confirmação: o registro do Sistema

### 5.1 `registry.webp`
> Vertical 9:16 view of a small lone figure seen from behind and in silhouette, standing in the middle of a forest clearing at sunrise, thin threads of cold blue-white light rising slowly from the ground around the figure and spiraling upward into the sky, as if the world itself were writing down this person, distant floating islands faintly visible high in the pale sky, the figure small in the middle third with no facial features visible, the lower half calm with dark grass and mist. Painterly semi-realistic fantasy illustration, digital painting, cinematic natural lighting, muted earthy color palette with cold blue-white light accents, no UI, no text, no watermark, no logo, no signature, no border, no frame, high detail.

---

## 6. Opcional: textura das cartas

A textura fica atrás das cartas de arquétipo, coberta por um véu. Ela só precisa ser bonita, uniforme e sem um ponto focal. Use uma imagem quadrada 1:1 (1024×1024) e escolha **uma** das duas opções:

### 6.1 `card-texture.webp`, casca de árvore
> Seamless close-up texture of weathered tree bark with fine moss in the cracks, even soft lighting, no focal point, uniform detail across the whole image, square 1:1. Painterly semi-realistic illustration, muted earthy color palette, no text, no watermark, no border.

### 6.2 `card-texture.webp` (alternativa), pedra
> Seamless close-up texture of an old flat river stone surface with subtle lichen and faint carved scratch marks, even soft lighting, no focal point, uniform detail across the whole image, square 1:1. Painterly semi-realistic illustration, muted earthy color palette, no text, no watermark, no border.

---

## 7. Checklist e como aplicar

```
public/images/first-day/creation/awakening.webp
public/images/first-day/creation/apprentice-mage.webp
public/images/first-day/creation/apprentice-swordsman.webp
public/images/first-day/creation/apprentice-archer.webp
public/images/first-day/creation/apprentice-assassin.webp
public/images/first-day/creation/apprentice-pathless.webp
public/images/first-day/creation/reflection.webp
public/images/first-day/creation/registry.webp
public/images/first-day/creation/card-texture.webp   (opcional)
```

Os espaços já existem em `content/first-day/system/archetypes.json`:

- **Despertar, reflexo, registro e textura:** ficam em `creation` (`awakening`, `reflection`, `registry`, `cardTexture`).
- **Fundos de arquétipo:** cada arquétipo tem o seu em `backdrop`.

Para ligar uma imagem, acrescente o `src`:

```json
"awakening": {
  "kind": "scene",
  "label": "Clareira em névoa ao amanhecer, onde alguém acabou de despertar",
  "src": "/images/first-day/creation/awakening.webp"
}
```

**O jeito mais fácil:** coloque os arquivos em `art-inbox/` com estes nomes e rode `npm run art:install`. O script converte, otimiza (fundos com no máximo 1080×1920, textura com 512×512), salva e preenche o `src` sozinho. Dá para ligar uma imagem de cada vez: o passo sem imagem mantém o fundo liso.
