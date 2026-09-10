import type { Region } from '@/types';
import { normalizeLongitude } from '@/lib/geo';

export const REGIONS: Region[] = ['Asia', 'Europe', 'North America', 'South America', 'Africa', 'Middle East', 'Oceania'];

/** Rough view extents for each region, [west, south, east, north]. */
export const REGION_BOUNDS: Record<Region, [number, number, number, number]> = {
  Asia: [60, -12, 150, 55],
  Europe: [-25, 34, 45, 70],
  'North America': [-170, 8, -50, 70],
  'South America': [-95, -58, -30, 14],
  Africa: [-25, -40, 55, 38],
  'Middle East': [30, 10, 65, 42],
  Oceania: [105, -50, 180, -8],
};

/**
 * Heuristic classification of a sea position into a region for filtering.
 * Open-ocean positions are attributed to the nearest continental region.
 */
export function regionForPosition(lng: number, lat: number): Region {
  const l = normalizeLongitude(lng);
  // Middle East: Red Sea, Gulf of Aden, Arabian Peninsula, Persian Gulf
  if (lat >= 10 && lat <= 32 && l >= 32 && l <= 63) return 'Middle East';
  if (lat >= 32 && lat <= 42 && l >= 34 && l <= 63) return 'Middle East';
  // Africa: south of the Mediterranean, Atlantic & Indian Ocean coasts
  if (lat < 35.7 && lat > -42 && l >= -26 && l <= 52) return 'Africa';
  // South America
  if (lat < 12 && lat > -60 && l >= -100 && l < -26) return 'South America';
  // North America (incl. Caribbean, Central America)
  if (lat >= 12 && l >= -170 && l < -45) return 'North America';
  if (lat >= 0 && l < -140) return 'North America';
  if (lat >= 0 && l >= 175) return 'North America';
  // Europe
  if (lat >= 34 && l >= -45 && l <= 45) return 'Europe';
  // Oceania
  if (lat < -9 && l >= 100) return 'Oceania';
  if (lat < 0 && l >= 150) return 'Oceania';
  if (lat < 0 && l < -140) return 'Oceania';
  // Asia (default for the Indo-Pacific)
  return 'Asia';
}
