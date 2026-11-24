import type { AgentState } from '../types';
import type { Box } from './WorldModel';

export interface Footprint {
  halfLength: number;
  halfWidth: number;
}

// Nominal physical dimensions in metres, independent of the sprite sheets.
export const trafficFootprints = {
  car: { halfLength: 2.25, halfWidth: 0.9 },
  bus: { halfLength: 5, halfWidth: 1.25 },
  tractor: { halfLength: 2.3, halfWidth: 1.05 },
  cyclist: { halfLength: 0.9, halfWidth: 0.32 },
  pedestrian: { halfLength: 0.25, halfWidth: 0.25 },
  tram: { halfLength: 7.5, halfWidth: 1.2 },
  emergency: { halfLength: 2.75, halfWidth: 1.05 },
} satisfies Record<AgentState['kind'], Footprint>;

const cycleFootprints = {
  rickshaw: { halfLength: 1.3, halfWidth: 0.63 },
  cargo: { halfLength: 1.25, halfWidth: 0.45 },
};

export function agentFootprint({
  kind,
  cycleBody,
}: Pick<AgentState, 'kind' | 'cycleBody'>) {
  return cycleBody ? cycleFootprints[cycleBody] : trafficFootprints[kind];
}

export function footprintInPixels(
  agent: Pick<AgentState, 'kind' | 'cycleBody'>,
  metersPerPixel: number,
) {
  const { halfLength, halfWidth } = agentFootprint(agent);
  return {
    halfLength: halfLength / metersPerPixel,
    halfWidth: halfWidth / metersPerPixel,
  };
}

export function footprintReachesBox(agent: AgentState, box: Box, margin = 0) {
  const { halfLength, halfWidth } = agentFootprint(agent);
  const dx = box.x + box.width / 2 - agent.pos.x;
  const dy = box.y + box.height / 2 - agent.pos.y;
  return rectanglesOverlap(
    dx,
    dy,
    box.width / 2 + margin,
    box.height / 2 + margin,
    halfLength,
    halfWidth,
    Math.cos(agent.heading),
    Math.sin(agent.heading),
  );
}

export function footprintsOverlap(a: AgentState, b: AgentState, margin = 0) {
  const dx = b.pos.x - a.pos.x;
  const dy = b.pos.y - a.pos.y;
  const { halfLength, halfWidth } = agentFootprint(a);
  const other = agentFootprint(b);
  const reach =
    halfLength + halfWidth + other.halfLength + other.halfWidth + 2 * margin;
  if (Math.abs(dx) >= reach || Math.abs(dy) >= reach) return false;
  const cos = Math.cos(a.heading);
  const sin = Math.sin(a.heading);
  const relative = b.heading - a.heading;
  return rectanglesOverlap(
    dx * cos + dy * sin,
    dy * cos - dx * sin,
    halfLength + margin,
    halfWidth + margin,
    other.halfLength,
    other.halfWidth,
    Math.cos(relative),
    Math.sin(relative),
  );
}

// Separating axes of both rectangles, expressed in the first rectangle's frame.
function rectanglesOverlap(
  x: number,
  y: number,
  aLength: number,
  aWidth: number,
  bLength: number,
  bWidth: number,
  cos: number,
  sin: number,
) {
  const c = Math.abs(cos);
  const s = Math.abs(sin);
  const epsilon = 1e-6;
  return (
    Math.abs(x) < aLength + bLength * c + bWidth * s - epsilon &&
    Math.abs(y) < aWidth + bLength * s + bWidth * c - epsilon &&
    Math.abs(x * cos + y * sin) <
      bLength + aLength * c + aWidth * s - epsilon &&
    Math.abs(y * cos - x * sin) < bWidth + aLength * s + aWidth * c - epsilon
  );
}
