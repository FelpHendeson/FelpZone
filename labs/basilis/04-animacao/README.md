# Lab 04 — Animação

**Pergunta:** um sistema de animação por estados (parado, andar, atacar, levar dano, esquivar, morrer) deixa o herói e os inimigos legíveis em pixel art, com o golpe acertando no quadro certo? E qual formato de folha a arte definitiva precisa seguir?

## O que tem

- **A arena do Lab 03**, com o mesmo combate, agora animada.
- **Herói em quadros de 32 × 32** (corpo de 16 × 24 com espaço para a espada), em 3 direções desenhadas (baixo, cima, lado; a esquerda é o lado espelhado):

| Animação | Quadros | Velocidade | Repete |
| --- | --- | --- | --- |
| Parado (respira) | 2 | 2,5 q/s | sim |
| Andar | 4 | 8 q/s (mais rápido quando corre) | sim |
| Atacar: prepara, corta, acerta, volta | 4 | 16 q/s (250 ms) | não |
| Levar dano | 2 | 10 q/s | não |
| Esquivar (agacha e rola) | 3 | 16 q/s | não |
| Morrer (uma só, sem direção) | 4 | 6 q/s | não |

- **Espada desenhada no ataque:** sai de trás do corpo quando está erguida ou de costas, e passa à frente no corte.
- **Folhim em 16 × 16:** parado, andar (pulinhos), aviso (encolhe e franze), bote (estica), dano e morte (se desfaz em folhas). Vira para o lado em que anda.
- **Prioridade dos estados:** morrer > levar dano > esquivar > atacar > andar > parado. Um golpe novo sempre recomeça a animação de ataque.
- **Golpe sincronizado com a animação:** o acerto só vale nos **quadros ativos** (corta e acerta, 2º e 3º quadros). Nos ajustes dá para voltar ao acerto por tempo do Lab 03 e comparar.
- **Piscar branco ao levar dano** feito sobre qualquer quadro (silhueta gerada na hora), então funciona com qualquer folha.
- **Visualizador (botão Animações):** escolhe personagem e animação, velocidade de ×0,25 a ×2, pausa e avança quadro a quadro, mostra a âncora (os pés) e a folha inteira com o quadro atual marcado.
- **Baixar e carregar folhas:** a folha gerada pode ser baixada como PNG, servindo de **molde** para quem for desenhar (à mão ou com IA). Uma folha no mesmo formato pode ser carregada e entra no jogo na hora. A folha carregada fica só no aparelho e some ao recarregar.

## Formato das folhas de personagem

- Quadros de tamanho fixo: herói **32 × 32**, Folhim **16 × 16**.
- **Uma animação por linha**, quadros da esquerda para a direita, na ordem do visualizador. A folha do herói tem 128 × 512 px; a do Folhim, 64 × 96 px.
- Direções em linhas próprias: baixo, cima e lado (olhando para a direita). A esquerda é o lado espelhado.
- **Âncora** nos pés: (16, 28) no herói e (8, 14) no Folhim. É o ponto que fica sobre a posição do personagem no mundo.
- Fundo transparente, as regras de paleta, contorno e luz da [direção de arte](../../../basilis/docs/DIRECAO-DE-ARTE.md).

## Ajustes

Velocidade das animações, quando o golpe acerta (quadros ativos ou tempo), rastro do golpe (nenhum, cone, crescente, pixels), mostrar âncoras e quadros (contorno de cada sprite, vermelho quando o golpe está ativo) e depuração (animação e quadro atuais). Movimento vem do Lab 01, tela do Lab 02 e os valores de combate do Lab 03.

## O que observar

1. Dá para entender o que cada personagem está fazendo só pela animação?
2. O golpe parece acertar no momento em que a espada passa? Compare "quadros ativos" e "tempo".
3. A espada sozinha basta, ou o rastro (cone, crescente) ajuda a ler o golpe?
4. Andar, parar e virar ficam naturais? A velocidade da animação de andar acompanha a do movimento?
5. O aviso do Folhim (encolher e franzir) é mais claro que o piscar do Lab 03?
6. A folha baixada serve de molde para desenhar ou gerar a arte definitiva?

## Verificado até agora

- Testes automáticos (`npm test`): quadros por tempo, repetição e fim das animações sem repetição, duração, quadros ativos, troca e recomeço de animação, velocidade, prioridade dos estados, nomes das animações, espelhamento da esquerda, linhas sem sobreposição, todas as ações do herói em todas as direções, ataques com a mesma duração e os mesmos quadros ativos, tamanho da folha, posição dos quadros e âncora dentro do quadro.
- No navegador do computador, em tamanho de celular: a folha do herói foi gerada com todos os quadros (conferidos um a um, inclusive a espada atrás do corpo ao preparar o golpe), o visualizador tocou e mostrou a folha, e na arena o herói andou e atacou com a animação de ataque e os Folhins andaram animados.
- **Ainda não testado num celular de verdade**, nem com uma folha desenhada fora do código.

## Conclusão

Pendente: preencher depois do teste no celular.
