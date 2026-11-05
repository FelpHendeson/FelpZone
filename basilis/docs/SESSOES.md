# Sessões dos próximos labs — Basilis: O Novo Mundo

Cada lab roda numa sessão própria do Claude Code, para a sessão principal não carregar o contexto todo. Uma sessão por vez: todas trabalham em `main` e publicam no mesmo projeto da Vercel (`felp-labs`), então duas ao mesmo tempo se atropelariam. A próxima só começa depois que o autor aprovar o lab anterior.

Para abrir uma sessão, cole o texto do lab numa sessão nova nesta pasta.

## Regras comuns (valem para todas)

```text
Contexto: Basilis: O Novo Mundo é um RPG de ação top-down em pixel art para celular e
navegador. Os labs ficam no hub Felp Labs (`labs/`: Vite 7, TypeScript estrito, Vitest,
Canvas 2D, Node 24), publicado na Vercel como `felp-labs` (https://felp-labs.vercel.app).
Docs, textos da interface, READMEs e commits em português do Brasil.

Leia antes: `basilis/README.md`, `basilis/docs/DIRECAO-DE-ARTE.md`, `labs/README.md` e o
README e o código do lab anterior, para reaproveitar módulos em vez de copiar.

Ao terminar cada parte: `npm test` e `npm run build` passando dentro de `labs/`, conferir
no navegador em tamanho de celular, publicar com `npx --no-install vercel deploy --prod --yes`
dentro de `labs/` (o vercel não está no PATH; nunca mexer no projeto `novo-mundo-basilis`
nem apagar nada na Vercel), commitar em `main` em português terminando com
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` e fazer push.

Ao terminar o lab: README no estilo do Lab 04 (Pergunta, O que tem, Formato, Ajustes,
O que observar, Verificado até agora, Achados, Conclusão pendente), o lab em
`labs/hub/catalog.ts` como 'Em teste' e nas tabelas de `labs/README.md` e
`basilis/README.md` (saindo da tabela "Próximos labs"). Toda arte é original.
Responda com a URL do lab e o que o autor deve testar.
```

## Lab 05 — Personagem em camadas

```text
Construa o Basilis Lab 05 — Personagem em camadas, em `labs/basilis/05-personagem/`,
seguindo `basilis/docs/PERSONAGEM.md`. Reaproveite do Lab 04 (`labs/basilis/04-animacao/`)
o `animation.ts`, o formato de folha, o visualizador e o palco. Faça em partes, com commit
e publicação a cada uma:

1. Molde e pontos (o esqueleto): formato de 32 × 32 com âncora em (16, 28), direções
   baixo, cima e lado (esquerda espelhada), as animações da seção 2 (parado 4, andar 6,
   dash 3, dano 2, morrer 4; das ações de arma, só a família "cortar" como prova) e os
   pontos por quadro `mao-principal` (com a orientação da arma e se vai na frente ou atrás),
   `mao-secundaria`, `cabeca`, `costas` e `pes`. Um manequim gerado por código, bem melhor
   que o do Lab 04 (contorno colorido, rampas de 3 a 4 tons, luz do alto à esquerda, corpo
   de cerca de 16 × 24). O visualizador mostra os pontos.
2. Camadas e paleta: as camadas na ordem da seção 3, desenhadas em tons-índice por canal e
   pintadas com rampas (seção 4), as regras de esconder, a receita em JSON (seção 5) montada
   uma vez numa folha fora da tela e refeita só quando muda. Testes da ordem e da pintura.
3. Criação de personagem: a tela com as opções da seção 6 (2 corpos, 8 peles, olhos,
   sobrancelhas, 8 cabelos com careca, 10 cores de cabelo, barba, marcas), sempre com a
   roupa da Terra, e um exemplo de linhagem (orelhas e cauda de lobo de Mykol) para provar
   a camada de linhagem.
