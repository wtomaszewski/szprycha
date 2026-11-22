import { readdirSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { parse } from 'yaml';
import { placIds } from '../../src/gameplay/plac/PlacRun';
import { buildContent } from '../../tools/content';

it('accounts for every rule and requires exercised implementations for sim rules', async () => {
  const { przepisy } = (await buildContent()).przepisy;
  const modules = readdirSync('src/rules/detectors').filter((file) =>
    file.endsWith('.ts'),
  );
  const implemented = new Set(modules.map((file) => file.slice(0, -3)));
  const simulation = przepisy.filter(({ detektor }) => detektor === 'sim');
  expect(
    simulation
      .filter(({ id }) => !implemented.has(id))
      .map(({ id }) => id)
      .sort(),
  ).toEqual([]);
  const known = new Map(przepisy.map(({ id, detektor }) => [id, detektor]));
  expect(
    przepisy
      .filter(({ detektor }) => detektor === 'plac')
      .map(({ id }) => id)
      .sort(),
  ).toEqual([...placIds].sort());
  for (const id of implemented)
    expect(known.get(id), id).toBe(id === 'KASK-01' ? 'garaz' : 'sim');

  const scenarios = readdirSync('tests/rules')
    .filter((name) => name.endsWith('.yaml'))
    .flatMap(
      (name) =>
        (
          parse(readFileSync(`tests/rules/${name}`, 'utf8')) as {
            scenarios: { expect: Record<string, string[]> }[];
          }
        ).scenarios,
    );
  for (const { id, waga_bledu } of przepisy.filter(
    ({ id, detektor }) => detektor === 'sim' || id === 'KASK-01',
  )) {
    const matching = scenarios.filter(({ expect }) =>
      Object.hasOwn(expect, id),
    );
    expect(matching.length, id).toBeGreaterThanOrEqual(3);
    expect(
      matching.some(({ expect }) =>
        expect[id]?.some((kind) => kind === 'minor' || kind === 'major'),
      ),
      id,
    ).toBe(waga_bledu !== null);
    if (waga_bledu === null)
      expect(
        matching.some(({ expect }) => expect[id]?.includes('good')),
        id,
      ).toBe(true);
    expect(
      matching.some(
        ({ expect }) => !expect[id]?.some((kind) => kind !== 'good'),
      ),
      id,
    ).toBe(true);
  }
});
