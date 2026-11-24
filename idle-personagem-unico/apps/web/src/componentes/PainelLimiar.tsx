import {
  CATALOGO,
  CONFIG_LIMIAR,
  FALAS_BARQUEIRO,
  PECAS_RETORNADO,
  cargasEco,
  custoDoPedagio,
  relogioDoSistema,
  sinergiaLimiar,
  titulosPorMortes,
  type Personagem,
  BONUS_TITULOS,
} from "@idle-pu/motor";
import { formatarDuracao, formatarNumero } from "@/lib/atividade";
import type { Agir } from "./acoes";

interface Props {
  readonly personagem: Personagem;
  readonly ocupado: boolean;
  readonly agir: Agir;
}

/** Combate → O Limiar: a estadia, o Barqueiro, o Eco e O Retornado. */
export function PainelLimiar({ personagem: p, ocupado, agir }: Props) {
  const l = p.limiar;
  const eco = cargasEco(p, relogioDoSistema.agora());
  const sinergia = sinergiaLimiar(p);
  const temPeca = (id: string) => (p.mochila[id] ?? 0) > 0 || Object.values(p.equipados).includes(id);
  const pecasEquipadas = PECAS_RETORNADO.filter((x) => Object.values(p.equipados).includes(x.id)).length;
  const bonus = Math.min(CONFIG_LIMIAR.retornadoBonusMaximo, CONFIG_LIMIAR.retornadoBonusPorMorte * p.mortes);
  const custo = custoDoPedagio(p);
  return (
    <section className="painel" aria-label="O Limiar">
      {l ? (
        <article className="cartao cartao-limiar">
          <h3>Você está no Limiar</h3>
          <p className="suave">Entre a vida e a morte, só se luta. Os monstros acompanham o seu nível; você luta com {formatarNumero(CONFIG_LIMIAR.fatorAtributos * 100, 0)}% do ataque e da defesa.</p>
          <div className="progresso" role="progressbar" aria-label="Tempo no Limiar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((1 - l.restanteMs / l.totalMs) * 100)}>
            <div className="progresso-preenchido progresso-limiar" style={{ width: `${(1 - l.restanteMs / l.totalMs) * 100}%` }} />
          </div>
          <p>
            Volta em <strong>{formatarDuracao(l.restanteMs)}</strong>
            {l.retorno && <> e retoma {CATALOGO.atividades.get(l.retorno.id)?.nome ?? "o que fazia"}</>}.
          </p>
          <p className="suave">Eco da Morte na entrada: {l.cargasEco} {l.cargasEco === 1 ? "carga" : "cargas"} (drops ×{formatarNumero(1 + CONFIG_LIMIAR.ecoDropsPorCarga * l.cargasEco, 2)}).</p>
          <div className="barqueiro">
            <h4>O Barqueiro Sem Rosto</h4>
            <p className="fala">“{FALAS_BARQUEIRO[Math.floor(l.restanteMs / 60_000) % FALAS_BARQUEIRO.length]}”</p>
            <p>
              Pedágio para sair agora: <strong>{custo === 0 ? "nada (ele lembra do favor)" : `${formatarNumero(custo, 0)} de Essência`}</strong>. Você tem {formatarNumero(p.essencia, 0)}.
            </p>
            <div className="acoes">
              <button type="button" className="botao botao-principal" disabled={ocupado || p.essencia < custo} onClick={() => agir({ tipo: "pagarPedagio" })}>
                Pagar e sair
              </button>
            </div>
          </div>
        </article>
      ) : (
        <article className="cartao">
          <h3>O Limiar</h3>
          <p className="suave">
            Morrer não acaba com nada: o personagem atravessa para o Limiar e luta lá por um tempo ({formatarDuracao(CONFIG_LIMIAR.duracaoBaseMs)} mais o perigo da área). Depois volta a Pedravau e retoma o que fazia. Use o recuo
            para não morrer.
          </p>
        </article>
      )}

      <article className="cartao">
        <h3>Eco da Morte e Essência</h3>
        <p>
          Mortes: <strong>{p.mortes}</strong> · Eco agora: <strong>{eco}</strong> {eco === 1 ? "carga" : "cargas"} · Essência: <strong>{formatarNumero(p.essencia, 0)}</strong>
        </p>
        <p className="suave nota">
          Cada morte nas últimas {formatarDuracao(CONFIG_LIMIAR.janelaEcoMs)} vira uma carga (até {CONFIG_LIMIAR.ecoMaximo}): Limiar {formatarNumero(CONFIG_LIMIAR.ecoDuracaoPorCarga * 100, 0)}% mais longo e drops{" "}
          {formatarNumero(CONFIG_LIMIAR.ecoDropsPorCarga * 100, 0)}% melhores por carga.
        </p>
        {(sinergia.duracao !== 0 || sinergia.ataque !== 0) && (
          <p>
            Sua raça ou core conhece o caminho: Limiar {formatarNumero(-sinergia.duracao * 100, 0)}% mais curto e +{formatarNumero(sinergia.ataque * 100, 0)}% de ataque lá dentro.
          </p>
        )}
      </article>

      <article className="cartao">
        <h3>O Retornado</h3>
        <p className="suave">
          Set nomeado: só cai dos chefes raros do Limiar (O Cobrador e A Rainha Pálida), uma peça de cada. Com 2 peças: +ataque; com 4: +defesa e Limiar 20% mais curto. O bônus cresce
          com as mortes ({formatarNumero(CONFIG_LIMIAR.retornadoBonusPorMorte * 100, 0)}% por morte, até {formatarNumero(CONFIG_LIMIAR.retornadoBonusMaximo * 100, 0)}%).
        </p>
        <ul className="lista-recursos">
          {PECAS_RETORNADO.map((x) => (
            <li key={x.id} className={`recurso${temPeca(x.id) ? "" : " bloqueado"}`}>
              <div>
                <strong>{temPeca(x.id) ? x.nome : "???"}</strong>
                {temPeca(x.id) && <p className="suave">{x.descricao}</p>}
              </div>
              <span className="suave">{temPeca(x.id) ? (Object.values(p.equipados).includes(x.id) ? "equipada" : "na mochila") : "falta"}</span>
            </li>
          ))}
        </ul>
        {pecasEquipadas >= 2 && <p>Bônus atual: +{formatarNumero(bonus * 100, 0)}%.</p>}
      </article>
    </section>
  );
}

/** Personagem → Títulos (o bônus dos títulos chega numa fatia futura). */
export function PainelTitulos({ personagem: p }: { personagem: Personagem }) {
  return (
    <section className="painel" aria-label="Títulos">
      <ul className="lista-recursos">
        {titulosPorMortes(p.mortes).map((t) => (
          <li key={t.id} className={`recurso${t.conquistado ? "" : " bloqueado"}`}>
            <div>
              <strong>{t.nome}</strong>
              <p className="suave">
                {t.mortes} mortes{t.conquistado ? " · conquistado" : ` · faltam ${t.mortes - p.mortes}`}
              </p>
              <p className="suave">{textoBonusTitulo(t.id)}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="suave nota">Os bônus dos títulos conquistados valem sempre e se somam.</p>
    </section>
  );
}

const NOME_BONUS: Record<string, string> = { "duracao-limiar": "tempo no Limiar", defesa: "defesa", ataque: "ataque" };
function textoBonusTitulo(id: string): string {
  return (BONUS_TITULOS[id] ?? []).map((m) => `${m.valor > 0 ? "+" : "−"}${Math.round(Math.abs(m.valor) * 100)}% ${NOME_BONUS[m.alvo] ?? m.alvo}`).join(" · ");
}
