import { writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { portraitEmotions } from '../src/content/dialogues.ts';
import { ClientGenerator } from '../src/gameplay/procedural/clients.ts';
import { clientPortraitDesign } from '../src/render/dailyClientArt.ts';
import { drawPortrait, portraitSize } from '../src/render/portraitArt.ts';
import { readContent } from './content.ts';
import { encodeSprite, Tile } from './sprite-art.ts';

const generator = new ClientGenerator((await readContent()).zleceniodawcy);
const columns = 6;
const rows = 4;
const gap = 6;
const step = portraitSize + gap;
const gallery = new Tile(step * columns + gap, step * rows + gap);
gallery.rect(0, 0, gallery.image.width, gallery.image.height, 0x1a1c2c);
const names = new Set<string>();
let seed = 103;
for (let index = 0; index < columns * rows; index++) {
  let client = generator.generate(seed++);
  while (names.has(client.name)) client = generator.generate(seed++);
  names.add(client.name);

  const tile = new Tile(portraitSize, portraitSize);
  drawPortrait(
    tile,
    portraitEmotions[index % portraitEmotions.length]!,
    clientPortraitDesign(client),
  );
  PNG.bitblt(
    tile.image,
    gallery.image,
    0,
    0,
    portraitSize,
    portraitSize,
    gap + (index % columns) * step,
    gap + Math.floor(index / columns) * step,
  );
}
await writeFile(
  process.argv[2] ?? 'docs/screenshots/103-galeria.png',
  encodeSprite(gallery.image),
);
