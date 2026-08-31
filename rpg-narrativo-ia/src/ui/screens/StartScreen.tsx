import { ImagePlaceholder } from '../components/ImagePlaceholder';

interface StartScreenProps {
  canContinue: boolean;
  continueLabel: string;
  saveWarning?: string;
  hasSave: boolean;
  onNewGame: () => void;
  onContinue: () => void;
  onDelete: () => void;
}

export function StartScreen({
  canContinue,
  continueLabel,
  saveWarning,
  hasSave,
  onNewGame,
  onContinue,
  onDelete,
}: StartScreenProps) {
  return (
    <main className="screen screen--start">
      <p className="eyebrow">Protótipo jogável</p>
      <ImagePlaceholder kind="scene" label="Horizonte depois do Reset" />
      <h1 className="title">Reset</h1>
      <p className="lede">
        A existência recomeçou. Sem cidades, sem aliados, sem mapa. Só o nome que você ainda reconhece
        e o primeiro dia.
      </p>
      {saveWarning ? <p className="banner banner--warning">{saveWarning}</p> : null}
      <div className="button-stack">
        {canContinue ? (
          <button type="button" className="button button--primary" onClick={onContinue}>
            {continueLabel}
          </button>
        ) : null}
        <button type="button" className={canContinue ? 'button button--ghost' : 'button button--primary'} onClick={onNewGame}>
          Nova partida
        </button>
        {hasSave ? (
          <button type="button" className="button button--ghost" onClick={onDelete}>
            Apagar partida
          </button>
        ) : null}
      </div>
      <p className="footnote">Sem conta, sem chave e sem conexão durante o jogo. O salvamento fica neste navegador.</p>
    </main>
  );
}
