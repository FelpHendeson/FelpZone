import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { validateCampaign } from '../core/engine';
import { getEventById, getVisibleScript, type ScriptLine } from '../core/events';
import { storyVars } from '../modules/character';
import { ScriptStage } from '../ui/components/ScriptStage';
import { GameScreen } from '../ui/screens/GameScreen';
import { freshState, stubCampaign } from './helpers';

const noop = () => undefined;

function withScript(script: ScriptLine[] | undefined, body = '') {
  const campaign = stubCampaign({ abilities: [{ id: 'olhar', name: 'Olhar', description: 'x' }], npcs: [{ id: 'mira', name: 'Mira' }] });
  campaign.events[0] = { ...campaign.events[0]!, body, script };
  return campaign;
}

describe('Roteiro de visual novel — contrato e validação', () => {
  it('aceita evento só com roteiro e recusa evento sem texto nem roteiro', () => {
    expect(validateCampaign(withScript([{ kind: 'narration', text: 'Você acorda, {{nome}}.' }]))).toEqual([]);
    expect(validateCampaign(withScript(undefined))).toContain('O evento start não possui texto nem roteiro.');
    expect(validateCampaign(withScript([]))).toContain('O evento start possui roteiro vazio.');
  });

  it('valida tipo, texto, falante, variáveis e condições de cada linha', () => {
    const errors = validateCampaign(
      withScript([
        { kind: 'narration', text: 'ok' },
        { kind: 'speech', speakerId: 'fantasma', text: 'Oi' },
        { kind: 'system', text: '   ' },
        { kind: 'thought', text: '{{desconhecida}}' },
        { kind: 'narration', text: 'x', conditions: [{ type: 'ability.has', abilityId: 'inexistente' }] },
        { kind: 'bogus', text: 'x' } as unknown as ScriptLine,
      ]),
    );
    expect(errors.some((error) => error.includes('NPC fantasma'))).toBe(true);
    expect(errors.some((error) => error.includes('linha 3') && error.includes('não possui texto'))).toBe(true);
    expect(errors.some((error) => error.includes('{{desconhecida}}'))).toBe(true);
    expect(errors.some((error) => error.includes('capacidade inexistente'))).toBe(true);
    expect(errors.some((error) => error.includes('linha 6') && error.includes('tipo inválido'))).toBe(true);
  });

  it('exige ao menos uma linha incondicional para nenhuma rota ver cena vazia', () => {
    const errors = validateCampaign(
      withScript([{ kind: 'narration', text: 'só com aptidão', conditions: [{ type: 'ability.has', abilityId: 'olhar' }] }]),
    );
    expect(errors).toContain('O roteiro do evento start precisa de ao menos uma linha sem condição.');
  });

  it('filtra linhas por aptidão no motor, não no React', () => {
    const state = freshState();
    const event = {
      ...stubCampaign().events[0]!,
      script: [
        { kind: 'narration' as const, text: 'sempre' },
        { kind: 'system' as const, text: 'só para Olhar', conditions: [{ type: 'ability.has' as const, abilityId: 'olhar-atento' }] },
      ],
    };
    expect(getVisibleScript(event, state).map((line) => line.text)).toEqual(['sempre']);
    const withAbility = { ...state, progression: { ...state.progression, abilityIds: ['olhar-atento'] } };
    expect(getVisibleScript(event, withAbility).map((line) => line.text)).toEqual(['sempre', 'só para Olhar']);
  });

  it('flexiona {{desperto}} pelo sexo do personagem', () => {
    expect(storyVars({ firstName: 'A', lastName: 'B', sex: 'female' }).desperto).toBe('Desperta');
    expect(storyVars({ firstName: 'A', lastName: 'B', sex: 'male' }).desperto).toBe('Desperto');
    expect(storyVars({ firstName: 'A', lastName: 'B' }).desperto).toBe('Desperto(a)');
  });
});

