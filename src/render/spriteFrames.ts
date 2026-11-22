export const riderDirections = 16;
export const pedestrianDirections = 8;
export const strideFrames = 4;
export const riderPoses = 30;
export const helmetColors = ['gold', 'blue', 'pink'] as const;
export type HelmetColor = (typeof helmetColors)[number];

export const smallVehicleTypes = [
  'hatchback',
  'sedan',
  'estate',
  'taxi',
] as const;
export const largeVehicleTypes = ['van', 'bus'] as const;
export const vehiclePaints = 3;
export const vehicleLampStates = 6;
export const emergencyTypes = ['ambulance', 'fire', 'police'] as const;
export const tramSegmentLength = 80;
export const tramCities = ['warszawa', 'wroclaw'] as const;
export const pedestrianTypes = [
  'child',
  'adult',
  'senior',
  'stroller',
  'tourist',
  'runner',
  'dog',
  'student',
] as const;
export const cyclistVariants = 3;

// Frames are row-major. Each pose occupies 16 or 8 headings clockwise from north.
// Car columns are off, left, right, then the same three under braking.
export const spriteSheets = {
  rider: [24, 24, riderDirections * 2, (riderPoses * helmetColors.length) / 2],
  'rider-lights': [24, 24, riderDirections, 32],
  'traffic-cyclist': [24, 24, riderDirections, strideFrames * cyclistVariants],
  'traffic-pedestrian': [
    16,
    16,
    pedestrianDirections,
    strideFrames * pedestrianTypes.length,
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
  signal: 'left' | 'right' | null,
  looking: boolean,
  walking: boolean,
  dismount: number,
) {
  if (dismount >= 0) return 28 + dismount;
  if (walking) return 24 + stride;
  return (
    stride +
    (signal === 'left' ? 4 : signal === 'right' ? 8 : 0) +
    (looking ? 12 : 0)
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
