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
  opponentScore?: number;

  constructor(
    routeId: string,
    private readonly definition: MissionDefinition,
    world: WorldModel,
    private readonly content: GameContent,
  ) {
    const route = world.raceRoutes.get(routeId);
    if (!route) throw new Error(`Unknown race route: ${routeId}`);
    this.route = route;
    this.rider = {
      id: definition.zleceniodawca,
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
    this.opponentScore = missionScore(
      this.content.balans,
      this.definition,
      this.ticks / TICKS_PER_SECOND,
      this.verdicts,
      true,
    ).points;
    this.rider.speed = 0;
  }
}
