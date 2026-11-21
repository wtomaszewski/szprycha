import { readdirSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { parse } from 'yaml';
import { buildContent } from '../../tools/content';

it('accounts for every rule and requires exercised implementations for sim rules', async () => {
  const { przepisy } = (await buildContent()).przepisy;
  const modules = readdirSync('src/rules/detectors').filter((file) =>
    file.endsWith('.ts'),
  );
  const implemented = new Set(modules.map((file) => file.slice(0, -3)));
  // Issue #16 part 2. Remove this list when those detectors land.
  const partTwo = [
    'GDZIE-02',
    'GDZIE-03',
    'GDZIE-03b',
    'GDZIE-07',
    'GDZIE-08',
    'GDZIE-09',
    'GDZIE-10',
    'GDZIE-11',
    'SYG-03',
    'SYG-02',
    'ZNAK-A7',
    'ZNAK-B2T22',
    'ZNAK-B9',
    'ZNAK-B1',
    'MAN-02',
    'MAN-04',
    'MAN-05',
    'MAN-08',
    'MAN-12',
  ];
  const simulation = przepisy.filter(({ detektor }) => detektor === 'sim');
  expect(
    simulation
      .filter(({ id }) => !implemented.has(id))
      .map(({ id }) => id)
      .sort(),
  ).toEqual([...partTwo].sort());
  const known = new Map(przepisy.map(({ id, detektor }) => [id, detektor]));
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
  for (const { id } of simulation) {
    if (!implemented.has(id)) continue;
    const matching = scenarios.filter(({ expect }) =>
      Object.hasOwn(expect, id),
    );
    expect(matching.length, id).toBeGreaterThanOrEqual(3);
    expect(
      matching.some(({ expect }) => expect[id]?.length),
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
