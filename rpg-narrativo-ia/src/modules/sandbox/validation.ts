import { inspectCraftingState } from '../crafting';
import { inspectExplorationState } from '../exploration';
import { inspectNavigationState } from '../navigation';
import { inspectResourcesState } from '../resources';
import { inspectSandboxContext } from './context-validation';
import { createSandboxContext } from './initial-sandbox';
import type { SandboxContext, SandboxInspection, SandboxState } from './types';

export function inspectSandboxState(value: unknown, context?: SandboxContext): SandboxInspection {
  const inspectedContext = inspectSandboxContext(context ?? createSandboxContext());
  if (!inspectedContext.ok) {
    return fail(inspectedContext.reason);
  }

  if (!isRecord(value)) {
    return fail('O estado integrado do sandbox é inválido.');
  }

  const navigation = inspectNavigationState(value.navigation, inspectedContext.value.map);
  if (!navigation.ok) {
    return fail(navigation.reason);
  }

  const exploration = inspectExplorationState(
    value.exploration,
    inspectedContext.value.exploration,
    inspectedContext.value.map,
  );
  if (!exploration.ok) {
    return fail(exploration.reason);
  }

  const resources = inspectResourcesState(value.resources, inspectedContext.value.resources);
  if (!resources.ok) {
    return fail(resources.reason);
  }

  const crafting = inspectCraftingState(
    value.crafting,
    inspectedContext.value.crafting,
    inspectedContext.value.map,
  );
  if (!crafting.ok) {
    return fail(crafting.reason);
  }

  const state: SandboxState = {
    navigation: navigation.value,
    exploration: exploration.value,
    resources: resources.value,
    crafting: crafting.value,
  };

  return { ok: true, value: state };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(reason: string): SandboxInspection {
  return { ok: false, reason };
}
