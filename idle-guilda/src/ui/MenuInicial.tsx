import { HEROIS, JUBA } from '../arte/herois';
import { desenhar } from '../arte/sprite';
import { ORDEM_PERSONAGENS } from '../motor/dados/personagens';
import type { Estado } from '../motor/tipos';
import type { SituacaoConta } from './Conta';
import { CanvasPixel } from './pixel';
import { resumoDoEstado } from './resumo';

interface Props {
  estado: Estado | null;
  conta: SituacaoConta;
  aoContinuar: () => void;
  aoNovoJogo: () => void;
  aoConta: () => void;
  aoAjuda: () => void;
}

/** Vitrine animada: a party diante da Ilha de Aço. */
function vitrine(ctx: CanvasRenderingContext2D, t: number, ids: string[]) {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#141a33';
  ctx.fillRect(0, 0, 120, 44);
  for (let i = 0; i < 18; i++) {
    ctx.fillStyle = Math.floor(t * 2 + i) % 4 === 0 ? '#6a75b0' : '#e6ecf2';
    ctx.fillRect((i * 37) % 120, (i * 13) % 22, 1, 1);
  }
  ctx.fillStyle = '#3a3d47';
  ctx.fillRect(70, 10, 40, 6);
  ctx.fillStyle = '#6b7080';
  ctx.fillRect(84, 2, 4, 8);
  ctx.fillStyle = '#f2c14e';
  ctx.fillRect(84, 1, 4, 1);
  ctx.fillStyle = '#2f4a33';
  ctx.fillRect(0, 38, 120, 6);
  ids.forEach((id, i) => {
    const x = 4 + i * 23;
    const pulo = Math.floor(t * 2 + i) % 2;
    if (id === 'leao' && Math.floor(t / 3) % 2 === 1) desenhar(ctx, JUBA, x + 1, 16 - pulo);
    desenhar(ctx, HEROIS[id as keyof typeof HEROIS], x, 21 - pulo);
  });
}

export function MenuInicial({ estado, conta, aoContinuar, aoNovoJogo, aoConta, aoAjuda }: Props) {
  const ids = estado ? estado.herois.map((h) => h.id) : ORDEM_PERSONAGENS;
  return (
    <div className="menu-inicial">
      <h1>
        LionHearth
        <small>Crônicas das Sky Islands</small>
      </h1>
      <CanvasPixel largura={120} altura={44} className="vitrine" desenho={(ctx, t) => vitrine(ctx, t, ids)} rotulo="A party" />
      <nav className="menu-botoes">
        {estado && (
          <button className="principal" onClick={aoContinuar}>
            Continuar
            <small>{resumoDoEstado(estado)}</small>
          </button>
        )}
        <button className={estado ? '' : 'principal'} onClick={aoNovoJogo}>
          Nova aventura
        </button>
        <button onClick={aoConta}>
          {conta.apelido ? `Conta: ${conta.apelido}` : 'Entrar ou criar conta'}
          <small>
            {conta.disponivel === false ? 'Indisponível no momento' : conta.apelido ? 'Seu progresso é salvo na nuvem' : 'Para jogar em mais de um aparelho e aparecer no ranking'}
          </small>
        </button>
        <button onClick={aoAjuda}>Como jogar</button>
      </nav>
      <p className="rodape">v1.0 · idle RPG de party · o progresso fica salvo neste aparelho automaticamente</p>
    </div>
  );
}
