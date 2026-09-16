import type { Port, Region, Congestion } from '@/types';

/**
 * Simulated port dataset. Coordinates are approximate real-world terminal
 * locations; throughput figures are illustrative demo values and are NOT live
 * port statistics.
 */

type Tier = 'mega' | 'large' | 'medium';

interface PortSeed {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  region: Region;
  locode: string;
  lat: number;
  lng: number;
  tier: Tier;
  congestion: Congestion;
}

const SEEDS: PortSeed[] = [
  // Asia
  { id: 'shanghai', name: 'Shanghai', country: 'China', countryCode: 'CN', region: 'Asia', locode: 'CNSHA', lat: 30.63, lng: 122.07, tier: 'mega', congestion: 'medium' },
  { id: 'ningbo', name: 'Ningbo-Zhoushan', country: 'China', countryCode: 'CN', region: 'Asia', locode: 'CNNGB', lat: 29.95, lng: 121.95, tier: 'mega', congestion: 'medium' },
  { id: 'shenzhen', name: 'Shenzhen', country: 'China', countryCode: 'CN', region: 'Asia', locode: 'CNSZX', lat: 22.55, lng: 114.28, tier: 'mega', congestion: 'low' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'Hong Kong SAR', countryCode: 'HK', region: 'Asia', locode: 'HKHKG', lat: 22.3, lng: 114.12, tier: 'large', congestion: 'low' },
  { id: 'qingdao', name: 'Qingdao', country: 'China', countryCode: 'CN', region: 'Asia', locode: 'CNTAO', lat: 36.02, lng: 120.35, tier: 'large', congestion: 'low' },
  { id: 'tianjin', name: 'Tianjin', country: 'China', countryCode: 'CN', region: 'Asia', locode: 'CNTSN', lat: 38.98, lng: 117.78, tier: 'large', congestion: 'medium' },
  { id: 'xiamen', name: 'Xiamen', country: 'China', countryCode: 'CN', region: 'Asia', locode: 'CNXMN', lat: 24.45, lng: 118.07, tier: 'medium', congestion: 'low' },
  { id: 'kaohsiung', name: 'Kaohsiung', country: 'Taiwan', countryCode: 'TW', region: 'Asia', locode: 'TWKHH', lat: 22.6, lng: 120.28, tier: 'large', congestion: 'low' },
  { id: 'busan', name: 'Busan', country: 'South Korea', countryCode: 'KR', region: 'Asia', locode: 'KRPUS', lat: 35.08, lng: 129.05, tier: 'mega', congestion: 'low' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', countryCode: 'JP', region: 'Asia', locode: 'JPTYO', lat: 35.6, lng: 139.79, tier: 'large', congestion: 'low' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', countryCode: 'SG', region: 'Asia', locode: 'SGSIN', lat: 1.25, lng: 103.75, tier: 'mega', congestion: 'high' },
  { id: 'port-klang', name: 'Port Klang', country: 'Malaysia', countryCode: 'MY', region: 'Asia', locode: 'MYPKG', lat: 3.0, lng: 101.36, tier: 'large', congestion: 'medium' },
  { id: 'tanjung-pelepas', name: 'Tanjung Pelepas', country: 'Malaysia', countryCode: 'MY', region: 'Asia', locode: 'MYTPP', lat: 1.36, lng: 103.55, tier: 'large', congestion: 'low' },
  { id: 'laem-chabang', name: 'Laem Chabang', country: 'Thailand', countryCode: 'TH', region: 'Asia', locode: 'THLCH', lat: 13.08, lng: 100.9, tier: 'medium', congestion: 'low' },
  { id: 'ho-chi-minh', name: 'Ho Chi Minh City (Cai Mep)', country: 'Vietnam', countryCode: 'VN', region: 'Asia', locode: 'VNVUT', lat: 10.53, lng: 107.02, tier: 'medium', congestion: 'medium' },
  { id: 'manila', name: 'Manila', country: 'Philippines', countryCode: 'PH', region: 'Asia', locode: 'PHMNL', lat: 14.58, lng: 120.95, tier: 'medium', congestion: 'medium' },
  { id: 'jakarta', name: 'Jakarta (Tanjung Priok)', country: 'Indonesia', countryCode: 'ID', region: 'Asia', locode: 'IDJKT', lat: -6.1, lng: 106.88, tier: 'medium', congestion: 'medium' },
  { id: 'colombo', name: 'Colombo', country: 'Sri Lanka', countryCode: 'LK', region: 'Asia', locode: 'LKCMB', lat: 6.95, lng: 79.85, tier: 'large', congestion: 'medium' },
  { id: 'nhava-sheva', name: 'Nhava Sheva (JNPT)', country: 'India', countryCode: 'IN', region: 'Asia', locode: 'INNSA', lat: 18.95, lng: 72.95, tier: 'large', congestion: 'medium' },
  { id: 'chittagong', name: 'Chittagong', country: 'Bangladesh', countryCode: 'BD', region: 'Asia', locode: 'BDCGP', lat: 22.3, lng: 91.8, tier: 'medium', congestion: 'high' },

  // Middle East
  { id: 'jebel-ali', name: 'Jebel Ali (Dubai)', country: 'United Arab Emirates', countryCode: 'AE', region: 'Middle East', locode: 'AEJEA', lat: 25.01, lng: 55.06, tier: 'mega', congestion: 'low' },
  { id: 'salalah', name: 'Salalah', country: 'Oman', countryCode: 'OM', region: 'Middle East', locode: 'OMSLL', lat: 16.94, lng: 54.0, tier: 'medium', congestion: 'low' },
  { id: 'jeddah', name: 'Jeddah', country: 'Saudi Arabia', countryCode: 'SA', region: 'Middle East', locode: 'SAJED', lat: 21.48, lng: 39.17, tier: 'medium', congestion: 'low' },

  // Europe
  { id: 'rotterdam', name: 'Rotterdam', country: 'Netherlands', countryCode: 'NL', region: 'Europe', locode: 'NLRTM', lat: 51.95, lng: 4.05, tier: 'mega', congestion: 'medium' },
  { id: 'antwerp', name: 'Antwerp-Bruges', country: 'Belgium', countryCode: 'BE', region: 'Europe', locode: 'BEANR', lat: 51.3, lng: 4.3, tier: 'mega', congestion: 'medium' },
  { id: 'hamburg', name: 'Hamburg', country: 'Germany', countryCode: 'DE', region: 'Europe', locode: 'DEHAM', lat: 53.53, lng: 9.97, tier: 'large', congestion: 'low' },
  { id: 'bremerhaven', name: 'Bremerhaven', country: 'Germany', countryCode: 'DE', region: 'Europe', locode: 'DEBRV', lat: 53.55, lng: 8.55, tier: 'medium', congestion: 'low' },
  { id: 'felixstowe', name: 'Felixstowe', country: 'United Kingdom', countryCode: 'GB', region: 'Europe', locode: 'GBFXT', lat: 51.95, lng: 1.32, tier: 'large', congestion: 'medium' },
  { id: 'le-havre', name: 'Le Havre', country: 'France', countryCode: 'FR', region: 'Europe', locode: 'FRLEH', lat: 49.48, lng: 0.12, tier: 'medium', congestion: 'low' },
  { id: 'valencia', name: 'Valencia', country: 'Spain', countryCode: 'ES', region: 'Europe', locode: 'ESVLC', lat: 39.45, lng: -0.32, tier: 'large', congestion: 'low' },
  { id: 'algeciras', name: 'Algeciras', country: 'Spain', countryCode: 'ES', region: 'Europe', locode: 'ESALG', lat: 36.13, lng: -5.44, tier: 'large', congestion: 'low' },
  { id: 'piraeus', name: 'Piraeus', country: 'Greece', countryCode: 'GR', region: 'Europe', locode: 'GRPIR', lat: 37.94, lng: 23.62, tier: 'large', congestion: 'low' },
  { id: 'genoa', name: 'Genoa', country: 'Italy', countryCode: 'IT', region: 'Europe', locode: 'ITGOA', lat: 44.4, lng: 8.92, tier: 'medium', congestion: 'low' },
  { id: 'gdansk', name: 'Gdańsk', country: 'Poland', countryCode: 'PL', region: 'Europe', locode: 'PLGDN', lat: 54.4, lng: 18.68, tier: 'medium', congestion: 'low' },
  // Baltic (coverage area of the live Digitraffic AIS feed)
  { id: 'helsinki', name: 'Helsinki', country: 'Finland', countryCode: 'FI', region: 'Europe', locode: 'FIHEL', lat: 60.2, lng: 25.2, tier: 'medium', congestion: 'low' },
  { id: 'kotka', name: 'Kotka', country: 'Finland', countryCode: 'FI', region: 'Europe', locode: 'FIKTK', lat: 60.45, lng: 26.94, tier: 'medium', congestion: 'low' },
  { id: 'turku', name: 'Turku', country: 'Finland', countryCode: 'FI', region: 'Europe', locode: 'FITKU', lat: 60.43, lng: 22.22, tier: 'medium', congestion: 'low' },
  { id: 'rauma', name: 'Rauma', country: 'Finland', countryCode: 'FI', region: 'Europe', locode: 'FIRAU', lat: 61.13, lng: 21.46, tier: 'medium', congestion: 'low' },
  { id: 'tallinn', name: 'Tallinn', country: 'Estonia', countryCode: 'EE', region: 'Europe', locode: 'EETLL', lat: 59.45, lng: 24.77, tier: 'medium', congestion: 'low' },
  { id: 'stockholm', name: 'Stockholm', country: 'Sweden', countryCode: 'SE', region: 'Europe', locode: 'SESTO', lat: 59.33, lng: 18.1, tier: 'medium', congestion: 'low' },
  { id: 'riga', name: 'Riga', country: 'Latvia', countryCode: 'LV', region: 'Europe', locode: 'LVRIX', lat: 57.02, lng: 24.1, tier: 'medium', congestion: 'low' },
  { id: 'klaipeda', name: 'Klaipėda', country: 'Lithuania', countryCode: 'LT', region: 'Europe', locode: 'LTKLJ', lat: 55.7, lng: 21.12, tier: 'medium', congestion: 'low' },
  { id: 'st-petersburg', name: 'St Petersburg', country: 'Russia', countryCode: 'RU', region: 'Europe', locode: 'RULED', lat: 59.9, lng: 30.2, tier: 'medium', congestion: 'medium' },

  // Africa
  { id: 'tanger-med', name: 'Tanger Med', country: 'Morocco', countryCode: 'MA', region: 'Africa', locode: 'MAPTM', lat: 35.88, lng: -5.5, tier: 'large', congestion: 'low' },
  { id: 'port-said', name: 'Port Said', country: 'Egypt', countryCode: 'EG', region: 'Africa', locode: 'EGPSD', lat: 31.26, lng: 32.32, tier: 'medium', congestion: 'medium' },
  { id: 'lagos', name: 'Lagos (Apapa)', country: 'Nigeria', countryCode: 'NG', region: 'Africa', locode: 'NGLOS', lat: 6.44, lng: 3.37, tier: 'medium', congestion: 'high' },
  { id: 'durban', name: 'Durban', country: 'South Africa', countryCode: 'ZA', region: 'Africa', locode: 'ZADUR', lat: -29.87, lng: 31.03, tier: 'medium', congestion: 'high' },
  { id: 'mombasa', name: 'Mombasa', country: 'Kenya', countryCode: 'KE', region: 'Africa', locode: 'KEMBA', lat: -4.05, lng: 39.65, tier: 'medium', congestion: 'medium' },

  // North America
  { id: 'los-angeles', name: 'Los Angeles', country: 'United States', countryCode: 'US', region: 'North America', locode: 'USLAX', lat: 33.73, lng: -118.26, tier: 'mega', congestion: 'medium' },
  { id: 'long-beach', name: 'Long Beach', country: 'United States', countryCode: 'US', region: 'North America', locode: 'USLGB', lat: 33.75, lng: -118.2, tier: 'large', congestion: 'medium' },
  { id: 'oakland', name: 'Oakland', country: 'United States', countryCode: 'US', region: 'North America', locode: 'USOAK', lat: 37.8, lng: -122.3, tier: 'medium', congestion: 'low' },
  { id: 'seattle', name: 'Seattle', country: 'United States', countryCode: 'US', region: 'North America', locode: 'USSEA', lat: 47.58, lng: -122.35, tier: 'medium', congestion: 'low' },
  { id: 'vancouver', name: 'Vancouver', country: 'Canada', countryCode: 'CA', region: 'North America', locode: 'CAVAN', lat: 49.29, lng: -123.1, tier: 'large', congestion: 'medium' },
  { id: 'new-york', name: 'New York / New Jersey', country: 'United States', countryCode: 'US', region: 'North America', locode: 'USNYC', lat: 40.66, lng: -74.07, tier: 'mega', congestion: 'medium' },
  { id: 'savannah', name: 'Savannah', country: 'United States', countryCode: 'US', region: 'North America', locode: 'USSAV', lat: 32.06, lng: -80.95, tier: 'large', congestion: 'medium' },
  { id: 'charleston', name: 'Charleston', country: 'United States', countryCode: 'US', region: 'North America', locode: 'USCHS', lat: 32.78, lng: -79.92, tier: 'medium', congestion: 'low' },
  { id: 'norfolk', name: 'Norfolk', country: 'United States', countryCode: 'US', region: 'North America', locode: 'USORF', lat: 36.93, lng: -76.33, tier: 'medium', congestion: 'low' },
  { id: 'houston', name: 'Houston', country: 'United States', countryCode: 'US', region: 'North America', locode: 'USHOU', lat: 29.73, lng: -95.02, tier: 'medium', congestion: 'low' },
  { id: 'halifax', name: 'Halifax', country: 'Canada', countryCode: 'CA', region: 'North America', locode: 'CAHAL', lat: 44.63, lng: -63.55, tier: 'medium', congestion: 'low' },
  { id: 'manzanillo', name: 'Manzanillo', country: 'Mexico', countryCode: 'MX', region: 'North America', locode: 'MXZLO', lat: 19.05, lng: -104.32, tier: 'medium', congestion: 'medium' },

  // South America
  { id: 'santos', name: 'Santos', country: 'Brazil', countryCode: 'BR', region: 'South America', locode: 'BRSSZ', lat: -23.95, lng: -46.31, tier: 'large', congestion: 'medium' },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', countryCode: 'AR', region: 'South America', locode: 'ARBUE', lat: -34.6, lng: -58.37, tier: 'medium', congestion: 'low' },
  { id: 'cartagena', name: 'Cartagena', country: 'Colombia', countryCode: 'CO', region: 'South America', locode: 'COCTG', lat: 10.4, lng: -75.55, tier: 'medium', congestion: 'low' },
  { id: 'callao', name: 'Callao', country: 'Peru', countryCode: 'PE', region: 'South America', locode: 'PECLL', lat: -12.05, lng: -77.15, tier: 'medium', congestion: 'low' },

  // Oceania
  { id: 'melbourne', name: 'Melbourne', country: 'Australia', countryCode: 'AU', region: 'Oceania', locode: 'AUMEL', lat: -37.83, lng: 144.93, tier: 'medium', congestion: 'low' },
  { id: 'sydney', name: 'Sydney (Port Botany)', country: 'Australia', countryCode: 'AU', region: 'Oceania', locode: 'AUSYD', lat: -33.97, lng: 151.22, tier: 'medium', congestion: 'low' },
  { id: 'brisbane', name: 'Brisbane', country: 'Australia', countryCode: 'AU', region: 'Oceania', locode: 'AUBNE', lat: -27.38, lng: 153.17, tier: 'medium', congestion: 'low' },
  { id: 'fremantle', name: 'Fremantle', country: 'Australia', countryCode: 'AU', region: 'Oceania', locode: 'AUFRE', lat: -32.05, lng: 115.74, tier: 'medium', congestion: 'low' },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', countryCode: 'NZ', region: 'Oceania', locode: 'NZAKL', lat: -36.84, lng: 174.77, tier: 'medium', congestion: 'low' },
];

