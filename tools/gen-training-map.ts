import { mkdir, writeFile } from 'node:fs/promises';
const columns = [12, 38, 64];
const rows = [16, 40];
const width = 80,
  height = 60;
const ground: number[] = [],
  markings: number[] = [];
for (let y = 0; y < height; y++)
  for (let x = 0; x < width; x++) {
    const vertical = columns.some((a) => x >= a && x < a + 6);
    const horizontal = rows.some((a) => y >= a && y < a + 6);
    const sidewalk =
      [11, 18, 37, 44, 63, 70].includes(x) ||
      [15, 22, 39, 46].includes(y) ||
      (y === 47 && x >= 46 && x < 62);
    const cycleway = x === 19 && y >= 22 && y < 40;
    ground.push(vertical || horizontal ? 2 : cycleway ? 2 : sidewalk ? 3 : 1);
    markings.push(
      vertical && !horizontal && [14, 40, 66].includes(x)
        ? 7
        : horizontal && !vertical && [18, 42].includes(y)
          ? 8
          : 0,
    );
  }
let id = 1;
const rect = (
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
  properties: Record<string, string | number | boolean> = {},
) => ({
  id: id++,
  name,
  type: '',
  x,
  y,
  width: w,
  height: h,
  rotation: 0,
  visible: true,
  properties: Object.entries(properties).map(([name, value]) => ({
    name,
    type:
      typeof value === 'number'
        ? 'float'
        : typeof value === 'boolean'
          ? 'bool'
          : 'string',
    value,
  })),
});
const blocks = [
  rect('workshop', 640, 768, 160, 96, {
    height: 2,
    roof: 'roof',
    wall: 'wall',
    landmarkId: 'workshop',
  }),
  rect('school', 736, 192, 256, 160, { height: 4, roof: 'roof', wall: 'wall' }),
  rect('block-west', 160, 800, 160, 256, {
    height: 7,
    roof: 'roof',
    wall: 'wall',
  }),
  rect('block-north', 64, 192, 224, 192, {
    height: 5,
    roof: 'roof',
    wall: 'wall',
  }),
  rect('tower', 1600, 800, 128, 160, {
    height: 14,
    roof: 'roof',
    wall: 'wall',
  }),
  rect('block-east', 1792, 192, 160, 256, {
    height: 8,
    roof: 'roof',
    wall: 'wall',
  }),
  rect('south-school', 736, 1600, 256, 160, {
    height: 3,
    roof: 'roof',
    wall: 'wall',
  }),
  rect('south-east', 1696, 1600, 256, 128, {
    height: 5,
    roof: 'roof',
    wall: 'wall',
  }),
];
for (const [size, floors] of [
  [192, 4],
  [128, 10],
  [80, 18],
  [40, 26],
  [8, 32],
]) {
  blocks.push(
    rect(
      'palace-tier-' + floors,
      928 - size! / 2,
      1024 - size! / 2,
      size!,
      size!,
      {
        height: floors!,
        roof: 'roof',
        wall: 'wall',
        landmarkId: 'palace-test',
      },
    ),
  );
}
// Curbs leave wide lowered sections at each crossing. Raised curbs slow riding; lowered sections have no resistance.
const curbs = [];
for (const x of [384, 576, 1216, 1408, 2048, 2240])
  for (const [a, b] of [
    [32, 448],
    [768, 1184],
    [1568, 1888],
  ])
    curbs.push(rect('curb', x - 3, a!, 6, b! - a!, { kind: 'curb' }));
for (const y of [512, 704, 1280, 1472])
  for (const [a, b] of [
    [32, 320],
    [640, 1152],
    [1472, 1984],
    [2304, 2528],
  ])
    curbs.push(rect('curb', a!, y - 3, b! - a!, 6, { kind: 'curb' }));
