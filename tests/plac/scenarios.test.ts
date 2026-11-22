import { beforeAll, describe, expect, it } from 'vitest';
import type { PlacBalance, PlacCourse, PlacId } from '../../src/content/plac';
import type { RiderState } from '../../src/gameplay/bicycle';
import { brakingBox } from '../../src/gameplay/plac/detectors/PLAC-04';
import { figureEight } from '../../src/gameplay/plac/detectors/PLAC-01';
import { narrowTrack } from '../../src/gameplay/plac/detectors/PLAC-03';
import { oneHand } from '../../src/gameplay/plac/detectors/PLAC-06';
import { signalledStart } from '../../src/gameplay/plac/detectors/PLAC-05';
import { slalom } from '../../src/gameplay/plac/detectors/PLAC-02';
import type {
  Fault,
  Grade,
  PlacDetector,
  ReportFault,
} from '../../src/gameplay/plac/detectors/types';
import { PlacRide } from '../../src/gameplay/plac/PlacRide';
import {
  placIds,
  PlacRun,
  scorePlac,
  type PlacResult,
} from '../../src/gameplay/plac/PlacRun';
import { cleanPlacInput } from './clean-course';
import { readContent } from '../../tools/content';

let course: PlacCourse;
let balance: PlacBalance;
let pass: number;
beforeAll(async () => {
  const content = await readContent();
  course = content.plac;
  balance = content.balans.plac;
  pass = content.balans.licencja.plac_prog;
});

const actions = (): RiderState => ({
  looking: false,
  signal: null,
  lights: false,
  bell: false,
});
const drive = { x: 0, y: -1, brake: false, scheme: 'classic' } as const;
const coast = { ...drive, y: 0 };
const brake = { ...coast, brake: true };

function scenario(id: PlacId, setup: (report: ReportFault) => PlacDetector) {
  const { start } = course.exercises[id];
  const faults = new Map<Fault, Exclude<Grade, 'good'>>();
  const detector = setup((fault, grade) => faults.set(fault, grade));
  const previous = { x: start.x, y: start.y };
  return {
    faults,
    step(
      x: number,
      y: number,
      options: {
        signal?: RiderState['signal'];
        looking?: boolean;
        speed?: number;
        footDown?: boolean;
        skidding?: boolean;
      } = {},
    ) {
      const {
        speed = 30,
        signal = null,
        looking = false,
        footDown = false,
        skidding = false,
      } = options;
      const finished = detector.step({
        rider: { x, y, speed, heading: start.heading, walking: false },
        previous,
        actions: { ...actions(), signal, looking },
        footDown,
        skidding,
      });
      Object.assign(previous, { x, y });
      return finished;
    },
  };
}

describe('PLAC-01', () => {
  const exercise = () => course.exercises['PLAC-01'];
  const start = () =>
    scenario('PLAC-01', (report) => figureEight(exercise(), report));
  it('requires both loops in the indicated order', () => {
    const { faults, step } = start();
    const { path } = exercise();
    expect(step(path.at(-1)!.x, path.at(-1)!.y)).toBe(false);
    for (let i = 1; i < path.length; i++)
      expect(step(path[i]!.x, path[i]!.y)).toBe(i === path.length - 1);
    expect(faults.size).toBe(0);
  });
  it('recognizes a support foot, the painted line and a hit cone', () => {
    const { faults, step } = start();
    step(320, 178, { footDown: true });
    step(421, 93);
    expect(faults.get('footDown')).toBe('major');
    expect(faults.get('line')).toBe('minor');
    step(421, 137);
    expect(faults.get('cone')).toBe('minor');
    expect(faults.has('offTrack')).toBe(false);
    step(100, 102);
    expect(faults.get('offTrack')).toBe('major');
  });
});

