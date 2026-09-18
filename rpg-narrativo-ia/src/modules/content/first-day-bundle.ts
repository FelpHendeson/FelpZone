import campaign from '../../../content/first-day/campaign/campaign.json' with { type: 'json' };
import events from '../../../content/first-day/campaign/events.json' with { type: 'json' };
import firstPriorityTrigger from '../../../content/first-day/campaign/first-priority-trigger.json' with { type: 'json' };
import objectives from '../../../content/first-day/campaign/objectives.json' with { type: 'json' };
import worldTriggers from '../../../content/first-day/campaign/world-triggers.json' with { type: 'json' };
import pack from '../../../content/first-day/pack.json' with { type: 'json' };
import combat from '../../../content/first-day/system/combat.json' with { type: 'json' };
import conditions from '../../../content/first-day/system/conditions.json' with { type: 'json' };
import execution from '../../../content/first-day/system/execution.json' with { type: 'json' };
import registry from '../../../content/first-day/system/registry.json' with { type: 'json' };
import energetics from '../../../content/first-day/system/energetics.json' with { type: 'json' };
import garden from '../../../content/first-day/system/garden.json' with { type: 'json' };
import items from '../../../content/first-day/system/items.json' with { type: 'json' };
import mastery from '../../../content/first-day/system/mastery.json' with { type: 'json' };
import recipes from '../../../content/first-day/system/recipes.json' with { type: 'json' };
import skills from '../../../content/first-day/system/skills.json' with { type: 'json' };
import structures from '../../../content/first-day/system/structures.json' with { type: 'json' };
import training from '../../../content/first-day/system/training.json' with { type: 'json' };
import labels from '../../../content/first-day/ui/labels.json' with { type: 'json' };
import exploration from '../../../content/first-day/world/exploration.json' with { type: 'json' };
import bonds from '../../../content/first-day/world/bonds.json' with { type: 'json' };
import organizations from '../../../content/first-day/world/organizations.json' with { type: 'json' };
import party from '../../../content/first-day/world/party.json' with { type: 'json' };
import calendar from '../../../content/first-day/world/calendar.json' with { type: 'json' };
import family from '../../../content/first-day/world/family.json' with { type: 'json' };
import civic from '../../../content/first-day/world/civic.json' with { type: 'json' };
import economy from '../../../content/first-day/world/economy.json' with { type: 'json' };
import settlements from '../../../content/first-day/world/settlements.json' with { type: 'json' };
import politics from '../../../content/first-day/world/politics.json' with { type: 'json' };
import interactables from '../../../content/first-day/world/interactables.json' with { type: 'json' };
import map from '../../../content/first-day/world/map.json' with { type: 'json' };
import npcs from '../../../content/first-day/world/npcs.json' with { type: 'json' };
import populations from '../../../content/first-day/world/populations.json' with { type: 'json' };
import presenceInteractions from '../../../content/first-day/world/presence-interactions.json' with { type: 'json' };
import presences from '../../../content/first-day/world/presences.json' with { type: 'json' };
import resourceNodes from '../../../content/first-day/world/resource-nodes.json' with { type: 'json' };

export function assembleFirstDayRaw(): unknown {
  return {
    id: pack.id,
    startingLocationId: pack.startingLocationId,
    map,
    exploration,
    populations,
    resourceNodes,
    presences,
    presenceInteractions,
    interactables,
    bonds,
    organizations,
    party,
    calendar,
    family,
    civic,
    economy,
    settlements,
    politics,
    registry,
    npcs,
    energetics,
    skills,
    training,
    mastery,
    garden,
    items,
    conditions,
    execution,
    combat,
    craftingRecipes: recipes,
    craftingStructures: structures,
    objectives,
    campaign,
    events,
    worldTriggers,
    firstPriorityTrigger,
    labels,
  };
}

export const FIRST_DAY_SKILLS_RAW: unknown = skills;
