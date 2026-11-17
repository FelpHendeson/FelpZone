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
  introEscola: [
    { who: 'vice', text: 'E aí, {vulgo}. Esse Estadual tá largado. O Técnico, a Vila e o Cais acham que mandam na região inteira.' },
    { who: 'cmd', text: '{originLine}' },
    { who: 'vice', text: 'Então qual é o plano?', choices: [
      { text: 'A gente começa pelo nosso colégio. Um canto de cada vez.', effect: { loyalty: 5 }, reply: 'Gostei. Primeiro a casa, depois a rua.' },
      { text: 'A gente vai mostrar pros três colégios quem manda.', effect: { respect: 3 }, reply: 'É isso! O {gang} vai ser lenda no recreio.' },
    ] },
    { who: 'vice', text: 'Primeiro passo: chamar uns moleques pro bonde. Toca no Terraço e recruta. Eu e {capitaes} tamo contigo.' },
  ],
  introBairro: [
    { who: 'vice', text: 'O morro tá dividido em três: a Ladeira do Tião, a Família do Martelo e os Vira-Latas do Pitoco.' },
    { who: 'vice', text: 'Tem terreno vazio por todo lado, {vulgo}. Quem comprar e construir primeiro vai mandar no bairro.' },
    { who: 'cmd', text: 'Então a gente compra, constrói, se arma e toma. Nessa ordem.' },
    { who: 'vice', text: 'E faz uma festa de vez em quando. Bailão no campinho traz gente nova pro bonde.' },
  ],
  timeskip_bairro: [
    { who: 'cmd', text: 'O Morro do Farol é nosso. Cada laje, cada beco.' },
    { who: 'narr', text: 'MESES DEPOIS...' },
    { who: 'narr', text: 'O nome do bonde desceu o morro. Na cidade, os Corvos, as Serpentes e os Dragões já sabem quem está chegando.' },
    { who: 'vice', text: 'É agora, {vulgo}. Porto Neon inteira. Os moleques do colégio viraram os donos da cidade, e a gente vai cobrar.' },
    { who: 'cmd', text: 'Metade do caixa e todas as armas vêm com a gente. Bora.' },
  ],
  objective: [
    { who: 'vice', text: '{texto}' },
  ],
  timeskip_escola: [
    { who: 'cmd', text: 'Os colégios são nossos. Mas isso aqui é só o começo.' },
    { who: 'narr', text: 'ANOS DEPOIS...' },
    { who: 'narr', text: 'Os moleques cresceram. As rixas de colégio viraram facções de verdade, e Porto Neon virou um tabuleiro.' },
    { who: 'vice', text: '{vulgo}, lembra do terraço do Estadual? Os Corvos, as Serpentes e os Dragões tomaram a cidade. O jogo agora é outro.' },
    { who: 'cmd', text: 'A cidade vai ter que esperar. Primeiro a gente vira dono do nosso bairro, o Morro do Farol.' },
    { who: 'cmd', text: 'E o bonde merece uma marca à altura.' },
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
  visada:   { title: '{heat} {heatIcon}', text: 'A {police} está de olho no bonde. Acima de 50 {consequencia}. Use {bribeIcon} {bribe} ou baixe a poeira num ponto pra esfriar.' },
  lote:     { title: 'Lote comprado 🚧', text: 'Toque no lote e escolha o que construir. A obra leva dias e, enquanto isso, o ponto fica frágil: bote guardas.' },
  intel:    { title: 'Boato ⚠️', text: 'O inferninho ouviu que um rival vai atacar o ponto marcado com ⚠️ amanhã. Reforce os guardas ou ataque primeiro.' },
  crew:     { title: 'O bonde', text: 'No 👥 Bonde você vê o seu personagem, o vice e os capitães. De olho na lealdade: abaixo de 25, alguém pode trair.' },
};
