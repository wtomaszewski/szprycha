import type { tiledMap } from './tiled-map.ts';

export function wroclawScenery({
  rect,
}: Pick<ReturnType<typeof tiledMap>, 'rect'>) {
  const block = (
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
    height: number,
    roof: string,
    wall: string,
    landmarkId?: string,
  ) =>
    rect(id, x, y, w, h, {
      height,
      roof,
      wall,
      ...(landmarkId && { landmarkId }),
    });
  const blocks = [
    block(
      'ratusz-korpus',
      3072,
      2056,
      256,
      160,
      4,
      'tile',
      'brick',
      'ratusz-wroclawski',
    ),
    block(
      'ratusz-wieza',
      3092,
      2132,
      48,
      58,
      10,
      'copper',
      'brick',
      'ratusz-wroclawski',
    ),
    block(
      'ratusz-iglica',
      3110,
      2152,
      12,
      16,
      13,
      'copper',
      'brick',
      'ratusz-wroclawski',
    ),
    block('kosciol-nawa', 3648, 2092, 106, 102, 4, 'tile', 'brick'),
    block('kosciol-wieza-n', 3672, 2072, 32, 34, 10, 'copper', 'brick'),
    block('kosciol-wieza-s', 3716, 2072, 32, 34, 10, 'copper', 'brick'),
    block('mostek-pokutnic', 3704, 2082, 12, 9, 8, 'stone', 'brick'),
    block('uniwersytet', 2070, 1636, 354, 64, 4, 'tile', 'sand', 'uniwersytet'),
    block(
      'uniwersytet-wieza',
      2248,
      1650,
      45,
      35,
      8,
      'copper',
      'sand',
      'uniwersytet',
    ),
    block('katedra-nawa', 2864, 1152, 192, 144, 6, 'tile', 'brick', 'katedra'),
    block(
      'katedra-wieza-z',
      2874,
      1282,
      54,
      42,
      14,
      'tile',
      'brick',
      'katedra-wieza-z',
    ),
    block(
      'katedra-helm-z',
      2879,
      1285,
      44,
      36,
      16,
      'copper',
      'brick',
      'katedra-wieza-z',
    ),
    block(
      'katedra-wieza-w',
      2992,
      1282,
      54,
      42,
      14,
      'tile',
      'brick',
      'katedra-wieza-w',
    ),
    block(
      'katedra-helm-w',
      2997,
      1285,
      44,
      36,
      16,
      'copper',
      'brick',
      'katedra-wieza-w',
    ),
    block(
      'hala-stulecia-podstawa',
      4880,
      256,
      384,
      384,
      3,
      'stone',
      'concrete',
      'hala-stulecia',
    ),
    block(
      'hala-stulecia-pierscien',
      4908,
      284,
      328,
      328,
      5,
      'stone',
      'concrete',
      'hala-stulecia',
    ),
    block(
      'hala-stulecia-kopula',
      4944,
      320,
      256,
      256,
      8,
      'stone',
      'concrete',
      'hala-stulecia',
    ),
    block('iglica-cokol', 4810, 596, 22, 22, 2, 'stone', 'concrete', 'iglica'),
    block('iglica-maszt', 4817, 603, 8, 8, 18, 'felt', 'concrete', 'iglica'),
    block('afrykarium', 5072, 2516, 320, 192, 3, 'felt', 'glass', 'afrykarium'),
    block(
      'sky-tower-podstawa',
      2176,
      3120,
      336,
      216,
      4,
      'stone',
      'concrete',
      'sky-tower',
    ),
    block(
      'sky-tower-skrzydlo',
      2256,
      3132,
      248,
      196,
      12,
      'felt',
      'concrete',
      'sky-tower',
    ),
    block(
      'sky-tower-wieza',
      2304,
      3134,
      192,
      192,
      40,
      'felt',
      'glass',
      'sky-tower',
    ),
    block(
      'dworzec-glowny',
      3264,
      2632,
      640,
      160,
      3,
      'sand',
      'sand',
      'dworzec-glowny',
    ),
    ...[3274, 3444, 3740, 3850].map((x) =>
      block(`dworzec-wieza-${x}`, x, 2744, 42, 48, 5, 'copper', 'sand'),
    ),
    block('peron-zachodni', 3300, 2556, 220, 38, 1, 'felt', 'concrete'),
    block('peron-wschodni', 3624, 2556, 255, 38, 1, 'felt', 'concrete'),
    block(
      'stadion-wroclaw',
      320,
      336,
      448,
      352,
      6,
      'stone',
      'concrete',
      'stadion-wroclaw',
    ),
    block('kasa-stadionu', 1060, 586, 126, 54, 2, 'felt', 'concrete'),
    block('stacja-podmiejska', 1120, 2160, 174, 54, 2, 'tile', 'brick'),
    block('magazyn', 1170, 1568, 140, 68, 3, 'felt', 'brick'),
    ...Array.from({ length: 8 }, (_, i) =>
      block(
        `dom-zachod-${i + 1}`,
        260 + (i % 4) * 138,
        1952 + Math.floor(i / 4) * 115,
        82,
        62,
        i % 3 === 0 ? 2 : 1,
        i % 2 ? 'copper' : 'tile',
        'sand',
      ),
    ),
    ...Array.from({ length: 7 }, (_, i) =>
      block(
        `kamienica-rynek-${i + 1}`,
        2976 + i * 119,
        2232,
        90,
        102,
        3 + (i % 3),
        'tile',
        ['sand', 'brick', 'plaster'][i % 3]!,
      ),
    ),
    ...Array.from({ length: 4 }, (_, i) =>
      block(
        `kwiaciarnia-solny-${i + 1}`,
        2960 + i * 72,
        2400,
        48,
        34,
        1,
        i % 2 ? 'copper' : 'tile',
        'plaster',
      ),
    ),
    ...Array.from({ length: 9 }, (_, i) => {
      const angle = Math.PI + (i * Math.PI) / 8;
      return block(
        `pergola-kolumna-${i + 1}`,
        Math.round(5040 + 148 * Math.cos(angle)),
        Math.round(181 + 86 * Math.sin(angle)),
        20,
        20,
        2,
        'stone',
        'sand',
      );
    }),
  ];

  const props: ReturnType<typeof rect>[] = [];
  const prop = (kind: string, x: number, y: number) =>
    props.push(rect(`${kind}-${x}-${y}`, x, y, 0, 0, { kind }));
  for (const [y, from, to, step] of [
    [1496, 250, 5184, 170],
    [1862, 2860, 3820, 154],
    [2130, 2976, 3770, 144],
    [1352, 2754, 3140, 75],
    [3086, 1920, 4430, 200],
  ] as const)
    for (let x = from; x < to; x += step) {
      if ([960, 2720, 4608].some((road) => Math.abs(road - x) < 78)) continue;
      prop('lamp', x, y);
    }

  for (const [kind, x, y] of [
    ['bench', 3004, 1908],
    ['bench', 3374, 1920],
    ['bench', 3524, 2345],
    ['bin', 3024, 1908],
    ['tree', 3385, 1960],
    ['tree', 3554, 1938],
    ['tree', 3500, 2130],
    ['tree', 3685, 2152],
    ['tree', 2480, 1204],
    ['bench', 2775, 1335],
    ['bench', 3520, 1288],
    ['tree', 3422, 1243],
    ['tree', 3800, 1195],
    ['tree', 3765, 1325],
    ['tree', 3668, 1193],
    ['tree', 5260, 1960],
    ['tree', 5410, 2090],
    ['tree', 5412, 2460],
    ['tree', 5040, 2090],
    ['bench', 4908, 2188],
    ['bin', 4932, 2188],
    ['tree', 4870, 2385],
    ['tree', 4860, 2260],
    ['bench', 4992, 934],
    ['shelter', 3792, 2795],
    ['lamp', 3770, 2795],
    ['tree', 4110, 2770],
    ['bench', 4008, 2796],
    ['shelter', 1100, 2340],
    ['tree', 620, 845],
    ['tree', 400, 840],
    ['tree', 285, 1938],
    ['tree', 699, 2130],
  ] as const)
    prop(kind, x, y);
  for (let i = 0; i < 28; i++) {
    prop(
      'tree',
      180 + (i % 9) * 69 + (i % 3) * 9,
      2670 + Math.floor(i / 9) * 74,
    );
  }

  const decorations = [
    rect('most-tumski', 2592, 1376, 64, 128, { kind: 'truss-bridge' }),
    rect('mostek-japonski', 5216, 2208, 64, 124, {
      kind: 'truss-bridge',
      color: 0xb13e53,
    }),
    rect('fontanna-multimedialna', 5026, 160, 0, 0, {
      kind: 'fountain',
      color: 0xff77a8,
    }),
    rect('fontanna-rynek', 3470, 2080, 0, 0, { kind: 'fountain' }),
    rect('stadion-swiatlo', 544, 674, 0, 0, { kind: 'neon', color: 0x73eff7 }),
    rect('stadion-swiatlo-zachod', 360, 658, 0, 0, {
      kind: 'neon',
      color: 0xff77a8,
      cycling: true,
    }),
    rect('stadion-swiatlo-wschod', 728, 658, 0, 0, {
      kind: 'neon',
      color: 0xa7f070,
      cycling: true,
    }),
    rect('pingwin-afrykarium', 5136, 2488, 0, 0, { kind: 'penguin' }),
  ];
  for (const y of [1498, 1628])
    for (const x of [490, 1312, 2320, 3130, 4072, 5020])
      decorations.push(
        rect(`schodki-${x}-${y}`, x, y, 0, 0, { kind: 'river-steps' }),
      );

  const collectibles = [];
  let number = 0;
  for (const [district, x, y, columns, rows, dx, dy] of [
    ['rynek', 3024, 2016, 10, 1, 80, 0],
    ['rynek', 3024, 2220, 10, 1, 80, 0],
    ['rynek', 3024, 2340, 10, 1, 80, 0],
    ['ostrow', 2770, 1334, 10, 1, 39, 0],
    ['slodowa', 3296, 1200, 10, 1, 66, 0],
    ['hala', 4813, 658, 10, 1, 73, 0],
    ['zoo', 4900, 2176, 5, 2, 37, 546],
    ['poludnie', 3160, 2798, 15, 1, 66, 0],
    ['zachod', 194, 852, 15, 1, 46, 0],
  ] as const)
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < columns; col++) {
        const id = ++number;
        collectibles.push(
          rect(
            id === 1 ? 'dzwoneczek' : `krasnal-${id}`,
            x + col * dx,
            y + row * dy,
            0,
            0,
            { kind: 'gnome', district, variant: (id - 1) % 20 },
          ),
        );
      }
  return {
    blocks,
    props,
    map_decorations: decorations,
    collectibles,
    pois: [
      rect('dzwoneczek', 3024, 2016, 0, 0),
      rect('kwiaciarnia-solny', 3032, 2386, 0, 0),
      rect('latarnik', 2775, 1336, 0, 0),
      rect('wejscie-hala', 4930, 670, 0, 0),
      rect('afrykarium-wejscie', 5136, 2488, 0, 0),
      rect('dworzec-glowny', 3940, 2794, 0, 0),
      rect('stadion-wroclaw', 520, 864, 0, 0),
      rect('magazyn-gangu', 1220, 1640, 0, 0),
    ],
    collisions: [rect('bramka-obwodnica', 584, 3136, 22, 64, { kind: 'wall' })],
  };
}
