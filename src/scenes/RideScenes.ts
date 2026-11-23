import { Tilemaps, type Scene } from 'phaser';
import trainingUrl from '../../maps/miasteczko.tmj?city-map';
import warsawUrl from '../../maps/warszawa.tmj?city-map';
import wroclawUrl from '../../maps/wroclaw.tmj?city-map';
import krakowUrl from '../../maps/krakow.tmj?city-map';
import type { MissionDefinition, PlayableCity } from '../content/missions';
import type { GameContent } from '../content/schemas';
import { showError, ui } from '../core/presentation';
import type { ExamAttempt, ExamRide } from '../gameplay/exam/exam';
import { examRoute } from '../gameplay/exam/route';
import type { MissionProgress } from '../gameplay/MissionProgress';
import type { DailyOrder } from '../gameplay/procedural/orders';
import type { TutorialStep } from '../gameplay/Tutorial';
import { fetchOfflineAsset } from '../platform/offlineAssets';

export const defaultMap = 'miasteczko';
const mapUrls = {
  [defaultMap]: trainingUrl,
  warszawa: warsawUrl,
  wroclaw: wroclawUrl,
  krakow: krakowUrl,
};
type CityMap = keyof typeof mapUrls;

export function hasCityMap(id: string): id is CityMap {
  return Object.hasOwn(mapUrls, id);
}

type CityEntry = {
  missionId?: string;
  map?: CityMap;
  city?: PlayableCity;
  examRide?: ExamRide;
  freeRide?: boolean;
  dailyOrder?: DailyOrder;
  tutorial?: TutorialStep;
};

export type PreparedCity = CityEntry & {
  city: PlayableCity;
  mapId: CityMap;
  definition?: MissionDefinition;
};

export type PlacEntry = {
  origin?: 'MainMenu' | 'City';
  attempt?: ExamAttempt;
  rehearsal?: boolean;
};

const pending = new WeakSet<Scene>();

async function enter(
  from: Scene,
  action: () => Promise<void>,
  errorMessage?: string,
) {
  if (pending.has(from)) return false;
  pending.add(from);
  const status = document.getElementById('status');
  if (status) {
    status.textContent = ui.loading;
    status.setAttribute('role', 'status');
  }
  try {
    await action();
    status?.replaceChildren();
    return true;
  } catch (error) {
    showError(error, errorMessage);
    return false;
  } finally {
    pending.delete(from);
  }
}

export function startCity(from: Scene, entry: CityEntry = {}) {
  return enter(
    from,
    async () => {
      const content = from.registry.get('content') as GameContent;
      const progress = from.registry.get('missionProgress') as MissionProgress;
      const city = entry.examRide?.city ?? entry.city ?? progress.selectedCity;
      const definition = entry.examRide
        ? examRoute(city, content.balans.licencja)
        : (entry.dailyOrder?.definition ??
          content.misje.find(
            (mission) =>
              mission.id === entry.missionId &&
              mission.miasto === city &&
              progress.isAvailable(mission, content),
          ));
      const mapId =
        definition?.mapa ??
        definition?.miasto ??
        entry.map ??
        (city === 'krakow' ? city : defaultMap);
      if (!hasCityMap(mapId)) throw new Error(`Unknown city map: ${mapId}`);
      const cache = from.cache.tilemap;
      const loadMap = async () => {
        if (cache.exists(mapId)) return;
        const url = mapUrls[mapId];
        const response =
          mapId === defaultMap
            ? await fetch(url)
            : await fetchOfflineAsset(url);
        if (!response.ok) throw new Error(`City map HTTP ${response.status}`);
        const data: unknown = await response.json();
        cache.add(mapId, { format: Tilemaps.Formats.TILED_JSON, data });
      };
      const [{ City }] = await Promise.all([import('./City'), loadMap()]);
      if (!from.scene.isActive()) return;
      const data: PreparedCity = { ...entry, city, mapId, definition };
      if (from.scene.key === 'City') from.scene.restart(data);
      else {
        if (!from.scene.manager.keys.City) from.scene.add('City', City);
        from.scene.start('City', data);
      }
    },
    ui.cityPicker.loadError,
  );
}

export function startPlac(from: Scene, entry: PlacEntry = {}) {
  return enter(from, async () => {
    const { Plac } = await import('./Plac');
    if (!from.scene.isActive()) return;
    if (!from.scene.manager.keys.Plac) from.scene.add('Plac', Plac);
    from.scene.start('Plac', entry);
  });
}
