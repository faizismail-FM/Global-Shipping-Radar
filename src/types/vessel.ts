export type VesselStatus = 'underway' | 'anchored' | 'moored' | 'delayed';

export type VesselType = 'container';

export interface Vessel {
  id: string;
  name: string;
  imo: string;
  mmsi: string;
  type: VesselType;
  flag: string;
  flagCode: string;

  latitude: number;
  longitude: number;

  /** Speed over ground in knots. */
  speed: number;
  /** Course over ground in degrees (0–360). */
  heading: number;

  status: VesselStatus;

  destination: string;

  departurePort: string;
  arrivalPort: string;

  /** ISO-8601 timestamp of the estimated time of arrival. */
  eta: string;

  vesselLength: number;
  vesselWidth: number;

  capacityTEU: number;

  operator: string;

  /** Ordered list of port names on the current voyage (POL → transshipments → POD). */
  route: string[];

  /** ISO-8601 timestamp of the last position update. */
  lastUpdated: string;

  // --- Simulation metadata (not part of the public AIS-style shape) ---

  /** Shipping lane the vessel is sailing on. */
  laneId: string;
  /** Voyage number in carrier format, e.g. "123E". */
  voyage: string;
  /** Hours the vessel is behind its original schedule (0 when on time). */
  delayHours: number;
  /** Cumulative distance in nautical miles for the current voyage. */
  voyageDistanceNm: number;
}
