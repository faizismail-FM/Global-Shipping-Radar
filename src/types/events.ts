export type ActivityKind =
  | 'zone-enter'
  | 'departed'
  | 'arrived'
  | 'congestion'
  | 'destination'
  | 'eta'
  | 'delay';

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  title: string;
  subject: string;
  /** Real wall-clock timestamp (ms since epoch). */
  timestamp: number;
  /** Optional map target for click-to-focus. */
  target?: { longitude: number; latitude: number; zoom?: number; vesselId?: string; portId?: string };
}

export type AlertSeverity = 'info' | 'warning' | 'critical';

export type AlertKind = 'congestion' | 'delay' | 'traffic';

export interface Alert {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  subject: string;
  detail: string;
  createdAt: number;
  target: { longitude: number; latitude: number; zoom: number; vesselId?: string; portId?: string };
}
