import type { WorldModel } from '../../rules/world/WorldModel';
import type { RouteProof } from './validateRoute';

export const signRules: Readonly<Record<string, string>> = {
  'A-7': 'ZNAK-A7',
  'B-1': 'ZNAK-B1',
  'B-2': 'ZNAK-B2T22',
  'B-9': 'ZNAK-B9',
  'B-20': 'ZNAK-STOP',
  'C-13': 'ZNAK-C13',
  'D-1': 'ZNAK-D1',
  'P-23': 'ZNAK-P23',
};

// These rule-to-feature associations match the situations in coverage-report.
export function routeFocus(
  world: WorldModel,
  proof: RouteProof,
  night: boolean,
) {
  const seen = (id: string) => proof.visited.includes(id);
  const rules = new Set(proof.habits);
  for (const zone of world.zones.filter(({ id }) => seen(id))) {
    if (zone.kind === 'bike_path') rules.add('GDZIE-01');
    if (zone.kind === 'bike_lane') rules.add('GDZIE-02');
    if (zone.kind === 'shared_path') rules.add('GDZIE-11');
    if (zone.kind === 'living_zone') rules.add('GDZIE-07');
    if (zone.kind === 'shoulder') rules.add('GDZIE-03b');
    if (zone.kind === 'no_bikes') rules.add('GDZIE-09');
    if (zone.surface === 'rough') rules.add('MAN-08');
  }
  for (const lane of world.lanes.filter(({ id }) => seen(id))) {
    const { intersection, arrow, mainSignal, priorityClass } = lane;
    if (intersection.kind === 'equal' && seen(intersection.id))
      rules.add('PIER-01');
    if (intersection.kind === 'priority' && seen(intersection.id))
      rules.add('PIER-02');
    if (priorityClass === 'roundabout_in' && seen(intersection.id))
      rules.add('PIER-08');
    if (mainSignal && seen(intersection.id)) rules.add('SYG-01');
    if (arrow && seen(intersection.id)) rules.add('ZNAK-S2');
  }
  for (const crossing of world.crossings.filter(({ id }) => seen(id))) {
    if (crossing.kind === 'rail') rules.add('MSC-01');
    if (crossing.kind === 'bike' || crossing.kind === 'combined')
      rules.add('PIER-05');
    if (crossing.signal) rules.add('SYG-02');
  }
  if (world.driveways.some(({ id }) => seen(id))) rules.add('MSC-03');
  if (world.tramStops.some(({ id }) => seen(id))) rules.add('MSC-02');
  for (const sign of world.signs)
    if (!sign.displayOnly && seen(sign.id) && signRules[sign.code])
      rules.add(signRules[sign.code]!);
  if (rules.has('ZNAK-B9')) rules.add('GDZIE-09');
  if (night) for (const id of ['WYP-04', 'WYP-05', 'MSC-04']) rules.add(id);
  return [...rules].sort();
}
