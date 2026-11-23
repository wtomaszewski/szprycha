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
  boxCenter,
  contains,
  type Box,
  type PointOfInterest,
  type WorldModel,
  type Zone,
} from '../rules/world/WorldModel.ts';

export interface MissionSpawn extends Vec2 {
  heading: number;
}

type Failure =
  | MissionDefinition['warunki_porazki'][number]
  | 'major'
  | 'uwaga_drogowki'
  | 'wstrzasy_paczki'
  | 'wynik_wyscigu';
type Equipment = { helmet: boolean; lights: boolean; vest?: boolean };
type Outcome =
  | { status: 'completed' }
  | { status: 'failed'; reason: Failure; verdict?: Verdict };

export type MissionResult = Outcome & {
  missionId: string;
  elapsedSeconds: number;
  par_s: number;
  goodHabits: number;
  verdicts: readonly Verdict[];
  timeBonusEligible: boolean;
  illegalShortcut: boolean;
  points: number;
  completionPoints: number;
  habitPoints: number;
  penaltyPoints: number;
  questionPoints: number;
  timeBonus: number;
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

function spawnAt(poi: PointOfInterest): MissionSpawn {
  return { ...boxCenter(poi), heading: poi.heading };
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
  private readonly fragileCargo?: { pickup: number; delivery: number };
  private readonly photos = new Set<string>();
  private choice?: { position: Vec2; correct: boolean };
  private readonly evaluatedChoices = new Set<number>();
  private previousSpeed = 0;
  private shocks = 0;
  private readonly failureConditions: ReadonlySet<Failure>;
  private checkpoint: Checkpoint;
  private nextCheckpoint = 0;
  private ticks = 0;
  private goalIndex = 0;
  private requiredHabitSeen = false;
  private readonly score: MissionScore;
  private completionPending = false;
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
    private readonly options: { cleanTimeBonus?: boolean } = {},
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
      return { goal, area, position: boxCenter(area) };
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
      return { event, area, fired: false, position: boxCenter(area) };
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
    if (definition.przesylka?.delikatna) {
      const pickup = definition.cele.findIndex(({ typ }) => typ === 'odbierz');
      const cargo = definition.cele[pickup];
      if (cargo?.typ === 'odbierz') {
        const delivery = definition.cele.findIndex(
          (goal, index) =>
            index > pickup &&
            goal.typ === 'oddaj' &&
            goal.przedmiot === cargo.przedmiot,
        );
        this.fragileCargo = { pickup, delivery };
      }
    }
    if (definition.wyscig) {
      const route = world.raceRoutes?.get(definition.wyscig.trasa_rywala);
      if (!route || !reached(this.goals.at(-1)!.area, route.path.end))
        throw new Error(
          `Mission ${definition.id}: rival route must end at the finish`,
        );
    }
  }

  private get goalTarget() {
    return this.outcome || this.completionPending
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

  get collectibleTarget() {
    const goal = this.goalTarget?.goal;
    return goal?.typ === 'zbierz_krasnala' ||
      goal?.typ === 'zbierz_obwarzanka' ||
      goal?.typ === 'zbierz_bursztyn' ||
      goal?.typ === 'zbierz_szyszke'
      ? goal.poi
      : undefined;
  }

  get preparingBike() {
    return this.goalTarget?.goal.typ === 'przygotuj_rower';
  }

  get preparingVest() {
    const goal = this.goalTarget?.goal;
    return goal?.typ === 'przygotuj_rower' && goal.wymagana_kamizelka === true;
  }

  get pendingChoice() {
    const goal = this.goalTarget?.goal;
    return this.choice && !this.choice.correct && goal?.typ === 'wybor'
      ? goal
      : undefined;
  }

  answerChoice(index: number) {
    const goal = this.pendingChoice;
    const choice = this.choice;
    if (
      !goal ||
      !choice ||
      choice.correct ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= goal.odpowiedzi.length
    )
      return;
    const correct = index === goal.poprawna;
    if (!this.evaluatedChoices.has(this.goalIndex)) {
      this.evaluatedChoices.add(this.goalIndex);
      const kind = correct ? 'good' : 'minor';
      this.score.receive(kind);
      this.verdicts.push({
        kind,
        ruleId: goal.regula,
        at: this.elapsedSeconds,
        pos: choice.position,
        evidence: { answer: index },
        feedbackKey: `przepisy.${goal.regula}.feedback`,
      });
    }
    choice.correct = correct;
    return { correct, ruleId: goal.regula };
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
    this.choice = undefined;
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
    return this.completionPending;
  }

  answerQuestion(points: number) {
    if (this.outcome) return;
    this.score.answerQuestion(points);
    if (this.completionPending) this.finish({ status: 'completed' });
  }

  failControlQuestion(ruleId: string) {
    if (this.outcome) return;
    let verdict: Verdict | undefined;
    for (let index = this.verdicts.length - 1; index >= 0; index--) {
      const entry = this.verdicts[index]!;
      if (entry.ruleId === ruleId && entry.kind !== 'good') {
        verdict = entry;
        break;
      }
    }
    this.finish({ status: 'failed', reason: 'uwaga_drogowki', verdict });
  }

  step(
    position: Vec2,
    verdicts: readonly Verdict[],
    startEvent?: (event: ForcedMissionEvent, area: Box) => void,
    forcedPending?: () => boolean,
    equipment?: Equipment,
    speed = 0,
    questionPending = false,
    collectibleFound = false,
  ): TickEffects | undefined {
    const target = this.goalTarget;
    if (!target) return;

    this.ticks++;
    this.race?.step();
    if (
      this.fragileCargo &&
      this.goalIndex > this.fragileCargo.pickup &&
      this.goalIndex <= this.fragileCargo.delivery
    ) {
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
    let major: Verdict | undefined;
    for (const verdict of verdicts) {
      this.verdicts.push(verdict);
      this.score.receive(verdict.kind);
      if (
        verdict.kind === 'good' &&
        verdict.ruleId === target.goal.wymagany_nawyk
      )
        this.requiredHabitSeen = true;
      if (verdict.kind === 'major') major ??= verdict;
    }

    if (major && this.score.tooManyMajor) {
      this.finish({ status: 'failed', reason: 'major', verdict: major });
      return;
    }
    const violation =
      this.failureConditions.has('dowolny_blad') &&
      verdicts.find(({ kind }) => kind !== 'good');
    if (violation) {
      this.finish({
        status: 'failed',
        reason: 'dowolny_blad',
        verdict: violation,
      });
      return;
    }
    if (
      this.failureConditions.has('czas_minal') &&
      this.remainingSeconds === 0
    ) {
      this.finish({ status: 'failed', reason: 'czas_minal' });
      return;
    }
    if (
      this.shakeLevel !== undefined &&
      this.shakeLevel >= this.balance.misja.prog_wstrzasow_porazka
    ) {
      this.finish({ status: 'failed', reason: 'wstrzasy_paczki' });
      return;
    }
    const atTarget = this.preparingBike
      ? Boolean(
          equipment?.helmet &&
          equipment.lights &&
          (!this.preparingVest || equipment.vest),
        )
      : target.goal.typ === 'sfotografuj'
        ? this.photos.has(target.goal.znak)
        : target.goal.typ === 'wybor'
          ? Boolean(this.choice?.correct)
          : reached(target.area, position) &&
            (!this.collectibleTarget || collectibleFound);
    if (
      target.goal.typ === 'wybor' &&
      speed === 0 &&
      reached(target.area, position)
    )
      this.choice ??= { position: { ...position }, correct: false };
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
      this.choice = undefined;
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
      this.choice = undefined;
      this.requiredHabitSeen = false;
      if (this.goalIndex === this.goals.length) {
        if (questionPending) this.completionPending = true;
        else this.finish({ status: 'completed' });
      }
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

  private finish(outcome: Outcome) {
    this.completionPending = false;
    const illegalShortcut = this.verdicts.some(
      ({ kind, ruleId, highlight }) =>
        kind !== 'good' &&
        ruleId === this.shortcutSign?.ruleId &&
        highlight?.signId === this.shortcutSign?.id,
    );
    const allowsTimeBonus =
      !illegalShortcut &&
      (!this.options.cleanTimeBonus || this.score.minor === 0);
    const { smoothBonus, ...score } = this.score.result(
      this.definition,
      this.elapsedSeconds,
      outcome.status === 'completed',
      this.shakeLevel,
      allowsTimeBonus,
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
      ...score,
      ...(outcome.status === 'failed' && {
        points: 0,
        completionPoints: 0,
        habitPoints: 0,
        questionPoints: 0,
        timeBonus: 0,
      }),
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
        smoothBonus: outcome.status === 'completed' ? smoothBonus : 0,
      }),
      ...(this.photos.size > 0 && { photos: this.photos.size }),
      illegalShortcut,
      timeBonusEligible:
        outcome.status === 'completed' &&
        this.score.major === 0 &&
        allowsTimeBonus,
    };
  }
}
