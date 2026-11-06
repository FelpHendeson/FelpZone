# Lab 05 — Personagem em camadas

**Pergunta:** um corpo base com pontos por quadro, camadas de personalização e troca de paleta dá um personagem bonito, variado e barato de desenhar, no jogo e no menu? O desenho está em [PERSONAGEM.md](../../../basilis/docs/PERSONAGEM.md).

O lab é feito em 6 partes, cada uma publicada e conferida antes da seguinte:

| Parte | O que prova | Estado |
| --- | --- | --- |
| **1 — Molde e pontos** | O esqueleto: formato da folha, animações, pontos por quadro e um manequim gerado por código | **Feita** |
| **2 — Camadas e paleta** | Camadas na ordem da seção 3, tons-índice pintados por rampas, regras de esconder, receita em JSON montada uma vez | **Feita** |
| **3 — Criação de personagem** | A tela com as opções da seção 6, roupa da Terra, um exemplo de linhagem (lobo de Mykol) | **Feita** |
| **4 — Jogo e menu** | O sprite andando numa arena ao lado do boneco do menu (64 × 96 próprio ou o sprite ampliado) | **Feita** |
| 5 — NPCs | Receitas sorteadas andando pela arena, um desenho por personagem por quadro | Depois |
| 6 — Importar folha | Baixar o molde de qualquer camada e carregar folhas de fora por camada | Depois |

## O que tem (parte 4)

Uma terceira aba, **Jogo**, entre a Criação e a Bancada. Tudo nela sai da receita da criação.

- **Arena pequena** (26 × 22 tiles do Lab 01, com o cenário do Lab 02) com o personagem da receita **andando e cortando**, com o movimento e os controles do Lab 04: joystick que aparece onde o polegar toca na metade esquerda e botões **Esquiva** e **Corte** dentro da arena no celular; WASD ou setas, J ou espaço e K ou Shift no computador (o teclado só vale com a aba Jogo aberta). A espada de teste fica na mão pelo ponto `mao-principal`, como na criação.
- **Animações do molde na arena:** parado, andar (mais rápido quando corre), **cortar alternando ida e volta** a cada golpe (as duas linhas do molde) e a esquiva do Lab 04 com o rastro; como o molde não tem a linha de rolar, a esquiva usa a linha do dash como desenho. Prioridade do Lab 04: esquiva > corte > andar > parado.
- **Boneco do menu, lado a lado, acima da arena** (ao lado dela no computador), parado de frente e respirando, no mesmo tamanho e no mesmo fundo:
  - **A · próprio:** um desenho de **64 × 96** gerado por código, com **uma camada de menu para cada peça do catálogo** (27). Montado pela mesma receita: as mesmas peças, **a mesma pilha de frente** (ordem e esconder), os mesmos tons-índice e **as mesmas rampas**, então nunca mostra outra coisa que o jogo. A geometria é a do corpo do sprite ampliada 3 vezes (o corpo B continua mais estreito), com detalhe próprio: olhos com brilho, nariz e boca, sobrancelhas de 2 a 3 pixels, mãos, gola em V, barra da camiseta, cós e solado, cabelo repartido, cachos um a um, aba e fita do chapéu, dobra do capuz. Respira em 4 quadros (0, 1, 2 e 1 pixel), mais suave que o jogo.
  - **B · sprite ×3:** o quadro parado de frente do jogo ampliado por inteiro (×3), com a sombra do jogo. Nada a desenhar.
  - **Ampliação** de 1× a 4× (começa na maior em que os dois cabem lado a lado) e, embaixo, quantas cores cada um usa e quanto a montagem levou.
- **Trocar a receita na criação reflete no jogo e no menu sem recarregar:** a aba guarda dois `Montador` da parte 2 (o do sprite e o do boneco); trocar peça remonta os dois, trocar só cores só repinta.

## O que tem (parte 3)

A página abre na aba **Criação**; a aba **Bancada** é o visualizador das partes 1 e 2. As duas guardam receitas separadas no aparelho, e um botão leva a receita de uma para a outra.

- **As escolhas da seção 6**, todas geradas por código nas camadas e rampas da parte 2:

