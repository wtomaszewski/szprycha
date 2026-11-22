import { readdirSync, readFileSync } from 'node:fs';
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
  inputs?: (Partial<Omit<AgentState, 'pos' | 'heading'>> & {
    t: number;
    x?: number;
    y?: number;
    heading?: number;
  })[];
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
  objects?: Record<
    string,
    {
      name: string;
      x: number;
      y: number;
      width?: number;
      height?: number;
      properties: Record<string, unknown>;
    }[]
  >;
  expect: Record<string, Verdict['kind'][]>;
  evidence?: Record<string, Verdict['evidence']>;
}
const files = readdirSync('tests/rules')
  .filter((name) => name.endsWith('.yaml'))
  .map((name) => ({
    name,
    ...(parse(readFileSync(`tests/rules/${name}`, 'utf8')) as {
      map: string;
      scenarios: Scenario[];
    }),
  }));
const mapText = readFileSync(files[0]!.map, 'utf8');
const scenarios = files.flatMap(({ scenarios }) => scenarios);
const content = await buildContent();
const goodHabitRules = new Set(
  content.przepisy.przepisy
    .filter((rule) => rule.dobry_nawyk)
    .map((rule) => rule.id),
);
// Allowed habits from docs/07 §6.
const simGood = new Set([
  'MAN-01',
  'MAN-03',
  'MAN-04',
  'MAN-06',
  'MAN-07',
  'MAN-11',
  'PIER-01',
  'PIER-02',
  'PIER-03',
  'PIER-04',
  'PIER-05',
  'PIER-06',
  'PIER-07',
  'PIER-08',
  'PIER-09',
  'ZNAK-STOP',
  'ZNAK-S2',
  'SYG-01',
  'GDZIE-01',
  'GDZIE-05',
  'GDZIE-06',
  'MSC-02',
  'MSC-03',
  'MSC-04',
  'WYP-04',
  'WYP-06',
]);
const envDefaults: EnvState = {
  time: 'day',
  weather: 'clear',
  visibilityLow: false,
};

function makeWorld(
  properties: Scenario['properties'] = {},
  objects: Scenario['objects'] = {},
) {
  const data = JSON.parse(mapText) as {
    layers: {
      name: string;
      objects?: {
        name: string;
        x: number;
        y: number;
        width: number;
        height: number;
        properties: { name: string; value: unknown }[];
      }[];
    }[];
  };
  for (const [name, entries] of Object.entries(objects)) {
    const layer = data.layers.find((layer) => layer.name === name);
    if (!layer?.objects) throw new Error(`Unknown object layer: ${name}`);
    layer.objects.push(
      ...entries.map(({ properties, ...object }) => ({
        width: 0,
        height: 0,
        ...object,
        properties: Object.entries(properties).map(([name, value]) => ({
          name,
          value,
        })),
      })),
    );
  }
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
  return new WorldModel(data, content.balans.silnik.kafel_m);
}

const baseWorld = makeWorld();

function run(scenario: Scenario, ruleContent = content) {
  const world =
    scenario.properties || scenario.objects
      ? makeWorld(scenario.properties, scenario.objects)
      : baseWorld;
  const engine = new RuleEngine(world, ruleContent);
  const received: Verdict[] = [];
  engine.onVerdict((verdict) => received.push(verdict));
  const agents = (scenario.agents ?? []).map(({ inputs, leaveAt, ...base }) => {
    const frames = [{ t: 0, ...base }];
    for (const input of inputs ?? [])
      frames.push({ ...frames.at(-1)!, ...input });
    return { leaveAt, frames };
  });
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
        shoulderCheck: current.shoulderCheck,
        lights: current.lights,
        reflectiveVest: current.reflectiveVest,
        handsOnBar: current.handsOnBar,
        feetOnPedals: current.feetOnPedals,
        holdingVehicle: current.holdingVehicle,
        passenger: current.passenger,
        phoneInHand: current.phoneInHand,
        adultSupervisor: current.adultSupervisor,
        supervisedChildId: current.supervisedChildId,
      },
      agents.flatMap(({ leaveAt, frames }) => {
        if (leaveAt !== undefined && t >= leaveAt) return [];
        const nextIndex = frames.findIndex((frame) => frame.t > t);
        const next = frames[nextIndex];
        const current =
          frames[nextIndex === -1 ? frames.length - 1 : nextIndex - 1]!;
        const mix = next ? (t - current.t) / (next.t - current.t) : 0;
        return [
          {
            ...current,
            pos: {
              x:
                (current.x + ((next?.x ?? current.x) - current.x) * mix) *
                world.metersPerPixel,
              y:
                (current.y + ((next?.y ?? current.y) - current.y) * mix) *
                world.metersPerPixel,
            },
            speed: current.speed ?? 0,
            heading: ((current.heading ?? 0) * Math.PI) / 180,
          },
        ];
      }),
      {
        ...envDefaults,
        ...scenario.env,
        signalOverrides: phase
          ? { ...scenario.env?.signalOverrides, 'lights-S': phase }
          : scenario.env?.signalOverrides,
      },
    );
  }
  engine.finish();
  return received;
}

