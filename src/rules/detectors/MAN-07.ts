import { timeToConflict } from '../priority/ConflictGeometry';
import { shoulderCheck } from './MAN-03';
import {
  TICKS_PER_SECOND,
  type AgentState,
  type RiderState,
  type Verdict,
} from '../types';
import { lateralOffset, type Lane } from '../world/WorldModel';
import { joiningConflict, joiningTraffic } from './PIER-06';

export class StartingDetector {
  private stoppedAt?: number;
  private lane?: Lane;
  private waitedFor?: string;

  evaluate(
    rider: RiderState,
    agents: readonly AgentState[],
    tick: number,
    lane: Lane | undefined,
    window: number,
    minorTtc: number,
    emit: (verdict?: Verdict) => void,
  ) {
    if (rider.mode !== 'riding' || !lane) {
      this.stoppedAt = undefined;
      this.lane = undefined;
      this.waitedFor = undefined;
      return;
    }
    if (rider.speed < 0.1) {
      if (lane !== this.lane) {
        this.stoppedAt = undefined;
        this.waitedFor = undefined;
      }
      this.lane = lane;
      // The outer part of the right-hand traffic lane is the curbside.
      if (lateralOffset(lane, rider.pos) >= lane.width / 4) {
        this.stoppedAt ??= tick;
        this.waitedFor ??= agents.find(
          (agent) =>
            agent.speed > 0 &&
            agent.kind !== 'pedestrian' &&
            timeToConflict(rider, agent, 1.8) < minorTtc &&
            Math.hypot(rider.pos.x - agent.pos.x, rider.pos.y - agent.pos.y) <
              8,
        )?.id;
      } else {
        this.stoppedAt = undefined;
        this.waitedFor = undefined;
      }
      return;
    }
    if (this.stoppedAt === undefined) return;
    const stoppedFor = (tick - this.stoppedAt) / TICKS_PER_SECOND;
    this.stoppedAt = undefined;
    const waitedFor = this.waitedFor;
    this.waitedFor = undefined;
    if (lane !== this.lane || stoppedFor < 0.3) return;
    const at = tick / TICKS_PER_SECOND;
    const conflict = joiningConflict(rider, agents, minorTtc);
    if (conflict) emit(joiningTraffic(rider, at, 'major', conflict.id, lane));
    else if (
      waitedFor &&
      !agents.some(
        (agent) =>
          agent.id === waitedFor &&
          timeToConflict(rider, agent, 1.8) < minorTtc,
      )
    )
      emit(joiningTraffic(rider, at, 'good', waitedFor, lane));
    emit(
      shoulderCheck(
        'MAN-07',
        rider,
        agents,
        at,
        window,
        rider.heading,
        rider.pos,
      ),
    );
  }
}
