import { describe, expect, it } from 'vitest';
import { evaluateConditions } from '../core/events';
import type { GameCondition } from '../core/events';
import {
  DEFAULT_LOCKED_REASON,
  DEFAULT_STARTING_LOCATION_ID,
  INITIAL_WORLD_MAP,
  NavigationError,
  createInitialNavigation,
  createUnlockEvaluator,
  discoverLocation,
  getChildLocations,
  getCurrentLocation,
  getLocation,
  getLocationPath,
  getLocationRelation,
  getParentLocation,
  getSiblingLocations,
  getTravelCost,
  indexNavigationMap,
  inspectLocationAccess,
  inspectNavigationMap,
  inspectNavigationState,
  listVisibleDestinations,
  moveToLocation,
  unlockLocation,
  type IndexedMap,
  type LocationNode,
  type NavigationState,
} from '../modules/navigation';
import { createInitialTime, MAX_ADVANCE_PERIODS } from '../modules/time';
import { freshState } from './helpers';

const START = DEFAULT_STARTING_LOCATION_ID;

function worldMap(): IndexedMap {
  return indexNavigationMap(INITIAL_WORLD_MAP, START);
}

function freezeLocation(node: LocationNode): LocationNode {
  if (node.children) {
    for (const child of node.children) {
      freezeLocation(child);
    }
    Object.freeze(node.children);
  }

  if (node.travelCost) {
    Object.freeze(node.travelCost);
  }

  if (node.unlockConditions) {
    Object.freeze(node.unlockConditions);
  }

  if (node.image) {
    Object.freeze(node.image);
  }

  return Object.freeze(node);
}

function freezeState(state: NavigationState): NavigationState {
  return Object.freeze({
    currentLocationId: state.currentLocationId,
    discoveredLocationIds: Object.freeze([...state.discoveredLocationIds]) as string[],
    unlockedLocationIds: Object.freeze([...state.unlockedLocationIds]) as string[],
    visitedLocationIds: Object.freeze([...state.visitedLocationIds]) as string[],
  });
}

function reveal(map: IndexedMap, state: NavigationState, locationIds: readonly string[]): NavigationState {
  let next = state;
  for (const locationId of locationIds) {
    next = discoverLocation(map, next, locationId);
    next = unlockLocation(map, next, locationId);
  }
  return next;
}

function destinationIds(map: IndexedMap, state: NavigationState, conditions?: Parameters<typeof listVisibleDestinations>[2]) {
  return listVisibleDestinations(map, state, conditions).map((destination) => destination.location.id);
}

function gatedMap(): LocationNode {
  return {
    id: 'root',
    name: 'Raiz',
    children: [
      { id: 'start', name: 'Início' },
      {
        id: 'gated',
        name: 'Portão',
        travelCost: { periods: 2 },
        unlockConditions: [{ type: 'flag.is', flag: 'gate.open', value: true }],
        lockedReason: 'O portão permanece fechado.',
      },
      { id: 'open-path', name: 'Trilha' },
    ],
  };
}