describe('PLAC-02', () => {
  const exercise = () => course.exercises['PLAC-02'];
  const start = () =>
    scenario('PLAC-02', (report) => slalom(exercise(), report));
  it.each(['clean', 'cone', 'missedCone'] as const)(
    'judges a %s slalom',
    (expected) => {
      const { faults, step } = start();
      const { gates, finishX } = exercise();
      for (const [i, gate] of gates.entries()) {
        const sign = gate.side === 'above' ? -1 : 1;
        const offset =
          i === 2 && expected === 'cone'
            ? 8
            : i === 2 && expected === 'missedCone'
              ? -28
              : 28;
        step(gate.x - 20, gate.y + sign * offset);
        step(gate.x + 19, gate.y + sign * offset);
      }
      expect(step(finishX, exercise().start.y)).toBe(true);
      expect([...faults]).toEqual(
        expected === 'clean'
          ? []
          : [[expected, expected === 'cone' ? 'minor' : 'major']],
      );
    },
  );
});

describe('PLAC-03', () => {
  it.each([
    [0, undefined],
    [12, 'line'],
    [25, 'offTrack'],
  ] as const)('assesses %d px from lane center', (offset, expected) => {
    const exercise = course.exercises['PLAC-03'];
    const { faults, step } = scenario('PLAC-03', (report) =>
      narrowTrack(exercise, report),
    );
    expect(step(exercise.finishX, exercise.start.y + offset)).toBe(true);
    expect([...faults.keys()]).toEqual(expected ? [expected] : []);
  });
});

describe('PLAC-04', () => {
  it.each([
    [468, false, undefined, undefined],
    [432, false, 'shortStop', 'minor'],
    [420, false, 'shortStop', 'major'],
    [503, false, 'longStop', 'minor'],
    [532, false, 'longStop', 'major'],
    [468, true, 'skid', 'minor'],
  ] as const)(
    'judges stopping at x=%d (wheel locked: %s)',
    (x, skidding, expected, grade) => {
      const exercise = course.exercises['PLAC-04'];
      const { faults, step } = scenario('PLAC-04', (report) =>
        brakingBox(exercise, report),
      );
      const { x: startX, y } = exercise.start;
      expect(step(startX, y, { speed: 0 })).toBe(false);
      expect(step(startX + 50, y)).toBe(false);
      expect(step(x - 1, y, { skidding })).toBe(x === 532);
      expect(step(x, y, { speed: 0 })).toBe(true);
      expect([...faults]).toEqual(expected ? [[expected, grade]] : []);
    },
  );
});

describe('PLAC-05', () => {
  it.each(['clean', 'noLook', 'noStartSignal', 'signalOrder'] as const)(
    'judges start: %s',
    (expected) => {
      const exercise = course.exercises['PLAC-05'];
      const { faults, step } = scenario('PLAC-05', (report) =>
        signalledStart(exercise, report),
      );
      const { x, y } = exercise.start;
      step(x, y, {
        speed: 0,
        looking: expected !== 'noLook',
        signal: expected === 'signalOrder' ? 'left' : null,
      });
      step(x, y, {
        speed: 0,
        signal: expected === 'noStartSignal' ? 'right' : 'left',
      });
      step(x + 1, y, {
        signal: expected === 'noStartSignal' ? 'right' : 'left',
      });
      expect(step(exercise.finishX, y)).toBe(true);
      expect([...faults.keys()]).toEqual(
        expected === 'clean'
          ? []
          : expected === 'noLook'
            ? ['noLook', 'signalOrder']
            : [expected],
      );
    },
  );
});

describe('PLAC-06', () => {
  it.each(['clean', 'offTrack', 'noHandSignal', 'line'] as const)(
    'judges one-handed ride: %s',
    (expected) => {
      const exercise = course.exercises['PLAC-06'];
      const { faults, step } = scenario('PLAC-06', (report) =>
        oneHand(exercise, report),
      );
      const { y } = exercise.start;
      step(exercise.signalFromX - 2, y);
      step(
        exercise.signalFromX + 12,
        y + (expected === 'offTrack' ? 31 : expected === 'line' ? 22 : 0),
        {
          signal: expected === 'noHandSignal' ? 'right' : 'left',
        },
      );
      expect(step(exercise.finishX, y, { signal: 'left' })).toBe(true);
      expect([...faults.keys()]).toEqual(
        expected === 'clean' ? [] : [expected],
      );
    },
  );
});

