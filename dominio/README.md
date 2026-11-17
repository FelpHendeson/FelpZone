# Domínio — Porto Neon

Jogo de navegador de gestão de gangue, por turnos, numa cidade fictícia.
Você começa com um QG no Morro do Farol e precisa dominar a cidade contra três gangues rivais.

## Como jogar

Abra `index.html` no navegador (não precisa instalar nada) ou acesse a versão publicada.

- Arraste o mapa (mouse ou dedo) e dê zoom (roda ou pinça). Toque num ponto para ver as ações; toque no vazio para fechar.
- Pontos com círculo pontilhado estão ao seu alcance para ataque.
- Você tem 3 ações (⚡) por dia para atacar ou negociar. Mover guardas, recrutar e melhorar pontos não gastam ação.
- "Encerrar dia" recebe a renda, paga os soldados, faz os rivais jogarem e pode disparar batidas policiais.
- Vence quem tomar os três QGs rivais. Perde quem tiver o próprio QG tomado.
- O progresso é salvo automaticamente no `localStorage` do navegador.

## Estrutura

- `index.html`: página
- `style.css`: visual
- `game.js`: dados do mapa, regras, IA dos rivais e estado (sem interface)
- `ui.js`: mapa com câmera (arrastar/zoom), HUD flutuante, relatório do dia, rádio e tela cheia
- `manifest.json` e ícones: permitem instalar na tela inicial e abrir em tela cheia na horizontal
- `docs/layout.md`: spec do layout

## Estado atual

Versão jogável v0.4: layout de jogo de estratégia, com o mapa em tela cheia que dá pra arrastar e dar zoom, a interface flutuando nas bordas e ações que mudam conforme o ponto tocado; no celular, tela cheia na horizontal (ver `docs/layout.md`). Na v0.2, Medidor de atenção da polícia renomeado para "Visada" e reformulado: ela anda aos poucos até um alvo definido pelos seus pontos, o suborno dá 3 dias de vista grossa e dá pra "baixar a poeira" num ponto. Equilíbrio testado com um bot simples: vence ~85% das partidas em ~55-60 dias; sem controlar a visada, ela fica perto de 75 no fim do jogo.

Próximos passos: ver o documento de design em `docs/gdd.md` (campanha em eras: Escola → Bairro → Cidade → Estado → País → Mundo, personagens e hierarquia, bandeira e uniforme, armas, ações especiais, mercado, tutorial e lore).