describe('navegação hierárquica', () => {
  it('lê e indexa o JSON aninhado sem perder a hierarquia', () => {
    const parsed = JSON.parse(JSON.stringify(INITIAL_WORLD_MAP)) as LocationNode;
    const indexed = indexNavigationMap(parsed, START);

    expect(inspectNavigationMap(parsed, START).ok).toBe(true);
    expect(indexed.root).toBe(parsed);
    expect(getLocation(indexed, 'new-world').name).toBe('Novo Mundo');
    expect(getLocation(indexed, 'horned-rabbit-forest').name).toBe('Floresta dos Coelhos Chifrudos');
    expect(getLocation(indexed, START).name).toBe('Clareira do Despertar');
    expect(getLocation(indexed, 'hidden-cave').visibility).toBe('hidden');
    expect(getChildLocations(indexed, 'dense-woods').map((node) => node.id)).toEqual(['hidden-cave']);
  });

  it('não muta o mapa original durante a indexação', () => {
    const raw = structuredClone(INITIAL_WORLD_MAP);
    const snapshot = structuredClone(raw);
    const indexed = indexNavigationMap(raw, START);

    expect(raw).toEqual(snapshot);
    expect(getLocation(indexed, 'new-world')).toBe(raw);
    expect(getLocation(indexed, START)).toBe(raw.children?.[0]?.children?.[0]);
    expect(raw.children?.[0]?.children?.[0]?.id).toBe(START);

    freezeLocation(raw);
    expect(() => indexNavigationMap(raw, START)).not.toThrow();
    expect(raw).toEqual(snapshot);
  });

  it('consulta localização por ID', () => {
    const map = worldMap();

    expect(getLocation(map, 'great-tree').name).toBe('Grande Árvore');
    expect(getCurrentLocation(map, createInitialNavigation()).id).toBe(START);
    expect(() => getLocation(map, 'missing')).toThrow(NavigationError);
  });

  it('consulta o pai direto', () => {
    const map = worldMap();

    expect(getParentLocation(map, START)?.id).toBe('horned-rabbit-forest');
    expect(getParentLocation(map, 'horned-rabbit-forest')?.id).toBe('new-world');
    expect(getParentLocation(map, 'new-world')).toBeUndefined();
  });

  it('consulta os filhos diretos na ordem de autoria', () => {
    const map = worldMap();

    expect(getChildLocations(map, 'horned-rabbit-forest').map((node) => node.id)).toEqual([
      'awakening-clearing',
      'great-tree',
      'spring-lake',
      'dense-woods',
    ]);
    expect(getChildLocations(map, START)).toEqual([]);
  });

  it('consulta irmãos sem incluir o próprio local', () => {
    const map = worldMap();

    expect(getSiblingLocations(map, START).map((node) => node.id)).toEqual([
      'great-tree',
      'spring-lake',
      'dense-woods',
    ]);
    expect(getSiblingLocations(map, 'new-world')).toEqual([]);
  });

  it('devolve o caminho completo da raiz até o local', () => {
    const map = worldMap();

    expect(getLocationPath(map, 'hidden-cave').map((node) => node.id)).toEqual([
      'new-world',
      'horned-rabbit-forest',
      'dense-woods',
      'hidden-cave',
    ]);
    expect(getLocationPath(map, 'new-world').map((node) => node.id)).toEqual(['new-world']);
  });

  it('move para o pai direto', () => {
    const map = worldMap();
    const start = createInitialNavigation();
    const prepared = reveal(map, start, ['horned-rabbit-forest']);
    const result = moveToLocation(map, prepared, 'horned-rabbit-forest');

    expect(result.relation).toBe('parent');
    expect(result.current.currentLocationId).toBe('horned-rabbit-forest');
    expect(result.fromLocationId).toBe(START);
    expect(result.current.visitedLocationIds).toEqual([START, 'horned-rabbit-forest']);
    expect(result.previous.currentLocationId).toBe(START);
  });

  it('move para um filho direto', () => {
    const map = worldMap();
    const inForest = moveToLocation(
      map,
      reveal(map, createInitialNavigation(), ['horned-rabbit-forest']),
      'horned-rabbit-forest',
    ).current;
    const prepared = reveal(map, inForest, ['great-tree']);
    const result = moveToLocation(map, prepared, 'great-tree');

    expect(result.relation).toBe('child');
    expect(result.current.currentLocationId).toBe('great-tree');
  });

  it('move para um irmão', () => {
    const map = worldMap();
    const prepared = reveal(map, createInitialNavigation(), ['great-tree']);
    const result = moveToLocation(map, prepared, 'great-tree');

    expect(result.relation).toBe('sibling');
    expect(result.current.currentLocationId).toBe('great-tree');
    expect(getLocationRelation(map, START, 'great-tree')).toBe('sibling');
  });

  it('rejeita salto entre ramos mesmo com destino descoberto e desbloqueado', () => {
    const map = worldMap();
    const prepared = reveal(map, createInitialNavigation(), ['hidden-cave', 'new-world']);

    expect(getLocationRelation(map, START, 'hidden-cave')).toBeUndefined();
    expect(getLocationRelation(map, START, 'new-world')).toBeUndefined();
    expect(() => moveToLocation(map, prepared, 'hidden-cave')).toThrow(NavigationError);
    expect(() => moveToLocation(map, prepared, 'new-world')).toThrow(NavigationError);
    expect(prepared.currentLocationId).toBe(START);
  });

  it('rejeita destino desconhecido ou inexistente', () => {
    const map = worldMap();
    const start = createInitialNavigation();

    expect(destinationIds(map, start)).toEqual([]);
    expect(() => moveToLocation(map, start, 'great-tree')).toThrow(NavigationError);
    expect(() => moveToLocation(map, start, 'missing')).toThrow(NavigationError);
    expect(inspectLocationAccess(map, start, 'great-tree')).toMatchObject({
      accessible: false,
      blockedReason: 'Este local ainda não foi descoberto.',
    });
  });

  it('rejeita destino descoberto e bloqueado', () => {
    const map = worldMap();
    const discovered = discoverLocation(map, createInitialNavigation(), 'great-tree');

    expect(listVisibleDestinations(map, discovered)).toEqual([
      expect.objectContaining({
        relation: 'sibling',
        accessible: false,
        blockedReason: DEFAULT_LOCKED_REASON,
        location: expect.objectContaining({ id: 'great-tree' }),
      }),
    ]);
    expect(() => moveToLocation(map, discovered, 'great-tree')).toThrow(NavigationError);
  });

  it('bloqueia destino quando GameCondition não é satisfeita', () => {
    const indexed = indexNavigationMap(gatedMap(), 'start');
    const state = reveal(indexed, createInitialNavigation(gatedMap(), 'start'), ['gated']);
    const closed = createUnlockEvaluator(freshState());
    const open = createUnlockEvaluator({
      ...freshState(),
      flags: { 'gate.open': true },
    });

    expect(listVisibleDestinations(indexed, state, closed).find((item) => item.location.id === 'gated')).toMatchObject({
      accessible: false,
      blockedReason: 'O portão permanece fechado.',
    });
    expect(() => moveToLocation(indexed, state, 'gated', closed)).toThrow(NavigationError);
    expect(() => moveToLocation(indexed, state, 'gated')).toThrow(NavigationError);
    expect(moveToLocation(indexed, state, 'gated', open).current.currentLocationId).toBe('gated');
    expect(moveToLocation(indexed, state, 'gated', { ...freshState(), flags: { 'gate.open': true } }).travelCost).toEqual({
      periods: 2,
    });
  });

  it('devolve o motivo de bloqueio definido no conteúdo', () => {
    const map = worldMap();
    const inWoods = moveToLocation(
      map,
      reveal(
        map,
        moveToLocation(map, reveal(map, createInitialNavigation(), ['horned-rabbit-forest', 'dense-woods']), 'horned-rabbit-forest')
          .current,
        ['dense-woods'],
      ),
      'dense-woods',
    ).current;
    const discovered = discoverLocation(map, inWoods, 'hidden-cave');

    expect(inspectLocationAccess(map, discovered, 'hidden-cave').blockedReason).toBe(
      'A entrada está encoberta pela vegetação.',
    );
    expect(listVisibleDestinations(map, discovered).find((item) => item.location.id === 'hidden-cave')?.blockedReason).toBe(
      'A entrada está encoberta pela vegetação.',
    );
  });

  it('descobre de forma idempotente sem desbloquear', () => {
    const map = worldMap();
    const first = discoverLocation(map, createInitialNavigation(), 'great-tree');
    const second = discoverLocation(map, first, 'great-tree');

    expect(first.discoveredLocationIds).toEqual([START, 'great-tree']);
    expect(second.discoveredLocationIds).toEqual([START, 'great-tree']);
    expect(second.unlockedLocationIds).toEqual([START]);
    expect(second).not.toBe(first);
    expect(second.discoveredLocationIds).not.toBe(first.discoveredLocationIds);
  });

  it('desbloqueia de forma idempotente sem descobrir', () => {
    const map = worldMap();
    const first = unlockLocation(map, createInitialNavigation(), 'great-tree');
    const second = unlockLocation(map, first, 'great-tree');

    expect(first.unlockedLocationIds).toEqual([START, 'great-tree']);
    expect(second.unlockedLocationIds).toEqual([START, 'great-tree']);
    expect(second.discoveredLocationIds).toEqual([START]);
    expect(destinationIds(map, second)).toEqual([]);
  });

  it('adiciona a primeira visita uma única vez', () => {
    const map = worldMap();
    const prepared = reveal(map, createInitialNavigation(), ['great-tree']);
    const first = moveToLocation(map, prepared, 'great-tree');
    const back = moveToLocation(map, reveal(map, first.current, [START]), START);
    const again = moveToLocation(map, back.current, 'great-tree');

    expect(first.current.visitedLocationIds).toEqual([START, 'great-tree']);
    expect(again.current.visitedLocationIds).toEqual([START, 'great-tree']);
    expect(again.current.visitedLocationIds.filter((id) => id === 'great-tree')).toHaveLength(1);
  });

  it('omite a subárea oculta antes da descoberta', () => {
    const map = worldMap();
    const inWoods = moveToLocation(
      map,
      reveal(
        map,
        moveToLocation(map, reveal(map, createInitialNavigation(), ['horned-rabbit-forest', 'dense-woods']), 'horned-rabbit-forest')
          .current,
        ['dense-woods'],
      ),
      'dense-woods',
    ).current;

    expect(destinationIds(map, inWoods)).toEqual(['horned-rabbit-forest', START]);
    expect(destinationIds(map, inWoods)).not.toContain('hidden-cave');
    expect(getChildLocations(map, 'dense-woods').map((node) => node.id)).toEqual(['hidden-cave']);
  });

  it('mostra a subárea oculta depois da descoberta', () => {
    const map = worldMap();
    const inWoods = moveToLocation(
      map,
      reveal(
        map,
        moveToLocation(map, reveal(map, createInitialNavigation(), ['horned-rabbit-forest', 'dense-woods']), 'horned-rabbit-forest')
          .current,
        ['dense-woods'],
      ),
      'dense-woods',
    ).current;
    const discovered = discoverLocation(map, inWoods, 'hidden-cave');
    const unlocked = unlockLocation(map, discovered, 'hidden-cave');

    expect(listVisibleDestinations(map, discovered).find((item) => item.location.id === 'hidden-cave')).toMatchObject({
      relation: 'child',
      accessible: false,
    });
    expect(listVisibleDestinations(map, unlocked).find((item) => item.location.id === 'hidden-cave')).toMatchObject({
      relation: 'child',
      accessible: true,
    });
    expect(moveToLocation(map, unlocked, 'hidden-cave').current.currentLocationId).toBe('hidden-cave');
  });

  it('devolve o custo de viagem do destino', () => {
    const map = worldMap();
    const prepared = reveal(map, createInitialNavigation(), ['horned-rabbit-forest']);
    const result = moveToLocation(map, prepared, 'horned-rabbit-forest');

    expect(getTravelCost(map, 'horned-rabbit-forest')).toEqual({ periods: 1 });
    expect(getTravelCost(map, 'great-tree')).toEqual({ periods: 1 });
    expect(result.travelCost).toEqual({ periods: 1 });
  });

  it('trata custo ausente como zero períodos', () => {
    const map = worldMap();

    expect(INITIAL_WORLD_MAP.children?.[0]?.children?.[0]?.travelCost).toBeUndefined();
    expect(getTravelCost(map, START)).toEqual({ periods: 0 });
    expect(inspectLocationAccess(map, createInitialNavigation(), START).travelCost).toEqual({ periods: 0 });
  });

  it('rejeita custo inválido ou acima do limite operacional', () => {
    expect(inspectNavigationMap({ id: 'root', name: 'Raiz', travelCost: { periods: -1 } }).ok).toBe(false);
    expect(inspectNavigationMap({ id: 'root', name: 'Raiz', travelCost: { periods: 1.5 } }).ok).toBe(false);
    expect(inspectNavigationMap({ id: 'root', name: 'Raiz', travelCost: { periods: MAX_ADVANCE_PERIODS + 1 } }).ok).toBe(
      false,
    );
    expect(inspectNavigationMap({ id: 'root', name: 'Raiz', travelCost: { periods: MAX_ADVANCE_PERIODS } }).ok).toBe(true);
    expect(() => indexNavigationMap({ id: 'root', name: 'Raiz', travelCost: { periods: Number.NaN } })).toThrow(
      NavigationError,
    );
  });

  it('rejeita mapa com identificadores duplicados', () => {
    const duplicated: LocationNode = {
      id: 'root',
      name: 'Raiz',
      children: [
        { id: 'same', name: 'Um' },
        { id: 'same', name: 'Outro' },
      ],
    };

    expect(inspectNavigationMap(duplicated).ok).toBe(false);
    expect(() => indexNavigationMap(duplicated)).toThrow(NavigationError);
  });

  it('rejeita referência duplicada de nó e ciclo', () => {
    const shared: LocationNode = { id: 'shared', name: 'Compartilhado' };
    const duplicatedRef: LocationNode = {
      id: 'root',
      name: 'Raiz',
      children: [
        { id: 'left', name: 'Esquerda', children: [shared] },
        { id: 'right', name: 'Direita', children: [shared] },
      ],
    };

    const cyclic: LocationNode = { id: 'loop', name: 'Laço', children: [] };
    cyclic.children = [cyclic];

    const a: LocationNode = { id: 'a', name: 'A', children: [] };
    const b: LocationNode = { id: 'b', name: 'B', children: [a] };
    a.children = [b];
    const cyclicTree: LocationNode = { id: 'root', name: 'Raiz', children: [a] };

    expect(inspectNavigationMap(duplicatedRef)).toMatchObject({
      ok: false,
      reason: 'O mapa possui o mesmo nó em mais de um ponto.',
    });
    expect(inspectNavigationMap(cyclic)).toMatchObject({ ok: false, reason: 'O mapa possui um ciclo.' });
    expect(inspectNavigationMap(cyclicTree)).toMatchObject({ ok: false, reason: 'O mapa possui um ciclo.' });
  });

  it('rejeita estado com identificadores inexistentes', () => {
    const map = worldMap();
    const invalid = {
      ...createInitialNavigation(),
      discoveredLocationIds: [START, 'missing'],
    };

    expect(inspectNavigationState(invalid, map)).toMatchObject({
      ok: false,
      reason: 'O estado de navegação possui identificadores inexistentes.',
    });
  });

  it('rejeita estado com listas duplicadas', () => {
    const map = worldMap();
    const invalid = {
      ...createInitialNavigation(),
      discoveredLocationIds: [START, START],
    };

    expect(inspectNavigationState(invalid, map)).toMatchObject({
      ok: false,
      reason: 'O estado de navegação possui identificadores duplicados.',
    });
  });

  it('rejeita localização atual não visitada ou bloqueada', () => {
    const map = worldMap();
    const notVisited = {
      currentLocationId: START,
      discoveredLocationIds: [START],
      unlockedLocationIds: [START],
      visitedLocationIds: [],
    };
    const blocked = {
      currentLocationId: START,
      discoveredLocationIds: [START],
      unlockedLocationIds: [],
      visitedLocationIds: [],
    };
    const visitedButLocked = {
      currentLocationId: START,
      discoveredLocationIds: [START, 'great-tree'],
      unlockedLocationIds: [START],
      visitedLocationIds: [START, 'great-tree'],
    };

    expect(inspectNavigationState(notVisited, map)).toMatchObject({
      ok: false,
      reason: 'A localização atual precisa estar descoberta, desbloqueada e visitada.',
    });
    expect(inspectNavigationState(blocked, map)).toMatchObject({
      ok: false,
      reason: 'A localização atual precisa estar descoberta, desbloqueada e visitada.',
    });
    expect(inspectNavigationState(visitedButLocked, map)).toMatchObject({
      ok: false,
      reason: 'Um local visitado precisa estar descoberto e desbloqueado.',
    });
  });

  it('mantém imutáveis mapa, estado e resultados das operações', () => {
    const raw = freezeLocation(structuredClone(INITIAL_WORLD_MAP));
    const map = indexNavigationMap(raw, START);
    const start = freezeState(createInitialNavigation(raw, START));
    const snapshot = structuredClone(start);
    const mapSnapshot = structuredClone(raw);
    const time = createInitialTime();
    const timeSnapshot = structuredClone(time);

    const discovered = discoverLocation(map, start, 'great-tree');
    const unlocked = unlockLocation(map, discovered, 'great-tree');
    const destinations = listVisibleDestinations(map, unlocked);
    const moved = moveToLocation(map, unlocked, 'great-tree');

    expect(start).toEqual(snapshot);
    expect(raw).toEqual(mapSnapshot);
    expect(time).toEqual(timeSnapshot);
    expect(discovered).not.toBe(start);
    expect(unlocked).not.toBe(discovered);
    expect(moved.previous).not.toBe(unlocked);
    expect(moved.current).not.toBe(unlocked);
    expect(moved.current.discoveredLocationIds).not.toBe(unlocked.discoveredLocationIds);

    moved.current.discoveredLocationIds.push('alterado');
    destinations.push({
      location: getLocation(map, START),
      relation: 'child',
      accessible: true,
      travelCost: { periods: 0 },
    });
    expect(start).toEqual(snapshot);
    expect(unlocked.discoveredLocationIds).toEqual([START, 'great-tree']);
    expect(getLocationPath(map, START).map((node) => node.id)).toEqual(['new-world', 'horned-rabbit-forest', START]);
  });

  it('preserva o estado no roundtrip JSON e rejeita restauração inválida', () => {
    const map = worldMap();
    const walked = moveToLocation(
      map,
      reveal(map, createInitialNavigation(), ['great-tree', 'spring-lake']),
      'great-tree',
    ).current;
    const serialized = JSON.stringify(walked);
    const restored = JSON.parse(serialized) as NavigationState;
    const inspected = inspectNavigationState(restored, map);

    expect(serialized).toEqual(JSON.stringify(JSON.parse(serialized)));
    expect(inspected.ok).toBe(true);
    if (inspected.ok) {
      expect(inspected.value).toEqual(walked);
      expect(inspected.value.currentLocationId).toBe('great-tree');
      expect(inspected.value.discoveredLocationIds).toEqual([START, 'great-tree', 'spring-lake']);
      expect(inspected.value.unlockedLocationIds).toEqual([START, 'great-tree', 'spring-lake']);
      expect(inspected.value.visitedLocationIds).toEqual([START, 'great-tree']);
    }

    expect(inspectNavigationState(JSON.parse(JSON.stringify({ ...walked, currentLocationId: 'missing' })), map).ok).toBe(
      false,
    );
    expect(
      inspectNavigationState(
        JSON.parse(JSON.stringify({ ...walked, discoveredLocationIds: [...walked.discoveredLocationIds, START] })),
        map,
      ).ok,
    ).toBe(false);
  });

  it('rejeita raiz inválida, visibilidade desconhecida, imagem e condições malformadas', () => {
    expect(inspectNavigationMap(null).ok).toBe(false);
    expect(inspectNavigationMap([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }])).toMatchObject({
      ok: false,
      reason: 'O mapa possui mais de uma raiz.',
    });
    expect(inspectNavigationMap({ id: '', name: 'Raiz' }).ok).toBe(false);
    expect(inspectNavigationMap({ id: 'root', name: '   ' }).ok).toBe(false);
    expect(inspectNavigationMap({ id: 'root', name: 'Raiz', visibility: 'secret' }).ok).toBe(false);
    expect(inspectNavigationMap({ id: 'root', name: 'Raiz', image: { kind: 'banner', label: 'X' } }).ok).toBe(false);
    expect(
      inspectNavigationMap({
        id: 'root',
        name: 'Raiz',
        unlockConditions: [{ type: 'unknown.flag', flag: 'x', value: true }],
      }).ok,
    ).toBe(false);
    expect(inspectNavigationMap(INITIAL_WORLD_MAP, 'missing')).toMatchObject({
      ok: false,
      reason: 'A localização inicial não existe.',
    });
    expect(() => createInitialNavigation(INITIAL_WORLD_MAP, 'missing')).toThrow(NavigationError);
  });

  it('não consome tempo ao consultar mapa, caminhos ou destinos', () => {
    const map = worldMap();
    const state = reveal(map, createInitialNavigation(), ['horned-rabbit-forest', 'great-tree']);
    const time = createInitialTime();
    const snapshot = structuredClone(time);
    const evaluate = (conditions: GameCondition[] | undefined) => evaluateConditions(conditions, freshState());

    getLocationPath(map, START);
    getParentLocation(map, START);
    getChildLocations(map, 'horned-rabbit-forest');
    getSiblingLocations(map, START);
    listVisibleDestinations(map, state, evaluate);
    inspectLocationAccess(map, state, 'great-tree');
    getTravelCost(map, 'great-tree');

    expect(time).toEqual(snapshot);
    expect(state.currentLocationId).toBe(START);
  });
});
