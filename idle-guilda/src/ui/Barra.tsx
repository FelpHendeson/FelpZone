import { ICONES } from '../arte/sprites';
import { MATERIAIS } from '../motor/dados';
import type { Estado, Material } from '../motor/tipos';
import { Icone } from './pixel';
import { compacto } from './texto';

export function Recurso(props: { tipo: Material | 'ouro'; valor: number; falta?: boolean }) {
  const nome = props.tipo === 'ouro' ? 'Ouro' : MATERIAIS[props.tipo].nome;
  return (
    <span className={`recurso ${props.falta ? 'falta' : ''}`} title={nome}>
      <Icone chave={`icone-${props.tipo}`} sprite={ICONES[props.tipo]} rotulo={nome} />
      {compacto(Math.floor(props.valor))}
    </span>
  );
}

export function Barra(props: { estado: Estado; aoAjuda: () => void }) {
  const e = props.estado;
  return (
    <header className="barra">
      <span className="recursos">
        <Recurso tipo="ouro" valor={e.ouro} />
        {(Object.keys(MATERIAIS) as Material[]).map((m) => (
          <Recurso key={m} tipo={m} valor={e.materiais[m]} />
        ))}
      </span>
      <button className="ajuda" onClick={props.aoAjuda} aria-label="Como jogar">
        ?
      </button>
    </header>
  );
}

export function Medidor(props: { rotulo: string; valor: number; maximo: number; cor: string; texto?: string }) {
  const fracao = props.maximo > 0 ? Math.max(0, Math.min(1, props.valor / props.maximo)) : 0;
  return (
    <span className="medidor">
      <span className="medidor-rotulo">{props.rotulo}</span>
      <span
        className="medidor-trilho"
        role="meter"
        aria-label={props.rotulo}
        aria-valuemin={0}
        aria-valuemax={props.maximo}
        aria-valuenow={Math.floor(props.valor)}
      >
        <span className="medidor-cheio" style={{ width: `${fracao * 100}%`, background: props.cor }} />
      </span>
      <span className="medidor-texto">{props.texto}</span>
    </span>
  );
}
