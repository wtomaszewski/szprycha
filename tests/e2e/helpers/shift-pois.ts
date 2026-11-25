import type { Page } from '@playwright/test';

export async function shiftPois(
  page: Page,
  city: string,
  positions: Record<string, readonly [x: number, y: number]>,
) {
  await page.route(
    new RegExp(`/${city}(?:-[^/]+)?\\.tmj(?:\\?|$)`),
    async (route) => {
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
      for (const [name, [x, y]] of Object.entries(positions)) {
        const poi = pois.find((object) => object.name === name);
        if (!poi) throw new Error(`Missing POI ${name} in ${city}`);
        Object.assign(poi, { x: x - poi.width / 2, y: y - poi.height / 2 });
      }
      await route.fulfill({ response, json: map });
    },
  );
}
