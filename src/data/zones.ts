/**
 * Named maritime areas used for activity events, "high traffic" alerts and
 * location search. Radius is in nautical miles.
 */
export interface MaritimeZone {
  id: string;
  name: string;
  kind: 'strait' | 'canal' | 'passage' | 'sea';
  longitude: number;
  latitude: number;
  radiusNm: number;
  zoom: number;
}

export const ZONES: MaritimeZone[] = [
  { id: 'singapore-strait', name: 'Singapore Strait', kind: 'strait', longitude: 103.9, latitude: 1.2, radiusNm: 35, zoom: 8 },
  { id: 'malacca-strait', name: 'Malacca Strait', kind: 'strait', longitude: 100.2, latitude: 4.0, radiusNm: 110, zoom: 6 },
  { id: 'suez-canal', name: 'Suez Canal', kind: 'canal', longitude: 32.4, latitude: 30.6, radiusNm: 55, zoom: 7 },
  { id: 'bab-el-mandeb', name: 'Bab-el-Mandeb', kind: 'strait', longitude: 43.4, latitude: 12.6, radiusNm: 60, zoom: 7 },
  { id: 'hormuz', name: 'Strait of Hormuz', kind: 'strait', longitude: 56.5, latitude: 26.4, radiusNm: 50, zoom: 7 },
  { id: 'gibraltar', name: 'Strait of Gibraltar', kind: 'strait', longitude: -5.6, latitude: 35.95, radiusNm: 40, zoom: 8 },
  { id: 'english-channel', name: 'English Channel', kind: 'passage', longitude: -1.0, latitude: 50.0, radiusNm: 110, zoom: 6 },
  { id: 'dover-strait', name: 'Dover Strait', kind: 'strait', longitude: 1.45, latitude: 51.0, radiusNm: 30, zoom: 8 },
  { id: 'panama-canal', name: 'Panama Canal', kind: 'canal', longitude: -79.7, latitude: 9.1, radiusNm: 45, zoom: 8 },
  { id: 'taiwan-strait', name: 'Taiwan Strait', kind: 'strait', longitude: 119.6, latitude: 24.5, radiusNm: 110, zoom: 6 },
  { id: 'korea-strait', name: 'Korea Strait', kind: 'strait', longitude: 129.4, latitude: 34.3, radiusNm: 60, zoom: 7 },
  { id: 'cape-of-good-hope', name: 'Cape of Good Hope', kind: 'passage', longitude: 18.8, latitude: -35.2, radiusNm: 90, zoom: 6 },
  { id: 'lombok-strait', name: 'Lombok Strait', kind: 'strait', longitude: 115.7, latitude: -8.6, radiusNm: 45, zoom: 7 },
  { id: 'bass-strait', name: 'Bass Strait', kind: 'strait', longitude: 145.5, latitude: -39.5, radiusNm: 100, zoom: 6 },
  { id: 'windward-passage', name: 'Windward Passage', kind: 'passage', longitude: -73.8, latitude: 20.0, radiusNm: 45, zoom: 7 },
  { id: 'tokara-strait', name: 'Tokara Strait', kind: 'strait', longitude: 130.1, latitude: 30.2, radiusNm: 45, zoom: 7 },
  { id: 'bay-of-biscay', name: 'Bay of Biscay', kind: 'sea', longitude: -6.0, latitude: 46.0, radiusNm: 160, zoom: 5.5 },
  { id: 'south-china-sea', name: 'South China Sea', kind: 'sea', longitude: 112.0, latitude: 14.0, radiusNm: 420, zoom: 4.5 },
  { id: 'arabian-sea', name: 'Arabian Sea', kind: 'sea', longitude: 64.0, latitude: 14.0, radiusNm: 420, zoom: 4.5 },
  { id: 'north-atlantic', name: 'North Atlantic', kind: 'sea', longitude: -35.0, latitude: 46.0, radiusNm: 600, zoom: 4 },
  { id: 'north-pacific', name: 'North Pacific', kind: 'sea', longitude: -175.0, latitude: 44.0, radiusNm: 800, zoom: 3.5 },
  // Baltic (live AIS coverage)
  { id: 'gulf-of-finland', name: 'Gulf of Finland', kind: 'passage', longitude: 25.5, latitude: 59.85, radiusNm: 70, zoom: 6.5 },
  { id: 'aland-sea', name: 'Åland Sea', kind: 'passage', longitude: 19.3, latitude: 60.0, radiusNm: 40, zoom: 7 },
  { id: 'gulf-of-riga', name: 'Gulf of Riga', kind: 'sea', longitude: 23.5, latitude: 57.7, radiusNm: 60, zoom: 6.5 },
  { id: 'oresund', name: 'Øresund', kind: 'strait', longitude: 12.7, latitude: 55.75, radiusNm: 30, zoom: 8 },
];

export const ZONE_BY_ID: ReadonlyMap<string, MaritimeZone> = new Map(ZONES.map((z) => [z.id, z]));