it('integrates the fixed-step bicycle and evaluates a narrow-track run once', () => {
  const run = new PlacRun(course, balance, actions(), ['PLAC-03'], true);
  while (!run.result) run.step(drive);
  expect(run.result).toMatchObject({
    id: 'PLAC-03',
    grade: 'good',
    faults: new Map(),
  });
  const result = run.result;
  for (let tick = 0; tick < 120; tick++) expect(run.step(coast)).toBe(result);
  expect(run.results).toHaveLength(1);
  expect(run.advance()).toBe(false);
});

it('detects low-speed instability, supporting a foot, a locked wheel and one-handed drift', () => {
  const start = course.exercises['PLAC-03'].start;
  const state = actions();
  const ride = new PlacRide(course, start, balance.physics, state);
  ride.step(drive);
  expect(ride.visualHeading).not.toBe(0);
  for (let i = 0; i < 112; i++) ride.step(drive);
  state.signal = 'left';
  const y = ride.rider.y;
  for (let i = 0; i < 8; i++) ride.step(drive);
  expect(ride.rider.y).toBeLessThan(y);
  state.signal = null;
  let locked = false;
  for (let i = 0; i < 90; i++) locked = ride.step(brake).skidding || locked;
  expect(locked).toBe(true);
  for (let i = 0; i < 90; i++) ride.step(brake);
  expect(ride.sample.footDown).toBe(true);
});

it('requires actual braking input even with a zero lock threshold', () => {
  const start = course.exercises['PLAC-03'].start;
  const ride = new PlacRide(
    course,
    start,
    { ...balance.physics, lock_pressure: 0 },
    actions(),
  );
  for (let tick = 0; tick < 120; tick++) ride.step(drive);
  expect(ride.sample.skidding).toBe(false);
  expect(ride.step(brake).skidding).toBe(true);
});

it('awards fractions, checks the 90% boundary and withholds a fast medal after any fault', () => {
  const results: PlacResult[] = placIds.map((id) => ({
    id,
    grade: 'good',
    ticks: 300,
    faults: new Map(),
  }));
  expect(scorePlac(results, balance, pass)).toMatchObject({
    points: 6,
    passed: true,
    clean: true,
    medal: 'gold',
  });
  results[0]!.grade = 'minor';
  const fractional = {
    points: 5.5,
    max: 6,
    passed: true,
    clean: false,
    medal: undefined,
  };
  expect(scorePlac(results, balance, pass)).toMatchObject(fractional);
  results[0]!.grade = 'major';
  expect(scorePlac(results, balance, pass)).toMatchObject({
    points: 5,
    passed: false,
    medal: undefined,
  });
  results[0]!.grade = 'minor';
  const boundary = { ...balance, points: { ...balance.points, minor: 0.4 } };
  expect(scorePlac(results, boundary, pass).passed).toBe(true);
  expect(
    scorePlac(
      results,
      { ...boundary, points: { ...boundary.points, minor: 0.399 } },
      pass,
    ).passed,
  ).toBe(false);
});

it('times out an abandoned element without treating it as a clean ride', () => {
  const run = new PlacRun(course, balance, actions(), ['PLAC-01'], true);
  while (!run.result) run.step(coast);
  expect(run.result.grade).toBe('major');
  expect([...run.result.faults]).toEqual([['timeout', 'major']]);
  expect(scorePlac(run.results, balance, pass).medal).toBeUndefined();
});

it('can drive a clean full course on fixed ticks and reproduce the time and ghost', () => {
  function lap() {
    const state = actions();
    const run = new PlacRun(course, balance, state, placIds, true);
    do {
      state.looking = false;
      state.signal = null;
      while (!run.result) run.step(cleanPlacInput(run, state, course, balance));
    } while (run.advance());
    return {
      summary: scorePlac(run.results, balance, pass),
      faults: run.results.map(({ id, faults }) => [id, [...faults]]),
      ghost: run.ghost,
    };
  }
  const first = lap();
  expect(first.faults).toEqual(placIds.map((id) => [id, []]));
  expect(first.summary).toMatchObject({
    clean: true,
    passed: true,
    medal: expect.any(String),
  });
  expect(lap()).toEqual(first);
});
