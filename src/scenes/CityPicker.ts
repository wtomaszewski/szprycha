import { defaultMap, type MapId } from './cityMaps';
import { startCity } from './startScene';
import { Geom, Scene } from 'phaser';
import type { GameContent } from '../content/schemas';
import { ui } from '../core/presentation';
import type { MissionProgress } from '../gameplay/MissionProgress';

import { menuGamepad } from '../ui/KeyboardGamepad';

type Mode = 'campaign' | 'freeRide';
const mapFrame = { x: 24, y: 43, width: 592, height: 280 };
const pins = [
  { id: 'warszawa', x: 426, y: 169 },
  { id: 'wroclaw', x: 210, y: 228 },
  { id: 'gdansk', x: 319, y: 79 },
  { id: 'poznan', x: 208, y: 144 },
  { id: 'lodz', x: 316, y: 171 },
  { id: 'krakow', x: 365, y: 229 },
  { id: 'zakopane', x: 385, y: 287 },
  { id: 'wies', x: 450, y: 78 },
  { id: defaultMap, x: 528, y: 269 },
] as const;

// A simplified outline of Poland in four-pixel steps, from the Baltic coast
// around the eastern border and the mountain ranges to the Oder in the west.
const outline = [
  [140, 100],
  [148, 80],
  [176, 80],
  [184, 76],
  [208, 76],
  [244, 60],
  [272, 52],
  [300, 56],
  [312, 64],
  [324, 64],
  [344, 56],
  [364, 64],
  [420, 64],
  [452, 76],
  [468, 96],
  [472, 116],
  [488, 136],
  [480, 156],
  [492, 172],
  [484, 192],
  [496, 212],
  [488, 232],
  [472, 244],
  [492, 276],
  [472, 284],
  [440, 276],
  [420, 292],
  [400, 284],
  [384, 296],
  [360, 288],
  [344, 296],
  [328, 280],
  [300, 280],
  [288, 268],
  [260, 272],
  [240, 252],
  [220, 260],
  [196, 244],
  [184, 228],
  [160, 236],
  [156, 212],
  [144, 196],
  [148, 176],
  [136, 164],
  [144, 144],
  [132, 124],
] as const;

export class CityPicker extends Scene {
  private readGamepad?: () => void;

  update() {
    this.readGamepad?.();
  }

  constructor() {
    super('CityPicker');
  }

