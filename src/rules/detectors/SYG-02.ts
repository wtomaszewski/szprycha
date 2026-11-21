import { verdict, type EnvState, type RiderState, type Vec2 } from '../types';
import { contains, type Crossing, type WorldModel } from '../world/WorldModel';

export function bicycleSignal(
  world: WorldModel,
  crossing: Crossing | undefined,
  rider: RiderState,
  previous: Vec2 | undefined,
  at: number,
  env: EnvState,
) {
  if (
    crossing?.kind !== 'bike' ||
    !crossing.signal ||
    !previous ||
    contains(crossing, previous) ||
    world.crossingPhase(crossing, at, env) !== 'red'
  )
    return;
  return verdict(
    'SYG-02',
    'major',
    at,
    rider,
    { phase: 'red' },
    { zoneId: crossing.id },
  );
}
