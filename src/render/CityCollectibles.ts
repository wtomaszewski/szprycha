import type { Cameras, GameObjects, Scene } from 'phaser';
import { ui } from '../core/presentation';
import type { ProgressStore } from '../core/progressStore';
import type { CityCollectible, WorldModel } from '../rules/world/WorldModel';

const hatColors = ['#b13e53', '#3b5dc9', '#3e8948', '#5d275d', '#e43b44'];
const coatColors = ['#257179', '#b86f50', '#41a6f6', '#ef7d57'];
const tile = 16;
const variants = hatColors.length * coatColors.length;
const collections = {
  gnome: {
    field: 'gnomes',
    label: ui.driving.gnomes,
    hint: ui.driving.gnomesHint,
    question: ui.driving.gnomeQuestion,
    variants,
    paint: paintGnome,
  },
  obwarzanek: {
    field: 'obwarzanki',
    label: ui.driving.obwarzanki,
    hint: ui.driving.obwarzankiHint,
    question: ui.driving.obwarzanekQuestion,
    variants: 1,
    paint: paintObwarzanek,
  },
  bursztyn: {
    field: 'bursztyny',
    label: ui.driving.bursztyny,
    hint: ui.driving.bursztynyHint,
    question: ui.driving.bursztynQuestion,
    variants: 1,
    paint: paintBursztyn,
  },
} as const;
type CollectionKind = keyof typeof collections;

function loadCollection(scene: Scene, textureKey: CollectionKind) {
  const { variants, paint } = collections[textureKey];
  if (scene.textures.exists(textureKey)) return;
  const texture = scene.textures.createCanvas(
    textureKey,
    tile * variants,
    tile,
  )!;
  const ctx = texture.context;
  for (let variant = 0; variant < variants; variant++) {
    texture.add(variant, 0, tile * variant, 0, tile, tile);
    ctx.save();
    ctx.translate(tile * variant, 0);
    paint(ctx, variant);
    ctx.restore();
  }
  texture.refresh();
}

function paintGnome(ctx: CanvasRenderingContext2D, variant: number) {
  const fill = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  const tool = Math.floor(variant / hatColors.length) % coatColors.length;
  const hat = hatColors[variant % hatColors.length]!;
  fill('#1a1c2c', 1, 14, 14, 2);
  fill(coatColors[tool]!, 4, 7, 8, 7);
  fill(hat, 4, 4, 8, 3);
  fill(hat, 5, 2, 6, 2);
  fill(hat, 7, 0, 3, 2);
  fill('#e8c39e', 6, 7, 5, 3);
  fill('#f4f4f4', 6, 9, 5, 2);
  fill('#f4f4f4', 7, 11, 3, 1);
  fill('#ffcd75', 12, 8, 2, 5);
  switch (tool) {
    case 0: // bicycle wheel
      ctx.strokeStyle = '#1a1c2c';
      ctx.strokeRect(10.5, 10.5, 4, 4);
      break;
    case 1: // letter
      fill('#f4f4f4', 10, 8, 6, 4);
      fill('#94b0c2', 12, 9, 2, 1);
      break;
    case 2: // lantern
      fill('#f0dca8', 11, 7, 5, 5);
      fill('#1a1c2c', 13, 7, 1, 5);
      break;
    case 3: // flower
      fill('#ff77a8', 10, 6, 6, 4);
      fill('#ffcd75', 12, 7, 2, 2);
      fill('#38b764', 12, 10, 2, 4);
      break;
  }
}

function paintObwarzanek(ctx: CanvasRenderingContext2D) {
  const rows = [
    '.....######.....',
    '...##aaaaaa##...',
    '..#aahoaaohha#..',
    '.#aahh####ohaa#.',
    '.#aho#....#aha#.',
    '#aho#......#oaa#',
    '#ah#........#oh#',
    '#oo#........#ha#',
    '#ha#........#oa#',
    '#oh#........#ao#',
    '#aoa#......#haa#',
    '.#ahh#....#oaa#.',
    '.#aaoh####oaa#..',
    '..#aaaaooaaa#...',
    '...###aaaa##....',
    '......####......',
  ];
  const colors = {
    '#': '#5b3150',
    a: '#c76b3b',
    o: '#ef9c53',
    h: '#ffe19a',
  } as const;
  paintPixels(ctx, rows, colors);
}

