# Personagem em camadas — Basilis: O Novo Mundo

Rascunho vivo. Define como o personagem é montado: o molde do corpo (o "esqueleto"), as camadas de personalização, as roupas, os equipamentos e as duas formas de mostrar o personagem (no jogo e no menu). Vale para o jogador e para os NPCs. As armas e os comandos de combate estão em [ARMAS-E-COMANDOS.md](ARMAS-E-COMANDOS.md); os prompts para gerar as folhas, em [PROMPTS-DE-FOLHAS.md](PROMPTS-DE-FOLHAS.md).

## 1. A ideia: um boneco de papel com esqueleto

Como nos MMOs 2D (Tibia, Ragnarok) e nos personagens em camadas de RPGs de GBA, o personagem é uma **pilha de folhas transparentes no mesmo formato**. Cada camada (corpo, olhos, cabelo, camisa, peitoral, capa...) tem os mesmos quadros, na mesma posição, com a mesma âncora. O jogo desenha uma por cima da outra, e o resultado é um personagem só.

O **esqueleto** é o que mantém tudo alinhado. Ele não gira peças (a direção de arte proíbe rotação de sprites, para o pixel não entortar). Ele é o **molde do corpo**: a folha do corpo base mais uma tabela de **pontos por quadro**:

| Ponto | Para quê |
| --- | --- |
| `mao-principal` | Onde a arma fica, com a orientação da arma naquele quadro (uma de 8 ou 16, já desenhadas) e se ela vai na frente ou atrás do corpo |
| `mao-secundaria` | Escudo, adaga da outra mão, tocha, foco de magia, a mão de apoio de armas de duas mãos |
| `cabeca` | Topo da cabeça: referência para chapéus altos, auréolas, marcas de linhagem, balões de fala |
| `costas` | Aljava, mochila, asas, armas guardadas |
| `pes` | A âncora (já existe desde o Lab 04): o ponto que fica sobre a posição no mundo |

Roupas, cabelos e armaduras são desenhados **quadro a quadro sobre o molde**. As armas não: elas são uma folha pequena de orientações e são colocadas pelo ponto da mão. Assim uma arma nova custa poucas imagens, em vez de uma folha inteira de animações.

## 2. Formato

Segue o formato do Lab 04, que já funciona:

- Quadros de **32 × 32** com âncora nos pés em (16, 28). O corpo fica em torno de **16 × 24** (o tamanho da direção de arte), com sobra para cabelo volumoso, capas e o movimento.
- **3 direções desenhadas** (baixo, cima, lado); a esquerda é o lado espelhado. Um detalhe assimétrico (uma cicatriz, uma ombreira só) troca de lado ao espelhar; isso é aceito, como nos jogos de GBA.
- **Uma animação por linha.** Todas as camadas seguem a mesma tabela de linhas.

Animações do molde (o mínimo para o Lab 05; armas e magias acrescentam linhas depois):

| Animação | Quadros | Observação |
| --- | --- | --- |
| Parado | 4 | Respira; mais vivo que os 2 quadros do Lab 04 |
| Andar | 6 | O que a direção de arte pede para personagens principais |
| Dash | 3 | Arranque, deslize, freio (substitui a esquiva) |
| Levar dano | 2 | |
| Morrer | 4 | Uma só, sem direção |
| Ações de arma | 4 a 6 cada | Uma família de poses por tipo de golpe (cortar, estocar, golpe pesado, puxar o arco, arremessar, conjurar). Ver ARMAS-E-COMANDOS |

**O custo de uma camada** é o número total de quadros: cerca de 120 com as ações de arma. Por isso a variedade vem principalmente da **troca de paleta** (seção 4), e não de desenhar cada variante de novo.

## 3. As camadas

Da mais funda para a mais alta, olhando para baixo (frente). Algumas trocam de ordem por direção:

