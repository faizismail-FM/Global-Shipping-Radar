/** Internal navigation state for a simulated vessel (not exposed in the Vessel shape). */
export interface VesselNav {
  laneId: string;
  /** +1 sails the lane's waypoints in order, -1 in reverse. */
  dir: 1 | -1;
  /** Index of the waypoint the vessel is currently heading to. */
  next: number;
  /** Waypoint indices of the ports the vessel will call, in order. The last one is the final destination. */
  calls: number[];
  /** Waypoint index of the port the vessel departed from. */
  departure: number;
  /** Ticks remaining before the vessel leaves its current berth/anchorage. */
  dwell: number;
  /** Speed to resume after leaving port. */
  serviceSpeed: number;
  /** Zone the vessel is currently inside, for enter events. */
  zoneId: string | null;
  /** Original ETA (ms, simulated clock) used to compute delays. */
  scheduledEta: number;
}

export interface SimulationConfig {
  /** Wall-clock milliseconds between simulation ticks. */
  intervalMs: number;
  /** Simulated hours that elapse per tick. */
  hoursPerTick: number;
  /** Whether vessel positions advance. */
  movement: boolean;
  /** Whether activity events are generated. */
  activity: boolean;
}
