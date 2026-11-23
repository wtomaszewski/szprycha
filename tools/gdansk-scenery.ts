import type { tiledMap } from './tiled-map.ts';

export function gdanskScenery({
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
  const decor = (kind: string, x: number, y: number, w = 0, h = 0) =>
    rect(`${kind}-${x}-${y}`, x, y, w, h, { kind });
  const point = (id: string, x: number, y: number, heading = 0) =>
    rect(`gda-${id}`, x - 18, y - 18, 36, 36, { heading });

  const blocks = [
    block(
      'zuraw-wieza-w',
      1572,
      1582,
      68,
      123,
      7,
      'tile',
      'brick',
      'zuraw-wieza',
    ),
    block(
      'zuraw-wieza-e',
      1776,
      1582,
      68,
      123,
      7,
      'tile',
      'brick',
      'zuraw-wieza',
    ),
    block(
      'zuraw-korpus',
      1640,
      1568,
      136,
      124,
      6,
      'felt',
      'brick',
      'zuraw-korpus',
    ),
    block(
      'zuraw-wysiegnik',
      1656,
      1658,
      104,
      65,
      6,
      'felt',
      'brick',
      'zuraw-korpus',
    ),
    block(
      'stocznia-hala',
      2792,
      1304,
      274,
      161,
      4,
      'stone',
      'brick',
      'stocznia-hala',
    ),
    block(
      'stocznia-magazyn',
      3464,
      1304,
      215,
      128,
      3,
      'felt',
      'concrete',
      'stocznia-hala',
    ),
    block(
      'olowianka-spichlerz',
      1976,
      2244,
      141,
      106,
      5,
      'tile',
      'brick',
      'gdansk-kamienica',
    ),
  ];
  for (const [i, wall] of [
    'plaster',
    'sand',
    'brick',
    'plaster',
    'sand',
    'brick',
    'plaster',
    'sand',
    'brick',
  ].entries())
    blocks.push(
      block(
        `targ-kamienica-${i}`,
        1290 + 93 * i,
        438 - (i % 3) * 5,
        82,
        135,
        3 + (i % 4),
        i % 3 === 1 ? 'copper' : 'tile',
        wall,
        'gdansk-kamienica',
      ),
    );
  const map_decorations = [
    decor('gdansk-fontanna', 1748, 681),
    decor('kladka-drewniana', 1664, 1792, 96, 320),
    decor('truss-bridge', 3392, 1730, 96, 318),
    decor('stocznia-dzwig', 3092, 1678, 188, 170),
    decor('stocznia-dzwig', 3610, 1644, 176, 137),
    decor('tram-platform', 2560, 786),
    decor('morska-piana', 2630, 3392, 470),
    decor('morska-piana', 3108, 3328, 442),
    decor('morska-piana', 3554, 3264, 376),
  ];
  for (let i = 0; i < 10; i++)
    map_decorations.push(
      decor('piasek-na-asfalcie', 2704 + 105 * i, 3001 + (i % 3) * 15),
    );
  const props = [
    prop('cafe', 1430, 707),
    prop('cafe', 1534, 707),
    prop('cafe', 1921, 709),
    prop('bike-rack', 1840, 743),
    prop('bench', 1618, 708),
    prop('bike-rack', 1615, 1746),
    prop('bench', 2002, 1742),
    prop('bench', 3150, 2787),
    prop('bench', 3445, 2787),
    prop('shelter', 3536, 3119),
    prop('bike-rack', 3340, 3079),
  ];
  for (let i = 0; i < 9; i++) {
    props.push(
      prop('lamp', 1318 + 97 * i, 736),
      prop('lamp', 1300 + i * 111, 1768),
      prop('bollard', 2680 + 132 * i, 2906),
      prop('tree', 2680 + 132 * i, 3101 + (i % 3) * 23),
    );
  }
  const collisions = [
    rect('fontanna', 1720, 654, 56, 54, { kind: 'wall' }),
    rect('dzwig-zachodni', 3083, 1669, 20, 20, { kind: 'wall' }),
    rect('dzwig-wschodni', 3601, 1635, 20, 20, { kind: 'wall' }),
  ];
  const districts = [
    rect('dlugi-targ', 1248, 384, 928, 576),
    rect('zuraw', 1248, 1408, 992, 384),
    rect('olowianka', 1344, 2240, 896, 128, {
      unlock: 'GDA-B-01',
      gateX: 1712,
      gateY: 2240,
    }),
    rect('promenada', 2624, 2784, 1216, 128, {
      unlock: 'GDA-B-01',
      gateX: 2672,
      gateY: 2784,
    }),
    rect('plaza', 2624, 3104, 1312, 128, {
      unlock: 'GDA-B-03',
      gateX: 3440,
      gateY: 3104,
    }),
    rect('stocznia', 2656, 1280, 1088, 448, {
      unlock: 'GDA-B-04',
      gateX: 3248,
      gateY: 1280,
    }),
  ];
  const finds = [
    ['bursztyn-targ', 1490, 635, 'Q014'],
    ['bursztyn-kamienice', 1748, 618, 'Q002'],
    ['bursztyn-fontanna', 2000, 650, 'Q026'],
    ['bursztyn-zuraw', 1838, 1752, 'Q005'],
    ['bursztyn-promenada', 3470, 2880, 'Q017'],
    ['bursztyn-stocznia', 3700, 1540, 'Q024'],
  ] as const;
  const collectibles = finds.map(([id, x, y, question]) =>
    rect(`gda-${id}`, x, y, 0, 0, { kind: 'bursztyn', question }),
  );
  const pois = [
    ...finds.map(([id, x, y]) => point(id, x, y)),
    point('zuraw-start', 1712, 1748, Math.PI / 2),
    point('kladka', 1712, 1936, Math.PI / 2),
    point('kladka-meta', 1712, 2161, Math.PI / 2),
    point('promenada-start', 2672, 2870),
    point('promenada-piesi', 2744, 2870),
    point('promenada-pomoc', 3360, 2880),
    point('promenada-meta', 3704, 2880),
    point('wiatr-start', 2872, 2885, Math.PI),
    point('wiatr-zjazd', 2680, 3046),
    point('wiatr-piasek', 3100, 3046),
    point('wiatr-meta', 3690, 3046),
    point('przejazd-start', 2784, 1252, -Math.PI / 2),
    point('przejazd-postoj', 2784, 1176, -Math.PI / 2),
    point('przejazd-meta', 2784, 926, -Math.PI / 2),
    point('targ-odbior', 1370, 858),
    point('targ-dostawa', 2070, 858),
    point('bursztyny-start', 1340, 635),
    point('tramwaj-start', 2528, 1380, -Math.PI / 2),
    point('tramwaj-swiatla', 2528, 1180, -Math.PI / 2),
    point('tramwaj-przystanek', 2528, 968, -Math.PI / 2),
    point('tramwaj-meta', 2528, 530, -Math.PI / 2),
    point('kolej-start', 1104, 3376, -Math.PI / 2),
    point('kolej-postoj', 1104, 3190, -Math.PI / 2),
    point('kolej-za', 1104, 3050, -Math.PI / 2),
    point('kolej-meta', 1104, 2820, -Math.PI / 2),
    point('stocznia-start', 3312, 1568),
    point('stocznia-meta', 3650, 1568),
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
