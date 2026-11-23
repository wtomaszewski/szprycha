export const riderDirections = 16;
export const pedestrianDirections = 8;
export const pedalFrames = 6;
export const walkFrames = 6;
export const signalStages = 5;
export const glanceStages = 3;
export const ridingPoses = pedalFrames * signalStages * glanceStages;
export const riderPoses = ridingPoses + walkFrames + 2;
export const helmetColors = ['gold', 'blue', 'pink'] as const;
export type HelmetColor = (typeof helmetColors)[number];

export const smallVehicleTypes = [
  'hatchback',
  'sedan',
  'estate',
  'taxi',
] as const;
export const largeVehicleTypes = ['van', 'bus', 'tractor'] as const;
export const vehiclePaints = 3;
export const vehicleLampStates = 6;
export const emergencyTypes = ['ambulance', 'fire', 'police'] as const;
export const tramSegmentLength = 80;
export const tramCities = ['warszawa', 'wroclaw', 'krakow'] as const;
export const pedestrianTypes = [
  'child',
  'adult',
  'senior',
  'stroller',
  'tourist',
  'runner',
  'dog',
  'student',
  'wheelchair',
  'commuter',
  'shopper',
  'teen',
] as const;
export const cyclistVariants = 3;
export const pedestrianSeasonRows = walkFrames * pedestrianTypes.length;
const riderColumns = 4 * riderDirections;

// Frames are row-major. Each pose occupies 16 or 8 headings clockwise from north.
// Car columns are off, left, right, then the same three under braking.
export const spriteSheets = {
  rider: [
    32,
    32,
    riderColumns,
    Math.ceil(
      (riderPoses * helmetColors.length * riderDirections) / riderColumns,
    ),
  ],
  'rider-lights': [32, 32, riderDirections, 32],
  'traffic-cyclist': [32, 32, riderDirections, pedalFrames * cyclistVariants],
  'traffic-pedestrian': [
    24,
    24,
    pedestrianDirections * 2,
    pedestrianSeasonRows,
  ],
  'traffic-car': [
    32,
    48,
    vehicleLampStates,
    smallVehicleTypes.length * vehiclePaints,
  ],
  'traffic-large': [
    32,
    64,
    vehicleLampStates,
    largeVehicleTypes.length * vehiclePaints,
  ],
  'traffic-emergency': [32, 64, 3, emergencyTypes.length],
  'traffic-tram': [32, tramSegmentLength, 2, tramCities.length],
} as const;
export type SpriteSheet = keyof typeof spriteSheets;

export function spriteDirection(heading: number, directions: number) {
  const index = Math.round((heading / (2 * Math.PI) + 0.25) * directions);
  return ((index % directions) + directions) % directions;
}

export function riderPose(
  stride: number,
  signalReach: number,
  glance: number,
  walking: boolean,
  dismount: number,
) {
  if (dismount >= 0) return ridingPoses + walkFrames + dismount;
  if (walking) return ridingPoses + Math.floor(stride * walkFrames);
  const signal =
    2 + Math.sign(signalReach) * Math.round(Math.abs(signalReach) * 2);
  const look = Math.round(glance * (glanceStages - 1));
  return (
    (look * signalStages + signal) * pedalFrames +
    Math.floor(stride * pedalFrames)
  );
}

export function riderFrame(helmet: number, pose: number, direction: number) {
  return (helmet * riderPoses + pose) * riderDirections + direction;
}

export const idleRiderPose = riderPose(0, 0, 0, false, -1);

export function animateSignal(
  value: number,
  signal: 'left' | 'right' | null,
  elapsed: number,
) {
  return approach(
    value,
    signal === 'left' ? -1 : signal === 'right' ? 1 : 0,
    elapsed,
  );
}

export function animateGlance(
  value: number,
  looking: boolean,
  elapsed: number,
) {
  return approach(value, Number(looking), elapsed);
}

function approach(value: number, target: number, elapsed: number) {
  const step = elapsed / 0.15;
  return (
    value + Math.sign(target - value) * Math.min(step, Math.abs(target - value))
  );
}

export function vehicleFrame(
  row: number,
  braking: boolean,
  maneuver: 'left' | 'right' | 'straight' | undefined,
  blink: boolean,
) {
  const indicator = !blink
    ? 0
    : maneuver === 'left'
      ? 1
      : maneuver === 'right'
        ? 2
        : 0;
  return row * vehicleLampStates + (braking ? 3 : 0) + indicator;
}
