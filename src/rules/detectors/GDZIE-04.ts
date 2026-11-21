import {
  verdict,
  type AgentState,
  type EnvState,
  type RiderState,
} from '../types';
import type { Zone } from '../world/WorldModel';

export function sidewalkException(
  zone: Zone,
  rider: RiderState,
  agents: readonly AgentState[],
  env: EnvState,
) {
  if (env.weather !== 'clear') return 'weather';
  if (
    (zone.width_m ?? 0) >= 2 &&
    (zone.speedLimit ?? 0) > 50 &&
    !zone.parallelBikeInfra
  )
    return 'infrastructure';
  if (
    rider.adultSupervisor &&
    rider.supervisedChildId &&
    agents.some(
      (agent) =>
        agent.id === rider.supervisedChildId &&
        agent.kind === 'cyclist' &&
        agent.ageBand === 'under10',
    )
  )
    return 'supervision';
}

export function sidewalkVerdict(
  zone: Zone,
  rider: RiderState,
  at: number,
  exception?: string,
) {
  return verdict(
    'GDZIE-04',
    exception ? 'good' : 'minor',
    at,
    rider,
    { width: zone.width_m, speedLimit: zone.speedLimit, exception },
    { zoneId: zone.id },
  );
}
