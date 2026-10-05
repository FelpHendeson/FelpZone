import type { ClockFormat } from '../../clock';
import type { GuidanceLevel } from '../../preferences';
import { DetailScreen } from './shared';

export function Choice<T extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: T;
  options: Array<{ id: T; label: string; hint: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="settings-choice" role="radiogroup" aria-label={name}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          className={value === option.id ? 'settings-choice__item settings-choice__item--active' : 'settings-choice__item'}
          onClick={() => onChange(option.id)}
        >
          <strong>{option.label}</strong>
          <small>{option.hint}</small>
        </button>
      ))}
    </div>
  );
}

export function SettingsPanel({
  clockFormat,
  guidanceLevel,
  onClockFormat,
  onGuidanceLevel,
  onReplayTour,
  onBack,
}: {
  clockFormat: ClockFormat;
  guidanceLevel: GuidanceLevel;
  onClockFormat: (format: ClockFormat) => void;
  onGuidanceLevel: (level: GuidanceLevel) => void;
  onReplayTour: () => void;
  onBack: () => void;
}) {
  return (
    <DetailScreen title="Configurações" eyebrow="Preferências deste aparelho" tone="system" onBack={onBack}>
      <p className="detail-screen__intro">Valem só para este aparelho e não mudam a sua partida.</p>
      <section className="settings-section" aria-labelledby="settings-clock">
        <h2 id="settings-clock">Relógio</h2>
        <Choice
          name="Formato do relógio"
          value={clockFormat}
          onChange={onClockFormat}
          options={[
            { id: '24h', label: '24 horas', hint: '07:00, 19:00' },
            { id: '12h', label: '12 horas', hint: '7:00 AM, 7:00 PM' },
          ]}
        />
      </section>
      <section className="settings-section" aria-labelledby="settings-guidance">
        <h2 id="settings-guidance">Orientação do Sistema</h2>
        <Choice
          name="Nível de orientação"
          value={guidanceLevel}
          onChange={onGuidanceLevel}
          options={[
            { id: 'guided', label: 'Guiada', hint: 'Avisos urgentes em janela e dicas no Mundo' },
            { id: 'subtle', label: 'Discreta', hint: 'Só dicas no cartão do Mundo' },
            { id: 'off', label: 'Desligada', hint: 'Sem dicas; a Ajuda continua disponível' },
          ]}
        />
        <button type="button" className="button button--ghost" onClick={onReplayTour}>Rever o tour inicial</button>
      </section>
    </DetailScreen>
  );
}
