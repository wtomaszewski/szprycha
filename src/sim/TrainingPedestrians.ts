import { TICKS_PER_SECOND, type AgentState, type Vec2 } from '../rules/types';
import { contains, type WorldModel } from '../rules/world/WorldModel';

export const PEDESTRIAN_RADIUS_PX = 7;

/** M2 pedestrian routes retained until the pedestrian simulation in M3. */
export class TrainingPedestrians {
  readonly agents: readonly AgentState[];
  private readonly tracks;

  constructor(private readonly world: WorldModel) {
    this.tracks = world.pedestrianSpawns.map((spawn) => {
      const heading = (spawn.heading * Math.PI) / 180;
      const agent: AgentState = {
        id: spawn.id,
        kind: 'pedestrian',
        pos: { x: spawn.x, y: spawn.y },
        heading,
        speed: spawn.speed,
      };
      return {
        spawn,
        agent,
        dx: Math.cos(heading),
        dy: Math.sin(heading),
        distance: 0,
      };
    });
    this.agents = this.tracks.map(({ agent }) => agent);
  }

  reset() {
    for (const track of this.tracks) {
      const { agent, spawn } = track;
      track.distance = 0;
      agent.pos.x = spawn.x;
      agent.pos.y = spawn.y;
      agent.speed = spawn.speed;
      agent.protectiveBrake = false;
    }
  }

  step(player: Vec2, cars: readonly AgentState[]) {
    const clearance = 22 * this.world.metersPerPixel;
    for (const track of this.tracks) {
      const { agent, spawn, dx, dy } = track;
      const next =
        (track.distance + spawn.speed / TICKS_PER_SECOND) % spawn.length_m;
      const x = spawn.x + dx * next;
      const y = spawn.y + dy * next;
      agent.protectiveBrake =
        Math.hypot(player.x - x, player.y - y) < clearance;
      const crossing = this.world.crossings.find(
        (crossing) =>
          crossing.kind === 'pedestrian' && contains(crossing, { x, y }),
      );
      const carOnCrossing =
        crossing &&
        !contains(crossing, agent.pos) &&
        cars.some(({ pos }) => contains(crossing, pos, clearance));
      if (
        agent.protectiveBrake ||
        carOnCrossing ||
        cars.some(({ pos }) => Math.hypot(pos.x - x, pos.y - y) < clearance)
      ) {
        agent.speed = 0;
        continue;
      }
      track.distance = next;
      agent.speed = spawn.speed;
      agent.pos.x = x;
      agent.pos.y = y;
    }
  }
}
