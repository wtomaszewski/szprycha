import { PNG } from 'pngjs';

type Point = readonly [number, number];

export function giewontArt() {
  const image = new PNG({ width: 280, height: 104 });
  function silhouette(points: readonly Point[], color: number) {
    for (let y = 0; y < image.height; y++) {
      const edges: number[] = [];
      for (const [[ax, ay], [bx, by]] of points.map(
        (point, i) => [point, points[(i + 1) % points.length]!] as const,
      )) {
        if ((ay <= y && y < by) || (by <= y && y < ay))
          edges.push(ax + ((bx - ax) * (y - ay)) / (by - ay));
      }
      edges.sort((a, b) => a - b);
      for (let i = 0; i < edges.length; i += 2)
        for (let x = Math.ceil(edges[i]!); x < Math.ceil(edges[i + 1]!); x++)
          image.data.writeUInt32BE(
            (color * 256 + 255) >>> 0,
            (y * image.width + x) * 4,
          );
    }
  }
  silhouette(
    [
      [0, 78],
      [20, 62],
      [40, 44],
      [59, 46],
      [72, 32],
      [94, 46],
      [116, 53],
      [142, 36],
      [154, 28],
      [172, 45],
      [186, 50],
      [198, 39],
      [217, 37],
      [238, 53],
      [254, 52],
      [280, 68],
      [280, 95],
      [0, 95],
    ],
    0x789aa2,
  );
  silhouette(
    [
      [0, 91],
      [30, 73],
      [55, 68],
      [76, 55],
      [93, 54],
      [101, 45],
      [116, 37],
      [131, 38],
      [145, 29],
      [156, 30],
      [166, 19],
      [173, 20],
      [177, 28],
      [181, 49],
      [199, 60],
      [223, 66],
      [241, 81],
      [280, 88],
      [280, 98],
      [0, 98],
    ],
    0x4d6976,
  );
  silhouette(
    [
      [35, 85],
      [76, 55],
      [93, 54],
      [101, 45],
      [116, 37],
      [131, 38],
      [145, 29],
      [156, 30],
      [166, 19],
      [173, 20],
      [177, 28],
      [181, 49],
      [199, 60],
      [177, 58],
      [163, 52],
      [163, 38],
      [142, 47],
      [119, 47],
      [99, 65],
      [82, 68],
      [66, 80],
    ],
    0x8c9e9c,
  );
  silhouette(
    [
      [97, 57],
      [116, 37],
      [131, 38],
      [145, 29],
      [156, 30],
      [166, 19],
      [173, 20],
      [177, 30],
      [168, 27],
      [151, 36],
      [141, 35],
      [126, 44],
      [113, 44],
    ],
    0xc0cbdc,
  );
  silhouette(
    [
      [169, 5],
      [171, 5],
      [171, 9],
      [175, 9],
      [175, 11],
      [171, 11],
      [171, 19],
      [169, 19],
      [169, 11],
      [165, 11],
      [165, 9],
      [169, 9],
    ],
    0x333c57,
  );
  silhouette(
    [
      [0, 93],
      [52, 84],
      [112, 88],
      [172, 78],
      [220, 83],
      [280, 94],
      [280, 104],
      [0, 104],
    ],
    0x2f6355,
  );
  for (let x = 4; x < 277; x += 7) {
    const base = 96 + ((x * 5) % 8);
    const top = base - 6 - ((x * 11) % 11);
    silhouette(
      [
        [x, top],
        [x + 3, base - 2],
        [x + 4, base],
        [x - 4, base],
      ],
      x % 3 ? 0x274f49 : 0x376f5b,
    );
  }
  return image;
}
