import { useMemo, useState, type FormEvent } from 'react';
import { normalizeIdentity, validateIdentity } from '../../modules/character';

interface CreateCharacterScreenProps {
  onBack: () => void;
  onConfirm: (firstName: string, lastName: string) => void;
}

export function CreateCharacterScreen({ onBack, onConfirm }: CreateCharacterScreenProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [submitted, setSubmitted] = useState(false);

  const validation = useMemo(() => validateIdentity(firstName, lastName), [firstName, lastName]);
  const identity = normalizeIdentity(firstName, lastName);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!validation.ok) {
      return;
    }

    setStep('confirm');
  }

  if (step === 'confirm') {
    return (
      <main className="screen">
        <p className="eyebrow">Confirmação</p>
        <h1 className="title title--small">Começar como {identity.firstName} {identity.lastName}?</h1>
        <p className="lede">
          Esse será o nome que o Sistema reconhece. Não há família esperando do outro lado do vale.
        </p>
        <div className="button-stack">
          <button
            type="button"
            className="button button--primary"
            onClick={() => onConfirm(identity.firstName, identity.lastName)}
          >
            Confirmar e despertar
          </button>
          <button type="button" className="button button--ghost" onClick={() => setStep('form')}>
            Corrigir nome
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="screen">
      <p className="eyebrow">Criação de personagem</p>
      <h1 className="title title--small">Quem acorda neste mundo?</h1>
      <form className="form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span>Nome</span>
          <input
            name="firstName"
            autoComplete="given-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            aria-invalid={submitted && Boolean(validation.firstNameError)}
            aria-describedby={submitted && validation.firstNameError ? 'first-name-error' : undefined}
          />
          {submitted && validation.firstNameError ? (
            <span id="first-name-error" className="field__error">
              {validation.firstNameError}
            </span>
          ) : null}
        </label>
        <label className="field">
          <span>Sobrenome</span>
          <input
            name="lastName"
            autoComplete="family-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            aria-invalid={submitted && Boolean(validation.lastNameError)}
            aria-describedby={submitted && validation.lastNameError ? 'last-name-error' : undefined}
          />
          {submitted && validation.lastNameError ? (
            <span id="last-name-error" className="field__error">
              {validation.lastNameError}
            </span>
          ) : null}
        </label>
        <div className="button-stack">
          <button type="submit" className="button button--primary">
            Continuar
          </button>
          <button type="button" className="button button--ghost" onClick={onBack}>
            Voltar
          </button>
        </div>
      </form>
    </main>
  );
}