| Escolha | Opções |
| --- | --- |
| Corpo | Corpo A e corpo B (ombros e cintura mais estreitos, o mesmo quadril), sem rótulo de gênero |
| Pele | 8 rampas |
| Olhos | 4 formas (redondos, finos, grandes, pálpebra pesada) em 8 cores |
| Sobrancelhas | 3 formas (retas, grossas, arqueadas), na cor do cabelo |
| Cabelo | 8 estilos (curto, comprido, rente, arrepiado, rabo de cavalo, coque, cacheado, careca) em 10 cores |
| Barba | Nenhuma, curta, bigode, cheia (na cor do cabelo) |
| Marcas | Nenhuma, sardas, cicatriz, pintura no rosto (na cor dos olhos) |
| Roupa da Terra | Sempre: camiseta, calça e tênis; só as cores se escolhem (10, 10 e 3) |

- **Corpo B:** o tronco perde um pixel de cada lado de frente e de costas (um nas costas de lado) e os ombros vêm junto; cabeça, quadril, mãos e pés ficam no mesmo lugar, então os pontos e a arma não mudam. **A roupa e o cabelo seguem o corpo:** cada peça se desenha sobre a geometria do corpo da receita.
- **Linhagem de exemplo, lobo de Mykol:** orelhas e olhos de lobo na camada 6 (linhagem) e cauda na camada 2 (atrás do corpo; de costas, na frente). Os **olhos de lobo escondem os olhos escolhidos** (qualquer forma, a cor continua a da receita), não as sobrancelhas. O cabelo, que fica acima da linhagem, cobre a base das orelhas; **careca, elas aparecem inteiras**; o capuz as esconde, o chapéu não. A linhagem não se escolhe na criação (o jogo dá): fica num grupo à parte, com a explicação, e o sorteio não mexe nela.
- **Prévia grande** (8 pixels de tela por pixel) **girando** pelas 4 direções e **animando** (parado, andar, cortar com a espada de teste, dano), e as 4 direções **no tamanho do jogo** (2 pixels de tela por pixel) ao lado. Tocar na prévia vira o personagem e para o giro.
- **Feita para o polegar, no celular em pé:** a prévia, o botão **Sortear** e as abas dos grupos (Corpo, Rosto, Cabelo, Roupa, Linhagem) ficam presos no topo; as opções rolam embaixo, em blocos grandes. Cada opção de peça é uma **miniatura do próprio personagem** com aquela opção (troque a cor do cabelo e as miniaturas de cabelo mudam junto); cada cor é uma bolinha com os tons da rampa.
- **Sortear:** sorteia todas as escolhas (barba e marcas saem em 40% das vezes), mantendo a linhagem.
- **Receita em JSON** sempre à vista, com quantas cores a folha usa, se foi montada ou só repintada e quanto tempo levou; copiar, baixar ou **abrir na bancada** (para ver camada por camada, pôr um chapéu ou um capuz).

## O que tem (parte 2)

