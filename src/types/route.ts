import type { Region } from './port';

export interface ShippingLane {
  id: string;
  name: string;
  from: Region;
  to: Region;
  /** Port ids in sailing order. */
  ports: string[];
  /**
   * Waypoints in [longitude, latitude] pairs, in sailing order. Longitudes may
   * exceed ±180 so that lanes crossing the antimeridian stay continuous.
   */
  waypoints: [number, number][];
  /** Typical schedule transit time in days for the full lane. */
  typicalTransitDays: number;
  /** Rough annual TEU volume in millions (illustrative). */
  annualTEUMillions: number;
}

export interface LaneStats {
  lane: ShippingLane;
  vessels: number;
  active: number;
  delayed: number;
  inPort: number;
  avgTransitDays: number;
  distanceNm: number;
}
