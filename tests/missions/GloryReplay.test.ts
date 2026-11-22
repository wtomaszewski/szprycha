import { expect, it } from 'vitest';
import { GloryReplay } from '../../src/gameplay/GloryReplay';
import { ReplayBuffer } from '../../src/gameplay/ReplayBuffer';
import { TICKS_PER_SECOND, type Verdict } from '../../src/rules/types';

const at = (tick: number) => tick / TICKS_PER_SECOND;
const verdict = (
  ruleId: string,
  tick: number,
  kind: Verdict['kind'] = 'good',
): Verdict => ({
  ruleId,
  kind,
  at: at(tick),
  pos: { x: tick, y: 0 },
  evidence: {},
  feedbackKey: '',
});

function record(
  events: ReadonlyMap<number, Verdict[]>,
  unsafe: readonly number[] = [],
  checkpoint?: number,
  stops: readonly number[] = [115, 495],
) {
  const buffer = new ReplayBuffer(0);
  const replay = new GloryReplay(buffer, 0.1);
  for (let tick = 0; tick < 600; tick++) {
    if (tick === checkpoint) {
      replay.interrupt(at(tick));
      buffer.clear();
    }
    buffer.record(
      at(tick),
      { time: 'day', weather: 'clear', visibilityLow: false },
      {
        x: tick,
        y: 0,
        heading: 0,
        speed: stops.includes(tick) ? 0 : tick + 1,
        walking: false,
      },
      { signal: null, looking: false, bell: false, lights: false },
      [],
    );
    replay.record(at(tick), events.get(tick) ?? [], unsafe.includes(tick));
  }
  return replay.finish();
}

it('selects the strongest verified habit, breaks repeated ties by the first occurrence and keeps immutable frames', () => {
  const events = new Map([
    [120, [verdict('ZNAK-STOP', 120)]],
    [180, [verdict('PIER-04', 180), verdict('GDZIE-06', 180)]],
    [240, [verdict('PIER-04', 240)]],
    [599, [verdict('GDZIE-07', 599)]],
  ]);
  const clip = record(events)!;
  expect(clip).toEqual(record(events));
  expect(clip).toEqual(
    record(new Map([...events].map(([tick, v]) => [tick, [...v].reverse()]))),
  );
  expect(clip.verdict).toBe(events.get(180)![0]);
  expect(clip.frames.map(({ rider }) => rider.x)).toEqual(
    Array.from({ length: 121 }, (_, index) => index + 60),
  );
});

it.each(['minor', 'major'] as const)(
  'rejects a %s before, on or shortly after the celebrated action',
  (kind) => {
    for (const tick of [145, 200, 300]) {
      const events = new Map([[200, [verdict('PIER-04', 200)]]]);
      events.set(tick, [
        ...(events.get(tick) ?? []),
        verdict('ZNAK-STOP', tick, kind),
      ]);
      expect(record(events)).toBeUndefined();
    }
  },
);

it('drops clips with a collision, recovery, or an error reported late and allows a later clean action', () => {
  const incident = new Map([[200, [verdict('PIER-04', 200)]]]);
  expect(record(incident, [201])).toBeUndefined();
  expect(record(incident, [], 205)).toBeUndefined();
  incident.set(550, [verdict('MAN-01', 195, 'minor')]);
  expect(record(incident)).toBeUndefined();
  incident.delete(550);
  incident.set(500, [verdict('ZNAK-STOP', 500)]);
  expect(record(incident, [201], 205)?.verdict.ruleId).toBe('ZNAK-STOP');
});

it('offers no clip for an empty ride or an unsupported good verdict, including speed', () => {
  expect(record(new Map())).toBeUndefined();
  expect(record(new Map([[200, [verdict('GDZIE-07', 200)]]]))).toBeUndefined();
});

it('keeps a frame of the actual stop and omits a stop outside the recorded clip', () => {
  const events = new Map([[500, [verdict('ZNAK-STOP', 500)]]]);
  const clip = record(events)!;
  expect(clip.frames[clip.stillIndex]?.rider).toMatchObject({
    x: 495,
    speed: 0,
  });
  expect(record(events, [], undefined, [115])).toBeUndefined();
});
