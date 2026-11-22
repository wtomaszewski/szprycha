import { verdict, type EnvState, type RiderState } from '../types';

export function reflectiveVestHabit(
  rider: RiderState,
  at: number,
  env: EnvState,
) {
  if (
    env.time !== 'day' &&
    rider.reflectiveVest &&
    rider.mode === 'riding' &&
    rider.speed > 0 &&
    rider.lights?.front &&
    rider.lights.rear
  )
    return verdict('WYP-06', 'good', at, rider, { reflectiveVest: true });
}
