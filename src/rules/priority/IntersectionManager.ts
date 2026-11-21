import type { AgentState, EnvState, Maneuver, Vec2 } from '../types';
import { exitOffset, maneuvers, otherSide } from '../world/LaneGraph';
import {
  distanceToLine,
  type Lane,
  type WorldModel,
} from '../world/WorldModel';

type PriorityRule =
  | 'PIER-01'
  | 'PIER-02'
  | 'PIER-03'
  | 'PIER-08'
  | 'PIER-09'
  | 'ZNAK-S2'
  | 'ZNAK-A7';
interface Path {
  lane: Lane;
  end: Vec2;
  direction: Vec2;
}
export interface PriorityConflict {
  agentId: string;
  laneId: string;
  ruleId: PriorityRule;
  ttc: number;
  protectiveBrake: boolean;
}
const cross = (ax: number, ay: number, bx: number, by: number) =>
  ax * by - ay * bx;

function conflictDistance(player: Path, other: Path) {
  const a = player.lane.end;
  const b = other.lane.end;
  const ax = player.end.x - a.x;
  const ay = player.end.y - a.y;
  const bx = other.end.x - b.x;
  const by = other.end.y - b.y;
  const divisor = cross(ax, ay, bx, by);
  if (Math.abs(divisor) < 1e-9) return undefined;
  const t = cross(b.x - a.x, b.y - a.y, bx, by) / divisor;
  const u = cross(b.x - a.x, b.y - a.y, ax, ay) / divisor;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1
    ? u * Math.hypot(bx, by)
    : undefined;
}

export class IntersectionManager {
  private readonly movements = new Map<Lane, Record<Maneuver, Path>>();
  private readonly closest: PriorityConflict = {
    agentId: '',
    laneId: '',
    ruleId: 'PIER-01',
    ttc: Infinity,
    protectiveBrake: false,
  };

  constructor(private readonly world: WorldModel) {
    for (const intersection of world.intersections) {
      for (const lane of intersection.lanes) {
        const makePath = (maneuver: Maneuver): Path => {
          const side = otherSide(lane.side, exitOffset[maneuver]);
          const opposite = intersection.lanes.find(
            (lane) => lane.side === side,
          );
          const vertical = side === 'N' || side === 'S';
          const midX = intersection.x + intersection.width / 2;
          const midY = intersection.y + intersection.height / 2;
          const authored = world.laneGraph
            .approach(lane)
            ?.movements.find((movement) => movement.maneuver === maneuver);
          const railExit =
            lane.type === 'tram' && maneuver === 'straight'
              ? world.trafficRoutes.flatMap(({ path, junctions }) =>
                  junctions
                    .filter((control) => control.lane === lane)
                    .map(
                      ({ exit }) =>
                        path.segments.find(({ offset }) => offset === exit)!
                          .start,
                    ),
                )[0]
              : undefined;
          const end =
            railExit ??
            authored?.path.end ??
            (vertical
              ? {
                  x: 2 * midX - (opposite?.end.x ?? midX),
                  y:
                    side === 'N'
                      ? intersection.y
                      : intersection.y + intersection.height,
                }
              : {
                  x:
                    side === 'W'
                      ? intersection.x
                      : intersection.x + intersection.width,
                  y: 2 * midY - (opposite?.end.y ?? midY),
                });
          const length =
            Math.hypot(end.x - lane.end.x, end.y - lane.end.y) || 1;
          return {
            lane,
            end,
            direction: {
              x: (end.x - lane.end.x) / length,
              y: (end.y - lane.end.y) / length,
            },
          };
        };
        this.movements.set(lane, {
          straight: makePath('straight'),
          left: makePath('left'),
          right: makePath('right'),
        });
      }
      for (const lane of intersection.lanes) {
        const movements = this.movements.get(lane)!;
        for (const other of intersection.lanes) {
          if (other === lane) continue;
          const others = this.movements.get(other)!;
          for (const maneuver of maneuvers) {
            for (const otherManeuver of maneuvers) {
              const playerPath = movements[maneuver];
              const otherPath = others[otherManeuver];
              const distance = conflictDistance(playerPath, otherPath);
              if (distance === undefined) continue;
              // Map below is per player movement; paths themselves identify the opposing movement.
              this.conflictsFor(playerPath).set(otherPath, distance);
            }
          }
        }
      }
    }
  }

  private readonly conflictMatrix = new Map<Path, Map<Path, number>>();
  private conflictsFor(path: Path) {
    let conflicts = this.conflictMatrix.get(path);
    if (!conflicts) this.conflictMatrix.set(path, (conflicts = new Map()));
    return conflicts;
  }

