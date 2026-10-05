import { ECHO_ALLY_HEALTH, ECHO_STYLE_LABELS, type EchoSeal } from '../../../modules/echoes';
import { archetypeOf } from '../../silhouettes';
import { Silhouette } from '../../components/Silhouette';

/** Antes de um confronto: chamar um Eco aliado do Círculo (um por dia) ou lutar sozinho. */
export function EchoAllyChooser({
  encounterName,
  allies,
  onChoose,
  onCancel,
}: {
  encounterName: string;
  allies: { code: string; seal: EchoSeal }[];
  onChoose: (code: string | null) => void;
  onCancel: () => void;
}) {
  return (
    <main className="screen screen--narrow echo-ally-chooser">
      <p className="eyebrow">Antes do confronto · {encounterName}</p>
      <h1 className="title title--small">Chamar um Eco aliado?</h1>
      <p className="lede lede--tight">
        [ Sistema ] Um Eco do seu Círculo pode lutar ao seu lado, uma vez por dia. Ele entra com {ECHO_ALLY_HEALTH} de vitalidade e
        luta pelo estilo que o dono escolheu. Não ganha experiência nem itens.
      </p>
      <div className="echo-ally-chooser__list">
        {allies.map(({ code, seal }) => {
          const archetype = archetypeOf(seal.archetypeId);
          return (
            <button key={code} type="button" className="echo-ally-option" onClick={() => onChoose(code)}>
              <Silhouette
                pose={archetype?.pose ?? 'stand'}
                prop={archetype?.prop ?? 'none'}
                tint="var(--text)"
                glow={archetype?.palette.primary}
                size={52}
              />
              <span>
                <strong>Eco de {seal.name}</strong>
                <small>
                  {archetype?.name ?? 'Sem arquétipo'}
                  {seal.rank === 'initiate' ? ' · Iniciado' : ''} · {ECHO_STYLE_LABELS[seal.style]} · {seal.actionIds.length} ações
                </small>
              </span>
            </button>
          );
        })}
      </div>
      <div className="button-stack">
        <button type="button" className="button" onClick={() => onChoose(null)}>
          Lutar sozinho
        </button>
        <button type="button" className="button button--ghost" onClick={onCancel}>
          Voltar
        </button>
      </div>
    </main>
  );
}
