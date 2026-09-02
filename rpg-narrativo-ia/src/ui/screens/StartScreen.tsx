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
    <main className="screen screen--start screen--narrow">
      <section className="start-hero">
        <ImagePlaceholder kind="scene" label="Horizonte depois do Reset" className="start-hero__image" />
        <div className="start-hero__shade" aria-hidden="true" />
        <div className="start-hero__content">
          <p className="eyebrow">RPG narrativo de exploração</p>
          <h1 className="title">RESET</h1>
          <p>O mundo acabou. A existência continuou.</p>
        </div>
      </section>
      <section className="start-copy">
        <p className="lede">
          Sem cidades, sem aliados, sem mapa. Só o nome que você ainda reconhece e o primeiro dia.
        </p>
        <ul className="feature-strip" aria-label="Características da experiência">
          <li><span aria-hidden="true">◉</span> Exploração</li>
          <li><span aria-hidden="true">⌁</span> Escolhas</li>
          <li><span aria-hidden="true">◇</span> Sobrevivência</li>
        </ul>
      </section>
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
      <p className="footnote footnote--centered">Sem conta ou conexão durante o jogo · Salvamento neste navegador</p>
    </main>
  );
}
