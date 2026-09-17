import type { APIRoute } from 'astro';
import { PORTS } from '@/data/ports';
import { isValidContainerNumber, normalizeContainerNumber } from '@/lib/identifiers';
import { CARRIERS, CarrierApiError, connectorsFor } from '@/lib/tracking/carriers';
import { containerFromDcsaEvents } from '@/lib/tracking/dcsa';
import type { Container } from '@/types';

/**
 * Container tracking relay: GET /api/containers/track?number=HLCU1234567
 *
 * Holds the carrier credentials server-side, asks each configured carrier
 * (likeliest owner first) for the container's DCSA Track & Trace events and
 * returns the app's `Container` record built from them.
 *
 *   200 { found: true,  container, carrier, events, fetchedAt }
 *   200 { found: false, tried: ['Hapag-Lloyd'], fetchedAt }
 *   400 { error }                        bad or missing container number
 *   502 { error, carrier }               a carrier API failed
 *   503 { configured: false, error }     no carrier credentials on the server
 *   GET ?probe=1 → 200 { configured, carriers: [...names] }
 */
export const prerender = false;

const TIMEOUT_MS = 15_000;
const LOCODE_TO_NAME = new Map<string, string>(PORTS.map((p) => [p.locode, p.name]));

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
const noStore = { 'Cache-Control': 'no-store' };

export interface TrackResponse {
  found: boolean;
  container?: Container;
  carrier?: string;
  /** Number of raw carrier events. */
  events?: number;
  tried?: string[];
  fetchedAt: string;
}

export const GET: APIRoute = async ({ url }) => {
  const configured = CARRIERS.filter((c) => c.configured());
  if (url.searchParams.has('probe')) {
    return json({ configured: configured.length > 0, carriers: configured.map((c) => c.name) }, 200, noStore);
  }
  if (configured.length === 0) {
    console.warn('[container relay] request refused: no carrier credentials configured (HLAG_CLIENT_ID / HLAG_CLIENT_SECRET)');
    return json({ configured: false, error: 'No container tracking carrier is configured on the server.' }, 503, noStore);
  }

  const raw = url.searchParams.get('number') ?? '';
  const number = normalizeContainerNumber(raw);
  if (!isValidContainerNumber(number)) {
    return json({ error: `"${raw}" is not a valid ISO 6346 container number.` }, 400, noStore);
  }

  const fetchedAt = new Date().toISOString();
  const tried: string[] = [];
  const started = Date.now();
  for (const carrier of connectorsFor(number)) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const t0 = Date.now();
    try {
      const events = await carrier.fetchEvents(number, controller.signal);
      tried.push(carrier.name);
      const container = containerFromDcsaEvents(number, events, {
        carrier: carrier.name,
        sourceName: carrier.sourceName,
        fetchedAt,
        resolveLocode: (code) => LOCODE_TO_NAME.get(code) ?? null,
      });
      console.log(`[container relay] ${number} via ${carrier.name}: ${events.length} events, ${container ? container.status : 'no usable events'} in ${Date.now() - t0}ms`);
      if (container) {
        const body: TrackResponse = { found: true, container, carrier: carrier.name, events: events.length, fetchedAt };
        return json(body, 200, { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' });
      }
    } catch (err) {
      const message = err instanceof Error ? (err.name === 'AbortError' ? `${carrier.name} API timed out after ${TIMEOUT_MS / 1000} s` : err.message) : 'Carrier API failed';
      console.error(`[container relay] ${number} via ${carrier.name} failed after ${Date.now() - t0}ms: ${message}`);
      return json({ error: message, carrier: carrier.name, status: err instanceof CarrierApiError ? err.status : undefined }, 502, noStore);
    } finally {
      clearTimeout(timer);
    }
  }
  console.log(`[container relay] ${number}: not found at ${tried.join(', ')} in ${Date.now() - started}ms`);
  const body: TrackResponse = { found: false, tried, fetchedAt };
  return json(body, 200, { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' });
};
