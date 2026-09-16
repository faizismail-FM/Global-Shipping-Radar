import type { Vessel, VesselStatus } from '@/types';
import type { VesselNav } from '@/lib/simulation/types';
import { createRng, type Rng } from '@/lib/seed';
import { bearing, destination, distanceNm, interpolate, normalizeLongitude, pathSegmentLengthNm, type LngLat } from '@/lib/geo';
import { imoCheckDigit } from '@/lib/identifiers';
import { LANES, LANE_BY_ID, type CompiledLane } from './lanes';
import { OPERATORS } from './operators';
import { PORT_BY_ID } from './ports';

/**
 * Deterministic simulated fleet generator.
 *
 * Vessel names and operators are realistic, but every position, voyage, ETA
 * and identifier is SIMULATED. Nothing here reflects the real-world location of
 * any ship.
 */

const LANE_WEIGHTS: Record<string, number> = {
  'asia-europe': 0.2,
  'transpacific-west': 0.16,
  'transpacific-east': 0.09,
  transatlantic: 0.1,
  'middle-east-asia': 0.1,
  'asia-oceania': 0.08,
  'europe-south-america': 0.07,
  'europe-africa': 0.07,
  'intra-asia': 0.13,
};

const MID_BY_FLAG: Record<string, number[]> = {
  PA: [351, 352, 353, 354, 355, 356, 357, 370, 371, 372, 373],
  LR: [636, 637],
  MT: [215, 229, 248, 249, 256],
  DK: [219, 220],
  SG: [563, 564, 565, 566],
  HK: [477],
  TW: [416],
  GB: [232, 233, 234, 235],
  FR: [226, 227, 228],
  CN: [412, 413, 414],
  JP: [431, 432],
  DE: [211, 218],
  KR: [440, 441],
  IL: [428],
};

export interface GeneratedFleet {
  vessels: Vessel[];
  nav: Map<string, VesselNav>;
}

export interface FleetOptions {
  seed?: number;
  /** Simulated "now" in ms. */
  now?: number;
  /** Simulated hours per tick, used to seed dwell times. */
  hoursPerTick?: number;
}

function pickLane(rng: Rng): CompiledLane {
  const r = rng.next();
  let acc = 0;
  for (const lane of LANES) {
    acc += LANE_WEIGHTS[lane.id] ?? 0.05;
    if (r <= acc) return lane;
  }
  return LANES[LANES.length - 1] as CompiledLane;
}

function makeImo(rng: Rng): string {
  const six = String(rng.int(900000, 999999));
  return `${six}${imoCheckDigit(six)}`;
}

function makeMmsi(rng: Rng, flagCode: string): string {
  const mids = MID_BY_FLAG[flagCode] ?? [370];
  const mid = rng.pick(mids);
  return `${mid}${String(rng.int(0, 999999)).padStart(6, '0')}`;
}

function dimensionsForTeu(teu: number): { length: number; width: number } {
  const t = Math.min(1, Math.max(0, (teu - 2500) / 21500));
  const length = Math.round(200 + 200 * Math.pow(t, 0.75));
  const width = Math.round((32 + 29.5 * Math.pow(t, 0.9)) * 10) / 10;
  return { length, width };
}

/** Sorted waypoint indices of the lane's ports. */
function portIndices(lane: CompiledLane): number[] {
  return lane.ports.map((id) => lane.portIndex.get(id) as number);
}

function portNameAt(lane: CompiledLane, waypointIndex: number): string {
  for (const [id, idx] of lane.portIndex) {
    if (idx === waypointIndex) return PORT_BY_ID.get(id)?.name ?? id;
  }
  return 'At sea';
}

