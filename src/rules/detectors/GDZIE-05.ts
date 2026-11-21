import {
  verdict,
  type AgentState,
  type RiderState,
  type Verdict,
} from '../types';
import type { Zone } from '../world/WorldModel';

export function sidewalkPedestrian(
  zone: Zone,
  rider: RiderState,
  agents: readonly AgentState[],
  at: number,
  limit: number,
  minorTtc: number,
  majorTtc: number,
  previous?: Verdict,
) {
  const vx = Math.cos(rider.heading) * rider.speed;
  const vy = Math.sin(rider.heading) * rider.speed;
  let candidate = previous;
  for (const agent of agents) {
    if (agent.kind !== 'pedestrian') continue;
    const dx = agent.pos.x - rider.pos.x;
    const dy = agent.pos.y - rider.pos.y;
    if (dx * dx + dy * dy > 9) continue;
    const relativeX = vx - Math.cos(agent.heading) * agent.speed;
    const relativeY = vy - Math.sin(agent.heading) * agent.speed;
    const speedSquared = relativeX * relativeX + relativeY * relativeY;
    const ttc =
      speedSquared > 0
        ? (dx * relativeX + dy * relativeY) / speedSquared
        : Infinity;
    const danger =
      ttc >= 0 &&
      ttc < minorTtc &&
      Math.hypot(dx - relativeX * ttc, dy - relativeY * ttc) <= 0.75;
    const kind =
      agent.protectiveBrake || (danger && ttc < majorTtc)
        ? 'major'
        : danger || rider.speed > limit
          ? 'minor'
          : 'good';
    if (
      kind === candidate?.kind ||
      candidate?.kind === 'major' ||
      (candidate?.kind === 'minor' && kind === 'good')
    )
      continue;
    candidate = verdict(
      'GDZIE-05',
      kind,
      at,
      rider,
      {
        pedestrian: agent.id,
        speed: rider.speed,
        ...(danger && { ttc }),
        protectiveBrake: Boolean(agent.protectiveBrake),
      },
      { zoneId: zone.id, agentId: agent.id },
    );
  }
  return candidate;
}
