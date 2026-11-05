import type { RefObject } from 'react';
import { climateAt, weatherDescription, type World } from '../simulation/world';
import { NORMAL_DAY_MS, SPEEDS } from '../simulation/dayClock';

type Props = {
  world: World; running: boolean; speed: number; canStep: boolean; locked?: boolean; progress: RefObject<HTMLProgressElement | null>;
  onToggleRunning: () => void; onStep: () => void; onSpeed: (value: number) => void;
  panels: { left: boolean; right: boolean }; onTogglePanel: (side: 'left' | 'right') => void;
};
const seasonIcon: Record<string, string> = { Primavera: '✿', Verão: '☀', Outono: '❦', Inverno: '❄' };

/** The always-visible strip: where and when the world is, and how fast it runs. */
export function Hud({ world, running, speed, canStep, locked = false, progress, onToggleRunning, onStep, onSpeed, panels, onTogglePanel }: Props) {
  const climate = climateAt(world.seed, world.day);
  return <header className="hud">
    <button type="button" className="hud-panel-toggle" aria-pressed={panels.left} aria-controls="side-panel" aria-label={panels.left ? 'Recolher painel lateral' : 'Abrir painel lateral'} onClick={() => onTogglePanel('left')}>☰</button>
    <a className="brand" href="./"><span className="brand-symbol">◈</span> Matrix Sim</a>
    <span className="hud-world" title="Semente do mundo">{world.seed}</span>
    <div className="hud-date" aria-label={`Dia ${world.day}, ${climate.season} do ano ${climate.year}`}>
      <span className="hud-season" data-season={climate.season}>{seasonIcon[climate.season]} {climate.season}</span>
      <strong>Dia {world.day}</strong><span>Ano {climate.year}</span>
    </div>
    <div className="hud-stats"><span><strong>{world.life.creatures.length}</strong> Folhins</span><span><strong>{world.life.bands.filter(b => world.life.creatures.some(c => c.bandId === b.id)).length}</strong> bandos</span><span className="hud-weather">{weatherDescription(world)}</span></div>
    <div className="hud-time" aria-label="Passagem do tempo">
      <button type="button" className="hud-play" aria-pressed={running} disabled={locked} title={locked ? 'O tempo começa depois da Gênese' : undefined} onClick={onToggleRunning}>{running ? '❚❚ Pausar' : '▶ Iniciar'}</button>
      <button type="button" className="hud-step" disabled={running || !canStep} onClick={onStep} title="Avançar até o próximo dia">+1 dia</button>
      <div className="speed-selector" role="group" aria-label="Velocidade da simulação">{SPEEDS.map(value => <button key={value} type="button" aria-label={`Velocidade ${value.toLocaleString('pt-BR')} vezes`} aria-pressed={speed === value} className={speed === value ? 'speed-active' : ''} onClick={() => onSpeed(value)} title={`1 dia a cada ${NORMAL_DAY_MS / 1000 / value} segundos`}>{value.toLocaleString('pt-BR')}×</button>)}</div>
      <progress ref={progress} max={1} defaultValue={0} aria-label="Progresso até o próximo dia" />
    </div>
    <button type="button" className="hud-panel-toggle" aria-pressed={panels.right} aria-controls="voice-panel" aria-label={panels.right ? 'Recolher a Voz do Mundo' : 'Abrir a Voz do Mundo'} onClick={() => onTogglePanel('right')}>❝</button>
  </header>;
}
