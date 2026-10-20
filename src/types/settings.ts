export type Theme = 'dark' | 'light';
export type SpeedUnit = 'kn' | 'kmh';
export type DistanceUnit = 'nm' | 'km';
/** Vessel data source: the built-in simulation or a live AIS feed. */
export type DataSource = 'simulated' | 'digitraffic' | 'aisstream';

export interface Settings {
  theme: Theme;
  /** True once the user has picked a theme themselves; until then the app's default applies. */
  themeChosen: boolean;
  showRoutes: boolean;
  showPorts: boolean;
  showVesselLabels: boolean;
  /** Simulation update interval in milliseconds. */
  updateIntervalMs: number;
  speedUnit: SpeedUnit;
  distanceUnit: DistanceUnit;
  /** Desktop sidebar collapsed to icons only. */
  sidebarCollapsed: boolean;
  dataSource: DataSource;
  /** Mirror the live-feed log to the browser console at info level. */
  feedLogging: boolean;
}
