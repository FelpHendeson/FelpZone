import { inspectCraftingState } from '../crafting';
import { inspectExplorationState } from '../exploration';
import { inspectNavigationState } from '../navigation';
import { inspectPresenceState } from '../presences';
import { inspectResourcesState } from '../resources';
import { inspectSandboxContext } from './context-validation';
import { createSandboxContext } from './initial-sandbox';
import type { SandboxContext, SandboxCoreState, SandboxInspection } from './types';

export function inspectSandboxState(value: unknown, context?: SandboxContext): SandboxInspection {
  const inspectedContext = inspectSandboxContext(context ?? createSandboxContext());
  if (!inspectedContext.ok) {
    return fail(inspectedContext.reason);
  }

  const core = inspectSandboxCore(value, inspectedContext.value);
  if (!core.ok) {
    return fail(core.reason);
  }

  if (!isRecord(value)) {
    return fail('O estado integrado do sandbox é inválido.');
  }

  const presences = inspectPresenceState(value.presences, inspectedContext.value.presences);
  if (!presences.ok) {
    return fail(presences.reason);
  }

  return {
    ok: true,
    value: {
      ...core.value,
      presences: presences.value,
    },
  };
}

export function inspectLegacySandboxState(
  value: unknown,
  context?: SandboxContext,
): { ok: true; value: SandboxCoreState } | { ok: false; reason: string } {
  const inspectedContext = inspectSandboxContext(context ?? createSandboxContext());
  if (!inspectedContext.ok) {
    return fail(inspectedContext.reason);
  }

  return inspectSandboxCore(value, inspectedContext.value);
}

function inspectSandboxCore(
  value: unknown,
  context: SandboxContext,
): { ok: true; value: SandboxCoreState } | { ok: false; reason: string } {
  if (!isRecord(value)) {
    return fail('O estado integrado do sandbox é inválido.');
  }

  const navigation = inspectNavigationState(value.navigation, context.map);
  if (!navigation.ok) {
    return fail(navigation.reason);
  }

  const exploration = inspectExplorationState(value.exploration, context.exploration, context.map);
  if (!exploration.ok) {
    return fail(exploration.reason);
  }

  const resources = inspectResourcesState(value.resources, context.resources);
  if (!resources.ok) {
    return fail(resources.reason);
  }

  const crafting = inspectCraftingState(value.crafting, context.crafting, context.map);
  if (!crafting.ok) {
    return fail(crafting.reason);
  }

  return {
    ok: true,
    value: {
      navigation: navigation.value,
      exploration: exploration.value,
      resources: resources.value,
      crafting: crafting.value,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(reason: string): SandboxInspection {
  return { ok: false, reason };
}
