import { useCallback, useEffect, useState } from 'react';
import { HEROIS } from '../arte/herois';
import { desenhar } from '../arte/sprite';
import { aplausoDado, OURO_APLAUSO_DADO, OURO_APLAUSO_RECEBIDO, type Resultado } from '../motor/acoes';
import { MAPAS } from '../motor/dados/mapas';
import { PERSONAGENS } from '../motor/dados/personagens';
import type { Estado, PersonagemId } from '../motor/tipos';
import { aplaudir, ErroNuvem, lerMundo, type Mundo as DadosMundo, type PerfilPublico } from '../nuvem';
import type { SituacaoConta } from './Conta';
import { CanvasPixel } from './pixel';
import { quandoFoi } from './resumo';
import { inteiro } from './texto';

interface Props {
  conta: SituacaoConta;
  agir: (acao: (e: Estado) => Resultado) => void;
  aoConta: () => void;
  aoAviso: (texto: string) => void;
}

const ATUALIZAR_MS = 30_000;

/** Heróis vêm de outros jogadores: só desenha personagens conhecidos. */
function heroiDesenhavel(h: { classe: string }): PersonagemId | null {
  return h.classe in PERSONAGENS ? (h.classe as PersonagemId) : null;
}

export function Mundo({ conta, agir, aoConta, aoAviso }: Props) {
  const [mundo, setMundo] = useState<DadosMundo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aplaudidos, setAplaudidos] = useState<Set<string>>(new Set());

  const atualizar = useCallback(async () => {
    try {
      setMundo(await lerMundo());
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar o mundo.');
    }
  }, []);

  useEffect(() => {
    void atualizar();
    const id = setInterval(() => void atualizar(), ATUALIZAR_MS);
    return () => clearInterval(id);
  }, [atualizar, conta.apelido]);

  const darAplauso = async (p: PerfilPublico) => {
    try {
      const restantes = await aplaudir(p.id);
      setAplaudidos((s) => new Set(s).add(p.id));
      agir((e) => aplausoDado(e, p.apelido));
      aoAviso(`👏 Você aplaudiu ${p.apelido}! +${OURO_APLAUSO_DADO} de ouro (${restantes} aplausos restantes hoje)`);
      void atualizar();
    } catch (e) {
      if (e instanceof ErroNuvem && e.status === 409) setAplaudidos((s) => new Set(s).add(p.id));
      aoAviso(e instanceof Error ? e.message : 'Não deu para aplaudir.');
    }
  };

  if (conta.disponivel === false) {
    return (
      <section className="painel">
        <h2>Mundo</h2>
        <p className="dica">O mundo online está indisponível agora. O jogo continua normalmente.</p>
      </section>
    );
  }

  const linha = (p: PerfilPublico & { posicao?: number }) => {
    const sou = mundo?.eu === p.id;
    const jaAplaudiu = aplaudidos.has(p.id);
    return (
      <li key={p.id} className={`guilda ${sou ? 'minha' : ''}`}>
        <span className="posicao">{p.posicao ? `#${p.posicao}` : '…'}</span>
        <span className="guilda-herois" aria-hidden>
          {p.herois.map((h, i) => {
            const d = heroiDesenhavel(h);
            return d ? (
              <CanvasPixel
                key={i}
                largura={18}
                altura={18}
                className="mini"
                desenho={(ctx) => {
                  ctx.clearRect(0, 0, 18, 18);
                  desenhar(ctx, HEROIS[d], 0, 0);
                }}
              />
            ) : null;
          })}
        </span>
        <span className="guilda-info">
          <strong>
            {p.apelido}
            {sou && ' (você)'}
          </strong>
          <small>
            Renome {inteiro(p.renome)} · Nv {p.nivel} · {MAPAS.find((m) => m.id === p.zona)?.nome ?? '—'}
          </small>
          <small>
            👏 {p.aplausos} · ativo {quandoFoi(p.atualizadoEm)}
          </small>
        </span>
        {conta.apelido && !sou && (
          <button
            className="aplaudir"
            disabled={jaAplaudiu}
            onClick={() => void darAplauso(p)}
            aria-label={`Aplaudir ${p.apelido}`}
            title={jaAplaudiu ? 'Já aplaudiu hoje' : 'Aplaudir: vocês dois ganham ouro'}
          >
            {jaAplaudiu ? '✓' : '👏'}
          </button>
        )}
      </li>
    );
  };

  return (
    <>
      <section className="painel">
        <div className="mundo-topo">
          <h2>Mundo</h2>
          {mundo && (
            <span className="online">
              <span className="ponto-online" /> {mundo.online} {mundo.online === 1 ? 'aventureiro online' : 'aventureiros online'}
            </span>
          )}
        </div>
        {!conta.apelido ? (
          <div className="convite">
            <p>Entre numa conta para sua guilda aparecer no ranking, aplaudir outras guildas e ganhar ouro com isso.</p>
            <button className="principal" onClick={aoConta}>
              Entrar ou criar conta
            </button>
          </div>
        ) : (
          <p className="dica">
            {mundo?.minhaPosicao
              ? `Sua guilda está em ${mundo.minhaPosicao}º lugar. `
              : 'Sua guilda entra no ranking no próximo save na nuvem. '}
            Aplaudir dá +{OURO_APLAUSO_DADO} de ouro para você e +{OURO_APLAUSO_RECEBIDO} para quem recebe (5 por dia).
          </p>
        )}
        {erro && <p className="erro">{erro}</p>}
      </section>

      <section className="painel">
        <h2>🏆 Ranking de renome</h2>
        <p className="dica">Renome soma os níveis dos heróis, os capítulos concluídos e os monstros derrotados.</p>
        {!mundo ? (
          <p className="dica">Carregando…</p>
        ) : mundo.ranking.length === 0 ? (
          <p className="dica">Ninguém no ranking ainda. Seja a primeira guilda!</p>
        ) : (
          <ol className="ranking">
            {mundo.ranking.map(linha)}
            {mundo.meuPerfil && linha({ ...mundo.meuPerfil, posicao: mundo.minhaPosicao ?? undefined })}
          </ol>
        )}
      </section>

      <section className="painel">
        <h2>📜 Acontecimentos do mundo</h2>
        {mundo && mundo.mural.length === 0 && <p className="dica">Nada aconteceu ainda.</p>}
        <ol className="diario">
          {mundo?.mural.map((i, n) => (
            <li key={`${i.t}-${n}`}>
              <small>{quandoFoi(i.t)}</small>
              <span>
                <strong>{i.apelido}</strong> {i.texto}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
