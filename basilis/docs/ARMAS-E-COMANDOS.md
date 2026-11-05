# Armas e comandos — Basilis: O Novo Mundo

Rascunho vivo. Define os tipos de arma, como cada um fica na mão e anima, os botões de combate (dash, ataque, técnicas com prévia e mira) e os combos. O personagem que segura as armas está em [PERSONAGEM.md](PERSONAGEM.md).

## 1. Regras gerais

- **A arma equipada fica sempre na mão** (achado do Lab 04). Ela só muda de posição: pendurada ou apoiada parada, balançando com o passo, puxada na preparação, varrendo no golpe.
- A arma é uma **folha de orientações** (8 ou 16 direções já desenhadas, sem rotação em tempo real), colocada pelo ponto `mao-principal` do molde. O molde diz, em cada quadro, a orientação da arma e se ela vai na frente ou atrás do corpo.
- O **tipo de arma** (a família) define: a pose de descanso, as famílias de animação do corpo, os botões, o alcance e o rastro do golpe. A **arma** em si (Espada de Ferro, Lança do Vigia) define só o sprite, a rampa de cor e os números.
- O golpe só acerta nos **quadros ativos** da animação (Lab 04).

## 2. Famílias de arma

| Família | Exemplos | Pegada | Descanso | Golpe básico | Golpe especial da família |
| --- | --- | --- | --- | --- | --- |
| **Lâmina longa** | espada, sabre, espada curva | uma mão | ponta para baixo, ao lado do corpo | **Corte** em arco amplo (o cone do Lab 03), combo de 3 | **Estocada**: linha reta, mais alcance, empurra mais |
| **Lâmina pesada** | montante, machado grande | duas mãos | apoiada no ombro | Corte lento e largo, empurrão grande | Golpe de cima que quebra a guarda |
| **Lâmina curta** | adaga, faca, par de adagas | uma mão (ou uma em cada) | lâmina para trás, junto ao antebraço | Combo rápido de 4 com pouco alcance | Estocada pelas costas ou investida curta |
| **Lança** | lança, alabarda, tridente | duas mãos | em pé, ao lado do corpo | **Estocada** em linha longa (cerca de 2 tiles) | Varredura em meio círculo, lenta |
| **Contusão** | bastão, maça, martelo | uma ou duas mãos | apoiado no ombro ou pendurado | Pancada com empurrão e atordoamento | Golpe no chão em área pequena |
| **Arco** | arco curto, arco longo, besta | duas mãos (arco na secundária) | arco baixo, flecha guardada | **Tiro** com mira automática | **Tiro carregado**: segurar carrega, arrastar mira |
| **Arremesso** | facas de arremesso, machadinhas, disco | uma mão | na mão, pronto | Arremesso rápido de alcance médio, com munição que recarrega | Leque de 3 ou arremesso que volta |
| **Foco de magia** | cajado, varinha, tomo, orbe | cajado: duas mãos; os outros: uma | cajado em pé; foco erguido | Projétil fraco de Etéris | As **técnicas** (magias) ficam nos botões de técnica |
| **Escudo** (secundária) | broquel, escudo grande | mão secundária | no braço | — | **Bloquear** enquanto segura, com recarga |

Cada família tem um **rastro próprio** (o Lab 03 já tem cone, crescente e pixels): arco largo para lâmina longa, risco fino para lâmina curta, linha para lança e estocada, impacto com poeira para contusão.

## 3. Animação por família

O corpo tem **famílias de poses** que todas as armas de uma família compartilham:

| Família de poses | Usada por | Quadros |
| --- | --- | --- |
| Cortar (direita e esquerda, para o combo) | lâmina longa, lâmina curta, lâmina pesada | 4 a 5 cada |
| Estocar | lâmina longa, lâmina curta, lança | 4 |
| Golpe pesado (de cima) | lâmina pesada, contusão | 5 a 6 |
| Puxar o arco (puxa, segura, solta) | arco | 3 + 1 em repetição |
| Arremessar | arremesso | 3 a 4 |
| Conjurar (canalizar, lançar) | foco de magia | 2 em repetição + 3 |

**Pegada de duas mãos** muda também o parado e o andar (a arma fica na frente, segura com as duas mãos). Isso dá duas variantes extras dessas linhas no molde: "duas mãos" e "arco". O Lab 07 decide se as variantes valem o custo ou se basta o ponto da mão secundária.

## 4. Botões

O esquema segue os MOBAs de celular (Wild Rift): um botão grande de ataque, botões de técnica em arco ao redor dele e o dash separado. **Os botões mudam conforme a família da arma equipada.**

### Ataque básico

