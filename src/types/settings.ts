export type Theme = 'dark' | 'light';
export type SpeedUnit = 'kn' | 'kmh';
export type DistanceUnit = 'nm' | 'km';

export interface Settings {
  theme: Theme;
  showRoutes: boolean;
  showPorts: boolean;
  showVesselLabels: boolean;
  /** Simulation update interval in milliseconds. */
  updateIntervalMs: number;
  speedUnit: SpeedUnit;
  distanceUnit: DistanceUnit;
  /** Desktop sidebar collapsed to icons only. */
  sidebarCollapsed: boolean;
}
