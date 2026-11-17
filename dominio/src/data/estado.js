// Mapa do estado: cidades, rotas e as gangues locais de cada uma (expansão por braços, ver docs/gdd.md 2.1).
// diff: multiplica a força inicial dos rivais (reserva e armamento). tribute: o que a cidade manda por dia quando é sua.

const q = (a, b, c) => [a, b, c];

export const CITIES = {
  porto: { name: 'Porto Neon', x: 200, y: 360, diff: 1, tribute: 400, start: true,
           desc: 'Onde tudo começou. O coração da organização.' },
  ferro: { annex: 25000, name: 'Vale do Ferro', x: 450, y: 170, diff: 1.1, tribute: 450,
           desc: 'Cidade de galpões, siderúrgica e desmanche. Gente dura.',
           gangs: {
             A: { name: 'Os Fundidores', leader: 'Brasa', color: '#a855f7', aggr: 0.5, quotes: q('Aqui o ferro derrete, forasteiro.', 'Vale do Ferro não se curva.', 'Volta pra tua praia.') },
             B: { name: 'Clã do Trilho', leader: 'Dona Ferrugem', color: '#22c55e', aggr: 0.4, quotes: q('O trem não espera ninguém.', 'Ferrugem come tudo, devagar.', 'Tu não sabe onde pisou.') },
             C: { name: 'Bonde da Escória', leader: 'Carvão', color: '#f97316', aggr: 0.4, quotes: q('Escória é o que sobra. E a gente sobra.', 'Quem não trabalha, briga.', 'Vem que tem.') },
             D: { name: 'Os Guindastes', leader: 'Torre', color: '#eab308', aggr: 0.35, quotes: q('A gente levanta qualquer peso.', 'Do alto a gente vê tudo.', 'Cai de cima, cai feio.') },
           } },
  praia: { annex: 28000, name: 'Praia Dourada', x: 470, y: 520, diff: 1.15, tribute: 500,
           desc: 'Turismo de dia, festa de noite. Muito dinheiro circulando, muita polícia de olho.',
           gangs: {
             A: { name: 'Os Tubarões da Orla', leader: 'Mako', color: '#a855f7', aggr: 0.5, quotes: q('Na orla, tubarão come primeiro.', 'Turista paga, local obedece.', 'Sangue na água atrai a gente.') },
             B: { name: 'Família Coral', leader: 'Dona Pérola', color: '#22c55e', aggr: 0.4, quotes: q('Coral corta quem encosta.', 'Essa praia tem dona.', 'Sorria, você tá sendo vigiado.') },
             C: { name: 'Os Salva-Vidas', leader: 'Boia', color: '#f97316', aggr: 0.35, quotes: q('A gente salva... quem paga.', 'Bandeira vermelha pra você.', 'Maré tá virando.') },
             D: { name: 'Bonde do Quiosque', leader: 'Caipira', color: '#eab308', aggr: 0.4, quotes: q('Todo quiosque paga pedágio.', 'Gelada e porrada, sempre.', 'Chega mais, a casa é sua... até não ser.') },
           } },
  serra: { annex: 32000, name: 'Serra Azul', x: 740, y: 240, diff: 1.25, tribute: 550,
           desc: 'Estrada de montanha e rota de contrabando. Quem controla a serra controla o que entra no estado.',
           gangs: {
             A: { name: 'Lobos da Neblina', leader: 'Uivo', color: '#a855f7', aggr: 0.5, quotes: q('Na neblina ninguém te vê chegar.', 'A serra engole forasteiro.', 'Lobo solitário morre. A gente anda em bando.') },
             B: { name: 'Os Tropeiros', leader: 'Velho Tião', color: '#22c55e', aggr: 0.4, quotes: q('Essa estrada é nossa há três gerações.', 'Tropeiro não tem pressa.', 'Pedágio é pedágio.') },
             C: { name: 'Bonde da Curva', leader: 'Freio', color: '#f97316', aggr: 0.45, quotes: q('Quem não freia na curva, voa.', 'A serra cobra.', 'Tu tá na nossa pista.') },
             D: { name: 'Guardiões do Pico', leader: 'Cume', color: '#eab308', aggr: 0.35, quotes: q('Do pico a gente vê o estado inteiro.', 'Subir é fácil. Descer vivo é que é difícil.', 'O ar é rarefeito aqui em cima.') },
           } },
  capital: { name: 'Capital', x: 780, y: 520, diff: 1.45, tribute: 800, final: true,
           desc: 'Onde o poder mora: polícia federal, política e as facções mais ricas. A última cidade.',
           gangs: {
             A: { name: 'Os Engravatados', leader: 'Doutor', color: '#a855f7', aggr: 0.5, quotes: q('Tudo aqui tem preço, inclusive você.', 'A gente não suja a mão. A gente paga quem suja.', 'Bem-vindo à Capital. Pague a entrada.') },
             B: { name: 'Comando Central', leader: 'General', color: '#22c55e', aggr: 0.45, quotes: q('Disciplina vence bagunça.', 'A Capital tem comando.', 'Formação! Forasteiro na área.') },
             C: { name: 'Família do Planalto', leader: 'Matriarca', color: '#f97316', aggr: 0.4, quotes: q('A Família estava aqui antes do asfalto.', 'Sangue é mais grosso que dinheiro.', 'Senta. Vamos conversar... depois a gente te enterra.') },
             D: { name: 'Os Fantasmas', leader: 'Ninguém', color: '#eab308', aggr: 0.45, quotes: q('Você nunca vai ver a gente chegar.', 'Fantasma não tem endereço.', 'Boo.') },
           } },
};

export const ROUTES = [['porto', 'ferro'], ['porto', 'praia'], ['ferro', 'praia'], ['ferro', 'serra'], ['praia', 'capital'], ['serra', 'capital']];
