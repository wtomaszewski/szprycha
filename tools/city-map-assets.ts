import { readFile } from 'node:fs/promises';
import { basename, relative, sep } from 'node:path';
import type { Plugin } from 'vite';

export function cityMapAssets(): Plugin {
  let root: string;
  let building: boolean;
  return {
    name: 'szprycha-city-maps',
    configResolved(config) {
      root = config.root;
      building = config.command === 'build';
    },
    async load(id) {
      const query = '?city-map';
      if (!id.endsWith('.tmj' + query)) return;
      const path = id.slice(0, -query.length);
      if (!building)
        return `export default ${JSON.stringify('/' + relative(root, path).split(sep).join('/'))}`;

      this.addWatchFile(path);
      const source = JSON.stringify(JSON.parse(await readFile(path, 'utf8')));
      const ref = this.emitFile({
        type: 'asset',
        name: basename(path),
        source,
      });
      return `export default import.meta.ROLLUP_FILE_URL_${ref};`;
    },
  };
}
