import { helmetColors, type HelmetColor } from '../render/spriteFrames';

const key = 'szprycha:helmet-color';
let color: HelmetColor = helmetColors[0];

export function readHelmetColor() {
  try {
    const saved = localStorage.getItem(key);
    color = helmetColors.find((option) => option === saved) ?? color;
  } catch {
    // The selection remains available for this session when storage is blocked.
  }
  return color;
}

export function setHelmetColor(value: HelmetColor) {
  color = value;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private browsing or storage policies may disallow persistence.
  }
}
