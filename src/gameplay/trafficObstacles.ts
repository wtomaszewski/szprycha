import type { AgentState } from '../rules/types';
import { footprintInPixels } from '../rules/world/Footprint';
import type { Obstacle } from './bicycle';

type TrafficPose = AgentState & {
  active?: boolean;
  tramHeadings?: { front: number; rear: number };
};

export function createTrafficObstacles(
  agent: TrafficPose,
  metersPerPixel: number,
) {
  const { halfLength, halfWidth } = footprintInPixels(
    agent.kind,
    metersPerPixel,
  );
  const segment = agent.kind === 'tram';
  const obstacle: Obstacle = {
    x: 0,
    y: 0,
    width: halfLength * (segment ? 1 : 2),
    height: 2 * halfWidth,
    kind: 'wall',
    rotation: { cos: 1, sin: 0 },
  };
  return segment
    ? [obstacle, { ...obstacle, rotation: { cos: 1, sin: 0 } }]
    : [obstacle];
}

export function placeTrafficObstacles(
  obstacles: readonly Obstacle[],
  agent: TrafficPose,
  metersPerPixel: number,
) {
  for (let index = 0; index < obstacles.length; index++) {
    const obstacle = obstacles[index]!;
    if (agent.active === false) {
      obstacle.x = obstacle.y = -1000;
      continue;
    }
    const heading =
      (index === 0 ? agent.tramHeadings?.front : agent.tramHeadings?.rear) ??
      agent.heading;
    const rotation = obstacle.rotation!;
    rotation.cos = Math.cos(heading);
    rotation.sin = Math.sin(heading);
    const halfLength = obstacle.width / 2;
    const offset =
      obstacles.length === 1 ? 0 : index === 0 ? halfLength : -halfLength;
    obstacle.x =
      agent.pos.x / metersPerPixel + rotation.cos * offset - halfLength;
    obstacle.y =
      agent.pos.y / metersPerPixel +
      rotation.sin * offset -
      obstacle.height / 2;
  }
}
