import { BRAKE_DECELERATION } from '../../gameplay/bicycle';
import type { GameContent } from '../../content/schemas';
import { preferVerdict } from '../deduplication';
import { rightHand } from '../detectors/PIER-01';
import { subordinateRoad } from '../detectors/PIER-02';
import { oncomingPriority } from '../detectors/PIER-03';
import { roundaboutPriority } from '../detectors/PIER-08';
import { tramPriority } from '../detectors/PIER-09';
import { trafficLight } from '../detectors/SYG-01';
import { conditionalArrow } from '../detectors/ZNAK-S2';
import { stopSign } from '../detectors/ZNAK-STOP';
import {
  TICKS_PER_SECOND,
  type RiderState,
  type Vec2,
  type AgentState,
  type EnvState,
  type SignalPhase,
  type Verdict,
  type Maneuver,
} from '../types';
import {
  distanceToLine,
  lateralOffset,
  type Lane,
  type WorldModel,
} from '../world/WorldModel';
import type { ZoneTracker } from '../world/ZoneTracker';
import {
  IntersectionManager,
  type PriorityConflict,
} from './IntersectionManager';

type Balance = GameContent['balans']['silnik'];
const STOP_RANGE = 3;
const EPSILON = 1e-9;

export class IntersectionVisit {
  private lane?: Lane;
  private crossed = false;
  private outsideSince?: number;
  private stopStart?: number;
  private stopped = false;
  private stoppedForLight = false;
  private phase: SignalPhase = 'off';
  private yellowCanStop = false;
  private bestApproachSpeed = 0;
  private waited?: PriorityConflict;
  private waitedForLeft?: PriorityConflict;
  private pendingLeft?: { verdict: Verdict; lane: Lane };
  private arrowEntry?: { verdict: Verdict; invalid: Verdict; lane: Lane };

  debugLane?: Lane;
  debugPhase: SignalPhase = 'off';
  debugConflict?: PriorityConflict;

  constructor(
    private readonly world: WorldModel,
    private readonly settings: Balance,
    private readonly manager: IntersectionManager,
  ) {}

  private start(lane?: Lane) {
    this.lane = lane;
    this.crossed = false;
    this.stopStart = undefined;
    this.outsideSince = undefined;
    this.stopped = false;
    this.stoppedForLight = false;
    this.phase = 'off';
    this.yellowCanStop = false;
    this.bestApproachSpeed = 0;
    this.waited = undefined;
    this.waitedForLeft = undefined;
  }

