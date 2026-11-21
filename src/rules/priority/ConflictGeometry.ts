import type { AgentState, RiderState, Vec2 } from '../types';
import type { Box } from '../world/WorldModel';

export function distanceInto(box: Box, pos: Vec2, heading: number) {
  const dx = Math.cos(heading);
  const dy = Math.sin(heading);
  const tx = Math.abs(dx) < 1e-9 ? Infinity : (box.x - pos.x) / dx;
  const ty = Math.abs(dy) < 1e-9 ? Infinity : (box.y - pos.y) / dy;
  const ux = Math.abs(dx) < 1e-9 ? Infinity : (box.x + box.width - pos.x) / dx;
  const uy = Math.abs(dy) < 1e-9 ? Infinity : (box.y + box.height - pos.y) / dy;
  if (tx === Infinity && (pos.x < box.x || pos.x >= box.x + box.width))
    return Infinity;
  if (ty === Infinity && (pos.y < box.y || pos.y >= box.y + box.height))
    return Infinity;
  const entry = Math.max(
    0,
    tx === Infinity ? -Infinity : Math.min(tx, ux),
    ty === Infinity ? -Infinity : Math.min(ty, uy),
  );
  return entry < Math.min(Math.max(tx, ux), Math.max(ty, uy))
    ? entry
    : Infinity;
}

/** Time of a close approach if both participants keep their current motion. */
export function timeToConflict(
  rider: RiderState,
  agent: AgentState,
  radius: number,
) {
  const dx = agent.pos.x - rider.pos.x;
  const dy = agent.pos.y - rider.pos.y;
  if (dx * dx + dy * dy <= radius * radius) return 0;
  const vx =
    rider.speed * Math.cos(rider.heading) -
    agent.speed * Math.cos(agent.heading);
  const vy =
    rider.speed * Math.sin(rider.heading) -
    agent.speed * Math.sin(agent.heading);
  const relativeSpeed = vx * vx + vy * vy;
  if (relativeSpeed < 1e-9) return Infinity;
  const ttc = (dx * vx + dy * vy) / relativeSpeed;
  return ttc >= 0 && Math.hypot(dx - vx * ttc, dy - vy * ttc) <= radius
    ? ttc
    : Infinity;
}
