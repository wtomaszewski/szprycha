import type { tiledMap } from './tiled-map.ts';

export function krakowScenery({
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
  const prop = (id: string, kind: string, x: number, y: number, turn = 0) =>
    rect(id, x, y, 0, 0, { kind, turn });
  const decor = (kind: string, x: number, y: number, w = 0, h = 0) =>
    rect(kind, x, y, w, h, { kind });
  const blocks = [
    block(
      'sukiennice-hala',
      1512,
      450,
      384,
      116,
      4,
      'tile',
      'sand',
      'sukiennice',
    ),
    block(
      'sukiennice-szczyt-w',
      1512,
      468,
      32,
      80,
      6,
      'tile',
      'sand',
      'sukiennice',
    ),
    block(
      'sukiennice-szczyt-e',
      1864,
      468,
      32,
      80,
      6,
      'tile',
      'sand',
      'sukiennice',
    ),
    block('mariacki-nawa', 2000, 376, 100, 116, 4, 'tile', 'brick', 'mariacki'),
    block(
      'mariacki-wieza-w',
      2004,
      464,
      36,
      40,
      10,
      'copper',
      'brick',
      'mariacki',
    ),
    block(
      'mariacki-wieza-e',
      2058,
      466,
      34,
      38,
      7,
      'copper',
      'brick',
      'mariacki',
    ),
    block(
      'mariacki-hejnalica',
      2013,
      471,
      18,
      21,
      13,
      'copper',
      'brick',
      'mariacki',
    ),
    block('wawel-skrzydlo-n', 1480, 1354, 224, 68, 5, 'tile', 'sand', 'wawel'),
    block('wawel-skrzydlo-w', 1480, 1422, 68, 106, 4, 'tile', 'sand', 'wawel'),
    block('wawel-skrzydlo-e', 1636, 1422, 68, 106, 4, 'tile', 'sand', 'wawel'),
    block('wawel-mur', 1480, 1528, 224, 24, 2, 'stone', 'sand', 'wawel'),
    block(
      'wawel-baszta',
      1456,
      1480,
      50,
      50,
      8,
      'copper',
      'brick',
      'wawel-baszta',
    ),
    block('wawel-kaplica', 1740, 1380, 74, 84, 4, 'stone', 'sand', 'wawel'),
    block('wawel-katedra', 1800, 1350, 102, 92, 6, 'tile', 'sand', 'wawel'),
    block(
      'wawel-zlota-kopula',
      1753,
      1394,
      38,
      38,
      8,
      'copper',
      'sand',
      'wawel-kopula',
    ),
    block(
      'wawel-wieza',
      1826,
      1368,
      44,
      38,
      10,
      'copper',
      'brick',
      'wawel-baszta',
    ),
    block(
      'kazimierz-dom-modlitwy',
      3312,
      1356,
      168,
      108,
      4,
      'tile',
      'sand',
      'kazimierz',
    ),
    block(
      'kazimierz-szczyt',
      3312,
      1412,
      168,
      52,
      5,
      'tile',
      'sand',
      'kazimierz',
    ),
    block(
      'kazimierz-targ',
      3416,
      1520,
      96,
      72,
      2,
      'stone',
      'plaster',
      'kazimierz',
    ),
  ];
  for (let i = 0; i < 8; i++) {
    blocks.push(
      block(
        `rynek-kamienica-${i}`,
        1330 + i * 100,
        272,
        79 + (i % 3) * 4,
        70,
        3 + (i % 3),
        i % 3 === 0 ? 'copper' : 'tile',
        i % 2 === 0 ? 'sand' : 'plaster',
      ),
    );
    blocks.push(
      block(
        `kazimierz-kamienica-${i}`,
        2732 + i * 135,
        1640,
        96,
        56,
        2 + (i % 3),
        'tile',
        i % 2 === 0 ? 'brick' : 'plaster',
      ),
    );
  }
  const props = [
    prop('przystanek-wiata', 'shelter', 2598, 790, 1),
    prop('rynek-kwiaty', 'kiosk', 1352, 630),
    prop('wawel-stojak', 'bike-rack', 1784, 1630),
    prop('kazimierz-targ-budka', 'kiosk', 3392, 1512),
    prop('kazimierz-targ-kawiarnia', 'cafe', 3552, 1550),
    prop('kopiec-tablica', 'kiosk', 2840, 2770),
  ];
  for (let i = 0; i < 7; i++) {
    props.push(prop(`rynek-latarnia-${i}`, 'lamp', 1392 + i * 112, 680));
    props.push(prop(`bulwary-latarnia-${i}`, 'lamp', 2672 + i * 168, 2195));
    props.push(prop(`bulwary-lawka-${i}`, 'bench', 2728 + i * 158, 2185));
    props.push(prop(`wawel-drzewo-${i}`, 'tree', 1350 + i * 124, 1688));
    props.push(
      prop(`kopiec-drzewo-${i}`, 'tree', 2736 + i * 138, 2944 + (i % 2) * 48),
    );
  }
  for (let i = 0; i < 8; i++) {
    props.push(prop(`aleja-polnoc-${i}`, 'lamp', 512 + i * 522, 986));
    props.push(prop(`aleja-poludnie-${i}`, 'lamp', 512 + i * 522, 1192));
    props.push(prop(`planty-${i}`, 'tree', 1248 + i * 132, 915 - (i % 2) * 40));
  }
  const districts = [
    rect('rynek', 1216, 256, 992, 704),
    rect('wawel', 1248, 1312, 960, 448, {
      unlock: 'KRA-B-01',
      gateX: 1728,
      gateY: 1312,
    }),
    rect('kazimierz', 2688, 1216, 1152, 528, {
      unlock: 'KRA-B-01',
      gateX: 3152,
      gateY: 1216,
    }),
    rect('bulwary', 2592, 2112, 1280, 192, {
      unlock: 'KRA-B-02',
      gateX: 2592,
      gateY: 2240,
      gateVertical: true,
    }),
    rect('kopiec', 2688, 2752, 1088, 320, {
      unlock: 'KRA-B-03',
      gateX: 2848,
      gateY: 2752,
    }),
  ];
  const pois = [
    rect('krk-rynek-start', 1416, 744, 48, 48, { heading: -Math.PI / 2 }),
    rect('krk-sukiennice', 1600, 610, 72, 52),
    rect('krk-meta-rynek', 1760, 744, 72, 48),
    rect('krk-kazimierz-start', 3128, 1544, 48, 48, { heading: -Math.PI / 2 }),
    rect('krk-kontrapas', 3136, 1376, 32, 48),
    rect('krk-przed-przejazdem', 2752, 1168, 64, 48),
    rect('krk-aleja', 2752, 876, 64, 48),
    rect('krk-bulwary-start', 2610, 2216, 48, 48),
    rect('krk-pomoc', 2908, 2220, 48, 42),
    rect('krk-bulwary-meta', 3220, 2216, 48, 48),
  ];
  const retainingWall = [1374, 1566, 552, 38] as const;
  const collisions = [
    rect('wawel-mur-oporowy', ...retainingWall, { kind: 'wall' }),
    rect('smok-cokol', 1598, 1618, 62, 32, { kind: 'wall' }),
    rect('kopiec-zbocze', 3088, 2760, 252, 58, { kind: 'wall' }),
  ];
  const map_decorations = [
    decor('wawel-mur-oporowy', ...retainingWall),
    decor('smok-wawelski', 1628, 1633),
    decor('kopiec', 3216, 2790),
    decor('fountain', 2126, 628),
    ...[2768, 2944, 3104, 3280, 3456, 3632].map((x) =>
      decor('river-steps', x, 2090),
    ),
  ];
  return { blocks, props, districts, pois, collisions, map_decorations };
}
