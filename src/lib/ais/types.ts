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
  fetchVessels(signal?: AbortSignal): Promise<Vessel[]>;
}
