import { mkdir, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { portraitEmotions } from '../src/content/dialogues.ts';

await mkdir('assets/generated', { recursive: true });
const colors = [
  '#257179',
  '#333c57',
  '#94b0c2',
  '#b13e53',
  '#566c86',
  '#29366f',
  '#333c57',
  '#333c57',
  '#ad9083',
  '#29366f',
];
const tiles = new PNG({ width: colors.length * 32, height: 32 });
function pixel(p: PNG, x: number, y: number, hex: string) {
  const n = parseInt(hex.slice(1), 16),
    i = (y * p.width + x) * 4;
  p.data[i] = (n >> 16) & 255;
  p.data[i + 1] = (n >> 8) & 255;
  p.data[i + 2] = n & 255;
  p.data[i + 3] = 255;
}
for (let t = 0; t < colors.length; t++)
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      let color = colors[t]!;
      if (t === 0 && (x * 7 + y * 11) % 41 === 0) color = '#3e8948';
      if (t === 2 && (x === 0 || y === 0)) color = '#566c86';
      if (t === 4 && (x % 16 === 0 || y % 16 === 0)) color = '#333c57';
      if (t === 6 && x >= 14 && x <= 17 && y < 20) color = '#f0dca8';
      if (t === 7 && y >= 14 && y <= 17 && x < 20) color = '#f0dca8';
      if (t === 9 && y % 8 === 2 && (x + y * 2) % 22 < 10) color = '#3b5dc9';
      if (t === 8) {
        const row = Math.floor(y / 8);
        const offsetX = (x + (row % 2) * 8) % 16;
        if (y % 8 === 0 || offsetX === 0) color = '#705f65';
        else if (y % 8 === 1) color = '#c7ada1';
        else if ((row + Math.floor((x + (row % 2) * 8) / 16)) % 3 === 0)
          color = '#96818a';
      }
      pixel(tiles, t * 32 + x, y, color);
    }
await writeFile('assets/generated/tiles.png', PNG.sync.write(tiles));
const rider = new PNG({ width: 24, height: 24 });
for (let y = 2; y < 23; y++)
  for (let x = 0; x < 24; x++) {
    let c = '';
    if (x >= 10 && x <= 13) c = '#1a1c2c';
    if (y >= 7 && y <= 9 && x >= 3 && x <= 20) c = '#c0cbdc';
    if (y >= 10 && y <= 17 && x >= 8 && x <= 15) c = '#ef7d57';
    if (y >= 9 && y <= 14 && (x === 6 || x === 17)) c = '#f0dca8';
    if (y >= 5 && y <= 10 && x >= 9 && x <= 14) c = '#ffcd75';
    if (c) pixel(rider, x, y, c);
  }
await writeFile('assets/generated/rider.png', PNG.sync.write(rider));
const ink = '#1a1c2c';
const paper = '#f4f4f4';
const gold = '#ffcd75';
const gray = '#94b0c2';
const tan = '#e8c39e';
const coral = '#ef7d57';
const red = '#b13e53';
const blue = '#41a6f6';
const teal = '#257179';
const green = '#3e8948';
const plum = '#5d275d';
const navy = '#29366f';
const brown = '#d98a5a';

type Headwear = 'helmet' | 'cap' | 'hair' | 'bun' | 'bell' | 'headphones';
interface PortraitDesign {
  backdrop: string;
  shirt: string;
  hair: string;
  skin: string;
  style: Headwear;
  glasses?: boolean;
  beard?: boolean;
}

