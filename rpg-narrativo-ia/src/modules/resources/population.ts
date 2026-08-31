import { ResourceError, type PopulationDefinition, type PopulationState, type PopulationStatus } from './types';

export function derivePopulationStatus(
  definition: PopulationDefinition,
  state: Pick<PopulationState, 'current' | 'locallyExtinct'>,
): PopulationStatus {
  if (state.locallyExtinct || state.current === 0) {
    return 'exhausted';
  }

  if (state.current <= definition.criticalThreshold) {
    return 'threatened';
  }

  if (state.current <= definition.warningThreshold) {
    return 'declining';
  }

  if (state.current === definition.carryingCapacity) {
    return 'abundant';
  }

  return 'stable';
}

export function criticalRecoveryPerDay(definition: PopulationDefinition): number {
  if (definition.recoveryPerDay <= 0) {
    return 0;
  }

  return Math.max(1, Math.floor(definition.recoveryPerDay / 2));
}

export function recoverPopulation(
  definition: PopulationDefinition,
  state: PopulationState,
  days: number,
  recoveredDay: number,
): { state: PopulationState; recovered: number } {
  const next: PopulationState = {
    populationId: state.populationId,
    current: state.current,
    pressure: state.pressure,
    locallyExtinct: state.locallyExtinct,
    lastRecoveredDay: recoveredDay,
  };

  if (days <= 0 || next.locallyExtinct || next.current === 0) {
    if (next.current === 0) {
      next.locallyExtinct = true;
    }

    return { state: next, recovered: 0 };
  }

  let remaining = days;
  let current = next.current;

  if (current <= definition.criticalThreshold) {
    const rate = criticalRecoveryPerDay(definition);
    if (rate === 0) {
      remaining = 0;
    } else {
      const need = definition.criticalThreshold + 1 - current;
      const daysNeeded = Math.ceil(need / rate);
      const daysHere = Math.min(remaining, daysNeeded);
      current = capToCapacity(definition, addSafe(current, multiplySafe(rate, daysHere)));
      remaining -= daysHere;
    }
  }

  if (remaining > 0 && current > definition.criticalThreshold && current < definition.carryingCapacity) {
    const rate = definition.recoveryPerDay;
    if (rate > 0) {
      const room = definition.carryingCapacity - current;
      const daysNeeded = Math.ceil(room / rate);
      const daysHere = Math.min(remaining, daysNeeded);
      current = capToCapacity(definition, addSafe(current, multiplySafe(rate, daysHere)));
    }
  }

  const recovered = current - next.current;
  next.current = current;
  next.locallyExtinct = current === 0;
  next.pressure = next.pressure < recovered ? 0 : next.pressure - recovered;

  return { state: next, recovered };
}

function capToCapacity(definition: PopulationDefinition, value: number): number {
  return value > definition.carryingCapacity ? definition.carryingCapacity : value;
}

function multiplySafe(left: number, right: number): number {
  if (right === 0 || left === 0) {
    return 0;
  }

  if (left > Number.MAX_SAFE_INTEGER / right) {
    throw new ResourceError('A multiplicação ultrapassa o inteiro seguro.');
  }

  return left * right;
}

function addSafe(left: number, right: number): number {
  if (right > Number.MAX_SAFE_INTEGER - left) {
    throw new ResourceError('A soma ultrapassa o inteiro seguro.');
  }

  return left + right;
}
