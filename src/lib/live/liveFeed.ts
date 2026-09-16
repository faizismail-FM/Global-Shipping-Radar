import type { LiveAISSource } from '@/lib/ais';
import type { SimulationEngine } from '@/lib/simulation/engine';
import { createStore, useStore } from '@/lib/store/createStore';

export type LiveStatus = 'idle' | 'connecting' | 'live' | 'error';

export interface LiveFeedState {
  status: LiveStatus;
  sourceId: string | null;
  sourceName: string | null;
  attribution: string | null;
  attributionUrl: string | null;
  coverageLabel: string | null;
  lastUpdate: number | null;
  vesselCount: number;
  error: string | null;
  polls: number;
}

const initial: LiveFeedState = {
  status: 'idle',
  sourceId: null,
  sourceName: null,
  attribution: null,
  attributionUrl: null,
  coverageLabel: null,
  lastUpdate: null,
  vesselCount: 0,
  error: null,
  polls: 0,
};

export const liveFeedStore = createStore<LiveFeedState>(initial);

export function useLiveFeed<S>(selector: (s: LiveFeedState) => S): S {
  return useStore(liveFeedStore, selector);
}

/**
 * Polls a LiveAISSource and feeds snapshots into the engine. One instance per
 * page; switching sources stops the previous poll loop.
 */
class LiveFeedService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private abort: AbortController | null = null;
  private source: LiveAISSource | null = null;
  private engine: SimulationEngine | null = null;

  async start(source: LiveAISSource, engine: SimulationEngine): Promise<void> {
    this.stop();
    this.source = source;
    this.engine = engine;
    engine.enterLiveMode();
    liveFeedStore.setState({
      ...initial,
      status: 'connecting',
      sourceId: source.id,
      sourceName: source.name,
      attribution: source.attribution,
      attributionUrl: source.attributionUrl,
      coverageLabel: source.coverage.label,
    });
    await this.poll();
    this.timer = setInterval(() => void this.poll(), source.pollIntervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.viewportTimer) clearTimeout(this.viewportTimer);
    this.viewportTimer = null;
    this.abort?.abort();
    this.abort = null;
    if (this.engine) this.engine.exitLiveMode();
    this.source = null;
    this.engine = null;
    liveFeedStore.setState({ ...initial });
  }

  async refresh(): Promise<void> {
    await this.poll();
  }

  private viewportTimer: ReturnType<typeof setTimeout> | null = null;

  /** Called by the map after it moves; viewport-driven sources re-poll shortly after. */
  notifyViewportChange(): void {
    if (!this.source?.viewportSensitive) return;
    if (this.viewportTimer) clearTimeout(this.viewportTimer);
    this.viewportTimer = setTimeout(() => void this.poll(), 1_500);
  }

  get active(): boolean {
    return this.source !== null;
  }

  private async poll(): Promise<void> {
    const source = this.source;
    const engine = this.engine;
    if (!source || !engine) return;
    this.abort?.abort();
    const controller = new AbortController();
    this.abort = controller;
    try {
      const vessels = await source.fetchVessels(controller.signal);
      if (controller.signal.aborted || this.source !== source) return;
      engine.setLiveVessels(vessels);
      liveFeedStore.setState({ status: 'live', lastUpdate: Date.now(), vesselCount: vessels.length, error: null, polls: liveFeedStore.getState().polls + 1 });
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : 'Unknown error';
      liveFeedStore.setState({ status: 'error', error: message });
      console.warn('[GSR] Live AIS poll failed:', message);
    }
  }
}

export const liveFeed = new LiveFeedService();
