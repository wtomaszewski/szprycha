import type { PlacExercises } from '../../../content/plac';
import {
  assessLane,
  distance,
  distanceToSegment,
  touchesCone,
} from './geometry';
import { detector, type ReportFault } from './types';

export function figureEight(
  exercise: PlacExercises['PLAC-01'],
  report: ReportFault,
) {
  const { path, cones, halfWidth, gateRadius } = exercise;
  const checker = detector((state, { rider, previous, footDown }) => {
    if (footDown) report('footDown', 'major');
    let offset = Infinity;
    for (let i = 1; i < path.length; i++)
      offset = Math.min(
        offset,
        distanceToSegment(rider, path[i - 1]!, path[i]!),
      );
    assessLane(offset, halfWidth, report);
    for (let i = 0; i < cones.length; i++) {
      if (!state.coneHits.has(i) && touchesCone(cones[i]!, previous, rider)) {
        report('cone', 'minor');
        state.coneHits.add(i);
      }
    }
    const next = path[state.nextMarker];
    if (next && distance(next, rider) <= gateRadius) state.nextMarker++;
    return state.nextMarker === path.length;
  });
  checker.nextMarker = 1;
  return checker;
}
