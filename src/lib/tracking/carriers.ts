import type { DcsaEvent } from './dcsa';

/**
 * Server-side carrier connectors for container tracking. Each connector
 * speaks the DCSA Track & Trace standard and differs only in host, auth and
 * which environment variables configure it. Runs inside the Vercel function
 * (src/pages/api/containers/track.ts); never imported by browser code.
 */
export interface CarrierConnector {
  readonly id: string;
  readonly name: string;
  /** Source label shown in the UI, e.g. "Hapag-Lloyd Track & Trace". */
  readonly sourceName: string;
  /** ISO 6346 owner prefixes this carrier operates; used to try the likeliest carrier first. */
  readonly ownerPrefixes: readonly string[];
  configured(): boolean;
  /** Fetch all events for a container. Resolves to [] when the carrier has none. */
  fetchEvents(containerNumber: string, signal: AbortSignal): Promise<DcsaEvent[]>;
}

function env(name: string): string | undefined {
  const fromProcess = typeof process !== 'undefined' ? process.env?.[name] : undefined;
  return fromProcess ?? (import.meta.env as Record<string, string | undefined>)[name];
}

export class CarrierApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly carrier: string,
  ) {
    super(message);
  }
}

/** Accept a bare DCSA array or the `{ events: [...] }` wrapper some gateways add. */
function eventsFromBody(body: unknown): DcsaEvent[] {
  if (Array.isArray(body)) return body as DcsaEvent[];
  if (body && typeof body === 'object') {
    const o = body as Record<string, unknown>;
    for (const k of ['events', 'data', 'items']) if (Array.isArray(o[k])) return o[k] as DcsaEvent[];
  }
  return [];
}

/**
 * Hapag-Lloyd API Portal (https://api-portal.hlag.com), product "Track & Trace"
 * (DCSA T&T v2.2). Credentials come from the portal application: client id
 * and client secret, sent as x-ibm-client-id / x-ibm-client-secret headers.
 */
export const hapagLloyd: CarrierConnector = {
  id: 'hlag',
  name: 'Hapag-Lloyd',
  sourceName: 'Hapag-Lloyd Track & Trace',
  ownerPrefixes: ['HLCU', 'HLXU', 'HLBU', 'UACU', 'CPSU', 'CSVU', 'NAMU'],
  configured: () => Boolean(env('HLAG_CLIENT_ID') && env('HLAG_CLIENT_SECRET')),
  async fetchEvents(containerNumber, signal) {
    const base = (env('HLAG_API_BASE') ?? 'https://api.hlag.com/hlag/external/v2').replace(/\/$/, '');
    const url = `${base}/events?equipmentReference=${encodeURIComponent(containerNumber)}&limit=200`;
    const res = await fetch(url, {
      signal,
      headers: {
        accept: 'application/json',
        'x-ibm-client-id': env('HLAG_CLIENT_ID') ?? '',
        'x-ibm-client-secret': env('HLAG_CLIENT_SECRET') ?? '',
        'API-Version': '2',
      },
    });
    if (res.status === 404) return [];
    if (!res.ok) {
      let detail = '';
      try {
        const body = (await res.json()) as { moreInformation?: string; message?: string; httpMessage?: string; errors?: { message?: string }[] };
        detail = body.moreInformation ?? body.message ?? body.errors?.[0]?.message ?? body.httpMessage ?? '';
      } catch {
        /* non-JSON */
      }
      const why = res.status === 401 || res.status === 403 ? 'credentials rejected' : res.status === 429 ? 'rate limit exceeded' : `HTTP ${res.status}`;
      throw new CarrierApiError(`Hapag-Lloyd API: ${why}${detail ? ` (${detail})` : ''}`, res.status, 'Hapag-Lloyd');
    }
    return eventsFromBody(await res.json());
  },
};

/** All known connectors, in default trial order. */
export const CARRIERS: CarrierConnector[] = [hapagLloyd];

/** Connectors with credentials present, likeliest owner first for the given container. */
export function connectorsFor(containerNumber: string): CarrierConnector[] {
  const prefix = containerNumber.slice(0, 4).toUpperCase();
  const configured = CARRIERS.filter((c) => c.configured());
  return [...configured.filter((c) => c.ownerPrefixes.includes(prefix)), ...configured.filter((c) => !c.ownerPrefixes.includes(prefix))];
}
