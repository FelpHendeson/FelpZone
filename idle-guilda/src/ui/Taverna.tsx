import { useState } from 'react';
import { contratar, custoProximaContratacao, type Resultado } from '../motor/acoes';
import type { Classe, Estado } from '../motor/tipos';
import { Recurso } from './Barra';
import { EscolhaClasse } from './Fundacao';
import { nomeAleatorio } from './texto';

interface Props {
  estado: Estado;
  agir: (acao: (e: Estado) => Resultado) => void;
  aoContratar: () => void;
}

export function Taverna({ estado: e, agir, aoContratar }: Props) {
  const usados = e.herois.map((h) => h.nome);
  const sugestao: Classe = e.herois.some((h) => h.classe === 'mistica') ? 'cacadora' : 'mistica';
  const [classe, setClasse] = useState<Classe>(sugestao);
  const [nome, setNome] = useState(() => nomeAleatorio(usados));
  const custo = custoProximaContratacao(e);

  if (custo === null) {
    return (
      <section className="painel">
        <h2>Taverna</h2>
        <p className="dica">Sua party está completa: três heróis é o máximo desta versão.</p>
      </section>
    );
  }

  return (
    <section className="painel">
      <h2>Taverna</h2>
      <p className="dica">
        Quem você contratar entra na party e luta junto a partir do nível 1, aprendendo rápido com o grupo.
      </p>
      <EscolhaClasse classe={classe} aoEscolher={setClasse} />
      <label className="campo">
        Nome
        <span className="campo-linha">
          <input value={nome} maxLength={16} onChange={(ev) => setNome(ev.target.value)} />
          <button type="button" onClick={() => setNome(nomeAleatorio(usados))} aria-label="Sortear nome">
            🎲
          </button>
        </span>
      </label>
      <button
        className="principal"
        disabled={e.ouro < custo || !nome.trim()}
        onClick={() => {
          agir((s) => contratar(s, nome, classe));
          setNome(nomeAleatorio([...usados, nome]));
          aoContratar();
        }}
      >
        Contratar por <Recurso tipo="ouro" valor={custo} falta={e.ouro < custo} />
      </button>
      {e.ouro < custo && <p className="dica">Falta ouro: a party ganha ouro a cada monstro derrotado.</p>}
    </section>
  );
}
