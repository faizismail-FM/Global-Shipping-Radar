import type { LaneStats, Port, Region, Vessel, VesselStatus } from '@/types';
import type { VesselFilters, SpeedBand } from '@/lib/store/ui';
import { regionForPosition } from '@/data/regions';
import { LANES } from '@/data/lanes';
import { distanceNm, pathLengthNm } from '@/lib/geo';

export interface FleetStats {
  total: number;
  atSea: number;
  inPort: number;
  anchored: number;
  delayed: number;
  ports: number;
  avgSpeed: number;
}

export function computeFleetStats(vessels: Vessel[], ports: Port[]): FleetStats {
  let atSea = 0;
  let inPort = 0;
  let anchored = 0;
  let delayed = 0;
  let speedSum = 0;
  let moving = 0;
  for (const v of vessels) {
    if (v.status === 'underway') {
      atSea++;
      speedSum += v.speed;
      moving++;
    } else if (v.status === 'moored') inPort++;
    else if (v.status === 'anchored') anchored++;
    else delayed++;
  }
  return {
    total: vessels.length,
    atSea,
    inPort,
    anchored,
    delayed,
    ports: ports.length,
    avgSpeed: moving ? Math.round((speedSum / moving) * 10) / 10 : 0,
  };
}

export function speedInBand(speed: number, band: SpeedBand): boolean {
  switch (band) {
    case 'all':
      return true;
    case '0-5':
      return speed < 5;
    case '5-15':
      return speed >= 5 && speed < 15;
    case '15-25':
      return speed >= 15 && speed < 25;
    case '25+':
      return speed >= 25;
  }
}

export function vesselRegion(v: Vessel): Region {
  return regionForPosition(v.longitude, v.latitude);
}

export function applyFilters(vessels: Vessel[], f: VesselFilters): Vessel[] {
  const statuses = new Set<VesselStatus>(f.statuses);
  const regions = new Set<Region>(f.regions);
  const dest = f.destination.trim().toLowerCase();
  return vessels.filter((v) => {
    if (!statuses.has(v.status)) return false;
    if (!speedInBand(v.speed, f.speed)) return false;
    if (regions.size > 0 && !regions.has(vesselRegion(v))) return false;
    if (dest && !v.destination.toLowerCase().includes(dest) && !v.arrivalPort.toLowerCase().includes(dest)) return false;
    return true;
  });
}

export function vesselsNearPort(vessels: Vessel[], port: Port, radiusNm = 200): (Vessel & { distanceNm: number })[] {
  return vessels
    .map((v) => ({ ...v, distanceNm: distanceNm([v.longitude, v.latitude], [port.longitude, port.latitude]) }))
    .filter((v) => v.distanceNm <= radiusNm)
    .sort((a, b) => a.distanceNm - b.distanceNm);
}

export function vesselsForPort(vessels: Vessel[], port: Port): Vessel[] {
  const near = new Set(vesselsNearPort(vessels, port, 150).map((v) => v.id));
  return vessels.filter((v) => near.has(v.id) || v.destination === port.name || v.departurePort === port.name || v.arrivalPort === port.name);
}

export function computeLaneStats(vessels: Vessel[]): LaneStats[] {
  return LANES.map((lane) => {
    const onLane = vessels.filter((v) => v.laneId === lane.id);
    const active = onLane.filter((v) => v.status === 'underway');
    const delayed = onLane.filter((v) => v.status === 'delayed' || v.delayHours > 0);
    const inPort = onLane.filter((v) => v.status === 'moored');
    const avgSpeed = active.length ? active.reduce((s, v) => s + v.speed, 0) / active.length : 17;
    const distance = pathLengthNm(lane.waypoints);
    // Transit = sailing time at the current average speed + a port call per stop.
    const portCallHours = Math.max(0, lane.ports.length - 1) * 18;
    const avgTransitDays = distance / Math.max(avgSpeed, 8) / 24 + portCallHours / 24;
    return {
      lane,
      vessels: onLane.length,
      active: active.length,
      delayed: delayed.length,
      inPort: inPort.length,
      avgTransitDays: Math.round(avgTransitDays * 10) / 10,
      distanceNm: Math.round(distance),
    };
  });
}

export function statusLabel(status: VesselStatus): string {
  switch (status) {
    case 'underway':
      return 'Underway';
    case 'anchored':
      return 'Anchored';
    case 'moored':
      return 'Moored';
    case 'delayed':
      return 'Delayed';
  }
}
