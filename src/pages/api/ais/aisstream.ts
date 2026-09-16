import type { APIRoute } from 'astro';

/**
 * Server-side relay for AISStream.io.
 *
 * AISStream is a keyed WebSocket API, so the key must stay on the server. Each
 * request opens a short-lived subscription for the requested bounding box,
 * collects position reports and static data for a few seconds, and returns a
 * JSON snapshot. Responses are CDN-cacheable for 15 s and bounding boxes are
 * snapped to a 5° grid so nearby viewports share cache entries (AISStream
 * allows only 3 concurrent connections per account).
 *
 * Deployed as a Vercel serverless function via @astrojs/vercel.
 */
export const prerender = false;

const DEFAULT_WS_URL = 'wss://stream.aisstream.io/v0/stream';
const GRID_DEG = 5;
const MIN_WINDOW_MS = 2_000;
const MAX_WINDOW_MS = 12_000;
const DEFAULT_WINDOW_MS = 6_000;
const CONNECT_GRACE_MS = 4_000;

export interface RelayPosition {
  mmsi: number;
  name: string;
  lat: number;
  lon: number;
  sog: number;
  cog: number;
  heading: number;
  navStatus: number;
  time: string;
}

export interface RelayStatic {
  mmsi: number;
  imo: number;
  callSign: string;
  name: string;
  type: number;
  destination: string;
  eta: { month: number; day: number; hour: number; minute: number } | null;
  length: number;
  width: number;
  draught: number;
}

export interface RelaySnapshot {
  positions: RelayPosition[];
  statics: RelayStatic[];
  bbox: [number, number, number, number];
  windowMs: number;
  receivedAt: number;
  messages: number;
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });

function env(name: string): string | undefined {
  const fromProcess = typeof process !== 'undefined' ? process.env?.[name] : undefined;
  return fromProcess ?? (import.meta.env as Record<string, string | undefined>)[name];
}

/** Parse "w,s,e,n", clamp to valid ranges and snap outward to the grid. */
function parseBbox(raw: string | null): [number, number, number, number] | null {
  if (!raw) return null;
  const parts = raw.split(',').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  let [w, s, e, n] = parts as [number, number, number, number];
  if (s > n) [s, n] = [n, s];
  if (w > e) [w, e] = [e, w];
  s = Math.max(-85, s);
  n = Math.min(85, n);
  w = Math.max(-180, w);
  e = Math.min(180, e);
  const snap = (v: number, up: boolean) => (up ? Math.ceil(v / GRID_DEG) : Math.floor(v / GRID_DEG)) * GRID_DEG;
  return [snap(w, false), snap(s, false), snap(e, true), snap(n, true)];
}

function goTimeToIso(value: unknown): string {
  // AISStream MetaData.time_utc looks like "2023-05-16 10:35:05.062594893 +0000 UTC".
  if (typeof value === 'string') {
    const m = value.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})/);
    if (m) return `${m[1]}T${m[2]}Z`;
  }
  return new Date().toISOString();
}

interface AisEnvelope {
  MessageType?: string;
  MetaData?: { MMSI?: number; ShipName?: string; latitude?: number; longitude?: number; time_utc?: string };
  Message?: {
    PositionReport?: { UserID?: number; Latitude?: number; Longitude?: number; Sog?: number; Cog?: number; TrueHeading?: number; NavigationalStatus?: number };
    ShipStaticData?: {
      UserID?: number;
      ImoNumber?: number;
      CallSign?: string;
      Name?: string;
      Type?: number;
      Destination?: string;
      Eta?: { Month?: number; Day?: number; Hour?: number; Minute?: number };
      Dimension?: { A?: number; B?: number; C?: number; D?: number };
      MaximumStaticDraught?: number;
    };
  };
  error?: string;
}