/** Build the ordered list of port calls (waypoint indices) after `departure` in direction `dir`. */
function planCalls(rng: Rng, lane: CompiledLane, departure: number, dir: 1 | -1, maxCalls = 5): number[] {
  const idx = portIndices(lane);
  const ahead = dir === 1 ? idx.filter((i) => i > departure) : idx.filter((i) => i < departure).reverse();
  if (ahead.length === 0) return [];
  const count = Math.min(ahead.length, rng.int(1, maxCalls));
  const candidates = ahead.slice(0, count);
  const last = candidates[candidates.length - 1] as number;
  // Skip roughly half of the intermediate calls so voyages look varied.
  const calls = candidates.slice(0, -1).filter(() => rng.chance(0.55));
  calls.push(last);
  return calls;
}

export function routeNames(lane: CompiledLane, departure: number, calls: number[]): string[] {
  return [portNameAt(lane, departure), ...calls.map((c) => portNameAt(lane, c))];
}

/** Remaining distance (nm) from a position to a waypoint index along the lane. */
export function remainingDistanceNm(lane: CompiledLane, pos: LngLat, next: number, _dir: 1 | -1, target: number): number {
  const wp = lane.waypoints;
  const nextPoint = wp[next] as LngLat;
  let total = distanceNm(pos, nextPoint);
  if (next !== target) total += pathSegmentLengthNm(wp, next, target);
  return total;
}

export function makeVoyageNumber(rng: Rng, dir: 1 | -1, lane: CompiledLane): string {
  const east = lane.from === 'Asia' ? dir === 1 : dir === -1;
  return `${String(rng.int(1, 399)).padStart(3, '0')}${east ? 'E' : 'W'}`;
}

interface Placement {
  status: VesselStatus;
  pos: LngLat;
  heading: number;
  speed: number;
  nav: VesselNav;
}

function placeVessel(rng: Rng, lane: CompiledLane, serviceSpeed: number, hoursPerTick: number): Placement {
  const wp = lane.waypoints;
  const idx = portIndices(lane);
  const dir: 1 | -1 = rng.chance(0.5) ? 1 : -1;
  const roll = rng.next();
  const status: VesselStatus = roll < 0.7 ? 'underway' : roll < 0.84 ? 'moored' : roll < 0.94 ? 'anchored' : 'delayed';

  // Choose the departure port: any port that has at least one port ahead in the chosen direction.
  const departureCandidates = dir === 1 ? idx.slice(0, -1) : idx.slice(1);
  const departure = rng.pick(departureCandidates);
  const calls = planCalls(rng, lane, departure, dir);
  const firstCall = calls[0] as number;

  const base = { laneId: lane.id, dir, calls, departure, serviceSpeed, zoneId: null, scheduledEta: 0 };

  if (status === 'underway') {
    // Somewhere between departure and the first call.
    const lo = Math.min(departure, firstCall);
    const hi = Math.max(departure, firstCall);
    const seg = rng.int(lo, hi - 1); // segment from wp[seg] to wp[seg+1]
    const f = rng.next();
    const pos = interpolate(wp[seg] as LngLat, wp[seg + 1] as LngLat, f);
    const next = dir === 1 ? seg + 1 : seg;
    const heading = bearing(pos, wp[next] as LngLat);
    const speed = Math.round(serviceSpeed * rng.range(0.85, 1.05) * 10) / 10;
    return { status, pos, heading, speed, nav: { ...base, next, dwell: 0 } };
  }

  if (status === 'moored') {
    // Alongside at the departure port, about to sail.
    const p = wp[departure] as LngLat;
    const pos = destination(p, rng.range(0, 360), rng.range(0.2, 1.2));
    const next = departure + dir;
    return {
      status,
      pos,
      heading: bearing(pos, wp[next] as LngLat),
      speed: 0,
      nav: { ...base, next, dwell: rng.int(2, Math.max(3, Math.round(24 / hoursPerTick))) },
    };
  }

  // Anchored / delayed: waiting at the anchorage off the first call port, on the approach.
  const approach = wp[firstCall - dir] as LngLat;
  const portPoint = wp[firstCall] as LngLat;
  const pos = interpolate(portPoint, approach, rng.range(0.25, 0.6));
  const heading = bearing(pos, portPoint);
  return {
    status,
    pos,
    heading,
    speed: status === 'delayed' ? Math.round(rng.range(0, 2.5) * 10) / 10 : Math.round(rng.range(0, 0.8) * 10) / 10,
    nav: { ...base, next: firstCall, dwell: rng.int(3, Math.max(4, Math.round(30 / hoursPerTick))) },
  };
}