for (const file of files)
  describe(file.name, () => {
    for (const scenario of file.scenarios) {
      it(scenario.name, () => {
        const verdicts = run(scenario);
        for (const verdict of verdicts) {
          if (verdict.kind === 'good') {
            expect(goodHabitRules.has(verdict.ruleId), verdict.ruleId).toBe(
              true,
            );
            expect(simGood.has(verdict.ruleId), verdict.ruleId).toBe(true);
          }
        }
        for (const [rule, kinds] of Object.entries(scenario.expect)) {
          expect(
            verdicts.filter((v) => v.ruleId === rule).map((v) => v.kind),
          ).toEqual(kinds);
        }
        for (const [rule, evidence] of Object.entries(
          scenario.evidence ?? {},
        )) {
          expect(
            verdicts.find((v) => v.ruleId === rule)?.evidence,
          ).toMatchObject(evidence);
        }
      });
    }
  });

it('takes the weight of ZNAK-B1 from the rules content', () => {
  const scenario = scenarios.find(({ name }) =>
    name.startsWith('ZNAK-B1 zakaz dotyczy roweru'),
  )!;
  const modifiedContent = {
    ...content,
    przepisy: {
      ...content.przepisy,
      przepisy: content.przepisy.przepisy.map((rule) =>
        rule.id === 'ZNAK-B1'
          ? { ...rule, waga_bledu: 'major' as const }
          : rule,
      ),
    },
  };
  const kinds = run(scenario, modifiedContent)
    .filter(({ ruleId }) => ruleId === 'ZNAK-B1')
    .map(({ kind }) => kind);
  expect(kinds).toEqual(['major']);
});

it('replays identical simulation input logs with identical verdicts and evidence', () => {
  for (const scenario of scenarios)
    expect(run(scenario)).toEqual(run(scenario));
  const world = makeWorld();
  const replay = () => {
    const engine = new RuleEngine(world, content);
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

it('tells the rider when to wait before the railway crossing', () => {
  const rule = content.przepisy.przepisy.find(({ id }) => id === 'MSC-01');
  expect(rule?.feedback).toBe(
    'Gdy migają czerwone światła, dzwoni sygnał lub zapory się ruszają, stój przed torami, a przez tory przejedź bez zatrzymywania.',
  );
});

it('states both MAN-12 prohibitions in the rider feedback', () => {
  const rule = content.przepisy.przepisy.find(({ id }) => id === 'MAN-12');
  expect(rule?.feedback).toBe(
    'Nie wyprzedzaj na przejściu, przejeździe, skrzyżowaniu bez świateł ani przed torami i nie omijaj auta, które stoi, by przepuścić pieszych.',
  );
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
      expect(rule!.feedback.replace(/(?<=\d)[.,](?=\d)/gu, '')).toMatch(
        /^[^.!?]+[.!?]$/u,
      );
      expect(rule!.feedback.length).toBeLessThanOrEqual(140);
    }
  }
  expect(rules.get('WYP-06')?.waga_bledu).toBeNull();
});
