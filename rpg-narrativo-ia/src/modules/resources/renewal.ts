import {
  TimeError,
  advanceTime,
  inspectTimeState,
  type PeriodDefinition,
  type TimeState,
} from '../time';
import { ResourceError, type RenewalPolicy, type ResourceNodeState } from './types';

export function compareGameTime(
  left: TimeState,
  right: TimeState,
  config: readonly PeriodDefinition[],
): number {
  if (left.day !== right.day) {
    return left.day < right.day ? -1 : 1;
  }

  const leftIndex = periodIndex(config, left.periodId);
  const rightIndex = periodIndex(config, right.periodId);
  return leftIndex - rightIndex;
}

export function isSameGameTime(left: TimeState, right: TimeState): boolean {
  return left.day === right.day && left.periodId === right.periodId;
}

export function isRenewalDue(
  now: TimeState,
  nextRenewalAt: TimeState,
  config: readonly PeriodDefinition[],
): boolean {
  return compareGameTime(now, nextRenewalAt, config) >= 0;
}

export function scheduleRenewal(
  collectedAt: TimeState,
  renewal: RenewalPolicy,
  config: readonly PeriodDefinition[],
): TimeState | undefined {
  if (renewal.type === 'none' || renewal.type === 'population') {
    return undefined;
  }

  if (renewal.type === 'short') {
    try {
      return copyTime(advanceTime(collectedAt, { periods: renewal.periods }, config).current);
    } catch (error) {
      if (error instanceof TimeError) {
        throw new ResourceError(error.message, { cause: error });
      }

      throw error;
    }
  }

  if (renewal.days > Number.MAX_SAFE_INTEGER - collectedAt.day) {
    throw new ResourceError('O avanço ultrapassa o dia máximo permitido.');
  }

  return {
    day: collectedAt.day + renewal.days,
    periodId: collectedAt.periodId,
  };
}

export function restoreNodeIfDue(
  node: ResourceNodeState,
  capacity: number,
  renewal: RenewalPolicy,
  now: TimeState,
  config: readonly PeriodDefinition[],
): ResourceNodeState {
  if (renewal.type !== 'short' && renewal.type !== 'long') {
    return copyNodeState(node);
  }

  if (!node.nextRenewalAt) {
    return copyNodeState(node);
  }

  const target = inspectTimeState(node.nextRenewalAt, config);
  if (!target.ok) {
    throw new ResourceError('A data do ponto é inválida.');
  }

  if (!isRenewalDue(now, target.value, config)) {
    return copyNodeState(node);
  }

  return {
    nodeId: node.nodeId,
    availableUnits: capacity,
    lastCollectedAt: node.lastCollectedAt ? copyTime(node.lastCollectedAt) : undefined,
    exhausted: false,
  };
}

export function copyTime(state: TimeState): TimeState {
  return {
    day: state.day,
    periodId: state.periodId,
  };
}

export function copyNodeState(state: ResourceNodeState): ResourceNodeState {
  const copied: ResourceNodeState = {
    nodeId: state.nodeId,
    availableUnits: state.availableUnits,
    exhausted: state.exhausted,
  };

  if (state.lastCollectedAt) {
    copied.lastCollectedAt = copyTime(state.lastCollectedAt);
  }

  if (state.nextRenewalAt) {
    copied.nextRenewalAt = copyTime(state.nextRenewalAt);
  }

  return copied;
}

function periodIndex(config: readonly PeriodDefinition[], periodId: string): number {
  const index = config.findIndex((period) => period.id === periodId);
  if (index < 0) {
    throw new ResourceError('O período da partida é inválido.');
  }

  return index;
}