| Ordem | Camada | Grupo | Observação |
| --- | --- | --- | --- |
| 1 | Sombra | — | Elipse no chão |
| 2 | Atrás do corpo | equipamento | Capa (de frente e de lado), aljava, asas, cauda, arma quando está atrás |
| 3 | Cabelo de trás | personalização | Cabelo comprido que cai atrás dos ombros |
| 4 | **Corpo base** | personalização | Pele: cabeça, tronco, braços, pernas |
| 5 | Rosto | personalização | Olhos, sobrancelhas, marcas (sardas, cicatriz, pintura) |
| 6 | Linhagem | personalização | Orelhas de lobo, presas, escamas, chifres: o corpo que muda (seção 6) |
| 7 | Roupa | roupa padrão | Calça, camisa, sapatos |
| 8 | Pernas, pés, mãos | equipamento | Botas, grevas, luvas |
| 9 | Tronco | equipamento | Peitoral, túnica, manto |
| 10 | Ombros e cinto | equipamento | Ombreiras, cinto, bolsas |
| 11 | Cabelo da frente | personalização | Franja e topo |
| 12 | Barba | personalização | |
| 13 | Cabeça | equipamento | Capacete, chapéu, capuz |
| 14 | Na frente do corpo | equipamento | Capa olhando para cima, arma na frente, escudo |
| 15 | Efeitos | — | Brilho de melhoria, marcas de Etéris acesas |

Regras de cobertura: cada peça de equipamento diz o que **esconde**. Um capacete fechado esconde todo o cabelo e a barba; um chapéu esconde só o topo do cabelo; uma armadura completa esconde a camisa. Esconder é melhor do que desenhar cabelo amassado para cada chapéu.

## 4. Cores: desenhar em tons-índice, pintar com paletas

Cada camada é desenhada com **tons-índice**: rampas de 3 a 5 tons por **canal** (pele, cabelo, tecido principal, tecido secundário, metal, couro, Etéris). Na hora de montar, cada canal recebe uma rampa da paleta-mestra:

- 1 cabelo desenhado vira 10 cores de cabelo;
- 1 camisa vira camisas de qualquer cor;
- tons de pele são só rampas;
- uma armadura de ferro vira bronze, aço ou prata trocando a rampa de metal.

Respeita a regra da direção de arte (até 15 cores mais a transparente por sprite) e o contorno colorido: o tom mais escuro de cada rampa é o contorno daquela parte.

## 5. Receita, montagem e NPCs

Um personagem é uma **receita**: a lista das camadas escolhidas e a rampa de cada canal, guardada como dados (JSON). Exemplo:

```json
{
  "corpo": "corpo-a",
  "pele": "pele-4",
  "olhos": { "forma": "olhos-2", "cor": "ambar" },
  "cabelo": { "estilo": "cabelo-curto-3", "cor": "castanho-2" },
  "roupa": "roupa-da-terra",
  "equipamento": { "tronco": "gibao-de-couro", "pes": "botas-de-viagem" },
  "rampas": { "tecido-principal": "azul-gasto", "couro": "couro-claro" }
}
```

A receita é **montada uma vez** numa folha pronta (camadas pintadas e empilhadas num canvas fora da tela) e só refeita quando algo muda: trocar de equipamento, mudar de linhagem, uma melhoria. No jogo, cada personagem desenha **uma** imagem por quadro, por mais camadas que tenha. Isso é o que permite muitos NPCs na tela no celular.

**NPCs usam o mesmo sistema.** Um NPC é uma receita: escrita à mão (Caio, Davi, guias, santos) ou sorteada dentro de regras (moradores de um assentamento, sobreviventes, bandidos). Folhins e criaturas continuam com folhas próprias; os Nefilins e as raças transformadas usam o molde humano com camadas de linhagem.

## 6. Personalização inicial

Na criação o jogador escolhe **só o corpo**, nunca a roupa:

| Escolha | Opções iniciais (sugestão) |
| --- | --- |
| Corpo | 2 tipos de corpo (A e B), sem rótulo de gênero |
| Pele | 8 rampas |
| Olhos | 4 formas, 8 cores |
| Sobrancelhas | 3 formas (seguem a cor do cabelo) |
| Cabelo | 8 estilos (incluindo careca), 10 cores |
| Barba | nenhuma e 3 estilos |
| Marcas | nenhuma, sardas, cicatriz, pintura no rosto |

