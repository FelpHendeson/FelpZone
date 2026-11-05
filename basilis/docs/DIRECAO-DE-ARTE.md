# Direção de arte — Basilis: O Novo Mundo

Rascunho vivo. Define a escola visual do jogo e as regras técnicas que os labs devem seguir.

## 1. Escola

**Pixel art de RPG top-down da era portátil.** A referência é o mesmo cerne artístico de:

- *The Legend of Zelda: Link's Awakening* (Game Boy): leitura instantânea, formas fortes, tudo cabe num tile;
- *The Legend of Zelda: The Minish Cap* (GBA), no auge do estilo: cor rica, personagens expressivos, cenários densos e vivos;
- *Pokémon FireRed/LeafGreen* e *Emerald* (GBA): tilesets limpos e organizados, cidades e rotas legíveis, animações de água, grama e flores.

O que se pega dessas obras é a **linguagem**, não o material: resolução, tamanho de tile, perspectiva, paletas limitadas, contorno, sombreamento e ritmo de animação. Toda arte de Basilis é original. Nenhum sprite, tileset ou paleta extraído desses jogos entra no projeto.

## 2. Regras técnicas

| Tema | Regra |
| --- | --- |
| **Tile** | 16 × 16 px. Mapas montados em grade, com camadas: chão, decoração, objetos sólidos e coisas que ficam acima do personagem (copas, telhados). |
| **Perspectiva** | Top-down oblíquo (3/4): o chão visto de cima, paredes, árvores e personagens vistos de frente e levemente de cima. |
| **Personagens** | Humanos com 16 × 24 ou 16 × 32 px; Folhins e criaturas pequenas com 16 × 16. Chefes e deuses podem ocupar vários tiles. |
| **Direções** | Sprites em 4 direções (cima, baixo, esquerda, direita; esquerda pode ser direita espelhada). O movimento pode ser em 8 direções ou livre, mas o rosto do personagem fica preso a 4. |
| **Paletas** | Até 15 cores mais a transparente por sprite ou conjunto de tiles, como no GBA. Uma paleta-mestra do jogo, com rampas por material (grama, pedra, água, pele, tecido, Etéris). |
| **Contorno** | Contorno escuro **colorido** (o tom mais escuro da rampa do objeto), não preto puro. Contorno seletivo: mais leve do lado da luz. |
| **Luz** | Sempre do alto à esquerda. Sombras no chão como elipses ou formas simples, numa cor escura semitransparente da paleta. |
| **Pontilhado** | Pouco ou nenhum; só em degradês grandes (céu, água funda, magia). |
| **Render** | Resolução interna baixa, ampliada sem suavização pela escala da seção 3. Pixels sempre do mesmo tamanho; a rolagem e o movimento dos sprites andam em pixels de tela (subpixel), para não tremer. Nada de rotação nem escala individual de sprites. |
| **Animação** | Andar com 4 quadros por direção (o estilo Minish Cap pede 6 a 8 nos personagens principais). Ataque com 3 a 5 quadros. Tiles animados para água, flores, grama alta e nascentes de essência. Velocidade de 8 a 12 quadros por segundo para sprites. |
| **Texto e interface** | Fonte bitmap própria, janelas com bordas em 9 partes, ícones de 16 × 16. A interface segue as mesmas paletas e o mesmo tamanho de pixel do mundo. |
| **Efeitos** | Feitos em pixel art também: partículas de 1 a 4 px, faíscas e rastros desenhados em quadros. Brilho e transparência com moderação, para não "lavar" o pixel. |

## 3. Tela: o centro imutável

A escala não é fixa. Toda tela mostra pelo menos uma **área central imutável**, um quadrado de tiles em volta do personagem que tem o mesmo tamanho em qualquer aparelho. A escala é a maior que ainda faz essa área caber. O que sobra só mostra mais mundo:

- **celular em pé:** mais mapa para cima e para baixo;
- **celular deitado ou computador:** mais mapa para os lados.

Assim ninguém ganha nem perde o essencial por causa do aparelho, e o jogo é desenhado para a área central. O tamanho dessa área pode ser diferente em retrato e em paisagem. O tamanho (algo entre 9 e 12 tiles) e a escolha entre escala inteira (pixels perfeitamente iguais) ou livre (a área central sempre do mesmo tamanho na tela) saem do Lab 02.

## 4. Identidade de Basilis dentro da escola

A escola é compartilhada; o que torna Basilis reconhecível:

- **Três sóis e sete luas** mudam a luz: o dia ganha tons diferentes conforme o sol dominante, e cada lua tinge a noite com a própria cor.
- **Etéris** tem cor própria (do violeta ao ciano, como a camada de essência do Matrix Sim) e brilha em nascentes, marcas de linhagem e técnicas de Númen.
- **Folhins** e as sociedades animais têm silhuetas fortes e fáceis de ler num tile.
- **Humanos recém-chegados** usam roupas da Terra, gastas, que vão sendo trocadas por peças de Basilis: a mudança de visual conta a adaptação.
- **Sagrado e profano** têm linguagens visuais distintas: o sagrado em formas geométricas, simetria e dourado; o profano em formas orgânicas, assimetria e tons fundos.

## 5. De onde vem a arte

| Caminho | Quando usar |
| --- | --- |
| **Arte própria** (desenhada à mão em um editor como Aseprite ou Pixelorama) | A arte final do jogo. |
| **Arte gerada por código** | Os labs: eles testam funções, não arte, então a arte é só funcional. |
| **Spritesheets geradas por IA** | Testar se uma folha de IA, fatiada em tiles, serve de base para cenários (Lab 02). |

## 6. Impacto nos labs

- **Lab 01 (controles):** o rosto do personagem passa a ser preso a 4 direções na arte; o movimento continua configurável.
- **Lab 02 (cenário e escala):** o motor de movimento do Lab 01 num cenário gerado, montado a partir de uma spritesheet (de código ou de IA), com o centro imutável e a câmera presa a pixels.
- **Lab 03 (animação):** personagem 16 × 24 em 4 direções, andar e atacar, e tiles animados.
- Os demais labs seguem as regras da seção 2.
