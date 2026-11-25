import type { tiledMap } from './tiled-map.ts';

export function lodzScenery({
  rect,
}: Pick<ReturnType<typeof tiledMap>, 'rect'>) {
  const block = (
    id: string,
    x: number,
    y: number,
    width: number,
    depth: number,
    height: number,
    roof: string,
    wall: string,
    landmarkId: string,
  ) => rect(id, x, y, width, depth, { height, roof, wall, landmarkId });
  const prop = (kind: string, x: number, y: number, turn = 0) =>
    rect(`${kind}-${x}-${y}`, x, y, 0, 0, { kind, turn });
  const poi = (id: string, x: number, y: number, heading = 0, size = 34) =>
    rect(`lod-${id}`, x - size / 2, y - size / 2, size, size, { heading });
  const blocks = [
    block(
      'fabryka-hala',
      2690,
      1296,
      414,
      150,
      5,
      'tile',
      'brick',
      'lodz-fabryka-hala',
    ),
    block(
      'fabryka-kotlownia',
      2726,
      1358,
      112,
      164,
      3,
      'felt',
      'brick',
      'lodz-fabryka-hala',
    ),
    block(
      'fabryka-komin',
      2774,
      1368,
      35,
      38,
      13,
      'stone',
      'brick',
      'lodz-fabryka-komin',
    ),
    block(
      'fabryka-magazyn',
      2688,
      1536,
      160,
      120,
      3,
      'felt',
      'brick',
      'lodz-fabryka-hala',
    ),
    block(
      'brama-zachod',
      3060,
      1232,
      140,
      64,
      4,
      'tile',
      'brick',
      'lodz-fabryka-hala',
    ),
    block(
      'brama-wschod',
      3296,
      1232,
      106,
      64,
      4,
      'tile',
      'brick',
      'lodz-fabryka-hala',
    ),
    block(
      'podworko-fale',
      3340,
      1344,
      205,
      88,
      6,
      'felt',
      'brick',
      'lodz-mural-fale',
    ),
    block(
      'podworko-romb',
      3572,
      1450,
      70,
      146,
      5,
      'tile',
      'plaster',
      'lodz-mural-romb',
    ),
    block(
      'podworko-oficyna',
      3140,
      1472,
      180,
      108,
      4,
      'tile',
      'plaster',
      'lodz-kamienica',
    ),
    block(
      'kamienica-kontrapas',
      3150,
      712,
      140,
      184,
      4,
      'tile',
      'plaster',
      'lodz-kamienica',
    ),
    block(
      'kamienica-arkady',
      1584,
      502,
      174,
      135,
      6,
      'copper',
      'plaster',
      'lodz-kamienica',
    ),
  ];
  for (const [i, x] of [1262, 1388, 1468, 1780, 1900, 2025, 2134].entries()) {
    blocks.push(
      block(
        `piotrkowska-kamienica-${i}`,
        x,
        508 + 7 * (i % 3),
        i === 6 ? 62 : 76,
        104,
        3 + (i % 3),
        i % 3 === 0 ? 'copper' : 'tile',
        i % 2 ? 'sand' : 'plaster',
        'lodz-kamienica',
      ),
    );
  }
  const props = [
    prop('cafe', 1335, 660),
    prop('cafe', 1480, 650),
    prop('cafe', 1740, 661),
    prop('cafe', 1998, 660),
    prop('bench', 1420, 652),
    prop('bike-rack', 1930, 654),
    prop('shelter', 2594, 1443, 1),
    prop('bench', 3480, 1470),
    prop('bike-rack', 3370, 1468),
    prop('tree', 3495, 1535),
  ];
  const collisions = [
    rect('wygrodzenie-pasazu-polnoc', 1632, 762, 64, 6, { kind: 'wall' }),
    rect('wygrodzenie-pasazu-poludnie', 1632, 832, 64, 6, { kind: 'wall' }),
  ];
  for (let i = 0; i < 7; i++) {
    const x = 1280 + 133 * i;
    props.push(
      prop('lamp', x, 890),
      prop('tree', x, 913),
      prop('tree', x, 2000 + 16 * (i % 3)),
      prop('bench', x, 2160),
    );
  }
  for (const x of [1335, 1480, 1740, 1998])
    collisions.push(rect(`ogrodek-${x}`, x - 9, 643, 18, 25, { kind: 'wall' }));
  const districts = [
    rect('piotrkowska', 1248, 448, 960, 480),
    rect('aleja-tramwajowa', 2224, 608, 400, 1056),
    rect('fabryka', 2656, 1216, 480, 480),
    rect('podworka', 3136, 1216, 544, 480),
    rect('kontrapas', 3008, 608, 320, 416),
    rect('park', 1248, 1984, 896, 384),
  ];
  const pois = [
    poi('piotrkowska-start', 1328, 861),
    poi('piotrkowska-zasady', 1490, 861),
    poi('piotrkowska-pomoc', 1830, 861),
    poi('piotrkowska-meta', 2090, 861),
    poi('mijanie-start', 1438, 742),
    poi('mijanie-zasady', 1478, 742),
    poi('mijanie-cargo', 1710, 742),
    poi('mijanie-meta', 2050, 742),
    poi('kontrapas-start', 3120, 994, -Math.PI / 2),
    poi('kontrapas-znak', 3120, 952, -Math.PI / 2),
    poi('kontrapas-pas', 3120, 832, -Math.PI / 2),
    poi('kontrapas-meta', 3120, 716, -Math.PI / 2),
    poi('brama-start', 3268, 1259, -Math.PI / 2),
    poi('brama-postoj', 3268, 1228, -Math.PI / 2, 20),
    poi('brama-meta', 3268, 1112, -Math.PI / 2),
  ];
  return { blocks, props, collisions, districts, pois };
}
