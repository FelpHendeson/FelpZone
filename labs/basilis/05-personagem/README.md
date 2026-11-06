# Lab 05 — Personagem em camadas

**Pergunta:** um corpo base com pontos por quadro, camadas de personalização e troca de paleta dá um personagem bonito, variado e barato de desenhar, no jogo e no menu? O desenho está em [PERSONAGEM.md](../../../basilis/docs/PERSONAGEM.md).

O lab é feito em 6 partes, cada uma publicada e conferida antes da seguinte:

| Parte | O que prova | Estado |
| --- | --- | --- |
| **1 — Molde e pontos** | O esqueleto: formato da folha, animações, pontos por quadro e um manequim gerado por código | **Feita** |
| 2 — Camadas e paleta | Camadas na ordem da seção 3, tons-índice pintados por rampas, regras de esconder, receita em JSON montada uma vez | Depois |
| 3 — Criação de personagem | A tela com as opções da seção 6, roupa da Terra, um exemplo de linhagem (lobo de Mykol) | Depois |
| 4 — Jogo e menu | O sprite andando numa arena ao lado do boneco do menu (64 × 96 próprio ou o sprite ampliado) | Depois |
| 5 — NPCs | Receitas sorteadas andando pela arena, um desenho por personagem por quadro | Depois |
| 6 — Importar folha | Baixar o molde de qualquer camada e carregar folhas de fora por camada | Depois |

## O que tem (parte 1)

- **Manequim gerado por código**, o corpo base do molde: corpo de **16 × 24** num quadro de 32 × 32, **contorno colorido** (o tom mais escuro da rampa de cada parte, nunca preto), **contorno seletivo** um tom mais claro do lado da luz, **rampas de 4 tons** (contorno, sombra, base, luz) para pele e tecido, **luz do alto à esquerda**, linhas internas onde um braço ou a cabeça passam por cima do corpo e o braço e a perna do lado de longe um tom mais escuros quando visto de lado. Desenhado em **tons-índice** (cada pixel é um tom de um canal), já pronto para a troca de paleta da parte 2.
- **Animações do molde**, em 3 direções desenhadas (baixo, cima, lado; a esquerda é o lado espelhado):

| Animação | Quadros | Velocidade | Repete |
| --- | --- | --- | --- |
| Parado (respira) | 4 | 3 q/s | sim |
| Andar (contato, desce, passa, com cada pé) | 6 | 10 q/s | sim |
| Dash (arranque, deslize, freio) | 3 | 12 q/s | não |
| Levar dano | 2 | 10 q/s | não |
| Cortar, ida (prepara, corta, acerta, volta) | 4 | 16 q/s, acerta no 2º e 3º | não |
| Cortar, volta (o mesmo golpe no sentido contrário, para o combo) | 4 | 16 q/s, acerta no 2º e 3º | não |
| Morrer (uma só, de frente: ajoelha, cai, deitado) | 4 | 6 q/s | não |

- **Pontos por quadro** em todas as animações: `mao-principal` (com a orientação da arma, de 16, e se a arma vai na frente ou atrás do corpo), `mao-secundaria`, `cabeca` (topo da cabeça), `costas` e `pes` (a âncora). Cada ponto diz também se o que se prende ali vai na frente ou atrás do corpo.
- **Espada de teste** colocada pelo ponto da mão: uma folha de 16 orientações já desenhadas (gerada uma vez, sem rotação em tempo real). Só prova os pontos; as armas por família são do Lab 07.
- **Visualizador:** direção (baixo, cima, direita, esquerda), animação, velocidade, pausa e quadro a quadro; os pontos desenhados sobre o quadro (marca cheia: na frente; vazada: atrás; traço: orientação da arma) e numa tabela com os valores; as quatro direções no tamanho do jogo; a folha inteira, em que tocar num quadro abre esse quadro.
- **Baixar:** a folha do manequim em PNG (o molde para desenhar camadas à mão ou com IA) e os pontos de todos os quadros em JSON.

## Formato

- Quadros de **32 × 32**, âncora nos pés em **(16, 28)**, corpo de 16 × 24 de (8, 4) a (23, 27) parado de frente. Igual ao Lab 04.
- **Uma animação por linha**, na ordem da tabela acima, cada uma em baixo, cima e lado (morrer, uma linha só). A folha tem **192 × 608 px** (6 quadros na linha mais longa, 19 linhas). Famílias de golpe novas entram como linhas novas depois das que já existem.
- **Coordenadas dos pontos em cantos de pixel**, como a âncora: (16, 28) é a linha entre os pixels 15 e 16, logo abaixo do pé. A mão é o 2 × 2 de pixels em volta do ponto da mão.
- **Orientações da arma:** 16, no sentido horário da tela; 0 = direita, 4 = baixo, 8 = esquerda, 12 = cima.
- **Espelhar para a esquerda:** a imagem é virada na horizontal, x vira 32 − x e a orientação vira 8 − o (módulo 16). Frente ou atrás não muda.
- **Cores:** cada pixel do molde é um tom de um canal (pele, tecido, olhos); o tom 0 é o mais escuro e serve de contorno. A paleta indexada do manequim tem 9 cores mais a transparente.

