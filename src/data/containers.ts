import type { Container, ContainerMilestone, ContainerStatus } from '@/types';
import { containerCheckDigit } from '@/lib/identifiers';

/**
 * DEMO container tracking records. These are entirely simulated and do not
 * correspond to any real shipment. Vessel names match vessels in the simulated
 * fleet so the UI can cross-link containers and vessels.
 */

interface ContainerSeed {
  prefix10: string;
  sizeType: string;
  carrier: string;
  vesselName: string;
  voyage: string;
  route: string[];
  /** Index into `route` of the current milestone. */
  currentIndex: number;
  /** Free-text current location, e.g. "Singapore Strait". */
  currentLocation: string;
  status: ContainerStatus;
  /** Hours from now until ETA (negative = already arrived). */
  etaHours: number;
  /** Hours since the shipment departed the port of loading. */
  elapsedHours: number;
}

const SEEDS: ContainerSeed[] = [
  { prefix10: 'MSBU547116', sizeType: '40HC', carrier: 'MSC', vesselName: 'EVER ACE', voyage: '123E', route: ['Port Klang', 'Singapore', 'Colombo', 'Rotterdam'], currentIndex: 1, currentLocation: 'Singapore Strait', status: 'In Transit', etaHours: 12 * 24 + 6, elapsedHours: 52 },
  { prefix10: 'MSCU736481', sizeType: '40HC', carrier: 'MSC', vesselName: 'MSC IRINA', voyage: '241W', route: ['Shanghai', 'Port Klang', 'Colombo', 'Felixstowe', 'Hamburg'], currentIndex: 1, currentLocation: 'Malacca Strait', status: 'In Transit', etaHours: 21 * 24, elapsedHours: 190 },
  { prefix10: 'MEDU837592', sizeType: '20GP', carrier: 'MSC', vesselName: 'MSC LORETO', voyage: '218W', route: ['Ningbo-Zhoushan', 'Singapore', 'Piraeus', 'Antwerp-Bruges'], currentIndex: 2, currentLocation: 'Piraeus', status: 'Transshipment', etaHours: 9 * 24, elapsedHours: 402 },
  { prefix10: 'EGHU948372', sizeType: '40HC', carrier: 'Evergreen', vesselName: 'EVER GIVEN', voyage: '087E', route: ['Kaohsiung', 'Shenzhen', 'Singapore', 'Rotterdam'], currentIndex: 3, currentLocation: 'Rotterdam', status: 'Discharged', etaHours: -30, elapsedHours: 720 },
  { prefix10: 'EMCU159283', sizeType: '40RF', carrier: 'Evergreen', vesselName: 'EVER GLORY', voyage: '112W', route: ['Shanghai', 'Busan', 'Los Angeles'], currentIndex: 1, currentLocation: 'North Pacific', status: 'In Transit', etaHours: 8 * 24 + 14, elapsedHours: 96 },
  { prefix10: 'CMAU725938', sizeType: '40HC', carrier: 'CMA CGM', vesselName: 'CMA CGM MARCO POLO', voyage: '305W', route: ['Le Havre', 'New York / New Jersey', 'Savannah'], currentIndex: 0, currentLocation: 'North Atlantic', status: 'In Transit', etaHours: 5 * 24 + 3, elapsedHours: 118 },
  { prefix10: 'CGMU519483', sizeType: '20GP', carrier: 'CMA CGM', vesselName: 'CMA CGM JACQUES SAADE', voyage: '062E', route: ['Rotterdam', 'Algeciras', 'Jebel Ali (Dubai)', 'Singapore'], currentIndex: 1, currentLocation: 'Algeciras', status: 'Transshipment', etaHours: 19 * 24, elapsedHours: 140 },
  { prefix10: 'OOLU826174', sizeType: '40HC', carrier: 'OOCL', vesselName: 'OOCL SPAIN', voyage: '154W', route: ['Port Klang', 'Colombo', 'Port Said', 'Antwerp-Bruges'], currentIndex: 0, currentLocation: 'Indian Ocean', status: 'In Transit', etaHours: 17 * 24 + 8, elapsedHours: 61 },
  { prefix10: 'OOCU673819', sizeType: '45HC', carrier: 'OOCL', vesselName: 'OOCL HONG KONG', voyage: '077E', route: ['Hong Kong', 'Singapore', 'Melbourne', 'Sydney (Port Botany)'], currentIndex: 2, currentLocation: 'Melbourne', status: 'Discharged', etaHours: -6, elapsedHours: 480 },
  { prefix10: 'ONEU293847', sizeType: '40HC', carrier: 'ONE', vesselName: 'ONE INNOVATION', voyage: '019W', route: ['Colombo', 'Port Said', 'Rotterdam'], currentIndex: 0, currentLocation: 'Red Sea', status: 'In Transit', etaHours: 11 * 24, elapsedHours: 130 },
  { prefix10: 'NYKU958721', sizeType: '20GP', carrier: 'ONE', vesselName: 'ONE APUS', voyage: '044E', route: ['Tokyo', 'Los Angeles', 'Oakland'], currentIndex: 0, currentLocation: 'Tokyo', status: 'Loaded', etaHours: 15 * 24, elapsedHours: 4 },
  { prefix10: 'MAEU629384', sizeType: '40HC', carrier: 'Maersk', vesselName: 'MAERSK SENTOSA', voyage: '136E', route: ['Busan', 'Tokyo', 'Los Angeles', 'Oakland'], currentIndex: 1, currentLocation: 'North Pacific', status: 'In Transit', etaHours: 6 * 24 + 10, elapsedHours: 200 },
  { prefix10: 'MRKU487129', sizeType: '40RF', carrier: 'Maersk', vesselName: 'MAERSK ESSEN', voyage: '228W', route: ['Santos', 'Algeciras', 'Rotterdam'], currentIndex: 1, currentLocation: 'Algeciras', status: 'Transshipment', etaHours: 4 * 24, elapsedHours: 300 },
  { prefix10: 'HLXU817263', sizeType: '40HC', carrier: 'Hapag-Lloyd', vesselName: 'BERLIN EXPRESS', voyage: '091E', route: ['Hamburg', 'Rotterdam', 'Singapore', 'Shanghai'], currentIndex: 2, currentLocation: 'South China Sea', status: 'In Transit', etaHours: 3 * 24 + 9, elapsedHours: 640 },
  { prefix10: 'HLBU293184', sizeType: '20GP', carrier: 'Hapag-Lloyd', vesselName: 'COLOMBO EXPRESS', voyage: '187W', route: ['Nhava Sheva (JNPT)', 'Salalah', 'Jebel Ali (Dubai)'], currentIndex: 2, currentLocation: 'Jebel Ali (Dubai)', status: 'Gate Out', etaHours: -52, elapsedHours: 260 },
  { prefix10: 'HMMU903281', sizeType: '40HC', carrier: 'HMM', vesselName: 'HMM ALGECIRAS', voyage: '012E', route: ['Rotterdam', 'Algeciras', 'Singapore', 'Shanghai'], currentIndex: 0, currentLocation: 'Rotterdam', status: 'Loaded', etaHours: 33 * 24, elapsedHours: 9 },
  { prefix10: 'YMLU882736', sizeType: '40HC', carrier: 'Yang Ming', vesselName: 'YM WELCOME', voyage: '073W', route: ['Kaohsiung', 'Manila', 'Ho Chi Minh City (Cai Mep)', 'Laem Chabang'], currentIndex: 1, currentLocation: 'Manila', status: 'Transshipment', etaHours: 6 * 24, elapsedHours: 70 },
  { prefix10: 'WHLU518273', sizeType: '20GP', carrier: 'Wan Hai', vesselName: 'WAN HAI 505', voyage: '301N', route: ['Tianjin', 'Qingdao', 'Busan'], currentIndex: 0, currentLocation: 'Bohai Sea', status: 'In Transit', etaHours: 2 * 24 + 5, elapsedHours: 18 },
  { prefix10: 'ZIMU304817', sizeType: '40HC', carrier: 'ZIM', vesselName: 'ZIM SAMMY OFER', voyage: '058W', route: ['Busan', 'Manzanillo', 'Cartagena', 'Savannah', 'New York / New Jersey'], currentIndex: 2, currentLocation: 'Caribbean Sea', status: 'In Transit', etaHours: 4 * 24 + 16, elapsedHours: 560 },
  { prefix10: 'PCIU918273', sizeType: '40HC', carrier: 'PIL', vesselName: 'KOTA LEMBAH', voyage: '224E', route: ['Singapore', 'Fremantle', 'Melbourne'], currentIndex: 1, currentLocation: 'Fremantle', status: 'Transshipment', etaHours: 7 * 24, elapsedHours: 170 },
  { prefix10: 'CSNU728491', sizeType: '40HC', carrier: 'COSCO', vesselName: 'COSCO SHIPPING UNIVERSE', voyage: '116W', route: ['Ningbo-Zhoushan', 'Shenzhen', 'Singapore'], currentIndex: 0, currentLocation: 'Taiwan Strait', status: 'In Transit', etaHours: 2 * 24 + 8, elapsedHours: 30 },
  { prefix10: 'CCLU839471', sizeType: '20GP', carrier: 'COSCO', vesselName: 'COSCO SHIPPING GALAXY', voyage: '098E', route: ['Valencia', 'Tanger Med', 'Lagos (Apapa)', 'Durban'], currentIndex: 2, currentLocation: 'Lagos (Apapa)', status: 'Transshipment', etaHours: 12 * 24, elapsedHours: 380 },
  { prefix10: 'TCLU583729', sizeType: '40HC', carrier: 'Maersk', vesselName: 'MAERSK HALIFAX', voyage: '176W', route: ['Antwerp-Bruges', 'Felixstowe', 'Halifax', 'New York / New Jersey'], currentIndex: 3, currentLocation: 'New York / New Jersey', status: 'Delivered', etaHours: -120, elapsedHours: 600 },
  { prefix10: 'TGHU672531', sizeType: '40RF', carrier: 'CMA CGM', vesselName: 'CMA CGM KERGUELEN', voyage: '211W', route: ['Rotterdam', 'Antwerp-Bruges', 'Santos', 'Buenos Aires'], currentIndex: 0, currentLocation: 'Rotterdam', status: 'Gate In', etaHours: 20 * 24, elapsedHours: 0 },
];

