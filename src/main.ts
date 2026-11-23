import { Capacitor } from '@capacitor/core';
import Phaser from 'phaser';
import { Boot } from './scenes/Boot';
import { Preload } from './scenes/Preload';
import { MainMenu } from './scenes/MainMenu';
import { audio } from './audio/GameAudio';
import { ui } from './core/presentation';
import { showUpdateNotice } from './platform/pwa';
import { enableDialogFocus } from './ui/KeyboardGamepad';
import './style.css';

audio.listen();
enableDialogFocus();

if (
  import.meta.env.PROD &&
  !Capacitor.isNativePlatform() &&
  'serviceWorker' in navigator
) {
  void showUpdateNotice(navigator.serviceWorker);
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
const touch = matchMedia('(any-pointer: coarse)');
let resolution = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
let game: Phaser.Game | undefined;
let booted = false;

function resizeGame(game: Phaser.Game) {
  const bounds = parent.getBoundingClientRect();
  const ratio = devicePixelRatio;
  const left = Math.ceil(bounds.left * ratio);
  const top = Math.ceil(bounds.top * ratio);
  const width = Math.floor(bounds.right * ratio) - left;
  const height = Math.floor(bounds.bottom * ratio) - top;
  if (width < 1 || height < 1) {
    game.pause();
    return;
  }

  const preferredHeight = touch.matches
    ? Phaser.Math.Clamp(
        Math.round((height * baseWidth) / width),
        baseHeight,
        480,
      )
    : baseHeight;
  // Scale in device pixels. A CSS pixel can cover several physical pixels.
  const fit = Math.min(width / baseWidth, height / preferredHeight);
  const nextScale = Math.ceil(fit);
  // On fractional-DPR phones, a small reduction in the logical view can
  // keep a much larger display area while retaining whole device pixels.
  const pixelScale = Math.max(
    1,
    touch.matches && fit >= nextScale * 0.875 ? nextScale : Math.floor(fit),
  );
  const columns = Math.floor(width / pixelScale);
  const rows = Math.floor(height / pixelScale);
  const gameWidth = touch.matches ? Math.min(baseWidth, columns) : columns;
  const gameHeight = touch.matches ? Math.min(preferredHeight, rows) : rows;
  const zoom = pixelScale / ratio;
  const { style } = game.canvas;
  style.left = `${(left + Math.floor((width - gameWidth * pixelScale) / 2)) / ratio - bounds.left}px`;
  style.top = `${(top + Math.floor((height - gameHeight * pixelScale) / 2)) / ratio - bounds.top}px`;

  if (game.scale.width !== gameWidth || game.scale.height !== gameHeight) {
    if (game.scale.zoom === 1) {
      style.width = '';
      style.height = '';
    }
    game.scale.resize(gameWidth, gameHeight);
  }
  if (game.scale.zoom !== zoom) game.scale.setZoom(zoom);
  else game.scale.updateBounds();
  game.resume();
}

function syncResolution() {
  resolution.removeEventListener('change', syncResolution);
  resolution = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
  resolution.addEventListener('change', syncResolution);
  syncViewport();
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
    scene: [Boot, Preload, MainMenu],
    callbacks: {
      postBoot(game) {
        booted = true;
        resizeGame(game);
        game.events.once(Phaser.Core.Events.DESTROY, () => {
          audio.destroy();
          observer.disconnect();
          window.removeEventListener('resize', syncViewport);
          document.removeEventListener('visibilitychange', syncViewport);
          resolution.removeEventListener('change', syncResolution);
        });
      },
    },
  });
}

// A hidden container can change size without dispatching a window resize.
const observer = new ResizeObserver(syncViewport);
observer.observe(parent);
resolution.addEventListener('change', syncResolution);
window.addEventListener('resize', syncViewport);
document.addEventListener('visibilitychange', syncViewport);
syncViewport();