function paintBursztyn(ctx: CanvasRenderingContext2D) {
  paintPixels(
    ctx,
    [
      '................',
      '.......####.....',
      '.....##ohho#....',
      '....#ohhhooo#...',
      '...#ohhooooaa#..',
      '..#ohhhoooaaa#..',
      '.#ohoooohhaaaa#.',
      '.#ooooohhoaaaa#.',
      '.#oooooaaoaaaa#.',
      '..#oaaoaaoaab#..',
      '..#oaoaaababb#..',
      '...#aaaababbb#..',
      '....#bbabbbb#...',
      '.....#######....',
      '................',
      '................',
    ],
    { '#': '#4b2737', h: '#ffe1a1', o: '#ffad4f', a: '#d77730', b: '#a94a32' },
  );
}

function paintPixels(
  ctx: CanvasRenderingContext2D,
  rows: readonly string[],
  colors: Readonly<Record<string, string>>,
) {
  rows.forEach((row, y) => {
    [...row].forEach((pixel, x) => {
      const color = colors[pixel];
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    });
  });
}

export class CityCollectibles {
  private readonly remaining: {
    id: string;
    questionIndex: number;
    question?: string;
    image: GameObjects.Image;
  }[] = [];
  private readonly counter = document.createElement('output');
  private readonly total: number;
  private readonly collection;

  constructor(
    scene: Scene,
    world: Pick<WorldModel, 'collectibles' | 'metersPerPixel'>,
    private readonly store: ProgressStore,
    parent: HTMLElement,
    kind: CollectionKind,
  ) {
    this.collection = collections[kind];
    loadCollection(scene, kind);
    const found = new Set(store.profile[this.collection.field]);
    const objects = [...world.collectibles.values()].filter(
      (item) => item.kind === kind,
    );
    this.total = objects.length;
    const scale = world.metersPerPixel;
    objects.forEach((item: CityCollectible, questionIndex) => {
      if (found.has(item.id)) return;
      const image = scene.add
        .image(
          item.x / scale,
          item.y / scale,
          kind,
          item.kind === 'gnome' ? item.variant : 0,
        )
        .setDepth(8)
        .setVisible(false);
      this.remaining.push({
        id: item.id,
        questionIndex,
        question: item.kind === 'gnome' ? undefined : item.question,
        image,
      });
    });
    this.counter.title = this.collection.hint;
    this.counter.setAttribute('aria-label', this.collection.label);
    this.updateCounter();
    parent.append(this.counter);
  }

  get questionLabel() {
    return this.collection.question;
  }

  has(id: string) {
    return this.store.profile[this.collection.field]?.includes(id) ?? false;
  }

  update(camera: Cameras.Scene2D.Camera) {
    const x = camera.clampX(camera.scrollX) + camera.width / 2;
    const y = camera.clampY(camera.scrollY) + camera.height / 2;
    const halfWidth = camera.width / (2 * camera.zoom) + tile;
    const halfHeight = camera.height / (2 * camera.zoom) + tile;
    for (const { image } of this.remaining) {
      const visible =
        Math.abs(image.x - x) < halfWidth && Math.abs(image.y - y) < halfHeight;
      if (image.visible !== visible) image.setVisible(visible);
    }
  }

  nearby(x: number, y: number) {
    return this.remaining.find(({ image }) => {
      const dx = x - image.x;
      const dy = y - image.y;
      return dx * dx + dy * dy <= 16 ** 2;
    });
  }

  collect(id: string) {
    const index = this.remaining.findIndex((item) => item.id === id);
    if (index < 0) return;
    const [item] = this.remaining.splice(index, 1);
    item!.image.destroy();
    this.store.change((profile) => {
      const found = (profile[this.collection.field] ??= []);
      if (!found.includes(id)) found.push(id);
    });
    this.updateCounter();
  }

  private updateCounter() {
    this.counter.value = `${this.collection.label} ${this.total - this.remaining.length}/${this.total}`;
  }
}