- **Tocar** ataca com **mira automática**: o alvo mais próximo à frente, dentro do alcance; sem alvo, na direção em que o personagem olha.
- **Segurar** repete o ataque e segue o combo.

### Técnicas: prévia e mira

- **Tocar** lança na direção da mira automática.
- **Arrastar** a partir do botão mostra a **prévia** no chão (linha, cone, círculo, área de impacto ou ponto de dash) e mira para onde o dedo vai. **Soltar** lança.
- Arrastar até a **área de cancelar** (perto do topo da tela) e soltar cancela, sem gastar a recarga.
- A prévia usa o mesmo desenho que os avisos dos inimigos, para o jogador aprender a ler os dois.
- **Teclado e mouse:** segurar a tecla mostra a prévia e mira com o mouse; soltar lança. Um ajuste troca para "lançar ao apertar" (mira direto no mouse, sem prévia).
- **Controle:** o analógico direito mira enquanto o botão está apertado.
- Mirar em 360 graus; o rosto do personagem vira para a mais próxima das 4 direções, mas o golpe e o projétil seguem o ângulo exato.

### Botões por família (proposta inicial)

| Família | Ataque | Técnica 1 | Técnica 2 |
| --- | --- | --- | --- |
| Lâmina longa | Corte (combo de 3) | Estocada (arrastar mira a linha) | Corte giratório |
| Lâmina curta | Combo rápido | Investida curta (arrastar mira) | Arremessar a adaga |
| Lança | Estocada | Varredura | Salto com estocada (arrastar mira o ponto) |
| Contusão | Pancada | Golpe no chão (área) | Empurrão |
| Arco | Tiro | Tiro carregado (segurar e arrastar) | Recuo com tiro |
| Arremesso | Arremessar | Leque | Arremesso que volta |
| Foco de magia | Projétil de Etéris | Técnica equipada | Técnica equipada |

As técnicas de Númen (Árvore e Jardim de habilidades) ocupam os botões de técnica quando equipadas; as da família são o padrão de quem ainda não tem técnicas.

## 5. Dash no lugar da esquiva

O rolamento não fica bom no top-down (achado do autor). A esquiva vira um **dash**:

- Curto e rápido (sugestão: cerca de 2,5 tiles em 0,15 s), com **invulnerabilidade** nos primeiros quadros, como a esquiva do Lab 03.
- **Atravessa** inimigos e ataques, mas não paredes.
- Vai na direção do movimento; parado, vai para onde o personagem olha. **Arrastar** o botão de dash mira o destino, com prévia.
- Rastro de **imagens residuais** (silhuetas que somem) para ler a velocidade.
- Pode ter **cargas** (por exemplo 2 dashes seguidos e recarga de cada um).
- Pode **cancelar** a recuperação de um golpe depois dos quadros ativos.
- Depois, técnicas e equipamentos dão **efeitos ao dash**: dash cortante (fere quem atravessa), dash de fogo (deixa rastro que queima), dash sagrado (cura no fim). O Lab 08 deixa o encaixe pronto com um exemplo.

## 6. Combos

- Cada golpe do combo tem **animação própria**: na lâmina longa, corte da direita, corte da esquerda e estocada final com empurrão maior.
- **Janela de entrada:** um toque durante o golpe (ou até cerca de 0,35 s depois dos quadros ativos) segue o combo. Um toque cedo demais fica guardado (buffer) em vez de se perder.
- Parar de atacar, levar dano ou dar dash reinicia o combo.
- O último golpe do combo é mais forte e mais lento, com pausa no impacto maior.

## 7. Magias e partículas

Ficam para o Lab 09 (antes "Efeitos"):

- **Formas:** projétil, linha, cone, área no chão com aviso, aura em si mesmo, invocação.
- **Partículas em pixel art** de 1 a 4 px, com emissores (faíscas, brasas, folhas, gotas de sangue de Selene, poeira) e cores por elemento ou divindade. Etéris vai do violeta ao ciano.
- **Efeitos em quadros** para o que precisa de forma (explosão, raio, círculo mágico), com folha própria.
- Tremor de tela, pausa no impacto e brilho com moderação, como manda a direção de arte.

## 8. Labs

| Lab | O que prova |
| --- | --- |
| **07 — Armas por tipo** | As famílias, a pegada sempre na mão pelo ponto do molde, folhas de orientação, golpes de corte e estocada, projéteis de arco e arremesso, rastro por família, inimigos que atiram |
| **08 — Comandos de combate** | Dash com cargas e imagens residuais, ataque com mira automática, técnicas com prévia, mira e área de cancelar, botões que mudam com a arma, combos com janela e buffer, dash cancelando a recuperação |
| **09 — Magias e partículas** | As formas de magia, o sistema de partículas, efeitos em quadros, tremor e brilho de Etéris |
