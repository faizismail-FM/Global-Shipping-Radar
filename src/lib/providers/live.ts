import type { Container } from '@/types';
import type { ContainerDataProvider } from './types';
import { createStore, useStore } from '@/lib/store/createStore';
import { logFeed } from '@/lib/live/liveFeed';
import type { TrackResponse } from '@/pages/api/containers/track';

/** What the browser knows about the server-side container tracking relay. */
export interface ContainerTrackingState {
  /** null until the relay has been probed. */
  configured: boolean | null;
  /** Names of carriers with credentials on the server, e.g. ["Hapag-Lloyd"]. */
  carriers: string[];
  /** Last lookup outcome, for the tracking page's status copy. */
  lastLookup: { number: string; outcome: 'live' | 'demo' | 'not-found' | 'error'; detail: string; at: number } | null;
}

export const containerTrackingStore = createStore<ContainerTrackingState>({ configured: null, carriers: [], lastLookup: null });

export function useContainerTracking<S>(selector: (s: ContainerTrackingState) => S): S {
  return useStore(containerTrackingStore, selector);
}

export class ContainerLookupError extends Error {}

/**
 * Live container tracking through the server relay (/api/containers/track),
 * which holds carrier credentials. Falls back to the demo records when the
 * relay is not configured or the carriers have no events for a number, so the
 * built-in demo containers keep working alongside real lookups.
 */
export class LiveContainerProvider implements ContainerDataProvider {
  private probe: Promise<boolean> | null = null;

  constructor(private readonly fallback: ContainerDataProvider) {
    if (typeof window !== 'undefined') void this.ensureProbed();
  }

  get name(): string {
    const s = containerTrackingStore.getState();
    return s.configured ? `${s.carriers.join(', ')} Track & Trace (+ demo records)` : this.fallback.name;
  }

  get simulated(): boolean {
    return !containerTrackingStore.getState().configured;
  }

  /** Ask the relay once whether any carrier credentials exist. */
  ensureProbed(): Promise<boolean> {
    if (!this.probe) {
      this.probe = fetch('/api/containers/track?probe=1', { headers: { accept: 'application/json' } })
        .then(async (res) => {
          const body = (await res.json()) as { configured?: boolean; carriers?: string[] };
          const configured = res.ok && body.configured === true;
          containerTrackingStore.setState({ configured, carriers: body.carriers ?? [] });
          logFeed('info', configured ? `Container tracking connected: ${(body.carriers ?? []).join(', ')}` : 'Container tracking: no carrier configured on the server (demo records only)');
          return configured;
        })
        .catch(() => {
          containerTrackingStore.setState({ configured: false, carriers: [] });
          return false;
        });
    }
    return this.probe;
  }

  async searchContainer(containerNumber: string): Promise<Container | null> {
    const number = containerNumber.toUpperCase().replace(/\s|-/g, '');
    const configured = await this.ensureProbed();
    if (!configured) {
      const demo = await this.fallback.searchContainer(number);
      containerTrackingStore.setState({ lastLookup: { number, outcome: demo ? 'demo' : 'not-found', detail: demo ? 'Demo record' : 'Not in the demo records; no carrier configured', at: Date.now() } });
      return demo;
    }
    const started = performance.now();
    const res = await fetch(`/api/containers/track?number=${encodeURIComponent(number)}`, { headers: { accept: 'application/json' } });
    const ms = Math.round(performance.now() - started);
    let body: Partial<TrackResponse> & { error?: string; carrier?: string; configured?: boolean } = {};
    try {
      body = (await res.json()) as typeof body;
    } catch {
      /* non-JSON */
    }
    if (res.status === 503 && body.configured === false) {
      containerTrackingStore.setState({ configured: false, carriers: [] });
      return this.fallback.searchContainer(number);
    }
    if (!res.ok) {
      const message = body.error ?? `Tracking relay responded ${res.status}`;
      containerTrackingStore.setState({ lastLookup: { number, outcome: 'error', detail: message, at: Date.now() } });
      logFeed('error', `Container ${number}: lookup failed`, `${message} · relay ${res.status} in ${ms} ms`);
      throw new ContainerLookupError(message);
    }
    if (body.found && body.container) {
      const c = body.container;
      containerTrackingStore.setState({ lastLookup: { number, outcome: 'live', detail: `${body.events ?? 0} events from ${body.carrier}`, at: Date.now() } });
      logFeed('ok', `Container ${number}: ${c.status} via ${body.carrier}`, `${body.events ?? 0} DCSA events · ${c.milestones.length} milestones · relay ${res.status} in ${ms} ms`);
      return c;
    }
    const demo = await this.fallback.searchContainer(number);
    const tried = (body.tried ?? []).join(', ') || 'configured carriers';
    containerTrackingStore.setState({ lastLookup: { number, outcome: demo ? 'demo' : 'not-found', detail: demo ? `No events at ${tried}; showing the demo record` : `No events at ${tried}`, at: Date.now() } });
    logFeed(demo ? 'info' : 'warn', `Container ${number}: no events at ${tried}${demo ? ' · demo record shown' : ''}`, `relay ${res.status} in ${ms} ms`);
    return demo;
  }
}
