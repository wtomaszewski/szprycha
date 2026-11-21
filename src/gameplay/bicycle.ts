export type Scheme = 'simple' | 'classic';
export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  kind: 'wall' | 'curb';
}
export interface RiderState {
  signal: 'left' | 'right' | null;
  looking: boolean;
  bell: boolean;
  lights: boolean;
}
export interface Rider {
  actions?: RiderState;
  x: number;
  y: number;
  heading: number;
  speed: number;
  walking: boolean;
}
export interface DriveInput {
  x: number;
  y: number;
  brake: boolean;
  scheme: Scheme;
}
export const METERS_PER_PIXEL = 1.5 / 32;
export const FIXED_STEP = 1 / 60;
export const BRAKE_DECELERATION = 250;
export const RIDER_RADIUS = 9;
const approach = (value: number, target: number, amount: number) =>
  value < target
    ? Math.min(target, value + amount)
    : Math.max(target, value - amount);
export function overlaps(x: number, y: number, radius: number, o: Obstacle) {
  const dx = x - Math.max(o.x, Math.min(x, o.x + o.width));
  const dy = y - Math.max(o.y, Math.min(y, o.y + o.height));
  return dx * dx + dy * dy < radius * radius;
}
export function canRide(r: Rider, obstacles: readonly Obstacle[]) {
  return !obstacles.some(
    (o) => o.kind === 'wall' && overlaps(r.x, r.y, RIDER_RADIUS, o),
  );
}
/** Fixed-step kinematics, independent of Phaser. Speed in px/s; heading clockwise from +X. */
export function stepRider(
  r: Rider,
  input: DriveInput,
  obstacles: readonly Obstacle[],
  width: number,
  height: number,
  dt = FIXED_STEP,
): boolean {
  const magnitude = Math.min(1, Math.hypot(input.x, input.y));
  const limit = r.walking ? 32 : 150;
  let target = 0;
  if (input.scheme === 'simple') {
    if (magnitude > 0.12) {
      const desired = Math.atan2(input.y, input.x);
      const difference = Math.atan2(
        Math.sin(desired - r.heading),
        Math.cos(desired - r.heading),
      );
      r.heading += Math.max(-3.6 * dt, Math.min(3.6 * dt, difference));
      target = limit * magnitude * Math.max(0.2, Math.cos(difference));
    }
  } else {
    target = Math.max(0, -input.y) * limit;
    r.heading += input.x * 2.4 * dt * Math.max(0.35, Math.min(1, r.speed / 35));
  }
  const brake = input.brake || (input.scheme === 'classic' && input.y > 0.1);
  r.speed = approach(
    r.speed,
    brake ? 0 : target,
    (brake ? BRAKE_DECELERATION : target > r.speed ? 70 : 40) * dt,
  );
  const onCurb =
    !r.walking &&
    obstacles.some(
      (o) => o.kind === 'curb' && overlaps(r.x, r.y, RIDER_RADIUS, o),
    );
  if (onCurb) r.speed = Math.min(r.speed, 40);
  const travel = r.speed * dt;
  // Sweep in <=2 px increments to avoid tunnelling through thin walls.
  const steps = Math.max(1, Math.ceil(travel / 2));
  const dx = (Math.cos(r.heading) * travel) / steps,
    dy = (Math.sin(r.heading) * travel) / steps;
  for (let i = 0; i < steps; i++) {
    const x = r.x + dx,
      y = r.y + dy;
    if (
      x < RIDER_RADIUS ||
      y < RIDER_RADIUS ||
      x > width - RIDER_RADIUS ||
      y > height - RIDER_RADIUS ||
      obstacles.some(
        (o) => o.kind === 'wall' && overlaps(x, y, RIDER_RADIUS, o),
      )
    ) {
      r.speed = 0;
      return true;
    }
    r.x = x;
    r.y = y;
  }
  return false;
}
