import type { Vec2 } from '../types.ts';
import type { Box } from './WorldModel.ts';

export type RoadGrade = Box & {
  downhill: Vec2;
  grade: number;
  sight_m: number;
  fog_sight_m: number;
};

export const BRAKE_DECELERATION = 250;
const gravity = 9.81;

export function gradeAcceleration(road: RoadGrade, heading: number) {
  const projection =
    Math.cos(heading) * road.downhill.x + Math.sin(heading) * road.downhill.y;
  // Grade is rise/run, so grade / hypot(1, grade) is sin(slope angle).
  return (gravity * road.grade * projection) / Math.hypot(1, road.grade);
}

function brakeDeceleration(brake: number, acceleration: number) {
  return Math.max(brake * 0.1, brake - acceleration);
}

export function stoppingDistance(
  speed: number,
  metersPerPixel: number,
  grip: number,
  acceleration: number,
) {
  const brake = brakeDeceleration(
    BRAKE_DECELERATION * metersPerPixel * grip,
    acceleration,
  );
  return speed * 0.75 + speed ** 2 / (2 * brake);
}

// Speeds use pixels per second and longitudinal acceleration uses pixels per second squared.
export function advanceBicycleSpeed(
  speed: number,
  target: number,
  braking: boolean,
  dt: number,
  brakeForce: number,
  acceleration: number,
) {
  if (braking)
    return Math.max(
      0,
      speed - brakeDeceleration(brakeForce, acceleration) * dt,
    );
  if (target === 0 && acceleration > 0 && speed > 0) {
    // Rolling resistance limits coasting without moving the stopped bicycle.
    const drag = speed / 2.5;
    return Math.max(0, speed + (acceleration - drag) * dt);
  }
  const cruisingSpeed = Math.max(0, target * (1 + acceleration / 120));
  if (speed < cruisingSpeed)
    return Math.min(cruisingSpeed, speed + Math.max(0, 70 + acceleration) * dt);
  return Math.max(cruisingSpeed, speed - Math.max(0, 40 - acceleration) * dt);
}
