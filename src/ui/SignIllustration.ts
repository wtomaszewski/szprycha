import { FONT, ui } from '../core/presentation.ts';

type Context = CanvasRenderingContext2D;
type Point = readonly [number, number];

const red = '#ce2635';
const yellow = '#ffd54a';
const blue = '#1456a6';
const white = '#fff';
const dark = '#1a1c2c';

function polygon(ctx: Context, fill: string, ...points: Point[]) {
  ctx.beginPath();
  ctx.moveTo(...points[0]!);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function circle(ctx: Context, x: number, y: number, radius: number) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
}

function disc(ctx: Context, fill: string, radius: number) {
  circle(ctx, 32, 32, radius);
  ctx.fillStyle = fill;
  ctx.fill();
}

function bicycle(
  ctx: Context,
  x: number,
  y: number,
  scale: number,
  color: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  for (const wheel of [-12, 12]) {
    circle(ctx, wheel, 4, 7);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-12, 4);
  ctx.lineTo(-6, -6);
  ctx.lineTo(2, 4);
  ctx.lineTo(-12, 4);
  ctx.moveTo(-9, -8);
  ctx.lineTo(-3, -8);
  ctx.moveTo(-6, -5);
  ctx.lineTo(8, -5);
  ctx.lineTo(2, 4);
  ctx.moveTo(12, 4);
  ctx.lineTo(7, -10);
  ctx.lineTo(11, -10);
  ctx.stroke();
  ctx.restore();
}

function children(ctx: Context) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = dark;
  ctx.fillStyle = dark;
  ctx.lineWidth = 2.8;
  for (const [x, y] of [
    [25, 34],
    [38, 30],
  ] as const) {
    circle(ctx, x + 2, y - 3, 2.3);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 2, y + 9);
    ctx.lineTo(x + 1, y + 2);
    ctx.lineTo(x + 4, y + 3);
    ctx.lineTo(x + 6, y + 7);
    ctx.moveTo(x + 1, y + 3);
    ctx.lineTo(x + 1, y + 11);
    ctx.lineTo(x - 3, y + 16);
    ctx.moveTo(x + 1, y + 10);
    ctx.lineTo(x + 5, y + 12);
    ctx.lineTo(x + 7, y + 17);
    ctx.stroke();
  }
}

const drawings: Readonly<Record<string, (ctx: Context) => void>> = {
  'A-7': (ctx) => {
    polygon(ctx, red, [1, 7], [63, 7], [32, 61]);
    polygon(ctx, yellow, [10, 12], [54, 12], [32, 50]);
  },
  'A-17': (ctx) => {
    polygon(ctx, red, [32, 3], [63, 57], [1, 57]);
    polygon(ctx, yellow, [32, 13], [54, 52], [10, 52]);
    children(ctx);
  },
  'B-2': (ctx) => {
    disc(ctx, red, 29);
    ctx.fillStyle = white;
    ctx.fillRect(10, 26, 44, 12);
  },
  'B-9': (ctx) => {
    disc(ctx, red, 29);
    disc(ctx, white, 23);
    bicycle(ctx, 32, 32, 1, dark);
  },
  'B-20': (ctx) => {
    polygon(
      ctx,
      white,
      [20, 3],
      [44, 3],
      [61, 20],
      [61, 44],
      [44, 61],
      [20, 61],
      [3, 44],
      [3, 20],
    );
    polygon(
      ctx,
      red,
      [21, 5],
      [43, 5],
      [59, 21],
      [59, 43],
      [43, 59],
      [21, 59],
      [5, 43],
      [5, 21],
    );
    ctx.font = 'bold 17px sans-serif';
    ctx.fillStyle = white;
    ctx.textAlign = 'center';
    ctx.fillText(ui.quiz.stopLegend, 32, 38);
  },
  'C-13': (ctx) => {
    disc(ctx, blue, 29);
    bicycle(ctx, 32, 32, 1, white);
  },
  'D-1': (ctx) => {
    polygon(ctx, dark, [32, 1], [63, 32], [32, 63], [1, 32]);
    polygon(ctx, white, [32, 3], [61, 32], [32, 61], [3, 32]);
    polygon(ctx, yellow, [32, 11], [53, 32], [32, 53], [11, 32]);
  },
  'P-23': (ctx) => {
    ctx.fillStyle = '#566c86';
    ctx.fillRect(3, 9, 58, 46);
    bicycle(ctx, 32, 32, 1.2, white);
  },
  'T-22': (ctx) => {
    ctx.fillStyle = white;
    ctx.fillRect(2, 0, 60, 37);
    ctx.strokeStyle = dark;
    ctx.strokeRect(3.5, 1.5, 57, 34);
    ctx.fillStyle = dark;
    ctx.textAlign = 'center';
    ctx.font = `11px "${FONT}"`;
    ctx.fillText(ui.quiz.exceptionLegend, 32, 12, 54);
    bicycle(ctx, 32, 23, 0.75, dark);
  },
};

export function hasSignIllustration(code: string) {
  return Object.hasOwn(drawings, code);
}

export function signIllustration(code: string, description: string) {
  if (!hasSignIllustration(code)) return;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = code === 'T-22' ? 37 : 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  drawings[code]!(ctx);
  const image = new Image(canvas.width, canvas.height);
  image.className = 'sign-illustration';
  image.dataset.sign = code;
  image.alt = description;
  image.src = canvas.toDataURL();
  return image;
}
