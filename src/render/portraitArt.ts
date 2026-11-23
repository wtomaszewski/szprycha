import type { portraitEmotions } from '../content/dialogues.ts';
import type { PixelTile } from './PixelTile.ts';

type PortraitEmotion = (typeof portraitEmotions)[number];

export const portraitSize = 64;
const cream = 0xf0dca8;
const amber = 0xfeae34;
const terracotta = 0xa65e46;
const umber = 0x5a3a2e;
const shadow = 0x333c57;
const steel = 0xc0cbdc;
const ink = 0x1a1c2c;
const paper = 0xf4f4f4;
const gold = 0xffcd75;
const gray = 0x94b0c2;
const tan = 0xe8c39e;
const coral = 0xef7d57;
const brown = 0xd98a5a;

type Headwear = 'helmet' | 'cap' | 'hair' | 'bun' | 'bell' | 'headphones';
export interface PortraitDesign {
  backdrop: number;
  shirt: number;
  hair: number;
  skin: number;
  style: Headwear;
  glasses?: boolean;
  beard?: boolean;
  age?: 'young' | 'older';
  face?: number;
  hat?: number;
  hatLight?: number;
  hairstyle?: 'swept' | 'curly';
  headwear?: 'cap' | 'beanie';
  garment?: 'jacket' | 'pullover';
  skinTones?: readonly [shade: number, light: number, deepShade: number];
  hairLight?: number;
}

type Point = readonly [number, number];

function polygon(tile: PixelTile, points: readonly Point[], color: number) {
  for (let y = 0; y < portraitSize; y++) {
    const intersections: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i]!;
      const [x2, y2] = points[(i + 1) % points.length]!;
      const scan = y + 0.5;
      if (scan < y1 !== scan < y2)
        intersections.push(x1 + ((scan - y1) * (x2 - x1)) / (y2 - y1));
    }
    intersections.sort((a, b) => a - b);
    for (let i = 0; i < intersections.length; i += 2) {
      const left = Math.ceil(intersections[i]! - 0.5);
      const right = Math.ceil(intersections[i + 1]! - 0.5);
      tile.rect(left, y, right - left, 1, color);
    }
  }
}

