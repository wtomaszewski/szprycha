import type { GameContent } from '../content/schemas';
import { BikeInfrastructureDetector } from './detectors/GDZIE-01';
import { sidewalkException, sidewalkVerdict } from './detectors/GDZIE-04';
import { sidewalkPedestrian } from './detectors/GDZIE-05';
import { pedestrianCrossing } from './detectors/GDZIE-06';
import { HelmetDetector } from './detectors/KASK-01';
import { RightTurnDetector } from './detectors/MAN-02';
import { passingTechnique } from './detectors/MAN-04';
import { passingOnRight } from './detectors/MAN-05';
import { restrictedPassing } from './detectors/MAN-12';
import { ManeuverDetector } from './detectors/MAN-01';
import { shoulderCheck } from './detectors/MAN-03';
import { ParkedClearanceDetector } from './detectors/MAN-06';
import { StartingDetector } from './detectors/MAN-07';
import { RidingPositionDetector } from './detectors/MAN-09';
import { PassengerDetector } from './detectors/MAN-10';
import { PhoneDetector } from './detectors/MAN-11';
import { RailwayDetector } from './detectors/MSC-01';
import { TramStopDetector } from './detectors/MSC-02';
import { DrivewayDetector } from './detectors/MSC-03';
import { VisibilityDetector } from './detectors/MSC-04';
import { TurningCrossingDetector } from './detectors/PIER-04';
import { BikeCrossingDetector } from './detectors/PIER-05';
import { EmergencyYieldDetector } from './detectors/PIER-07';
import { IntersectionManager } from './priority/IntersectionManager';
import {
  PassingMonitor,
  type PassingObservation,
} from './priority/PassingMonitor';
import { RoadVisit } from './world/RoadVisit';
import { IntersectionVisit } from './priority/IntersectionVisit';
import {
  TICKS_PER_SECOND,
  type AgentState,
  type EnvState,
  type RiderState,
  type Verdict,
} from './types';
import { sideVector, type WorldModel } from './world/WorldModel';
import { ZoneTracker } from './world/ZoneTracker';

const EXIT_TICKS = 0.25 * TICKS_PER_SECOND;
import { encounterSpeed, type RoadHazard } from './detectors/MAN-08';

type Listener = (verdict: Verdict) => void;

export class RuleEngine {
  readonly zones: ZoneTracker;
  readonly junction: IntersectionVisit;
  readonly recent: Verdict[] = [];
  readonly counts = { good: 0, minor: 0, major: 0 };
  private readonly helmet = new HelmetDetector();
  private readonly parked = new ParkedClearanceDetector();
  private readonly starting = new StartingDetector();
  private readonly ridingPosition = new RidingPositionDetector();
  private readonly passenger = new PassengerDetector();
  private readonly phone = new PhoneDetector();
  private readonly railway: RailwayDetector;
  private readonly tramStop = new TramStopDetector();
  private readonly driveway = new DrivewayDetector();
  private readonly visibility = new VisibilityDetector();
  private readonly turningCrossing = new TurningCrossingDetector();
  private readonly bikeCrossing = new BikeCrossingDetector();
  private readonly emergency = new EmergencyYieldDetector();
  private readonly emitStartingVerdict = (verdict?: Verdict) =>
    this.emit(verdict);
  private readonly road: RoadVisit;
  private readonly settings: GameContent['balans'];
  private readonly passing: PassingMonitor;
  private readonly rightTurn = new RightTurnDetector();
  private readonly onPass = (
    pass: PassingObservation,
    rider: RiderState,
    at: number,
  ) => {
    const restricted = restrictedPassing(pass, rider, at);
    if (restricted || pass.nearRail) {
      this.emit(restricted);
      return;
    }
    const clearance = this.settings.silnik.odstep_od_zaparkowanych_m;
    this.emit(
      passingOnRight(pass, rider, at, clearance) ??
        passingTechnique(pass, rider, at, clearance),
    );
  };
  private readonly bikeInfra = new BikeInfrastructureDetector();
  private readonly maneuver: ManeuverDetector;
  private readonly listeners = new Set<Listener>();
  private tick = 0;
  private shoulderBeforeTurn?: Verdict;
  private hasPrevious = false;
  private previous = { x: 0, y: 0 };
  private sidewalkId?: string;
  private sidewalkLast = -Infinity;
  private pedestrianCandidate?: Verdict;
  private sidewalkPenalized = false;
  private crossingId?: string;
  private crossingLast = -Infinity;
  private crossingCandidate?: Verdict;
  private crossingPenalized = false;

