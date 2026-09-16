import type { Vessel } from '@/types';
import type { LiveAISSource } from './types';
import { cleanAisDestination, decodeAisEta, flagFromMmsi, statusFromNav, vesselTypeFromAis } from './codes';
import { PORTS } from '@/data/ports';
import { normalizeLongitude } from '@/lib/geo';

/**
 * Fintraffic / Digitraffic marine AIS (Finland). Open data, no API key,
 * CC BY 4.0. Coverage is the Baltic Sea around Finnish waters.
 * https://www.digitraffic.fi/en/marine-traffic/
 */

const BASE = 'https://meri.digitraffic.fi/api/ais/v1';
const USER_HEADER = 'GlobalShippingRadar/1.0 (github.com/faizismail-FM/Global-Shipping-Radar)';

interface LocationFeature {
  mmsi: number;
  geometry: { coordinates: [number, number] };
  properties: { sog: number; cog: number; navStat: number; heading: number; timestampExternal: number };
}
interface VesselMeta {
  mmsi: number;
  name: string;
  imo: number;
  callSign: string;
  shipType: number;
  destination: string;
  eta: number;
  referencePointA: number;
  referencePointB: number;
  referencePointC: number;
  referencePointD: number;
  timestamp: number;
}

const LOCODE_TO_NAME = new Map<string, string>(PORTS.map((p) => [p.locode, p.name]));
const NAME_TO_NAME = new Map<string, string>(PORTS.map((p) => [p.name.toUpperCase(), p.name]));

const EXTRA_LOCODES: Record<string, string> = {
  FIHEL: 'Helsinki', FIKTK: 'Kotka', FIHMN: 'Hamina', FITKU: 'Turku', FIRAU: 'Rauma', FIPOR: 'Pori', FIKOK: 'Kokkola', FIOUL: 'Oulu', FIKEM: 'Kemi',
  FINLI: 'Naantali', FIHKO: 'Hanko', FISKV: 'Sköldvik', FIVAA: 'Vaasa', FIMHQ: 'Mariehamn', FILPP: 'Lappeenranta', FIUKI: 'Uusikaupunki', FITOR: 'Tornio',
  EETLL: 'Tallinn', EEMUG: 'Muuga', EEPLA: 'Paldiski', EESLM: 'Sillamäe', SESTO: 'Stockholm', SEGOT: 'Gothenburg', SEVBY: 'Visby', SEOXE: 'Oxelösund',
  SENRK: 'Norrköping', SEKAN: 'Kapellskär', SELUL: 'Luleå', SEGVX: 'Gävle', SESDL: 'Sundsvall', SEMMA: 'Malmö', SEHEL: 'Helsingborg', SEKAA: 'Karlshamn',
  LVRIX: 'Riga', LVVNT: 'Ventspils', LVLPX: 'Liepāja', LTKLJ: 'Klaipėda', RULED: 'St Petersburg', RUULU: 'Ust-Luga', RUPRI: 'Primorsk', RUKGD: 'Kaliningrad',
  PLGDY: 'Gdynia', PLGDN: 'Gdańsk', PLSZZ: 'Szczecin', DEROS: 'Rostock', DELBC: 'Lübeck', DEKEL: 'Kiel', DEHAM: 'Hamburg', DEBRV: 'Bremerhaven',
  DKCPH: 'Copenhagen', DKAAR: 'Aarhus', DKFRC: 'Fredericia', NLRTM: 'Rotterdam', BEANR: 'Antwerp-Bruges', GBIMM: 'Immingham', NOOSL: 'Oslo',
};

function resolveDestination(key: string): string | null {
  return EXTRA_LOCODES[key] ?? LOCODE_TO_NAME.get(key) ?? NAME_TO_NAME.get(key) ?? null;
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { 'Digitraffic-User': USER_HEADER }, signal });
  if (!res.ok) throw new Error(`Digitraffic ${path} responded ${res.status}`);
  return (await res.json()) as T;
}

