import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { missionCity } from '../src/content/missions.ts';
import { placSchema } from '../src/content/plac.ts';
import { placIds } from '../src/gameplay/plac/PlacRun.ts';
import { balanceSchema, rulesSchema } from '../src/content/schemas.ts';
import { readMissions } from './content.ts';
import { analyseMapCoverage } from './map-coverage.ts';
import { readMaps } from './maps.ts';

const situationLabels = {
  equalJunction: ['Skrzyżowanie równorzędne', ['skrzyżowanie równorzędne']],
  priorityWithStop: [
    'Droga z pierwszeństwem + STOP',
    ['D-1 i B-20 na tym samym skrzyżowaniu'],
  ],
  signals: [
    'Sygnalizacja + S-2 + S-6/S-7',
    ['S-1', 'S-2', 'sygnał dla rowerzystów'],
  ],
  roundabout: ['Rondo', ['rondo']],
  tramStop: [
    'Tramwaj + przystanek bez wysepki',
    ['trasa tramwaju', 'przystanek bez wysepki'],
  ],
  bikeInfrastructure: [
    'DDR, pas rowerowy, ciąg pieszo-rowerowy',
    ['DDR', 'pas rowerowy', 'ciąg pieszo-rowerowy'],
  ],
  bikeCrossing: ['Przejazd dla rowerzystów', ['przejazd dla rowerzystów']],
  calmZone: [
    'Strefa zamieszkania / pieszych',
    ['strefa zamieszkania lub pieszych'],
  ],
  internalRoadExit: ['Wyjazd z drogi wewnętrznej', ['wyjazd oznaczony D-47']],
  railCrossing: ['Przejazd kolejowy', ['przejazd kolejowy']],
  shoulderAndBan: [
    'Pobocze, zakaz wjazdu rowerów',
    ['pobocze', 'zakaz wjazdu rowerów'],
  ],
  contraflow: ['Kontraruch', ['B-2 z wyjątkiem dla rowerów']],
  night: ['Nocna jazda', ['zmrok na mapie lub w misji']],
} as const satisfies Record<
  keyof ReturnType<typeof analyseMapCoverage>['situations'],
  readonly [string, readonly string[]]
>;

const mapNames: Readonly<Partial<Record<string, string>>> = {
  warszawa: 'Warszawa',
  wroclaw: 'Wrocław',
  krakow: 'Kraków',
  gdansk: 'Gdańsk',
  wies: 'Wieś i las',
  poznan: 'Poznań',
  zakopane: 'Zakopane',
  miasteczko: 'Miasteczko',
};
const hub = 'miasteczko';

const codeList = (ids: readonly string[]) =>
  [...new Set(ids)]
    .sort()
    .map((id) => `\`${id}\``)
    .join(', ') || '—';

