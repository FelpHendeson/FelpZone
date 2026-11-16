# Domínio — Porto Neon

Jogo de navegador de gestão de gangue, por turnos, numa cidade fictícia.
Você começa com um QG no Morro do Farol e precisa dominar a cidade contra três gangues rivais.

## Como jogar

Abra `index.html` no navegador (não precisa instalar nada) ou acesse a versão publicada.

- Clique num ponto do mapa para ver detalhes e ações.
- Pontos com círculo pontilhado estão ao seu alcance para ataque.
- Você tem 3 ações (⚡) por dia para atacar ou negociar. Mover guardas, recrutar e melhorar pontos não gastam ação.
- "Encerrar dia" recebe a renda, paga os soldados, faz os rivais jogarem e pode disparar batidas policiais.
- Vence quem tomar os três QGs rivais. Perde quem tiver o próprio QG tomado.
- O progresso é salvo automaticamente no `localStorage` do navegador.

## Estrutura

- `index.html`: página
- `style.css`: visual
- `game.js`: dados do mapa, regras, IA dos rivais e renderização (SVG)

## Estado atual

Versão jogável v0.2. Calor da polícia reformulado: ele anda aos poucos até um alvo definido pelos seus pontos, o suborno dá 3 dias de vista grossa e dá pra "baixar a poeira" num ponto. Equilíbrio testado com um bot simples: vence ~85% das partidas em ~55-60 dias; sem controlar o calor, ele fica perto de 75 no fim do jogo.

Ideias para próximas versões: tenentes com nome e habilidades, eventos de história, motos e guerras de bonde, alianças e traições, sons e música.
