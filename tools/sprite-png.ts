import { crc32, deflateSync } from 'node:zlib';
import type { PNG } from 'pngjs';
import { encodeSprite } from './sprite-art.ts';

function chunk(type: string, data: Buffer) {
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length);
  result.write(type, 4, 'ascii');
  data.copy(result, 8);
  result.writeUInt32BE(crc32(result.subarray(4, -4)), result.length - 4);
  return result;
}

// The generated sheets share very few RGBA colors. Indexed PNG preserves
// each pixel while reducing the amount of data in the compressed scanlines.
export function encodeSpriteSheet(image: PNG) {
  const { width, height, data } = image;
  const palette = new Map<number, number>();
  const rgb = Buffer.alloc(256 * 3);
  const alpha = Buffer.alloc(256);
  const scanlines = Buffer.alloc((width + 1) * height); // filter 0 per row
  for (let y = 0, offset = 0; y < height; y++) {
    const row = y * (width + 1) + 1;
    for (let x = 0; x < width; x++, offset += 4) {
      const rgba = data.readUInt32BE(offset);
      let index = palette.get(rgba);
      if (index === undefined) {
        index = palette.size;
        if (index === 256) return encodeSprite(image);
        palette.set(rgba, index);
        rgb.writeUIntBE(rgba >>> 8, 3 * index, 3);
        alpha[index] = rgba & 255;
      }
      scanlines[row + x] = index;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bits per index
  header[9] = 3; // indexed color
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('PLTE', rgb.subarray(0, palette.size * 3)),
    chunk('tRNS', alpha.subarray(0, palette.size)),
    chunk('IDAT', deflateSync(scanlines, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
