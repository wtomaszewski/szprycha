import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { contentSchema } from '../src/content/schemas.ts';

export const contentFiles = [
  'przepisy.yaml',
  'znaki.yaml',
  'pytania.json',
  'balans.yaml',
  'osiagniecia.yaml',
] as const;
export async function readContent(root = process.cwd()) {
  const entries = await Promise.all(
    contentFiles.map(async (file) => {
      const source = await readFile(resolve(root, 'content', file), 'utf8');
      const value: unknown = file.endsWith('.json')
        ? JSON.parse(source)
        : parse(source);
      return [file.split('.')[0], value];
    }),
  );
  return contentSchema.parse(Object.fromEntries(entries));
}
export async function buildContent(root = process.cwd()) {
  const content = await readContent(root);
  const output = resolve(root, 'public/data');
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, 'content.json'), JSON.stringify(content));
  return content;
}