export function generateFleet(options: FleetOptions = {}): GeneratedFleet {
  const seed = options.seed ?? 20260910;
  const now = options.now ?? Date.now();
  const hoursPerTick = options.hoursPerTick ?? 1;
  const rng = createRng(seed);
  const vessels: Vessel[] = [];
  const nav = new Map<string, VesselNav>();
  const usedImo = new Set<string>();

  let counter = 1;
  for (const operator of OPERATORS) {
    for (const name of operator.vessels) {
      const lane = pickLane(rng);
      const [flag, flagCode] = rng.pick(operator.flags);
      const teu = Math.round(rng.range(operator.teu[0], operator.teu[1]) / 100) * 100;
      const { length, width } = dimensionsForTeu(teu);
      const serviceSpeed = Math.round(rng.range(14, 21.5) * 10) / 10;
      const placement = placeVessel(rng, lane, serviceSpeed, hoursPerTick);

      let imo = makeImo(rng);
      while (usedImo.has(imo)) imo = makeImo(rng);
      usedImo.add(imo);

      const id = `v-${String(counter).padStart(3, '0')}`;
      counter++;

      const { nav: n, pos, status } = placement;
      const firstCall = n.calls[0] as number;
      const lastCall = n.calls[n.calls.length - 1] as number;
      const remaining = remainingDistanceNm(lane, pos, n.next, n.dir, firstCall);
      const etaHours = remaining / Math.max(serviceSpeed, 8) + (status === 'moored' ? n.dwell * hoursPerTick : 0);
      const delayHours = status === 'delayed' ? rng.int(4, 36) : 0;
      const eta = now + (etaHours + delayHours) * 3_600_000;
      n.scheduledEta = now + etaHours * 3_600_000;

      const vessel: Vessel = {
        id,
        name,
        imo,
        mmsi: makeMmsi(rng, flagCode),
        type: 'container',
        source: 'simulated',
        flag,
        flagCode,
        latitude: Math.round(pos[1] * 1e5) / 1e5,
        longitude: Math.round(normalizeLongitude(pos[0]) * 1e5) / 1e5,
        speed: placement.speed,
        heading: Math.round(placement.heading),
        status,
        destination: portNameAt(lane, firstCall),
        departurePort: portNameAt(lane, n.departure),
        arrivalPort: portNameAt(lane, lastCall),
        eta: new Date(eta).toISOString(),
        vesselLength: length,
        vesselWidth: width,
        capacityTEU: teu,
        operator: operator.name,
        route: routeNames(lane, n.departure, n.calls),
        lastUpdated: new Date(now - rng.int(5, 900) * 1000).toISOString(),
        laneId: lane.id,
        voyage: makeVoyageNumber(rng, n.dir, lane),
        delayHours,
        voyageDistanceNm: Math.round(pathSegmentLengthNm(lane.waypoints, n.departure, lastCall)),
      };
      vessels.push(vessel);
      nav.set(id, n);
    }
  }

  applyHeroPlacements(vessels, nav, now, rng);
  return { vessels, nav };
}

/**
 * Pin a few well-known demo vessels to predictable positions so the documented
 * flows (search "EVER ACE" → Singapore Strait, etc.) behave consistently.
 */
