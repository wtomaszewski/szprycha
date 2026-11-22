import type {
  ForcedMissionEvent,
  MissionDefinition,
  MissionGoal,
} from '../content/missions.ts';
import type { GameContent } from '../content/schemas.ts';
import { MissionScore } from '../progression/missionScore.ts';
import { missionStars, type Stars } from '../progression/missionRewards.ts';
import type { MissionRace } from './MissionRace.ts';
import { TICKS_PER_SECOND, type Vec2, type Verdict } from '../rules/types.ts';
import {
  contains,
  type Box,
  type PointOfInterest,
  type WorldModel,
  type Zone,
} from '../rules/world/WorldModel.ts';

export interface MissionSpawn extends Vec2 {
  heading: number;
}

type Failure = MissionDefinition['warunki_porazki'][number] | 'wynik_wyscigu';
type Equipment = { helmet: boolean; lights: boolean };
type Outcome = { status: 'completed' } | { status: 'failed'; reason: Failure };

export type MissionResult = Outcome & {
  missionId: string;
  elapsedSeconds: number;
  par_s: number;
  goodHabits: number;
  verdicts: readonly Verdict[];
  timeBonusEligible: boolean;
  illegalShortcut: boolean;
  points: number;
  penaltyPoints: number;
  stars: Stars;
  longestSeries: number;
  opponentScore?: number;
  shocks?: number;
  smoothBonus?: number;
  photos?: number;
};

interface TickEffects {
  respawn?: MissionSpawn;
  events?: ForcedMissionEvent[];
  missingHabit?: { hintKey?: string };
}

interface Checkpoint {
  spawn: MissionSpawn;
  goalIndex: number;
}

function center({ x, y, width, height }: Box): Vec2 {
  return { x: x + width / 2, y: y + height / 2 };
}

function spawnAt(poi: PointOfInterest): MissionSpawn {
  return { ...center(poi), heading: poi.heading };
}

function reached(area: Box, position: Vec2): boolean {
  if (area.width === 0 && area.height === 0)
    return Math.hypot(position.x - area.x, position.y - area.y) <= 1.5;
  return contains(area, position);
}

/** One step per simulation tick. Positions and map areas use metres. */
export class MissionSystem {
  readonly start: MissionSpawn;
  private readonly goals: {
    goal: MissionGoal;
    area: Box;
    position: Vec2;
    eventWaypoint?: boolean;
  }[];
  private forcedWaypoint?: MissionSystem['goals'][number];
  private readonly checkpoints: PointOfInterest[];
  private readonly forced: {
    event: ForcedMissionEvent;
    area: Box;
    position: Vec2;
    fired: boolean;
  }[];
  private readonly goalTicks: number[];
  private readonly verdicts: Verdict[] = [];
  private readonly shortcutSign?: { id: string; ruleId: string };
  private readonly roughSurfaces: readonly Zone[];
  private readonly photos = new Set<string>();
  private previousSpeed = 0;
  private shocks = 0;
  private readonly failureConditions: ReadonlySet<Failure>;
  private checkpoint: Checkpoint;
  private nextCheckpoint = 0;
  private ticks = 0;
  private goalIndex = 0;
  private requiredHabitSeen = false;
  private readonly score: MissionScore;
  private delayedOutcome?: Outcome;
  private outcome?: MissionResult;

  constructor(
    readonly definition: MissionDefinition,
    world: Pick<WorldModel, 'pois' | 'zones' | 'triggers'> &
      Partial<Pick<WorldModel, 'signs' | 'raceRoutes'>>,
    private readonly balance: Pick<
      GameContent['balans'],
      'misja' | 'combo' | 'gwiazdki'
    >,
    readonly race?: MissionRace,
    initialStreak = 0,
  ) {
    this.score = new MissionScore(balance, initialStreak);
    const poi = (id: string) => {
      const point = world.pois.get(id);
      if (!point)
        throw new Error(`Mission ${definition.id}: unknown POI ${id}`);
      return point;
    };
    let area = poi(definition.start.poi);
    this.start = spawnAt(area);
    this.checkpoint = { spawn: this.start, goalIndex: 0 };
    this.goals = definition.cele.map((goal) => {
      if ('poi' in goal && goal.poi) area = poi(goal.poi);
      if (goal.typ === 'sfotografuj') {
        const sign = world.signs?.find(({ id }) => id === goal.znak);
        if (!sign || !reached(area, sign))
          throw new Error(
            `Mission ${definition.id}: sign ${goal.znak} is outside its photo POI`,
          );
      }
      return { goal, area, position: center(area) };
    });
    this.goalTicks = this.goals.map(() => 0);
    this.checkpoints = definition.checkpointy.map(poi);
    this.forced = definition.zdarzenia_wymuszone.map((event) => {
      const area =
        world.pois.get(event.przy) ??
        world.triggers.get(event.przy) ??
        world.zones.find(({ id }) => id === event.przy);
      if (!area)
        throw new Error(
          `Mission ${definition.id}: unknown event location ${event.przy}`,
        );
      return { event, area, fired: false, position: center(area) };
    });
    this.failureConditions = new Set(definition.warunki_porazki);
    const shortcut = definition.skrot?.odcinek;
    if (shortcut) {
      const sign = world.signs?.find(
        ({ affects, code, exceptBicycles, displayOnly }) =>
          !displayOnly &&
          affects === shortcut &&
          (code === 'B-1' || code === 'B-2') &&
          !exceptBicycles,
      );
      if (!sign || !world.zones.some(({ id }) => id === shortcut))
        throw new Error(
          `Mission ${definition.id}: shortcut ${shortcut} needs a B-1 or B-2 zone`,
        );
      this.shortcutSign = {
        id: sign.id,
        ruleId: sign.code === 'B-1' ? 'ZNAK-B1' : 'ZNAK-B2T22',
      };
    }
    this.roughSurfaces = definition.przesylka?.delikatna
      ? world.zones.filter(({ surface }) => surface === 'rough')
      : [];
    if (definition.wyscig) {
      const route = world.raceRoutes?.get(definition.wyscig.trasa_rywala);
      if (!route || !reached(this.goals.at(-1)!.area, route.path.end))
        throw new Error(
          `Mission ${definition.id}: rival route must end at the finish`,
        );
    }
  }

