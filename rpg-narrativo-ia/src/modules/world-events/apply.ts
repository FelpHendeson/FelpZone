import { startNarrativeSession } from '../../core/engine/startNarrativeSession';
import type { Campaign } from '../../core/events';
import type { GameState } from '../../core/state';
import { WorldEventError } from './errors';
import { isWorldTriggerConsumed, worldTriggerConsumedFlag } from './resolve';
import type { WorldNarrativeTriggerDefinition } from './types';

export function applyWorldNarrativeTrigger(
  state: GameState,
  campaign: Campaign,
  trigger: WorldNarrativeTriggerDefinition,
): GameState {
  if (trigger.campaignId !== campaign.id) {
    throw new WorldEventError(`O gatilho ${trigger.id} não pertence à campanha ${campaign.id}.`);
  }

  if (isWorldTriggerConsumed(state, trigger.id)) {
    throw new WorldEventError(`O gatilho ${trigger.id} já foi consumido.`);
  }

  const flagged: GameState = {
    ...state,
    flags: {
      ...state.flags,
      [worldTriggerConsumedFlag(trigger.id)]: true,
    },
  };

  return startNarrativeSession(flagged, campaign, trigger.eventId);
}
