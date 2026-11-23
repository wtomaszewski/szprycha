import catalog from '../../assets/voice/manifest.json';
import type { VoiceLine } from './voiceLines';

type Catalog = {
  lines: Record<string, { text: string; hash: string }>;
  recorded: Record<
    string,
    { hash: string; files: Partial<Record<string, string>> }
  >;
};

const { lines, recorded }: Catalog = catalog;
const urls = import.meta.glob<string>('../../assets/voice/pl/*.{ogg,m4a}', {
  eager: true,
  import: 'default',
  query: '?url&no-inline',
});

export function recordingUrls({ id, text }: VoiceLine) {
  const line = lines[id];
  const clip = recorded[id];
  if (!line || !clip || line.text !== text || line.hash !== clip.hash)
    return [];
  return ['ogg', 'm4a'].flatMap((ext) => {
    const url = urls[`../../assets/voice/pl/${id}.${ext}`];
    return clip.files[ext] && url ? [url] : [];
  });
}
