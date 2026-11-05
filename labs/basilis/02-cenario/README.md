# Lab 02 — Cenário e escala

**Pergunta:** o movimento do Lab 01 num cenário de pixel art, montado a partir de uma spritesheet (gerada por código ou por IA), fica nítido e bem enquadrado em qualquer tela, em pé ou deitada?

## O que tem

- **O motor do Lab 01** (joystick, teclado, controle, ataque e esquiva) andando num campo gerado com grama, flores, pedras, árvores e água animada. Velocidade, joystick e esquiva usam o que foi calibrado no Lab 01 no mesmo aparelho.
- **Um personagem 16 × 24** em 4 direções, com ciclo de andar de 4 quadros, gerado por código nas regras da [direção de arte](../../../basilis/docs/DIRECAO-DE-ARTE.md).
- **O centro imutável:** a área tracejada tem sempre o mesmo número de tiles. A escala é a maior que ainda a mostra inteira, e o que sobra mostra mais mundo: em pé, para cima e para baixo; deitado, para os lados.
- **Resolução interna de verdade:** o mundo é desenhado em pixels do jogo e ampliado sem suavização.
- **Rolagem lisa (subpixel na tela):** a câmera guarda a fração de pixel e só a aplica depois de ampliar, em pixels de tela; os sprites são desenhados direto na tela, na mesma escala, pela mesma câmera. Os pixels continuam do mesmo tamanho, mas nada anda aos saltos. É a técnica usada por jogos modernos de pixel art para evitar o tremor.
- **Ajustes:** área central separada para retrato e para paisagem (6 a 16 tiles cada; a orientação é detectada sozinha), escala inteira ou livre, rolagem lisa ou pixel a pixel, câmera suave ou presa, mostrar a área central e depuração.
- **Folha:** um editor para trocar a spritesheet.

## Usar uma spritesheet de IA

1. Gere a imagem (sugestão de prompt abaixo).
2. No lab, abra **Folha** e toque em **Carregar spritesheet**. A imagem fica só no aparelho; nada é enviado.
3. Ajuste **tamanho do tile**, **margens** e **espaço entre tiles** até os quadrados da grade caírem sobre os tiles da imagem.
4. Escolha um papel (Grama, Flores, Pedra…) e toque no tile da folha que o representa. O próximo papel sem tile é escolhido sozinho.
5. Papéis sem tile continuam usando a arte gerada. **Usar folha gerada** volta ao início.

Cada tile é reduzido para 16 × 16 sem suavização. Pedras e árvores são desenhadas sobre a grama, então funcionam melhor com fundo transparente.

**Prompt sugerido** (em inglês, que costuma funcionar melhor nesses geradores):

> Pixel art tileset sprite sheet for a top-down handheld-era RPG, 16x16 pixel tiles on a strict grid, 8 columns, no gaps, flat orthographic view, limited palette, colored dark outlines, light from top-left. Tiles in order: short grass, darker grass, grass with small flowers, grey boulder on transparent background, round leafy tree on transparent background, water, water animation frame 2, dirt path. No text, no characters, no shadows outside tiles.

Folhas de IA costumam sair com "pixels" de tamanhos diferentes, grade torta e mais cores que o permitido. Ver o quanto isso atrapalha é parte da pergunta deste lab.

## O que observar

1. Os pixels ficam nítidos e do mesmo tamanho? Compare **escala inteira** e **livre**.
2. Qual tamanho de área central parece certo para jogar? (Os portáteis mostravam cerca de 10 × 9 tiles.)
3. Girar o celular muda só o quanto se vê, sem mudar o tamanho do essencial?
4. Câmera suave ou presa?
5. Uma folha de IA, fatiada aqui, chega perto da direção de arte? O que precisa ser corrigido à mão?

## Verificado até agora

- Testes automáticos (`npm test`): escala em pé e deitado, área central sempre visível nas duas escalas, câmera lisa com fração contínua, câmera pixel a pixel em inteiros, câmera presa às bordas do mundo, grade da folha (célula sob o toque, margens e espaçamento) e rosto preso a 4 direções.
- No navegador do computador: em 375 × 812 a escala ficou ×2 (×4 em pixels físicos) com 11,8 × 25,4 tiles visíveis; em 812 × 375, a mesma escala com 25,4 × 11,8 tiles. Uma folha de teste de 256 × 128 px carregou no editor, a grade foi ajustada e três papéis foram definidos tocando nas células.
- No celular: área central, zoom por orientação e rolagem lisa aprovados. Trocando a rolagem nos ajustes, o modo pixel a pixel trava e o liso não.
- **Ainda não testado** com uma folha gerada por IA real.

## Achados

- **Área central e zoom configurável:** aprovados no primeiro teste no celular.
- **Tremor ao andar (corrigido):** na primeira versão, a câmera e o personagem andavam em pixels inteiros do jogo. A 5 tiles/s o personagem anda cerca de 1,3 pixel do jogo por quadro, então a tela pulava 1, 1, 2, 1, 1, 2… pixels (cada um com 4 a 6 pixels de tela), e o personagem oscilava um pixel contra o cenário. A correção é a rolagem lisa descrita acima. O modo **pixel a pixel** continua nos ajustes para comparar.
- **Golpe:** o arco de quadradinhos em pixel art agradou menos que o cone preenchido do Lab 01. O cone voltou como padrão; os estilos de golpe viraram uma lista, para no futuro cada arma ter a sua animação.

## Conclusão

**Concluído.** O jogo usa o centro imutável (área central em tiles, com valor próprio para retrato e para paisagem), escala inteira, rolagem lisa em subpixel com sprites desenhados direto na tela, e câmera suave. A rolagem pixel a pixel fica descartada. O uso de folhas de IA continua em aberto até um teste com uma folha real.
