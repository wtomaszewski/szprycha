import { mkdir, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { effectArt } from './effect-art.ts';
import { cityArt } from './city-art.ts';
import { uiArt } from './ui-art.ts';
import { encodeSprite, spriteArt } from './sprite-art.ts';
import { signArt } from './sign-art.ts';
import { portraitEmotions } from '../src/content/dialogues.ts';
import { signImageFile } from '../src/content/signIllustrations.ts';

await mkdir('assets/generated', { recursive: true });
await writeFile(
  'assets/generated/city-effects.png',
  PNG.sync.write(effectArt()),
);
await writeFile('assets/generated/ui-icons.png', PNG.sync.write(uiArt()));
for (const [file, image] of Object.entries(cityArt(30)))
  await writeFile(`assets/generated/${file}`, PNG.sync.write(image));

for (const [id, image] of Object.entries(spriteArt()))
  await writeFile(`assets/generated/${id}.png`, encodeSprite(image));

await mkdir('assets/generated/signs', { recursive: true });
for (const [code, image] of signArt())
  await writeFile(
    `assets/generated/signs/${signImageFile(code)}`,
    PNG.sync.write(image),
  );

function pixel(p: PNG, x: number, y: number, hex: string) {
  const n = parseInt(hex.slice(1), 16),
    i = (y * p.width + x) * 4;
  p.data[i] = (n >> 16) & 255;
  p.data[i + 1] = (n >> 8) & 255;
  p.data[i + 2] = n & 255;
  p.data[i + 3] = 255;
}
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
console.log(
  'Generated terrain, building and street art, traffic sprites and dialogue portraits',
);