const layers: unknown[] = [
  {
    id: 1,
    name: 'ground',
    type: 'tilelayer',
    width,
    height,
    x: 0,
    y: 0,
    opacity: 1,
    visible: true,
    data: ground,
  },
  {
    id: 2,
    name: 'markings',
    type: 'tilelayer',
    width,
    height,
    x: 0,
    y: 0,
    opacity: 1,
    visible: true,
    data: markings,
  },
];
function objectLayer(name: string, objects: unknown[]) {
  layers.push({
    id: layers.length + 1,
    name,
    type: 'objectgroup',
    opacity: 1,
    visible: true,
    x: 0,
    y: 0,
    objects,
  });
}
objectLayer('blocks', blocks);
objectLayer('collisions', curbs);
objectLayer('spawns', [
  rect('player', 512, 1024, 0, 0),
  rect('car-equal', 939, 560, 0, 0, {
    kind: 'car',
    laneId: 'equal-E',
    speed: 4,
    start_m: -17,
  }),
  rect('car-yield', 960, 656, 0, 0, {
    kind: 'car',
    laneId: 'yield-W',
    speed: 4,
    start_m: -12,
  }),
  rect('car-stop', 213, 1424, 0, 0, {
    kind: 'car',
    laneId: 'stop-W',
    speed: 4,
    start_m: -8,
  }),
  rect('pedestrian-zebra', 656, 721, 0, 0, {
    kind: 'pedestrian',
    heading: -90,
    speed: 1.2,
    length_m: 10.5,
  }),
  rect('pedestrian-sidewalk', 1540, 1516, 0, 0, {
    kind: 'pedestrian',
    heading: 0,
    speed: 1.1,
    length_m: 17,
  }),
]);
objectLayer('pois', [rect('workshop', 688, 896, 0, 0)]);
const zones = [
  ...columns.map((x) =>
    rect(`road-ns-${x}`, x * 32, 0, 192, 1920, { kind: 'roadway' }),
  ),
  ...rows.map((y) =>
    rect(`road-ew-${y}`, 0, y * 32, 2560, 192, { kind: 'roadway' }),
  ),
  ...columns.flatMap((x) =>
    [x - 1, x + 6].map((side) =>
      rect(`sidewalk-ns-${side}`, side * 32, 0, 32, 1920, {
        kind: 'sidewalk',
        width_m: 1.5,
        speedLimit: 50,
      }),
    ),
  ),
  ...rows.flatMap((y) =>
    [y - 1, y + 6].map((side) =>
      rect(`sidewalk-ew-${side}`, 0, side * 32, 2560, 32, {
        kind: 'sidewalk',
        width_m: 1.5,
        speedLimit: 50,
      }),
    ),
  ),
  rect('sidewalk-wide', 1472, 1472, 512, 64, {
    kind: 'sidewalk',
    width_m: 3,
    speedLimit: 60,
  }),
  rect('ddr-west', 608, 704, 32, 576, { kind: 'bike_path', direction: 'N' }),
];
const intersections = [];
const lanes = [];
const signs = [];
const signals = [];
for (const [row, rowTile] of rows.entries()) {
  for (const [column, columnTile] of columns.entries()) {
    const x = columnTile * 32;
    const y = rowTile * 32;
    const name =
      row === 0
        ? ['equal', 'yield', 'lights'][column]!
        : ['stop', 'south-central', 'south-east'][column]!;
    const controlled = name === 'yield' || name === 'stop';
    const kind = controlled
      ? 'priority'
      : name === 'lights'
        ? 'signals'
        : 'equal';
    intersections.push(rect(name, x, y, 192, 192, { kind }));
    // Oriented centre lines end at the stop line of the right-hand traffic lane.
    const approaches = [
      { side: 'N', x: x + 48, y, dx: 0, dy: 1, length: row === 0 ? 512 : 576 },
      { side: 'E', x: x + 192, y: y + 48, dx: -1, dy: 0, length: 320 },
      {
        side: 'S',
        x: x + 144,
        y: y + 192,
        dx: 0,
        dy: -1,
        length: row === 1 ? 448 : 576,
      },
      {
        side: 'W',
        x,
        y: y + 144,
        dx: 1,
        dy: 0,
        length: column === 0 ? 384 : 320,
      },
    ];
    for (const { side, x: endX, y: endY, dx, dy, length } of approaches) {
      const id = `${name}-${side}`;
      const vertical = dx === 0;
      const priorityClass = controlled
        ? vertical
          ? 'minor'
          : 'main'
        : kind === 'signals'
          ? 'signal'
          : 'equal';
      lanes.push({
        ...rect(id, endX - dx * length, endY - dy * length, 0, 0, {
          intersection: name,
          side,
          priorityClass,
          type: 'car',
          width_px: 96,
          speedLimit:
            row === 1 && side === 'E' && name === 'south-central' ? 60 : 50,
          ...(name === 'equal' && side === 'S'
            ? { parallelBikeInfra: 'ddr-west' }
            : {}),
        }),
        polyline: [
          { x: 0, y: 0 },
          { x: dx * length, y: dy * length },
        ],
      });
      const signX = endX - 60 * dy - 20 * dx;
      const signY = endY + 60 * dx - 20 * dy;
      if (controlled) {
        const code = vertical ? (name === 'stop' ? 'B-20' : 'A-7') : 'D-1';
        signs.push(
          rect(`${id}-${code}`, signX, signY, 0, 0, {
            code,
            affects: id,
            facing: side,
          }),
        );
      }
      if (kind === 'signals') {
        const group = vertical ? 'NS' : 'EW';
        const offset_s = vertical ? 0 : 10;
        signals.push(
          rect(`${id}-S-1`, signX, signY, 0, 0, {
            code: 'S-1',
            affects: id,
            group,
            offset_s,
            cycle_s: 20,
            green_s: 7,
            yellow_s: 2,
          }),
        );
        if (side === 'S')
          signals.push(
            rect(`${id}-S-2`, signX + 20, signY, 0, 0, {
              code: 'S-2',
              affects: id,
              group,
              from_s: 13,
              until_s: 16,
              direction: 'right',
            }),
          );
      }
    }
  }
}
const crossings = [
  rect('zebra-west', 640, 512, 32, 192, { kind: 'pedestrian', axis: 'y' }),
  rect('ddr-crossing', 608, 512, 32, 192, { kind: 'bike', axis: 'y' }),
];
objectLayer('zones', zones);
objectLayer('lanes', lanes);
objectLayer('intersections', intersections);
objectLayer('signs', signs);
objectLayer('signals', signals);
objectLayer('crossings', crossings);
for (const name of ['props', 'triggers', 'districts', 'collectibles'])
  objectLayer(name, []);
await mkdir('maps', { recursive: true });
await writeFile(
  'maps/miasteczko.tmj',
  JSON.stringify(
    {
      type: 'map',
      version: '1.10',
      tiledversion: '1.11.2',
      orientation: 'orthogonal',
      renderorder: 'right-down',
      infinite: false,
      width,
      height,
      tilewidth: 32,
      tileheight: 32,
      nextlayerid: layers.length + 1,
      nextobjectid: id,
      layers,
      tilesets: [
        {
          firstgid: 1,
          name: 'training',
          tilewidth: 32,
          tileheight: 32,
          tilecount: 8,
          columns: 8,
          image: '../assets/generated/tiles.png',
          imagewidth: 256,
          imageheight: 32,
          margin: 0,
          spacing: 0,
        },
      ],
    },
    null,
    2,
  ) + '\n',
);
