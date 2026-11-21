import type { GameObjects, Scene } from 'phaser';
import type { AgentState } from '../rules/types';

export function trafficTextures(scene: Scene) {
  if (scene.textures.exists('traffic-car')) return;
  const art = scene.make.graphics({});
  art.fillStyle(0x1a1c2c).fillRoundedRect(0, 0, 26, 16, 3);
  art.fillStyle(0x41a6f6).fillRoundedRect(1, 2, 24, 12, 3);
  art.fillStyle(0x29366f).fillRect(8, 4, 10, 8);
  art.fillStyle(0x73eff7).fillRect(16, 4, 2, 8);
  art.fillStyle(0xffcd75).fillRect(23, 3, 2, 3).fillRect(23, 10, 2, 3);
  art.fillStyle(0xe43b44).fillRect(1, 3, 2, 3).fillRect(1, 10, 2, 3);
  art.generateTexture('traffic-car', 26, 16);
  art.clear().fillStyle(0x1a1c2c).fillRoundedRect(0, 0, 50, 20, 4);
  art.fillStyle(0xe43b44).fillRoundedRect(1, 2, 48, 16, 3);
  art.fillStyle(0xffcd75).fillRect(2, 5, 46, 10);
  art.fillStyle(0x29366f).fillRect(38, 5, 8, 10).fillRect(6, 5, 7, 10);
  art.fillStyle(0x566c86).fillRect(16, 4, 5, 12).fillRect(25, 4, 5, 12);
  art.fillStyle(0xf4f4f4).fillRect(47, 4, 2, 4).fillRect(47, 12, 2, 4);
  art.generateTexture('traffic-tram', 50, 20);
  art.clear().fillStyle(0x1a1c2c).fillRoundedRect(0, 0, 26, 17, 3);
  art.fillStyle(0xf4f4f4).fillRoundedRect(1, 1, 24, 15, 2);
  art.fillStyle(0xe43b44).fillRect(1, 2, 17, 3).fillRect(1, 12, 17, 3);
  art.fillStyle(0x29366f).fillRect(17, 4, 5, 9);
  art.fillStyle(0x3b5dc9).fillRect(13, 3, 3, 11);
  art.generateTexture('traffic-emergency', 26, 17);
  art
    .clear()
    .fillStyle(0x1a1c2c)
    .fillRoundedRect(0, 4, 7, 6, 2)
    .fillRoundedRect(14, 4, 7, 6, 2);
  art.fillStyle(0xa7f070).fillRect(5, 6, 12, 3);
  art.fillStyle(0x38b764).fillCircle(10, 7, 5);
  art.fillStyle(0xf4f4f4).fillCircle(13, 7, 3);
  art.generateTexture('traffic-cyclist', 21, 14);
  art.clear().fillStyle(0x1a1c2c).fillCircle(7, 7, 7);
  art.fillStyle(0xff77a8).fillCircle(6, 7, 5);
  art.fillStyle(0xffcd75).fillCircle(9, 7, 4);
  art.generateTexture('traffic-pedestrian', 14, 14);
  art.destroy();
}

export function trafficSprite(
  scene: Scene,
  kind: AgentState['kind'],
): GameObjects.Image {
  return scene.add.image(0, 0, `traffic-${kind}`).setDepth(17);
}
