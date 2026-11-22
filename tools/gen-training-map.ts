import { tiledMap } from './tiled-map.ts';
import { tileTerrain, type Surface } from './tile-terrain.ts';
import { tiles } from '../src/render/artFrames.ts';
const columns = [12, 38, 64];
const rows = [16, 40];
const width = 80,
  height = 60;
const surfaces: Surface[] = [],
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
    const workshopYard = x >= 55 && x < 61 && y >= 27 && y < 34;
    const gravelYard = x >= 22 && x < 25 && y >= 27 && y < 29;
    surfaces.push(
      vertical || horizontal
        ? 'asphalt'
        : cycleway
          ? 'bike'
          : workshopYard
            ? 'cobble'
            : gravelYard
              ? 'gravel'
              : sidewalk
                ? 'sidewalk'
                : 'grass',
    );
    const nearJunction = vertical
      ? rows.some((row) => y === row - 1 || y === row + 6)
      : columns.some((col) => x === col - 1 || x === col + 6);
    markings.push(
      vertical && !horizontal && [15, 41, 67].includes(x)
        ? nearJunction
          ? tiles.solidVertical
          : tiles.dashVertical
        : horizontal && !vertical && [19, 43].includes(y)
          ? nearJunction
            ? tiles.solidHorizontal
            : tiles.dashHorizontal
          : 0,
    );
  }
