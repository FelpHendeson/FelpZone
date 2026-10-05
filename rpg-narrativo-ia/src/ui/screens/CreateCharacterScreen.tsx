import { useMemo, useState, type FormEvent } from 'react';
import type { CharacterSex, PortraitConfig } from '../../core/state';
import { INITIAL_ARCHETYPES } from '../../modules/archetypes';
import { normalizeIdentity, validateIdentity } from '../../modules/character';
import { PortraitAvatar } from '../components/PortraitAvatar';
import { Silhouette } from '../components/Silhouette';
import { HAIR_COLORS, HAIR_STYLES, SKIN_TONES, prepareCustomPortrait, readCustomPortrait, writeCustomPortrait } from '../portrait';

export interface CharacterCreation {
  firstName: string;
  lastName: string;
  sex: Exclude<CharacterSex, 'unspecified'>;
  archetypeId: string;
  portrait: PortraitConfig;
}

interface CreateCharacterScreenProps {
  onBack: () => void;
  onConfirm: (character: CharacterCreation) => void;
}

type Step = 'form' | 'archetype' | 'portrait' | 'confirm';

export function CreateCharacterScreen({ onBack, onConfirm }: CreateCharacterScreenProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sex, setSex] = useState<Exclude<CharacterSex, 'unspecified'> | null>(null);
  const [step, setStep] = useState<Step>('form');
  const [archetypeId, setArchetypeId] = useState<string>(INITIAL_ARCHETYPES.archetypes[0]!.id);
  const [portrait, setPortrait] = useState<PortraitConfig>({ kind: 'silhouette', skin: 1, hair: 1, hairColor: 1 });
  const [customSrc, setCustomSrc] = useState<string | null>(() => readCustomPortrait());
  const [uploadError, setUploadError] = useState<string | null>(null);
  const archetype = INITIAL_ARCHETYPES.byId.get(archetypeId)!;
  const [submitted, setSubmitted] = useState(false);

  const validation = useMemo(() => validateIdentity(firstName, lastName), [firstName, lastName]);
  const identity = normalizeIdentity(firstName, lastName);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!validation.ok || sex === null) {
      return;
    }

    setStep('archetype');
  }

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    try {
      const src = await prepareCustomPortrait(file);
      if (!writeCustomPortrait(src)) throw new Error('Este aparelho não deixou guardar a imagem.');
      setCustomSrc(src);
      setPortrait({ kind: 'custom' });
      setUploadError(null);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'A imagem não pôde ser usada.');
    }
  }

  if (step === 'archetype') {
    return (
      <main className="screen character-create character-create--wide">
        <p className="eyebrow">Inclinação do despertar</p>
        <h1 className="title title--small">Que aprendiz o Sistema reconhece em você?</h1>
        <p className="lede lede--tight">
          O arquétipo é a sua identidade e define o equipamento e a técnica com que você desperta. Ele não tranca caminhos: qualquer
          habilidade continua ao seu alcance.
        </p>
        <div className="archetype-grid" role="radiogroup" aria-label="Arquétipo de aprendiz">
          {INITIAL_ARCHETYPES.archetypes.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="radio"
              aria-checked={entry.id === archetypeId}
              className={entry.id === archetypeId ? 'archetype-card archetype-card--active' : 'archetype-card'}
              style={{ ['--archetype' as string]: entry.palette.primary }}
              onClick={() => setArchetypeId(entry.id)}
            >
              {entry.image?.src ? (
                <img className="archetype-card__art" src={entry.image.src} alt={entry.image.label} width={78} height={94} />
              ) : (
                <Silhouette pose={entry.pose} prop={entry.prop} tint="#eef3f6" glow={entry.palette.primary} size={78} />
              )}
              <strong>{entry.name}</strong>
              <small>{entry.summary}</small>
            </button>
          ))}
        </div>
        <p className="archetype-detail">{archetype.description}</p>
        <div className="button-stack">
          <button type="button" className="button button--primary" onClick={() => setStep('portrait')}>
            Seguir como {archetype.name}
          </button>
          <button type="button" className="button button--ghost" onClick={() => setStep('form')}>
            Voltar
          </button>
        </div>
      </main>
    );
  }

  if (step === 'portrait') {
    const silhouette = portrait.kind === 'silhouette' ? portrait : { kind: 'silhouette' as const, skin: 1, hair: 1, hairColor: 1 };
    const update = (patch: Partial<Extract<PortraitConfig, { kind: 'silhouette' }>>) => setPortrait({ ...silhouette, ...patch });
    return (
      <main className="screen screen--narrow character-create">
        <p className="eyebrow">Retrato</p>
        <h1 className="title title--small">Como você se imagina?</h1>
        <div className="portrait-preview">
          <PortraitAvatar portrait={portrait} archetypeId={archetypeId} customSrc={customSrc} size={132} label="Prévia do retrato" />
        </div>
        <fieldset className="portrait-options">
          <legend>Tom de pele</legend>
          <div className="swatches">
            {SKIN_TONES.map((color, index) => (
              <button key={color} type="button" className="swatch" aria-label={`Tom ${index + 1}`} aria-pressed={portrait.kind === 'silhouette' && silhouette.skin === index} style={{ background: color }} onClick={() => update({ skin: index })} />
            ))}
          </div>
        </fieldset>
        <fieldset className="portrait-options">
          <legend>Cabelo</legend>
          <div className="chip-row">
            {HAIR_STYLES.map((name, index) => (
              <button key={name} type="button" className="chip" aria-pressed={portrait.kind === 'silhouette' && silhouette.hair === index} onClick={() => update({ hair: index })}>
                {name}
              </button>
            ))}
          </div>
          <div className="swatches">
            {HAIR_COLORS.map((color, index) => (
              <button key={color} type="button" className="swatch" aria-label={`Cor ${index + 1}`} aria-pressed={portrait.kind === 'silhouette' && silhouette.hairColor === index} style={{ background: color }} onClick={() => update({ hairColor: index })} />
            ))}
          </div>
        </fieldset>
        <fieldset className="portrait-options">
          <legend>Imagem própria</legend>
          <p className="portrait-options__hint">Use uma arte ou foto sua. Ela fica só neste aparelho e não vai no Selo do Eco.</p>
          <label className="button button--ghost portrait-upload">
            Escolher imagem
            <input type="file" accept="image/*" onChange={(event) => void handleUpload(event.target.files?.[0])} />
          </label>
          {customSrc && portrait.kind !== 'custom' ? (
            <button type="button" className="button button--ghost" onClick={() => setPortrait({ kind: 'custom' })}>
              Usar a imagem já escolhida
            </button>
          ) : null}
          {uploadError ? <span className="field__error">{uploadError}</span> : null}
        </fieldset>
        <div className="button-stack">
          <button type="button" className="button button--primary" onClick={() => setStep('confirm')}>
            Continuar
          </button>
          <button type="button" className="button button--ghost" onClick={() => setStep('archetype')}>
            Voltar
          </button>
        </div>
      </main>
    );
  }

  if (step === 'confirm') {
    return (
      <main className="screen screen--narrow character-create">
        <p className="eyebrow">Confirmação</p>
        <div className="portrait-preview">
          <PortraitAvatar portrait={portrait} archetypeId={archetypeId} customSrc={customSrc} size={96} />
        </div>
        <h1 className="title title--small">Começar como {identity.firstName} {identity.lastName}?</h1>
        <p className="lede">
          Esse será o nome que o Sistema reconhece. Identidade: {sex === 'male' ? 'masculino' : 'feminino'}. Inclinação:{' '}
          {archetype.name}. Não há família esperando do outro lado do vale.
        </p>
        <div className="button-stack">
          <button
            type="button"
            className="button button--primary"
            onClick={() => {
              if (sex !== null) {
                onConfirm({ firstName: identity.firstName, lastName: identity.lastName, sex, archetypeId, portrait });
              }
            }}
          >
            Confirmar e despertar
          </button>
          <button type="button" className="button button--ghost" onClick={() => setStep('portrait')}>
            Voltar
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="screen screen--narrow character-create">
      <p className="eyebrow">Criação de personagem</p>
      <h1 className="title title--small">Quem acorda neste mundo?</h1>
      <p className="lede lede--tight">Seu nome é a primeira coisa que o Sistema conseguirá reconhecer.</p>
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
        <fieldset className="field">
          <legend>Sexo</legend>
          <label>
            <input
              type="radio"
              name="sex"
              value="male"
              checked={sex === 'male'}
              onChange={() => setSex('male')}
            />
            Masculino
          </label>
          <label>
            <input
              type="radio"
              name="sex"
              value="female"
              checked={sex === 'female'}
              onChange={() => setSex('female')}
            />
            Feminino
          </label>
          {submitted && sex === null ? (
            <span className="field__error" role="alert">
              Escolha o sexo do personagem.
            </span>
          ) : null}
        </fieldset>
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
