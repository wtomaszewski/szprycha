import { BRAKE_DECELERATION } from '../../gameplay/bicycle';
import type { GameContent } from '../../content/schemas';
import { preferVerdict } from '../deduplication';
import { rightHand } from '../detectors/PIER-01';
import { subordinateRoad } from '../detectors/PIER-02';
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
      this.start();
      return;
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
    const conflict = (this.debugConflict = this.manager.conflict(
      lane,
      maneuver,
      agents,
      at,
      env,
    ));
    if (this.crossed) return;

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

    const dangerous =
      conflict &&
      (conflict.ttc + EPSILON < this.settings.ttc_minor_s ||
        conflict.protectiveBrake);
    if (distance >= 0 && distance <= STOP_RANGE) {
      this.bestApproachSpeed = Math.max(this.bestApproachSpeed, rider.speed);
      if (
        dangerous &&
        (rider.speed < this.settings.stop_predkosc_ms ||
          rider.speed < this.bestApproachSpeed - 0.25)
      ) {
        if (this.waited) Object.assign(this.waited, conflict);
        else this.waited = { ...conflict };
      }
    }
    if (
      !previous ||
      distance >= 0 ||
      distanceToLine(lane, previous) < 0 ||
      !zones.intersection ||
      zones.intersection !== lane.intersection
    ) {
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
            kind: this.severity(conflict),
            evidence: {
              ...candidate.evidence,
              conflictWith: conflict.agentId,
              ttc: conflict.ttc,
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
    const opportunity = dangerous ? conflict : this.waited;
    let priority: Verdict | undefined;
    if (opportunity) {
      const kind = dangerous ? this.severity(opportunity) : 'good';
      if (opportunity.ruleId === 'PIER-01')
        priority = rightHand(kind, rider, at, lane, opportunity);
      if (opportunity.ruleId === 'PIER-02')
        priority = subordinateRoad(kind, rider, at, lane, opportunity);
      if (dangerous && stop?.kind === 'minor') {
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

  private severity(conflict: PriorityConflict): 'minor' | 'major' {
    return conflict.protectiveBrake ||
      conflict.ttc + EPSILON < this.settings.ttc_major_s
      ? 'major'
      : 'minor';
  }
}
