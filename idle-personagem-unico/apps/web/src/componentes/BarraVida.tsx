import { formatarNumero } from "@/lib/atividade";

/** Barra de vida (personagem ou monstro). */
export function BarraVida({ atual, maxima, rotulo, monstro = false }: { atual: number; maxima: number; rotulo: string; monstro?: boolean }) {
  const f = Math.max(0, Math.min(1, atual / maxima));
  return (
    <div className="vida-linha">
      <span className="vida-rotulo">{rotulo}</span>
      <div className="progresso progresso-vida" role="meter" aria-label={`${rotulo}: ${formatarNumero(atual, 0)} de ${formatarNumero(maxima, 0)}`} aria-valuemin={0} aria-valuemax={maxima} aria-valuenow={atual}>
        <div className={`progresso-preenchido ${monstro ? "vida-monstro" : f <= 0.3 ? "vida-baixa" : "vida-ok"}`} style={{ width: `${f * 100}%` }} />
      </div>
      <span className="vida-numero">
        {formatarNumero(atual, 0)}/{formatarNumero(maxima, 0)}
      </span>
    </div>
  );
}
