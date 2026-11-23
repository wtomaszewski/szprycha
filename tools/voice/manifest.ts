import { createHash, randomUUID } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';

export const voiceIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*$/)
  .refine((id) => !Object.hasOwn(Object.prototype, id));
export const formats = ['ogg', 'm4a'] as const;
export const formatSchema = z.enum(formats);
export type Format = (typeof formats)[number];

export const providers = ['elevenlabs', 'azure'] as const;
const digest = z.string().regex(/^[0-9a-f]{64}$/);
const manifestSchema = z.strictObject({
  version: z.literal(1),
  language: z.literal('pl'),
  lines: z.record(
    voiceIdSchema,
    z.strictObject({ text: z.string().min(1), hash: digest }),
  ),
  recorded: z.record(
    voiceIdSchema,
    z.strictObject({
      hash: digest,
      provider: z.enum(providers),
      voiceId: z.string().min(1),
      model: z.string().min(1).optional(),
      files: z.strictObject({ ogg: digest, m4a: digest }),
    }),
  ),
});

export type Manifest = z.infer<typeof manifestSchema>;
export type Recording = Manifest['recorded'][string];

export function hash(data: string | Uint8Array) {
  return createHash('sha256').update(data).digest('hex');
}

export function manifestPath(root: string) {
  return join(root, 'assets/voice/manifest.json');
}

export function audioDirectory(root: string) {
  return join(root, 'assets/voice/pl');
}

export async function readManifest(root: string): Promise<Manifest> {
  const data = await readFile(manifestPath(root), 'utf8').catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    },
  );
  if (data === undefined)
    return { version: 1, language: 'pl', lines: {}, recorded: {} };
  return manifestSchema.parse(JSON.parse(data));
}

export async function writeManifest(root: string, manifest: Manifest) {
  const path = manifestPath(root);
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(
      temp,
      JSON.stringify(
        {
          ...manifest,
          recorded: Object.fromEntries(
            Object.entries(manifest.recorded).sort(([a], [b]) =>
              a < b ? -1 : a > b ? 1 : 0,
            ),
          ),
        },
        null,
        2,
      ) + '\n',
    );
    await rename(temp, path);
  } finally {
    await rm(temp, { force: true });
  }
}

export async function readAudio(path: string) {
  return readFile(path).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error;
  });
}
