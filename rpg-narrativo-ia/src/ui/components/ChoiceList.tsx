import type { StoryChoice } from '../../core/events';

interface ChoiceListProps {
  choices: StoryChoice[];
  onChoose: (choiceId: string) => void;
  disabled?: boolean;
}

export function ChoiceList({ choices, onChoose, disabled = false }: ChoiceListProps) {
  return (
    <ul className="choice-list">
      {choices.map((choice) => (
        <li key={choice.id}>
          <button
            type="button"
            className="choice-button"
            disabled={disabled}
            onClick={() => onChoose(choice.id)}
          >
            <span className="choice-button__label">{choice.label}</span>
            {choice.hint ? <span className="choice-button__hint">{choice.hint}</span> : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