- **As 15 camadas da seção 3**, na ordem da tabela, com a troca por direção: **de costas**, o que fica atrás do corpo (capa, cauda) passa para o lugar 14, o que ia na frente (escudo) passa para o lugar 2 e o cabelo comprido cai sobre as costas, logo antes do cabelo da frente. A sombra continua desenhada pela montagem, fora da folha.
- **Peças de exemplo geradas por código** (na parte 3 viraram o catálogo completo da criação), desenhadas sobre as mesmas poses do molde e com o mesmo sombreado e contorno do manequim: corpo A (pele e roupa de baixo), olhos, sobrancelhas (na cor do cabelo), sardas, cabelo curto, cabelo comprido e careca, barba curta, **roupa da Terra** (camiseta, calça e tênis), **lobo de Mykol** (orelhas e cauda) e, para provar o esconder, um **chapéu de palha** e um **capuz de viagem** na camada da cabeça. Uma peça tem uma ou mais **partes**, cada uma numa camada (o cabelo comprido tem topo e franja na camada 11 e a parte de trás na 3; o lobo tem orelhas na 6 e cauda na 2).
- **Paleta-mestra** com 46 rampas de 4 tons (contorno, sombra, base, luz) em 7 famílias: 8 de pele, 8 de olhos, 10 de cabelo, 10 de tecido (servem aos dois canais de tecido), 3 de couro, 5 de metal e 2 de Etéris. A matiz anda como no pixel art: a sombra e o contorno puxam para o violeta, a luz para o amarelo; o contorno nunca é preto.
- **Pintura por rampa:** cada pixel de cada camada guarda (canal, tom). Na montagem cada canal recebe uma rampa e a folha é pintada; **trocar uma rampa só repinta a folha já composta**, sem redesenhar nenhuma camada.
- **Regras de esconder:** cada peça diz que partes de outras peças esconde. O chapéu esconde só o topo do cabelo (a franja, as costeletas e a nuca continuam); o capuz esconde todo o cabelo e as orelhas de lobo, mas não a barba; a roupa esconde a roupa de baixo. Uma peça desligada não esconde nada.
- **Receita em JSON** no formato da seção 5, montada uma vez numa folha fora da tela e guardada: a mesma receita (mesmo escrita em outra ordem) volta do cache; trocar rampas só repinta; trocar peças, ligar ou desligar camadas ou mudar o contorno refaz a composição. O visualizador mostra quanto tempo cada etapa levou, se veio do cache e quantas cores a folha usa.
- **Visualizador:** tudo da parte 1 (direções, animações, pontos, tamanho do jogo, folha inteira), agora com o personagem montado; uma lista das 15 camadas para ligar e desligar (com as peças de cada uma e o que está escondido), escolha das peças de exemplo, uma rampa por canal com a amostra dos 4 tons e o **JSON da receita**, editável, com os erros explicados. A receita e as camadas ficam guardadas no aparelho.
- **Baixar:** a folha montada (PNG) e a receita (JSON), além do molde e dos pontos da parte 1.

### Receita

```json
{
  "corpo": "corpo-a",
  "pele": "pele-4",
  "olhos": { "forma": "olhos-1", "cor": "castanho" },
  "sobrancelhas": "sobrancelhas-1",
  "cabelo": { "estilo": "cabelo-curto", "cor": "castanho-2" },
  "barba": null,
  "marcas": null,
  "linhagem": null,
  "roupa": "roupa-da-terra",
  "equipamento": {},
  "rampas": { "tecido-principal": "azul-gasto", "tecido-secundario": "jeans", "couro": "lona-clara" }
}
```

- Pele, olhos e cabelo dizem a rampa no próprio campo; os outros canais (tecidos, couro, metal, Etéris) vão em `rampas`, e o que faltar usa a rampa padrão do canal.
- Campos opcionais que faltam viram `null`. Chave, peça ou rampa desconhecida é erro, com as opções que existem. `equipamento` só aceita `cabeca` por enquanto; os outros slots dizem que são do Lab 06.

## O que tem (parte 1)

- **Manequim gerado por código**, o corpo base do molde: corpo de **16 × 24** num quadro de 32 × 32, **contorno colorido** (o tom mais escuro da rampa de cada parte, nunca preto), **contorno seletivo** um tom mais claro do lado da luz, **rampas de 4 tons** (contorno, sombra, base, luz) para pele e tecido, **luz do alto à esquerda**, linhas internas onde um braço ou a cabeça passam por cima do corpo e o braço e a perna do lado de longe um tom mais escuros quando visto de lado. Desenhado em **tons-índice** (cada pixel é um tom de um canal).
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

## Formato

- Quadros de **32 × 32**, âncora nos pés em **(16, 28)**, corpo de 16 × 24 de (8, 4) a (23, 27) parado de frente. Igual ao Lab 04.
- **Uma animação por linha**, na ordem da tabela acima, cada uma em baixo, cima e lado (morrer, uma linha só). A folha tem **192 × 608 px** (6 quadros na linha mais longa, 19 linhas). Famílias de golpe novas entram como linhas novas depois das que já existem. **Toda camada segue esta mesma folha.**
- **Coordenadas dos pontos em cantos de pixel**, como a âncora: (16, 28) é a linha entre os pixels 15 e 16, logo abaixo do pé. A mão é o 2 × 2 de pixels em volta do ponto da mão.
- **Orientações da arma:** 16, no sentido horário da tela; 0 = direita, 4 = baixo, 8 = esquerda, 12 = cima.
- **Espelhar para a esquerda:** a imagem é virada na horizontal, x vira 32 − x e a orientação vira 8 − o (módulo 16). Frente ou atrás não muda.
- **Tons-índice:** 8 canais (pele, olhos, cabelo, tecido principal, tecido secundário, couro, metal, Etéris) de 4 tons cada; o tom 0 é o contorno daquela parte. Cada pixel guarda o código `1 + canal × 4 + tom` (0 = transparente), que cabe em 1 byte e não depende das cores. A roupa de baixo do manequim usa o tecido secundário.
- **Cores por sprite:** até 15 mais a transparente (direção de arte). Cada peça usa só os tons de que precisa para caber: pele 4, olhos 1, cabelo 3 (sem o tom de luz), camiseta 3, calça 2, tênis 2 = **15** na receita padrão.