## Ajustes

Mostrar os pontos, espada de teste na mão, sombra no chão, contorno mais leve do lado da luz (contorno seletivo), linhas internas e o fundo (grama, terra, escuro ou xadrez). Os dois ajustes de contorno refazem a folha na hora, para comparar.

## O que observar

1. O manequim está bom o bastante como **molde** para desenhar camadas por cima (cabelo, roupa, armadura)? O corpo de 16 × 24 tem espaço para cabelo volumoso e capa dentro do quadro?
2. Dá para ler a direção e a ação no **tamanho do jogo**, sem ampliar?
3. O **contorno seletivo** e as **linhas internas** ajudam ou sujam o pixel? Compare ligando e desligando, na grama e na terra.
4. Os **pontos** caem onde deveriam em todos os quadros? A espada de teste sai da mão e muda de frente para trás nos quadros certos (erguida, ou cortando de costas)?
5. A **esquerda espelhada** fica aceitável (a mão da arma troca de lado)?
6. Andar com 6 quadros e parado com 4 ficam mais vivos que os 4 e 2 do Lab 04?

## Verificado até agora

- Testes automáticos (`npm test`): formato (quadro, âncora, animações e quadros pedidos, linhas sem sobreposição nem buracos, tamanho da folha, esquerda espelhada, as duas linhas de cortar com a mesma duração e os mesmos quadros ativos), uma pose por quadro, os cinco pontos em todos os quadros e dentro do quadro, pés sempre na âncora, orientação válida, as mãos sobre as mãos desenhadas, a cabeça no topo do corpo, costas na frente só de costas, arma atrás ao cortar de costas, espelhamento (orientação, ida e volta, pés no lugar), manequim de 16 × 24 sobre os pés em todas as direções, no máximo 15 cores e sem preto, rampas de 3 a 4 tons, borda nos tons escuros, metade esquerda da cabeça mais clara, cada quadro da folha no lugar, as 16 orientações da espada e o JSON dos pontos.
- No navegador do computador, em tamanho de celular (375 × 812): todas as animações conferidas quadro a quadro com a espada de teste, a esquerda espelhada com os pontos e a orientação certos, os ajustes de pontos e de contorno ligando e desligando e refazendo a folha.
- **Ainda não testado num celular de verdade.**

## Achados

- (nenhum ainda)

## Conclusão pendente

Parte 1 de 6. As partes 2 a 6 vêm depois, cada uma numa sessão própria; a conclusão do lab sai quando todas estiverem prontas e aprovadas.

## Para as próximas partes (código)

| Módulo | O que tem | Quem estende |
| --- | --- | --- |
| `molde.ts` | Formato da folha (`MOLDE_FORMAT`), tabela de ações, direções e espelhamento, canais e rampas do manequim | Parte 2 (canais e rampas da paleta-mestra); Lab 07 (linhas de novas famílias de golpe) |
| `poses.ts` | A pose de cada quadro (corpo, mãos, pés, braço na frente ou atrás, orientação da arma) | Lab 07 (poses de estocar, golpe pesado, arco, arremesso, conjurar) |
| `pontos.ts` | Pontos por quadro, espelhamento, orientações, JSON | Partes 2 a 6 e Labs 06 a 08 (só importam) |
| `raster.ts` | Imagem indexada e mapa de partes, sem canvas (testável) | Parte 2 (camadas em tons-índice), parte 6 (quantizar folhas de fora) |
| `manequim.ts` | O corpo base desenhado das poses: sombreado, contorno colorido e seletivo, linhas internas | Parte 2 (vira a camada "corpo base"; cabelo, rosto e roupa usam as mesmas poses) |
| `compor.ts` | Desenha um quadro: sombra, arma atrás, corpo, arma na frente, pelo ponto da mão | Parte 2 (pilha de camadas), parte 4 (arena e menu), Lab 07 (armas de verdade) |
| `arma-teste.ts` | Espada de 16 orientações gerada uma vez | Trocada pelas folhas de arma do Lab 07 |
| `pintura.ts` | Pinta imagem indexada com uma paleta, baixa PNG | Parte 2 (troca de paleta), parte 6 |
| `viewer.ts` | Visualizador do molde e dos pontos | Parte 2 (escolher camadas), parte 6 (baixar o molde por camada) |

Reaproveitado do Lab 04: `animation.ts` (formato de folha, quadros por tempo, quadros ativos), `sliceClips` e os auxiliares do visualizador; do Lab 01 os ajustes guardados e o painel.
