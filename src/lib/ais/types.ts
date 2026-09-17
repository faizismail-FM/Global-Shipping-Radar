import type { Vessel } from '@/types';

/**
 * A live AIS data source. Implementations fetch a snapshot of vessels; the
 * LiveFeedService polls them and hands results to the SimulationEngine, which
 * dead-reckons positions between polls.
 */
export interface LiveAISSource {
  readonly id: string;
  readonly name: string;
  /** Short attribution shown in the UI (data licence requirements). */
  readonly attribution: string;
  readonly attributionUrl: string;
  /** Geographic coverage, [west, south, east, north], and a label for it. */
  readonly coverage: { bounds: [number, number, number, number]; label: string };
  readonly pollIntervalMs: number;
  /** True when results depend on the map viewport (the feed re-polls after the map moves). */
  readonly viewportSensitive?: boolean;
  fetchVessels(signal?: AbortSignal): Promise<Vessel[]>;
  /** One-line technical summary of the most recent fetch (request area, counts, timings), for the feed log. */
  lastFetchDetail?: string;
}
