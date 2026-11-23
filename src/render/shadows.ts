const ink = '26, 28, 44';

export const shadowColor = (alpha: number) => `rgba(${ink}, ${alpha})`;
export const shadowRise = (shift: number) => Math.round(shift * 0.73);
