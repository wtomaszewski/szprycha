import type { tiledMap } from './tiled-map.ts';

export function zakopaneScenery({
  rect,
}: Pick<ReturnType<typeof tiledMap>, 'rect'>) {
  const block = (
    id: string,
    x: number,
    y: number,
    width: number,
    depth: number,
    height: number,
  ) => rect(id, x, y, width, depth, { height, landmarkId: 'zakopane-dom' });
  const point = (id: string, x: number, y: number, heading = 0, size = 32) =>
    rect(`zak-${id}`, x - size / 2, y - size / 2, size, size, { heading });
  const prop = (kind: string, x: number, y: number) =>
    rect(`${kind}-${x}-${y}`, x, y, 0, 0, { kind });
  const downhill = Math.PI / 2;
  const uphill = -downhill;

  const blocks = [
    block('willa-przy-deptaku', 1312, 651, 124, 81, 4),
    block('dom-z-gankiem', 1498, 660, 102, 72, 3),
    block('willa-z-weranda', 1670, 638, 152, 94, 5),
    block('dom-pod-szczytem', 1930, 653, 122, 84, 4),
    block('izba-przy-podjezdzie', 3704, 1438, 118, 98, 4),
    block('szalas-przy-poboczu', 1172, 3280, 105, 82, 3),
    block('dom-przy-mostku', 1743, 1460, 115, 64, 3),
    block('dom-za-potokiem', 1725, 1950, 112, 83, 4),
  ];
  const props = [
    prop('bench', 1442, 787),
    prop('bike-rack', 1555, 817),
    prop('cafe', 1627, 764),
    prop('bench', 1775, 788),
    prop('cafe', 2084, 773),
    prop('shelter', 2578, 864),
    prop('bench', 1528, 1620),
    prop('bench', 2002, 2067),
  ];
  for (let i = 0; i < 8; i++) {
    props.push(
      prop('lamp', 1306 + i * 122, 795),
      prop('lamp', 3918, 1422 + i * 110),
      prop('tree', 1260 + i * 132, 1512 - (i % 3) * 12),
      prop('tree', 4110 + (i % 2) * 32, 1388 + i * 110),
    );
  }
  return {
    blocks,
    props,
    collisions: [
      rect('zachodni-mostek-lewa', 1568, 1728, 5, 96, { kind: 'wall' }),
      rect('zachodni-mostek-prawa', 1659, 1728, 5, 96, { kind: 'wall' }),
      rect('wschodni-mostek-lewa', 1888, 1728, 5, 96, { kind: 'wall' }),
      rect('wschodni-mostek-prawa', 1979, 1728, 5, 96, { kind: 'wall' }),
    ],
    districts: [
      rect('krupowki', 1248, 416, 960, 512),
      rect('okolice-dworca', 2224, 480, 1248, 1000),
      rect('potok', 1248, 1440, 1056, 704),
      rect('zjazd', 3648, 1376, 608, 864),
      rect('droga-poza-zabudowa', 864, 2624, 448, 960),
    ],
    pois: [
      point('zjazd-start', 3968, 1456, downhill),
      point('zjazd-postoj', 3968, 1778, downhill, 52),
      point('zjazd-meta', 3968, 2160, downhill),
      point('pobocze-start', 1104, 3504, uphill),
      point('pobocze-postoj', 1104, 3392, uphill, 28),
      point('pobocze-meta', 1104, 3286, uphill),
      point('mgla-start', 3968, 1832, downhill),
      point('mgla-meta', 3968, 2130, downhill, 52),
      point('krupowki-start', 1376, 860),
      point('krupowki-znak', 1528, 854, 0, 48),
      point('krupowki-meta', 2072, 856, 0, 48),
      point('mostek-start', 1936, 949, downhill),
      point('mostek-przejazd', 1936, 994, downhill, 38),
      point('mostek-meta', 1936, 2078, downhill, 48),
    ],
    map_decorations: [
      rect('giewont', 1430, 706, 0, 0, { kind: 'giewont' }),
      rect('zachodni-mostek', 1568, 1728, 96, 96, { kind: 'kladka-drewniana' }),
      rect('wschodni-mostek', 1888, 1728, 96, 96, { kind: 'kladka-drewniana' }),
      rect('mur-oporowy', 3866, 1504, 24, 640, { kind: 'zakopane-mur' }),
    ],
  };
}
