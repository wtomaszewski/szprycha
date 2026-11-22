import type { MissionDefinition } from '../content/missions';
import type { EnvState, Weather } from '../rules/types';
import type { WorldModel } from '../rules/world/WorldModel';

const missionWeather: Record<
  NonNullable<MissionDefinition['start']['pogoda']>,
  Weather
> = {
  lekki_deszcz: 'rain_light',
  ulewa: 'rain_heavy',
  snieg: 'snow',
  silny_wiatr: 'wind_strong',
  mgla: 'fog',
  gesta_mgla: 'fog_dense',
  gololedz: 'ice',
};

export function missionTime(
  world: WorldModel,
  mission: MissionDefinition | undefined,
  at: number,
): EnvState['time'] {
  if (mission?.start.noc) return 'night';
  if (
    mission?.start.zmrok ||
    ((!mission || !world.duskInFreeRideOnly) && at >= world.duskAt)
  )
    return 'dusk';
  return 'day';
}

export function missionEnvironment(
  world: WorldModel,
  mission?: MissionDefinition,
): EnvState {
  return {
    time: missionTime(world, mission, 0),
    weather: mission?.start.pogoda
      ? missionWeather[mission.start.pogoda]
      : mission?.start.ulewa
        ? 'rain_heavy'
        : 'clear',
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
