import { useState } from 'react';
import { contratar, custoProximaContratacao, type Resultado } from '../motor/acoes';
import type { Classe, Estado } from '../motor/tipos';
import { Recurso } from './Barra';
import { EscolhaClasse } from './Fundacao';
import { nomeAleatorio } from './texto';

export function Taverna(props: { estado: Estado; agir: (acao: (e: Estado) => Resultado) => void }) {
  const e = props.estado;
  const usados = e.herois.map((h) => h.nome);
  const [classe, setClasse] = useState<Classe>('cacadora');
  const [nome, setNome] = useState(() => nomeAleatorio(usados));
  const custo = custoProximaContratacao(e);

  if (custo === null) {
    return (
      <section className="painel">
        <h2>Taverna</h2>
        <p className="dica">A guilda está completa por enquanto: três aventureiros é o máximo desta versão.</p>
      </section>
    );
  }

  return (
    <section className="painel">
      <h2>Taverna</h2>
      <p className="dica">Um novo aventureiro chega no nível 1. Mais heróis permitem caçar e minerar ao mesmo tempo.</p>
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
          props.agir((s) => contratar(s, nome, classe));
          setNome(nomeAleatorio([...usados, nome]));
        }}
      >
        Contratar por <Recurso tipo="ouro" valor={custo} falta={e.ouro < custo} />
      </button>
    </section>
  );
}
