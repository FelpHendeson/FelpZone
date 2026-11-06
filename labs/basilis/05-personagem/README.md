# Lab 05 — Personagem em camadas

**Pergunta:** um corpo base com pontos por quadro, camadas de personalização e troca de paleta dá um personagem bonito, variado e barato de desenhar, no jogo e no menu? O desenho está em [PERSONAGEM.md](../../../basilis/docs/PERSONAGEM.md).

O lab é feito em 6 partes, cada uma publicada e conferida antes da seguinte:

| Parte | O que prova | Estado |
| --- | --- | --- |
| **1 — Molde e pontos** | O esqueleto: formato da folha, animações, pontos por quadro e um manequim gerado por código | **Feita** |
| **2 — Camadas e paleta** | Camadas na ordem da seção 3, tons-índice pintados por rampas, regras de esconder, receita em JSON montada uma vez | **Feita** |
| 3 — Criação de personagem | A tela com as opções da seção 6, roupa da Terra, um exemplo de linhagem (lobo de Mykol) | Depois |
| 4 — Jogo e menu | O sprite andando numa arena ao lado do boneco do menu (64 × 96 próprio ou o sprite ampliado) | Depois |
| 5 — NPCs | Receitas sorteadas andando pela arena, um desenho por personagem por quadro | Depois |
| 6 — Importar folha | Baixar o molde de qualquer camada e carregar folhas de fora por camada | Depois |

## O que tem (parte 2)

- **As 15 camadas da seção 3**, na ordem da tabela, com a troca por direção: **de costas**, o que fica atrás do corpo (capa, cauda) passa para o lugar 14, o que ia na frente (escudo) passa para o lugar 2 e o cabelo comprido cai sobre as costas, logo antes do cabelo da frente. A sombra continua desenhada pela montagem, fora da folha.
- **Peças de exemplo geradas por código**, desenhadas sobre as mesmas poses do molde e com o mesmo sombreado e contorno do manequim: corpo A (pele e roupa de baixo), olhos, sobrancelhas (na cor do cabelo), sardas, cabelo curto, cabelo comprido e careca, barba curta, **roupa da Terra** (camiseta, calça e tênis), **lobo de Mykol** (orelhas e cauda) e, para provar o esconder, um **chapéu de palha** e um **capuz de viagem** na camada da cabeça. Uma peça tem uma ou mais **partes**, cada uma numa camada (o cabelo comprido tem topo e franja na camada 11 e a parte de trás na 3; o lobo tem orelhas na 6 e cauda na 2).
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

Mostrar os pontos, espada de teste na mão, sombra no chão, contorno mais leve do lado da luz (contorno seletivo), linhas internas e o fundo (grama, terra, escuro ou xadrez). Os dois ajustes de contorno valem para todas as camadas e refazem a folha montada, para comparar.

## O que observar

Parte 2:

1. A **pilha** fica certa em todas as direções e animações? Olhe de costas (a cauda e o cabelo comprido sobre as costas) e cortando (a mão na frente da camiseta e da calça).
2. As peças geradas por código servem de **molde** para a arte definitiva? O cabelo e o chapéu cabem no quadro (o topo do chapéu e as orelhas encostam na borda de cima)?
3. **Trocar rampas** dá variedade suficiente? Pele, cabelo, olhos e roupa em várias combinações, na grama e na terra.
4. O **cabelo sem o tom de luz** (para caber em 15 cores) fica bom, ou vale a pena trocar a luz do cabelo por outra coisa?
5. **Esconder** convence: o chapéu deixando a franja e a nuca, o capuz tirando o cabelo e as orelhas, a roupa tirando a roupa de baixo?
6. A **montagem** é rápida o bastante no celular? Veja os tempos embaixo do visualizador: trocar rampa só repinta; trocar peça recompõe.

Parte 1:

7. O manequim está bom o bastante como **molde** para desenhar camadas por cima? O corpo de 16 × 24 tem espaço para cabelo volumoso e capa dentro do quadro?
8. Dá para ler a direção e a ação no **tamanho do jogo**, sem ampliar?
9. O **contorno seletivo** e as **linhas internas** ajudam ou sujam o pixel? Compare ligando e desligando, na grama e na terra.
10. Os **pontos** caem onde deveriam em todos os quadros? A espada de teste sai da mão e muda de frente para trás nos quadros certos?
11. A **esquerda espelhada** fica aceitável (a mão da arma troca de lado)?
12. Andar com 6 quadros e parado com 4 ficam mais vivos que os 4 e 2 do Lab 04?

## Verificado até agora

