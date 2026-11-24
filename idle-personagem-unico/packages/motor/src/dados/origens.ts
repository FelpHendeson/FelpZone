/**
 * Origens (GDD §3.4 e `docs/ORIGENS.md`). Especiais: lore escrita à mão,
 * efeito, gancho e restrição de raça. Comum: peças do gerador por modelo.
 * Efeitos com significado usam modificadores; o resto fica em `efeitoPendente`.
 * Nada disso é aplicado na F1.
 */
import type { Modificador } from "../modificadores";
import type { Berco, BestaVinculada, MarcaOrigem, Motivacao, OrigemEspecial, TracoPersonalidade } from "./tipos";

function mod(alvo: string, operacao: Modificador["operacao"], valor: number, id: string): Modificador {
  return { alvo, operacao, valor, origem: { tipo: "origem", id } };
}

export const BESTAS_VINCULADAS: readonly BestaVinculada[] = [
  {
    id: "besta-do-estudo",
    nome: "Besta do Estudo",
    descricao: "Uma besta espiritual vinculada ao personagem ainda bebê, dentro de um projeto que ninguém assume ter feito.",
  },
  {
    id: "filhote-do-altar",
    nome: "Filhote do Altar",
    descricao: "Um filhote de dragão que eclodiu junto com o personagem, depois de 30 anos num altar.",
  },
  {
    id: "espirito-do-rio",
    nome: "Espírito do Rio",
    descricao: "Um espírito d'água que devolveu o personagem ao mundo e nunca mais foi embora.",
  },
];

type Especial = Omit<OrigemEspecial, "racasPermitidas" | "doAutor"> & {
  readonly racasPermitidas?: readonly string[];
  readonly doAutor?: boolean;
};