export function drawPortrait(
  tile: PixelTile,
  emotion: PortraitEmotion,
  design: PortraitDesign,
) {
  const { backdrop, shirt, hair, skin, style, glasses, beard, age } = design;
  const [faceShade, faceLight, deepShade] =
    design.skinTones ??
    (skin === tan ? [brown, cream, terracotta] : [terracotta, tan, umber]);
  const hairLight = design.hairLight ?? gray;
  const cut = design.face ?? 0;
  const chin = 44 - Number(age === 'young') * 2;
  const paint = (points: readonly Point[], color: number) =>
    polygon(tile, points, color);
  tile.rect(0, 0, 64, 64, ink);
  tile.rect(2, 2, 60, 60, backdrop);
  tile.oval(5, 4, 42, 49, shadow);
  tile.rect(3, 58, 58, 3, shadow);

  paint(
    [
      [4, 62],
      [8, 54],
      [14, 50],
      [25, 46],
      [39, 46],
      [51, 50],
      [56, 55],
      [60, 62],
    ],
    ink,
  );
  paint(
    [
      [7, 62],
      [11, 55],
      [21, 51],
      [28, 48],
      [38, 48],
      [49, 52],
      [54, 55],
      [57, 62],
    ],
    shirt,
  );
  paint(
    [
      [32, 52],
      [43, 49],
      [52, 54],
      [57, 62],
      [43, 62],
      [43, 57],
    ],
    backdrop,
  );
  paint(
    [
      [8, 61],
      [13, 55],
      [23, 52],
      [20, 56],
      [14, 59],
      [14, 62],
    ],
    gray,
  );
  tile.line(17, 59, 18, 62, ink);
  tile.line(49, 58, 50, 62, ink);
  paint(
    [
      [25, 41],
      [40, 41],
      [40, 49],
      [39, 53],
      [34, 56],
      [29, 55],
      [24, 51],
    ],
    ink,
  );
  paint(
    [
      [26, 41],
      [38, 42],
      [38, 50],
      [33, 54],
      [26, 50],
    ],
    faceShade,
  );
  paint(
    [
      [26, 46],
      [33, 48],
      [32, 52],
      [26, 50],
    ],
    skin,
  );
  tile.line(26, 52, 32, 56, ink);
  tile.line(32, 56, 41, 51, ink);
  if (design.garment === 'jacket') {
    tile.line(22, 52, 28, 59, ink);
    tile.line(28, 59, 30, 57, ink);
    tile.line(44, 53, 39, 58, ink);
    tile.line(39, 58, 36, 56, ink);
    tile.rect(32, 57, 2, 5, ink);
    tile.rect(33, 57, 1, 1, steel);
  } else if (design.garment === 'pullover') {
    tile.line(22, 52, 31, 58, ink, 2);
    tile.line(32, 58, 42, 52, ink, 2);
    tile.line(9, 60, 23, 60, faceLight);
    tile.line(44, 60, 55, 60, faceLight);
  }
  if (style === 'helmet') {
    tile.line(19, 53, 23, 60, ink, 2);
    tile.line(43, 52, 40, 61, ink, 2);
    tile.rect(24, 59, 15, 1, gold);
  }

  if (style === 'bun') {
    tile.oval(29, 3, 18, 16, ink);
    tile.oval(30, 4, 15, 12, hair);
    tile.line(33, 6, 38, 5, hairLight);
  }
  tile.oval(15 + cut, 9, 33 - cut, 35, ink);
  tile.oval(16 + cut, 10, 30 - cut, 29, hair);
  tile.oval(15 + cut, 25, 9, 13, ink);
  tile.oval(16 + cut, 26, 7, 11, faceShade);
  tile.rect(18 + cut, 29, 2, 4, deepShade);
  tile.rect(18 + cut, 28, 2, 1, skin);
  paint(
    [
      [19 + cut, 20],
      [29, 15],
      [42, 18],
      [47, 25],
      [47, 34],
      [43 - cut, chin],
      [38, chin + 3],
      [30, chin + 3],
      [24 + cut, chin - 2],
      [20 + cut, 37],
    ],
    ink,
  );
  paint(
    [
      [21 + cut, 21],
      [29, 17],
      [41, 19],
      [46, 26],
      [46, 34],
      [42 - cut, chin],
      [37, chin + 2],
      [31, chin + 2],
      [25 + cut, chin - 2],
      [21 + cut, 36],
    ],
    skin,
  );
  paint(
    [
      [39, 20],
      [45, 24],
      [46, 28],
      [45, 35],
      [42 - cut, chin],
      [37, chin + 2],
      [31, chin + 2],
      [27, chin - 1],
      [34, chin],
      [39, chin - 2],
      [41, 36],
      [43, 32],
      [42, 28],
    ],
    faceShade,
  );
  paint(
    [
      [23 + cut, 24],
      [29, 21],
      [34, 22],
      [33, 25],
      [28, 26],
      [25 + cut, 31],
      [26 + cut, 35],
      [24 + cut, 34],
    ],
    faceLight,
  );
  paint(
    [
      [19 + cut, 20],
      [22, 13],
      [31, 11],
      [43, 15],
      [45, 22],
      [39, 19],
      [30, 18],
      [25, 21],
      [23 + cut, 27],
      [20 + cut, 29],
    ],
    hair,
  );
  tile.line(24, 15, 31, 12, hairLight);
  tile.line(24, 18, 28, 16, hairLight);
  if (style === 'hair') {
    paint(
      [
        [16, 19],
        [20, 11],
        [25, 9],
        [33, 8],
        [42, 12],
        [45, 18],
        [36, 14],
        [28, 16],
        [22, 22],
        [20, 27],
      ],
      hair,
    );
    tile.line(22, 14, 30, 11, hairLight);
    tile.line(23, 17, 28, 14, hairLight);
  }

  if (design.hairstyle === 'swept') {
    paint(
      [
        [15, 20],
        [18, 12],
        [27, 8],
        [35, 9],
        [44, 15],
        [42, 21],
        [38, 19],
        [30, 18],
        [25, 22],
        [22, 24],
        [20, 30],
        [15, 34],
      ],
      ink,
    );
    paint(
      [
        [16, 20],
        [20, 13],
        [28, 9],
        [35, 10],
        [43, 15],
        [40, 19],
        [31, 16],
        [24, 21],
        [20, 27],
        [16, 31],
      ],
      hair,
    );
    tile.line(20, 16, 29, 11, hairLight);
    tile.line(19, 20, 24, 16, hairLight);
  } else if (design.hairstyle === 'curly') {
    for (const [x, y] of [
      [16, 15],
      [19, 10],
      [24, 8],
      [29, 7],
      [34, 8],
      [39, 11],
      [15, 21],
      [20, 16],
      [25, 13],
      [31, 12],
      [36, 14],
    ] as const) {
      tile.oval(x, y, 9, 9, ink);
      tile.oval(x + 1, y + 1, 7, 7, hair);
      tile.rect(x + 2, y + 2, 2, 1, hairLight);
    }
  }

  const surprised = emotion === 'surprised';
  const happy = emotion === 'happy';
  const worried = emotion === 'worried';
  const proud = emotion === 'proud';
  const browY = surprised ? 23 : 25;
  tile.line(26, browY + Number(worried), 31, browY - Number(worried), hair);
  tile.line(
    37,
    browY - Number(worried || proud),
    42,
    browY + Number(worried),
    hair,
  );
  for (const x of [27, 38]) {
    const upper = happy ? 29 : surprised ? 27 : 28;
    const height = happy ? 2 : surprised ? 5 : 3;
    tile.bevel(x - 1, upper - 1, 7, height + 2, deepShade);
    tile.rect(x, upper, 5, height, paper);
    tile.rect(x + 2, upper, 2, height, ink);
    if (happy) tile.rect(x + 1, upper - 1, 3, 1, ink);
    if (age === 'older') tile.line(x, 33, x + 3, 34, faceShade);
  }
  paint(
    [
      [34, 29],
      [36, 34],
      [39, 36],
      [36, 37],
      [32, 36],
    ],
    faceShade,
  );
  tile.line(33, 34, 32, 35, faceLight);
  tile.rect(34, 36, 3, 1, deepShade);
  tile.rect(26, 35, 4, 1, faceLight);
  if (age === 'older') {
    tile.line(27, 37, 26, 40, faceShade);
    tile.line(41, 36, 41, 39, deepShade);
  }
  if (beard) {
    paint(
      [
        [22 + cut, 32],
        [26 + cut, 37],
        [31, 37],
        [34, 38],
        [39, 37],
        [43, 34],
        [45, 35],
        [42 - cut, chin],
        [38, chin + 2],
        [30, chin + 2],
        [25 + cut, chin - 2],
      ],
      hair,
    );
    tile.line(28, 42, 31, chin, gray);
    tile.line(35, chin + 1, 39, chin - 1, gray);
  }
  if (happy) {
    paint(
      [
        [29, 38],
        [34, 39],
        [41, 37],
        [39, 41],
        [35, 43],
        [31, 42],
      ],
      ink,
    );
    tile.line(32, 39, 39, 39, paper);
    tile.rect(34, 41, 4, 1, coral);
  } else if (surprised) {
    tile.oval(32, 37, 7, 7, ink);
    tile.rect(34, 41, 3, 1, coral);
  } else if (worried) {
    tile.line(30, 41, 33, 39, deepShade);
    tile.line(33, 39, 37, 39, ink);
    tile.line(37, 39, 40, 41, ink);
  } else {
    tile.line(30, 40, 36, 40, deepShade);
    tile.line(36, 40, 41, proud ? 37 : 39, ink);
    tile.rect(33, 42, 5, 1, faceShade);
  }
  if (glasses) {
    for (const x of [25, 36]) {
      tile.line(x, 26, x + 9, 26, ink);
      tile.line(x, 27, x, 31, ink);
      tile.line(x + 9, 27, x + 9, 31, ink);
      tile.line(x + 1, 32, x + 8, 32, ink);
      tile.rect(x + 1, 27, 2, 1, paper);
    }
    tile.rect(34, 28, 3, 1, ink);
    tile.line(19 + cut, 27, 24, 28, gray);
  }

  if (design.headwear === 'beanie') {
    const hat = design.hat ?? hair;
    tile.oval(13, 5, 35, 24, ink);
    tile.oval(14, 6, 33, 22, hat);
    tile.line(19, 13, 25, 8, design.hatLight ?? gray);
    tile.bevel(12, 18, 37, 7, ink);
    tile.bevel(13, 19, 35, 5, hat);
    for (let x = 17; x < 46; x += 4) tile.rect(x, 19, 1, 4, shadow);
  } else if (
    style === 'helmet' ||
    style === 'cap' ||
    design.headwear === 'cap'
  ) {
    const hat = design.hat ?? hair;
    paint(
      [
        [13, 23],
        [15, 14],
        [21, 8],
        [28, 6],
        [37, 7],
        [45, 12],
        [48, 19],
        [48, 23],
        [40, 23],
        [32, 21],
        [19, 25],
      ],
      ink,
    );
    paint(
      [
        [15, 22],
        [17, 14],
        [23, 9],
        [29, 8],
        [37, 9],
        [44, 13],
        [46, 20],
        [39, 20],
        [31, 19],
        [20, 22],
      ],
      hat,
    );
    paint(
      [
        [17, 18],
        [23, 11],
        [29, 9],
        [36, 10],
        [32, 12],
        [26, 13],
        [22, 17],
      ],
      design.hatLight ?? gray,
    );
    if (style === 'helmet') {
      tile.line(23, 17, 29, 14, ink, 2);
      tile.line(33, 14, 38, 15, ink, 2);
      tile.line(20, 23, 23, 34, shadow);
      tile.line(23, 34, 28, 42, shadow);
      tile.rect(23, 33, 2, 2, steel);
    } else {
      paint(
        [
          [30, 19],
          [42, 18],
          [49, 20],
          [51, 22],
          [41, 25],
          [32, 23],
        ],
        ink,
      );
      tile.line(33, 20, 47, 20, hat);
    }
  } else if (style === 'bell') {
    paint(
      [
        [13, 20],
        [18, 16],
        [20, 10],
        [25, 6],
        [30, 4],
        [37, 6],
        [42, 10],
        [45, 17],
        [48, 20],
        [45, 24],
        [19, 24],
      ],
      ink,
    );
    paint(
      [
        [15, 20],
        [20, 17],
        [23, 10],
        [29, 6],
        [36, 7],
        [41, 11],
        [43, 17],
        [46, 21],
        [20, 22],
      ],
      amber,
    );
    tile.line(24, 12, 30, 8, cream, 2);
    tile.line(21, 19, 43, 19, gold);
    tile.oval(29, 2, 5, 5, gold);
  } else if (style === 'headphones') {
    tile.stroke(16, 23, 16, 16, 2.5, ink);
    tile.stroke(16, 16, 23, 10, 2.5, ink);
    tile.stroke(23, 10, 35, 8, 2.5, ink);
    tile.stroke(35, 8, 44, 13, 2.5, ink);
    tile.stroke(44, 13, 47, 22, 2.5, ink);
    tile.line(18, 15, 24, 10, gold);
    tile.line(24, 10, 35, 8, gold);
    tile.line(35, 8, 43, 12, gold);
    for (const x of [11, 44]) {
      tile.bevel(x, 23, 8, 13, ink);
      tile.bevel(x + 1, 24, 6, 10, amber);
      tile.rect(x + 1, 26, 2, 6, gold);
    }
  }
}
