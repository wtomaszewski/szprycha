import { mkdir, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { effectArt } from './effect-art.ts';
import { cityArt } from './city-art.ts';
import { giewontArt } from './zakopane-art.ts';
import { uiArt } from './ui-art.ts';
import { encodeSprite, spriteArt } from './sprite-art.ts';
import { signArt } from './sign-art.ts';
import { portraitArt } from './portrait-art.ts';
import { signImageFile } from '../src/content/signIllustrations.ts';

await mkdir('assets/generated', { recursive: true });
await writeFile(
  'assets/generated/city-effects.png',
  PNG.sync.write(effectArt()),
);
await writeFile('assets/generated/ui-icons.png', PNG.sync.write(uiArt()));
await writeFile('assets/generated/giewont.png', PNG.sync.write(giewontArt()));
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

await mkdir('assets/generated/portraits', { recursive: true });
for (const [id, sheet] of portraitArt())
  await writeFile(`assets/generated/portraits/${id}.png`, encodeSprite(sheet));

console.log(
  'Generated terrain, building and street art, traffic sprites and dialogue portraits',
);
