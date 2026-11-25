import type { GameContent } from '../../content/schemas';
import { preferVerdict } from '../deduplication';
import { bikeLaneDirection } from '../detectors/GDZIE-02';
import { keepRight } from '../detectors/GDZIE-03';
import { shoulderApplies, useShoulder } from '../detectors/GDZIE-03b';
import { livingZone } from '../detectors/GDZIE-07';
import { ridingAbreast } from '../detectors/GDZIE-08';
import { prohibitedRoad } from '../detectors/GDZIE-09';
import { sharedPath } from '../detectors/GDZIE-11';
import { safeSpeed } from '../detectors/MAN-08';
import { bicycleSignal } from '../detectors/SYG-02';
import { noVehicles } from '../detectors/ZNAK-B1';
import { noEntry } from '../detectors/ZNAK-B2T22';
import { noBicycles } from '../detectors/ZNAK-B9';
import {
  TICKS_PER_SECOND,
  type AgentState,
  type EnvState,
  type RiderState,
  type Vec2,
  type Verdict,
} from '../types';
import {
  contains,
  distanceToLine,
  sideVector,
  type Lane,
  type Sign,
  type WorldModel,
  type Zone,
} from './WorldModel';
import type { ZoneTracker } from './ZoneTracker';

type Balance = GameContent['balans']['silnik'];
const EXIT_TICKS = TICKS_PER_SECOND / 4;

export class RoadVisit {
  private readonly episodes = new Map<
    string,
    { section?: string; tick: number; reported: boolean }
  >(
    [
      'GDZIE-02',
      'GDZIE-03b',
      'GDZIE-03',
      'GDZIE-07',
      'GDZIE-08',
      'GDZIE-11',
      'MAN-08',
      'access',
    ].map((id) => [id, { tick: -Infinity, reported: false }]),
  );
  private clearRoad?: Zone;
  private clearSince = 0;

  constructor(
    private readonly world: WorldModel,
    private readonly settings: Balance,
    private readonly accessWeights: Record<
      'noVehicles' | 'noEntry',
      Exclude<Verdict['kind'], 'good'> | null
    >,
  ) {}

  hasActiveViolation(tick: number) {
    for (const episode of this.episodes.values())
      if (episode.reported && tick - episode.tick <= EXIT_TICKS) return true;
    return false;
  }

