// Full cycles per second. docs/08_ux_sterowanie_audio.md limits flashing to 3 Hz.
const EMERGENCY_LIGHT_FLASH_HZ = 2;

export function emergencyLightPhase(at: number): boolean {
  return Math.floor(at * EMERGENCY_LIGHT_FLASH_HZ * 2) % 2 === 1;
}
