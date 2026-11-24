import type { tiledMap } from './tiled-map.ts';

export function poznanScenery({
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
    landmarkId: string,
  ) => rect(id, x, y, w, h, { height, roof, wall, landmarkId });
  const prop = (kind: string, x: number, y: number, turn = 0) =>
    rect(`${kind}-${x}-${y}`, x, y, 0, 0, { kind, turn });
  const decor = (
    kind: string,
    x: number,
    y: number,
    width = 0,
    height = 0,
    color?: number,
  ) =>
    rect(`${kind}-${x}-${y}`, x, y, width, height, {
      kind,
      ...(color && { color }),
    });
  const point = (id: string, x: number, y: number, heading = 0, size = 32) =>
    rect(`poz-${id}`, x - size / 2, y - size / 2, size, size, { heading });
  const blocks = [
    block(
      'ratusz-arkady',
      1630,
      475,
      224,
      132,
      5,
      'tile',
      'plaster',
      'poznan-ratusz',
    ),
    block(
      'ratusz-wieza',
      1701,
      481,
      82,
      96,
      9,
      'copper',
      'plaster',
      'poznan-ratusz',
    ),
    block(
      'ratusz-helm',
      1721,
      497,
      42,
      52,
      13,
      'copper',
      'sand',
      'poznan-ratusz',
    ),
    block(
      'katedra-nawa',
      1803,
      1923,
      139,
      190,
      6,
      'tile',
      'brick',
      'poznan-katedra',
    ),
    block(
      'katedra-wieza-w',
      1795,
      2044,
      44,
      70,
      10,
      'copper',
      'brick',
      'poznan-katedra',
    ),
    block(
      'katedra-wieza-e',
      1906,
      2044,
      44,
      70,
      10,
      'copper',
      'brick',
      'poznan-katedra',
    ),
    block(
      'browar-warzelnie',
      2864,
      1300,
      250,
      184,
      5,
      'tile',
      'brick',
      'poznan-browar',
    ),
    block(
      'browar-magazyn',
      3360,
      1290,
      224,
      130,
      3,
      'felt',
      'brick',
      'poznan-browar',
    ),
    block(
      'browar-komin',
      3062,
      1330,
      28,
      28,
      11,
      'stone',
      'brick',
      'poznan-browar',
    ),
  ];
  for (const [index, color] of [
    'gold',
    'rose',
    'mint',
    'blue',
    'gold',
    'rose',
    'mint',
  ].entries()) {
    const x = index < 4 ? 1302 + index * 73 : 1869 + (index - 4) * 73;
    blocks.push(
      block(
        `domki-budnicze-${index}`,
        x,
        530 + (index % 2) * 6,
        63,
        107,
        3 + (index % 3),
        'tile',
        'plaster',
        `poznan-budnicza-${color}`,
      ),
    );
  }
  const map_decorations = [
    decor('poznan-koziolki', 1742, 624),
    decor('truss-bridge', 1664, 1728, 96, 160, 0xaa3e4d),
    decor('poznan-peron', 2448, 608, 27, 224),
    decor('river-steps', 1544, 1676),
    decor('river-steps', 1930, 1676),
    rect('ostrow-rower-turbo', 1737, 2081, 0, 0, {
      kind: 'fallen-bike',
      mission: 'POZ-A3-01',
    }),
  ];
  const props = [
    prop('shelter', 2460, 713, 1),
    prop('bike-rack', 1510, 676),
    prop('cafe', 1390, 674),
    prop('cafe', 2000, 674),
    prop('bench', 1880, 674),
    prop('bike-rack', 1600, 2140),
    prop('bench', 1800, 2164),
  ];
  for (let i = 0; i < 8; i++) {
    props.push(
      prop('lamp', 1310 + 120 * i, 769),
      prop('lamp', 1296 + 133 * i, 1652),
      prop('tree', 1296 + 130 * i, 1540),
      prop('bench', 2710 + 132 * i, 1536),
      prop('tree', 2690 + 137 * i, 1596),
      prop('tree', 2639 + 152 * i, 2350 + (i % 2) * 30),
    );
  }
  const collisions = [
    rect('filary-mostu-zachod', 1661, 1728, 6, 160, { kind: 'wall' }),
    rect('filary-mostu-wschod', 1757, 1728, 6, 160, { kind: 'wall' }),
  ];
  const districts = [
    rect('stary-rynek', 1248, 384, 960, 576),
    rect('aleja-tramwajowa', 2224, 352, 440, 864),
    rect('browar', 2656, 1216, 1088, 448),
    rect('bulwar-warty', 1248, 1536, 1056, 192),
    rect('ostrow-tumski', 1376, 1888, 640, 352),
  ];
  const finds = [
    ['rogal-ratusz', 1596, 652, 'Q014'],
    ['rogal-domki', 1744, 652, 'Q067'],
    ['rogal-latarnia', 1888, 652, 'Q039'],
    ['rogal-bulwar', 1830, 1622, 'Q017'],
  ] as const;
  const collectibles = finds.map(([id, x, y, question]) =>
    rect(`poz-${id}`, x, y, 0, 0, { kind: 'rogal', question }),
  );
  const pois = [
    ...finds.map(([id, x, y]) => point(id, x, y)),
    point('rogale-start', 1550, 652),
    point('ostrow-plansza-start', 1552, 2166, Math.PI / 2),
    point('ostrow-plansza-znak', 1552, 2212, Math.PI / 2, 24),
    point('ostrow-plansza-chodnik', 1552, 2400, Math.PI / 2),
    point('ostrow-plansza-meta', 1552, 2430, Math.PI / 2),
    point('rynek-start', 1376, 782),
    point('rynek-zasady', 1510, 877),
    point('rynek-obejscie', 1810, 877),
    point('rynek-meta', 2030, 801),
    point('sluza-start', 2028, 1136),
    point('sluza-postoj', 2272, 1136, 0, 26),
    point('sluza-meta', 2660, 1136),
    point('peron-start', 2530, 780, -Math.PI / 2),
    point('peron-postoj', 2530, 632, -Math.PI / 2, 26),
    point('peron-meta', 2530, 504, -Math.PI / 2),
    point('bulwar-start', 1430, 1622),
    point('bulwar-zakret', 1652, 1622),
    point('bulwar-most', 1712, 1848, Math.PI / 2),
    point('ostrow-pomoc', 1712, 2080, Math.PI / 2),
    point('ostrow-meta', 1720, 2150, Math.PI / 2),
  ];
  return {
    blocks,
    props,
    collisions,
    districts,
    pois,
    map_decorations,
    collectibles,
  };
}
