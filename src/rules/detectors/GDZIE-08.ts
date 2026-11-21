import { verdict, type AgentState, type RiderState } from '../types';

export function ridingAbreast(
  rider: RiderState,
  agents: readonly AgentState[],
  at: number,
) {
  const dx = Math.cos(rider.heading);
  const dy = Math.sin(rider.heading);
  const companion = agents.find((agent) => {
    if (
      agent.kind !== 'cyclist' ||
      agent.speed <= 0 ||
      Math.cos(agent.heading - rider.heading) < 0.95
    )
      return false;
    const x = agent.pos.x - rider.pos.x;
    const y = agent.pos.y - rider.pos.y;
    const across = Math.abs(y * dx - x * dy);
    return Math.abs(x * dx + y * dy) < 1.5 && across >= 0.6 && across <= 2;
  });
  if (!companion) return;
  const behind = agents.find((agent) => {
    if (
      agent.kind !== 'car' ||
      !agent.protectiveBrake ||
      Math.cos(agent.heading - rider.heading) < 0.95
    )
      return false;
    const x = agent.pos.x - rider.pos.x;
    const y = agent.pos.y - rider.pos.y;
    const along = x * dx + y * dy;
    return along < 0 && along >= -6 && Math.abs(y * dx - x * dy) <= 1.5;
  });
  if (behind)
    return verdict(
      'GDZIE-08',
      'minor',
      at,
      rider,
      { companion: companion.id, blocked: behind.id },
      { agentId: behind.id },
    );
}
