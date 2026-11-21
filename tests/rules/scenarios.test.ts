import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { buildContent } from '../../tools/content';
import {
  FIXED_STEP,
  stepRider,
  type DriveInput,
  type Rider,
} from '../../src/gameplay/bicycle';
import { preferVerdict } from '../../src/rules/deduplication';
import { RuleEngine } from '../../src/rules/RuleEngine';
import { WorldModel } from '../../src/rules/world/WorldModel';
import type {
  AgentState,
  EnvState,
  RiderState,
  SignalPhase,
  Verdict,
} from '../../src/rules/types';

interface Sample extends Omit<Partial<RiderState>, 'pos' | 'helmet'> {
  x?: number;
  y?: number;
  helmet?: 'fastened' | 'loose' | 'absent';
  phase?: SignalPhase;
}
interface Agent extends Omit<AgentState, 'pos' | 'heading' | 'speed'> {
  x: number;
  y: number;
  heading?: number;
  speed?: number;
  leaveAt?: number;
}
interface Scenario {
  name: string;
  duration?: number;
  player: Sample;
  inputs?: (Sample & { t: number })[];
  agents?: Agent[];
  interpolate?: boolean;
  env?: Partial<EnvState> & { phase?: SignalPhase };
  properties?: Record<string, Record<string, unknown>>;
  expect: Record<string, Verdict['kind'][]>;
  evidence?: Record<string, Verdict['evidence']>;
}
const { map, scenarios } = parse(
  readFileSync('tests/rules/m2.yaml', 'utf8'),
) as {
  map: string;
  scenarios: Scenario[];
};
const mapText = readFileSync(map, 'utf8');
const content = await buildContent();
const engineOptions = content.balans;
const goodHabitRules = new Set(
  content.przepisy.przepisy
    .filter((rule) => rule.dobry_nawyk)
    .map((rule) => rule.id),
);
const envDefaults: EnvState = {
  time: 'day',
  weather: 'clear',
  visibilityLow: false,
};

function makeWorld(properties: Scenario['properties'] = {}) {
  const data = JSON.parse(mapText) as {
    layers: {
      objects?: {
        name: string;
        properties: { name: string; value: unknown }[];
      }[];
    }[];
  };
  for (const layer of data.layers) {
    for (const object of layer.objects ?? []) {
      for (const [name, value] of Object.entries(
        properties[object.name] ?? {},
      )) {
        const property = object.properties.find((entry) => entry.name === name);
        if (property) property.value = value;
        else object.properties.push({ name, value });
      }
    }
  }
  return new WorldModel(data, engineOptions.silnik.kafel_m);
}

function run(scenario: Scenario) {
  const world = makeWorld(scenario.properties);
  const engine = new RuleEngine(world, engineOptions);
  const received: Verdict[] = [];
  engine.onVerdict((verdict) => received.push(verdict));
  const agents = (scenario.agents ?? []).map(
    ({ x, y, heading = 0, speed = 0, ...rest }) => ({
      ...rest,
      pos: { x: x * world.metersPerPixel, y: y * world.metersPerPixel },
      heading: (heading * Math.PI) / 180,
      speed,
    }),
  );
  const frames = [{ t: 0, ...scenario.player }];
  for (const input of scenario.inputs ?? [])
    frames.push({ ...frames.at(-1), ...input });
  let index = 0;
  for (
    let tick = 0;
    tick <= Math.round((scenario.duration ?? 1) / FIXED_STEP);
    tick++
  ) {
    const t = tick * FIXED_STEP;
    while (frames[index + 1] && frames[index + 1]!.t <= t) index++;
    const current = frames[index]!;
    const next = frames[index + 1];
    const mix =
      next && scenario.interpolate !== false
        ? (t - current.t) / (next.t - current.t)
        : 0;
    const x = current.x ?? 100;
    const y = current.y ?? 100;
    const phase = current.phase ?? scenario.env?.phase;
    engine.step(
      {
        id: 'player',
        pos: {
          x: (x + ((next?.x ?? x) - x) * mix) * world.metersPerPixel,
          y: (y + ((next?.y ?? y) - y) * mix) * world.metersPerPixel,
        },
        heading: ((current.heading ?? 0) * Math.PI) / 180,
        speed: current.speed ?? 0,
        ageBand: current.ageBand ?? '10to15',
        mode: current.mode ?? 'riding',
        signal: current.signal ?? 'none',
        helmet: {
          worn: current.helmet !== 'absent',
          fastened: current.helmet !== 'absent' && current.helmet !== 'loose',
        },
        maneuver: current.maneuver,
        extraReflectors: current.extraReflectors,
        adultSupervisor: current.adultSupervisor,
        supervisedChildId: current.supervisedChildId,
      },
      agents.filter(
        (agent) => agent.leaveAt === undefined || t < agent.leaveAt,
      ),
      {
        ...envDefaults,
        ...scenario.env,
        signalOverrides: phase ? { 'lights-S': phase } : undefined,
      },
    );
  }
  engine.finish();
  return received;
}

