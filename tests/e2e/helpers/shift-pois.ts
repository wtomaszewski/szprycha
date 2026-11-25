import type { Page, Route } from '@playwright/test';

export type PoiPosition = readonly [
  x: number,
  y: number,
  width?: number,
  height?: number,
];

export async function shiftPois(
  page: Page,
  city: string,
  positions: Record<string, PoiPosition>,
  rivalDetour?: { name: string; start: number; length: number },
) {
  const pattern = new RegExp(`/${city}(?:-[^/]+)?\\.tmj(?:\\?|$)`);
  const modify = async (route: Route) => {
    if (route.request().resourceType() === 'script') return route.continue();
    const response = await route.fetch();
    const map = await response.json();
    const pois: {
      name: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }[] = map.layers.find(
      ({ name }: { name: string }) => name === 'pois',
    ).objects;
    for (const [name, [x, y, width, height]] of Object.entries(positions)) {
      const poi = pois.find((object) => object.name === name);
      if (!poi) throw new Error(`Missing POI ${name} in ${city}`);
      poi.width = width ?? poi.width;
      poi.height = height ?? poi.height;
      Object.assign(poi, { x: x - poi.width / 2, y: y - poi.height / 2 });
    }
    if (rivalDetour) {
      const race = map.layers
        .find(({ name }: { name: string }) => name === 'race_routes')
        .objects.find(
          ({ name }: { name: string }) => name === rivalDetour.name,
        );
      if (!race)
        throw new Error(`Missing race route ${rivalDetour.name} in ${city}`);
      race.polyline.splice(rivalDetour.start, rivalDetour.length);
    }
    await route.fulfill({ response, json: map });
  };
  await page.route(pattern, modify);
  return () => page.unroute(pattern, modify);
}