const ESPECIAIS: readonly Especial[] = [
  {
    id: "fruto-do-vinculo",
    numero: 1,
    nome: "Fruto do Vínculo",
    lore: "Nasceu apenas para ser um estudo: vincularam uma besta espiritual a um bebê para medir quanto o potencial do indivíduo aumentava.",
    efeitoTexto: "Besta espiritual vinculada; modo União 50% mais longo.",
    efeito: { modificadores: [mod("pets.uniao", "percentual", 0.5, "fruto-do-vinculo")] },
    gancho: "Quem o criou, e o que fizeram com os outros \"bebês de estudo\".",
    bestaVinculadaId: "besta-do-estudo",
    doAutor: true,
  },
  {
    id: "12o-filho-do-cla-ironblood",
    numero: 2,
    nome: "12º Filho do Clã Ironblood",
    lore: "Décimo segundo filho do patriarca, sem herança e sem lugar. Trama a ruína do próprio clã.",
    efeitoTexto: "Dano extra contra inimigos do clã; reputação inicial com os rivais dele.",
    efeito: { efeitoPendente: "Dano extra contra o clã Ironblood (F4) e reputação com os rivais (F7)." },
    gancho: "Cadeia de missões de vingança; o clã reage ao longo do jogo.",
    racasPermitidas: ["anao", "humano", "orc"],
    doAutor: true,
  },
  {
    id: "sobrevivente-do-vazio",
    numero: 3,
    nome: "Sobrevivente do Vazio",
    lore: "Única pessoa a voltar de uma ilha engolida pela escuridão. Não sabe como.",
    efeitoTexto: "Limiar 25% mais curto; Almas Penadas hesitam em atacar primeiro.",
    efeito: {
      modificadores: [mod("duracao-limiar", "percentual", -0.25, "sobrevivente-do-vazio")],
      efeitoPendente: "Almas Penadas hesitam em atacar primeiro (Limiar, F6).",
    },
    gancho: "O que ainda vive no Vazio.",
  },
  {
    id: "orfao-do-templo-cinzento",
    numero: 4,
    nome: "Órfão do Templo Cinzento",
    lore: "Criado por monges de um culto já morto, que lhe ensinaram rezas para um deus sem nome.",
    efeitoTexto: "+Espírito; começa com uma técnica espiritual.",
    efeito: { modificadores: [mod("status.espirito", "somar", 2, "orfao-do-templo-cinzento")] },
    habilidadesIniciais: ["eco-dos-antigos"],
    gancho: "O que o templo guardava.",
  },
  {
    id: "herdeiro-sem-nome",
    numero: 5,
    nome: "Herdeiro sem Nome",
    lore: "Herdeiro de uma casa apagada dos registros do reino. Sem prova, sem terra, com o rosto de um retrato que ninguém reconhece.",
    efeitoTexto: "NPCs de nobreza reagem de forma estranha; +1 vaga de relíquia na mochila de chaves.",
    efeito: { efeitoPendente: "Reações de NPCs nobres (F7) e +1 vaga de relíquia (F8)." },
    gancho: "Reconstruir ou provar a casa.",
    racasPermitidas: ["humano", "elfo", "sangue-palido"],
  },
  {
    id: "a-voz-do-poco",
    numero: 6,
    nome: "A Voz do Poço",
    lore: "Ouve, desde criança, algo no fundo de um poço que ninguém mais ouve. A coisa sabe o nome dele.",
    efeitoTexto: "+Percepção; avisos de eventos raros na Crônica.",
    efeito: {
      modificadores: [mod("status.percepcao", "somar", 2, "a-voz-do-poco")],
      efeitoPendente: "Avisos de eventos raros na Crônica (F11).",
    },
    gancho: "O que fala no poço.",
  },
  {
    id: "o-reencarnado",
    numero: 7,
    nome: "O Reencarnado",
    lore: "Lembra de uma vida anterior, em outro mundo, e age como quem sabe demais para a própria idade.",
    efeitoTexto: "Memória Estranha: um ofício um nível acima; +XP de maestria. Fraqueza: -5% Vigor inicial.",
    efeito: {
      modificadores: [mod("status.vigor", "percentual", -0.05, "o-reencarnado"), mod("xp-maestria", "percentual", 0.1, "o-reencarnado")],
      efeitoPendente: "Um ofício escolhido +1 nível (escolha de ofício ainda não existe).",
    },
    gancho: "Quem foi na outra vida e por que voltou.",
  },
  {
    id: "o-regressor-incompleto",
    numero: 8,
    nome: "O Regressor Incompleto",
    lore: "Voltou no tempo, mas só com pedaços do futuro. Lembra mais das mortes que das vitórias.",
    efeitoTexto: "Pressentimento: alerta extra de risco de morte; evita 1 morte a cada 24 h.",
    efeito: { efeitoPendente: "Alerta de risco nas áreas (F4) e evita 1 morte a cada 24 h de tempo real (F6)." },
    gancho: "O futuro que ele tenta evitar.",
  },
  {
    id: "o-despertado-tardio",
    numero: 9,
    nome: "O Despertado Tardio",
    lore: "Passou a vida inteira sendo o mais fraco da guilda; um dia, algo \"acordou\" nele.",
    efeitoTexto: "Teto de status baixo, mas +XP e +ganho de treino nos primeiros 20 níveis.",
    efeito: {
      modificadores: [mod("teto", "percentual", -0.1, "o-despertado-tardio")],
      temporario: {
        ateNivel: 20,
        modificadores: [mod("xp-personagem", "percentual", 0.5, "o-despertado-tardio"), mod("ganho-treino", "percentual", 0.5, "o-despertado-tardio")],
      },
      efeitoPendente: "Mensagens do \"Sistema\" na Crônica (F11).",
    },
    gancho: "O que despertou e por quê.",
  },
  {
    id: "portador-da-lamina-desperta",
    numero: 10,
    nome: "Portador da Lâmina Desperta",
    lore: "Uma arma que fala e discorda dele em quase tudo. Ninguém sabe quem a forjou.",
    efeitoTexto: "Começa com um item nomeado (arma) que evolui com o personagem.",
    efeito: { efeitoPendente: "Arma nomeada inicial que evolui (F8)." },
    gancho: "A voz da lâmina e seu dono antigo.",
  },
  {
    id: "quebra-ovo",
    numero: 11,
    nome: "Quebra-Ovo",
    lore: "Nasceu de um ovo que ficou 30 anos num altar, e eclodiu no momento exato em que ele chegou.",
    efeitoTexto: "Besta vinculada: um filhote de dragão; escamas leves passivas.",
    efeito: { efeitoPendente: "Escamas leves passivas (F4)." },
    gancho: "O altar e quem o deixou.",
    racasPermitidas: ["draconato"],
    bestaVinculadaId: "filhote-do-altar",
  },
  {
    id: "rejeitado-pelo-rio",
    numero: 12,
    nome: "Rejeitado pelo Rio",
    lore: "Foi entregue ao rio quando criança, como oferenda. O espírito do rio o devolveu: \"ainda não\".",
    efeitoTexto: "Besta vinculada: espírito d'água; bônus em pesca e viagem por rio.",
    efeito: { efeitoPendente: "Bônus em pesca e viagem por rio (F3)." },
    gancho: "O culto que o ofereceu e o que o rio quer.",
    bestaVinculadaId: "espirito-do-rio",
  },
  {
    id: "naufrago-das-estrelas",
    numero: 13,
    nome: "Náufrago das Estrelas",
    lore: "Caiu do céu dentro de um casco de ferro que ninguém sabe nomear. Fala dialetos que não existem.",
    efeitoTexto: "Ferramenta nomeada Bússola Quebrada (revela recursos raros); -5% no preço de compra.",
    efeito: {
      modificadores: [mod("preco-compra", "percentual", -0.05, "naufrago-das-estrelas")],
      efeitoPendente: "Ferramenta nomeada Bússola Quebrada (F3/F8).",
    },
    gancho: "Os outros que caíram.",
  },
  {
    id: "soldado-de-uma-guerra-perdida",
    numero: 14,
    nome: "Soldado de uma Guerra Perdida",
    lore: "Servia num exército que não existe mais. Ainda marcha no sono.",
    efeitoTexto: "Rank inicial da guilda E (em vez de F); +Resistência.",
    efeito: { modificadores: [mod("status.resistencia", "somar", 2, "soldado-de-uma-guerra-perdida")] },
    rankInicial: 1,
    gancho: "Antigos camaradas e quem venceu a guerra.",
  },
  {
    id: "liberto-das-minas-profundas",
    numero: 15,
    nome: "Liberto das Minas Profundas",
    lore: "Passou a vida escavando; saiu quando algo lá embaixo \"o liberou\".",
    efeitoTexto: "Mineração +2 níveis; resistência a escuridão; dia claro cansa mais.",
    efeito: {
      modificadores: [mod("oficio.mineracao.nivel", "somar", 2, "liberto-das-minas-profundas")],
      efeitoPendente: "Resistência a escuridão e cansaço sob dia claro (F11).",
    },
    gancho: "O que ainda vive na mina.",
    racasPermitidas: ["anao", "humano"],
  },
  {
    id: "aprendiz-traido",
    numero: 16,
    nome: "Aprendiz Traído",
    lore: "Foi treinado por uma guilda de assassinos; vendido pelo mestre no dia da formatura.",
    efeitoTexto: "Afinidade furtivo; reputação hostil com a guilda das sombras.",
    efeito: { efeitoPendente: "Afinidade `furtivo` para técnicas (F5) e reputação hostil (F7)." },
    gancho: "A guilda e a traição.",
  },
  {
    id: "cria-da-matilha",
    numero: 17,
    nome: "Cria da Matilha",
    lore: "Criado entre lobos; aprendeu a linguagem deles antes da dos homens.",
    efeitoTexto: "Matilha de lobos como aliados ocasionais em combate; +Agilidade.",
    efeito: {
      modificadores: [mod("status.agilidade", "somar", 2, "cria-da-matilha")],
      efeitoPendente: "Matilha como aliada ocasional em combate (F4).",
    },
    gancho: "A matilha e o homem que a abandonou.",
    racasPermitidas: ["lobisomem", "humano"],
  },
  {
    id: "heroi-falso",
    numero: 18,
    nome: "Herói Falso",
    lore: "Uma lenda inventada o transformou em herói. Todo mundo acredita. Ele acha graça, mas está com medo.",
    efeitoTexto: "Reputação inicial alta com NPCs; eventos de \"provar a lenda\".",
    efeito: { efeitoPendente: "Reputação inicial alta (F7) e eventos de \"provar a lenda\" (F11)." },
    gancho: "A mentira e quem a inventou.",
  },
  {
    id: "aprendiz-do-mago-morto",
    numero: 19,
    nome: "Aprendiz do Mago Morto",
    lore: "O mestre morreu no meio de uma aula, deixando uma torre cheia de feitiços inacabados.",
    efeitoTexto: "Começa com uma habilidade Rara parcial; maestria +; fraqueza: pouca vida.",
    efeito: {
      modificadores: [mod("xp-maestria", "percentual", 0.15, "aprendiz-do-mago-morto"), mod("vida", "percentual", -0.1, "aprendiz-do-mago-morto")],
      efeitoPendente: "Habilidade Rara parcial (livros raros chegam depois).",
    },
    gancho: "A torre e o último feitiço do mestre.",
    racasPermitidas: ["humano", "elfo", "sangue-palido"],
  },
  {
    id: "devedor-do-barqueiro",
    numero: 20,
    nome: "Devedor do Barqueiro",
    lore: "Morreu bebê e foi devolvido pelo Barqueiro Sem Rosto, que anotou o favor.",
    efeitoTexto: "A primeira saída do Limiar é sem pedágio; Eco da Morte decai mais rápido.",
    efeito: { efeitoPendente: "Primeira saída do Limiar sem pedágio e Eco da Morte mais curto (F6)." },
    gancho: "A cobrança do Barqueiro.",
  },
  {
    id: "campeao-descartado",
    numero: 21,
    nome: "Campeão Descartado",
    lore: "Ex-campeão de uma arena que o descartou quando perdeu a utilidade. Quer voltar.",
    efeitoTexto: "Bônus em Campo de Provas; ranking inicial da Arena acima do padrão.",
    efeito: { efeitoPendente: "Bônus no Campo de Provas e ranking inicial maior (F12)." },
    gancho: "A arena e quem lucrou com ele.",
  },
  {
    id: "filho-do-ferreiro-maldito",
    numero: 22,
    nome: "Filho do Ferreiro Maldito",
    lore: "O pai forjou algo que não devia. A família paga desde então.",
    efeitoTexto: "Forja +2 níveis; martelo nomeado inicial; eventos de maldição.",
    efeito: {
      modificadores: [mod("oficio.forja.nivel", "somar", 2, "filho-do-ferreiro-maldito")],
      efeitoPendente: "Martelo nomeado inicial (F8) e eventos de maldição (F11).",
    },
    gancho: "O que o pai forjou.",
  },
];

