import { writeFileSync } from 'node:fs';
import { drawAppArt } from './app-icons';

const android = 'android/app/src/main/res';
const ios = 'ios/App/App/Assets.xcassets';
for (const [density, scale] of [
  ['mdpi', 1],
  ['hdpi', 1.5],
  ['xhdpi', 2],
  ['xxhdpi', 3],
  ['xxxhdpi', 4],
] as const) {
  const legacy = 48 * scale;
  const adaptive = 108 * scale;
  writeFileSync(
    `${android}/mipmap-${density}/ic_launcher.png`,
    drawAppArt(legacy, legacy, 20),
  );
  writeFileSync(
    `${android}/mipmap-${density}/ic_launcher_foreground.png`,
    drawAppArt(adaptive, adaptive, 12, { transparent: true }),
  );
}
writeFileSync(
  `${ios}/AppIcon.appiconset/AppIcon.png`,
  drawAppArt(1024, 1024, 20),
);
writeFileSync(
  `${ios}/Splash.imageset/Splash.png`,
  drawAppArt(1024, 1024, 9, { splash: true }),
);
