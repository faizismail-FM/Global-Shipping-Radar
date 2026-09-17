import type { DataSource } from '@/types';
import { getLiveSource, AISSTREAM_DEFAULT_BOUNDS } from '@/lib/ais';
import { viewportStore } from '@/lib/map/viewport';
import { getEngine } from '@/lib/simulation';
import { setVesselSourceInfo } from '@/lib/providers';
import { mapBus } from '@/lib/map/bus';
import { liveFeed } from './liveFeed';

export { liveFeed, liveFeedStore, useLiveFeed, logFeed, clearFeedLog, feedLogAsText } from './liveFeed';
export type { LiveFeedState, LiveStatus, FeedLogEntry, FeedLogLevel } from './liveFeed';

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
    // Viewport-driven sources keep the user's view unless it is a world view, where a busy default area is used.
    const zoomedOut = viewportStore.getState().zoom < 3.2;
    if (live.viewportSensitive) {
      if (zoomedOut) {
        // Seed the viewport so the first poll already targets the default area while the map flies there.
        viewportStore.setState({ bounds: AISSTREAM_DEFAULT_BOUNDS, zoom: 5 });
        const [w, s, e, n] = AISSTREAM_DEFAULT_BOUNDS;
        mapBus.dispatch({ type: 'fitBounds', bounds: [[w, s], [e, n]], padding: 40 });
      }
    } else {
      const [w, s, e, n] = live.coverage.bounds;
      mapBus.dispatch({ type: 'fitBounds', bounds: [[w, s], [e, n]], padding: 40 });
    }
  }
  await liveFeed.start(live, engine);
}