## Ajustes

Mostrar os pontos, espada de teste na mão, sombra no chão, contorno mais leve do lado da luz (contorno seletivo), linhas internas e o fundo (grama, terra, escuro ou xadrez). Os dois ajustes de contorno valem para todas as camadas e refazem a folha montada, para comparar. Ficam na bancada; o fundo e os dois ajustes de contorno valem também para a criação e para o jogo (a sombra também vale no jogo e nos dois bonecos do menu).

## O que observar

Parte 4:

1. **Qual boneco do menu vale o custo?** Compare A e B em vários personagens (Sortear na criação e volte), na ampliação 2× do celular. A lê melhor o rosto (olhos, barba, marcas) e o cabelo; B é igual ao jogo e não custa nada. O custo de A é uma camada de menu por item, de frente, em 4 quadros: hoje 27, e cada equipamento do Lab 06 traria mais uma.
2. A parece **o mesmo personagem** do jogo (mesmas cores, mesma proporção), ou outro boneco?
3. O personagem montado **anda e corta bem na arena**, no tamanho do jogo? O corte de ida e de volta alternando lê como um combo?
4. A **esquiva** do Lab 04 com o desenho do dash fica aceitável até o dash de verdade (Lab 08)?
5. Os **controles dentro da arena** (joystick e botões num quadro, não na tela cheia) funcionam bem no polegar, com o boneco do menu em cima?
6. Trocar a receita na criação e voltar ao jogo é rápido o bastante?

Parte 3:

7. **No tamanho do jogo**, dá para ler cada opção? Olhos, sobrancelhas e marcas mudam 1 a 3 pixels; veja se a diferença aparece nas 4 figurinhas pequenas, não só na prévia grande.
8. O **corpo B** se distingue do A o bastante (2 pixels a menos nos ombros), ou precisa de mais diferença (cabeça, altura, quadril)?
9. Os **8 cabelos** ficam bons nas 4 direções? O rabo de cavalo e o coque de costas, o cacheado de lado, o arrepiado com as pontas.
10. O **lobo de Mykol** convence: as orelhas saindo do cabelo e inteiras na careca, os olhos de lobo no lugar dos olhos, a cauda balançando atrás (e na frente de costas)?
11. A tela é boa **para o polegar**? A prévia presa no topo deixa espaço suficiente para as opções? Os blocos têm o tamanho certo? Tocar na prévia para virar é fácil de descobrir?
12. O **sorteio** dá personagens variados e bonitos? Barba e marcas em 40% fica bom?
13. A **pintura no rosto na cor dos olhos** (para não gastar cor) funciona, ou a pintura pede uma cor própria?
14. Abrir as abas de grupo e trocar opções é rápido no celular? (A primeira vez que um grupo abre, as peças dele são desenhadas.)

Parte 2:

15. A **pilha** fica certa em todas as direções e animações? Olhe de costas (a cauda e o cabelo comprido sobre as costas) e cortando (a mão na frente da camiseta e da calça).
16. As peças geradas por código servem de **molde** para a arte definitiva? O cabelo e o chapéu cabem no quadro (o topo do chapéu e as orelhas encostam na borda de cima)?
17. **Trocar rampas** dá variedade suficiente? Pele, cabelo, olhos e roupa em várias combinações, na grama e na terra.
18. O **cabelo sem o tom de luz** (para caber em 15 cores) fica bom, ou vale a pena trocar a luz do cabelo por outra coisa?
19. **Esconder** convence: o chapéu deixando a franja e a nuca, o capuz tirando o cabelo e as orelhas, a roupa tirando a roupa de baixo?
20. A **montagem** é rápida o bastante no celular? Veja os tempos embaixo do visualizador: trocar rampa só repinta; trocar peça recompõe.

