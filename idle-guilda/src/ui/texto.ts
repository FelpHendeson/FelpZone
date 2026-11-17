import { ARMAS, CLASSES, ZONAS } from '../motor/dados';
import { OBJETIVOS } from '../motor/objetivos';
import type { Estado, Evento } from '../motor/tipos';

export function inteiro(n: number): string {
  return Math.floor(n).toLocaleString('pt-BR');
}

export function compacto(n: number): string {
  if (n < 10) return n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  if (n < 10_000) return inteiro(n);
  return n.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
}

export function duracao(segundos: number): string {
  const s = Math.floor(segundos);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} h ${m.toString().padStart(2, '0')} min`;
  if (m > 0) return `${m} min`;
  return `${s} s`;
}

export function descreverEvento(e: Estado, ev: Evento): string {
  const nome = (id: string) => e.herois.find((h) => h.id === id)?.nome ?? 'Alguém';
  switch (ev.tipo) {
    case 'subiuNivel':
      return `${nome(ev.heroi)} chegou ao nível ${ev.nivel}.`;
    case 'zonaLiberada':
      return `Nova zona liberada: ${ZONAS[ev.zona].nome}!`;
    case 'forjou':
      return `A forja entregou: ${ARMAS[ev.arma].nome}.`;
    case 'contratou':
      return `${nome(ev.heroi)}, ${CLASSES[ev.classe].nome.toLowerCase()}, entrou para a party.`;
    case 'objetivo':
      return `Objetivo concluído: ${OBJETIVOS[ev.indice]?.titulo ?? ''}.`;
    case 'aplausosRecebidos':
      return `Sua guilda recebeu ${ev.quantidade} ${ev.quantidade === 1 ? 'aplauso' : 'aplausos'} de outros jogadores: +${ev.ouro} de ouro! 👏`;
    case 'aplaudiu':
      return `Você aplaudiu a guilda de ${ev.apelido} e ganhou ${ev.ouro} de ouro.`;
  }
}

const NOMES = ['Aren', 'Lia', 'Bram', 'Nim', 'Tavi', 'Ossa', 'Rune', 'Kael', 'Mira', 'Dov', 'Iska', 'Pell', 'Yara', 'Fenn'];

export function nomeAleatorio(usados: string[] = []): string {
  const livres = NOMES.filter((n) => !usados.includes(n));
  const lista = livres.length ? livres : NOMES;
  return lista[Math.floor(Math.random() * lista.length)];
}
