import type { MissionDefinition } from '../content/missions';
import type { GameContent } from '../content/schemas';
import { missionScore } from '../progression/missionScore';
import { RuleEngine } from '../rules/RuleEngine';
import {
  TICKS_PER_SECOND,
  type EnvState,
  type RiderState,
  type Verdict,
} from '../rules/types';
import type { WorldModel } from '../rules/world/WorldModel';

const daytime: EnvState = {
  time: 'day',
  weather: 'clear',
  visibilityLow: false,
};

export class MissionRace {
  readonly rider: RiderState;
  private readonly rules: RuleEngine;
  private readonly verdicts: Verdict[] = [];
  private distance = 0;
  private ticks = 0;
  private readonly route: NonNullable<
    ReturnType<WorldModel['raceRoutes']['get']>
  >;
  private readonly shortcutSign?: string;
  opponentScore?: number;

  constructor(
    routeId: string,
    private readonly definition: MissionDefinition,
    world: WorldModel,
    private readonly content: GameContent,
    private readonly scoreCeiling = Infinity,
    opponentId = definition.zleceniodawca,
  ) {
    const route = world.raceRoutes.get(routeId);
    if (!route) throw new Error(`Unknown race route: ${routeId}`);
    this.route = route;
    const shortcut = definition.skrot?.odcinek;
    this.shortcutSign = shortcut
      ? world.signs.find(
          ({ affects, code, displayOnly, exceptBicycles }) =>
            affects === shortcut &&
            (code === 'B-1' || code === 'B-2') &&
            !displayOnly &&
            !exceptBicycles,
        )?.id
      : undefined;
    this.rider = {
      id: opponentId,
      pos: { ...this.route.path.start },
      heading: 0,
      speed: this.route.speed,
      mode: 'riding',
      signal: 'none',
      ageBand: '10to15',
      helmet: { worn: true, fastened: true },
    };
    this.rules = new RuleEngine(world, content);
    this.rules.onVerdict((entry) => this.verdicts.push(entry));
  }

  get opponentVerdicts(): readonly Verdict[] {
    return this.verdicts;
  }

  get distanceTravelled() {
    return this.distance;
  }

  step() {
    if (this.opponentScore !== undefined) return;
    this.ticks++;
    const { path, speed } = this.route;
    this.distance = Math.min(
      path.length,
      this.distance + speed / TICKS_PER_SECOND,
    );
    this.rider.heading = path.place(this.distance, this.rider.pos);
    this.rules.step(this.rider, [], daytime);
    if (this.distance !== path.length) return;

    this.rules.finish();
    const score = missionScore(
      this.content.balans,
      this.definition,
      this.ticks / TICKS_PER_SECOND,
      this.verdicts,
      true,
      undefined,
      !this.verdicts.some(
        ({ kind, highlight }) =>
          kind !== 'good' &&
          highlight?.signId === this.shortcutSign &&
          this.shortcutSign !== undefined,
      ),
    ).points;
    this.opponentScore = Math.min(score, this.scoreCeiling);
    this.rider.speed = 0;
  }
}