function applyHeroPlacements(vessels: Vessel[], nav: Map<string, VesselNav>, now: number, rng: Rng): void {
  const pin = (
    name: string,
    laneId: string,
    dir: 1 | -1,
    departurePortId: string,
    callPortIds: string[],
    segmentOffset: number,
    fraction: number,
    status: VesselStatus = 'underway',
  ) => {
    const vessel = vessels.find((v) => v.name === name);
    const lane = LANE_BY_ID.get(laneId);
    if (!vessel || !lane) return;
    const departure = lane.portIndex.get(departurePortId);
    const calls = callPortIds.map((id) => lane.portIndex.get(id)).filter((i): i is number => i !== undefined);
    if (departure === undefined || calls.length === 0) return;
    const wp = lane.waypoints;
    const seg = departure + dir * segmentOffset;
    const target = seg + dir;
    const pos = interpolate(wp[seg] as LngLat, wp[target] as LngLat, fraction);
    const heading = bearing(pos, wp[target] as LngLat);
    const serviceSpeed = nav.get(vessel.id)?.serviceSpeed ?? 18;
    const n: VesselNav = {
      laneId,
      dir,
      next: target,
      calls,
      departure,
      dwell: status === 'underway' ? 0 : rng.int(4, 10),
      serviceSpeed,
      zoneId: null,
      scheduledEta: 0,
    };
    const firstCall = calls[0] as number;
    const lastCall = calls[calls.length - 1] as number;
    const remaining = remainingDistanceNm(lane, pos, n.next, dir, firstCall);
    const etaHours = remaining / Math.max(serviceSpeed, 8);
    n.scheduledEta = now + etaHours * 3_600_000;
    Object.assign(vessel, {
      latitude: Math.round(pos[1] * 1e5) / 1e5,
      longitude: Math.round(normalizeLongitude(pos[0]) * 1e5) / 1e5,
      heading: Math.round(heading),
      speed: status === 'underway' ? Math.round(serviceSpeed * 0.95 * 10) / 10 : 0,
      status,
      destination: portNameAt(lane, firstCall),
      departurePort: portNameAt(lane, departure),
      arrivalPort: portNameAt(lane, lastCall),
      eta: new Date(n.scheduledEta).toISOString(),
      route: routeNames(lane, departure, calls),
      laneId,
      delayHours: 0,
      voyageDistanceNm: Math.round(pathSegmentLengthNm(wp, departure, lastCall)),
    } satisfies Partial<Vessel>);
    nav.set(vessel.id, n);
  };

  // EVER ACE: westbound through the Singapore Strait, bound for Rotterdam via Colombo.
  pin('EVER ACE', 'asia-europe', 1, 'singapore', ['colombo', 'algeciras', 'rotterdam'], 0, 0.35);
  // MSC IRINA: just departed Port Klang for Europe.
  pin('MSC IRINA', 'asia-europe', 1, 'port-klang', ['colombo', 'piraeus', 'felixstowe', 'hamburg'], 0, 0.5);
  // OOCL SPAIN: mid-Indian Ocean towards Colombo.
  pin('OOCL SPAIN', 'asia-europe', 1, 'port-klang', ['colombo', 'port-said', 'antwerp'], 5, 0.4);
  // MAERSK SENTOSA: transpacific, mid-ocean, bound for Los Angeles.
  pin('MAERSK SENTOSA', 'transpacific-west', 1, 'tokyo', ['los-angeles', 'oakland'], 8, 0.6);
  // CMA CGM MARCO POLO: North Atlantic, bound for New York.
  pin('CMA CGM MARCO POLO', 'transatlantic', 1, 'le-havre', ['new-york', 'savannah'], 4, 0.55);
  // ONE INNOVATION: Suez Canal approach.
  pin('ONE INNOVATION', 'asia-europe', 1, 'colombo', ['port-said', 'rotterdam'], 15, 0.5);
  // COSCO SHIPPING UNIVERSE: Taiwan Strait, southbound to Shenzhen.
  pin('COSCO SHIPPING UNIVERSE', 'asia-europe', 1, 'ningbo', ['shenzhen', 'singapore'], 3, 0.3);
  // HMM ALGECIRAS: alongside in Rotterdam.
  pin('HMM ALGECIRAS', 'asia-europe', -1, 'rotterdam', ['algeciras', 'singapore', 'shanghai'], 0, 0.02, 'moored');
}
