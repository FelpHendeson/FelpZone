import { desenharRetrato } from '../arte/cena';
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

const VITRINE = [
  { classe: 'mistica', arma: 'cajado' },
  { classe: 'cacadora', arma: 'arco' },
  { classe: 'guerreiro', arma: 'espada' },
] as const;

export function MenuInicial({ estado, conta, aoContinuar, aoNovoJogo, aoConta, aoAjuda }: Props) {
  const herois = estado ? estado.herois : VITRINE;
  return (
    <div className="menu-inicial">
      <h1>Idle Guilda</h1>
      <div className="vitrine" aria-hidden>
        {herois.map((h, i) => (
          <CanvasPixel
            key={i}
            largura={24}
            altura={20}
            className="retrato"
            desenho={(ctx, t) => desenharRetrato(ctx, h, t + i * 0.25)}
          />
        ))}
      </div>
      <nav className="menu-botoes">
        {estado && (
          <button className="principal" onClick={aoContinuar}>
            Continuar
            <small>{resumoDoEstado(estado)}</small>
          </button>
        )}
        <button className={estado ? '' : 'principal'} onClick={aoNovoJogo}>
          Novo jogo
        </button>
        <button onClick={aoConta}>
          {conta.apelido ? `Conta: ${conta.apelido}` : 'Entrar ou criar conta'}
          <small>
            {conta.disponivel === false
              ? 'Indisponível no momento'
              : conta.apelido
                ? 'Seu progresso é salvo na nuvem'
                : 'Para jogar em mais de um aparelho'}
          </small>
        </button>
        <button onClick={aoAjuda}>Como jogar</button>
      </nav>
      <p className="rodape">v0.3 · o progresso fica salvo neste aparelho automaticamente</p>
    </div>
  );
}
