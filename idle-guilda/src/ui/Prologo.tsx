import { Retrato } from './comum';

/** Abertura da história: quem é Sir LionHearth e por que ele parte. */
export function Prologo(props: { aoComecar: () => void; aoVoltar: () => void }) {
  return (
    <div className="prologo">
      <Retrato id="leao" tamanho={144} animar />
      <h1>A partida do herdeiro</h1>
      <p>
        No reino de <strong>Hope</strong>, as <strong>Sky Islands</strong> flutuam acima de um mar de nuvens. A maior delas, a <strong>Ilha de Aço</strong>,
        pertence há gerações à família <strong>LionHearth</strong>.
      </p>
      <p>
        <strong>Sir LionHearth</strong>, filho do lorde, já é um cavaleiro reconhecido pela família. Mas um nome não se herda: se conquista. Com espada,
        escudo e um juramento inabalável, ele parte para espalhar o nome LionHearth pelas ilhas.
      </p>
      <p className="dica">
        Dizem que, no calor da batalha, as brasas da alma dele desenham a silhueta de um leão em chamas, e que o cavaleiro justo dá lugar a outra
        coisa.
      </p>
      <button className="principal" onClick={props.aoComecar}>
        Partir em aventura
      </button>
      <button onClick={props.aoVoltar}>Voltar</button>
    </div>
  );
}
