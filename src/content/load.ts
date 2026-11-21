import { contentSchema } from './schemas';
export async function loadContent() {
  const response = await fetch(`${import.meta.env.BASE_URL}data/content.json`);
  if (!response.ok) throw new Error(`Content HTTP ${response.status}`);
  const raw: unknown = await response.json();
  return contentSchema.parse(raw);
}
