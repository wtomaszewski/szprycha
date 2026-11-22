import { PNG } from 'pngjs';

export const appBackground = '#1a1c2c';
export const appTheme = '#257179';

export const appIcons = [
  {
    src: 'pwa/icon-192.png',
    sizes: '192x192',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: 'pwa/icon-512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: 'pwa/maskable-512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'maskable',
  },
];
export const appleTouchIcon = 'pwa/apple-touch-icon.png';
export const webSplash = 'pwa/splash-1280x720.png';

// WebKit selects a startup image by screen size, density and orientation.
export const appleSplashes = [
  { width: 390, height: 844, scale: 3 },
  { width: 393, height: 852, scale: 3 },
  { width: 810, height: 1080, scale: 2 },
].flatMap(({ width, height, scale }) =>
  (['portrait', 'landscape'] as const).map((orientation) => {
    const [w, h] =
      orientation === 'portrait' ? [width, height] : [height, width];
    return {
      src: `pwa/splash-${w * scale}x${h * scale}.png`,
      width: w * scale,
      height: h * scale,
      media: `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${scale}) and (orientation: ${orientation})`,
    };
  }),
);

function wheel(x: number, y: number, size: number, splash: boolean): string {
  const radius = Math.hypot(x, y);
  if (radius >= size) {
    if (splash && y > size + 3 && y < size + 5 && Math.abs(x) < size)
      return Math.floor(x / 4) % 2 === 0 ? '#ffcd75' : '#333c57';
    return appBackground;
  }
  if (radius >= size - 2) return '#566c86';
  if (radius >= size - 4) return '#ffcd75';
  if (radius < 3) return '#f4f4f4';
  if (radius < 5) return '#ef7d57';
  if (
    Math.abs(x) < 1 ||
    Math.abs(y) < 1 ||
    Math.abs(Math.abs(x) - Math.abs(y)) < 1
  )
    return '#ffcd75';
  return appTheme;
}

export function drawAppArt(
  width: number,
  height: number,
  size: number,
  { splash = false, transparent = false } = {},
) {
  const image = new PNG({ width, height });
  const pixelSize = Math.floor(Math.min(width, height) / 48);
  const originX = (width - pixelSize) / 2;
  const originY = (height - pixelSize) / 2;
  const logicalColor = new Map<string, number>();
  for (let y = 0; y < height; y++) {
    const row = Math.round((y - originY) / pixelSize);
    for (let x = 0; x < width; x++) {
      const column = Math.round((x - originX) / pixelSize);
      const hex = wheel(column, row, size, splash);
      let rgb = logicalColor.get(hex);
      if (rgb === undefined) {
        rgb = Number.parseInt(hex.slice(1), 16);
        logicalColor.set(hex, rgb);
      }
      const alpha = transparent && hex === appBackground ? 0 : 255;
      image.data.writeUInt32BE(rgb * 256 + alpha, (y * width + x) * 4);
    }
  }
  return PNG.sync.write(image, { colorType: transparent ? 6 : 2 });
}

export function* generateAppIcons() {
  yield { fileName: appIcons[0]!.src, source: drawAppArt(192, 192, 20) };
  yield { fileName: appIcons[1]!.src, source: drawAppArt(512, 512, 20) };
  // All foreground pixels fit within the CSS maskable safe circle (40%).
  yield { fileName: appIcons[2]!.src, source: drawAppArt(512, 512, 18) };
  yield { fileName: appleTouchIcon, source: drawAppArt(180, 180, 20) };
  yield {
    fileName: webSplash,
    source: drawAppArt(1280, 720, 9, { splash: true }),
  };
  for (const { src, width, height } of appleSplashes)
    yield {
      fileName: src,
      source: drawAppArt(width, height, 9, { splash: true }),
    };
}
