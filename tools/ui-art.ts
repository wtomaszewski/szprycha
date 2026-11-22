import { PNG } from 'pngjs';

export const iconSize = 12;
const glyphs = [
  [
    // Helmet
    [3, 2, 6, 1],
    [2, 3, 8, 1],
    [1, 4, 10, 3],
    [1, 7, 7, 2],
    [4, 9, 4, 1],
    [6, 8, 1, 3],
    [9, 7, 2, 1],
  ],
  [
    // Headlight
    [2, 2, 3, 1],
    [1, 3, 4, 6],
    [2, 9, 3, 1],
    [7, 3, 4, 1],
    [7, 5, 5, 2],
    [7, 8, 4, 1],
  ],
  [
    // Sun
    [4, 4, 4, 4],
    [5, 0, 2, 3],
    [5, 9, 2, 3],
    [0, 5, 3, 2],
    [9, 5, 3, 2],
    [2, 2, 1, 1],
    [9, 2, 1, 1],
    [2, 9, 1, 1],
    [9, 9, 1, 1],
  ],
  [
    // Crescent moon
    [4, 1, 3, 1],
    [3, 2, 3, 1],
    [2, 3, 3, 2],
    [1, 5, 4, 2],
    [2, 7, 4, 1],
    [2, 8, 9, 1],
    [3, 9, 7, 1],
    [4, 10, 5, 1],
    [9, 3, 2, 2],
  ],
  [
    // Rain
    [4, 1, 4, 2],
    [2, 3, 8, 1],
    [1, 4, 10, 2],
    [3, 7, 2, 1],
    [2, 8, 2, 2],
    [8, 7, 2, 1],
    [7, 8, 2, 2],
  ],
  [
    // Fog
    [1, 3, 8, 1],
    [3, 5, 8, 1],
    [1, 7, 8, 1],
    [3, 9, 8, 1],
  ],
  [
    // Wind
    [0, 4, 8, 1],
    [7, 1, 2, 1],
    [9, 2, 1, 2],
    [2, 7, 9, 1],
    [11, 6, 1, 1],
    [7, 9, 3, 1],
    [10, 8, 1, 1],
  ],
  [
    // Snowflake
    [5, 1, 2, 10],
    [1, 5, 10, 2],
    [2, 2, 2, 2],
    [8, 8, 2, 2],
    [8, 2, 2, 2],
    [2, 8, 2, 2],
    [4, 4, 4, 4],
  ],
  [
    // Ice crystal
    [5, 1, 2, 1],
    [4, 2, 4, 1],
    [3, 3, 6, 1],
    [2, 4, 8, 4],
    [3, 8, 6, 1],
    [4, 9, 4, 1],
    [5, 10, 2, 1],
    [5, 3, 1, 5, false],
    [4, 6, 4, 1, false],
  ],
  [
    // Whistle
    [1, 3, 11, 3],
    [1, 6, 7, 2],
    [2, 8, 5, 2],
    [3, 5, 2, 2, false],
  ],
  [
    // Pause
    [2, 1, 3, 10],
    [7, 1, 3, 10],
  ],
  [
    // Phone
    [3, 0, 6, 1],
    [2, 1, 8, 10],
    [3, 11, 6, 1],
    [3, 2, 6, 7, false],
    [5, 10, 2, 1, false],
  ],
] as const;

export function uiArt() {
  const sheet = new PNG({ width: iconSize * glyphs.length, height: iconSize });
  glyphs.forEach((rectangles, index) => {
    for (const [x, y, width, height, visible = true] of rectangles)
      for (let row = y; row < y + height; row++)
        for (let col = x; col < x + width; col++) {
          const offset = (row * sheet.width + index * iconSize + col) * 4;
          sheet.data.fill(visible ? 255 : 0, offset, offset + 4);
        }
  });
  return sheet;
}
