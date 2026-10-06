import type { CSSProperties } from 'react';
import type { CombatantShape, CombatDistance } from '../../modules/combat';
import { CreatureSilhouette } from '../components/CreatureSilhouette';
import { Silhouette, type SilhouetteProp } from '../components/Silhouette';
import type { StageFrame } from './stage';

export interface StageFigure {
  id: string;
  name: string;
  shape: CombatantShape;
  tint: string;
  prop?: SilhouetteProp;
}

/** Posição horizontal (%) da figura na fila do seu lado: a primeira fica na frente. */
function positionOf(side: 'ally' | 'foe', rank: number, distance: CombatDistance): number {
  const front = distance === 'near' ? 30 : 13;
  const x = Math.max(4, front - rank * 9);
  return side === 'ally' ? x : 100 - x;
}

/**
 * Palco animado da rodada: as silhuetas avançam, golpeiam, esquivam e recuam conforme cada
 * evento aparece. É só ilustração; o texto da linha do tempo, logo abaixo, continua sendo o
 * registro acessível da rodada.
 */
export function RoundStage({
  frame,
  distance,
  allies,
  foes,
  stepMs,
}: {
  frame: StageFrame | undefined;
  distance: CombatDistance;
  allies: readonly StageFigure[];
  foes: readonly StageFigure[];
  stepMs: number;
}) {
  const style = { '--stage-step': `${stepMs}ms` } as CSSProperties;
  // O alvo de golpes é quem está na frente do lado oposto, como no motor.
  const targetId = frame ? (frame.side === 'ally' ? foes[0]?.id : allies[0]?.id) : undefined;
  return (
    <div className={`round-stage round-stage--${distance}`} style={style} aria-hidden="true">
      <div className="round-stage__ground" />
      {[...allies.map((figure, rank) => ({ figure, rank, side: 'ally' as const })), ...foes.map((figure, rank) => ({ figure, rank, side: 'foe' as const }))].map(
        ({ figure, rank, side }) => (
          <StageFigureView
            key={`${side}-${figure.id}-${rank}`}
            figure={figure}
            side={side}
            rank={rank}
            left={positionOf(side, rank, distance)}
            frame={frame}
            acting={frame?.actorId === figure.id && frame.side === side}
            targeted={rank === 0 && figure.id === targetId}
          />
        ),
      )}
      {frame?.effect === 'combo' ? (
        <div key={`combo-${frame.index}`} className="round-stage__banner">
          Combo · {frame.comboName}
        </div>
      ) : null}
      {frame ? (
        <span key={`tick-${frame.index}`} className="round-stage__tick">
          T{frame.tick}
        </span>
      ) : null}
    </div>
  );
}

function StageFigureView({
  figure,
  side,
  rank,
  left,
  frame,
  acting,
  targeted,
}: {
  figure: StageFigure;
  side: 'ally' | 'foe';
  rank: number;
  left: number;
  frame: StageFrame | undefined;
  acting: boolean;
  targeted: boolean;
}) {
  const hurt = targeted && frame?.effect === 'strike' && frame.damage > 0;
  const evading = targeted && frame?.effect === 'evade';
  const state = acting ? `acting stage-fig--${frame!.effect}` : hurt ? 'hurt' : evading ? 'evading' : 'idle';
  const pose = acting ? frame!.pose : evading ? 'dodge' : 'stand';
  const size = rank === 0 ? 76 : 56;
  return (
    <div className={`stage-fig stage-fig--${side}`} style={{ left: `${left}%` }}>
      <div key={acting || hurt || evading ? `${state}-${frame!.index}` : 'idle'} className={`stage-fig__body stage-fig--${state}`}>
        <div className="stage-fig__art">
          {figure.shape === 'humanoid' ? (
            <Silhouette pose={pose} prop={figure.prop} tint={figure.tint} size={size} />
          ) : (
            <CreatureSilhouette shape={figure.shape} tint={figure.tint} size={size} />
          )}
        </div>
        {hurt ? <span className="stage-fig__float stage-fig__float--damage">−{frame!.damage}</span> : null}
        {acting && frame!.heal > 0 ? <span className="stage-fig__float stage-fig__float--heal">+{frame!.heal}</span> : null}
        {evading ? <span className="stage-fig__float stage-fig__float--evade">esquiva</span> : null}
        {acting && frame!.effect === 'interrupt' ? <span className="stage-fig__float stage-fig__float--interrupt">✕</span> : null}
        {acting && frame!.effect === 'out-of-range' ? <span className="stage-fig__float stage-fig__float--miss">longe</span> : null}
      </div>
      <span className="stage-fig__name">{figure.name}</span>
    </div>
  );
}
