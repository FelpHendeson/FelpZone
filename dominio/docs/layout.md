# Domínio: layout de jogo de estratégia (v0.4)

Substitui `layout-mobile.md` (v0.3), que empilhava a interface do desktop no celular.

## Proposta (do dono do jogo)

Visual de jogo de estratégia mobile:
- O mapa ocupa a tela inteira e dá pra **mover e dar zoom** (mouse no PC, dedos no celular).
- Os botões ficam **flutuando nas bordas**: em cima, embaixo e nas laterais.
- **Tocar num ponto** troca a barra de baixo pelas ações daquele ponto.
- **Tocar no vazio** tira a seleção e volta para a barra normal.
- No celular, um **botão de tela cheia** e o jogo **na horizontal**.

## Quem joga e como

- O dono do jogo e amigos. No celular, sessões curtas na horizontal com as duas mãos (polegares nos cantos de baixo). No PC, com o mouse.
- **Ciclo principal:** passear pelo mapa → tocar num ponto → agir → encerrar o dia → ler o relatório.

## Layout (o mesmo no PC e no celular deitado)

```
┌─────────────────────────────────────────────────────────────┐
│ [🏴 Bonde · Dia 12]   [💵 $3.200 +410][👥 6/22][⭐ 40][⚡⚡⚡]  [👁️ ███░ 48→62] [📻][⛶][☰] │
│                                                             │
│                                                       [＋]  │
│                M A P A   (arrasta / zoom)              [－]  │
│                                                       [◎]  │
│                                                             │
│ ┌ cartão do ponto ┐                                         │
│ │ 💊 Boca da Praça │  [⚔️ 3 ▸ Atacar] [🤝 Comprar]  [Encerrar dia ▶] │
│ └──────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
```

- **Topo à esquerda:** identidade do bonde e o dia.
- **Topo ao centro:** recursos (caixa e saldo, soldados, respeito, ações) e a visada.
- **Topo à direita:** rádio 📻 (com aviso de novidade), tela cheia ⛶ e menu ☰.
- **Direita:** zoom ＋/－ e ◎ para voltar ao QG.
- **Embaixo à esquerda:** cartão do ponto selecionado (nome, dono, renda, visada, guardas).
- **Embaixo ao centro:** barra de ações. Ela muda conforme o contexto:
  - Nada selecionado: 💼 Subornar e 🏠 Ir ao QG.
  - Ponto seu: guardas −/+, recrutar, melhorar, baixar a poeira.
  - Ponto atacável: escolher quantos mandar, chance de vitória, ⚔️ Atacar e 🤝 Comprar (se neutro).
  - Fora do alcance: aviso curto.
- **Embaixo à direita:** **Encerrar dia ▶**, o botão grande e fixo (o "botão de atacar" do jogo).
- **Relatório do dia:** um cartão central depois de encerrar o dia. Fecha com um toque.
- **Rádio:** painel lateral que abre e fecha, com o histórico completo.

## Câmera

- **Arrastar:** botão do mouse, um dedo ou o teclado (setas e WASD).
- **Zoom:** roda do mouse, pinça com dois dedos, botões ＋/－ ou teclas + e −. O zoom mira o ponteiro ou o centro entre os dedos.
- **Limites:** do mapa inteiro visível até 3× de aproximação. A câmera não sai da cidade.
- **Tocar ou clicar** sem arrastar (até 8px de movimento) seleciona o ponto mais perto, dentro de uma área de toque generosa. Fora disso, tira a seleção.
- **Esc** tira a seleção.
- O mundo ganhou uma margem com quadras de cidade, pra arrastar ter cara de "andar pelo mapa".

## Celular

- ⛶ **Tela cheia** usa a Fullscreen API e tenta travar em paisagem (Android/Chrome).
- No iPhone o Safari não deixa sites entrarem em tela cheia. Lá o caminho é "Adicionar à Tela de Início": o `manifest.json` abre o jogo em tela cheia e na horizontal.
- **Em pé:** aparece um aviso "Gire o celular", com os botões "Tela cheia" e "Jogar assim mesmo".
- Botões com no mínimo 44px e respeito às áreas seguras (recorte da câmera).

## Critérios de aceite (verificados no PC 1400×860, Pixel 7 deitado e em pé)

- [x] Arrastar move o mapa; roda/pinça dá zoom; a câmera respeita os limites.
- [x] Tocar num ponto seleciona e mostra as ações; tocar no vazio desseleciona.
- [x] Arrastar não seleciona nada por engano.
- [x] Todas as ações da v0.3 continuam disponíveis: atacar, comprar, guardas, recrutar, melhorar, baixar a poeira, subornar e encerrar o dia.
- [x] Encerrar o dia mostra o relatório do dia.
- [x] Mesmo layout no PC (1400×860) e no celular deitado (844×390), sem nada cortado.
- [x] Em pé, aparece o aviso de girar.
- [x] O save da versão anterior continua funcionando.
