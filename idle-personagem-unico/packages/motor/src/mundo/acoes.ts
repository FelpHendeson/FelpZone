/** Ações do mundo vivo (F11): responder a um evento. */
import { CATALOGO } from "../dados";
import { EVENTOS } from "../dados/mundo";
import { capacidadeDe, comAtivo, erro, type ResultadoAtividade } from "../atividades/acoes";
import { ganhosZerados } from "../atividades/ciclos";
import { adicionarItens, removerItens } from "../personagem/mochila";
import { aplicarXp, fator, modificadoresDoPersonagem } from "../personagem/progressao";
import type { Personagem } from "../personagem/conta";
import type { EstadoJogo } from "../save";
import { registrarNaCronica } from "./mundo";

function darXp(p: Personagem, quanto: number): Personagem {
  const status = { ...p.status };
  const r = aplicarXp(p, p.nivel, p.xp, quanto * fator(modificadoresDoPersonagem(p, p.nivel), "xp-personagem"), status, ganhosZerados());
  return { ...p, nivel: r.nivel, xp: r.xp, status };
}

/** Responde a um evento pendente com a escolha 0 ou 1. O resultado entra na Crônica. */
export function resolverEvento(estado: EstadoJogo, n: number, escolha: 0 | 1, agora: number): ResultadoAtividade {
  return comAtivo(estado, agora, (p) => {
    const pend = p.eventos.pendentes.find((x) => x.n === n);
    if (!pend) return erro("evento_inexistente", "Esse evento já passou.");
    const ev = EVENTOS.find((x) => x.id === pend.eventoId)!;
    const e = ev.escolhas[escolha]!;
    let q: Personagem = p;
    const ef = e.efeito;
    switch (ef.tipo) {
      case "nada":
        break;
      case "xp":
        q = darXp(q, ef.porNivel * q.nivel);
        break;
      case "ouro":
        q = { ...q, ouro: q.ouro + ef.porNivel * q.nivel };
        break;
      case "perderOuro":
        q = { ...q, ouro: q.ouro - Math.floor(q.ouro * ef.fracao) };
        break;
      case "darComida": {
        const comida = Object.keys(q.mochila).find((id) => CATALOGO.itens.get(id)?.consumivel?.tipo === "comida");
        if (!comida) return erro("sem_comida", "Você não tem comida na mochila.");
        q = darXp({ ...q, mochila: removerItens(q.mochila, comida, 1) }, ef.xpPorNivel * q.nivel);
        break;
      }
      case "lutar":
        q = { ...q, vida: Math.max(0.05, q.vida - ef.perdaVida), ouro: q.ouro + ef.ouroPorNivel * q.nivel };
        break;
      case "comprar": {
        if (q.ouro < ef.preco) return erro("ouro_insuficiente", `Custa ${ef.preco} de gold.`);
        const r = adicionarItens(q.mochila, ef.itemId, 1, capacidadeDe(q));
        if (r.aceitos === 0) return erro("mochila_cheia", "Não há espaço na mochila.");
        q = { ...q, ouro: q.ouro - ef.preco, mochila: r.mochila };
        break;
      }
    }
    q = { ...q, eventos: { ...q.eventos, pendentes: q.eventos.pendentes.filter((x) => x.n !== n) } };
    return registrarNaCronica(q, agora, `${ev.titulo}: ${e.resultado}`);
  }, true);
}