  create({ mode }: { mode: Mode }) {
    const progress = this.registry.get('missionProgress') as MissionProgress;
    const content = this.registry.get('content') as GameContent;
    const labels = ui.cityPicker;
    const g = this.add.graphics();
    g.fillStyle(0x1a1c2c).fillRect(0, 0, 640, 360);
    const { x: left, y: top, width, height } = mapFrame;
    g.fillStyle(0x213b52).fillRect(left, top, width, height);
    g.lineStyle(1, 0x566c86).strokeRect(left, top, width, height);
    for (let y = 56; y < top + height; y += 16)
      for (let x = 32; x < 612; x += 16)
        g.fillStyle(0x2b4a61).fillRect(x, y, 1, 1);

    // Quantize the silhouette and its shading to the same pixel grid.
    const country = new Geom.Polygon(outline.map(([x, y]) => ({ x, y })));
    const inside = (x: number, y: number) => country.contains(x + 2, y + 2);
    for (let y = 48; y < 300; y += 4) {
      for (let x = 128; x < 500; x += 4) {
        if (!inside(x, y)) continue;
        const edge =
          !inside(x - 4, y) ||
          !inside(x + 4, y) ||
          !inside(x, y - 4) ||
          !inside(x, y + 4);
        const shade = Math.sin(x / 19 + y / 17) + Math.cos(x / 31 - y / 13);
        g.fillStyle(
          edge
            ? 0xa7c974
            : shade > 0.75
              ? 0x477e61
              : shade < -0.75
                ? 0x2f634f
                : 0x396f57,
        ).fillRect(x, y, 4, 4);
      }
    }
    const controls = document.createElement('main');
    controls.className = 'city-picker';
    controls.setAttribute('aria-labelledby', 'city-picker-title');
    const header = document.createElement('header');
    const title = document.createElement('h1');
    title.id = 'city-picker-title';
    title.textContent = labels.title;
    const modeLabel = document.createElement('p');
    modeLabel.textContent = labels[mode];
    header.append(title, modeLabel);
    controls.append(header);
    let leaving = false;
    const leave = () => {
      if (leaving) return;
      leaving = true;
      this.scene.start('MainMenu', { cityPickerMode: mode });
    };
    const freeRide = mode === 'freeRide';
    const enter = async (city: MapId) => {
      if (leaving) return;
      leaving = true;
      if (city === defaultMap) {
        startCity(this, { map: city, freeRide: true }, city);
        return;
      }
      await progress.selectCity(city, freeRide);
      const resume = freeRide ? undefined : progress.campaignRide(city);
      const mission =
        !freeRide && !resume ? progress.nextMission(city, content) : undefined;
      const map = resume?.map ?? city;
      startCity(
        this,
        {
          city,
          map,
          missionId: mission?.id,
          guidedAfter: resume?.after,
          pose: resume,
          freeRide,
        },
        mission?.mapa ?? mission?.miasto ?? map,
      );
    };

    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'city-picker-back';
    back.textContent = labels.back;
    back.addEventListener('click', leave);
    const destinations = document.createElement('div');
    destinations.className = 'city-picker-destinations';
    destinations.style.setProperty('--frame-left', `${(100 * left) / 640}%`);
    destinations.style.setProperty('--frame-top', `${(100 * top) / 360}%`);
    destinations.style.setProperty('--frame-width', `${(100 * width) / 640}%`);
    destinations.style.setProperty(
      '--frame-height',
      `${(100 * height) / 360}%`,
    );
    controls.append(destinations, back);
    let selected = back;
    const selectedCity = freeRide
      ? progress.freeRideCity
      : progress.selectedCity;
    for (const { id, x, y } of pins) {
      if (!freeRide && id === defaultMap) continue;
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'city-picker-pin';
      pin.style.setProperty('--pin-x', `${(100 * (x - left)) / width}%`);
      pin.style.setProperty('--pin-y', `${(100 * (y - top)) / height}%`);
      const marker = document.createElement('span');
      marker.className = 'city-picker-marker';
      marker.setAttribute('aria-hidden', 'true');
      const caption = document.createElement('span');
      caption.className = 'city-picker-caption';
      caption.textContent = id === defaultMap ? ui.driving.title : labels[id];
      pin.append(marker, caption);
      pin.addEventListener('click', () => void enter(id));
      if (id === selectedCity) {
        pin.classList.add('city-picker-selected');
        pin.setAttribute('aria-current', 'true');
        selected = pin;
      }
      destinations.append(pin);
    }

    document.body.append(controls);
    this.readGamepad = menuGamepad(controls, leave);
    const center = () => {
      const { width, height, zoom } = this.scale;
      const mapZoom = Math.min(1, width / 640, height / 360);
      this.cameras.main
        .setZoom(mapZoom)
        .setScroll(
          -Math.floor((width - 640) / 2),
          -Math.floor((height - 360) / 2),
        );
      controls.style.setProperty('--picker-zoom', String(zoom * mapZoom));
    };
    center();
    this.scale.on('resize', center);
    this.input.keyboard?.on('keydown-ESC', leave);
    this.events.once('shutdown', () => {
      this.readGamepad = undefined;
      this.scale.off('resize', center);
      this.input.keyboard?.off('keydown-ESC', leave);
      controls.remove();
    });
    const canvas = this.game.canvas;
    canvas.dataset.scene = this.scene.key;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', labels.map);
    selected.focus();
  }
}