  evaluate(
    rider: RiderState,
    agents: readonly AgentState[],
    env: EnvState,
    tick: number,
    zones: ZoneTracker,
    previous: Vec2 | undefined,
    approach: Lane | undefined,
    passing: boolean,
    signal: RiderState['signal'],
    emit: (v?: Verdict) => void,
  ) {
    const at = tick / TICKS_PER_SECOND;
    const { zone, roadway, lane, crossing } = zones;
    if (rider.mode !== 'riding') {
      this.clearRoad = undefined;
      for (const episode of this.episodes.values()) episode.tick = -Infinity;
      return;
    }
    if (!env.officerOrders?.[approach?.id ?? ''] && crossing?.kind === 'bike')
      emit(bicycleSignal(this.world, crossing, rider, previous, at, env));
    const moving = rider.speed > 0;
    const rights = this.settings;
    const living = this.findZone('living_zone', rider.pos);
    const excluded =
      zone?.kind === 'sidewalk' ||
      zones.intersection ||
      crossing ||
      (approach && distanceToLine(approach, rider.pos) < 6) ||
      passing ||
      signal === 'left' ||
      rider.maneuver === 'left';

    const roadDirection = roadway?.direction && sideVector[roadway.direction];
    const againstRoadDirection =
      roadDirection &&
      Math.cos(rider.heading) * roadDirection.x +
        Math.sin(rider.heading) * roadDirection.y <=
        -Math.SQRT1_2 &&
      this.world.signs.some(
        ({ code, affects, displayOnly }) =>
          code === 'D-3' && affects === roadway!.id && !displayOnly,
      );
    const wrongWay =
      zone?.kind === 'bike_lane' && !zones.followsBikePath
        ? zone
        : againstRoadDirection
          ? roadway
          : undefined;
    if (moving && wrongWay && this.canReport('GDZIE-02', wrongWay.id, tick))
      this.report(bikeLaneDirection(wrongWay, rider, at), emit);

    const rural = roadway && this.world.ruralShoulders.get(roadway);
    const shoulder = rural
      ? rural.find((candidate) => shoulderApplies(candidate, rider))
      : lane?.shoulder;
    if (
      moving &&
      !excluded &&
      shoulder &&
      this.canReport('GDZIE-03b', shoulder.id, tick)
    )
      this.report(
        useShoulder(shoulder, rider, agents, at, rural ? undefined : lane),
        emit,
      );

    const clearRoad =
      moving &&
      roadway &&
      !excluded &&
      !living &&
      !lane?.parallelBikeInfra &&
      !shoulder?.shoulderUsable &&
      !this.nearParkedCar(rider.pos)
        ? roadway
        : undefined;
    if (this.clearRoad !== clearRoad) {
      this.clearRoad = clearRoad;
      this.clearSince = tick;
    }
    if (
      clearRoad &&
      this.canReport('GDZIE-03', clearRoad.id, tick) &&
      tick - this.clearSince >= TICKS_PER_SECOND
    )
      this.report(keepRight(clearRoad, rider, at), emit);

    if (moving && living && this.canReport('GDZIE-07', living.id, tick))
      this.report(
        livingZone(living, rider, agents, at, rights.ttc_minor_s),
        emit,
      );

    if (
      moving &&
      (roadway || living) &&
      this.canReport('GDZIE-08', (roadway ?? living)?.id, tick)
    )
      this.report(ridingAbreast(rider, agents, at), emit);

    const shared = this.findZone('shared_path', rider.pos);
    if (moving && shared && this.canReport('GDZIE-11', shared.id, tick))
      this.report(
        sharedPath(
          shared,
          rider,
          agents,
          at,
          rights.chodnik_predkosc_przy_pieszych_ms,
          rights.ttc_minor_s,
        ),
        emit,
      );

    if (
      moving &&
      zone &&
      zone.kind !== 'sidewalk' &&
      !shared &&
      (!living || zone.surface === 'rough') &&
      this.canReport('MAN-08', zone.id, tick)
    )
      this.report(
        safeSpeed(
          this.world,
          zone,
          rider,
          agents,
          at,
          rights.przyczepnosc[env.weather],
          env.weather,
        ),
        emit,
      );

    const barred = this.findZone('no_bikes', rider.pos);
    const access = this.accessSign(rider.pos, barred, lane);
    const section = barred?.id ?? access?.affects;
    if (
      moving &&
      section &&
      zone?.kind !== 'sidewalk' &&
      this.canReport('access', section, tick)
    ) {
      const signVerdict = access && this.accessVerdict(access, rider, at);
      const roadVerdict = barred && prohibitedRoad(barred, rider, at, access);
      const candidate = preferVerdict(roadVerdict, signVerdict);
      if (candidate) this.episodes.get('access')!.reported = true;
      emit(candidate);
    }
  }

  private nearParkedCar(pos: Vec2) {
    for (const car of this.world.parkedCars)
      if (contains(car, pos, 3)) return true;
    return false;
  }

  private findZone(kind: Zone['kind'], pos: Vec2) {
    for (const zone of this.world.zones)
      if (zone.kind === kind && contains(zone, pos)) return zone;
  }

  private accessSign(
    pos: Vec2,
    barred: Zone | undefined,
    lane: Lane | undefined,
  ) {
    if (barred) {
      const sign = this.world.accessByZone.get(barred);
      if (sign) return sign;
    }
    for (const [zone, sign] of this.world.accessByZone)
      if (contains(zone, pos)) return sign;
    return lane?.accessSign;
  }

  private accessVerdict(sign: Sign, rider: RiderState, at: number) {
    if (sign.code === 'B-1')
      return noVehicles(sign, rider, at, this.accessWeights.noVehicles);
    if (sign.code === 'B-9') return noBicycles(sign, rider, at);
    return noEntry(sign, rider, at, this.accessWeights.noEntry);
  }

  private canReport(ruleId: string, section: string | undefined, tick: number) {
    const state = this.episodes.get(ruleId)!;
    if (state.section === section && tick - state.tick <= EXIT_TICKS) {
      state.tick = tick;
      return !state.reported;
    }
    state.section = section;
    state.tick = tick;
    state.reported = false;
    return true;
  }

  private report(candidate: Verdict | undefined, emit: (v: Verdict) => void) {
    if (!candidate) return;
    this.episodes.get(candidate.ruleId)!.reported = true;
    emit(candidate);
  }
}
