// Times in seconds. Tiled stores offsets as elapsed time within the cycle.
const mainGreen = 15;
const yellow = 2;
const mainRed = 8;
const redYellow = 0.75;
const allRed = 0.25;
const roadCycle = mainGreen + yellow + mainRed;
const mainStops = mainGreen + yellow;
export const startOnRed = mainStops;
// Align the signal cycle with the different tram and vehicle schedules.
export const trainingPhaseOffset = 11;
export const microCityPhaseOffset = 9;
const sideStarts = mainStops + allRed + redYellow;
const sideGreen = mainRed - yellow - 2 * (allRed + redYellow);

export function roadSignalTiming(primary: boolean, stagger = 0) {
  return {
    cycle_s: roadCycle,
    green_s: primary ? mainGreen : sideGreen,
    yellow_s: yellow,
    red_yellow_s: redYellow,
    offset_s: (stagger + (primary ? 0 : roadCycle - sideStarts)) % roadCycle,
  };
}

// S-2 uses the opposing road's green window. Conditional turns still
// require a full stop and yielding.
export const mainArrowTiming = {
  from_s: sideStarts,
  until_s: sideStarts + sideGreen,
};

export const sideArrowTiming = {
  from_s: roadCycle - sideStarts + 1,
  until_s: roadCycle - sideStarts + 8,
};

export const standaloneCrossingTiming = {
  cycle_s: mainGreen + mainRed,
  green_s: mainGreen,
  offset_s: 0,
};

// S-5/S-6 run alongside the main road. Flashing green warns crossing users
// during the road's yellow interval while the conflicting road remains red.
export function parallelCrossingTiming(stagger = 0) {
  return {
    cycle_s: roadCycle,
    green_s: mainGreen,
    flashing_s: yellow,
    offset_s: stagger,
  };
}

// A zebra across the main road has a short opening and a longer period
// to finish crossing before the main road gets green again.
export function transversePedestrianTiming(stagger = 0) {
  const starts = mainStops + allRed;
  const green = sideGreen / 2;
  return {
    cycle_s: roadCycle,
    green_s: green,
    flashing_s: roadCycle - starts - green - allRed - redYellow,
    offset_s: (roadCycle - starts + stagger) % roadCycle,
  };
}
