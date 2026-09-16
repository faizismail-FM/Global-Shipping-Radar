import type { Vessel } from '@/types';
import type { LiveAISSource } from './types';
import { cleanAisDestination, decodeAisEta, flagFromMmsi, statusFromNav, vesselTypeFromAis } from './codes';
import { PORTS } from '@/data/ports';
import { normalizeLongitude } from '@/lib/geo';
import { viewportStore } from '@/lib/map/viewport';
import type { RelaySnapshot } from '@/pages/api/ais/aisstream';

/**
 * AISStream.io (global, terrestrial AIS) through the server relay at
 * /api/ais/aisstream. The relay holds the API key; the browser asks for a
 * snapshot of the current map view and accumulates tracks across polls so
 * panning builds up a picture. Tracks expire after 15 minutes without a report.
 */

const MAX_SPAN_LNG = 40;
const MAX_SPAN_LAT = 25;
const TRACK_TTL_MS = 15 * 60_000;
/** Busy default area for the first view (English Channel / North Sea). */
export const AISSTREAM_DEFAULT_BOUNDS: [number, number, number, number] = [-6, 48, 10, 56];

const LOCODE_TO_NAME = new Map<string, string>(PORTS.map((p) => [p.locode, p.name]));
const NAME_TO_NAME = new Map<string, string>(PORTS.map((p) => [p.name.toUpperCase(), p.name]));
const resolveDestination = (key: string) => LOCODE_TO_NAME.get(key) ?? NAME_TO_NAME.get(key) ?? null;

interface Track {
  position: RelaySnapshot['positions'][number];
  seenAt: number;
}

export class AISStreamSource implements LiveAISSource {
  readonly id = 'aisstream';
  readonly name = 'AISStream (global)';
  readonly attribution = 'AIS data via aisstream.io';
  readonly attributionUrl = 'https://aisstream.io';
  readonly coverage = { bounds: [-180, -85, 180, 85] as [number, number, number, number], label: 'Global · vessels in the current map view' };
  readonly pollIntervalMs = 20_000;
  readonly viewportSensitive = true;

  private tracks = new Map<number, Track>();
  private statics = new Map<number, RelaySnapshot['statics'][number]>();

  /** Current request area: the map view, capped so a world view doesn't ask for the whole ocean. */
  requestBounds(): [number, number, number, number] {
    const { bounds } = viewportStore.getState();
    if (!bounds) return AISSTREAM_DEFAULT_BOUNDS;
    let [w, s, e, n] = bounds;
    const cx = (w + e) / 2;
    const cy = (s + n) / 2;
    if (e - w > MAX_SPAN_LNG) {
      w = cx - MAX_SPAN_LNG / 2;
      e = cx + MAX_SPAN_LNG / 2;
    }
    if (n - s > MAX_SPAN_LAT) {
      s = cy - MAX_SPAN_LAT / 2;
      n = cy + MAX_SPAN_LAT / 2;
    }
    return [Math.max(-180, w), Math.max(-85, s), Math.min(180, e), Math.min(85, n)];
  }

  async fetchVessels(signal?: AbortSignal): Promise<Vessel[]> {
    const bbox = this.requestBounds().map((v) => v.toFixed(2)).join(',');
    const res = await fetch(`/api/ais/aisstream?bbox=${bbox}`, { signal, headers: { accept: 'application/json' } });
    let body: Partial<RelaySnapshot> & { error?: string; configured?: boolean } = {};
    try {
      body = (await res.json()) as typeof body;
    } catch {
      /* non-JSON error page */
    }
    if (res.status === 503 && body.configured === false) {
      throw new Error('AISStream is not configured: set AISSTREAM_API_KEY on the server.');
    }
    if (!res.ok) throw new Error(body.error ?? `Relay responded ${res.status}`);

    const now = Date.now();
    for (const p of body.positions ?? []) this.tracks.set(p.mmsi, { position: p, seenAt: now });
    for (const s of body.statics ?? []) this.statics.set(s.mmsi, s);
    for (const [mmsi, t] of this.tracks) if (now - t.seenAt > TRACK_TTL_MS) this.tracks.delete(mmsi);

    return [...this.tracks.values()].map(({ position: p }) => this.toVessel(p, now));
  }

  private toVessel(p: RelaySnapshot['positions'][number], now: number): Vessel {
    const st = this.statics.get(p.mmsi);
    const sog = p.sog >= 102.3 ? 0 : p.sog;
    const heading = p.heading >= 0 && p.heading < 360 ? p.heading : p.cog >= 0 && p.cog < 360 ? p.cog : 0;
    const status = statusFromNav(p.navStatus, sog);
    const destination = cleanAisDestination(st?.destination, resolveDestination);
    const { flag, flagCode } = flagFromMmsi(p.mmsi);
    const packedEta = st?.eta ? (st.eta.month << 16) | (st.eta.day << 11) | (st.eta.hour << 6) | st.eta.minute : 0;
    const eta = decodeAisEta(packedEta, now);
    const name = (st?.name || p.name || `MMSI ${p.mmsi}`).replace(/@+$/g, '').trim() || `MMSI ${p.mmsi}`;
    return {
      id: `ais-${p.mmsi}`,
      name,
      imo: st?.imo ? String(st.imo) : '',
      mmsi: String(p.mmsi),
      type: st ? vesselTypeFromAis(st.type) : 'other',
      source: 'ais',
      flag,
      flagCode,
      callSign: st?.callSign || undefined,
      latitude: p.lat,
      longitude: normalizeLongitude(p.lon),
      speed: Math.round(sog * 10) / 10,
      heading: Math.round(heading),
      status,
      destination,
      departurePort: '',
      arrivalPort: destination,
      eta: eta ?? '',
      vesselLength: st?.length ?? 0,
      vesselWidth: st?.width ?? 0,
      capacityTEU: 0,
      operator: '',
      route: destination ? [destination] : [],
      lastUpdated: p.time,
      laneId: '',
      voyage: '',
      delayHours: 0,
      voyageDistanceNm: 0,
    };
  }
}
