import { missionCity, type PlayableCity } from '../content/missions';
import trainingUrl from '../../maps/miasteczko.tmj?url';
import warsawUrl from '../../maps/warszawa.tmj?url';
import wroclawUrl from '../../maps/wroclaw.tmj?url';
import krakowUrl from '../../maps/krakow.tmj?url';
import gdanskUrl from '../../maps/gdansk.tmj?url';
import lodzUrl from '../../maps/lodz.tmj?url';
import poznanUrl from '../../maps/poznan.tmj?url';
import zakopaneUrl from '../../maps/zakopane.tmj?url';
import wiesUrl from '../../maps/wies.tmj?url';

export const defaultMap = 'miasteczko';
export type MapId = PlayableCity | typeof defaultMap;
export const mapUrls: Record<MapId, string> = {
  [defaultMap]: trainingUrl,
  warszawa: warsawUrl,
  wroclaw: wroclawUrl,
  krakow: krakowUrl,
  gdansk: gdanskUrl,
  poznan: poznanUrl,
  lodz: lodzUrl,
  zakopane: zakopaneUrl,
  wies: wiesUrl,
};

export function isMap(id: string): id is MapId {
  return Object.hasOwn(mapUrls, id);
}

export function defaultRideMap(city: PlayableCity): MapId {
  return missionCity.safeParse(city).success ? defaultMap : city;
}

export type MapDownload = {
  id: MapId;
  data: Promise<object | undefined>;
  startedWithoutWorker: boolean;
};

export function downloadMap(id: MapId, signal: AbortSignal): MapDownload {
  const startedWithoutWorker = !navigator.serviceWorker?.controller;
  const data = fetch(mapUrls[id], { signal })
    .then(async (response) => {
      if (!response.ok) return;
      const map: unknown = await response.json();
      if (map && typeof map === 'object' && !Array.isArray(map)) return map;
    })
    .catch(() => undefined);
  return { id, data, startedWithoutWorker };
}