async function generateCoverageReport(root: string) {
  const readYaml = async (file: string): Promise<unknown> =>
    parse(await readFile(resolve(root, 'content', file), 'utf8'));
  const [rules, balance, missions, plac] = await Promise.all([
    readYaml('przepisy.yaml').then((data) => rulesSchema.parse(data)),
    readYaml('balans.yaml').then((data) => balanceSchema.parse(data)),
    readMissions(root),
    readYaml('plac.yaml').then((data) => placSchema.parse(data)),
  ]);
  const worlds = await readMaps(root, balance.silnik.kafel_m);
  const mapId = ({ mapa, miasto }: (typeof missions)[number]) => mapa ?? miasto;
  const cities = [
    ...new Set([
      ...missionCity.options,
      ...worlds.keys(),
      ...missions.map(mapId),
    ]),
  ]
    .filter((id) => id !== hub)
    .sort();

  const output = [
    '# Pokrycie sytuacji drogowych i modułów',
    '',
    '<!-- Raport generowany przez npm run coverage:maps. -->',
    '',
    'Sytuacje odpowiadają tabeli pokrycia w [dokumentacji map](05_mapy.md). Wiersz z kilkoma wymaganymi elementami jest pokryty, gdy występuje każdy z nich.',
    '',
    'W każdym mieście moduł jest pokryty, gdy wykryto co najmniej jedną jego regułę w misjach. Moduły wspólnego hubu są liczone informacyjnie, także z obiektów mapy. Raport przypisuje misje do mapy, na której się odbywają. Kolumna mapy obejmuje reguły powiązane z wykrytymi obiektami, a kolumna misji obejmuje reguły deklarowane i wykryte w celach, zdarzeniach oraz miejscach misji.',
    '',
    'Aby odtworzyć raport, uruchom `npm run coverage:maps`. Opcja `--strict` (po separatorze `--`) zapisuje raport i kończy się błędem, jeśli w którymkolwiek mieście brakuje mapy, sytuacji lub całego modułu albo brakuje pokrycia reguł placu.',
  ];
  let hasGaps = false;
  for (const id of [...cities, hub]) {
    const world = worlds.get(id);
    const localMissions = missions.filter((mission) => mapId(mission) === id);
    const { situations, modules } = analyseMapCoverage(
      world,
      localMissions,
      rules.przepisy,
    );
    const name = mapNames[id] ?? id;
    const mapFile = `../maps/${id}.tmj`;
    output.push(
      '',
      `## ${name}${id === hub ? ' (wspólny hub)' : ''}`,
      '',
      world
        ? `Mapa [${id}.tmj](${mapFile})`
        : `**Brak mapy** \`maps/${id}.tmj\``,
      '',
      `**Misje na mapie** ${codeList(localMissions.map(({ id }) => id))}`,
      '',
      '| Sytuacja drogowa | Pokrycie | Wykryte obiekty lub misje | Brakujące elementy |',
      '| --- | :---: | --- | --- |',
    );

    const situationKeys = Object.keys(
      situationLabels,
    ) as (keyof typeof situationLabels)[];
    let situationCount = 0;
    for (const key of situationKeys) {
      const [label, componentLabels] = situationLabels[key];
      const parts = situations[key];
      const missing = componentLabels.filter((_, i) => !parts[i]?.length);
      if (!missing.length) situationCount++;
      output.push(
        `| ${label} | ${missing.length ? '✗' : '✓'} | ${codeList(parts.flat())} | ${missing.join(', ') || '—'} |`,
      );
    }

    output.push(
      '',
      '| Moduł | Pokrycie | Reguły z mapy | Reguły z misji |',
      '| --- | :---: | --- | --- |',
    );
    let moduleCount = 0;
    for (const { module, map, missions } of modules) {
      const covered = missions.length > 0 || (id === hub && map.length > 0);
      if (covered) moduleCount++;
      output.push(
        `| ${module} | ${covered ? '✓' : '✗'} | ${codeList(map)} | ${codeList(missions)} |`,
      );
    }
    output.push(
      '',
      `**Pokrycie** ${situationCount}/${situationKeys.length} sytuacji, ${moduleCount}/${modules.length} modułów.`,
    );
    if (
      id !== hub &&
      (!world ||
        situationCount < situationKeys.length ||
        moduleCount < modules.length)
    ) {
      hasGaps = true;
    }
  }
  const placRules = rules.przepisy.filter(
    ({ detektor }) => detektor === 'plac',
  );
  const uncatalogued = placIds.filter(
    (id) => !placRules.some((rule) => rule.id === id),
  );
  output.push(
    '',
    '## Plac manewrowy (M08)',
    '',
    'Pokrycie reguł typu `plac` wymaga osobnego detektora ćwiczenia oraz geometrii w [plac.yaml](../content/plac.yaml).',
    '',
    '| Reguła | Ćwiczenie | Pokrycie |',
    '| --- | --- | :---: |',
  );
  for (const { id, tytul } of placRules) {
    const covered = placIds.some(
      (implemented) => implemented === id && Object.hasOwn(plac.exercises, id),
    );
    hasGaps ||= !covered;
    output.push(`| \`${id}\` | ${tytul} | ${covered ? '✓' : '✗'} |`);
  }
  hasGaps ||= uncatalogued.length > 0;
  return { markdown: output.join('\n') + '\n', hasGaps };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--strict'))
    throw new Error('Usage: npm run coverage:maps -- [--strict]');

  const root = process.cwd();
  const { markdown, hasGaps } = await generateCoverageReport(root);
  await writeFile(resolve(root, 'docs/coverage.md'), markdown);
  console.log('Zapisano docs/coverage.md');
  if (args.includes('--strict') && hasGaps) {
    console.error('Raport wykazał braki pokrycia.');
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
