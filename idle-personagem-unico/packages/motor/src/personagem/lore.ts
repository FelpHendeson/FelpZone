/** Texto da origem: gerado por modelo (comum) ou escrito à mão (especial). */
import { CATALOGO, obter } from "../dados";
import type { OrigemSorteada } from "../sorteio/cascata";
import type { OrigemPersonagem } from "./conta";
import { Rng } from "../rng";

const MEMORIAS: Readonly<Record<string, readonly [string, string]>> = {
  "vila-rural": ["Na infância, aprendeu a ler a chuva pelo cheiro da terra.", "O primeiro trabalho foi salvar a colheita de uma geada que ninguém previu."],
  "porto-de-pescadores": ["Aprendeu a costurar velas antes de aprender a escrever.", "Ainda lembra de acender a lanterna do cais nas madrugadas sem lua."],
  "vila-de-mineradores": ["Aprendeu a distinguir o som do ferro do aviso de uma galeria prestes a ceder.", "Cresceu contando as lanternas dos mineiros até que a última voltasse para casa."],
  "clareira-de-lenhadores": ["Guardava os nomes das árvores poupadas quando a madeira era pouca.", "Aprendeu a marcar o caminho de volta sem ferir a casca das árvores."],
  "mosteiro-de-aldeia": ["No mosteiro, restaurava livros cuja tinta já virava pó.", "Durante anos, o sino do amanhecer anunciava o começo de um turno na cozinha."],
  "cortico-da-capital": ["Levava recados pelos telhados quando a guarda fechava as ruas.", "Aprendeu a negociar no mercado levando pão e voltando com lenha."],
  "acampamento-nomade": ["Aprendeu a montar o abrigo antes que o resto da caravana avistasse a tempestade.", "Entre uma parada e outra, desenhava os caminhos à luz da fogueira."],
  "oficina-de-ferreiro": ["A primeira peça feita sem ajuda foi um prego torto ainda guardado na oficina.", "Descobriu pelo som da bigorna quando o ferro já podia voltar ao fogo."],
  "taverna-de-estrada": ["Aprendeu a cozinhar ouvindo as versões de quem chegava pela mesma estrada.", "De tanto servir viajantes, decorou caminhos que só muito depois pôde percorrer."],
  "aldeia-a-beira-do-limiar": ["Na aldeia, ajudava a manter uma lamparina acesa para quem se perdesse na neblina.", "Aprendeu cedo a fazer companhia a quem esperava uma volta improvável."],
};

const GANCHOS: Readonly<Record<string, readonly [string, string]>> = {
  renome: ["Espera ouvir seu nome numa história contada por outra pessoa.", "Quer voltar com uma história boa o bastante para interromper o barulho da praça."],
  divida: ["Guarda um recibo incompleto e anota cada pagamento no verso.", "Perto de Pedravau, soube que o credor trocou de endereço sem avisar."],
  curiosidade: ["Carrega um caderno de perguntas e dedica uma página a cada estrada.", "Procura alguém que saiba explicar os marcos apagados no caminho de Pedravau."],
  "fugir-do-passado": ["Esconde as cartas antigas no fundo da mochila, longe da vista dos outros.", "Volta pelo caminho longo quando reconhece uma voz do outro lado da rua."],
  "proteger-alguem": ["Escreve sempre que encontra um mensageiro de confiança.", "Guarda parte de cada pagamento para a casa de quem ficou."],
  "provar-se": ["Ainda leva consigo a ferramenta da primeira tarefa que terminou sem ajuda.", "Mantém em segredo uma lista do que pretende aprender em Pedravau."],
  riqueza: ["Conhece o preço de uma noite de abrigo em cada parada da estrada.", "O primeiro plano é juntar o bastante para comprar o próprio teto."],
  fe: ["Dobra nas cartas um pequeno trecho da oração que aprendeu antes de partir.", "Em cada parada, pergunta pelos costumes de quem acende velas à beira da estrada."],
  vinganca: ["Carrega uma descrição incompleta e começa a duvidar de quem a escreveu.", "Perto de Pedravau, apareceu a primeira pista que não veio por boato."],
  "sem-rumo": ["Pretendia passar uma noite em Pedravau. No dia seguinte, ainda queria ficar.", "Viaja até a próxima ponte e toma a decisão seguinte quando chega."],
};

/** Monta a lore da origem. Sem nome (durante o sorteio), a frase começa pelo verbo. */
export function gerarLoreOrigem(origem: OrigemSorteada, racaId: string, nome: string | null): string {
  if (origem.tipo === "especial") return obter(CATALOGO.origensEspeciais, origem.id).lore;
  const berco = obter(CATALOGO.bercos, origem.bercoId);
  const motivacao = obter(CATALOGO.motivacoes, origem.motivacaoId);
  const raca = obter(CATALOGO.racas, racaId);
  const inicio = nome ? `${nome} vem de` : "Vem de";
  const anos = origem.anosDeEstrada === 1 ? "1 ano" : `${origem.anosDeEstrada} anos`;
  // Para povos longevos, poucos anos de estrada são quase nada (ORIGENS.md §1).
  const longevo = raca.longeva && origem.anosDeEstrada <= 15 ? ", quase nada para um povo tão longevo," : "";
  const marca = origem.marcaId ? ` ${obter(CATALOGO.marcasOrigem, origem.marcaId).frase}` : "";
  const rng = Rng.daSemente(`lore:${racaId}:${origem.bercoId}:${origem.motivacaoId}:${origem.anosDeEstrada}:${origem.marcaId ?? ""}`);
  const memoria = MEMORIAS[berco.id]![rng.inteiro(0, 1)];
  const gancho = GANCHOS[motivacao.id]![rng.inteiro(0, 1)];
  return `${inicio} ${berco.frase}. ${memoria} Há ${anos} na estrada${longevo} ${motivacao.frase}. ${gancho}${marca}`;
}

export function expandirLoreComum(origem: OrigemPersonagem, racaId: string, nome: string): OrigemPersonagem {
  if (origem.tipo === "especial") return origem;
  const loreGerada = gerarLoreOrigem({ tipo: "comum", bercoId: origem.id, motivacaoId: origem.motivacaoId, anosDeEstrada: origem.anosDeEstrada, marcaId: origem.marcaId ?? null }, racaId, nome);
  return { ...origem, loreGerada };
}
