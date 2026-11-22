import type { MissionDefinition } from '../content/missions';
import type { EnvState } from '../rules/types';
import type { WorldModel } from '../rules/world/WorldModel';

export function missionEnvironment(
  world: WorldModel,
  mission?: MissionDefinition,
): EnvState {
  return {
    time: mission?.start.zmrok ? 'dusk' : 'day',
    weather: mission?.start.ulewa ? 'rain_heavy' : 'clear',
    visibilityLow: false,
    signalOverrides: mission?.start.awaria_swiatel
      ? Object.fromEntries([
          ...world.lanes
            .filter(({ mainSignal }) => mainSignal)
            .map(({ id }) => [id, 'off'] as const),
          ...world.crossings
            .filter(({ signal }) => signal)
            .map(({ id }) => [id, 'off'] as const),
        ])
      : undefined,
    officerOrders: undefined,
  };
}