export interface DigitrafficOptions {
  /** Drop positions older than this (ms). Digitraffic keeps stale records for days. */
  maxPositionAgeMs?: number;
  /** Vessel classes to include. */
  types?: Vessel['type'][];
}

export class DigitrafficAISSource implements LiveAISSource {
  readonly id = 'digitraffic';
  readonly name = 'Digitraffic AIS (Baltic)';
  readonly attribution = 'AIS data: Fintraffic / Digitraffic, CC BY 4.0';
  readonly attributionUrl = 'https://www.digitraffic.fi/en/marine-traffic/';
  readonly coverage = { bounds: [16, 53.5, 31.5, 66.5] as [number, number, number, number], label: 'Baltic Sea (Finnish AIS network)' };
  readonly pollIntervalMs = 30_000;

  private maxAge: number;
  private types: Set<Vessel['type']>;
  private metaCache: Map<number, VesselMeta> = new Map();
  private metaFetchedAt = 0;

  constructor(options: DigitrafficOptions = {}) {
    this.maxAge = options.maxPositionAgeMs ?? 30 * 60_000;
    this.types = new Set(options.types ?? ['cargo', 'tanker']);
  }

  async fetchVessels(signal?: AbortSignal): Promise<Vessel[]> {
    const now = Date.now();
    // Static data changes rarely; refresh it every 10 minutes.
    const wantMeta = now - this.metaFetchedAt > 10 * 60_000;
    const [locations, meta] = await Promise.all([
      getJson<{ features: LocationFeature[] }>('/locations', signal),
      wantMeta ? getJson<VesselMeta[]>('/vessels', signal) : Promise.resolve(null),
    ]);
    if (meta) {
      this.metaCache = new Map(meta.map((m) => [m.mmsi, m]));
      this.metaFetchedAt = now;
    }

    const nowIso = new Date(now).toISOString();
    const vessels: Vessel[] = [];
    for (const f of locations.features) {
      const m = this.metaCache.get(f.mmsi);
      if (!m) continue;
      const type = vesselTypeFromAis(m.shipType);
      if (!this.types.has(type)) continue;
      const p = f.properties;
      if (now - p.timestampExternal > this.maxAge) continue;
      const [lng, lat] = f.geometry.coordinates;
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90) continue;

      const sog = p.sog >= 102.3 ? 0 : p.sog;
      const heading = p.heading >= 0 && p.heading < 360 ? p.heading : p.cog >= 0 && p.cog < 360 ? p.cog : 0;
      const status = statusFromNav(p.navStat, sog);
      const destination = cleanAisDestination(m.destination, resolveDestination);
      const { flag, flagCode } = flagFromMmsi(f.mmsi);
      const length = (m.referencePointA ?? 0) + (m.referencePointB ?? 0);
      const width = (m.referencePointC ?? 0) + (m.referencePointD ?? 0);
      const eta = decodeAisEta(m.eta, now);

      vessels.push({
        id: `ais-${f.mmsi}`,
        name: (m.name || `MMSI ${f.mmsi}`).trim(),
        imo: m.imo ? String(m.imo) : '',
        mmsi: String(f.mmsi),
        type,
        source: 'ais',
        flag,
        flagCode,
        callSign: m.callSign?.trim() || undefined,
        latitude: lat,
        longitude: normalizeLongitude(lng),
        speed: Math.round(sog * 10) / 10,
        heading: Math.round(heading),
        status,
        destination,
        departurePort: '',
        arrivalPort: destination,
        eta: eta ?? '',
        vesselLength: length,
        vesselWidth: width,
        capacityTEU: 0,
        operator: '',
        route: destination ? [destination] : [],
        lastUpdated: new Date(p.timestampExternal).toISOString(),
        laneId: '',
        voyage: '',
        delayHours: 0,
        voyageDistanceNm: 0,
      });
      void nowIso;
    }
    return vessels;
  }
}