  private get goalTarget() {
    return this.outcome || this.delayedOutcome
      ? undefined
      : this.goals[this.goalIndex];
  }

  get target() {
    const target = this.goalTarget;
    if (!target || this.goalIndex !== this.goals.length - 1) return target;
    const pending = this.forced.find(({ fired }) => !fired);
    if (!pending) return target;
    if (this.forcedWaypoint?.area !== pending.area)
      this.forcedWaypoint = {
        ...target,
        area: pending.area,
        position: pending.position,
        eventWaypoint: true,
      };
    return this.forcedWaypoint;
  }

  get preparingBike() {
    return this.goalTarget?.goal.typ === 'przygotuj_rower';
  }

  get shakeLevel() {
    return this.definition.przesylka?.delikatna ? this.shocks : undefined;
  }

  canPhotograph(position: Vec2, speed: number) {
    const target = this.target;
    return (
      target?.goal.typ === 'sfotografuj' &&
      speed === 0 &&
      !target.eventWaypoint &&
      reached(target.area, position) &&
      !this.photos.has(target.goal.znak)
    );
  }

  photograph(position: Vec2, speed: number) {
    const goal = this.goalTarget?.goal;
    if (goal?.typ === 'sfotografuj' && this.canPhotograph(position, speed)) {
      this.photos.add(goal.znak);
      return true;
    }
    return false;
  }

  get elapsedSeconds() {
    return this.ticks / TICKS_PER_SECOND;
  }

  get remainingSeconds() {
    const whole = this.definition.limit_s ?? Infinity;
    const stage = this.goalTarget?.goal.limit_s ?? Infinity;
    const remaining = Math.min(
      whole - this.elapsedSeconds,
      stage - (this.goalTicks[this.goalIndex] ?? 0) / TICKS_PER_SECOND,
    );
    return remaining === Infinity ? undefined : Math.max(0, remaining);
  }

  rewindCheckpoint() {
    this.goalIndex = this.checkpoint.goalIndex;
    this.requiredHabitSeen = false;
    this.previousSpeed = 0;
    return this.checkpoint.spawn;
  }

  get result() {
    return this.outcome;
  }

  get points() {
    return this.outcome?.points ?? this.score.points;
  }

  get waitingForQuestion() {
    return this.delayedOutcome !== undefined;
  }

  answerQuestion(points: number) {
    if (this.outcome) return;
    this.score.points += points;
    if (this.delayedOutcome) {
      const outcome = this.delayedOutcome;
      this.delayedOutcome = undefined;
      this.finish(outcome);
    }
  }