const STATUS_EVENT: Record<number, string> = {};
void STATUS_EVENT;

function buildMilestones(seed: ContainerSeed, now: number): ContainerMilestone[] {
  const total = seed.route.length;
  const start = now - seed.elapsedHours * 3_600_000;
  const eta = now + seed.etaHours * 3_600_000;
  const span = Math.max(1, eta - start);
  const milestones: ContainerMilestone[] = [];

  const isFinished = seed.status === 'Discharged' || seed.status === 'Gate Out' || seed.status === 'Delivered';
  const isTransshipping = seed.status === 'Transshipment';

  for (let i = 0; i < total; i++) {
    const location = seed.route[i] as string;
    const isFirst = i === 0;
    const isLast = i === total - 1;
    const plannedAt = start + (span * i) / Math.max(1, total - 1);

    let event: string;
    if (isFirst) event = 'Loaded';
    else if (isLast) event = 'Destination';
    else event = 'Transshipment';

    let state: ContainerMilestone['state'];
    if (i < seed.currentIndex) state = 'completed';
    else if (i === seed.currentIndex) state = isFinished ? 'completed' : 'current';
    else state = 'upcoming';

    if (i === seed.currentIndex) {
      if (isFinished) event = seed.status;
      else if (isTransshipping) event = 'Transshipment';
      else if (seed.status === 'Loaded' || seed.status === 'Gate In') event = seed.status;
    }
    if (isLast && isFinished) event = seed.status;

    const milestone: ContainerMilestone = { location, event, state };
    if (state !== 'upcoming') milestone.timestamp = new Date(Math.min(plannedAt, now)).toISOString();
    milestones.push(milestone);
  }

  // Insert an "In Transit" waypoint between the current port and the next one
  // when the box is at sea.
  if (seed.status === 'In Transit' && seed.currentIndex < total - 1) {
    const current = milestones[seed.currentIndex] as ContainerMilestone;
    current.state = 'completed';
    if (seed.currentIndex === 0) current.event = 'Loaded';
    else current.event = 'Transshipment';
    milestones.splice(seed.currentIndex + 1, 0, {
      location: seed.currentLocation,
      event: 'In Transit',
      state: 'current',
      timestamp: new Date(now - 45 * 60_000).toISOString(),
    });
  }

  return milestones;
}

export function buildContainers(now = Date.now()): Container[] {
  return SEEDS.map((seed, i) => {
    const containerNumber = `${seed.prefix10}${containerCheckDigit(seed.prefix10)}`;
    return {
      containerNumber,
      sizeType: seed.sizeType,
      status: seed.status,
      vesselName: seed.vesselName,
      voyage: seed.voyage,
      portOfLoading: seed.route[0] as string,
      portOfDischarge: seed.route[seed.route.length - 1] as string,
      currentLocation: seed.currentLocation,
      estimatedArrival: new Date(now + seed.etaHours * 3_600_000).toISOString(),
      route: seed.route,
      milestones: buildMilestones(seed, now),
      billOfLading: `${seed.carrier.replace(/[^A-Z]/gi, '').slice(0, 4).toUpperCase()}${String(48210937 + i * 7331)}`,
      carrier: seed.carrier,
      demo: true,
    };
  });
}

export const CONTAINERS: Container[] = buildContainers();
export const CONTAINER_BY_NUMBER: ReadonlyMap<string, Container> = new Map(
  CONTAINERS.map((c) => [c.containerNumber, c]),
);
