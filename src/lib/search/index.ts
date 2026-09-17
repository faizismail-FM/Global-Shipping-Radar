import type { Port, Vessel } from '@/types';
import { PORTS } from '@/data/ports';
import { ZONES, type MaritimeZone } from '@/data/zones';
import { CONTAINERS } from '@/data/containers';
import { containerTrackingStore } from '@/lib/providers/live';
import { REGIONS, REGION_BOUNDS } from '@/data/regions';
import { classifyQuery, type ClassifiedQuery } from './classify';

export type { ClassifiedQuery, QueryKind } from './classify';
export { classifyQuery } from './classify';

export type SearchResult = (
  | { type: 'vessel'; id: string; title: string; subtitle: string; detail: string; vessel: Vessel }
  | { type: 'port'; id: string; title: string; subtitle: string; detail: string; port: Port }
  | { type: 'container'; id: string; title: string; subtitle: string; detail: string; known: boolean }
  | {
      type: 'location';
      id: string;
      title: string;
      subtitle: string;
      detail: string;
      target: { longitude: number; latitude: number; zoom: number } | { bounds: [number, number, number, number] };
    }
) & { score: number };

export interface SearchResponse {
  query: ClassifiedQuery;
  results: SearchResult[];
  /** Results grouped in display order. */
  groups: { type: SearchResult['type']; label: string; items: SearchResult[] }[];
}

const GROUP_LABEL: Record<SearchResult['type'], string> = {
  vessel: 'Vessels',
  port: 'Ports',
  container: 'Container',
  location: 'Locations',
};

function scoreText(haystack: string, needle: string): number {
  const h = haystack.toLowerCase();
  if (h === needle) return 100;
  if (h.startsWith(needle)) return 80;
  const wordStart = h.split(/\s+/).some((w) => w.startsWith(needle));
  if (wordStart) return 60;
  if (h.includes(needle)) return 40;
  return 0;
}

function vesselResult(v: Vessel, score = 100): SearchResult {
  return { type: 'vessel', id: v.id, title: v.name, subtitle: `IMO ${v.imo}`, detail: v.destination, vessel: v, score };
}

function portResult(p: Port, score = 100): SearchResult {
  return { type: 'port', id: p.id, title: p.name, subtitle: p.country, detail: `${p.congestion} congestion`, port: p, score };
}

function zoneResult(z: MaritimeZone, score = 100): SearchResult {
  return {
    type: 'location',
    id: `zone:${z.id}`,
    title: z.name,
    subtitle: z.kind === 'canal' ? 'Canal' : z.kind === 'strait' ? 'Strait' : z.kind === 'passage' ? 'Passage' : 'Sea area',
    detail: 'Maritime area',
    target: { longitude: z.longitude, latitude: z.latitude, zoom: z.zoom },
    score,
  };
}

/**
 * Search across vessels, ports, demo containers and maritime locations.
 * Synchronous and cheap: the fleet is a few hundred records.
 */
export function search(rawQuery: string, vessels: Vessel[], ports: Port[] = PORTS, limitPerGroup = 6): SearchResponse {
  const query = classifyQuery(rawQuery);
  const results: SearchResult[] = [];
  const q = query.value.toLowerCase();

  if (!q) return { query, results, groups: [] };

  if (query.kind === 'container') {
    const known = CONTAINERS.some((c) => c.containerNumber === query.value);
    const tracking = containerTrackingStore.getState();
    const live = tracking.configured ? tracking.carriers.join(', ') : null;
    results.push({
      type: 'container',
      id: query.value,
      title: query.value,
      subtitle: known ? 'Demo tracking record available' : live ? 'Container number' : 'Container number',
      detail: known ? 'Demo tracking data' : live ? `Look up live at ${live}` : 'Requires a connected carrier / tracking data source',
      known,
      score: 100,
    });
    // Partial container numbers may still match the demo records.
    if (!known) {
      CONTAINERS.filter((c) => c.containerNumber.startsWith(query.value))
        .slice(0, 4)
        .forEach((c) =>
          results.push({ type: 'container', id: c.containerNumber, title: c.containerNumber, subtitle: `${c.sizeType} · ${c.status}`, detail: c.vesselName, known: true, score: 80 }),
        );
    }
    return finalize(query, results);
  }

  if (query.kind === 'imo') {
    vessels.filter((v) => v.imo.startsWith(query.value)).slice(0, limitPerGroup).forEach((v) => results.push(vesselResult(v)));
    return finalize(query, results);
  }

  if (query.kind === 'mmsi') {
    vessels.filter((v) => v.mmsi.startsWith(query.value)).slice(0, limitPerGroup).forEach((v) => results.push(vesselResult(v)));
    return finalize(query, results);
  }

  // Free text ------------------------------------------------------------
  const scoredVessels = vessels
    .map((v) => ({
      v,
      s: Math.max(
        scoreText(v.name, q),
        scoreText(v.operator, q) - 15,
        scoreText(v.destination, q) - 25,
        v.imo.startsWith(q) ? 70 : 0,
        v.mmsi.startsWith(q) ? 70 : 0,
      ),
    }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.v.name.localeCompare(b.v.name))
    .slice(0, limitPerGroup);
  scoredVessels.forEach(({ v, s }) => results.push(vesselResult(v, s)));

  const scoredPorts = ports
    .map((p) => ({ p, s: Math.max(scoreText(p.name, q), scoreText(p.country, q) - 20, scoreText(p.locode, q) - 10) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 4);
  scoredPorts.forEach(({ p, s }) => results.push(portResult(p, s)));

  const scoredZones = ZONES.map((z) => ({ z, s: scoreText(z.name, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3);
  scoredZones.forEach(({ z, s }) => results.push(zoneResult(z, s)));

  REGIONS.filter((r) => scoreText(r, q) >= 60)
    .slice(0, 2)
    .forEach((r) =>
      results.push({ type: 'location', id: `region:${r}`, title: r, subtitle: 'Region', detail: 'Zoom to region', target: { bounds: REGION_BOUNDS[r] }, score: scoreText(r, q) }),
    );

  // Demo containers by prefix (e.g. typing "MSBU").
  if (/^[A-Z]{2,4}$/i.test(query.value)) {
    CONTAINERS.filter((c) => c.containerNumber.startsWith(query.value.toUpperCase()))
      .slice(0, 3)
      .forEach((c) =>
        results.push({ type: 'container', id: c.containerNumber, title: c.containerNumber, subtitle: `${c.sizeType} · ${c.status}`, detail: c.vesselName, known: true, score: 50 }),
      );
  }

  return finalize(query, results);
}

function finalize(query: ClassifiedQuery, results: SearchResult[]): SearchResponse {
  const order: SearchResult['type'][] = query.kind === 'container' ? ['container', 'vessel', 'port', 'location'] : ['vessel', 'port', 'container', 'location'];
  // Groups are ordered by their best match so an exact port name ("Singapore")
  // ranks above vessels that merely sail there; ties keep the default order.
  const groups = order
    .map((type, i) => ({ type, label: GROUP_LABEL[type], items: results.filter((r) => r.type === type), index: i }))
    .filter((g) => g.items.length > 0)
    .sort((a, b) => Math.max(...b.items.map((r) => r.score)) - Math.max(...a.items.map((r) => r.score)) || a.index - b.index)
    .map(({ type, label, items }) => ({ type, label, items }));
  return { query, results: groups.flatMap((g) => g.items), groups };
}
