import { mkdir, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';

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
];
const tiles = new PNG({ width: 256, height: 32 });
function pixel(p: PNG, x: number, y: number, hex: string) {
  const n = parseInt(hex.slice(1), 16),
    i = (y * p.width + x) * 4;
  p.data[i] = (n >> 16) & 255;
  p.data[i + 1] = (n >> 8) & 255;
  p.data[i + 2] = n & 255;
  p.data[i + 3] = 255;
}
for (let t = 0; t < 8; t++)
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      let color = colors[t]!;
      if (t === 0 && (x * 7 + y * 11) % 41 === 0) color = '#3e8948';
      if (t === 2 && (x === 0 || y === 0)) color = '#566c86';
      if (t === 4 && (x % 16 === 0 || y % 16 === 0)) color = '#333c57';
      if (t === 6 && x >= 14 && x <= 17 && y < 20) color = '#f0dca8';
      if (t === 7 && y >= 14 && y <= 17 && x < 20) color = '#f0dca8';
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
console.log('Generated M1 placeholder tiles and rider');