  constructor(
    private readonly world: WorldModel,
    private readonly content: Pick<GameContent, 'balans' | 'przepisy'>,
    private readonly manager = new IntersectionManager(world),
  ) {
    const { balans: settings, przepisy } = content;
    this.settings = settings;
    const weight = (ruleId: string) =>
      przepisy.przepisy.find(({ id }) => id === ruleId)?.waga_bledu ?? null;
    this.road = new RoadVisit(world, settings.silnik, {
      noVehicles: weight('ZNAK-B1'),
      noEntry: weight('ZNAK-B2T22'),
    });
    this.passing = new PassingMonitor(world);
    this.railway = new RailwayDetector(world);
    this.zones = new ZoneTracker(world);
    this.junction = new IntersectionVisit(world, settings.silnik, manager);
    this.maneuver = new ManeuverDetector(
      settings.silnik.sygnalizacja_min_przed_s,
    );
  }

  get at() {
    return Math.max(0, this.tick - 1) / TICKS_PER_SECOND;
  }

  get drivewayStopReady() {
    return this.driveway.stopReady;
  }

  get stopReady() {
    return this.junction.stopReady;
  }

  get signalReady() {
    return this.maneuver.signalingFor(this.tick);
  }

  get signal() {
    return this.maneuver.activeSignal;
  }

  /** Keep the simulation clock and recorded feedback, clear in-progress observations. */
  afterCheckpoint() {
    const engine = new RuleEngine(this.world, this.content, this.manager);
    engine.tick = this.tick;
    Object.assign(engine.counts, this.counts);
    engine.recent.push(...this.recent);
    return engine;
  }