const TIER_BASE: Record<Tier, { inPort: number; anchored: number; arrivals: number; departures: number }> = {
  mega: { inPort: 380, anchored: 90, arrivals: 280, departures: 265 },
  large: { inPort: 160, anchored: 42, arrivals: 120, departures: 112 },
  medium: { inPort: 64, anchored: 16, arrivals: 48, departures: 45 },
};

const CONGESTION_WAIT: Record<Congestion, [number, number]> = {
  low: [2.5, 7],
  medium: [7, 14],
  high: [16, 36],
};

/** Simple deterministic hash so each port gets stable but varied figures. */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export const PORTS: Port[] = SEEDS.map((s) => {
  const base = TIER_BASE[s.tier];
  const v = hash(s.id);
  const w = hash(s.id + ':wait');
  const congestionFactor = s.congestion === 'high' ? 1.25 : s.congestion === 'medium' ? 1.05 : 0.9;
  const [wMin, wMax] = CONGESTION_WAIT[s.congestion];
  return {
    id: s.id,
    name: s.name,
    country: s.country,
    countryCode: s.countryCode,
    region: s.region,
    locode: s.locode,
    latitude: s.lat,
    longitude: s.lng,
    vesselsInPort: Math.round(base.inPort * (0.85 + v * 0.3) * congestionFactor),
    vesselsAnchored: Math.round(base.anchored * (0.7 + v * 0.6) * congestionFactor),
    arrivalsToday: Math.round(base.arrivals * (0.85 + hash(s.id + ':a') * 0.3)),
    departuresToday: Math.round(base.departures * (0.85 + hash(s.id + ':d') * 0.3)),
    congestion: s.congestion,
    averageWaitingHours: Math.round((wMin + w * (wMax - wMin)) * 10) / 10,
  };
});

export const PORT_BY_ID: ReadonlyMap<string, Port> = new Map(PORTS.map((p) => [p.id, p]));
export const PORT_BY_NAME: ReadonlyMap<string, Port> = new Map(PORTS.map((p) => [p.name.toLowerCase(), p]));

export function findPortByName(name: string): Port | undefined {
  const key = name.trim().toLowerCase();
  const direct = PORT_BY_NAME.get(key);
  if (direct) return direct;
  return PORTS.find((p) => p.name.toLowerCase().startsWith(key) || p.id === key);
}
