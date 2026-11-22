import { preferVerdict } from '../deduplication';
import {
  TICKS_PER_SECOND,
  verdict,
  type AgentState,
  type RiderState,
  type Verdict,
} from '../types';
import { contains, sideVector, type Driveway } from '../world/WorldModel';
import { joiningConflict, joiningTraffic } from './PIER-06';

export class DrivewayDetector {
  private driveway?: Driveway;
  private stoppedAt?: number;
  private stopped = false;
  private waited?: string;
  private candidate?: Verdict;
  private onRoad = false;
  private onSidewalk = false;

  get stopReady() {
    return this.stopped;
  }

  get hasPendingViolation() {
    return this.candidate !== undefined && this.candidate.kind !== 'good';
  }

  evaluate(
    rider: RiderState,
    agents: readonly AgentState[],
    tick: number,
    driveways: readonly Driveway[],
    onRoad: boolean,
    onSidewalk: boolean,
    minorTtc: number,
  ) {
    const at = tick / TICKS_PER_SECOND;
    const driveway =
      rider.mode === 'riding'
        ? driveways.find(
            (area) =>
              contains(area, rider.pos) &&
              Math.cos(rider.heading) * sideVector[area.direction].x +
                Math.sin(rider.heading) * sideVector[area.direction].y >
                Math.SQRT1_2,
          )
        : undefined;
    let result: Verdict | undefined;
    if (driveway !== this.driveway) {
      result = this.finish();
      this.driveway = driveway;
      this.stoppedAt = undefined;
      this.stopped = false;
      this.waited = undefined;
      this.onRoad = onRoad;
      this.onSidewalk = onSidewalk;
    }
    if (!driveway) return result;
    if (rider.speed < 0.1 && !onRoad && !onSidewalk) {
      this.stoppedAt ??= tick;
      this.stopped ||= tick - this.stoppedAt >= 0.3 * TICKS_PER_SECOND;
      const nearby = agents.find(
        (agent) =>
          agent.kind === 'pedestrian' &&
          contains(driveway, agent.pos, 1) &&
          Math.hypot(rider.pos.x - agent.pos.x, rider.pos.y - agent.pos.y) <= 3,
      );
      this.waited ??= nearby?.id;
    } else this.stoppedAt = undefined;
    const enteredSidewalk = onSidewalk && !this.onSidewalk;
    const enteredRoad = onRoad && !this.onRoad;
    if (rider.speed > 0 && (onRoad || onSidewalk)) {
      const conflict = joiningConflict(rider, agents, minorTtc);
      if (conflict) {
        const kind =
          conflict.protectiveBrake || enteredRoad ? 'major' : 'minor';
        this.candidate = preferVerdict(
          this.candidate,
          joiningTraffic(rider, at, kind, conflict.id, driveway),
        );
      }
      if (enteredSidewalk || enteredRoad) {
        const kind = conflict
          ? 'major'
          : !this.stopped
            ? 'minor'
            : this.waited
              ? 'good'
              : undefined;
        if (kind)
          this.candidate = preferVerdict(
            this.candidate,
            verdict(
              'MSC-03',
              kind,
              at,
              rider,
              {
                stopped: this.stopped,
                conflictWith: conflict?.id ?? this.waited,
              },
              { zoneId: driveway.id, agentId: conflict?.id ?? this.waited },
            ),
          );
      }
    }
    this.onRoad = onRoad;
    this.onSidewalk = onSidewalk;
    return result;
  }

  finish() {
    const result = this.candidate;
    this.candidate = undefined;
    return result;
  }
}
