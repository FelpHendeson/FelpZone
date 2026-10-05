export { applyWorldNarrativeTrigger } from './apply';
export { WorldEventError } from './errors';
export { indexWorldTriggerCatalog, inspectWorldTriggerCatalog } from './inspect';
export {
  consumeWorldTriggersMatchingNarrative,
  chapterWindow,
  findPendingChapterTrigger,
  isChapterKeyResolved,
  isConditionMet,
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
  WorldTriggerCondition,
  WorldTriggerEventSeenCondition,
  WorldTriggerFlagCondition,
  WorldTriggerInspection,
  WorldTriggerSource,
} from './types';