  private priority(
    lane: Lane,
    maneuver: Maneuver,
    other: Lane,
    otherManeuver: Maneuver,
    kind: AgentState['kind'],
    at: number,
    env: EnvState,
  ): PriorityRule | undefined {
    const phase = this.world.trafficPhase(lane, at, env);
    const otherPhase = this.world.trafficPhase(other, at, env);
    if (env.officerOrders?.[lane.id] || env.officerOrders?.[other.id]) {
      if (phase !== 'green' || otherPhase !== 'green') return;
    }
    if (phase !== 'off' || otherPhase !== 'off') {
      if (
        phase === 'arrow' &&
        (otherPhase === 'green' || otherPhase === 'yellow')
      )
        return 'ZNAK-S2';
      if (otherPhase !== 'green' || phase !== 'green') return;
    }
    if (
      phase === 'off' &&
      lane.priorityClass === 'minor' &&
      other.priorityClass === 'main'
    )
      return 'PIER-02';
    if (
      phase === 'off' &&
      lane.priorityClass === 'main' &&
      other.priorityClass === 'minor'
    )
      return;
    if (
      phase === 'off' &&
      lane.stopSign?.code === 'A-7' &&
      lane.priorityClass === 'roundabout_in' &&
      other.priorityClass === 'roundabout_ring'
    )
      return 'PIER-08';
    if (
      otherPhase === 'off' &&
      other.stopSign?.code === 'A-7' &&
      lane.priorityClass === 'roundabout_ring' &&
      other.priorityClass === 'roundabout_in'
    )
      return;
    if (phase === 'off') {
      if (lane.stopSign?.code === 'A-7' && !other.stopSign) return 'ZNAK-A7';
      if (other.stopSign?.code === 'A-7' && !lane.stopSign) return;
    }
    if (
      phase === 'off' &&
      lane.priorityClass === 'equal' &&
      other.priorityClass === 'equal'
    ) {
      if (lane.type !== 'tram' && kind === 'tram') return 'PIER-09';
      if (lane.type === 'tram' && kind !== 'tram') return;
    }
    if (
      other.side === otherSide(lane.side, 2) &&
      maneuver === 'left' &&
      otherManeuver !== 'left'
    )
      return 'PIER-03';
    if (other.side === otherSide(lane.side, -1)) return 'PIER-01';
  }

  private approach(agent: AgentState) {
    if (agent.laneId) return this.world.getLane(agent.laneId);
    if (agent.kind === 'tram' || agent.bikeInfrastructure) return undefined;
    return this.world.approachAt(agent.pos, agent.heading);
  }

  /** Geometry and priority for a stopped contender as well as a moving one. */
  mustYield(
    lane: Lane,
    maneuver: Maneuver,
    agent: AgentState,
    at: number,
    env: EnvState,
  ) {
    const path = this.movements.get(lane)?.[maneuver];
    const other = this.approach(agent);
    if (
      !path ||
      !other ||
      other === lane ||
      other.intersection !== lane.intersection
    )
      return undefined;
    const otherManeuver = agent.maneuver ?? 'straight';
    const otherPath = this.movements.get(other)![otherManeuver];
    if (!this.conflictMatrix.get(path)?.has(otherPath)) return undefined;
    return this.priority(
      lane,
      maneuver,
      other,
      otherManeuver,
      agent.kind,
      at,
      env,
    );
  }

  /** Borrowed result, valid until the next call. TTC is measured along the agent's movement. */
  conflict(
    lane: Lane,
    maneuver: Maneuver,
    agents: readonly AgentState[],
    at: number,
    env: EnvState,
    includeProtectiveBraking = true,
    onlyRule?: PriorityRule,
  ) {
    const path = this.movements.get(lane)?.[maneuver];
    const conflicts = path && this.conflictMatrix.get(path);
    if (!conflicts) return undefined;
    const closest = this.closest;
    closest.agentId = '';
    closest.ttc = Infinity;
    closest.protectiveBrake = false;
    for (const agent of agents) {
      const protectiveBrake =
        includeProtectiveBraking && Boolean(agent.protectiveBrake);
      if (
        agent.kind === 'pedestrian' ||
        agent.kind === 'emergency' ||
        (agent.speed <= 0 && !protectiveBrake)
      )
        continue;
      const other = this.approach(agent);
      if (!other || other === lane || other.intersection !== lane.intersection)
        continue;
      const otherManeuver = agent.maneuver ?? 'straight';
      const otherPath = this.movements.get(other)![otherManeuver];
      const conflict = conflicts.get(otherPath);
      if (conflict === undefined) continue;
      const ruleId = this.priority(
        lane,
        maneuver,
        other,
        otherManeuver,
        agent.kind,
        at,
        env,
      );
      if (!ruleId || (onlyRule && ruleId !== onlyRule)) continue;
      const toLine = distanceToLine(other, agent.pos);
      const progress =
        (agent.pos.x - other.end.x) * otherPath.direction.x +
        (agent.pos.y - other.end.y) * otherPath.direction.y;
      const remaining =
        conflict -
        (agent.junctionProgress ?? (toLine > 0 ? -toLine : progress));
      if (remaining < -0.5) continue;
      const ttc =
        agent.speed > 0 ? Math.max(0, remaining) / agent.speed : Infinity;
      if (
        (!protectiveBrake && closest.protectiveBrake) ||
        (closest.agentId &&
          protectiveBrake === closest.protectiveBrake &&
          ttc >= closest.ttc)
      )
        continue;
      closest.agentId = agent.id;
      closest.laneId = other.id;
      closest.ruleId = ruleId;
      closest.ttc = ttc;
      closest.protectiveBrake = protectiveBrake;
    }
    return closest.ttc < Infinity || closest.protectiveBrake
      ? closest
      : undefined;
  }
}