describe('Roteiro de visual novel — conteúdo do Dia 1', () => {
  it('abre o Dia 1 com narração, janela do Sistema e pensamento do personagem', () => {
    for (const id of ['awakening', 'system-awakens', 'choose-ability', 'eteris-introduction', 'numen-introduction', 'first-numen-practice']) {
      const script = getEventById(firstDayCampaign, id)?.script ?? [];
      expect(script.length, id).toBeGreaterThan(2);
    }
    const kinds = new Set(getEventById(firstDayCampaign, 'system-awakens')?.script?.map((line) => line.kind));
    expect(kinds).toEqual(new Set(['narration', 'system', 'thought']));
    expect(validateCampaign(firstDayCampaign)).toEqual([]);
  });
});

describe('Vozes da aptidão', () => {
  it('cada aptidão ouve só a própria voz depois da escolha, e quem não escolheu não ouve nenhuma', () => {
    const event = getEventById(firstDayCampaign, 'eteris-introduction')!;
    const state = freshState();
    const base = getVisibleScript(event, state).length;
    for (const [abilityId, tag] of [['olhar-atento', '[Olhar Atento]'], ['resiliencia', '[Resiliência]'], ['voz-calma', '[Voz Calma]']] as const) {
      const lines = getVisibleScript(event, { ...state, progression: { ...state.progression, abilityIds: [abilityId] } });
      expect(lines.length).toBe(base + 1);
      expect(lines.at(-1)?.text.startsWith(tag)).toBe(true);
    }
    expect(getVisibleScript(event, state).some((line) => line.conditions)).toBe(false);
  });
});

describe('Roteiro de visual novel — tela', () => {
  const lines: ScriptLine[] = [
    { kind: 'narration', text: 'Você abre os olhos, **{{nome}}**.' },
    { kind: 'system', text: 'Usuário reconhecido.' },
  ];

  it('mostra só a primeira linha, com negrito e variáveis, e oferece avançar e pular', () => {
    const html = renderToStaticMarkup(
      <ScriptStage lines={lines} playerName="Ana" speakers={{}} interpolate={(text) => text.replace('{{nome}}', 'Ana')} onComplete={noop} charDelay={0} />,
    );
    expect(html).toContain('<strong>Ana</strong>');
    expect(html).toContain('aria-label="Avançar diálogo"');
    expect(html).toContain('Pular cena');
    expect(html).not.toContain('Usuário reconhecido');
  });

  it('abre a janela do Sistema quando a linha atual é do Sistema', () => {
    const html = renderToStaticMarkup(
      <ScriptStage lines={[lines[1]!]} playerName="Ana" speakers={{}} interpolate={(text) => text} onComplete={noop} charDelay={0} />,
    );
    expect(html).toContain('[ Sistema ]');
    expect(html).toContain('aria-label="Mensagem do Sistema"');
    expect(html).toContain('Usuário reconhecido.');
  });

  it('mostra retrato e nome de quem fala', () => {
    const html = renderToStaticMarkup(
      <ScriptStage
        lines={[{ kind: 'speech', speakerId: 'mira-vale', text: 'Fique onde está.' }]}
        playerName="Ana"
        speakers={{ 'mira-vale': { name: 'Mira Vale', portraitSrc: '/images/first-day/npcs/mira-vale.webp' } }}
        interpolate={(text) => text}
        onComplete={noop}
        charDelay={0}
      />,
    );
    expect(html).toContain('Mira Vale');
    expect(html).toContain('src="/images/first-day/npcs/mira-vale.webp"');
  });

  it('esconde as escolhas até a cena terminar', () => {
    const state = freshState();
    const event = getEventById(firstDayCampaign, 'awakening')!;
    const html = renderToStaticMarkup(
      <GameScreen state={state} campaign={firstDayCampaign} event={event} choices={event.choices} onChoose={noop} onExit={noop} />,
    );
    expect(html).toContain('vn-stage');
    expect(html).not.toContain('Como você reage?');
  });
});
