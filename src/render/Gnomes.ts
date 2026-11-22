import type { Cameras, GameObjects, Scene, Types } from 'phaser';
import { ui } from '../core/presentation';
import type { ProgressStore } from '../core/progressStore';

const hatColors = ['#b13e53', '#3b5dc9', '#3e8948', '#5d275d', '#e43b44'];
const coatColors = ['#257179', '#b86f50', '#41a6f6', '#ef7d57'];
const tile = 16;
const variants = hatColors.length * coatColors.length;
const textureKey = 'gnomes';

function loadGnomes(scene: Scene) {
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
    paintGnome(ctx, variant);
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

export class Gnomes {
  private readonly remaining: {
    id: string;
    questionIndex: number;
    image: GameObjects.Image;
  }[] = [];
  private readonly counter = document.createElement('output');
  private total = 0;

  constructor(
    scene: Scene,
    objects: readonly Types.Tilemaps.TiledObject[],
    private readonly store: ProgressStore,
    parent: HTMLElement,
  ) {
    loadGnomes(scene);
    const found = new Set(store.profile.gnomes);
    for (const { name, x = 0, y = 0, properties } of objects) {
      const kind = properties?.find((p: { name: string }) => p.name === 'kind');
      if (kind?.value !== 'gnome') continue;
      const questionIndex = this.total++;
      if (found.has(name)) continue;
      const variant = properties?.find(
        (p: { name: string }) => p.name === 'variant',
      );
      const image = scene.add
        .image(x, y, textureKey, Number(variant?.value ?? 0))
        .setDepth(8)
        .setVisible(false);
      this.remaining.push({ id: name, questionIndex, image });
    }
    this.counter.title = ui.driving.gnomesHint;
    this.counter.setAttribute('aria-label', ui.driving.gnomes);
    this.updateCounter();
    parent.append(this.counter);
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
    const index = this.remaining.findIndex((gnome) => gnome.id === id);
    if (index < 0) return;
    const [gnome] = this.remaining.splice(index, 1);
    gnome!.image.destroy();
    this.store.change((profile) => {
      const found = (profile.gnomes ??= []);
      if (!found.includes(id)) found.push(id);
    });
    this.updateCounter();
  }

  private updateCounter() {
    this.counter.value = `${ui.driving.gnomes} ${this.total - this.remaining.length}/${this.total}`;
  }
}