Parte 1:

21. O manequim está bom o bastante como **molde** para desenhar camadas por cima? O corpo de 16 × 24 tem espaço para cabelo volumoso e capa dentro do quadro?
22. Dá para ler a direção e a ação no **tamanho do jogo**, sem ampliar?
23. O **contorno seletivo** e as **linhas internas** ajudam ou sujam o pixel? Compare ligando e desligando, na grama e na terra.
24. Os **pontos** caem onde deveriam em todos os quadros? A espada de teste sai da mão e muda de frente para trás nos quadros certos?
25. A **esquerda espelhada** fica aceitável (a mão da arma troca de lado)?
26. Andar com 6 quadros e parado com 4 ficam mais vivos que os 4 e 2 do Lab 04?

## Verificado até agora

- Testes automáticos (`npm test`), parte 3: as opções da seção 6 (2 corpos, 8 peles, 4 olhos em 8 cores, 3 sobrancelhas, 8 cabelos com careca em 10 cores, nenhuma e 3 barbas, nenhuma e 3 marcas); toda opção escreve o campo certo e a receita valida; **todas as 6 144 combinações de peça** (com as cores de cada opção espalhadas entre elas) geram receita válida, com a roupa da Terra e sem equipamento, e voltam iguais pelo JSON (mesma receita e mesmo texto); nenhuma combinação passa de 15 cores; cada opção de peça dá um quadro diferente das outras do mesmo slot (de frente e de lado); o quadro avulso das miniaturas é igual ao quadro da folha montada; o sorteio dá receitas válidas, mantém a linhagem, veste a roupa da Terra e consegue tirar toda opção; linhagem: orelhas e olhos de lobo na camada 6 e cauda na 2, na ordem certa da pilha; os olhos de lobo escondem os olhos de qualquer forma e não as sobrancelhas; com cada um dos 8 cabelos, nas 3 direções, as orelhas aparecem (pelo menos um terço), o cabelo cobre a base e, careca, aparecem inteiras; o capuz esconde as orelhas e o chapéu não; corpo B mais estreito com o mesmo quadril, cabeça e mãos; a roupa segue o corpo B e cobre a roupa de baixo dele; sem pele aparecendo pela camiseta no corpo B.
- Testes automáticos, parte 2: as 15 camadas na ordem da seção 3; a ordem de costas (atrás e na frente trocados, cabelo comprido antes do cabelo da frente); a pilha sempre na ordem da direção; peça de exemplo em cada camada de que a criação precisa; na folha montada, olhos sobre o rosto, cabelo sobre a cabeça, cabelo comprido atrás do corpo de frente e sobre a camiseta de costas, cauda atrás de lado e na frente da calça de costas; camadas desligadas fora da folha; cada parte escondida existe e fica numa camada mais funda que a parte mais alta de quem esconde; capuz e chapéu escondem o que devem; a roupa cobre cada pixel da roupa de baixo em todos os quadros; peça desligada não esconde; nada escondido vaza para a folha; códigos de tom únicos e de 1 byte; rampas de 4 tons do escuro ao claro, sem preto; 8, 8 e 10 rampas de pele, olhos e cabelo; paleta pintada pela rampa escolhida e trocar uma rampa muda só aquele canal; receita padrão em até 15 cores; cada peça só pinta os canais que declara; ida e volta da receita pelo JSON (mesma receita e mesmo texto); erros de chave, peça, rampa e slot do Lab 06; trocar rampa não muda a chave da forma; cache: a mesma receita (mesmo em outra ordem) não refaz nada, trocar rampa só repinta a mesma folha, trocar peça, camada ou contorno recompõe.
- Os testes da parte 1 continuam passando (o manequim agora sai do mesmo motor das outras peças).
- No navegador do computador, em tamanho de celular (375 × 812): a receita padrão montada em 15 cores; trocar cabelo, linhagem e chapéu recompõe; trocar a cor do cabelo veio com "composição: do cache" e só a pintura (cerca de 10 ms); de costas, cauda e cabelo comprido por cima; JSON com erros mostra as mensagens e não muda nada, JSON válido (capuz, barba, sardas, pele 7) monta; "Só o corpo" deixa só corpo e roupa de baixo; a receita e as camadas voltam depois de recarregar; sem rolagem para os lados. A primeira montagem levou cerca de 85 ms (gera as folhas de cada peça uma vez); as seguintes, 12 a 40 ms.
- No navegador do computador, em tamanho de celular (375 × 812), parte 3: a página abre na criação; a prévia gira pelas 4 direções andando, cortando (com a espada) e levando dano; a barra, a prévia, o Sortear e as abas ficam presos no topo e as opções rolam embaixo; trocar de grupo leva o começo dele para baixo da prévia; as miniaturas mostram o próprio personagem e mudam com a cor do cabelo; 70 sorteios seguidos ficaram sempre em 13 a 15 cores e mantiveram o lobo; trocar a cor do cabelo só repintou (cerca de 8 ms); abrir o grupo Cabelo pela primeira vez, 45 ms; a receita da criação volta depois de recarregar; "Abrir na bancada" leva a receita com o lobo para a bancada e "Levar esta receita para a criação" faz o caminho de volta; sem rolagem para os lados.
- Testes automáticos, parte 4: toda peça do catálogo tem camada de menu; cada camada de menu desenha só as partes da peça, em 64 × 96, nos 4 quadros, nos dois corpos; **cada peça usa no menu só os tons-índice que já usa na folha do jogo** (com e sem contorno seletivo) e só os canais que declara; toda parte que aparece de frente no jogo aparece no menu; em 40 sorteios (com e sem o lobo), com chapéu e com capuz: as camadas do boneco na ordem da pilha de frente, sem as partes escondidas; o capuz tira cabelo e orelhas, o chapéu só o topo, o lobo os olhos; **os mesmos canais do sprite parado de frente e nenhum tom fora da folha do jogo** (também em 1 de cada 23 das 6 144 combinações de forma), então nunca mais cores que o sprite (até 15 sem equipamento); as orelhas de lobo saem de todos os 8 cabelos (mais de um terço delas) e inteiras na careca; nada encosta nas bordas do quadro e os pés ficam acima da âncora; respira 0, 1, 2 e 1 pixel com os pés parados; corpo B mais estreito com a mesma cabeça, mãos e pés; o boneco não é o sprite ampliado (mais de 500 pixels diferentes); cada forma de olhos e cada cabelo muda o boneco; a folha do boneco tem os 4 quadros lado a lado; o `Montador` com o compositor do boneco não refaz a mesma receita, só repinta ao trocar a cor do cabelo e recompõe ao trocar o estilo. Na arena: prioridade esquiva > corte > andar > parado, corte alternando ida e volta, esquerda espelhada, corte de 250 ms.
- No navegador do computador, em tamanho de celular (375 × 812), parte 4: a aba Jogo cabe numa tela, com os dois bonecos em 2× lado a lado em cima, a arena embaixo e os botões dentro dela; com o teclado o personagem andou (a câmera seguiu) e cortou com a espada; sortear na criação e voltar remontou o boneco e o sprite (cerca de 37 e 13 ms), e trocar só a cor do cabelo só repintou (1 e 7 ms); 15 cores nos dois na receita padrão; sem erros no console. No computador largo, o menu fica à esquerda e a arena à direita. O toque no joystick e nos botões não foi testado (só o teclado, simulado).
- **Ainda não testado num celular de verdade.**

