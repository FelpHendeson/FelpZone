import { useState } from 'react';
import { desenharRetrato } from '../arte/cena';
import { CLASSES } from '../motor/dados';
import type { Classe } from '../motor/tipos';
import { CanvasPixel } from './pixel';
import { nomeAleatorio } from './texto';

const DESCRICOES: Record<Classe, string> = {
  guerreiro: 'Resistente, ataca com Força e minera bem.',
  cacadora: 'Ataca com Destreza e traz mais saque.',
  mistica: 'Ataca com Mente e aprende mais rápido, mas é frágil.',
};

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
          <small>{DESCRICOES[c]}</small>
        </button>
      ))}
    </div>
  );
}

export function Fundacao(props: { aoFundar: (nome: string, classe: Classe) => void }) {
  const [classe, setClasse] = useState<Classe>('guerreiro');
  const [nome, setNome] = useState(() => nomeAleatorio());
  return (
    <div className="fundacao">
      <h1>Idle Guilda</h1>
      <p>Funde sua guilda escolhendo o primeiro aventureiro. Ele trabalha sozinho, até com o jogo fechado.</p>
      <EscolhaClasse classe={classe} aoEscolher={setClasse} />
      <label className="campo">
        Nome
        <span className="campo-linha">
          <input value={nome} maxLength={16} onChange={(e) => setNome(e.target.value)} />
          <button type="button" onClick={() => setNome(nomeAleatorio())} aria-label="Sortear nome">
            🎲
          </button>
        </span>
      </label>
      <button className="principal" disabled={!nome.trim()} onClick={() => props.aoFundar(nome.trim().slice(0, 16), classe)}>
        Fundar guilda
      </button>
    </div>
  );
}
