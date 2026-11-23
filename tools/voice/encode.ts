import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { z } from 'zod';
import { formats, type Format } from './manifest.ts';

const exec = promisify(execFile);
async function ffmpeg(args: string[]) {
  try {
    return await exec('ffmpeg', ['-nostdin', '-hide_banner', ...args], {
      timeout: 60_000,
    });
  } catch {
    // Do not log child process output or stack traces.
    throw new Error(
      'Błąd FFmpeg. Sprawdź instalację oraz enkodery libopus i AAC.',
    );
  }
}

export async function checkEncoder() {
  const { stdout } = await ffmpeg(['-encoders']);
  if (!/\blibopus\b/.test(stdout) || !/\baac\b/.test(stdout))
    throw new Error('FFmpeg musi udostępniać enkodery libopus i AAC.');
}

const loudnorm = 'loudnorm=I=-16:TP=-1.5:LRA=7';
const onlyNumber = z.string().regex(/^-?\d+(?:\.\d+)?$/);
const measurements = z.object({
  input_i: onlyNumber,
  input_tp: onlyNumber,
  input_lra: onlyNumber,
  input_thresh: onlyNumber,
  target_offset: onlyNumber,
});
const codec: Record<Format, string[]> = {
  ogg: ['-c:a', 'libopus', '-b:a', '32k', '-application', 'voip'],
  m4a: ['-c:a', 'aac', '-b:a', '48k', '-movflags', '+faststart'],
};

export async function encode(input: Uint8Array, directory: string) {
  const raw = join(directory, 'input');
  await writeFile(raw, input);
  const source = ['-i', raw, '-map', '0:a:0'];
  const mono =
    'aformat=sample_rates=48000:channel_layouts=mono,apad=whole_dur=0.5';
  const { stderr } = await ffmpeg([
    ...source,
    '-af',
    `${mono},${loudnorm}:print_format=json`,
    '-f',
    'null',
    '-',
  ]);
  const stats = stderr.match(/\{\s*"input_i"[^}]+\}/)?.[0];
  const parsed = measurements.safeParse(stats && JSON.parse(stats));
  if (!parsed.success)
    throw new Error('FFmpeg nie zmierzył głośności otrzymanej kwestii.');
  const { input_i, input_tp, input_lra, input_thresh, target_offset } =
    parsed.data;
  const filter = [
    loudnorm,
    `measured_I=${input_i}`,
    `measured_TP=${input_tp}`,
    `measured_LRA=${input_lra}`,
    `measured_thresh=${input_thresh}`,
    `offset=${target_offset}`,
    'linear=true',
  ].join(':');
  const normalized = join(directory, 'normalized.wav');
  await ffmpeg([
    '-y',
    ...source,
    '-af',
    `${mono},${filter}`,
    '-ac',
    '1',
    '-ar',
    '48000',
    '-c:a',
    'pcm_s24le',
    normalized,
  ]);
  const output = {} as Record<Format, Uint8Array>;
  for (const format of formats) {
    const path = join(directory, `output.${format}`);
    await ffmpeg([
      '-y',
      '-i',
      normalized,
      '-map_metadata',
      '-1',
      ...codec[format],
      path,
    ]);
    output[format] = await readFile(path);
  }
  return output;
}
