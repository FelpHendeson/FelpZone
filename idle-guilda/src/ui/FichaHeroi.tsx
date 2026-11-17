import { desenharRetrato } from '../arte/cena';
import { iconeArma } from '../arte/sprites';
import { armasLivres, distribuirPonto, distribuirSugerido, equipar, type Resultado } from '../motor/acoes';
import { ARMAS, ATRIBUTOS, BONUS_SAQUE_CACADORA, BONUS_XP_MISTICA, CLASSES, ORDEM_ARMAS } from '../motor/dados';
import { cura, dano, fatorDefesa, vidaMaxima } from '../motor/regras';
import type { Atributo, Estado } from '../motor/tipos';
import { Modal } from './Modal';
import { CanvasPixel, Icone } from './pixel';
import { compacto, inteiro } from './texto';

interface Props {
  estado: Estado;
  heroiId: string;
  agir: (acao: (e: Estado) => Resultado) => void;
  aoFechar: () => void;
  aoIrForja: () => void;
}

export function FichaHeroi({ estado: e, heroiId, agir, aoFechar, aoIrForja }: Props) {
  const h = e.herois.find((x) => x.id === heroiId);
  if (!h) return null;
  const classe = CLASSES[h.classe];
  const armas = ORDEM_ARMAS.filter((a) => a === 'bastao' || e.armas[a] > 0);

  return (
    <Modal titulo={`${h.nome} · ${classe.nome} · Nv ${h.nivel}`} aoFechar={aoFechar}>
      <div className="ficha-topo">
        <CanvasPixel
          largura={24}
          altura={20}
          className="retrato grande"
          rotulo={classe.nome}
          desenho={(ctx, t) => desenharRetrato(ctx, h, t)}
        />
        <p>
          <span className={`papel papel-${classe.papel}`}>{classe.papelNome}</span> {classe.descricao}
        </p>
      </div>

      <p className="numeros">
        <span>Dano {compacto(dano(h))}/s</span>
        {cura(h) > 0 && <span>Cura {compacto(cura(h))}/s</span>}
        <span>Vida {inteiro(vidaMaxima(h))}</span>
        <span>Bloqueia {Math.round((1 - fatorDefesa(h)) * 100)}%</span>
        {h.classe === 'mistica' && <span>+{BONUS_XP_MISTICA * 100}% XP do grupo</span>}
        {h.classe === 'cacadora' && <span>+{BONUS_SAQUE_CACADORA * 100}% materiais</span>}
      </p>

      <h3>
        Atributos{' '}
        {h.pontosLivres > 0 ? <span className="selo">{h.pontosLivres} pontos para usar</span> : <small>(ganhe pontos subindo de nível)</small>}
      </h3>
      <ul className="atributos">
        {(Object.keys(ATRIBUTOS) as Atributo[]).map((a) => (
          <li key={a}>
            <span>
              <strong>{ATRIBUTOS[a].nome}</strong> {h.atributos[a]}
              <br />
              <small>{ATRIBUTOS[a].efeito}</small>
            </span>
            <button
              className="mais"
              disabled={h.pontosLivres <= 0}
              onClick={() => agir((s) => distribuirPonto(s, h.id, a))}
              aria-label={`Aumentar ${ATRIBUTOS[a].nome}`}
            >
              +
            </button>
          </li>
        ))}
      </ul>
      {h.pontosLivres > 1 && (
        <button onClick={() => agir((s) => distribuirSugerido(s, h.id))}>
          Distribuir sugerido ({h.classe === 'guerreiro' ? 'metade em cada' : 'mais Poder'})
        </button>
      )}

      <h3>Arma</h3>
      <div className="armas">
        {armas.map((a) => {
          const livre = h.arma === a || armasLivres(e, a) > 0;
          const arma = ARMAS[a];
          return (
            <button
              key={a}
              className={h.arma === a ? 'ativa' : ''}
              disabled={!livre}
              onClick={() => agir((s) => equipar(s, h.id, a))}
            >
              <Icone chave={`arma-${a}`} sprite={iconeArma(a)} />
              <span>
                {arma.nome}
                <small>
                  {' '}
                  +{arma.ataque}
                  {arma.afinidade === h.classe && ' ×1,5'}
                  {!livre && ' · em uso'}
                </small>
              </span>
            </button>
          );
        })}
      </div>
      {armas.length === 1 && (
        <button className="link" onClick={aoIrForja}>
          Nenhuma arma forjada ainda. Ir para a Forja →
        </button>
      )}
    </Modal>
  );
}