describe('M2 – scenariusze YAML', () => {
  for (const scenario of scenarios) {
    it(scenario.name, () => {
      const verdicts = run(scenario);
      for (const verdict of verdicts) {
        if (verdict.kind === 'good')
          expect(goodHabitRules.has(verdict.ruleId), verdict.ruleId).toBe(true);
      }
      for (const [rule, kinds] of Object.entries(scenario.expect)) {
        expect(
          verdicts.filter((v) => v.ruleId === rule).map((v) => v.kind),
        ).toEqual(kinds);
      }
      for (const [rule, evidence] of Object.entries(scenario.evidence ?? {})) {
        expect(verdicts.find((v) => v.ruleId === rule)?.evidence).toMatchObject(
          evidence,
        );
      }
    });
  }
});

it('replays identical simulation input logs with identical verdicts and evidence', () => {
  for (const scenario of scenarios)
    expect(run(scenario)).toEqual(run(scenario));
  const world = makeWorld();
  const replay = () => {
    const engine = new RuleEngine(world, engineOptions);
    const rider: Rider = {
      x: 528,
      y: 1120,
      speed: 0,
      heading: -Math.PI / 2,
      walking: false,
    };
    const log: DriveInput[] = Array.from({ length: 270 }, (_, tick) => ({
      x: 0,
      y: tick < 245 ? -1 : 0,
      brake: tick >= 245,
      scheme: 'classic',
    }));
    const verdicts: Verdict[] = [];
    engine.onVerdict((verdict) => verdicts.push(verdict));
    for (const input of log) {
      stepRider(rider, input, [], 2560, 1920);
      engine.step(
        {
          id: 'player',
          pos: {
            x: rider.x * world.metersPerPixel,
            y: rider.y * world.metersPerPixel,
          },
          heading: rider.heading,
          speed: rider.speed * world.metersPerPixel,
          mode: 'riding',
          signal: 'none',
          helmet: { worn: true, fastened: true },
          ageBand: '10to15',
        },
        [],
        envDefaults,
      );
    }
    return verdicts;
  };
  const first = replay();
  expect(first.some((v) => v.ruleId === 'GDZIE-01' && v.kind === 'minor')).toBe(
    true,
  );
  expect(replay()).toEqual(first);
});

it('orders every documented overlap by severity and then the table', () => {
  const candidate = (ruleId: string, kind: Verdict['kind']): Verdict => ({
    ruleId,
    kind,
    at: 0,
    pos: { x: 0, y: 0 },
    evidence: {},
    feedbackKey: '',
  });
  for (const [winner, ...others] of [
    ['GDZIE-09', 'ZNAK-B9'],
    ['MSC-03', 'PIER-06'],
    ['MSC-04', 'WYP-04', 'WYP-05'],
    ['ZNAK-STOP', 'PIER-02', 'ZNAK-A7'],
  ] as const) {
    for (const other of others) {
      expect(
        preferVerdict(candidate(other, 'minor'), candidate(winner, 'minor'))
          ?.ruleId,
      ).toBe(winner);
      expect(
        preferVerdict(candidate(winner, 'minor'), candidate(other, 'major'))
          ?.ruleId,
      ).toBe(other);
    }
  }
});

it('loads all M2 road features from the reproducible training map', () => {
  const world = makeWorld();
  expect(world.zones).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ kind: 'bike_path' }),
      expect.objectContaining({ kind: 'sidewalk', width_m: 3, speedLimit: 60 }),
      expect.objectContaining({
        kind: 'sidewalk',
        width_m: 1.5,
        speedLimit: 50,
      }),
    ]),
  );
  expect(
    world.lanes.some((lane) => lane.parallelBikeInfra === 'ddr-west'),
  ).toBe(true);
  expect(world.intersections.map((junction) => junction.kind)).toEqual(
    expect.arrayContaining(['equal', 'priority', 'signals']),
  );
  expect(world.signs.map((sign) => sign.code)).toEqual(
    expect.arrayContaining(['A-7', 'B-20']),
  );
  expect(world.signals.map((signal) => signal.code)).toEqual(
    expect.arrayContaining(['S-1', 'S-2']),
  );
  expect(world.crossings.map((crossing) => crossing.kind)).toEqual(
    expect.arrayContaining(['pedestrian', 'bike']),
  );
  const south = world.getLane('lights-S')!;
  expect(
    [0, 7, 9, 13, 16, 20].map((time) => world.phase(south, time, envDefaults)),
  ).toEqual(['green', 'yellow', 'red', 'arrow', 'red', 'green']);
});

it('keeps emitted feedback to one sentence and bonus-only rules without a penalty', () => {
  const rules = new Map(
    content.przepisy.przepisy.map((rule) => [rule.id, rule]),
  );
  for (const scenario of scenarios) {
    for (const verdict of run(scenario)) {
      const rule = rules.get(verdict.ruleId);
      expect(rule).toBeDefined();
      if (verdict.kind === 'good') continue;
      expect(rule!.waga_bledu).not.toBeNull();
      expect(rule!.feedback).toMatch(/^[^.!?]+[.!?]$/u);
      expect(rule!.feedback.length).toBeLessThanOrEqual(140);
    }
  }
  expect(rules.get('WYP-06')?.waga_bledu).toBeNull();
});