  evaluate(
    rider: RiderState,
    previous: Vec2 | undefined,
    agents: readonly AgentState[],
    env: EnvState,
    zones: ZoneTracker,
    tick: number,
    signal: RiderState['signal'],
  ) {
    this.debugLane = undefined;
    this.debugPhase = 'off';
    this.debugConflict = undefined;
    const at = tick / TICKS_PER_SECOND;
    const pendingArrow = this.arrowEntry;
    if (pendingArrow && zones.intersection !== pendingArrow.lane.intersection) {
      this.arrowEntry = undefined;
      const { forward, intersection, arrow } = pendingArrow.lane;
      const lateral =
        -(rider.pos.x - intersection.x - intersection.width / 2) * forward.y +
        (rider.pos.y - intersection.y - intersection.height / 2) * forward.x;
      const halfWidth =
        (Math.abs(forward.x) * intersection.height) / 2 +
        (Math.abs(forward.y) * intersection.width) / 2;
      const correctExit =
        arrow?.direction === 'right'
          ? lateral >= halfWidth
          : lateral <= -halfWidth;
      return correctExit ? pendingArrow.verdict : pendingArrow.invalid;
    }
    if (rider.mode !== 'riding') {
      this.pendingLeft = undefined;
      this.start();
      return;
    }
    const pending = this.pendingLeft;
    if (pending) {
      const { lane, verdict } = pending;
      const forward =
        Math.cos(rider.heading) * lane.forward.x +
        Math.sin(rider.heading) * lane.forward.y;
      if (
        zones.intersection === lane.intersection &&
        lateralOffset(lane, rider.pos) < -0.5 &&
        forward < Math.SQRT1_2 &&
        lane.forward.x * Math.sin(rider.heading) -
          lane.forward.y * Math.cos(rider.heading) <
          0
      ) {
        this.pendingLeft = undefined;
        return verdict;
      }
      if (zones.intersection !== lane.intersection)
        this.pendingLeft = undefined;
    }
    if (
      this.crossed &&
      this.lane &&
      zones.intersection !== this.lane.intersection
    ) {
      this.outsideSince ??= tick;
      if (
        tick - this.outsideSince > TICKS_PER_SECOND / 4 ||
        distanceToLine(this.lane, rider.pos) > STOP_RANGE
      )
        this.start();
    } else this.outsideSince = undefined;
    if (!this.lane || (zones.lane && zones.lane !== this.lane))
      this.start(zones.lane);
    const lane = this.lane;
    if (!lane) return;
    const distance = distanceToLine(lane, rider.pos);
    if (
      !this.crossed &&
      !zones.lane &&
      (Math.abs(lateralOffset(lane, rider.pos)) > lane.width / 2 ||
        distance > lane.length ||
        distance < -lane.width)
    ) {
      this.start();
      return;
    }
    this.debugLane = lane;
    const phase = (this.debugPhase = this.world.phase(lane, at, env));
    const maneuver: Maneuver =
      rider.maneuver ??
      (phase === 'arrow' && lane.arrow
        ? lane.arrow.direction
        : signal === 'none'
          ? 'straight'
          : signal);
    if (this.crossed) {
      this.debugConflict = this.manager.conflict(
        lane,
        maneuver,
        agents,
        at,
        env,
      );
      return;
    }
    if (phase === 'yellow' && this.phase !== 'yellow') {
      // Kinematics at the onset of yellow, with the bicycle's service brake.
      this.yellowCanStop =
        (rider.speed * rider.speed) /
          (2 * BRAKE_DECELERATION * this.world.metersPerPixel) <
        distance;
    }
    const lightChangedToGreen =
      phase === 'green' && this.phase !== 'green' && this.stoppedForLight;
    this.phase = phase;
    const stoppedBeforeThisTick =
      this.stopStart !== undefined &&
      (tick - this.stopStart) / TICKS_PER_SECOND >= this.settings.stop_czas_s;
    if (stoppedBeforeThisTick) this.stopped = true;
    if (
      distance >= 0 &&
      distance <= STOP_RANGE &&
      rider.speed < this.settings.stop_predkosc_ms
    ) {
      this.stopStart ??= tick;
      if (
        (phase === 'red' || phase === 'yellow' || phase === 'arrow') &&
        this.stopped
      )
        this.stoppedForLight = true;
    } else {
      this.stopStart = undefined;
      if (distance > STOP_RANGE) {
        this.stopped = false;
        this.stoppedForLight = false;
      }
    }

    const nearingLine = distance >= 0 && distance <= STOP_RANGE;
    if (nearingLine)
      this.bestApproachSpeed = Math.max(this.bestApproachSpeed, rider.speed);
    const slowing =
      rider.speed < this.settings.stop_predkosc_ms ||
      rider.speed < this.bestApproachSpeed - 0.25;
    const entering =
      previous &&
      distance < 0 &&
      distanceToLine(lane, previous) >= 0 &&
      zones.intersection === lane.intersection;
    if (
      !rider.maneuver &&
      (phase === 'off' || phase === 'green') &&
      (entering || (nearingLine && slowing))
    ) {
      // The turn signal is an intention. Confirm the left turn with the observed trajectory.
      const left = this.dangerous(
        this.manager.conflict(lane, 'left', agents, at, env, true, 'PIER-03'),
      );
      if (nearingLine && left) {
        if (this.waitedForLeft) Object.assign(this.waitedForLeft, left);
        else this.waitedForLeft = { ...left };
      }
      if (entering) {
        const opportunity = left ?? this.waitedForLeft;
        if (opportunity)
          this.pendingLeft = {
            lane,
            verdict: oncomingPriority(
              left ? this.severity(left) : 'good',
              rider,
              at,
              lane,
              opportunity,
            ),
          };
      }
    }
    this.debugConflict = this.manager.conflict(lane, maneuver, agents, at, env);
    const dangerous = this.dangerous(this.debugConflict);
    if (nearingLine && slowing && dangerous) {
      if (this.waited) Object.assign(this.waited, dangerous);
      else this.waited = { ...dangerous };
    }
    if (!entering) {
      if (lightChangedToGreen && this.stoppedForLight) {
        this.stoppedForLight = false;
        return trafficLight(lane, rider, at, phase, true, false);
      }
      return;
    }
    this.crossed = true;

    if (phase !== 'off') {
      if (phase === 'arrow' && this.world.arrowMatches(lane, maneuver)) {
        let candidate = conditionalArrow(lane, rider, at, this.stopped);
        if (dangerous)
          candidate = {
            ...candidate,
            kind: this.severity(dangerous),
            evidence: {
              ...candidate.evidence,
              conflictWith: dangerous.agentId,
              ttc: dangerous.ttc,
            },
          };
        if (rider.maneuver) return candidate;
        this.arrowEntry = {
          verdict: candidate,
          invalid: trafficLight(lane, rider, at, phase, false, false)!,
          lane,
        };
        return;
      }
      if (
        phase === 'green' &&
        rider.maneuver &&
        dangerous?.ruleId === 'PIER-03'
      )
        return oncomingPriority(
          this.severity(dangerous),
          rider,
          at,
          lane,
          dangerous,
        );
      if (
        phase === 'green' &&
        rider.maneuver &&
        this.waited?.ruleId === 'PIER-03' &&
        !dangerous
      )
        return oncomingPriority('good', rider, at, lane, this.waited);
      return trafficLight(
        lane,
        rider,
        at,
        phase,
        this.stoppedForLight,
        this.yellowCanStop,
      );
    }
    let stop = stopSign(lane, this.stopped, rider, at);
    const opportunity = dangerous ?? this.waited;
    let priority: Verdict | undefined;
    if (opportunity) {
      const kind = dangerous ? this.severity(opportunity) : 'good';
      if (opportunity.ruleId === 'PIER-01')
        priority = rightHand(kind, rider, at, lane, opportunity);
      if (opportunity.ruleId === 'PIER-02')
        priority = subordinateRoad(kind, rider, at, lane, opportunity);
      if (opportunity.ruleId === 'PIER-03' && rider.maneuver)
        priority = oncomingPriority(kind, rider, at, lane, opportunity);
      if (opportunity.ruleId === 'PIER-08')
        priority = roundaboutPriority(kind, rider, at, lane, opportunity);
      if (opportunity.ruleId === 'PIER-09')
        priority = tramPriority(kind, rider, at, lane, opportunity);
      if (priority && dangerous && stop?.kind === 'minor') {
        stop = {
          ...stop,
          kind,
          evidence: {
            ...stop.evidence,
            conflictWith: opportunity.agentId,
            ttc: opportunity.ttc,
            protectiveBrake: opportunity.protectiveBrake,
          },
          highlight: { ...stop.highlight, agentId: opportunity.agentId },
        };
      }
    }
    return preferVerdict(stop, priority);
  }

  private dangerous(conflict: PriorityConflict | undefined) {
    return conflict &&
      (conflict.protectiveBrake ||
        conflict.ttc + EPSILON < this.settings.ttc_minor_s)
      ? conflict
      : undefined;
  }

  private severity(conflict: PriorityConflict): 'minor' | 'major' {
    return conflict.protectiveBrake ||
      conflict.ttc + EPSILON < this.settings.ttc_major_s
      ? 'major'
      : 'minor';
  }
}
