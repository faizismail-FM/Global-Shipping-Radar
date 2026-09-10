import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
import type { Port, ShippingLane, Vessel } from '@/types';
import { densifyPath, type LngLat } from '@/lib/geo';
import { formatDateShort } from '@/lib/formatting';

export interface VesselProps {
  id: string;
  name: string;
  heading: number;
  status: Vessel['status'];
  icon: string;
  speed: number;
  destination: string;
  eta: string;
}

export function vesselsToGeoJSON(
  vessels: Vessel[],
  positions?: Map<string, LngLat>,
): FeatureCollection<Point, VesselProps> {
  return {
    type: 'FeatureCollection',
    features: vessels.map((v) => {
      const p = positions?.get(v.id);
      return {
        type: 'Feature',
        id: v.id,
        properties: {
          id: v.id,
          name: v.name,
          heading: v.heading,
          status: v.status,
          icon: `vessel-${v.status}`,
          speed: v.speed,
          destination: v.destination,
          eta: formatDateShort(v.eta),
        },
        geometry: { type: 'Point', coordinates: p ? [p[0], p[1]] : [v.longitude, v.latitude] },
      };
    }),
  };
}

export interface PortProps {
  id: string;
  name: string;
  congestion: Port['congestion'];
  rank: number;
}

export function portsToGeoJSON(ports: Port[]): FeatureCollection<Point, PortProps> {
  return {
    type: 'FeatureCollection',
    features: ports.map((p) => ({
      type: 'Feature',
      id: p.id,
      properties: {
        id: p.id,
        name: p.name,
        congestion: p.congestion,
        rank: p.vesselsInPort >= 300 ? 3 : p.vesselsInPort >= 120 ? 2 : 1,
      },
      geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
    })),
  };
}

export interface LaneProps {
  id: string;
  name: string;
}

export function lanesToGeoJSON(lanes: ShippingLane[]): FeatureCollection<LineString, LaneProps> {
  return {
    type: 'FeatureCollection',
    features: lanes.map((lane) => ({
      type: 'Feature',
      id: lane.id,
      properties: { id: lane.id, name: lane.name },
      geometry: { type: 'LineString', coordinates: densifyPath(lane.waypoints, 150) },
    })),
  };
}

export function lineFeature(points: LngLat[], props: Record<string, unknown> = {}): FeatureCollection<LineString> {
  if (points.length < 2) return { type: 'FeatureCollection', features: [] };
  const feature: Feature<LineString> = {
    type: 'Feature',
    properties: props,
    geometry: { type: 'LineString', coordinates: densifyPath(points, 120) },
  };
  return { type: 'FeatureCollection', features: [feature] };
}

export const EMPTY_FC: FeatureCollection = { type: 'FeatureCollection', features: [] };