Todo mundo começa com a **roupa da Terra**: camiseta, calça e tênis gastos, em cores sorteadas ou escolhidas. Combina com a direção de arte (os recém-chegados usam roupas da Terra que vão sendo trocadas por peças de Basilis) e com a história: ninguém escolheu ser levado.

A **linhagem** é personalização que o jogo dá, não que o jogador escolhe na criação: ao virar Marcado ou Transformado (seção 5 de HISTORIA-E-PLANO), entram camadas de linhagem. Exemplos: Mykol dá orelhas, cauda e olhos de lobo; Selene dá pele pálida (troca de rampa), olhos vermelhos e presas. O Lab 05 prova o encaixe com um exemplo.

## 7. No jogo e no menu: duas formas de mostrar

Há duas leituras diferentes do personagem:

| Onde | Como | Custo por item |
| --- | --- | --- |
| **No jogo** | Sprite de 32 × 32 montado pela receita, em 3 direções, animado | A camada inteira (todas as animações) |
| **Menu de equipamento** | Boneco grande de frente (sugestão: 64 × 96), parado e respirando, com os slots em volta | Uma camada de menu por item (1 a 4 quadros) |
| **Inventário** | Ícone de 16 × 16 (ou 24 × 24) | 1 imagem |
| **Diálogo** (depois) | Retrato do busto | Fica para o lab de interface |

O boneco do menu também é montado em camadas, com os mesmos itens e as mesmas rampas, para nunca mostrar algo diferente do que se vê no jogo. A alternativa barata é ampliar o próprio sprite do jogo no menu, como o Tibia faz. O Lab 05 mostra as duas lado a lado para decidir se o boneco próprio vale o custo de arte extra.

## 8. Equipamentos

Ficam **por cima** de tudo isso (Lab 06):

| Slot | Exemplos | Camadas |
| --- | --- | --- |
| Cabeça | capuz, chapéu, elmo | 13 (e esconde cabelo) |
| Rosto | máscara, óculos, venda | 5 a 13 |
| Tronco | túnica, gibão, cota de malha, peitoral | 9 (e às vezes 10) |
| Mãos | luvas, braçadeiras | 8 |
| Pernas | calça, grevas | 8 |
| Pés | botas, sandálias | 8 |
| Costas | capa, manto, mochila | 2 e 14 |
| Mão principal | a arma | pelo ponto `mao-principal` |
| Mão secundária | escudo, adaga, tocha, foco | pelo ponto `mao-secundaria` |
| Acessórios | amuleto, anéis | sem camada, ou um brilho pequeno |

- **Aparência (skins):** cada slot visível pode ter um item de **aparência** que troca só o visual e mantém os atributos do item equipado, como as skins de Free Fire ou o transmog do Warcraft.
- **Melhorias:** um item melhorado muda de rampa (couro, ferro, aço, Etéris) e, nos níveis altos, ganha **brilho** na camada de efeitos, como os +7 e +9 do Mu.
- **Sagrado e profano** seguem a direção de arte: peças sagradas com formas geométricas, simetria e dourado; profanas com formas orgânicas, assimetria e tons fundos.
- Cada item tem: id, slot, camadas que ocupa, o que esconde, canais de cor, ícone, camada de menu e camada de jogo.

## 9. Labs

| Lab | O que prova |
| --- | --- |
| **05 — Personagem em camadas** | O molde com pontos, camadas e troca de paleta, a tela de criação, o boneco do menu ao lado do sprite do jogo, receitas montadas uma vez e NPCs sorteados |
| **06 — Equipamentos** | Slots, o que cada peça esconde, aparência por cima do item, melhorias com brilho, tela de equipamento com ícones |

A arte dos labs é gerada por código, mas já no formato final, para servir de molde para a arte definitiva (à mão ou com IA, ver PROMPTS-DE-FOLHAS).