export const ORIGENS_ESPECIAIS: readonly OrigemEspecial[] = ESPECIAIS.map((o) => ({
  ...o,
  racasPermitidas: o.racasPermitidas ?? [],
  doAutor: o.doAutor ?? false,
}));

/** Berços da origem comum, com o bônus de ofício inicial como dado (não aplicado na F1). */
export const BERCOS: readonly Berco[] = [
  { id: "vila-rural", nome: "Vila rural", frase: "uma vila rural", bonusTexto: "Fazendeiro +1 nível", efeito: { modificadores: [mod("oficio.agricultura.nivel", "somar", 1, "vila-rural")] } },
  { id: "porto-de-pescadores", nome: "Porto de pescadores", frase: "um porto de pescadores", bonusTexto: "Pescador +1 nível", efeito: { modificadores: [mod("oficio.pesca.nivel", "somar", 1, "porto-de-pescadores")] } },
  { id: "vila-de-mineradores", nome: "Vila de mineradores", frase: "uma vila de mineradores", bonusTexto: "Minerador +1 nível", efeito: { modificadores: [mod("oficio.mineracao.nivel", "somar", 1, "vila-de-mineradores")] } },
  { id: "clareira-de-lenhadores", nome: "Clareira de lenhadores", frase: "uma clareira de lenhadores", bonusTexto: "Lenhador +1 nível", efeito: { modificadores: [mod("oficio.lenhador.nivel", "somar", 1, "clareira-de-lenhadores")] } },
  { id: "mosteiro-de-aldeia", nome: "Mosteiro de aldeia", frase: "um mosteiro de aldeia", bonusTexto: "+5% XP de maestria", efeito: { modificadores: [mod("xp-maestria", "percentual", 0.05, "mosteiro-de-aldeia")] } },
  { id: "cortico-da-capital", nome: "Cortiço da capital", frase: "um cortiço da capital", bonusTexto: "+3% no preço de venda", efeito: { modificadores: [mod("preco-venda", "percentual", 0.03, "cortico-da-capital")] } },
  { id: "acampamento-nomade", nome: "Acampamento nômade", frase: "um acampamento nômade", bonusTexto: "Viagem 10% mais curta", efeito: { modificadores: [mod("duracao-viagem", "percentual", -0.1, "acampamento-nomade")] } },
  { id: "oficina-de-ferreiro", nome: "Oficina de ferreiro", frase: "uma oficina de ferreiro", bonusTexto: "Forja +1 nível", efeito: { modificadores: [mod("oficio.forja.nivel", "somar", 1, "oficina-de-ferreiro")] } },
  { id: "taverna-de-estrada", nome: "Taverna de estrada", frase: "uma taverna de estrada", bonusTexto: "Culinária +1 nível", efeito: { modificadores: [mod("oficio.culinaria.nivel", "somar", 1, "taverna-de-estrada")] } },
  { id: "aldeia-a-beira-do-limiar", nome: "Aldeia à beira do Limiar", frase: "uma aldeia à beira do Limiar", bonusTexto: "Limiar 5% mais curto", efeito: { modificadores: [mod("duracao-limiar", "percentual", -0.05, "aldeia-a-beira-do-limiar")] } },
];

