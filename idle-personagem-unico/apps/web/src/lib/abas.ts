/** Os seis destinos do GDD §16: barra inferior mobile, lateral desktop e sub-abas. */
export interface Aba {
  readonly id: string;
  readonly rotulo: string;
  readonly icone: string;
  readonly subAbas: readonly string[];
}

export const ABAS: readonly Aba[] = [
  { id: "atividades", rotulo: "Atividades", icone: "⚒", subAbas: ["Treino", "Coleta", "Produção", "Aprendizado", "Pets"] },
  { id: "combate", rotulo: "Combate", icone: "⚔", subAbas: ["Áreas", "Bestiário", "O Limiar", "Arena", "Provas", "Torneio"] },
  { id: "mapa", rotulo: "Mapa", icone: "🗺", subAbas: ["Região", "Local atual", "Estabelecimentos"] },
  {
    id: "mochila",
    rotulo: "Mochila",
    icone: "🎒",
    subAbas: ["Equipados", "Equipáveis", "Ferramentas", "Materiais", "Consumíveis", "Nomeados"],
  },
  { id: "missoes", rotulo: "Missões", icone: "📜", subAbas: ["NPC", "Metas", "Guilda", "História"] },
  { id: "personagem", rotulo: "Personagem", icone: "👤", subAbas: ["Status", "Habilidades", "Pets", "Títulos", "Crônica", "Conta"] },
];
