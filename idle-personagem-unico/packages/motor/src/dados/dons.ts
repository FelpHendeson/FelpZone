/**
 * Dons de raça (GDD §3.1) [Proposta]: 13 por raça — 5 Incomum, 4 Raro,
 * 2 Épico, 1 Ancestral, 1 Primordial. Efeitos dependem de sistemas futuros
 * e ficam em `efeitoPendente` (não aplicados na F1).
 */
import type { DomRaca, RaridadeDom } from "./tipos";

type Linha = readonly [id: string, nome: string, descricao: string];
type TabelaRaca = Readonly<Record<RaridadeDom, readonly Linha[]>>;

const TABELAS: Readonly<Record<string, TabelaRaca>> = {
  humano: {
    incomum: [
      ["olho-de-mercador", "Olho de Mercador", "Vende um pouco mais caro aos estabelecimentos."],
      ["sono-leve", "Sono Leve", "Descanso rende mais em menos tempo."],
      ["mao-de-oficio", "Mão de Ofício", "Começa com um ofício de produção um nível acima."],
      ["fala-mansa", "Fala Mansa", "NPCs dão recompensas de missão um pouco maiores."],
      ["pes-calejados", "Pés Calejados", "Viagens cansam menos e duram um pouco menos."],
    ],
    raro: [
      ["segundo-folego", "Segundo Fôlego", "Uma vez por combate, recupera parte da vida ao ficar quase sem."],
      ["aprendiz-eterno", "Aprendiz Eterno", "Maestria de técnicas novas sobe mais rápido nos primeiros níveis."],
      ["estrela-da-guilda", "Estrela da Guilda", "Ganha mais Mérito em missões da guilda."],
      ["sangue-de-pioneiro", "Sangue de Pioneiro", "Descobre locais novos do mapa mais cedo."],
    ],
    epico: [
      ["coracao-indomavel", "Coração Indomável", "Imune a medo; ganha ataque contra inimigos de nível maior."],
      ["mil-oficios", "Mil Ofícios", "Todos os ofícios ganham um pouco de XP quando qualquer um sobe."],
    ],
    ancestral: [["herdeiro-dos-reis-antigos", "Herdeiro dos Reis Antigos", "Títulos e reputação rendem bônus maiores."]],
    primordial: [["centelha-humana", "Centelha Humana", "O teto de todos os status sobe um pouco a cada 10 níveis."]],
  },
  anao: {
    incomum: [
      ["barba-de-ferro", "Barba de Ferro", "Resiste melhor a golpes na cabeça (atordoamento)."],
      ["ouvido-de-tunel", "Ouvido de Túnel", "Ouve veios de minério raro mais longe."],
      ["estomago-de-pedra", "Estômago de Pedra", "Comidas e poções duram mais."],
      ["punho-de-martelo", "Punho de Martelo", "Ataques com martelo e maça causam um pouco mais de dano."],
      ["teimoso-como-rocha", "Teimoso como Rocha", "Resiste a empurrões e lentidão."],
    ],
    raro: [
      ["runa-de-familia", "Runa de Família", "Equipamento forjado por você ganha uma runa menor."],
      ["sangue-de-forja", "Sangue de Forja", "Resiste a fogo e trabalha mais rápido na forja."],
      ["memoria-da-montanha", "Memória da Montanha", "Nunca se perde em cavernas; caminhos subterrâneos mais curtos."],
      ["juramento-de-escudo", "Juramento de Escudo", "Bloqueia mais com escudo."],
    ],
    epico: [
      ["coracao-de-bigorna", "Coração de Bigorna", "Quanto mais apanha, mais resistente fica no combate."],
      ["mestre-de-veios", "Mestre de Veios", "Chance de minério de tier acima ao minerar."],
    ],
    ancestral: [["voz-dos-primeiros-ferreiros", "Voz dos Primeiros Ferreiros", "Fusões têm menos chance de falha."]],
    primordial: [["filho-da-montanha-viva", "Filho da Montanha Viva", "A pedra se move para protegê-lo: escudo de pedra automático em perigo."]],
  },
  elfo: {
    incomum: [
      ["olhos-de-gaviao", "Olhos de Gavião", "Mais alcance e crítico com arcos."],
      ["passo-sem-rastro", "Passo sem Rastro", "Monstros demoram mais a notar você."],
      ["mao-verde", "Mão Verde", "Colheita rende mais."],
      ["sono-de-arvore", "Sono de Árvore", "Recupera mana descansando ao ar livre."],
      ["lingua-antiga", "Língua Antiga", "Entende inscrições antigas em ruínas."],
    ],
    raro: [
      ["cancao-do-bosque", "Canção do Bosque", "Bestas da floresta hesitam em atacar."],
      ["flecha-de-lua", "Flecha de Lua", "Disparos à noite atravessam defesas."],
      ["memoria-de-seculos", "Memória de Séculos", "Técnicas arcanas sobem de maestria mais rápido."],
      ["raiz-profunda", "Raiz Profunda", "Recupera vida devagar quando parado na natureza."],
    ],
    epico: [
      ["coroa-de-folhas", "Coroa de Folhas", "Plantas raras brotam por onde passa."],
      ["olhar-das-estrelas", "Olhar das Estrelas", "Vê o clima e eventos raros antes de acontecerem."],
    ],
    ancestral: [["sangue-da-primeira-arvore", "Sangue da Primeira Árvore", "Regenera vida e mana constantemente em áreas naturais."]],
    primordial: [["eco-do-mundo-jovem", "Eco do Mundo Jovem", "Uma vez por dia, reinicia a recarga de todas as técnicas."]],
  },
  orc: {
    incomum: [
      ["pele-grossa", "Pele Grossa", "Recebe um pouco menos de dano físico."],
      ["brado-de-guerra", "Brado de Guerra", "O primeiro golpe do combate atordoa por um instante."],
      ["fome-de-batalha", "Fome de Batalha", "Recupera vida ao abater um inimigo."],
      ["ombros-de-touro", "Ombros de Touro", "Carrega mais peso na mochila."],
      ["faro-de-saque", "Faro de Saque", "Um pouco mais de chance de drop."],
    ],
    raro: [
      ["sangue-fervente", "Sangue Fervente", "A Fúria Ancestral ativa um pouco mais cedo."],
      ["cicatrizes-que-contam", "Cicatrizes que Contam", "Cada morte no Limiar dá um pouco de resistência permanente."],
      ["machado-dos-avos", "Machado dos Avós", "Mais dano com machados."],
      ["grito-que-racha", "Grito que Racha", "Reduz a defesa de inimigos próximos."],
    ],
    epico: [
      ["furia-sem-fim", "Fúria sem Fim", "A fúria não acaba enquanto houver inimigos."],
      ["coracao-de-fera", "Coração de Fera", "Regeneração rápida fora de combate."],
    ],
    ancestral: [["chamado-dos-clas-mortos", "Chamado dos Clãs Mortos", "Espíritos de guerreiros lutam ao seu lado por alguns segundos."]],
    primordial: [["o-primeiro-grito", "O Primeiro Grito", "Inimigos de nível menor podem fugir de medo no início do combate."]],
  },
  lobisomem: {
    incomum: [
      ["faro-de-cacador", "Faro de Caçador", "Encontra monstros raros com mais frequência."],
      ["pelagem-densa", "Pelagem Densa", "Resiste a frio e a cortes leves."],
      ["uivo-de-alerta", "Uivo de Alerta", "Avisa antes de um golpe forte inimigo."],
      ["garras-afiadas", "Garras Afiadas", "Ataques desarmados causam sangramento."],
      ["corrida-de-caca", "Corrida de Caça", "Viaja mais rápido à noite."],
    ],
    raro: [
      ["matilha-fantasma", "Matilha Fantasma", "Invoca ecos de lobo no combate."],
      ["mordida-que-prende", "Mordida que Prende", "Chance de imobilizar o alvo por um instante."],
      ["sangue-de-lua", "Sangue de Lua", "Status físicos sobem um pouco em noites claras."],
      ["rastro-eterno", "Rastro Eterno", "Nunca perde um alvo ferido; mais dano contra quem foge."],
    ],
    epico: [
      ["lua-cheia-plena", "Lua Cheia Plena", "Na lua cheia, transforma-se por completo: grande aumento de força e velocidade."],
      ["alfa", "Alfa", "Pets do tipo fera ficam mais fortes ao seu lado."],
    ],
    ancestral: [["o-lobo-antes-do-homem", "O Lobo antes do Homem", "Regenera membros: recupera vida a cada abate e resiste a efeitos de controle."]],
    primordial: [["primeira-presa", "Primeira Presa", "Dano enorme contra a primeira espécie abatida a cada dia."]],
  },
  "sangue-palido": {
    incomum: [
      ["olhos-de-breu", "Olhos de Breu", "Enxerga perfeitamente no escuro."],
      ["toque-frio", "Toque Frio", "Ataques reduzem um pouco a velocidade do alvo."],
      ["sede-contida", "Sede Contida", "O roubo de vida funciona um pouco também de dia."],
      ["passos-de-neblina", "Passos de Neblina", "Mais esquiva à noite."],
      ["voz-hipnotica", "Voz Hipnótica", "Preços melhores com NPCs à noite."],
    ],
    raro: [
      ["sangue-antigo", "Sangue Antigo", "Roubo de vida maior contra criaturas vivas."],
      ["manto-de-morcegos", "Manto de Morcegos", "Uma vez por combate, desvia de um golpe fatal."],
      ["pacto-noturno", "Pacto Noturno", "Atividades feitas à noite rendem mais."],
      ["mente-de-cristal", "Mente de Cristal", "Resiste a efeitos mentais."],
    ],
    epico: [
      ["senhor-do-crepusculo", "Senhor do Crepúsculo", "Ao entardecer e ao amanhecer, ignora a fraqueza à luz do dia."],
      ["banquete-rubro", "Banquete Rubro", "Abates restauram mana e vida de uma vez."],
    ],
    ancestral: [["herdeiro-da-primeira-noite", "Herdeiro da Primeira Noite", "Sombras próximas curam você lentamente."]],
    primordial: [["a-noite-eterna", "A Noite Eterna", "Uma vez por dia, faz a noite cair na sua área por um tempo."]],
  },
  draconato: {
    incomum: [
      ["escama-endurecida", "Escama Endurecida", "Mais defesa física."],
      ["bafo-quente", "Bafo Quente", "Ataque básico causa um pouco de dano de fogo."],
      ["olhar-de-ouro", "Olhar de Ouro", "Encontra mais gold em drops."],
      ["cauda-forte", "Cauda Forte", "Chance de derrubar inimigos pequenos."],
      ["sangue-morno", "Sangue Morno", "Imune a frio leve."],
    ],
    raro: [
      ["sopro-de-brasa", "Sopro de Brasa", "Técnica de sopro em área, com recarga longa."],
      ["asas-atrofiadas", "Asas Atrofiadas", "Planeia: sem dano de queda e viagens curtas mais rápidas."],
      ["cobica-do-tesouro", "Cobiça do Tesouro", "Mais chance de itens raros, mas a mochila pesa mais."],
      ["escamas-de-brasa", "Escamas de Brasa", "Quem o ataca corpo a corpo se queima."],
    ],
    epico: [
      ["coracao-de-dragao", "Coração de Dragão", "O teto de Força e Espírito sobe mais por nível."],
      ["rugido-antigo", "Rugido Antigo", "Reduz o ataque de todos os inimigos por alguns segundos."],
    ],
    ancestral: [["memoria-da-ninhada", "Memória da Ninhada", "Dragões e bestas dracônicas o reconhecem como parente."]],
    primordial: [["o-primeiro-fogo", "O Primeiro Fogo", "Suas técnicas de fogo ignoram resistência elemental."]],
  },
  silfo: {
    incomum: [
      ["pes-de-pluma", "Pés de Pluma", "Atravessa terreno difícil sem perder velocidade."],
      ["sopro-leve", "Sopro Leve", "Mais esquiva contra projéteis."],
      ["ouvido-do-vento", "Ouvido do Vento", "Sabe do clima antes de mudar."],
      ["dedos-rapidos", "Dedos Rápidos", "Coleta um pouco mais rápido."],
      ["riso-de-brisa", "Riso de Brisa", "Um pouco mais de Sorte em eventos."],
    ],
    raro: [
      ["corrente-ascendente", "Corrente Ascendente", "Salta sobre inimigos e ataca pelas costas."],
      ["voz-do-vendaval", "Voz do Vendaval", "Técnicas de vento causam mais dano."],
      ["olho-da-tempestade", "Olho da Tempestade", "Fica mais rápido durante tempestades."],
      ["corpo-de-nevoa", "Corpo de Névoa", "Chance de golpes físicos o atravessarem."],
    ],
    epico: [
      ["danca-dos-ventos", "Dança dos Ventos", "Cada esquiva aumenta a velocidade de ataque por um tempo."],
      ["filho-do-ceu-aberto", "Filho do Céu Aberto", "Viagens entre locais quase instantâneas."],
    ],
    ancestral: [["primeiro-sopro", "Primeiro Sopro", "Recupera mana sempre que o vento muda."]],
    primordial: [["o-vento-que-nao-volta", "O Vento que Não Volta", "Uma vez por dia, age duas vezes seguidas em tudo por alguns segundos."]],
  },
};

function montar(): DomRaca[] {
  const lista: DomRaca[] = [];
  for (const [racaId, tabela] of Object.entries(TABELAS)) {
    for (const raridade of ["incomum", "raro", "epico", "ancestral", "primordial"] as const) {
      for (const [id, nome, descricao] of tabela[raridade]) {
        lista.push({ id: `${racaId}-${id}`, racaId, nome, raridade, descricao, efeito: { efeitoPendente: descricao } });
      }
    }
  }
  return lista;
}

export const DONS: readonly DomRaca[] = montar();