export const MOTIVACOES: readonly Motivacao[] = [
  { id: "renome", nome: "Renome", frase: "em busca de renome" },
  { id: "divida", nome: "Dívida", frase: "atrás de pagar uma dívida que não é sua" },
  { id: "curiosidade", nome: "Curiosidade", frase: "por pura curiosidade" },
  { id: "fugir-do-passado", nome: "Fugir do passado", frase: "fugindo do próprio passado" },
  { id: "proteger-alguem", nome: "Proteger alguém", frase: "para proteger alguém que ficou para trás" },
  { id: "provar-se", nome: "Provar-se", frase: "para provar que vale alguma coisa" },
  { id: "riqueza", nome: "Riqueza", frase: "atrás de riqueza" },
  { id: "fe", nome: "Fé", frase: "seguindo uma fé que poucos entendem" },
  { id: "vinganca", nome: "Vingança", frase: "com uma vingança por cumprir" },
  { id: "sem-rumo", nome: "Sem rumo", frase: "sem rumo nenhum" },
];

/** Marca opcional da origem comum: só sabor (Crônica e eventos). */
export const MARCAS_ORIGEM: readonly MarcaOrigem[] = [
  { id: "cicatriz-desconhecida", nome: "Cicatriz de origem desconhecida", frase: "Carrega uma cicatriz que não sabe de onde veio." },
  { id: "nome-falso", nome: "Nome falso", frase: "O nome que usa não é o de nascimento." },
  { id: "sonho-recorrente", nome: "Sonho recorrente", frase: "Sonha toda noite com a mesma porta fechada." },
  { id: "inimigo-sem-rosto", nome: "Inimigo sem rosto", frase: "Um inimigo sem rosto segue seus passos." },
  { id: "promessa-antiga", nome: "Promessa antiga", frase: "Deve uma promessa antiga a alguém que talvez já tenha morrido." },
];

