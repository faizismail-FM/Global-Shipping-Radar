export type Congestion = 'low' | 'medium' | 'high';

export type Region =
  | 'Asia'
  | 'Europe'
  | 'North America'
  | 'South America'
  | 'Africa'
  | 'Middle East'
  | 'Oceania';

export interface Port {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  region: Region;
  /** UN/LOCODE, e.g. "SGSIN". */
  locode: string;

  latitude: number;
  longitude: number;

  vesselsInPort: number;
  vesselsAnchored: number;

  arrivalsToday: number;
  departuresToday: number;

  congestion: Congestion;

  averageWaitingHours: number;
}
