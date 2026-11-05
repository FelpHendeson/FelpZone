# Lab 03 — Combate

**Pergunta:** a base de um combate de ação (colisão entre corpos, dano, empurrão, recargas e inimigos que avisam antes de atacar) fica justa e legível no celular?

## O que tem

- **Arena:** o cenário e o herói do Lab 02, com o movimento do Lab 01, e Folhins selvagens (16 × 16, gerados por código) que nascem em volta.
- **Inimigos com estados:** vagam perto de casa; quando o herói chega a 5 tiles, perseguem; perto, **param e piscam com os olhos vermelhos** (o aviso), dão um **bote** rápido e descansam. Morrem sem vida e renascem em casa depois de 4 s.
- **Ataque do herói:** um cone à frente que acerta cada inimigo **uma vez por golpe**, só na parte ativa do golpe (os primeiros 70%). Conta a borda do inimigo, não só o centro. A mira automática do Lab 01 vira o golpe para o inimigo mais próximo.
- **Dano e reação:** números de dano, brilho branco no atingido, barra de vida sobre o inimigo ferido, **empurrão** (vira velocidade e desliza com atrito, parando nas pedras e na água) e um instante sem controle.
- **Pausa no impacto (hitstop):** o jogo congela 60 ms a cada acerto, para o golpe "pesar". Vibra no Android.
- **Invulnerabilidade:** depois de levar dano, o herói pisca e fica imune por um tempo. **A esquiva atravessa o bote:** durante a esquiva o bote não acerta.
- **Corpos sólidos:** inimigos se empurram entre si e empurram o herói (que cede menos), sem atravessar o cenário.
- **Recargas visíveis:** os botões de ataque e esquiva escurecem e vão clareando em círculo até ficarem prontos.
- **Vida do herói** no topo. Ao cair, renasce no início em 1,5 s e a arena recomeça.
- **Golpes com estilos:** **Cone** (o do Lab 01, que preenche com brilho que some, agora o padrão), **Crescente** (uma lâmina curva que varre o arco, com rastro) e **Pixels** (a borda em quadradinhos). A ideia é cada arma ter a sua animação.

## Ajustes

Dano, recarga e alcance do ataque; força do empurrão; pausa no impacto; invulnerabilidade do herói; número, vida, dano e velocidade dos inimigos; duração do aviso antes do bote; estilo do golpe; números de dano; **mostrar áreas de acerto** (corpos e o cone do golpe, para ver por que algo acertou ou não); depuração. Movimento e joystick vêm do Lab 01; tela, rolagem e câmera, do Lab 02.

## O que observar

1. Dá para ler o aviso do Folhim e esquivar a tempo? Qual duração de aviso parece justa?
2. O golpe acerta o que parece que deveria acertar? (Ligue "mostrar áreas de acerto" para conferir.)
3. A recarga de 0,35 s deixa o ataque gostoso ou travado?
4. O empurrão e a pausa no impacto dão peso ao golpe ou atrapalham?
5. Ser empurrado pelos inimigos parece justo?
6. Qual estilo de golpe combina mais com uma espada? E com outras armas?
7. Com 8 a 12 inimigos, o celular continua fluido?

## Verificado até agora

- Testes automáticos (`npm test`): cone com a borda do alvo no alcance e no ângulo, alvo encostado, dano, empurrão para longe, invulnerabilidade, vida que não fica negativa, perseguir → avisar → bote, ficar parado durante o aviso, ignorar quem está longe, golpe que interrompe o bote, morte e renascimento, bote que acerta uma vez só e separação de corpos.
- No navegador do computador, em tamanho de celular: Folhins perseguiram e deram botes (o herói caiu para 55 de 100), o golpe segurado acertou com números de dano e barras de vida, e o botão de ataque mostrou a recarga.
- **Ainda não testado num celular de verdade.**

## Conclusão

Pendente: preencher depois do teste no celular.
