import Phaser from 'phaser';
import { Boot } from './scenes/Boot';
import { Preload } from './scenes/Preload';
import { MainMenu } from './scenes/MainMenu';
import { City } from './scenes/City';
import { ui } from './core/presentation';
import './style.css';

const orientation = document.createElement('div');
orientation.className = 'orientation-warning';
orientation.textContent = ui.driving.rotate;
orientation.setAttribute('role', 'status');
document.body.append(orientation);
document.title = `${ui.title}: ${ui.subtitle}`;
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 640,
  height: 360,
  backgroundColor: '#1a1c2c',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.NO_CENTER },
  scene: [Boot, Preload, MainMenu, City],
  callbacks: {
    postBoot(game) {
      const resize = () => {
        const zoom = Math.max(
          1,
          Math.floor(
            Math.min(window.innerWidth / 640, window.innerHeight / 360),
          ),
        );
        game.scale.resize(
          Math.floor(window.innerWidth / zoom),
          Math.floor(window.innerHeight / zoom),
        );
        game.scale.setZoom(zoom);
      };
      resize();
      window.addEventListener('resize', resize);
      game.events.once(Phaser.Core.Events.DESTROY, () =>
        window.removeEventListener('resize', resize),
      );
    },
  },
});