const portraits: Record<string, PortraitDesign> = {
  gracz: {
    backdrop: teal,
    shirt: coral,
    hair: gold,
    skin: tan,
    style: 'helmet',
  },
  pan_kazik: {
    backdrop: teal,
    shirt: green,
    hair: gray,
    skin: tan,
    style: 'cap',
    beard: true,
  },
  sierzant_ola: {
    backdrop: navy,
    shirt: blue,
    hair: brown,
    skin: tan,
    style: 'helmet',
  },
  turbo: { backdrop: plum, shirt: red, hair: coral, skin: tan, style: 'hair' },
  dj_dzwonek: {
    backdrop: navy,
    shirt: gold,
    hair: ink,
    skin: brown,
    style: 'headphones',
  },
  lena_mapa: {
    backdrop: teal,
    shirt: red,
    hair: ink,
    skin: brown,
    style: 'bun',
    glasses: true,
  },
  maly_franek: {
    backdrop: navy,
    shirt: green,
    hair: coral,
    skin: tan,
    style: 'cap',
  },
  pani_halina: {
    backdrop: plum,
    shirt: red,
    hair: gray,
    skin: tan,
    style: 'bun',
    glasses: true,
  },
  profesor_kwant: {
    backdrop: teal,
    shirt: paper,
    hair: gray,
    skin: tan,
    style: 'hair',
    glasses: true,
  },
  inzynier_zawila: {
    backdrop: navy,
    shirt: brown,
    hair: gray,
    skin: tan,
    style: 'hair',
    beard: true,
  },
  krasnal_dzwoneczek: {
    backdrop: plum,
    shirt: green,
    hair: gray,
    skin: tan,
    style: 'bell',
    beard: true,
  },
  pan_latarnik: {
    backdrop: navy,
    shirt: teal,
    hair: ink,
    skin: tan,
    style: 'cap',
    beard: true,
  },
  pani_doktor: {
    backdrop: teal,
    shirt: paper,
    hair: brown,
    skin: brown,
    style: 'bun',
  },
  gang_bez_hamulcow: {
    backdrop: plum,
    shirt: red,
    hair: red,
    skin: brown,
    style: 'helmet',
  },
};

function drawPortrait(sheet: PNG, frame: number, design: PortraitDesign) {
  const { backdrop, shirt, hair, skin, style, glasses, beard } = design;
  const box = (
    left: number,
    top: number,
    width: number,
    height: number,
    color: string,
  ) => {
    for (let y = top * 2; y < (top + height) * 2; y++)
      for (let x = left * 2; x < (left + width) * 2; x++)
        pixel(sheet, frame * 64 + x, y, color);
  };
  box(0, 0, 32, 32, ink);
  box(1, 1, 30, 30, backdrop);
  box(4, 28, 24, 4, shirt);
  box(7, 26, 18, 2, shirt);
  box(14, 23, 4, 5, skin);
  box(9, 7, 14, 17, hair);
  box(8, 15, 16, 5, skin);
  box(10, 11, 12, 12, skin);
  box(12, 22, 8, 2, skin);
  box(10, 10, 5, 3, hair);
  box(11, 25, 3, 2, ink);
  box(18, 25, 3, 2, ink);
  if (beard) box(11, 20, 10, 4, hair);
  if (style === 'helmet' || style === 'cap' || style === 'bell') {
    const hat = style === 'bell' ? gold : hair;
    box(11, 5, 10, 3, hat);
    box(9, 8, 14, 3, hat);
    box(8, 10, style === 'cap' ? 17 : 16, 2, ink);
    box(14, 7, 4, 2, paper);
  } else if (style === 'bun') {
    box(11, 4, 10, 6, hair);
    box(12, 7, 8, 1, gold);
  } else if (style === 'headphones') {
    box(8, 6, 16, 2, gold);
    box(7, 13, 3, 6, gold);
    box(22, 13, 3, 6, gold);
  }
  const emotion = portraitEmotions[frame];
  box(12, 15, 2, emotion === 'surprised' ? 3 : 2, ink);
  box(18, 15, 2, emotion === 'surprised' ? 3 : 2, ink);
  if (glasses) {
    box(11, 14, 10, 1, ink);
    box(11, 17, 4, 1, ink);
    box(17, 17, 4, 1, ink);
  }
  if (emotion === 'happy') {
    box(13, 19, 6, 2, ink);
    box(14, 20, 4, 1, paper);
  } else if (emotion === 'surprised') {
    box(15, 19, 2, 3, ink);
  } else if (emotion === 'worried') {
    box(13, 13, 2, 1, ink);
    box(17, 13, 2, 1, ink);
    box(14, 19, 4, 1, ink);
    box(13, 20, 1, 1, ink);
    box(18, 20, 1, 1, ink);
  } else if (emotion === 'proud') {
    box(14, 20, 5, 1, ink);
    box(18, 19, 2, 1, ink);
    box(17, 13, 3, 1, ink);
  } else box(14, 20, 4, 1, ink);
}

await mkdir('assets/generated/portraits', { recursive: true });
for (const [id, design] of Object.entries(portraits)) {
  const sheet = new PNG({ width: 64 * portraitEmotions.length, height: 64 });
  portraitEmotions.forEach((_, frame) => drawPortrait(sheet, frame, design));
  await writeFile(
    `assets/generated/portraits/${id}.png`,
    PNG.sync.write(sheet),
  );
}
console.log('Generated placeholder tiles, rider and dialogue portraits');
