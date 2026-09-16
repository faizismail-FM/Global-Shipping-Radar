import type { DataSource } from '@/types';
import { getLiveSource } from '@/lib/ais';
import { getEngine } from '@/lib/simulation';
import { setVesselSourceInfo } from '@/lib/providers';
import { mapBus } from '@/lib/map/bus';
import { liveFeed } from './liveFeed';

export { liveFeed, liveFeedStore, useLiveFeed } from './liveFeed';
export type { LiveFeedState, LiveStatus } from './liveFeed';

/**
 * Apply the `dataSource` setting: start polling a live AIS source, or return
 * to the simulated fleet. Safe to call repeatedly with the same value.
 */
export async function applyDataSource(source: DataSource, options: { flyToCoverage?: boolean } = {}): Promise<void> {
  const engine = getEngine();
  const live = getLiveSource(source);
  if (!live) {
    const wasLive = liveFeed.active;
    if (wasLive) liveFeed.stop();
    setVesselSourceInfo({ name: 'Simulated fleet', simulated: true });
    if (wasLive && options.flyToCoverage !== false) mapBus.dispatch({ type: 'world' });
    return;
  }
  setVesselSourceInfo({ name: live.name, simulated: false });
  if (options.flyToCoverage !== false) {
    const [w, s, e, n] = live.coverage.bounds;
    mapBus.dispatch({ type: 'fitBounds', bounds: [[w, s], [e, n]], padding: 40 });
  }
  await liveFeed.start(live, engine);
}
