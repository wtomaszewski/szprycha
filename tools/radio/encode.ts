import { spawn } from 'node:child_process';
import { sampleRate } from './synthesize.ts';

const pcmFormat = ['-f', 'f32le', '-ar', String(sampleRate), '-ac', '1'];
export const targetLufs = -21;

export function ffmpeg(args: string[], input: Buffer) {
  return new Promise<string>((resolve, reject) => {
    const process = spawn(
      'ffmpeg',
      ['-hide_banner', '-nostdin', '-filter_threads', '1', ...args],
      {
        stdio: ['pipe', 'ignore', 'pipe'],
      },
    );
    let log = '';
    process.stderr
      .setEncoding('utf8')
      .on('data', (chunk: string) => (log += chunk));
    process.on('error', (error) =>
      reject(
        new Error('Radio export requires FFmpeg on PATH.', { cause: error }),
      ),
    );
    process.on('close', (code) =>
      code === 0
        ? resolve(log)
        : reject(new Error(`FFmpeg exited with ${code}\n${log}`)),
    );
    process.stdin.on('error', (error) => {
      if ((error as NodeJS.ErrnoException).code !== 'EPIPE') reject(error);
    });
    process.stdin.end(input);
  });
}

export async function encodeTrack(pcm: Float32Array, path: string) {
  const input = Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  const compression =
    'acompressor=threshold=0.14:ratio=2.5:attack=10:release=115';
  const stats = await ffmpeg(
    [
      '-nostats',
      ...pcmFormat,
      '-i',
      'pipe:0',
      '-af',
      `${compression},ebur128=dualmono=true`,
      '-f',
      'null',
      '-',
    ],
    input,
  );
  const loudness = Number(
    stats.match(
      /I:\s+(-?[\d.]+) LUFS\s+Threshold:[^\n]*\n\s*\n\s*Loudness range:/,
    )?.[1],
  );
  if (!Number.isFinite(loudness) || loudness < -65)
    throw new Error(`Cannot measure integrated radio loudness for ${path}`);

  await ffmpeg(
    [
      '-loglevel',
      'error',
      '-y',
      ...pcmFormat,
      '-i',
      'pipe:0',
      '-af',
      `${compression},volume=${targetLufs - loudness}dB,aresample=48000,alimiter=limit=0.70795:level=false:latency=true`,
      '-ar',
      String(sampleRate),
      '-c:a',
      'libmp3lame',
      '-b:a',
      '48k',
      '-map_metadata',
      '-1',
      '-f',
      'mp3',
      path,
    ],
    input,
  );
}
