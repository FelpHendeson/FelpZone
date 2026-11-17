# Domínio — Porto Neon

Jogo de navegador de gestão de gangue, por turnos, numa cidade fictícia.
Você começa com um QG no Morro do Farol e precisa dominar a cidade contra três gangues rivais.

Versão publicada: https://dominio-porto-neon.vercel.app

## Como jogar

- Arraste o mapa (mouse ou dedo) e dê zoom (roda ou pinça). Toque num ponto para ver as ações; toque no vazio para fechar.
- Pontos com círculo pontilhado estão ao seu alcance para ataque.
- Você tem 3 ações (⚡) por dia para atacar ou negociar. Mover guardas, recrutar e melhorar pontos não gastam ação.
- "Encerrar dia" recebe a renda, paga os soldados, faz os rivais jogarem e pode disparar batidas policiais.
- Vence quem tomar os três QGs rivais. Perde quem tiver o próprio QG tomado.
- O progresso é salvo automaticamente no navegador.

## Rodar localmente

O jogo usa módulos ES, que o navegador não abre direto do arquivo (`file://`). Sirva a pasta com qualquer servidor estático:

```bash
cd dominio
```

```bash
python3 -m http.server 8000
```

Depois abra http://localhost:8000. Não há build: a Vercel publica a pasta como está.

## Testes e simulação (Node 18+)

```bash
node sim/save.test.mjs
```

```bash
node sim/bridge.test.mjs
```

```bash
node sim/balance.mjs 40
```

- `save.test.mjs`: um save antigo (v0.1–v0.4) abre na versão atual.
- `bridge.test.mjs`: todo botão do HTML chama uma função que existe.
- `balance.mjs`: um bot joga N partidas, com e sem suborno, e mede vitórias, duração, caixa final e visada. Rode a cada mudança de regra.

## Estrutura

```text
dominio/
├── index.html, style.css      # página e visual
├── manifest.json, icon*       # instalar na tela inicial (tela cheia, horizontal)
├── src/
│   ├── data/                  # dados: tipos de ponto, gangues rivais, mapas
│   ├── core/                  # regras puras (sem DOM): estado, save versionado, combate, IA, polícia
│   └── ui/main.js             # mapa com câmera, HUD, painéis, relatório, rádio, tela cheia
├── sim/                       # simulador de equilíbrio e testes (Node)
└── docs/
    ├── gdd.md                 # documento de design: campanha em eras e roadmap
    └── layout.md              # spec do layout
```

- **Regras x interface:** `src/core` não toca na tela. Ele avisa a interface pelos `hooks` (`changed`, `newGame`, `dayEnded`, `gameOver`). Por isso a simulação roda no Node.
- **Save versionado** (`src/core/save.js`): cada mudança de formato ganha uma migração em `MIGRATIONS`, e partidas antigas continuam abrindo.

## Estado atual

v0.5 (F0 do roadmap): código reorganizado em módulos, save versionado com migração do formato antigo, simulador e testes no Node. A jogabilidade é a mesma da v0.4.

- **v0.4:** layout de jogo de estratégia, com o mapa em tela cheia (arrastar e zoom), a interface flutuando nas bordas e ações conforme o ponto tocado. No celular, tela cheia na horizontal.
- **v0.2:** a "Visada" (atenção da polícia) anda até um alvo definido pelos seus pontos; o suborno dá 3 dias de vista grossa; dá pra "baixar a poeira" num ponto.

Equilíbrio atual (bot simples, 40 partidas): vence ~90% em ~55–58 dias. Termina com ~$45 mil em caixa (dinheiro sobrando: será tratado com armas, hierarquia e construção). Sem controlar a visada, ela fica perto de 75 no fim.

**Próximo:** F1 (identidade e personagem) do `docs/gdd.md`.
