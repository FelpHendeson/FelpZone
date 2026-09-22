export { applyWorldNarrativeTrigger } from './apply';
export { WorldEventError } from './errors';
export { indexWorldTriggerCatalog, inspectWorldTriggerCatalog } from './inspect';
export {
  consumeWorldTriggersMatchingNarrative,
  isDiscoveryRevealedInWorld,
  isWorldTriggerConsumed,
  listEligibleWorldTriggers,
  resolveEligibleWorldTrigger,
  WORLD_TRIGGER_FLAG_PREFIX,
  worldTriggerConsumedFlag,
} from './resolve';
export type {
  IndexedWorldTriggers,
  WorldNarrativeTriggerDefinition,
  WorldTriggerCatalogContext,
  WorldTriggerFlagCondition,
  WorldTriggerInspection,
  WorldTriggerSource,
} from './types';
