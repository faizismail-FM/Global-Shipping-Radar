/**
 * Geodesic helpers. All angles in degrees, distances in nautical miles unless
 * stated otherwise. Longitudes may be "unwrapped" (outside ±180) to keep
 * antimeridian-crossing paths continuous; use normalizeLongitude() before
 * presenting a value to the user.
 */

export const EARTH_RADIUS_NM = 3440.065;
export const NM_TO_KM = 1.852;

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export type LngLat = [number, number];

export function normalizeLongitude(lng: number): number {
  let l = lng;
  while (l > 180) l -= 360;
  while (l < -180) l += 360;
  return l;
}

/** Great-circle distance in nautical miles. */
export function distanceNm(a: LngLat, b: LngLat): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lng2 - lng1);
  const h = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from a to b, 0–360. */
export function bearing(a: LngLat, b: LngLat): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lng2 - lng1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Destination point given start, bearing and distance (nm). The returned
 * longitude is kept continuous with the start longitude (no wrapping).
 */
export function destination(start: LngLat, bearingDeg: number, distNm: number): LngLat {
  const [lng1, lat1] = start;
  const δ = distNm / EARTH_RADIUS_NM;
  const θ = toRad(bearingDeg);
  const φ1 = toRad(lat1);
  const λ1 = toRad(lng1);
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 =
    λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
  let lng2 = toDeg(λ2);
  // keep continuity with the origin longitude
  while (lng2 - lng1 > 180) lng2 -= 360;
  while (lng2 - lng1 < -180) lng2 += 360;
  return [lng2, toDeg(φ2)];
}

/** Point at fraction f (0..1) along the great circle from a to b. */
export function interpolate(a: LngLat, b: LngLat, f: number): LngLat {
  if (f <= 0) return a;
  if (f >= 1) return b;
  const d = distanceNm(a, b);
  if (d < 1e-6) return a;
  return destination(a, bearing(a, b), d * f);
}

/** Total length (nm) of a polyline. */
export function pathLengthNm(points: LngLat[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distanceNm(points[i - 1] as LngLat, points[i] as LngLat);
  }
  return total;
}

/** Length (nm) between two waypoint indices of a polyline. */
export function pathSegmentLengthNm(points: LngLat[], fromIndex: number, toIndex: number): number {
  const [s, e] = fromIndex <= toIndex ? [fromIndex, toIndex] : [toIndex, fromIndex];
  let total = 0;
  for (let i = s + 1; i <= e; i++) {
    total += distanceNm(points[i - 1] as LngLat, points[i] as LngLat);
  }
  return total;
}

/**
 * Densify a polyline with great-circle interpolation so long ocean legs render
 * as curved arcs instead of straight Mercator chords.
 */
export function densifyPath(points: LngLat[], maxSegmentNm = 200): LngLat[] {
  const out: LngLat[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i] as LngLat;
    if (i === 0) {
      out.push(p);
      continue;
    }
    const prev = points[i - 1] as LngLat;
    const d = distanceNm(prev, p);
    const n = Math.max(1, Math.ceil(d / maxSegmentNm));
    for (let k = 1; k <= n; k++) {
      out.push(interpolate(prev, p, k / n));
    }
  }
  return out;
}

export function formatCoordinate(lat: number, lng: number): string {
  const l = normalizeLongitude(lng);
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = l >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(3)}° ${ns}, ${Math.abs(l).toFixed(3)}° ${ew}`;
}
