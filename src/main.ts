import Phaser from 'phaser';
import { Boot } from './scenes/Boot';
import { Preload } from './scenes/Preload';
import { MainMenu } from './scenes/MainMenu';
import { CityPicker } from './scenes/CityPicker';
import { City } from './scenes/City';
import { Plac } from './scenes/Plac';
import { audio } from './audio/GameAudio';
import { ui } from './core/presentation';
import './style.css';

audio.listen();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}quiz-worker.js`)
    .catch((error: unknown) =>
      console.warn('Offline cache unavailable', error),
    );
}

const orientation = document.createElement('div');
orientation.className = 'orientation-warning';
orientation.textContent = ui.driving.rotate;
orientation.setAttribute('role', 'status');
document.body.append(orientation);
document.title = `${ui.title}: ${ui.subtitle}`;
const parent = document.querySelector<HTMLElement>('#game')!;
const baseWidth = 640;
const baseHeight = 360;
let game: Phaser.Game | undefined;
let booted = false;

function resizeGame(game: Phaser.Game) {
  const { clientWidth: width, clientHeight: height } = parent;
  if (width < 1 || height < 1) {
    game.pause();
    return;
  }

  const zoom = Math.max(
    1,
    Math.floor(Math.min(width / baseWidth, height / baseHeight)),
  );
  const gameWidth = Math.floor(width / zoom);
  const gameHeight = Math.floor(height / zoom);
  if (game.scale.width !== gameWidth || game.scale.height !== gameHeight) {
    game.scale.resize(gameWidth, gameHeight);
    game.scale.setZoom(zoom);
  } else if (game.scale.zoom !== zoom) {
    game.scale.setZoom(zoom);
  }
  game.resume();
}

function syncViewport() {
  if (game) {
    if (booted) resizeGame(game);
    return;
  }

  if (parent.clientWidth < 1 || parent.clientHeight < 1) return;

  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: baseWidth,
    height: baseHeight,
    backgroundColor: '#1a1c2c',
    audio: { noAudio: true },
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.NO_CENTER },
    scene: [Boot, Preload, MainMenu, CityPicker, City, Plac],
    callbacks: {
      postBoot(game) {
        booted = true;
        resizeGame(game);
        game.events.once(Phaser.Core.Events.DESTROY, () => {
          audio.destroy();
          observer.disconnect();
          window.removeEventListener('resize', syncViewport);
          document.removeEventListener('visibilitychange', syncViewport);
        });
      },
    },
  });
}

// A hidden container can change size without dispatching a window resize.
const observer = new ResizeObserver(syncViewport);
observer.observe(parent);
window.addEventListener('resize', syncViewport);
document.addEventListener('visibilitychange', syncViewport);
syncViewport();
