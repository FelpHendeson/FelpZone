import { desenharQuadro, folha, quadroDa } from '../arte/folhas';
import { spriteMonstro } from '../arte/monstros';
import { desenhar } from '../arte/sprite';
import { statsBaseInimigo } from '../motor/combate';
import { abatesDe, bonusBestiario, LORE_MONSTROS, MARCOS_BESTIARIO, marcoAtual } from '../motor/dados/bestiario';
import { MAPAS, MONSTROS } from '../motor/dados/mapas';
import { COR_ELEMENTO, NOME_ELEMENTO, NOME_STAT, STATS } from '../motor/dados/personagens';
import type { Estado } from '../motor/tipos';
import { Medidor } from './comum';
import { CanvasPixel } from './pixel';
import { compacto, inteiro } from './texto';

/** Ordem do bestiário: pela ordem em que os monstros aparecem nos mapas. */
const ORDEM = [...new Set(MAPAS.flatMap((m) => m.monstros))];

export function Bestiario({ estado: e, aoFechar }: { estado: Estado; aoFechar: () => void }) {
  const descobertos = ORDEM.filter((m) => abatesDe(e, m) > 0).length;
  return (
    <div className="tela-cheia" role="dialog" aria-modal="true" aria-label="Bestiário">
      <header className="ficha-cabecalho">
        <button className="voltar" onClick={aoFechar} aria-label="Voltar">
          ←
        </button>
        <span className="icone-livro" aria-hidden>
          📖
        </span>
        <span>
          <strong>Bestiário</strong>
          <small>
            {descobertos}/{ORDEM.length} criaturas registradas
          </small>
        </span>
      </header>
      <div className="ficha-corpo">
        <p className="dica">
          Cada espécie derrotada entra aqui. Com 10 abates, a party aprende os atributos e os pontos fracos. A partir de 100, cada marco dá dano
          extra permanente contra ela.
        </p>
        <ul className="bestiario">
          {ORDEM.map((id) => (
            <Ficha key={id} e={e} id={id} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function Ficha({ e, id }: { e: Estado; id: string }) {
  const m = MONSTROS[id];
  const ficha = e.estatisticas.bestiario[id];
  const abates = ficha?.abates ?? 0;
  const marco = marcoAtual(abates);
  const conhecido = marco >= 0;
  const estudado = marco >= 1;
  const proximo = MARCOS_BESTIARIO[marco + 1];
  const anterior = marco >= 0 ? MARCOS_BESTIARIO[marco].abates : 0;
  const mapas = MAPAS.filter((x) => x.monstros.includes(id));
  const nivel = mapas[0]?.nivelInimigo ?? 1;
  const stats = statsBaseInimigo(id, nivel, false);
  const bonus = bonusBestiario(e, id);
  return (
    <li className={`criatura ${conhecido ? '' : 'desconhecida'}`}>
      <div className="criatura-topo">
        <CanvasPixel
          largura={32}
          altura={32}
          className={`criatura-sprite ${conhecido ? '' : 'silhueta'}`}
          rotulo={conhecido ? m.nome : 'Criatura desconhecida'}
          desenho={(ctx, t) => {
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, 32, 32);
            // Spritesheet (metade do tamanho, pés na base); sem ela, o sprite em texto ampliado 2×.
            const nome = `monstro-${id}`;
            const f = folha(nome);
            const animar = conhecido ? t * 0.8 : 0;
            const comFolha = !!f && desenharQuadro(ctx, nome, quadroDa(f, 'parado', animar), 16, 31, 0.5);
            if (!comFolha) {
              ctx.save();
              ctx.scale(2, 2);
              desenhar(ctx, spriteMonstro(id), 0, conhecido ? Math.floor(t * 2) % 2 : 0);
              ctx.restore();
            }
            if (!conhecido) {
              // Desconhecida: só a forma, numa cor só.
              ctx.globalCompositeOperation = 'source-in';
              ctx.fillStyle = '#0b0b14';
              ctx.fillRect(0, 0, 32, 32);
              ctx.globalCompositeOperation = 'source-over';
            }
          }}
        />
        <span className="criatura-info">
          <strong>{conhecido ? m.nome : '???'}</strong>
          <small>{conhecido ? mapas.map((x) => x.nome).join(' · ') : `Vive em ${mapas[0]?.nome ?? 'algum lugar'}`}</small>
          {conhecido && (
            <small>
              {inteiro(abates)} derrotados
              {ficha?.chefes ? ` · ${ficha.chefes} como chefe` : ''}
              {bonus > 0 && <strong className="bonus"> · +{bonus}% de dano</strong>}
            </small>
          )}
        </span>
      </div>
      {conhecido && <p>{LORE_MONSTROS[id]}</p>}
      {estudado ? (
        <>
          <div className="criatura-elementos">
            <span style={{ borderColor: COR_ELEMENTO[m.elemento] }}>
              {NOME_ELEMENTO[m.elemento]} · {m.escola === 'fisica' ? 'físico' : 'mágico'}
              {m.area ? ' · ataca a party toda' : ''}
            </span>
            {m.fraqueza && <span className="fraco">Fraco a {NOME_ELEMENTO[m.fraqueza].toLowerCase()} (×1,5)</span>}
            {m.resistencia && <span className="resiste">Resiste a {NOME_ELEMENTO[m.resistencia].toLowerCase()} (×0,6)</span>}
          </div>
          <ul className="criatura-stats">
            {STATS.map((s) => (
              <li key={s}>
                {NOME_STAT[s].curto} <strong>{compacto(stats[s])}</strong>
              </li>
            ))}
          </ul>
          <small>Atributos no nível {nivel}. Chefes têm 7× a vida e 1,5× o ataque.</small>
        </>
      ) : conhecido ? (
        <small>Derrote {10 - abates} a mais para estudar atributos e pontos fracos.</small>
      ) : (
        <small>Ainda não encontrada.</small>
      )}
      {proximo && conhecido && (
        <div className="criatura-marco">
          <Medidor valor={abates - anterior} maximo={proximo.abates - anterior} cor="#c27bff" texto={`${inteiro(abates)}/${inteiro(proximo.abates)}`} fino />
          <small>Próximo marco: {proximo.texto}</small>
        </div>
      )}
    </li>
  );
}
