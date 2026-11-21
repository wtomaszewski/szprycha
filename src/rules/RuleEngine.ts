import type { GameContent } from '../content/schemas';
import { BikeInfrastructureDetector } from './detectors/GDZIE-01';
import { sidewalkException, sidewalkVerdict } from './detectors/GDZIE-04';
import { sidewalkPedestrian } from './detectors/GDZIE-05';
import { pedestrianCrossing } from './detectors/GDZIE-06';
import { HelmetDetector } from './detectors/KASK-01';
import { ManeuverDetector } from './detectors/MAN-01';
import { ReflectorsDetector } from './detectors/WYP-06';
import { IntersectionVisit } from './priority/IntersectionVisit';
import {
  TICKS_PER_SECOND,
  type AgentState,
  type EnvState,
  type RiderState,
  type Verdict,
} from './types';
import type { WorldModel } from './world/WorldModel';
import { ZoneTracker } from './world/ZoneTracker';

const EXIT_TICKS = 0.25 * TICKS_PER_SECOND;
type Listener = (verdict: Verdict) => void;

export class RuleEngine {
  readonly zones: ZoneTracker;
  readonly junction: IntersectionVisit;
  readonly recent: Verdict[] = [];
  readonly counts = { good: 0, minor: 0, major: 0 };
  private readonly helmet = new HelmetDetector();
  private readonly reflectors = new ReflectorsDetector();
  private readonly bikeInfra = new BikeInfrastructureDetector();
  private readonly maneuver: ManeuverDetector;
  private readonly listeners = new Set<Listener>();
  private tick = 0;
  private previous = { x: 0, y: 0 };
  private sidewalkId?: string;
  private sidewalkLast = -Infinity;
  private sidewalkCandidate?: Verdict;
  private pedestrianCandidate?: Verdict;
  private sidewalkPenalized = false;
  private crossingId?: string;
  private crossingLast = -Infinity;
  private crossingCandidate?: Verdict;
  private crossingPenalized = false;

  constructor(
    world: WorldModel,
    private readonly settings: GameContent['balans'],
  ) {
    this.zones = new ZoneTracker(world);
    this.junction = new IntersectionVisit(world, settings.silnik);
    this.maneuver = new ManeuverDetector(
      settings.silnik.sygnalizacja_min_przed_s,
    );
  }

  get at() {
    return Math.max(0, this.tick - 1) / TICKS_PER_SECOND;
  }

  get signal() {
    return this.maneuver.activeSignal;
  }

  onVerdict(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  step(rider: RiderState, agents: readonly AgentState[], env: EnvState) {
    const at = this.tick / TICKS_PER_SECOND;
    this.zones.update(rider);
    this.maneuver.updateSignal(rider, this.tick);
    this.emit(this.helmet.evaluate(rider, at));
    this.emit(this.reflectors.evaluate(rider, at));
    this.emit(this.bikeInfra.evaluate(rider, this.zones, this.tick));
    this.evaluateSidewalk(rider, agents, env, at);
    this.evaluateCrossing(rider, agents, at);
    this.emit(
      this.junction.evaluate(
        rider,
        this.tick === 0 ? undefined : this.previous,
        agents,
        env,
        this.zones,
        this.tick,
        this.signal,
      ),
    );
    this.emit(this.maneuver.evaluate(rider, this.zones, this.tick));
    this.previous.x = rider.pos.x;
    this.previous.y = rider.pos.y;
    this.tick++;
  }

  /** Close pending observations when a run ends. */
  finish() {
    this.closeSidewalk();
    this.closeCrossing();
  }

  private emit(verdict?: Verdict) {
    if (!verdict) return;
    this.counts[verdict.kind]++;
    if (this.recent.length === 10) this.recent.shift();
    this.recent.push(verdict);
    for (const listener of this.listeners) listener(verdict);
  }

  private evaluateSidewalk(
    rider: RiderState,
    agents: readonly AgentState[],
    env: EnvState,
    at: number,
  ) {
    const zone = this.zones.zone;
    if (this.sidewalkId && this.tick - this.sidewalkLast > EXIT_TICKS)
      this.closeSidewalk();
    if (
      zone?.kind !== 'sidewalk' ||
      rider.mode !== 'riding' ||
      rider.speed <= 0 ||
      this.zones.crossing
    )
      return;
    this.sidewalkId ??= zone.id;
    this.sidewalkLast = this.tick;
    if (this.sidewalkPenalized) return;
    const exception = sidewalkException(zone, rider, agents, env);
    if (!exception) {
      this.sidewalkPenalized = true;
      this.emit(
        this.pedestrianCandidate?.kind === 'major'
          ? this.pedestrianCandidate
          : sidewalkVerdict(zone, rider, at),
      );
      return;
    }
    this.sidewalkCandidate ??= sidewalkVerdict(zone, rider, at, exception);
    const { chodnik_predkosc_przy_pieszych_ms, ttc_minor_s, ttc_major_s } =
      this.settings.silnik;
    this.pedestrianCandidate = sidewalkPedestrian(
      zone,
      rider,
      agents,
      at,
      chodnik_predkosc_przy_pieszych_ms,
      ttc_minor_s,
      ttc_major_s,
      this.pedestrianCandidate,
    );
    if (this.pedestrianCandidate?.kind === 'major') {
      this.sidewalkPenalized = true;
      this.emit(this.pedestrianCandidate);
    }
  }

  private closeSidewalk() {
    if (!this.sidewalkPenalized)
      this.emit(this.pedestrianCandidate ?? this.sidewalkCandidate);
    this.sidewalkId = undefined;
    this.sidewalkCandidate = undefined;
    this.pedestrianCandidate = undefined;
    this.sidewalkPenalized = false;
  }

  private evaluateCrossing(
    rider: RiderState,
    agents: readonly AgentState[],
    at: number,
  ) {
    const crossing = this.zones.crossing;
    if (this.crossingId && this.tick - this.crossingLast > EXIT_TICKS)
      this.closeCrossing();
    if (crossing?.kind !== 'pedestrian' || rider.speed <= 0) return;
    if (this.crossingId !== crossing.id) {
      this.closeCrossing();
      this.crossingId = crossing.id;
    }
    this.crossingLast = this.tick;
    if (this.crossingPenalized) return;
    if (!this.crossingCandidate || rider.mode === 'riding') {
      this.crossingCandidate = pedestrianCrossing(crossing, rider, agents, at);
      if (this.crossingCandidate.kind !== 'good') {
        this.crossingPenalized = true;
        this.emit(this.crossingCandidate);
      }
    }
  }

  private closeCrossing() {
    if (!this.crossingPenalized) this.emit(this.crossingCandidate);
    this.crossingId = undefined;
    this.crossingCandidate = undefined;
    this.crossingPenalized = false;
  }
}