const { rect, polyline, objectLayer, write } = tiledMap(width, height);
const blocks = [
  rect('workshop', 640, 768, 160, 96, {
    height: 2,
    roof: 'felt',
    wall: 'concrete',
    landmarkId: 'workshop',
  }),
  rect('school', 736, 192, 256, 160, { height: 4, roof: 'tile', wall: 'sand' }),
  rect('block-west', 160, 800, 160, 256, {
    height: 7,
    roof: 'felt',
    wall: 'plaster',
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
    [y <= 704 ? 2392 : 2352, 2528],
  ])
    curbs.push(rect('curb', a!, y - 3, b! - a!, 6, { kind: 'curb' }));
objectLayer('blocks', blocks);
objectLayer('collisions', curbs);
objectLayer('spawns', [
  rect('player', 512, 1024, 0, 0),
  rect('cyclist-roadway', 432, 0, 0, 0, {
    kind: 'roadway_cyclist',
    lane: 'equal-N',
  }),
]);
const pois = [rect('workshop', 688, 896, 0, 0)];
objectLayer('pois', pois);
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
  rect('ddr-west-north', 608, 0, 32, 512, {
    kind: 'bike_path',
    direction: 'N',
  }),
  rect('ddr-west-south', 608, 1472, 32, 448, {
    kind: 'bike_path',
    direction: 'N',
  }),
  rect('bike-lane-top', 0, 520, 2560, 22, {
    kind: 'bike_lane',
    direction: 'W',
  }),
  rect('ddr-west', 608, 704, 32, 576, { kind: 'bike_path', direction: 'N' }),
];
const intersections = [];
const lanes = [];
const signs = [];
const signals = [];
const names = [
  ['equal', 'yield', 'lights'],
  ['stop', 'south-central', 'south-east'],
];
for (const [row, rowTile] of rows.entries()) {
  for (const [column, columnTile] of columns.entries()) {
    const x = columnTile * 32;
    const y = rowTile * 32;
    const name = names[row]![column]!;
    const controlled = name === 'yield' || name === 'stop';
    const kind = controlled
      ? 'priority'
      : name === 'lights'
        ? 'signals'
        : 'equal';
    intersections.push(rect(name, x, y, 192, 192, { kind }));
    // Oriented centre lines end at the stop line of the right-hand traffic lane.
    const approaches = [
      {
        side: 'N',
        x: x + 48,
        y,
        dx: 0,
        dy: 1,
        length: row === 0 ? y : 576,
        upstream: names[row - 1]?.[column],
      },
      {
        side: 'E',
        x: x + 192,
        y: y + 48,
        dx: -1,
        dy: 0,
        length: columns[column + 1] === undefined ? width * 32 - x - 192 : 640,
        upstream: names[row]?.[column + 1],
      },
      {
        side: 'S',
        x: x + 144,
        y: y + 192,
        dx: 0,
        dy: -1,
        length: row === 1 ? height * 32 - y - 192 : 576,
        upstream: names[row + 1]?.[column],
      },
      {
        side: 'W',
        x,
        y: y + 144,
        dx: 1,
        dy: 0,
        length: column === 0 ? x : 640,
        upstream: names[row]?.[column - 1],
      },
    ] as const;
    for (const {
      side,
      x: endX,
      y: endY,
      dx,
      dy,
      length,
      upstream,
    } of approaches) {
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
          turns: 'straight,left,right',
          ...(upstream
            ? {
                from: `${upstream}-${{ N: 'S', E: 'W', S: 'N', W: 'E' }[side]}`,
              }
            : {}),
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
      if (!upstream) {
        // Outgoing lanes at the map boundary have no next approach.
        const exitX = dx === 0 ? 2 * (x + 96) - endX : endX;
        const exitY = dy === 0 ? 2 * (y + 96) - endY : endY;
        lanes.push({
          ...rect(`${id}-out`, exitX, exitY, 0, 0, {
            role: 'exit',
            intersection: name,
            side,
            speedLimit: 50,
          }),
          polyline: [
            { x: 0, y: 0 },
            { x: -dx * length, y: -dy * length },
          ],
        });
      }
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
const bikeLaneCrossings = columns.map((column, index) =>
  rect(`cycle-lane-${names[0]![index]}`, column * 32, 520, 192, 22, {
    kind: 'bike',
    axis: 'x',
  }),
);
const crossings = [
  rect('zebra-west', 640, 512, 32, 192, {
    kind: 'pedestrian',
    axis: 'y',
    trafficGroup: 'crossings-west',
  }),
  rect('zebra-lights', 2344, 512, 32, 192, { kind: 'pedestrian', axis: 'y' }),
  rect('ddr-crossing', 608, 512, 32, 192, {
    kind: 'bike',
    axis: 'y',
    trafficGroup: 'crossings-west',
  }),
  rect('ddr-crossing-south', 608, 1280, 32, 192, { kind: 'bike', axis: 'y' }),
  rect('cycle-lane-zebra', 608, 520, 64, 22, { kind: 'bike', axis: 'x' }),
  rect('cycle-lane-lights-zebra', 2344, 520, 32, 22, {
    kind: 'bike',
    axis: 'x',
  }),
  ...bikeLaneCrossings,
];
const tramPoints: [number, number][] = [
  [0, 608],
  [384, 608],
  [576, 608],
  // Leave room for the front of the 15 m tram before the next junction.
  [1040, 608],
  [1216, 608],
  [1408, 608],
  [2048, 608],
  [2240, 608],
  [2560, 608],
];
const emergencyPoints: [number, number][] = [
  [0, 1396],
  [384, 1396],
  [576, 1396],
  [1216, 1396],
  [1408, 1396],
  [2048, 1396],
  [2240, 1396],
  [2560, 1396],
];
for (const [index, vertex] of [1, 4, 6].entries()) {
  const name = names[0]![index]!;
  const lane = `tram-${name}-W`;
  lanes.push(
    polyline(lane, [tramPoints[vertex - 1]!, tramPoints[vertex]!], {
      intersection: name,
      side: 'W',
      type: 'tram',
      width_px: 52,
      speedLimit: 35,
      priorityClass: ['equal', 'main', 'signal'][index]!,
    }),
  );
  if (name === 'lights') {
    signals.push(
      rect('tram-signal', 2028, 608, 0, 0, {
        code: 'S-1',
        affects: lane,
        group: 'EW',
        offset_s: 10,
        cycle_s: 20,
        green_s: 7,
        yellow_s: 2,
      }),
    );
  }
}
objectLayer('traffic_routes', [
  polyline(
    'pedestrian-zebra',
    [
      [656, 721],
      [656, 494],
    ],
    { kind: 'pedestrian', speed: 1.45 },
  ),
  polyline(
    'pedestrian-lights',
    [
      [2360, 721],
      [2360, 495],
    ],
    { kind: 'pedestrian', speed: 1.5 },
  ),
  polyline(
    'pedestrian-sidewalk',
    [
      [1540, 1516],
      [1900, 1516],
    ],
    { kind: 'pedestrian', speed: 1.1 },
  ),
  polyline(
    'cyclist-ddr',
    [
      [624, 1920],
      [624, 0],
    ],
    { kind: 'cyclist', speed: 4.5 },
  ),
  polyline(
    'cyclist-bike-lane',
    [
      [2560, 531],
      [0, 531],
    ],
    { kind: 'cyclist', speed: 4.2 },
  ),
  polyline('tram-1', tramPoints, { kind: 'tram', speed: 7, repeat_s: 6 }),
  polyline(
    'tram-passenger',
    [
      [1040, 639],
      [1040, 720],
    ],
    { kind: 'passenger', speed: 1.5 },
  ),
  polyline('emergency-1', emergencyPoints, {
    kind: 'emergency',
    speed: 9,
    start_s: 4,
    repeat_s: 42,
  }),
]);
objectLayer('traffic_controls', [
  ...[1, 4, 6].map((vertex, index) =>
    rect(`tram-control-${index}`, 0, 0, 0, 0, {
      kind: 'junction',
      route: 'tram-1',
      vertex,
      exit: vertex + 1,
      lane: `tram-${names[0]![index]}-W`,
    }),
  ),
  ...[1, 3, 5].map((vertex, index) =>
    rect(`emergency-control-${index}`, 0, 0, 0, 0, {
      kind: 'junction',
      route: 'emergency-1',
      vertex,
      exit: vertex + 1,
      lane: `${names[1]![index]}-W`,
    }),
  ),
  rect('stop-without-island', 1016, 634, 48, 70, {
    kind: 'stop',
    route: 'tram-1',
    vertex: 3,
    passenger: 'tram-passenger',
  }),
]);
objectLayer('crossing_signals', [
  rect('pedestrian-signal', 2378, 719, 0, 0, {
    crossing: 'zebra-lights',
    offset_s: 18,
    cycle_s: 20,
    green_s: 3.5,
  }),
  rect('bike-signal', 2244, 514, 0, 0, {
    crossing: 'cycle-lane-lights',
    offset_s: 10,
    cycle_s: 20,
    green_s: 5,
  }),
]);
objectLayer('zones', zones);
objectLayer('lanes', lanes);
objectLayer('intersections', intersections);
objectLayer('signs', signs);
objectLayer('signals', signals);
crossings.push(
  rect('rail-crossing', 2048, 1664, 192, 48, {
    kind: 'rail',
    axis: 'y',
    open_s: 12,
    lowering_s: 2,
    closed_s: 5,
    raising_s: 2,
  }),
);
objectLayer('crossings', crossings);
const props: ReturnType<typeof rect>[] = [];
objectLayer('props', props);
for (const name of ['triggers', 'districts', 'collectibles'])
  objectLayer(name, []);
objectLayer('driveways', [
  rect('training-driveway', 1112, 1450, 44, 82, { direction: 'N' }),
]);
objectLayer('parked_cars', [rect('parked-training', 940, 1284, 56, 24)]);
pois.push(
  rect('tutorial_start', 424, 928, 0, 0, { heading: Math.PI / 2 }),
  rect('tutorial_jazda', 409, 1050, 30, 30),
  rect('tutorial_przed_stop', 409, 1184, 30, 30, { heading: Math.PI / 2 }),
  rect('tutorial_meta', 409, 1510, 30, 30),
);
pois.push(
  rect('garaz_start', 1790, 956, 0, 0, { heading: Math.PI / 2 }),
  rect('garaz_objazd', 1763, 1030, 62, 55),
  rect('garaz_meta', 1883, 1023, 56, 63),
);
blocks.push(
  rect('garaz-kazika', 1760, 768, 192, 96, { height: 2, tint: 0x8dc6ad }),
);
for (const [kind, x, y, turn = 0] of [
  ['tree', 331, 742],
  ['tree', 718, 723],
  ['tree', 815, 780],
  ['tree', 296, 1062],
  ['tree', 155, 765],
  ['tree', 708, 472],
  ['tree', 765, 463],
  ['tree', 1000, 742],
  ['tree', 1740, 940],
  ['tree', 2000, 449],
  ['tree', 1450, 1534],
  ['lamp', 691, 707],
  ['lamp', 590, 485, 2],
  ['lamp', 579, 787, 2],
  ['lamp', 326, 713],
  ['lamp', 1379, 707],
  ['lamp', 2264, 479, 2],
  ['bench', 758, 737],
  ['bench', 699, 948, 1],
  ['bin', 790, 738],
  ['bin', 689, 971],
  ['bollard', 717, 699],
  ['bollard', 717, 710],
  ['shelter', 1050, 719],
  ['lamp', 1020, 719],
  ['bin', 1080, 720],
] as const)
  props.push(rect(`prop-${kind}-${x}-${y}`, x, y, 0, 0, { kind, turn }));
await write('miasteczko', 14, tileTerrain(width, height, surfaces), markings, {
  duskAt: 90,
});
