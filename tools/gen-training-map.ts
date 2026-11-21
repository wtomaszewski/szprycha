import { mkdir, writeFile } from 'node:fs/promises';
const width = 80,
  height = 60;
const ground: number[] = [],
  markings: number[] = [];
for (let y = 0; y < height; y++)
  for (let x = 0; x < width; x++) {
    const vertical = [12, 38, 64].some((a) => x >= a && x < a + 6);
    const horizontal = [16, 40].some((a) => y >= a && y < a + 6);
    const sidewalk =
      [11, 18, 37, 44, 63, 70].includes(x) || [15, 22, 39, 46].includes(y);
    ground.push(vertical || horizontal ? 2 : sidewalk ? 3 : 1);
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
objectLayer('spawns', [rect('player', 512, 1024, 0, 0)]);
objectLayer('pois', [rect('workshop', 688, 896, 0, 0)]);
objectLayer('zones', [
  rect('training', 0, 0, 2560, 1920, { kind: 'training' }),
]);
for (const name of [
  'props',
  'lanes',
  'intersections',
  'signs',
  'signals',
  'crossings',
  'triggers',
  'districts',
  'collectibles',
])
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