/** Traço de personalidade: detalhe final da cascata, puramente narrativo (Crônica). */
export const TRACOS_PERSONALIDADE: readonly TracoPersonalidade[] = [
  { id: "desconfiado", nome: "Desconfiado", descricao: "Conta as moedas duas vezes, inclusive as próprias." },
  { id: "otimista-teimoso", nome: "Otimista teimoso", descricao: "Acha que vai dar certo. Quase nunca dá." },
  { id: "calado", nome: "Calado", descricao: "Fala pouco e lembra de tudo." },
  { id: "falastrao", nome: "Falastrão", descricao: "Conta a mesma história, cada vez maior." },
  { id: "curioso", nome: "Curioso", descricao: "Abre portas que deveriam continuar fechadas." },
  { id: "ranzinza", nome: "Ranzinza", descricao: "Reclama de tudo, mas nunca abandona ninguém." },
  { id: "supersticioso", nome: "Supersticioso", descricao: "Carrega três amuletos e não confia em nenhum." },
  { id: "gentil", nome: "Gentil", descricao: "Divide a comida até com quem tentou roubá-la." },
  { id: "orgulhoso", nome: "Orgulhoso", descricao: "Prefere perder a pedir ajuda." },
  { id: "sarcastico", nome: "Sarcástico", descricao: "Tem uma piada pronta até no próprio velório." },
  { id: "metodico", nome: "Metódico", descricao: "Tudo tem lugar, inclusive o medo." },
  { id: "impulsivo", nome: "Impulsivo", descricao: "Age primeiro e pensa no Limiar." },
];
