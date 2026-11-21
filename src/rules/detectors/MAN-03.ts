import { verdict, type AgentState, type RiderState } from '../types';
import type { Vec2 } from '../types';

export function shoulderCheck(
  ruleId: 'MAN-03' | 'MAN-07',
  rider: RiderState,
  agents: readonly AgentState[],
  at: number,
  window: number,
  heading: number,
  position: Vec2,
) {
  const last = rider.shoulderCheck?.lastLeftAt;
  if (last !== undefined && last <= at && at - last <= window + 1e-9)
    return verdict(ruleId, 'good', at, rider, { secondsSinceCheck: at - last });
  const dx = Math.cos(heading);
  const dy = Math.sin(heading);
  const blind = agents.find((agent) => {
    if (
      agent.kind === 'pedestrian' ||
      agent.speed <= 0 ||
      Math.cos(heading - agent.heading) < 0.9
    )
      return false;
    const x = agent.pos.x - position.x;
    const y = agent.pos.y - position.y;
    const along = x * dx + y * dy;
    const left = x * dy - y * dx;
    return along < 0 && along >= -6 && left > 0 && left <= 3;
  });
  if (blind)
    return verdict(
      ruleId,
      'minor',
      at,
      rider,
      { conflictWith: blind.id },
      { agentId: blind.id },
    );
}
