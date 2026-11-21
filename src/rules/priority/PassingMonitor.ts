import { contains, type Box, type WorldModel } from '../world/WorldModel';
import { distanceInto } from './ConflictGeometry';
import type { AgentState, EnvState, RiderState, Vec2 } from '../types';

export interface PassingObservation {
  id: string;
  forward: Vec2;
  start: Vec2;
  seenAt: number;
  preparation: RiderState['signal'];
  prepared: boolean;
  alongside: boolean;
  clearance: number;
  right: boolean;
  lateralMove: RiderState['signal'];
  moving: boolean;
  turningRight: boolean;
  nearRail: boolean;
  restricted?: string;
  yieldingAtCrossing: boolean;
}

export class PassingMonitor {
  private readonly passing = new Map<string, PassingObservation>();

  constructor(private readonly world: WorldModel) {}

  get active() {
    return this.passing.size > 0;
  }

  evaluate(
    rider: RiderState,
    agents: readonly AgentState[],
    at: number,
    env: EnvState,
    preparation: RiderState['signal'],
    completed: (
      pass: PassingObservation,
      rider: RiderState,
      at: number,
    ) => void,
  ) {
    if (rider.mode !== 'riding') {
      this.passing.clear();
      return;
    }
    const forwardX = Math.cos(rider.heading);
    const forwardY = Math.sin(rider.heading);
    for (const agent of agents) {
      if (
        agent.kind === 'pedestrian' ||
        agent.kind === 'emergency' ||
        agent.kind === 'tram'
      )
        continue;
      this.observe(
        agent.id,
        agent.pos,
        agent.heading,
        agent,
        rider,
        at,
        env,
        preparation,
        completed,
      );
    }
    for (const car of this.world.parkedCars) {
      // A parked vehicle has no movement direction; use the approach direction.
      if (
        Math.abs(car.x + car.width / 2 - rider.pos.x) > 9 ||
        Math.abs(car.y + car.height / 2 - rider.pos.y) > 9
      )
        continue;
      this.observe(
        car.id,
        { x: car.x + car.width / 2, y: car.y + car.height / 2 },
        this.passing.has(car.id)
          ? Math.atan2(
              this.passing.get(car.id)!.forward.y,
              this.passing.get(car.id)!.forward.x,
            )
          : Math.atan2(forwardY, forwardX),
        undefined,
        rider,
        at,
        env,
        preparation,
        completed,
      );
    }
    for (const [id, pass] of this.passing)
      if (at - pass.seenAt > 0.25) this.passing.delete(id);
  }

  private observe(
    id: string,
    pos: Vec2,
    heading: number,
    agent: AgentState | undefined,
    rider: RiderState,
    at: number,
    env: EnvState,
    preparation: RiderState['signal'],
    completed: (
      pass: PassingObservation,
      rider: RiderState,
      at: number,
    ) => void,
  ) {
    const pass = this.passing.get(id);
    const fx = pass?.forward.x ?? Math.cos(heading);
    const fy = pass?.forward.y ?? Math.sin(heading);
    const dx = pos.x - rider.pos.x;
    const dy = pos.y - rider.pos.y;
    const along = dx * fx + dy * fy;
    const side = dx * fy - dy * fx;
    if (
      Math.cos(rider.heading - heading) < 0.8 ||
      Math.abs(side) > 3.5 ||
      Math.abs(along) > 8
    ) {
      this.passing.delete(id);
      return;
    }
    if (!pass) {
      if (along > 0.8 && rider.speed > (agent?.speed ?? 0)) {
        this.passing.set(id, {
          id,
          forward: { x: fx, y: fy },
          start: { ...rider.pos },
          seenAt: at,
          preparation,
          prepared: false,
          alongside: false,
          clearance: Infinity,
          right: false,
          lateralMove: 'none',
          moving: false,
          turningRight: false,
          nearRail: false,
          yieldingAtCrossing: false,
        });
      }
      return;
    }
    if (at - pass.seenAt > 0.25) {
      this.passing.delete(id);
      return;
    }
    pass.seenAt = at;
    if (pass.lateralMove === 'none' && !pass.alongside) {
      const displacement =
        (rider.pos.y - pass.start.y) * fx - (rider.pos.x - pass.start.x) * fy;
      if (Math.abs(displacement) > 0.35) {
        pass.lateralMove = displacement > 0 ? 'right' : 'left';
        pass.prepared =
          pass.lateralMove === 'left' && pass.preparation === 'left';
      } else pass.preparation = preparation;
    }
    if (Math.abs(along) <= 0.8) {
      pass.alongside = true;
      pass.clearance = Math.min(pass.clearance, Math.abs(side));
      pass.right = side > 0;
      pass.moving ||= (agent?.speed ?? 0) > 0.1;
      pass.turningRight ||=
        agent?.maneuver === 'right' &&
        this.world.intersections.some((box) => contains(box, pos, 3));
      pass.yieldingAtCrossing ||=
        agent?.yieldingAtCrossing === true && agent.speed <= 0.1;
      if (pass.moving) {
        pass.nearRail ||= this.world.crossings.some(
          (box) =>
            box.kind === 'rail' &&
            distanceInto(box, rider.pos, rider.heading) <= 100 &&
            distanceInto(box, pos, heading) <= 100,
        );
        pass.restricted ??= this.restrictedArea(rider, at, env);
      }
    }
    if (along < -0.8) {
      this.passing.delete(id);
      if (pass.alongside && rider.speed > 0) completed(pass, rider, at);
    }
  }

  private restrictedArea(rider: RiderState, at: number, env: EnvState) {
    for (const crossing of this.world.crossings) {
      if (crossing.kind === 'rail') continue; // Covered by MSC-01.
      if (
        crossing.signal &&
        this.world.crossingPhase(crossing, at, env) !== 'off'
      )
        continue;
      const across =
        crossing.axis === 'x'
          ? Math.abs(Math.sin(rider.heading))
          : Math.abs(Math.cos(rider.heading));
      if (across < Math.SQRT1_2) continue;
      if (this.near(rider, crossing)) return crossing.id;
    }
    for (const junction of this.world.intersections) {
      if (
        junction.kind === 'roundabout' ||
        junction.lanes.some(
          (lane) => this.world.trafficPhase(lane, at, env) !== 'off',
        )
      )
        continue;
      if (contains(junction, rider.pos)) return junction.id;
    }
  }

  private near(rider: RiderState, area: Box) {
    return distanceInto(area, rider.pos, rider.heading) <= 3;
  }
}