function collect(wsUrl: string, apiKey: string, bbox: [number, number, number, number], windowMs: number): Promise<RelaySnapshot> {
  const [w, s, e, n] = bbox;
  return new Promise((resolve, reject) => {
    const positions = new Map<number, RelayPosition>();
    const statics = new Map<number, RelayStatic>();
    let messages = 0;
    let settled = false;
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      reject(err instanceof Error ? err : new Error('WebSocket unavailable'));
      return;
    }
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(guard);
      try {
        ws.close();
      } catch {
        /* already closed */
      }
      resolve({ positions: [...positions.values()], statics: [...statics.values()], bbox, windowMs, receivedAt: Date.now(), messages });
    };
    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(guard);
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      reject(new Error(message));
    };
    const guard = setTimeout(finish, windowMs + CONNECT_GRACE_MS);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          APIKey: apiKey,
          BoundingBoxes: [[[s, w], [n, e]]],
          FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
        }),
      );
      setTimeout(finish, windowMs);
    };
    // AISStream sends binary frames containing UTF-8 JSON.
    ws.binaryType = 'arraybuffer';
    const decoder = new TextDecoder();
    const handle = (text: string) => {
      if (settled) return;
      let msg: AisEnvelope;
      try {
        msg = JSON.parse(text) as AisEnvelope;
      } catch {
        return;
      }
      if (msg.error) {
        fail(`AISStream: ${msg.error}`);
        return;
      }
      messages++;
      const meta = msg.MetaData ?? {};
      if (msg.MessageType === 'PositionReport' && msg.Message?.PositionReport) {
        const p = msg.Message.PositionReport;
        const mmsi = p.UserID ?? meta.MMSI;
        const lat = p.Latitude ?? meta.latitude;
        const lon = p.Longitude ?? meta.longitude;
        if (!mmsi || lat === undefined || lon === undefined) return;
        positions.set(mmsi, {
          mmsi,
          name: (meta.ShipName ?? '').trim(),
          lat,
          lon,
          sog: p.Sog ?? 0,
          cog: p.Cog ?? 360,
          heading: p.TrueHeading ?? 511,
          navStatus: p.NavigationalStatus ?? 15,
          time: goTimeToIso(meta.time_utc),
        });
      } else if (msg.MessageType === 'ShipStaticData' && msg.Message?.ShipStaticData) {
        const d = msg.Message.ShipStaticData;
        const mmsi = d.UserID ?? meta.MMSI;
        if (!mmsi) return;
        const eta = d.Eta && d.Eta.Month ? { month: d.Eta.Month ?? 0, day: d.Eta.Day ?? 0, hour: d.Eta.Hour ?? 24, minute: d.Eta.Minute ?? 60 } : null;
        statics.set(mmsi, {
          mmsi,
          imo: d.ImoNumber ?? 0,
          callSign: (d.CallSign ?? '').trim(),
          name: (d.Name ?? meta.ShipName ?? '').trim(),
          type: d.Type ?? 0,
          destination: (d.Destination ?? '').trim(),
          eta,
          length: (d.Dimension?.A ?? 0) + (d.Dimension?.B ?? 0),
          width: (d.Dimension?.C ?? 0) + (d.Dimension?.D ?? 0),
          draught: d.MaximumStaticDraught ?? 0,
        });
      }
    };
    ws.onmessage = (event: MessageEvent) => {
      const data: unknown = event.data;
      if (typeof data === 'string') handle(data);
      else if (data instanceof ArrayBuffer) handle(decoder.decode(data));
      else if (ArrayBuffer.isView(data)) handle(decoder.decode(data));
      else if (data instanceof Blob) void data.text().then(handle, () => undefined);
    };
    ws.onerror = () => fail('Could not connect to AISStream.');
    ws.onclose = (event: CloseEvent) => {
      if (settled) return;
      if (event.code === 1000 || event.code === 1005) finish();
      else fail(`AISStream connection closed (${event.code}${event.reason ? `: ${event.reason}` : ''}).`);
    };
  });
}

export const GET: APIRoute = async ({ url }) => {
  const apiKey = env('AISSTREAM_API_KEY');
  const noStore = { 'Cache-Control': 'no-store' };
  if (!apiKey) {
    return json({ configured: false, error: 'AISSTREAM_API_KEY is not configured on the server.' }, 503, noStore);
  }
  if (url.searchParams.has('probe')) return json({ configured: true }, 200, noStore);

  const bbox = parseBbox(url.searchParams.get('bbox'));
  if (!bbox) return json({ error: 'Query parameter bbox=w,s,e,n is required.' }, 400, noStore);
  const requested = Number(url.searchParams.get('window'));
  const windowMs = Number.isFinite(requested) && requested > 0 ? Math.min(MAX_WINDOW_MS, Math.max(MIN_WINDOW_MS, requested)) : DEFAULT_WINDOW_MS;

  try {
    const snapshot = await collect(env('AISSTREAM_WS_URL') ?? DEFAULT_WS_URL, apiKey, bbox, windowMs);
    return json(snapshot, 200, { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30' });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'AISStream relay failed.' }, 502, noStore);
  }
};
