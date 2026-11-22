import type { PlacExercises } from '../../../content/plac';
import { touchesCone } from './geometry';
import { detector, type ReportFault } from './types';

export function slalom(
  exercise: PlacExercises['PLAC-02'],
  report: ReportFault,
) {
  const { gates, finishX } = exercise;
  return detector((state, { rider, previous }) => {
    for (let i = 0; i < gates.length; i++) {
      if (!state.coneHits.has(i) && touchesCone(gates[i]!, previous, rider)) {
        report('cone', 'minor');
        state.coneHits.add(i);
      }
    }
    for (let i = state.nextMarker; i < gates.length; i++) {
      const gate = gates[i]!;
      if (rider.x < gate.x) break;
      const t = (gate.x - previous.x) / (rider.x - previous.x);
      const y = previous.y + t * (rider.y - previous.y);
      if (gate.side === 'above' ? y >= gate.y : y <= gate.y)
        report('missedCone', 'major');
      state.nextMarker++;
    }
    return rider.x >= finishX;
  });
}
