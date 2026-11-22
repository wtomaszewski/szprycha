import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  eventIds,
  eventRules,
  TrafficEvents,
  type TrafficEventId,
} from '../../src/gameplay/TrafficEvents';
import { MissionSystem } from '../../src/gameplay/MissionSystem';
import { IntersectionManager } from '../../src/rules/priority/IntersectionManager';
import { RuleEngine } from '../../src/rules/RuleEngine';
import type { EnvState, RiderState } from '../../src/rules/types';
import { WorldModel } from '../../src/rules/world/WorldModel';
import { TrafficParticipants } from '../../src/sim/TrafficParticipants';
import { readContent } from '../../tools/content';

const content = await readContent();
const { balans } = content;
const world = new WorldModel(
  JSON.parse(await readFile('maps/miasteczko.tmj', 'utf8')),
  content.balans.silnik.kafel_m,
);
const env: EnvState = { time: 'day', weather: 'clear', visibilityLow: false };
const rider = (x: number, y: number, speed = 0): RiderState => ({
  id: 'player',
  pos: { x: x * world.metersPerPixel, y: y * world.metersPerPixel },
  helmet: { worn: true, fastened: true },
  heading: 0,
  speed,
  mode: 'riding',
  ageBand: '10to15',
  signal: 'none',
});
const setup = (
  seed = 24,
  random = false,
  weight?: ConstructorParameters<typeof TrafficEvents>[3],
) => {
  const manager = new IntersectionManager(world);
  const traffic = new TrafficParticipants(
    world,
    manager,
    content.balans.silnik,
    seed,
    'mission-only',
  );
  const events = new TrafficEvents(world, traffic, seed, weight, random);
  const rules = new RuleEngine(world, content, manager);
  return { traffic, events, rules };
};
function force(events: TrafficEvents, id: TrafficEventId, player: RiderState) {
  events.force(
    { typ: id, przy: 'site', regula: eventRules[id][0] },
    { id: 'site', ...player.pos, width: 0, height: 0 },
    player,
  );
}

