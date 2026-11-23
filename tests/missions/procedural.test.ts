import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { missionCity } from '../../src/content/missions';
import { translate } from '../../src/core/presentation';
import type { ProgressProfile } from '../../src/core/progressStore';
import { MissionRace } from '../../src/gameplay/MissionRace';
import { clientPosition } from '../../src/gameplay/procedural/clientPosition';
import { MissionSystem } from '../../src/gameplay/MissionSystem';
import {
  DailyOrderGenerator,
  dailyRivalScoreLimit,
  orderKinds,
  type DailyOrder,
} from '../../src/gameplay/procedural/orders';
import { RouteCatalog } from '../../src/gameplay/procedural/RouteCatalog';
import {
  poiCentre,
  validateRoute,
} from '../../src/gameplay/procedural/validateRoute';
import { WorldModel } from '../../src/rules/world/WorldModel';
import { buildContent } from '../../tools/content';

const content = await buildContent();

describe.each(missionCity.options)('procedural orders in %s', (city) => {
  const world = new WorldModel(
    JSON.parse(readFileSync(`maps/${city}.tmj`, 'utf8')),
    content.balans.silnik.kafel_m,
  );
  let catalog: RouteCatalog;
  let generator: DailyOrderGenerator;
  beforeAll(() => {
    catalog = new RouteCatalog(city, world, content);
    generator = new DailyOrderGenerator(city, catalog, content);
  }, 20_000);

  it('generates varied, deterministic orders with a legal solution for 1,000 seeds', () => {
    const routes = new Set<string>();
    const kinds = new Set<string>();
    const modules = new Set<string>();
    const checked = new Set<string>();
    const clientsByPoi = new Map<string, DailyOrder['client']>();
    const modulesByRule = new Map(
      content.przepisy.przepisy.map(({ id, modul }) => [id, modul]),
    );
    for (let seed = 0; seed < 1_000; seed++) {
      const orders = generator.generate(seed, {});
      expect(orders).toHaveLength(3);
      expect(new Set(orders.map(({ kind }) => kind)).size).toBe(3);
      for (const order of orders) {
        const { client, definition, kind, route, text } = order;
        const start = route.steps[0]!.poi;
        expect(definition.zleceniodawca).toBe(client.id);
        const previousClient = clientsByPoi.get(start.id);
        if (previousClient) expect(client).toEqual(previousClient);
        else {
          clientsByPoi.set(start.id, client);
          expect(order.clientPosition).toEqual(clientPosition(world, start));
        }
        expect(
          translate(`procedural.dialogue.start.${kind}`, text),
        ).not.toMatch(/\{|procedural\./);
        routes.add(route.id);
        kinds.add(kind);
        for (const id of definition.reguly_cwiczone)
          modules.add(modulesByRule.get(id)!);
        expect(translate(definition.opis!, text)).not.toMatch(
          /\{|procedural\./,
        );
        expect(definition.start.poi).toBe(route.steps[0]?.poi.id);
        if (definition.limit_s)
          expect(route.proof.seconds).toBeLessThan(definition.limit_s);
        const key = `${route.id}/${definition.start.noc ?? false}`;
        if (!checked.has(key)) {
          expect(
            validateRoute(world, content, route.steps, definition.start.noc),
            route.id,
          ).toEqual(route.proof);
          checked.add(key);
        }
      }
      if (seed % 100 === 0)
        expect(generator.generate(seed, {})).toEqual(orders);
    }
    expect(kinds).toEqual(new Set(orderKinds));
    expect(routes.size).toBeGreaterThan(30);
    expect(clientsByPoi.size).toBeGreaterThan(10);
    expect(modules).toEqual(
      new Set(['M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07']),
    );
  }, 35_000);

  it('finds a safe client position for every certified start', () => {
    for (const { steps } of [...catalog.routes, ...catalog.nightRoutes]) {
      const poi = steps[0]!.poi;
      expect(catalog.clientPositions[poi.id], poi.id).toBeDefined();
    }
  });

  it('prioritizes first aid when PP-01 has the weakest rule and module mastery', () => {
    const mastery: ProgressProfile['mastery'] = Object.fromEntries(
      content.przepisy.przepisy.map(({ id, modul }) => [
        id,
        {
          value: id === 'PP-01' ? 0 : modul === 'M07' ? 25 : 100,
          goodToday: 0,
        },
      ]),
    );
    const [order] = generator.generate(72619, mastery);
    expect(order?.definition.reguly_cwiczone).toEqual(['PP-01']);
    expect(order?.question?.przepisy).toContain('PP-01');
  });

  it('can finish every objective type using the existing mission system', () => {
    const samples = new Map<string, DailyOrder>();
    for (let seed = 0; samples.size < orderKinds.length && seed < 120; seed++)
      for (const order of generator.generate(seed, {}))
        samples.set(order.kind, order);
    for (const kind of orderKinds) {
      const sample = samples.get(kind)!;
      const { definition, question, route } = sample;
      const race =
        definition.wyscig &&
        new MissionRace(
          definition.wyscig.trasa_rywala,
          definition,
          world,
          content,
          dailyRivalScoreLimit(content.balans.misja),
          'turbo',
        );
      const mission = new MissionSystem(
        definition,
        {
          ...world,
          pois: new Map([
            ...world.pois,
            ...route.steps.map(({ poi }) => [poi.id, poi] as const),
          ]),
        },
        content.balans,
        race,
      );
      const equipment = { helmet: true, lights: true };
      for (const step of route.steps) {
        const position = poiCentre(step.poi);
        for (
          let i = 0;
          i < definition.cele.length + 1 && !mission.result;
          i++
        ) {
          if (mission.pendingChoice) mission.answerChoice(question!.poprawna);
          if (mission.canPhotograph(position, 0))
            mission.photograph(position, 0);
          mission.step(position, [], undefined, undefined, equipment);
        }
      }
      const finish = poiCentre(route.steps.at(-1)!.poi);
      for (
        let tick = 0;
        race && !mission.result && tick < (definition.limit_s ?? 0) * 60;
        tick++
      )
        mission.step(finish, [], undefined, undefined, equipment);
      expect(mission.result?.status, kind).toBe('completed');
      if (kind === 'photo') expect(mission.result?.photos).toBe(1);
      if (race)
        expect(mission.result!.points).toBeGreaterThan(race.opponentScore!);
    }
  });

  it('covers the situations from the city coverage report', () => {
    const coverage = new Set(
      [...catalog.routes, ...catalog.nightRoutes].flatMap(({ rules }) => rules),
    );
    // Equal junction, priority and STOP, three signal types, roundabout,
    // tram stop, cycle infrastructure and crossing, calm zone, driveway
    // exit, railway, shoulder and ban, contraflow, and night riding.
    expect([...coverage]).toEqual(
      expect.arrayContaining([
        'PIER-01',
        'PIER-02',
        'ZNAK-STOP',
        'SYG-01',
        'ZNAK-S2',
        'SYG-02',
        'PIER-08',
        'MSC-02',
        'GDZIE-01',
        'GDZIE-02',
        'GDZIE-11',
        'PIER-05',
        'GDZIE-07',
        'MSC-03',
        'MSC-01',
        'GDZIE-03b',
        'ZNAK-B9',
        'ZNAK-B2T22',
        'MSC-04',
      ]),
    );
  });

  it('cannot win a daily race by using a signed shortcut', () => {
    const race = catalog.routes.find((route) => route.race)!;
    const order = new DailyOrderGenerator(
      city,
      { ...catalog, routes: [race], nightRoutes: [] },
      content,
    ).generate(0, {})[0]!;
    const { definition, route } = order;
    expect(definition.warunki_porazki).toContain('dowolny_blad');
    if (!definition.skrot) return;
    const sign = world.signs.find(
      ({ affects }) => affects === definition.skrot!.odcinek,
    )!;
    const mission = new MissionSystem(
      definition,
      {
        ...world,
        pois: new Map([
          ...world.pois,
          ...route.steps.map(({ poi }) => [poi.id, poi] as const),
        ]),
      },
      content.balans,
    );
    mission.step(mission.start, [
      {
        ruleId: sign.code === 'B-1' ? 'ZNAK-B1' : 'ZNAK-B2T22',
        kind: 'minor',
        at: 0,
        pos: mission.start,
        evidence: {},
        feedbackKey: 'shortcut',
        highlight: { signId: sign.id },
      },
    ]);
    expect(mission.result).toMatchObject({
      status: 'failed',
      illegalShortcut: true,
      timeBonus: 0,
    });
  });

  it('withholds the daily time bonus after an unmarked traffic violation', () => {
    const route = catalog.routes.find(({ race }) => !race)!;
    const [order] = new DailyOrderGenerator(
      city,
      { ...catalog, routes: [route], nightRoutes: [] },
      content,
    ).generate(0, {});
    const start = route.steps[0]!.poi;
    const finish = route.steps.at(-1)!.poi;
    const mission = new MissionSystem(
      {
        ...order!.definition,
        cele: [{ typ: 'dojedz', poi: finish.id }],
      },
      {
        ...world,
        pois: new Map([
          [start.id, start],
          [finish.id, finish],
        ]),
      },
      content.balans,
      undefined,
      0,
      { cleanTimeBonus: true },
    );
    const pos = poiCentre(finish);
    mission.step(pos, [
      {
        ruleId: 'GDZIE-04',
        kind: 'minor',
        at: 0,
        pos,
        evidence: {},
        feedbackKey: 'przepisy.GDZIE-04.feedback',
      },
    ]);
    expect(mission.result).toMatchObject({
      status: 'completed',
      penaltyPoints: content.balans.misja.kara_minor,
      timeBonus: 0,
      timeBonusEligible: false,
    });
  });

  it('rejects a claimed cartographic shortcut through a wall', () => {
    const route = catalog.routes[0]!;
    const obstacle = world.walls.find(
      ({ width, height }) => width > 3 && height > 3,
    )!;
    const { x, y } = {
      x: obstacle.x + obstacle.width / 2,
      y: obstacle.y + obstacle.height / 2,
    };
    const blocked = {
      poi: { id: 'blocked', x, y, heading: 0, width: 0, height: 0 },
      walking: false,
    };
    expect(
      validateRoute(world, content, [route.steps[0]!, blocked]),
    ).toBeUndefined();
  });
});
