import { CONFIG_PROGRESSAO, NOME_STATUS, STATUS, faixas, modificadoresDoPersonagem, valorEfetivo, xpParaProximoNivel, type Personagem } from "@idle-pu/motor";
import { combateDe, formatarNumero } from "@/lib/atividade";
import { BarraVida } from "./BarraVida";

/** Nível, XP e os 8 status com a faixa piso → teto (GDD §5). */
export function PainelStatus({ personagem: p }: { personagem: Personagem }) {
  const mods = modificadoresDoPersonagem(p, p.nivel);
  const f = faixas(p.racaId, p.nivel, mods);
  const proximo = xpParaProximoNivel(p.nivel);
  const noMaximo = p.nivel >= CONFIG_PROGRESSAO.nivelMaximo;
  return (
    <section className="cartao painel-status" aria-label="Status">
      <div className="nivel-linha">
        <h3>Nível {p.nivel}</h3>
        <span className="suave">{noMaximo ? "Nível máximo do Ato I" : `${formatarNumero(Math.floor(p.xp), 0)} / ${formatarNumero(proximo, 0)} XP`}</span>
      </div>
      {!noMaximo && (
        <div className="progresso" role="progressbar" aria-label="XP até o próximo nível" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((p.xp / proximo) * 100)}>
          <div className="progresso-preenchido progresso-xp" style={{ width: `${(p.xp / proximo) * 100}%` }} />
        </div>
      )}
      {(() => {
        const sc = combateDe(p);
        return (
          <div className="bloco-combate">
            <BarraVida atual={p.vida * sc.vidaMax} maxima={sc.vidaMax} rotulo="Vida" />
            <p className="suave">
              Ataque {formatarNumero(sc.ataque, 1)} · Defesa {formatarNumero(sc.defesa, 1)} · {formatarNumero(1000 / sc.intervaloMs, 2)} ataques/s · Esquiva{" "}
              {formatarNumero(sc.esquiva * 100, 1)}% · Crítico {formatarNumero(sc.critico * 100, 1)}%
            </p>
          </div>
        );
      })()}
      <ul className="lista-status">
        {STATUS.map((s) => {
          const { piso, teto } = f[s];
          const valor = p.status[s];
          const efetivo = valorEfetivo(valor, s, mods);
          const pctPiso = (piso / teto) * 100;
          const pctValor = (valor / teto) * 100;
          return (
            <li key={s} className="status-item">
              <div className="status-linha">
                <span>{NOME_STATUS[s]}</span>
                <span>
                  <strong>{formatarNumero(efetivo, 1)}</strong>
                  {Math.abs(efetivo - valor) > 1e-9 && <span className="suave"> (treinado {formatarNumero(valor, 1)})</span>}
                  <span className="suave"> · piso {formatarNumero(piso, 1)} · teto {formatarNumero(teto, 1)}</span>
                </span>
              </div>
              <div
                className="faixa"
                role="meter"
                aria-label={`${NOME_STATUS[s]}: ${formatarNumero(valor, 1)} de ${formatarNumero(teto, 1)}`}
                aria-valuemin={piso}
                aria-valuemax={teto}
                aria-valuenow={valor}
              >
                <div className="faixa-piso" style={{ width: `${pctPiso}%` }} />
                <div className="faixa-valor" style={{ left: `${pctPiso}%`, width: `${Math.max(0, pctValor - pctPiso)}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