describe('traffic encounters', () => {
  it.each(eventIds)('%s refers only to existing rules', (id) => {
    const known = new Set(content.przepisy.przepisy.map(({ id }) => id));
    expect(eventRules[id].length).toBeGreaterThan(0);
    for (const rule of eventRules[id]) expect(known.has(rule)).toBe(true);
  });

  it.each([
    ['pojazd_uprzywilejowany', 900, 1370, 'emergency'],
    ['pieszy_na_pasach', 750, 600, 'pedestrian'],
    ['tramwaj_bez_wysepki', 1200, 720, 'tram'],
  ] as const)(
    'runs the M3b behavior for %s with ambient traffic disabled',
    (id, x, y, kind) => {
      const { events, traffic } = setup();
      const player = rider(x, y);
      force(events, id, player);
      expect(events.notice?.source).toBe('forced');
      const agent = traffic.routed.find(
        (agent) => agent.kind === kind && agent.active,
      )!;
      expect(agent).toBeDefined();
      expect(traffic.road.agents).toHaveLength(0);
      let tookPart = false;
      for (let tick = 0; tick < 420; tick++) {
        events.step(player);
        traffic.step(env, player);
        tookPart ||= Boolean(
          agent.crossingId ||
          agent.stopId ||
          (agent.signalActive && agent.speed > 0),
        );
      }
      expect(tookPart).toBe(true);
    },
  );

  it('rolls a ball into the rider’s path and detects unsafe approach just once', () => {
    const { events, rules } = setup();
    const player = rider(760, 660, 7);
    force(events, 'pilka_na_jezdni', player);
    const ball = events.props[0]!;
    const start = ball.y;
    for (let tick = 0; tick < 80; tick++) events.step(player);
    expect(ball.y).not.toBe(start);
    player.pos.x = ball.x - 3;
    player.pos.y = ball.y;
    rules.step(player, [], env, events.hazards);
    rules.step(player, [], env, events.hazards);
    expect(
      rules.recent.filter(({ ruleId }) => ruleId === 'MAN-08'),
    ).toHaveLength(1);
    expect(
      rules.recent.find(({ ruleId }) => ruleId === 'MAN-08')?.highlight
        ?.agentId,
    ).toBe('event-ball');
  });

  it('opens and closes a mapped parked car door', () => {
    const { events } = setup();
    const player = rider(968, 1350);
    force(events, 'drzwi_auta', player);
    const door = events.props[1]!;
    const closed = door.heading;
    for (let tick = 0; tick < 31; tick++) events.step(player);
    expect(door.heading - closed).toBeCloseTo(Math.PI / 2);
    for (let tick = 0; tick < 360; tick++) events.step(player);
    expect(door.active).toBe(false);
  });

  it('does not touch the phone until answered, then delegates the rider’s choice to MAN-11', () => {
    for (const speed of [0, 5]) {
      const { events, rules } = setup();
      const player = rider(688, 896, speed);
      force(events, 'telefon_dzwoni', player);
      rules.step(player, [], env);
      expect(rules.recent.some(({ ruleId }) => ruleId === 'MAN-11')).toBe(
        false,
      );
      expect(events.respond(player)).toBe(true);
      rules.step(player, [], env);
      const result = rules.recent.find(({ ruleId }) => ruleId === 'MAN-11');
      expect(result?.kind).toBe(speed ? 'minor' : 'good');
      events.resolvePhoneResponse(result?.kind === 'good', speed > 0, player);
      expect(events.notice?.answered).toBe(true);
    }
  });

  it('lets the rider refuse the lift without taking a passenger', () => {
    const { events } = setup();
    const player = rider(688, 896);
    force(events, 'kolega_podwozka', player);
    expect(events.notice?.id).toBe('kolega_podwozka');
    expect(events.respond(player)).toBe(true);
    expect(events.notice?.answered).toBe(true);
    expect(player.passenger).toBeFalsy();
  });

  it('isolates the wrong-way cyclist from ordinary routes and brakes before the rider', () => {
    const { events, traffic } = setup();
    const player = rider(760, 660);
    expect(events.wrongWayCyclist).toBeUndefined();
    force(events, 'rowerzysta_pod_prad', player);
    let closest = Infinity;
    for (let tick = 0; tick < 350; tick++) {
      events.step(player);
      const cyclist = events.wrongWayCyclist!;
      expect(Math.cos(cyclist.heading)).toBeLessThan(-0.99);
      closest = Math.min(closest, cyclist.pos.x - player.pos.x);
    }
    expect(closest).toBeCloseTo(0.9);
    expect(events.wrongWayCyclist?.speed).toBeCloseTo(0);
    expect(traffic.routed.some(({ active }) => active)).toBe(false);
    for (let tick = 0; tick < 20; tick++) events.step(player);
    expect(events.wrongWayCyclist).toBeUndefined();
  });

  it('uses its seed and accepts an M5 weight indexed by ruleIds', () => {
    const draws = (
      seed: number,
      weight?: ConstructorParameters<typeof TrafficEvents>[3],
    ) => {
      const { events } = setup(seed, true, weight);
      const player = rider(688, 896, 3);
      const sequence: string[] = [];
      let previous;
      for (let tick = 0; tick < 5400; tick++) {
        events.step(player);
        const notice = events.notice;
        if (notice && notice !== previous) sequence.push(notice.id);
        previous = notice;
      }
      return sequence;
    };
    expect(draws(24)).toEqual(draws(24));
    expect(draws(24)).not.toEqual(draws(9834));
    const weighted = draws(24, (ids) => Number(ids.includes('MAN-11')));
    expect(weighted.length).toBeGreaterThan(2);
    expect(new Set(weighted)).toEqual(new Set(['telefon_dzwoni']));
  });

  it('starts the tutorial’s forced event on every new attempt despite zero weights and disabled random traffic', () => {
    const { events } = setup(0, false, () => 0);
    const definition = content.misje.find(({ id }) => id === 'WAW-T-01')!;
    const player = rider(424, 1199);
    for (let attempt = 0; attempt < 2; attempt++) {
      events.reset();
      const mission = new MissionSystem(definition, world, balans);
      const step = () =>
        mission.step(player.pos, [], (event, area) =>
          events.force(event, area, player),
        );
      expect(step()?.events).toEqual(definition.zdarzenia_wymuszone);
      expect(events.notice).toMatchObject({
        id: 'cwiczenie_stop',
        source: 'forced',
      });
      expect(step()?.events).toBeUndefined();
    }
  });

  it('keeps a blocked forced event pending and starts it when the site clears', () => {
    let clear = false;
    const events = new TrafficEvents(
      world,
      { startEventRoute: () => clear },
      0,
      () => 0,
      false,
    );
    const player = rider(900, 1370);
    force(events, 'pojazd_uprzywilejowany', player);
    expect(events.hasPendingForced).toBe(true);
    expect(events.notice).toBeUndefined();
    clear = true;
    events.step(player);
    expect(events.notice?.id).toBe('pojazd_uprzywilejowany');
    expect(events.hasPendingForced).toBe(true);
    for (let tick = 0; tick < 60; tick++) events.step(player);
    expect(events.hasPendingForced).toBe(false);
  });

  it('keeps both prompts when a mission triggers two encounters at once', () => {
    const { events } = setup();
    const player = rider(688, 896);
    force(events, 'telefon_dzwoni', player);
    force(events, 'kolega_podwozka', player);
    expect(events.notice?.id).toBe('telefon_dzwoni');
    expect(events.hasPendingForced).toBe(true);
    for (let tick = 0; tick < 360; tick++) events.step(player);
    expect(events.notice?.id).toBe('kolega_podwozka');
  });

  it('guides riders to outstanding event waypoints before letting the mission finish', () => {
    const { events } = setup();
    const definition = content.misje[0]!;
    const event = { typ: 'telefon_dzwoni', przy: 'workshop', regula: 'MAN-11' };
    const mission = new MissionSystem(
      {
        ...definition,
        cele: [{ typ: 'dojedz', poi: 'tutorial_meta' }],
        zdarzenia_wymuszone: [event],
      },
      world,
      balans,
    );
    const player = rider(424, 1525);
    const step = () =>
      mission.step(
        player.pos,
        [],
        (entry, area) => events.force(entry, area, player),
        () => events.hasPendingForced,
      );
    step();
    expect(mission.result).toBeUndefined();
    expect(mission.target).toMatchObject({
      area: { id: 'workshop' },
      eventWaypoint: true,
    });
    player.pos = rider(688, 896).pos;
    expect(step()?.events).toEqual([event]);
    expect(events.notice?.id).toBe('telefon_dzwoni');
    player.pos = rider(424, 1525).pos;
    step();
    expect(mission.result).toBeUndefined();
    for (let tick = 0; tick < 60; tick++) events.step(player);
    step();
    expect(mission.result?.status).toBe('completed');
  });
});