## Achados

- Peças em camadas separadas perdem a profundidade de dentro do corpo (um braço que passa na frente do tronco ficaria embaixo da camiseta). Resolvido com **máscaras**: a roupa abre buracos onde os braços do corpo passam na frente, e a borda do buraco ganha a linha interna.
- Com 4 tons em todo canal, a receita padrão passava de 15 cores (17). Cada peça agora diz que tons usa; o cabelo ficou sem o tom de luz e os olhos com um tom só.
- A sombra da pele gerada com muita saturação ficava vermelha demais; a rampa agora anda menos na matiz e perde saturação na sombra.
- Um corpo diferente obriga **as peças a saberem o corpo**: a roupa desenhada sobre o corpo A deixava o corpo B com a camiseta larga demais. As peças agora recebem o tipo de corpo da receita ao se desenhar, e as folhas de cada peça ficam guardadas por tipo de corpo.
- A linhagem tem partes em camadas diferentes (a cauda na 2, as orelhas na 6), então a regra da parte 2 ("só esconde o que fica embaixo da camada mais funda de quem esconde") não deixava os olhos de lobo esconderem os olhos. A regra virou "embaixo da **parte mais alta** de quem esconde".
- Para caber em 15 cores com qualquer combinação, as marcas e as formas de olhos não ganham canal novo: a cicatriz e a pálpebra usam tons da pele, o branco dos olhos grandes é a luz da pele e a pintura no rosto usa a cor dos olhos. O pior caso dá 15 cores; careca dá 13.
- **Boneco do menu (parte 4):** a camada de menu só tem cara de desenho próprio quando cada peça ganha detalhe que o sprite não tem; só ampliar a geometria do sprite e sombrear de novo dá um boneco liso. E o detalhe tem que caber nos tons que a peça já usa no jogo (os olhos têm um tom só, então o brilho é um furo por onde aparece a pele). O sombreado redondo do motor, numa área grande como a camiseta, vira uma diagonal em escada.
- O teclado dos Labs 01 a 04 escuta a janela inteira e bloqueava as teclas de movimento em qualquer lugar da página (inclusive na caixa da receita em JSON). Agora a fonte de teclado ignora caixas de texto e pode ser desligada fora da aba do jogo.
- Na página que rola, o `body` com `overflow: auto` virava o elemento que rola, e a barra do topo (`position: sticky`) não ficava presa desde a parte 1. Agora quem rola é a página.

