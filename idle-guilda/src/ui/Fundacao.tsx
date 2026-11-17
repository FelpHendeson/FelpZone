import { useState } from 'react';
import { desenharRetrato } from '../arte/cena';
import { CLASSES } from '../motor/dados';
import type { Classe } from '../motor/tipos';
import { CanvasPixel } from './pixel';
import { nomeAleatorio } from './texto';

const ARMA_DA_CLASSE = { guerreiro: 'espada', cacadora: 'arco', mistica: 'cajado' } as const;

export function EscolhaClasse(props: { classe: Classe; aoEscolher: (c: Classe) => void }) {
  return (
    <div className="classes" role="radiogroup" aria-label="Classe">
      {(Object.keys(CLASSES) as Classe[]).map((c) => (
        <button
          key={c}
          role="radio"
          aria-checked={props.classe === c}
          className={props.classe === c ? 'ativa' : ''}
          onClick={() => props.aoEscolher(c)}
        >
          <CanvasPixel
            largura={24}
            altura={20}
            className="retrato"
            rotulo={CLASSES[c].nome}
            desenho={(ctx, t) => desenharRetrato(ctx, { classe: c, arma: ARMA_DA_CLASSE[c] }, t)}
          />
          <strong>{CLASSES[c].nome}</strong>
          <span className={`papel papel-${CLASSES[c].papel}`}>{CLASSES[c].papelNome}</span>
          <small>{CLASSES[c].descricao}</small>
        </button>
      ))}
    </div>
  );
}

export function Fundacao(props: { aoFundar: (nome: string) => void; aoVoltar: () => void }) {
  const [nome, setNome] = useState(() => nomeAleatorio());
  return (
    <div className="fundacao">
      <h1>Idle Guilda</h1>
      <CanvasPixel
        largura={24}
        altura={20}
        className="retrato heroi-inicial"
        rotulo="Guerreiro"
        desenho={(ctx, t) => desenharRetrato(ctx, { classe: 'guerreiro', arma: 'bastao' }, t)}
      />
      <p>
        Você comanda uma guilda de aventureiros que lutam sozinhos, mesmo com o jogo fechado. Seu primeiro herói é um{' '}
        <strong>Guerreiro</strong>. Depois você recruta mais gente para a party.
      </p>
      <label className="campo">
        Nome do Guerreiro
        <span className="campo-linha">
          <input value={nome} maxLength={16} onChange={(e) => setNome(e.target.value)} />
          <button type="button" onClick={() => setNome(nomeAleatorio())} aria-label="Sortear nome">
            🎲
          </button>
        </span>
      </label>
      <button className="principal" disabled={!nome.trim()} onClick={() => props.aoFundar(nome.trim().slice(0, 16))}>
        Começar aventura
      </button>
      <button onClick={props.aoVoltar}>Voltar</button>
    </div>
  );
}