  step(
    position: Vec2,
    verdicts: readonly Verdict[],
    startEvent?: (event: ForcedMissionEvent, area: Box) => void,
    forcedPending?: () => boolean,
    equipment?: Equipment,
    speed = 0,
    questionPending = false,
  ): TickEffects | undefined {
    const target = this.goalTarget;
    if (!target) return;

    this.ticks++;
    this.race?.step();
    if (this.shakeLevel !== undefined) {
      const deceleration = this.previousSpeed - speed;
      const cobbles = this.roughSurfaces.some((zone) =>
        contains(zone, position),
      );
      // A crawl over the stones leaves the parcel steady. Sharp stops and curb
      // impacts both produce a larger speed drop than ordinary coasting.
      const vibration = cobbles
        ? Math.max(0, speed - 2.5) / (3 * TICKS_PER_SECOND)
        : 0;
      const jolt = Math.max(0, deceleration - 3.5 / TICKS_PER_SECOND) * 0.07;
      this.shocks = Math.min(1, this.shocks + vibration + jolt);
      this.previousSpeed = speed;
    }
    this.goalTicks[this.goalIndex] = this.goalTicks[this.goalIndex]! + 1;
    let major = false;
    for (const verdict of verdicts) {
      this.verdicts.push(verdict);
      this.score.receive(verdict.kind);
      if (
        verdict.kind === 'good' &&
        verdict.ruleId === target.goal.wymagany_nawyk
      )
        this.requiredHabitSeen = true;
      major ||= verdict.kind === 'major';
    }

    if (this.score.tooManyMajor) {
      this.finish({ status: 'failed', reason: 'major_x3' }, questionPending);
      return;
    }
    if (
      this.failureConditions.has('czas_minal') &&
      this.remainingSeconds === 0
    ) {
      this.finish({ status: 'failed', reason: 'czas_minal' }, questionPending);
      return;
    }
    const atTarget = this.preparingBike
      ? Boolean(equipment?.helmet && equipment.lights)
      : target.goal.typ === 'sfotografuj'
        ? this.photos.has(target.goal.znak)
        : reached(target.area, position);
    const missingHabit =
      atTarget && target.goal.wymagany_nawyk && !this.requiredHabitSeen;
    let effects: TickEffects | undefined;
    for (const forced of this.forced) {
      if (forced.fired || !reached(forced.area, position)) continue;
      forced.fired = true;
      effects ??= {};
      (effects.events ??= []).push(forced.event);
      startEvent?.(forced.event, forced.area);
    }
    if (major || missingHabit) {
      this.goalIndex = this.checkpoint.goalIndex;
      this.requiredHabitSeen = false;
      this.previousSpeed = 0;
      return {
        ...effects,
        respawn: this.checkpoint.spawn,
        ...(missingHabit && {
          missingHabit: { hintKey: target.goal.wskazowka_powrotu },
        }),
      };
    }

    if (
      atTarget &&
      (this.goalIndex < this.goals.length - 1 ||
        (!this.forced.some(({ fired }) => !fired) &&
          !forcedPending?.() &&
          (!this.race || this.race.opponentScore !== undefined)))
    ) {
      this.goalIndex++;
      this.requiredHabitSeen = false;
      if (this.goalIndex === this.goals.length)
        this.finish({ status: 'completed' }, questionPending);
    }

    this.saveCheckpoint(position);
    return effects;
  }

  private saveCheckpoint(position: Vec2) {
    const checkpoint = this.checkpoints[this.nextCheckpoint];
    if (checkpoint && reached(checkpoint, position)) {
      this.checkpoint = {
        spawn: spawnAt(checkpoint),
        goalIndex: this.goalIndex,
      };
      this.nextCheckpoint++;
    } else {
      const previous = this.checkpoints[this.nextCheckpoint - 1];
      if (
        previous &&
        this.goalIndex > this.checkpoint.goalIndex &&
        reached(previous, position)
      )
        this.checkpoint.goalIndex = this.goalIndex;
    }
  }

  private finish(outcome: Outcome, questionPending = false) {
    if (questionPending) {
      this.delayedOutcome = outcome;
      return;
    }
    const score = this.score.result(
      this.definition,
      this.elapsedSeconds,
      outcome.status === 'completed',
      this.shakeLevel,
    );
    const opponent = this.race?.opponentScore;
    if (
      outcome.status === 'completed' &&
      opponent !== undefined &&
      score.points <= opponent
    )
      outcome = { status: 'failed', reason: 'wynik_wyscigu' };
    this.outcome = {
      ...outcome,
      missionId: this.definition.id,
      elapsedSeconds: this.elapsedSeconds,
      par_s: this.definition.par_s,
      goodHabits: this.score.goodHabits,
      verdicts: this.verdicts,
      points: score.points,
      penaltyPoints:
        this.score.minor * this.balance.misja.kara_minor +
        this.score.major * this.balance.misja.kara_major,
      stars: missionStars(
        this.balance.gwiazdki,
        this.definition,
        this.elapsedSeconds,
        outcome.status === 'completed',
        this.score,
      ),
      longestSeries: this.score.longest,
      ...(opponent !== undefined && { opponentScore: opponent }),
      ...(this.shakeLevel !== undefined && {
        shocks: this.shakeLevel,
        smoothBonus: score.smoothBonus,
      }),
      ...(this.photos.size > 0 && { photos: this.photos.size }),
      illegalShortcut: this.verdicts.some(
        ({ kind, ruleId, highlight }) =>
          kind !== 'good' &&
          ruleId === this.shortcutSign?.ruleId &&
          highlight?.signId === this.shortcutSign?.id,
      ),
      timeBonusEligible:
        outcome.status === 'completed' && this.score.major === 0,
    };
  }
}
