// Cenas de diálogo e dicas do tutorial. Texto com {chaves} é preenchido na hora.
// who: 'cmd' (você), 'vice', ou o id de um membro passado no contexto (ex.: 'm').

export const SCENES = {
  intro: [
    { who: 'vice', text: 'E aí, {vulgo}. O Morro do Farol tá quieto demais. Tá na hora do {gang} acordar essa cidade.' },
    { who: 'vice', text: 'Os Corvos mandam na Zona Industrial. A Dona Víbora segura a Vila. E os Dragões do Cais... ninguém mexe com eles.' },
    { who: 'cmd', text: '{originLine}' },
    { who: 'vice', text: 'Então como a gente começa?', choices: [
      { text: 'Um passo de cada vez. Primeiro o morro, depois o resto.', effect: { loyalty: 5 }, reply: 'Gostei. Cabeça fria ganha guerra.' },
      { text: 'A gente toma tudo. Quem ficar na frente, cai.', effect: { respect: 3 }, reply: 'É isso que os moleques queriam ouvir!' },
    ] },
    { who: 'vice', text: 'Eu fecho contigo até o fim. {capitaes} tão de prontidão. É só dar a ordem.' },
  ],
  betrayalCaptain: [
    { who: 'm', text: 'Foi mal, {vulgo}. O {rival} pagou melhor. O {ponto} agora é deles.' },
    { who: 'cmd', text: 'Você vai se arrepender do dia em que virou as costas pro {gang}.' },
  ],
  betrayalFree: [
    { who: 'm', text: 'Tô fora, {vulgo}. Peguei a minha parte e uns moleques vieram comigo.' },
    { who: 'cmd', text: 'Some da minha frente. Se te ver de novo no morro, não vai ter conversa.' },
  ],
  betrayalVice: [
    { who: 'm', text: 'Tanto tempo do teu lado e nunca fui nada além de "vice". Cansei, {vulgo}.' },
    { who: 'm', text: 'Levei o que era meu do caixa. Quando a gente se encontrar de novo, vai ser do outro lado.' },
    { who: 'cmd', text: '...Ninguém trai o {gang} e sai inteiro dessa cidade.' },
  ],
  captainDied: [
    { who: 'cmd', text: '{nome} caiu defendendo {ponto}. Essa perda não vai ser esquecida.' },
  ],
  levelUp: [
    { who: 'vice', text: 'A cidade tá falando de você, {vulgo}. Nível {nivel}! Abre o 👥 Bonde pra distribuir o ponto novo.' },
  ],
  newCaptain: [
    { who: 'm', text: '{falaEntrada}' },
    { who: 'cmd', text: 'Bem-vindo ao {gang}, {vulgoM}. Não me decepciona.' },
  ],
};

// Dicas do tutorial "mostrado": aparecem uma vez, podem ser fechadas ou desligadas de vez.
export const TIPS = {
  map:      { title: 'O mapa é seu', text: 'Arraste pra andar pela cidade e use a roda ou a pinça pra dar zoom. Toque num ponto pra ver as ações dele.' },
  attack:   { title: 'Atacar', text: 'Escolha quantos soldados livres mandar e veja a chance. Quem sobreviver fica de guarda no ponto. Cada ataque gasta 1 ⚡.' },
  own:      { title: 'Seu ponto', text: 'Coloque guardas pra proteger e designe um capitão: dá defesa e os bônus dos traços.' },
  endDay:   { title: 'Fim do dia', text: 'Quando acabarem as ações, toque em Encerrar dia. Os rivais jogam, a renda entra e os salários saem.' },
  visada:   { title: 'Visada 👁️', text: 'A polícia está de olho. Acima de 50 tem batida. Suborne ou baixe a poeira num ponto pra esfriar.' },
  crew:     { title: 'O bonde', text: 'No 👥 Bonde você vê o seu personagem, o vice e os capitães. De olho na lealdade: abaixo de 25, alguém pode trair.' },
};
