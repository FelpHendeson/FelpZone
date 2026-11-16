# Domínio: layout para celular (spec)

## Problema

No celular (390×664 úteis, iPhone 13), a versão v0.2 só empilha o layout do desktop:

| O que acontece | Impacto |
|---|---|
| O HUD ocupa 226px (34% da tela), quebrado em 4 linhas | Sobra pouco espaço pro mapa |
| O mapa fica com 250px de altura e pontos de ~22px | Difícil acertar o toque (o mínimo recomendado é 44px) e os nomes ficam ilegíveis |
| O painel do ponto é cortado no fim da tela | **Os botões de ação ficam invisíveis: dá pra olhar, mas não dá pra jogar** |
| "Encerrar dia" fica no topo | É a ação mais usada e está longe do polegar |
| Ao encerrar o dia não aparece o que aconteceu | O jogador não sente o resultado das escolhas |

## Quem joga e como

- O próprio dono do jogo e amigos, no celular, em pé, com uma mão, em sessões curtas (5 a 15 min).
- **Ciclo principal:** olhar o mapa → tocar num ponto → agir (atacar, recrutar, guardas) → encerrar o dia → ver o que rolou.
- Informação mais consultada: caixa, soldados livres, ações restantes e visada.

## Princípios

1. **O mapa é o jogo.** Ele ocupa o máximo de tela possível, sempre visível.
2. **Polegar embaixo.** Ações frequentes ficam na parte de baixo da tela.
3. **Mostrar o que importa agora.** O detalhe de um ponto só aparece quando você toca nele.
4. **Todo turno tem desfecho.** Depois de "Encerrar dia", aparece um resumo do dia.
5. **O desktop não muda.** Esse layout vale só pra telas estreitas (até 760px).

## Solução

```
┌──────────────────────────┐
│ D1  $800 +372  👥6/14 ⭐10│  ← barra compacta (1 linha)
│ 👁️ ████░░░░ 40→16   ⚡⚡⚡ │  ← visada + ações
├──────────────────────────┤
│                          │
│     MAPA EM PÉ           │  ← mapa transposto (retrato),
│   (pontos maiores,       │     ocupa todo o meio
│    nomes legíveis)       │
│                          │
├──────────────────────────┤
│ 📻  ☰   💼 Subornar  [Encerrar dia ▶] │  ← barra do polegar
└──────────────────────────┘
```

- **Mapa em retrato:** as coordenadas são transpostas (x↔y), então o mapa 1000×680 vira 680×1000 e se encaixa na tela em pé. Nada muda nas regras.
- **Pontos maiores no celular:** raio maior, nomes maiores e área de toque invisível de ~50px.
- **Gaveta inferior (bottom sheet):** tocar num ponto abre uma gaveta com informações e ações. Ela ocupa no máximo 62% da tela, tem rolagem própria e o topo do mapa continua visível. Fecha no ✕ ou tocando de novo no ponto.
- **Rádio na gaveta:** o botão 📻 abre o histórico completo.
- **Resumo do dia:** ao encerrar o dia, a gaveta abre sozinha com "O que rolou no dia N".
- **Menu ☰:** ajuda e novo jogo, que são ações raras.
- **Áreas seguras:** respeita o recorte do iPhone (`safe-area-inset`).

## Critérios de aceite (verificados no iPhone 13 simulado)

- [x] Em 390×664, todas as ações de um ponto ficam alcançáveis com rolagem dentro da gaveta.
- [x] Os pontos do mapa têm área de toque ≥ 44px.
- [x] A barra do topo tem no máximo 2 linhas (≤ 64px).
- [x] "Encerrar dia" fica na barra de baixo.
- [x] Encerrar o dia mostra o resumo daquele dia.
- [x] O desktop (≥ 761px) fica visualmente igual à v0.2.
- [x] Girar a tela ou redimensionar a janela troca o layout sem perder o estado.

## Fora do escopo (próximos passos)

- Zoom e arrastar no mapa.
- Modo paisagem otimizado no celular.
- Animações de ataque e vibração (haptics).