  onVerdict(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  step(
    rider: RiderState,
    agents: readonly AgentState[],
    env: EnvState,
    hazards?: readonly RoadHazard[],
  ) {
    const at = this.tick / TICKS_PER_SECOND;
    this.zones.update(rider);
    this.maneuver.updateSignal(rider, this.tick);
    this.emit(this.helmet.evaluate(rider, at));
    this.evaluateTraffic(rider, agents, env, at);
    if (hazards?.length)
      this.emit(encounterSpeed(this.world, rider, hazards, at, env));
    this.emit(this.visibility.evaluate(rider, at, env));
    this.emit(this.ridingPosition.evaluate(rider, at));
    this.emit(this.passenger.evaluate(rider, at));
    this.emit(
      this.phone.evaluate(
        rider,
        at,
        !this.zones.crossing &&
          !this.zones.intersection &&
          this.zones.zone?.kind !== 'roadway' &&
          this.zones.zone?.kind !== 'bike_lane' &&
          this.zones.zone?.kind !== 'bike_path',
      ),
    );
    this.emit(this.bikeInfra.evaluate(rider, this.zones, this.tick));
    this.evaluateSidewalk(rider, agents, env, at);
    this.evaluateCrossing(rider, agents, at);
    this.emit(
      this.junction.evaluate(
        rider,
        this.hasPrevious ? this.previous : undefined,
        agents,
        env,
        this.zones,
        this.tick,
        this.signal,
      ),
    );
    const leftCheck = rider.shoulderCheck?.lastLeftAt ?? -Infinity;
    const checked =
      leftCheck <= at &&
      at - leftCheck <= this.settings.silnik.obejrzenie_okno_s;
    const preparation =
      checked && this.signal === 'left' && this.maneuver.signalingFor(this.tick)
        ? this.signal
        : 'none';
    this.passing.evaluate(rider, agents, at, env, preparation, this.onPass);
    this.road.evaluate(
      rider,
      agents,
      env,
      this.tick,
      this.zones,
      this.hasPrevious ? this.previous : undefined,
      this.junction.debugLane,
      this.passing.active,
      this.signal,
      this.emitStartingVerdict,
    );
    this.emit(this.rightTurn.evaluate(rider, this.zones, at));
    const maneuver = this.maneuver.evaluate(rider, this.zones, this.tick);
    this.emit(maneuver);
    const entryHeading = this.maneuver.junctionEntryHeading;
    if (entryHeading !== undefined)
      this.shoulderBeforeTurn = shoulderCheck(
        'MAN-03',
        rider,
        agents,
        at,
        this.settings.silnik.obejrzenie_okno_s,
        entryHeading,
        rider.pos,
      );
    if (this.maneuver.turnedLeft) this.emit(this.shoulderBeforeTurn);
    this.hasPrevious = true;
    this.previous.x = rider.pos.x;
    this.previous.y = rider.pos.y;
    this.tick++;
  }

  /** Close pending observations when a run ends. */
  finish() {
    this.closeSidewalk();
    this.closeCrossing();
    this.emit(this.driveway.finish());
  }

  private evaluateTraffic(
    rider: RiderState,
    agents: readonly AgentState[],
    env: EnvState,
    at: number,
  ) {
    const rules = this.settings.silnik;
    const { crossings, driveways, parkedCars, tramStops } = this.world;
    this.emit(
      this.turningCrossing.evaluate(
        rider,
        agents,
        at,
        this.zones.intersection,
        crossings,
      ),
    );
    this.emit(
      this.bikeCrossing.evaluate(
        rider,
        agents,
        at,
        crossings,
        rules.ttc_minor_s,
        rules.ttc_major_s,
      ),
    );
    this.emit(this.emergency.evaluate(rider, agents, at));
    this.emit(this.railway.evaluate(rider, agents, at, env));
    this.emit(this.tramStop.evaluate(rider, agents, at, tramStops));
    this.emit(
      this.parked.evaluate(
        rider,
        at,
        parkedCars,
        rules.odstep_od_zaparkowanych_m,
      ),
    );
    this.emit(
      this.driveway.evaluate(
        rider,
        agents,
        this.tick,
        driveways,
        this.zones.zone?.kind === 'roadway',
        this.zones.zone?.kind === 'sidewalk',
        rules.ttc_minor_s,
      ),
    );
    const lane = this.zones.driveway ? undefined : this.zones.lane;
    this.starting.evaluate(
      rider,
      agents,
      this.tick,
      lane,
      rules.obejrzenie_okno_s,
      rules.ttc_minor_s,
      this.emitStartingVerdict,
    );
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
      this.zones.crossing ||
      this.crossesSidewalkAtDriveway(rider)
    )
      return;
    this.sidewalkId ??= zone.id;
    this.sidewalkLast = this.tick;
    if (this.sidewalkPenalized) return;
    if (!sidewalkException(zone, rider, agents, env)) {
      this.sidewalkPenalized = true;
      this.emit(
        this.pedestrianCandidate?.kind === 'major'
          ? this.pedestrianCandidate
          : sidewalkVerdict(zone, rider, at),
      );
      return;
    }
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

  private crossesSidewalkAtDriveway(rider: RiderState) {
    const driveway = this.zones.driveway;
    if (!driveway) return false;
    const { x, y } = sideVector[driveway.direction];
    return (
      Math.abs(x * Math.cos(rider.heading) + y * Math.sin(rider.heading)) >
      Math.SQRT1_2
    );
  }

  private closeSidewalk() {
    if (!this.sidewalkPenalized) this.emit(this.pedestrianCandidate);
    this.sidewalkId = undefined;
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
