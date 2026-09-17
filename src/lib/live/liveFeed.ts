import type { LiveAISSource } from '@/lib/ais';
import type { SimulationEngine } from '@/lib/simulation/engine';
import { createStore, useStore } from '@/lib/store/createStore';
import { settingsStore } from '@/lib/store/settings';

export type LiveStatus = 'idle' | 'connecting' | 'live' | 'error';

export type FeedLogLevel = 'info' | 'ok' | 'warn' | 'error';

type PollReason = 'initial' | 'scheduled' | 'manual' | 'map moved';

/** One line of the live-feed diagnostic log (shown in the Data panel, mirrored to the console). */
export interface FeedLogEntry {
  id: number;
  at: number;
  level: FeedLogLevel;
  message: string;
  /** Technical detail: request area, message counts, timings, cache status. */
  detail?: string;
}

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
  /** Newest first, capped at LOG_LIMIT entries. Survives source switches so failures stay visible. */
  log: FeedLogEntry[];
}

const LOG_LIMIT = 80;

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
  log: [],
};

export const liveFeedStore = createStore<LiveFeedState>(initial);

export function useLiveFeed<S>(selector: (s: LiveFeedState) => S): S {
  return useStore(liveFeedStore, selector);
}

let logSeq = 0;

/**
 * Append a line to the feed log. Always mirrored to `console.debug` (visible
 * with the "Verbose" level in browser devtools); mirrored to `console.info`
 * / `console.warn` / `console.error` when the "Log live feed to console"
 * setting is on.
 */
export function logFeed(level: FeedLogLevel, message: string, detail?: string): void {
  const entry: FeedLogEntry = { id: ++logSeq, at: Date.now(), level, message, ...(detail ? { detail } : {}) };
  const log = [entry, ...liveFeedStore.getState().log].slice(0, LOG_LIMIT);
  liveFeedStore.setState({ log });
  if (typeof console === 'undefined') return;
  const line = `[GSR live] ${message}${detail ? ` — ${detail}` : ''}`;
  const verbose = settingsStore.getState().feedLogging;
  if (!verbose) {
    console.debug(line);
    return;
  }
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
}

export function clearFeedLog(): void {
  liveFeedStore.setState({ log: [] });
}

/** Render the log as plain text (newest last) for copying into a bug report. */
export function feedLogAsText(): string {
  return [...liveFeedStore.getState().log]
    .reverse()
    .map((e) => `${new Date(e.at).toISOString()} ${e.level.toUpperCase().padEnd(5)} ${e.message}${e.detail ? ` — ${e.detail}` : ''}`)
    .join('\n');
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
  private viewportTimer: ReturnType<typeof setTimeout> | null = null;
  private inFlight = false;
  private pending: PollReason | null = null;

  async start(source: LiveAISSource, engine: SimulationEngine): Promise<void> {
    this.stop();
    this.source = source;
    this.engine = engine;
    engine.enterLiveMode();
    liveFeedStore.setState({
      ...initial,
      log: liveFeedStore.getState().log,
      status: 'connecting',
      sourceId: source.id,
      sourceName: source.name,
      attribution: source.attribution,
      attributionUrl: source.attributionUrl,
      coverageLabel: source.coverage.label,
    });
    logFeed('info', `Connecting to ${source.name}`, `${source.coverage.label} · polls every ${Math.round(source.pollIntervalMs / 1000)} s`);
    await this.poll('initial');
    this.timer = setInterval(() => void this.poll('scheduled'), source.pollIntervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.viewportTimer) clearTimeout(this.viewportTimer);
    this.viewportTimer = null;
    this.abort?.abort();
    this.abort = null;
    this.inFlight = false;
    this.pending = null;
    if (this.engine) this.engine.exitLiveMode();
    const wasActive = this.source !== null;
    const name = this.source?.name;
    this.source = null;
    this.engine = null;
    liveFeedStore.setState({ ...initial, log: liveFeedStore.getState().log });
    if (wasActive) logFeed('info', `Stopped ${name} · back to the simulated fleet`);
  }

  async refresh(): Promise<void> {
    await this.poll('manual');
  }

  /** Called by the map after it moves; viewport-driven sources re-poll shortly after. */
  notifyViewportChange(): void {
    if (!this.source?.viewportSensitive) return;
    if (this.viewportTimer) clearTimeout(this.viewportTimer);
    this.viewportTimer = setTimeout(() => void this.poll('map moved'), 1_500);
  }

  get active(): boolean {
    return this.source !== null;
  }

  /**
   * One poll at a time. A request that arrives while another is in flight is
   * queued and runs right after it (a scheduled tick is simply skipped), so a
   * relay round-trip is never thrown away half-way.
   */
  private async poll(reason: PollReason): Promise<void> {
    const source = this.source;
    const engine = this.engine;
    if (!source || !engine) return;
    if (this.inFlight) {
      if (reason === 'scheduled') {
        logFeed('info', 'Skipped scheduled poll · one already in flight');
        return;
      }
      this.pending = reason;
      logFeed('info', `Queued ${reason} poll · one already in flight`);
      return;
    }
    this.inFlight = true;
    const controller = new AbortController();
    this.abort = controller;
    const started = performance.now();
    try {
      const vessels = await source.fetchVessels(controller.signal);
      if (controller.signal.aborted || this.source !== source) return;
      const before = new Set(engine.store.getState().vessels.map((v) => v.id));
      const after = new Set(vessels.map((v) => v.id));
      let added = 0;
      for (const id of after) if (!before.has(id)) added++;
      let dropped = 0;
      for (const id of before) if (!after.has(id)) dropped++;
      engine.setLiveVessels(vessels);
      const state = liveFeedStore.getState();
      liveFeedStore.setState({ status: 'live', lastUpdate: Date.now(), vesselCount: vessels.length, error: null, polls: state.polls + 1 });
      const ms = Math.round(performance.now() - started);
      const delta = state.polls === 0 ? '' : ` (+${added} / −${dropped})`;
      logFeed(vessels.length === 0 ? 'warn' : 'ok', `${reason === 'scheduled' ? 'Poll' : reason === 'initial' ? 'First poll' : reason === 'manual' ? 'Manual refresh' : 'Map moved · re-poll'}: ${vessels.length} vessels${delta} in ${ms} ms`, source.lastFetchDetail);
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : 'Unknown error';
      liveFeedStore.setState({ status: 'error', error: message });
      logFeed('error', `Poll failed (${reason}): ${message}`, source.lastFetchDetail);
    } finally {
      this.inFlight = false;
      if (this.abort === controller) this.abort = null;
      const next = this.pending;
      this.pending = null;
      if (next && this.source === source && !controller.signal.aborted) void this.poll(next);
    }
  }
}

export const liveFeed = new LiveFeedService();
