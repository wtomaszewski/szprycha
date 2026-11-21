import type {
  ForcedMissionEvent,
  MissionDefinition,
  MissionGoal,
} from '../content/missions.ts';
import { TICKS_PER_SECOND, type Vec2, type Verdict } from '../rules/types.ts';
import {
  contains,
  type Box,
  type PointOfInterest,
  type WorldModel,
} from '../rules/world/WorldModel.ts';

export interface MissionSpawn extends Vec2 {
  heading: number;
}

type Failure = MissionDefinition['warunki_porazki'][number];
type Outcome = { status: 'completed' } | { status: 'failed'; reason: Failure };

export type MissionResult = Outcome & {
  missionId: string;
  elapsedSeconds: number;
  par_s: number;
  goodHabits: number;
  verdicts: readonly Verdict[];
  timeBonusEligible: boolean;
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
  private readonly failureConditions: ReadonlySet<Failure>;
  private checkpoint: Checkpoint;
  private nextCheckpoint = 0;
  private ticks = 0;
  private goalIndex = 0;
  private requiredHabitSeen = false;
  private goodHabits = 0;
  private majorCount = 0;
  private outcome?: MissionResult;

  constructor(
    readonly definition: MissionDefinition,
    world: Pick<WorldModel, 'pois' | 'zones' | 'triggers'>,
    private readonly majorLimit = 3,
  ) {
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
      if (goal.poi) area = poi(goal.poi);
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
  }

  private get goalTarget() {
    return this.outcome ? undefined : this.goals[this.goalIndex];
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
    return this.checkpoint.spawn;
  }

  get result() {
    return this.outcome;
  }

  step(
    position: Vec2,
    verdicts: readonly Verdict[],
    startEvent?: (event: ForcedMissionEvent, area: Box) => void,
    forcedPending?: () => boolean,
  ): TickEffects | undefined {
    const target = this.goalTarget;
    if (!target) return;

    this.ticks++;
    this.goalTicks[this.goalIndex] = this.goalTicks[this.goalIndex]! + 1;
    let major = false;
    for (const verdict of verdicts) {
      this.verdicts.push(verdict);
      if (verdict.kind === 'good') {
        this.goodHabits++;
        if (verdict.ruleId === target.goal.wymagany_nawyk)
          this.requiredHabitSeen = true;
      }
      if (verdict.kind === 'major') {
        major = true;
        this.majorCount++;
      }
    }

    if (
      this.failureConditions.has('major_x3') &&
      this.majorCount >= this.majorLimit
    ) {
      this.finish({ status: 'failed', reason: 'major_x3' });
      return;
    }
    if (
      this.failureConditions.has('czas_minal') &&
      this.remainingSeconds === 0
    ) {
      this.finish({ status: 'failed', reason: 'czas_minal' });
      return;
    }
    const atTarget = reached(target.area, position);
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
        (!this.forced.some(({ fired }) => !fired) && !forcedPending?.()))
    ) {
      this.goalIndex++;
      this.requiredHabitSeen = false;
      if (this.goalIndex === this.goals.length)
        this.finish({ status: 'completed' });
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
    this.outcome = {
      ...outcome,
      missionId: this.definition.id,
      elapsedSeconds: this.elapsedSeconds,
      par_s: this.definition.par_s,
      goodHabits: this.goodHabits,
      verdicts: this.verdicts,
      timeBonusEligible:
        outcome.status === 'completed' && this.majorCount === 0,
    };
  }
}
