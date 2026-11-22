import type { PlacExercises } from '../../../content/plac';
import { RIDER_RADIUS } from '../../bicycle';
import { detector, type ReportFault } from './types';

export function brakingBox(
  exercise: PlacExercises['PLAC-04'],
  report: ReportFault,
) {
  const {
    stopBox: { x, y, width, height },
    stopTolerance,
  } = exercise;
  let rode = false;
  return detector((_state, { rider, skidding }) => {
    if (skidding) report('skid', 'minor');
    if (rider.speed > 0) rode = true;
    const front = rider.x + RIDER_RADIUS;
    const back = rider.x - RIDER_RADIUS;
    const farEdge = x + width;
    if (front > farEdge + stopTolerance) {
      report('longStop', 'major');
      return true;
    }
    if (!rode || rider.speed > 0) return false;
    if (front > farEdge)
      report('longStop', back <= farEdge ? 'minor' : 'major');
    else if (
      back < x ||
      rider.y - RIDER_RADIUS < y ||
      rider.y + RIDER_RADIUS > y + height
    )
      report(
        'shortStop',
        front >= x && rider.y >= y && rider.y <= y + height ? 'minor' : 'major',
      );
    return true;
  });
}