## Conclusão pendente

Partes 1 a 4 de 6. As partes 5 e 6 vêm depois, cada uma numa sessão própria; a conclusão do lab sai quando todas estiverem prontas e aprovadas.

## Para as próximas partes (código)

| Módulo | O que tem | Quem estende |
| --- | --- | --- |
| `molde.ts` | Formato da folha (`MOLDE_FORMAT`), ações, direções e espelhamento; canais e códigos de tom (`toneCode`, `decodeTone`); **paleta-mestra** (`MASTER_RAMPS`, `rampsFor`, `DEFAULT_RAMPS`, `paletteForRamps`) | Rampas novas quando uma linhagem trocar a cor (a pele pálida de Selene); Lab 07 (linhas de novas famílias de golpe) |
| `poses.ts` | A pose de cada quadro (corpo, mãos, pés, braço na frente ou atrás, orientação da arma) | Lab 07 (poses de estocar, golpe pesado, arco, arremesso, conjurar) |
| `pontos.ts` | Pontos por quadro, espelhamento, orientações, JSON. O corpo B não muda os pontos (mãos, cabeça e pés no mesmo lugar) | Partes 4 a 6 e Labs 06 a 08 (só importam) |
| `raster.ts` | Imagem indexada e mapa de partes, sem canvas (testável) | Parte 6 (quantizar folhas de fora para tons-índice) |
| `manequim.ts` | O motor de desenho (o contorno seletivo vale em qualquer tamanho de desenho, inclusive o boneco do menu): geometria do corpo por pose e tipo de corpo (`bodyGeometry(pose, silhueta)`, `Silhueta` `'a' \| 'b'`, `ManequimOptions.silhueta`), `PartBuilder` + `renderParts` (sombreado, contorno colorido e seletivo, linhas internas, máscaras, tons por parte), olhos; o manequim | Lab 06 (peças de equipamento sobre a geometria do corpo) |
| `camadas.ts` | As 15 camadas, a ordem por direção, o tipo `Peca` (com `silhueta` nas peças de corpo), as regras de esconder (só o que fica embaixo da parte mais alta de quem esconde) e a pilha | Lab 06 (slots de equipamento) |
| `pecas.ts` | O catálogo: corpos A e B, 4 olhos, 3 sobrancelhas, 3 marcas, 8 cabelos (kit `cabelo()`/`HairKit`), 3 barbas, roupa da Terra, lobo de Mykol, chapéu e capuz; `pecasDoSlot`; as folhas de cada peça, geradas uma vez por tipo de corpo e contorno | Lab 06 (equipamentos); parte 6 (peças vindas de folhas de fora); novas linhagens |
| `receita.ts` | A receita: tipo, padrão, ler e validar JSON, escrever, peças, rampas e chaves de forma e pintura | Parte 5 (receitas sorteadas) |
| `criacao.ts` | As escolhas da criação (`ESCOLHAS`: opções, ler e escrever cada campo, grupos), `escolher`, `receitaDeCriacao` (roupa da Terra, sem equipamento), `sortear(receita, random)` e `combinacoesDeForma`; sem DOM | **Parte 5** (NPCs sorteados: `sortear` com um `random` próprio, e outras regras por tipo de NPC); parte 4 (o personagem do jogador vem daqui) |
| `compor.ts` | `comporFolha` (a pilha numa folha, com o corpo da receita), `opcoesDoCorpo`, `comporQuadro` (um quadro só, para miniaturas), `Montador` (montagem com cache e tempos; o terceiro argumento troca o compositor, como o do boneco do menu), contagem de cores e `drawCharacter` (sombra, arma atrás, corpo, arma na frente) | **Parte 5** (muitos NPCs: um `Montador` por receita, `drawCharacter` na arena), Lab 07 (armas de verdade) |
| `menu.ts` | O boneco do menu de 64 × 96: `MENU_FORMAT`, `menuGeometry` (o corpo do sprite ×3 com a respiração), as camadas de menu por peça (`MENU_DESENHOS`), `desenhoDeMenu` (guardado por peça, corpo e contorno), `camadasDoBoneco` (a pilha de frente), `comporBoneco`, `comporFolhaDoBoneco` (para o `Montador`), `ampliarQuadro` e `ampliarParte` (o sprite ×3; uma peça sem camada de menu cai nele); sem canvas | Lab 06 (uma camada de menu por equipamento, se o boneco próprio for aprovado; senão, o menu usa `ampliarQuadro`); parte 6 (folhas de fora sem camada de menu caem no ampliado) |
| `jogo.ts` | A animação do personagem na arena (`acaoNaArena`, `clipNaArena`: esquiva > corte > andar > parado, corte alternando ida e volta) e `DURACAO_DO_CORTE`; sem DOM | **Parte 5** (NPCs andando pela arena), Lab 08 (o dash de verdade troca a esquiva) |
| `tela-jogo.ts` | A aba Jogo (`TelaDeJogo`): arena com movimento, câmera e controles do Lab 04, o personagem desenhado por `drawCharacter` com a espada e o rastro da esquiva, e os dois bonecos do menu lado a lado com ampliação | **Parte 5** (pôr os NPCs nesta arena) |
| `tela-criacao.ts` | A tela de criação (`TelaDeCriacao`): prévia girando e animando, tamanho do jogo, abas de grupo, opções com miniaturas, sortear, JSON; `onChange` leva a receita ao jogo | Parte 5 (se for útil, sortear NPCs pela mesma tela) |
| `arma-teste.ts` | Espada de 16 orientações gerada uma vez | Trocada pelas folhas de arma do Lab 07 |
| `pintura.ts` | Pinta imagem indexada com uma paleta, baixa PNG | Parte 6 |
| `viewer.ts` | Visualizador (`MoldeViewer`), cores de fundo (`BACKGROUNDS`) e painel da pilha (`PilhaPanel`: camadas, peças, rampas, JSON, `definirReceita`) | **Parte 6** (baixar o molde por camada, carregar folhas de fora na bancada) |
| `main.ts` | As três abas (criação, jogo e bancada), as receitas guardadas no aparelho, a receita da criação levada ao jogo a cada troca, e os ajustes | Parte 5 (NPCs), parte 6 (importar na bancada) |

Reaproveitado do Lab 04: `animation.ts` (formato de folha, quadros por tempo, quadros ativos, `Animator`, `directionOf`), `sliceClips` e os auxiliares do visualizador; dos Labs 01 e 02 o movimento (`stepPlayer`), o mundo e a colisão, o renderizador em pixels, a câmera, o cenário gerado e os controles (`Controls`, que agora aceita desligar o teclado fora da aba do jogo), os ajustes guardados e o painel.
