const key = (classId: string) => 'szprycha:teacher-labels:' + classId;
export const maxLabelLength = 48;

function read(storage: Storage, classId: string): Map<string, string> {
  const raw = storage.getItem(key(classId));
  if (!raw) return new Map();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return new Map();
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return new Map();
  const pairs = Object.entries(value).filter(
    (entry): entry is [string, string] =>
      typeof entry[1] === 'string' && entry[1].length <= maxLabelLength,
  );
  return new Map(pairs);
}

function write(storage: Storage, classId: string, labels: Map<string, string>) {
  if (labels.size)
    storage.setItem(key(classId), JSON.stringify(Object.fromEntries(labels)));
  else storage.removeItem(key(classId));
}

export function classLabels(
  storage: Storage,
  classId: string,
  members: readonly string[],
) {
  const labels = read(storage, classId);
  const current = new Map(
    members.flatMap((id) => {
      const label = labels.get(id);
      return label ? [[id, label] as const] : [];
    }),
  );
  if (current.size !== labels.size) write(storage, classId, current);
  return current;
}

export function setLabel(
  storage: Storage,
  classId: string,
  id: string,
  text: string,
) {
  const labels = read(storage, classId);
  const label = text.trim().slice(0, maxLabelLength);
  if (label) labels.set(id, label);
  else labels.delete(id);
  write(storage, classId, labels);
}

export function clearClassLabels(storage: Storage, classId: string) {
  storage.removeItem(key(classId));
}
