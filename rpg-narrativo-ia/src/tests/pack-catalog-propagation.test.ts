import { describe, expect, it } from 'vitest';
import { startGame } from '../core/engine';
import { assembleFirstDayRaw, composeWorld } from '../modules/content';
import { INITIAL_COMBAT } from '../modules/combat';
import { createSandboxContextFromWorld } from '../modules/sandbox';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { INITIAL_SKILLS } from '../modules/skills';
import { buildSystemStatus } from '../modules/system-interface';
import { INITIAL_TRAINING } from '../modules/training';
import { describeSandboxFeedback } from '../ui/sandbox/feedback';
import { now } from './helpers';

describe('propagação dos catálogos do pack ativo', () => {
  it('composeWorld, o contexto e a engine usam o pack e não caem no first-day', () => {
    const raw = structuredClone(assembleFirstDayRaw()) as {
      skills: { skills: Array<{ id: string; name: string }> };
      training: { methods: Array<{ id: string; name: string }> };
      combat: { encounters: Array<{ id: string; name: string }> };
    };
    const skill = raw.skills.skills.find((entry) => entry.id === 'sharpened-senses');
    const method = raw.training.methods.find((entry) => entry.id === 'focused-perception-drill');
    const encounter = raw.combat.encounters.find((entry) => entry.id === 'clearing-predator');
    expect(skill).toBeDefined();
    expect(method).toBeDefined();
    expect(encounter).toBeDefined();
    skill!.name = 'Percepção Alterada';
    method!.name = 'Drill de Percepção Alternativa';
    encounter!.name = 'Ameaça do Pack';

    const world = composeWorld(raw, 'memory:alt-pack');
    expect(world.skills.skillById.get('sharpened-senses')?.name).toBe('Percepção Alterada');
    expect(world.training.byId.get('focused-perception-drill')?.name).toBe('Drill de Percepção Alternativa');
    expect(world.combat.encounterById.get('clearing-predator')?.name).toBe('Ameaça do Pack');

    const context = createSandboxContextFromWorld(world);
    expect(context.skills?.skillById.get('sharpened-senses')?.name).toBe('Percepção Alterada');
    expect(context.training?.byId.get('focused-perception-drill')?.name).toBe('Drill de Percepção Alternativa');
    expect(context.combat?.encounterById.get('clearing-predator')?.name).toBe('Ameaça do Pack');
    expect(INITIAL_SKILLS.skillById.get('sharpened-senses')?.name).toBe('Sentidos Aguçados');
    expect(INITIAL_TRAINING.byId.get('focused-perception-drill')?.name).toBe('Treino de Percepção Focada');
    expect(INITIAL_COMBAT.encounterById.get('clearing-predator')?.name).not.toBe('Ameaça do Pack');

    const started = startGame(
      { firstName: 'Lia', lastName: 'Nunes' },
      world.campaign,
      now,
      context,
      world.objectives,
    );
    const state = { ...started, narrativeSession: null };
    const status = buildSystemStatus(state, context);
    expect(status.knownSkills.map((entry) => entry.name)).toContain('Percepção Alterada');
    expect(status.knownSkills.map((entry) => entry.name)).not.toContain('Sentidos Aguçados');
    expect(status.trainings.find((training) => training.methodId === 'focused-perception-drill')?.name).toBe(
      'Drill de Percepção Alternativa',
    );

    const trained = executeSandboxAction(
      state,
      { type: 'training.train', methodId: 'focused-perception-drill' },
      { now, context },
    );
    const feedback = describeSandboxFeedback(trained, context);
    expect(feedback.message).toContain('Drill de Percepção Alternativa');
    expect(feedback.message).not.toContain('Treino de Percepção Focada');
  });

  it('falha em vez de cair no first-day quando o catálogo do pack está ausente', () => {
    const world = composeWorld(assembleFirstDayRaw(), 'memory:missing-training');
    const fullContext = createSandboxContextFromWorld(world);
    const context = { ...fullContext, training: undefined };
    const started = startGame(
      { firstName: 'Lia', lastName: 'Nunes' },
      world.campaign,
      now,
      fullContext,
      world.objectives,
    );
    const state = { ...started, narrativeSession: null };

    expect(() =>
      executeSandboxAction(state, { type: 'training.train', methodId: 'focused-perception-drill' }, { now, context }),
    ).toThrow(/catálogo de treinamentos do pack ativo/);
  });
});