4. Jogo e menu: o sprite andando numa arena pequena (movimento e controles do Lab 04; a
   esquiva fica como está, o dash é do Lab 08) ao lado do boneco do menu, comparando o
   boneco próprio de 64 × 96 montado da mesma receita com o sprite do jogo ampliado
   (seção 7).
5. NPCs: alguns NPCs com receitas sorteadas andando pela arena, mostrando o reuso e o
   desempenho (um desenho por personagem por quadro).
6. Importar folha: baixar o molde de qualquer camada e carregar uma folha de fora por
   camada, reduzindo de 8× pelo vizinho mais próximo, quantizando nas rampas e tirando o
   fundo, como em `basilis/docs/PROMPTS-DE-FOLHAS.md` seção 1.

Faça o sistema de camadas como módulos que os Labs 06, 07 e 08 vão importar.
```

## Lab 06 — Equipamentos

```text
Construa o Basilis Lab 06 — Equipamentos, em `labs/basilis/06-equipamentos/`, sobre os
módulos de camadas do Lab 05, seguindo `basilis/docs/PERSONAGEM.md` seção 8: os slots
(cabeça, rosto, tronco, mãos, pernas, pés, costas, mão principal, mão secundária,
acessórios), o que cada peça esconde, itens de aparência (skins) por cima do item equipado,
melhorias por troca de rampa e brilho nos níveis altos, peças sagradas e profanas, e a tela
de equipamento com o boneco do menu, os slots em volta e ícones de 16 × 16 num inventário.
Gere por código pelo menos 3 conjuntos (couro, malha, placas) e um manto de Etéris, cada
um com camada de jogo, camada de menu e ícone. O herói anda na arena equipado.
```

## Lab 07 — Armas por tipo

```text
Construa o Basilis Lab 07 — Armas por tipo, em `labs/basilis/07-armas/`, sobre os módulos
dos Labs 05 e 06, seguindo `basilis/docs/ARMAS-E-COMANDOS.md` seções 1 a 3: as famílias de
arma (lâmina longa, pesada e curta, lança, contusão, arco, arremesso, foco de magia, escudo
na secundária), cada arma como folha de 16 orientações colocada pelo ponto `mao-principal`,
sempre na mão, com pose de descanso, famílias de animação do corpo (cortar, estocar, golpe
pesado, puxar o arco, arremessar, conjurar), quadros ativos, rastro por família, projéteis
de arco e arremesso, e inimigos que atiram. Teste se as variantes de parado e andar para
duas mãos e arco valem o custo. Trocar de arma na arena muda tudo na hora.
```

## Lab 08 — Comandos de combate

```text
Construa o Basilis Lab 08 — Comandos de combate, em `labs/basilis/08-comandos/`, sobre os
Labs 05 a 07, seguindo `basilis/docs/ARMAS-E-COMANDOS.md` seções 4 a 6: o dash no lugar da
esquiva (curto, invulnerável no começo, atravessa inimigos e não paredes, cargas, imagens
residuais, arrastar mira o destino, cancela a recuperação do golpe, um exemplo de dash com
efeito), ataque básico com mira automática, botões de técnica com prévia no chão, mira por
arraste e área de cancelar, botões que mudam com a família da arma, combos com animação por
golpe, janela de entrada e buffer, e o mesmo esquema no teclado e mouse e no controle.
Os valores ficam nos ajustes para afinar no celular.
```

## Lab 09 — Magias e partículas

```text
Construa o Basilis Lab 09 — Magias e partículas, em `labs/basilis/09-magias/`, sobre os
Labs 05 a 08, seguindo `basilis/docs/ARMAS-E-COMANDOS.md` seção 7: as formas de magia
(projétil, linha, cone, área com aviso, aura, invocação), um sistema de partículas em pixel
art de 1 a 4 px com emissores e cores por elemento ou divindade, efeitos em quadros
(explosão, raio, círculo mágico), tremor de tela e brilho de Etéris com moderação. Meça o
desempenho no celular com muitas partículas.
```