- Testes automáticos (`npm test`), parte 2: as 15 camadas na ordem da seção 3; a ordem de costas (atrás e na frente trocados, cabelo comprido antes do cabelo da frente); a pilha sempre na ordem da direção; peça de exemplo em cada camada de que a criação precisa; na folha montada, olhos sobre o rosto, cabelo sobre a cabeça, cabelo comprido atrás do corpo de frente e sobre a camiseta de costas, cauda atrás de lado e na frente da calça de costas; camadas desligadas fora da folha; cada parte escondida existe e fica numa camada mais funda que quem esconde; capuz e chapéu escondem o que devem; a roupa cobre cada pixel da roupa de baixo em todos os quadros; peça desligada não esconde; nada escondido vaza para a folha; códigos de tom únicos e de 1 byte; rampas de 4 tons do escuro ao claro, sem preto; 8, 8 e 10 rampas de pele, olhos e cabelo; paleta pintada pela rampa escolhida e trocar uma rampa muda só aquele canal; receita padrão em até 15 cores; cada peça só pinta os canais que declara; ida e volta da receita pelo JSON (mesma receita e mesmo texto); erros de chave, peça, rampa e slot do Lab 06; trocar rampa não muda a chave da forma; cache: a mesma receita (mesmo em outra ordem) não refaz nada, trocar rampa só repinta a mesma folha, trocar peça, camada ou contorno recompõe.
- Os testes da parte 1 continuam passando (o manequim agora sai do mesmo motor das outras peças).
- No navegador do computador, em tamanho de celular (375 × 812): a receita padrão montada em 15 cores; trocar cabelo, linhagem e chapéu recompõe; trocar a cor do cabelo veio com "composição: do cache" e só a pintura (cerca de 10 ms); de costas, cauda e cabelo comprido por cima; JSON com erros mostra as mensagens e não muda nada, JSON válido (capuz, barba, sardas, pele 7) monta; "Só o corpo" deixa só corpo e roupa de baixo; a receita e as camadas voltam depois de recarregar; sem rolagem para os lados. A primeira montagem levou cerca de 85 ms (gera as folhas de cada peça uma vez); as seguintes, 12 a 40 ms.
- **Ainda não testado num celular de verdade.**

## Achados

- Peças em camadas separadas perdem a profundidade de dentro do corpo (um braço que passa na frente do tronco ficaria embaixo da camiseta). Resolvido com **máscaras**: a roupa abre buracos onde os braços do corpo passam na frente, e a borda do buraco ganha a linha interna.
- Com 4 tons em todo canal, a receita padrão passava de 15 cores (17). Cada peça agora diz que tons usa; o cabelo ficou sem o tom de luz e os olhos com um tom só.
- A sombra da pele gerada com muita saturação ficava vermelha demais; a rampa agora anda menos na matiz e perde saturação na sombra.

## Conclusão pendente

Partes 1 e 2 de 6. As partes 3 a 6 vêm depois, cada uma numa sessão própria; a conclusão do lab sai quando todas estiverem prontas e aprovadas.

## Para as próximas partes (código)

| Módulo | O que tem | Quem estende |
| --- | --- | --- |
| `molde.ts` | Formato da folha (`MOLDE_FORMAT`), ações, direções e espelhamento; canais e códigos de tom (`toneCode`, `decodeTone`); **paleta-mestra** (`MASTER_RAMPS`, `rampsFor`, `DEFAULT_RAMPS`, `paletteForRamps`) | Parte 3 (rampas novas, como a pele pálida de Selene); Lab 07 (linhas de novas famílias de golpe) |
| `poses.ts` | A pose de cada quadro (corpo, mãos, pés, braço na frente ou atrás, orientação da arma) | Lab 07 (poses de estocar, golpe pesado, arco, arremesso, conjurar) |
| `pontos.ts` | Pontos por quadro, espelhamento, orientações, JSON | Partes 3 a 6 e Labs 06 a 08 (só importam) |
| `raster.ts` | Imagem indexada e mapa de partes, sem canvas (testável) | Parte 6 (quantizar folhas de fora para tons-índice) |
| `manequim.ts` | O motor de desenho: geometria do corpo por pose (`bodyGeometry`), `PartBuilder` + `renderParts` (sombreado, contorno colorido e seletivo, linhas internas, máscaras, tons por parte), olhos; o manequim | Parte 3 (corpo B), qualquer peça nova |
| `camadas.ts` | As 15 camadas, a ordem por direção, o tipo `Peca`, as regras de esconder e a pilha | Lab 06 (slots de equipamento) |
| `pecas.ts` | O catálogo de peças de exemplo e as folhas de cada peça (geradas uma vez) | Parte 3 (formas de olhos, sobrancelhas, 8 cabelos, barbas, marcas, corpo B, linhagens); Lab 06 (equipamentos); parte 6 (peças vindas de folhas de fora) |
| `receita.ts` | A receita: tipo, padrão, ler e validar JSON, escrever, peças, rampas e chaves de forma e pintura | Parte 3 (a tela de criação escreve receitas); parte 5 (receitas sorteadas) |
| `compor.ts` | `comporFolha` (a pilha numa folha), `Montador` (montagem com cache e tempos), contagem de cores e `drawCharacter` (sombra, arma atrás, corpo, arma na frente) | Parte 4 (arena e menu), parte 5 (muitos NPCs: um `Montador` por receita), Lab 07 (armas de verdade) |
| `arma-teste.ts` | Espada de 16 orientações gerada uma vez | Trocada pelas folhas de arma do Lab 07 |
| `pintura.ts` | Pinta imagem indexada com uma paleta, baixa PNG | Parte 6 |
| `viewer.ts` | Visualizador (`MoldeViewer`) e painel da pilha (`PilhaPanel`: camadas, peças, rampas, JSON) | Parte 3 (a tela de criação pode reaproveitar as rampas e a receita), parte 6 (baixar o molde por camada) |

Reaproveitado do Lab 04: `animation.ts` (formato de folha, quadros por tempo, quadros ativos), `sliceClips` e os auxiliares do visualizador; do Lab 01 os ajustes guardados e o painel.
