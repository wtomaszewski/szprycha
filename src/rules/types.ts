export interface Vec2 {
  x: number;
  y: number;
}

export type AgeBand = 'under10' | '10to15' | '16plus';
export type Maneuver = 'straight' | 'left' | 'right';
export type SignalPhase = 'off' | 'red' | 'yellow' | 'green' | 'arrow';

export interface RiderState {
  id: string;
  pos: Vec2;
  heading: number; // radians, clockwise from +X
  speed: number; // m/s
  mode: 'riding' | 'walking_bike';
  signal: 'none' | 'left' | 'right';
  helmet: { worn: boolean; fastened: boolean };
  ageBand: AgeBand;
  maneuver?: Maneuver;
  adultSupervisor?: boolean;
  supervisedChildId?: string;
  extraReflectors?: boolean;
}

export interface AgentState {
  id: string;
  kind: 'pedestrian' | 'cyclist' | 'car' | 'tram';
  pos: Vec2;
  heading: number;
  speed: number;
  laneId?: string;
  maneuver?: Maneuver;
  ageBand?: AgeBand;
  protectiveBrake?: boolean;
}

export interface EnvState {
  time: 'day' | 'dusk' | 'night';
  weather: 'clear' | 'rain_heavy' | 'snow' | 'wind_strong' | 'fog' | 'ice';
  visibilityLow: boolean;
  signalOverrides?: Readonly<Record<string, SignalPhase>>;
}

export interface Verdict {
  ruleId: string;
  kind: 'good' | 'minor' | 'major';
  at: number;
  pos: Vec2;
  evidence: Record<string, unknown>;
  feedbackKey: string;
  highlight?: { signId?: string; zoneId?: string; agentId?: string };
}

export const TICKS_PER_SECOND = 60;

export function verdict(
  ruleId: string,
  kind: Verdict['kind'],
  at: number,
  rider: RiderState,
  evidence: Verdict['evidence'] = {},
  highlight?: Verdict['highlight'],
): Verdict {
  return {
    ruleId,
    kind,
    at,
    pos: { ...rider.pos },
    evidence,
    feedbackKey: `przepisy.${ruleId}.feedback`,
    ...(highlight && { highlight }),
  };
}
