import type { AgentState, Vec2 } from '../rules/types';
import type { WorldModel } from '../rules/world/WorldModel';
import { FIXED_STEP, RIDER_RADIUS, type Obstacle, type Rider } from './bicycle';

interface Track {
  agent: AgentState;
  origin: Vec2;
  direction: Vec2;
  start: number;
  end: number;
  distance: number;
  obstacle: Obstacle;
}

/** Fixed routes for the training map; road-network traffic is added in M3. */
export class TrainingTraffic {
  private readonly tracks: Track[] = [];
  readonly agents: AgentState[] = [];
  readonly obstacles: Obstacle[] = [];

  constructor(private readonly world: WorldModel) {
    for (const spawn of world.trainingSpawns) {
      const lane =
        spawn.kind === 'car' ? world.getLane(spawn.laneId) : undefined;
      if (spawn.kind === 'car' && !lane)
        throw new Error(`Unknown training lane: ${spawn.laneId}`);
      const heading =
        spawn.kind === 'pedestrian'
          ? (spawn.heading * Math.PI) / 180
          : Math.atan2(lane!.forward.y, lane!.forward.x);
      const start = spawn.kind === 'car' ? spawn.start_m : 0;
      const end =
        spawn.kind === 'car'
          ? (lane!.forward.x
              ? lane!.intersection.width
              : lane!.intersection.height) + 10
          : spawn.length_m;
      const origin = lane?.end ?? spawn;
      const agent: AgentState = {
        id: spawn.id,
        kind: spawn.kind,
        pos: { x: 0, y: 0 },
        heading,
        speed: spawn.speed,
        laneId: lane?.id,
      };
      const diameter = spawn.kind === 'car' ? 28 : 14;
      const obstacle: Obstacle = {
        x: 0,
        y: 0,
        width: diameter,
        height: diameter,
        kind: 'wall',
      };
      const track = {
        agent,
        obstacle,
        origin,
        start,
        end,
        distance: start,
        direction: { x: Math.cos(heading), y: Math.sin(heading) },
      };
      this.tracks.push(track);
      this.agents.push(agent);
      this.obstacles.push(obstacle);
      this.place(track);
    }
  }

  private place(track: Track) {
    const { agent, obstacle, origin, direction, distance } = track;
    agent.pos.x = origin.x + direction.x * distance;
    agent.pos.y = origin.y + direction.y * distance;
    obstacle.x = agent.pos.x / this.world.metersPerPixel - obstacle.width / 2;
    obstacle.y = agent.pos.y / this.world.metersPerPixel - obstacle.height / 2;
  }

  reset() {
    for (const track of this.tracks) {
      track.distance = track.start;
      track.agent.protectiveBrake = false;
      this.place(track);
    }
  }

  step(rider: Rider) {
    const scale = this.world.metersPerPixel;
    const playerX = rider.x * scale;
    const playerY = rider.y * scale;
    for (const track of this.tracks) {
      const { agent, direction, obstacle } = track;
      const front =
        (playerX - agent.pos.x) * direction.x +
        (playerY - agent.pos.y) * direction.y;
      const lateral =
        (playerY - agent.pos.y) * direction.x -
        (playerX - agent.pos.x) * direction.y;
      const clearance = (obstacle.width / 2 + RIDER_RADIUS + 4) * scale;
      agent.protectiveBrake =
        front >= 0 &&
        front < clearance + agent.speed * FIXED_STEP &&
        Math.abs(lateral) < clearance;
      if (agent.protectiveBrake) continue;
      const next = track.distance + agent.speed * FIXED_STEP;
      if (next >= track.end) {
        const x = track.origin.x + direction.x * track.start;
        const y = track.origin.y + direction.y * track.start;
        if (Math.hypot(playerX - x, playerY - y) < clearance) continue;
        track.distance = track.start;
      } else track.distance = next;
      this.place(track);
    }
  }
}
