export interface Vec2 {
  x: number;
  y: number;
}

export const ageBands = ['under10', '10to15', '16plus'] as const;
export type AgeBand = (typeof ageBands)[number];
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
  shoulderCheck?: { lastLeftAt: number };
  lights?: { front: boolean; rear: boolean };
  reflectiveVest?: boolean;
  handsOnBar?: 0 | 1 | 2;
  feetOnPedals?: boolean;
  holdingVehicle?: boolean;
  passenger?: boolean; // Passenger on the player's single-seat bicycle.
  phoneInHand?: boolean;
}

export interface AgentState {
  id: string;
  kind:
    'pedestrian' | 'cyclist' | 'car' | 'bus' | 'tractor' | 'tram' | 'emergency';
  pos: Vec2;
  heading: number;
  speed: number;
  laneId?: string;
  maneuver?: Maneuver;
  ageBand?: AgeBand;
  protectiveBrake?: boolean;
  crossingId?: string;
  stopId?: string;
  signalActive?: boolean;
  bikeInfrastructure?: boolean;
  yieldingAtCrossing?: boolean;
  junctionProgress?: number; // signed distance along the movement from the stop line
}

export const weatherKinds = [
  'clear',
  'rain_light',
  'rain_heavy',
  'snow',
  'wind_strong',
  'fog',
  'fog_dense',
  'ice',
] as const;
export type Weather = (typeof weatherKinds)[number];

export interface EnvState {
  time: 'day' | 'dusk' | 'night';
  weather: Weather;
  visibilityLow: boolean;
  railOverrides?: Readonly<Record<string, RailState>>;
  signalOverrides?: Readonly<Record<string, SignalPhase>>;
  officerOrders?: Readonly<Partial<Record<string, 'stop' | 'go'>>>;
}

export interface RailState {
  barrier: 'open' | 'lowering' | 'closed' | 'raising';
  flashing: boolean;
  trainApproaching?: true;
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
