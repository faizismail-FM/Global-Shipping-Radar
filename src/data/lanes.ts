import type { ShippingLane, Region } from '@/types';
import { PORT_BY_ID } from './ports';

/**
 * Simulated major shipping lanes. Each lane is a polyline of [lng, lat]
 * waypoints routed through real sea corridors (Malacca, Suez, Gibraltar,
 * Panama, …). A string entry references a port id and is expanded to that
 * port's coordinates; the lane keeps track of which waypoint indices are ports.
 *
 * Longitudes east of the antimeridian are kept > 180 so transpacific lanes stay
 * continuous for rendering and for the movement simulation.
 */

type Node = string | [number, number];

interface LaneSeed {
  id: string;
  name: string;
  from: Region;
  to: Region;
  typicalTransitDays: number;
  annualTEUMillions: number;
  nodes: Node[];
}

const SEEDS: LaneSeed[] = [
  {
    id: 'asia-europe',
    name: 'Asia → Europe',
    from: 'Asia',
    to: 'Europe',
    typicalTransitDays: 32,
    annualTEUMillions: 24.5,
    nodes: [
      'shanghai', [122.6, 30.4], 'ningbo', [122.4, 28.6], [121.0, 26.0], [119.4, 24.2], [118.0, 22.6],
      'shenzhen', [114.5, 22.2], [113.8, 21.4], [112.0, 17.5], [110.5, 12.0], [108.0, 8.0], [105.5, 4.5],
      [104.7, 1.7], [104.2, 1.3], 'singapore', [103.45, 1.1], [102.5, 1.85], [101.6, 2.6], 'port-klang',
      [100.6, 3.6], [100.0, 4.2], [99.0, 5.3], [96.5, 6.3], [94.5, 6.2], [86.0, 6.0], [80.6, 5.6],
      [79.6, 6.7], 'colombo', [79.4, 7.4], [72.0, 8.8], [60.0, 12.2], [54.0, 13.6], [51.5, 13.3],
      [47.0, 12.8], [44.0, 12.5], [43.33, 12.55], [42.6, 13.6], [41.3, 16.0], [38.7, 20.0], [36.2, 24.0],
      [34.6, 26.8], [33.7, 27.9], [33.2, 28.8], [32.6, 29.6], [32.55, 29.95], [32.3, 30.5], [32.32, 31.0],
      'port-said', [32.3, 31.6], [30.0, 32.5], [25.0, 34.2], [23.9, 36.8], 'piraeus', [23.4, 37.4],
      [22.0, 36.4], [19.0, 35.6], [14.5, 35.5], [12.5, 36.4], [10.5, 37.7], [9.5, 38.0], [5.0, 37.8],
      [0.0, 36.5], [-3.0, 36.0], [-5.3, 36.0], 'algeciras', [-5.6, 35.95], [-6.5, 35.9], [-9.8, 36.8],
      [-10.5, 40.0], [-10.5, 43.5], [-7.0, 46.8], [-6.0, 48.3], [-4.0, 49.2], [-1.5, 50.0], [1.45, 51.0],
      [2.0, 51.6], 'felixstowe', [2.6, 51.85], 'rotterdam', [3.3, 51.5], 'antwerp', [3.2, 51.6],
      [4.0, 52.6], [4.6, 53.6], [8.0, 54.1], [8.7, 53.9], 'hamburg',
    ],
  },
  {
    id: 'transpacific-west',
    name: 'Asia → North America (West Coast)',
    from: 'Asia',
    to: 'North America',
    typicalTransitDays: 16,
    annualTEUMillions: 20.1,
    nodes: [
      'shenzhen', [114.6, 21.8], [118.0, 22.6], [119.4, 24.2], [121.0, 26.0], [122.4, 28.6], [122.6, 30.4],
      'shanghai', [123.5, 31.2], [125.5, 33.0], [127.3, 33.0], [128.8, 34.5], 'busan', [129.9, 34.6],
      [129.2, 33.6], [128.3, 32.4], [129.0, 31.0], [130.1, 30.2], [132.0, 31.2], [134.5, 32.8], [135.8, 33.2],
      [138.3, 34.3], [139.15, 34.55], [139.72, 35.05], 'tokyo', [139.75, 35.1], [139.8, 34.7], [141.0, 34.8],
      [145.0, 37.0], [155.0, 41.0], [165.0, 45.0], [175.0, 47.5], [185.0, 49.0], [195.0, 49.5], [205.0, 48.0],
      [215.0, 44.0], [225.0, 38.0], [233.0, 34.5], [238.5, 33.7], 'los-angeles', 'long-beach', [241.4, 33.4],
      [239.0, 34.2], [237.5, 36.5], [237.3, 37.7], 'oakland',
    ],
  },
  {
    id: 'transpacific-east',
    name: 'Asia → North America (East Coast)',
    from: 'Asia',
    to: 'North America',
    typicalTransitDays: 30,
    annualTEUMillions: 8.4,
    nodes: [
      'shanghai', [123.5, 31.2], [125.5, 33.0], [127.3, 33.0], [128.8, 34.5], 'busan', [129.9, 34.6],
      [129.2, 33.6], [128.3, 32.4], [129.0, 31.0], [130.1, 30.2], [132.0, 31.2], [140.0, 32.0], [150.0, 36.0],
      [165.0, 40.0], [180.0, 40.0], [200.0, 35.0], [220.0, 27.0], [240.0, 19.5], [250.0, 16.5], [255.4, 18.8],
      'manzanillo', [255.6, 18.6], [260.0, 15.0], [270.0, 10.0], [275.0, 7.5], [280.4, 8.5], [280.45, 8.95],
      [280.35, 9.1], [280.1, 9.35], [280.08, 9.6], [282.0, 10.5], 'cartagena', [284.5, 12.5], [285.5, 17.0],
      [286.25, 20.0], [287.4, 21.0], [288.0, 22.5], [288.5, 24.5], [286.0, 28.0], [281.5, 31.0], 'savannah',
      [280.5, 32.5], 'charleston', [281.0, 33.5], [285.0, 35.2], [286.5, 38.5], [286.05, 40.5], 'new-york',
    ],
  },
  {
    id: 'transatlantic',
    name: 'Europe → North America',
    from: 'Europe',
    to: 'North America',
    typicalTransitDays: 12,
    annualTEUMillions: 8.0,
    nodes: [
      'antwerp', [3.3, 51.5], 'rotterdam', [2.6, 51.85], 'felixstowe', [1.6, 51.4], [1.45, 51.0], [0.0, 49.7],
      'le-havre', [-1.5, 49.9], [-4.0, 49.3], [-6.5, 48.6], [-12.0, 48.5], [-25.0, 48.0], [-40.0, 46.0],
      [-52.0, 44.5], [-58.0, 44.2], [-62.5, 44.1], 'halifax', [-64.0, 43.8], [-67.0, 42.0], [-69.0, 40.8],
      [-72.0, 40.4], [-73.9, 40.5], 'new-york', [-73.9, 40.45], [-75.0, 37.5], [-75.9, 36.95], 'norfolk',
      [-75.6, 36.5], [-75.2, 35.1], [-79.0, 32.6], 'savannah',
    ],
  },
  {
    id: 'middle-east-asia',
    name: 'Middle East → Asia',
    from: 'Middle East',
    to: 'Asia',
    typicalTransitDays: 14,
    annualTEUMillions: 6.2,
    nodes: [
      'jebel-ali', [55.5, 25.4], [56.3, 26.1], [56.6, 26.6], [57.3, 25.8], [59.0, 24.0], [60.3, 22.3],
      [59.0, 20.0], [57.5, 18.5], [55.0, 17.0], 'salalah', [54.5, 16.3], [60.0, 16.0], [68.0, 18.0],
      [72.6, 18.8], 'nhava-sheva', [72.6, 18.5], [73.0, 15.0], [75.5, 10.0], [77.0, 7.5], [79.6, 6.8],
      'colombo', [79.7, 6.5], [80.6, 5.6], [86.0, 6.0], [94.5, 6.2], [96.5, 6.3], [99.0, 5.3], [100.0, 4.2],
      [100.6, 3.6], 'port-klang', [101.6, 2.6], [102.5, 1.85], [103.45, 1.1], 'singapore',
    ],
  },
  {
    id: 'asia-oceania',
    name: 'Asia → Australia',
    from: 'Asia',
    to: 'Oceania',
    typicalTransitDays: 22,
    annualTEUMillions: 3.1,
    nodes: [
      'shanghai', [122.6, 30.4], [122.4, 28.6], [121.0, 26.0], [119.4, 24.2], [118.0, 22.6], 'shenzhen',
      [114.5, 22.2], [113.8, 21.4], [112.0, 17.5], [110.5, 12.0], [108.0, 8.0], [105.5, 4.5], [104.7, 1.7],
      [104.2, 1.3], 'singapore', [104.2, 1.15], [105.5, 0.0], [106.5, -2.0], [107.2, -4.0], [110.0, -5.0],
      [114.0, -5.0], [115.7, -7.9], [115.7, -8.7], [114.5, -12.0], [112.5, -18.0], [112.0, -24.0],
      [114.3, -29.5], [115.4, -31.8], 'fremantle', [115.3, -32.5], [114.7, -34.8], [118.0, -36.0],
      [130.0, -35.5], [138.5, -37.5], [142.5, -39.2], [143.7, -39.2], [144.6, -38.5], [144.9, -38.05],
      'melbourne', [144.7, -38.4], [146.5, -39.4], [149.0, -38.2], [150.6, -36.0], [151.4, -34.0], 'sydney',
      [151.5, -33.7], [153.5, -30.5], [153.9, -28.0], [153.5, -27.2], 'brisbane',
    ],
  },
  {
    id: 'europe-south-america',
    name: 'Europe → South America',
    from: 'Europe',
    to: 'South America',
    typicalTransitDays: 18,
    annualTEUMillions: 2.4,
    nodes: [
      'rotterdam', [3.3, 51.5], 'antwerp', [3.0, 51.6], [2.4, 51.4], [1.45, 51.0], [-1.5, 49.9], [-4.0, 49.2],
      [-6.0, 48.3], [-7.0, 46.8], [-10.5, 43.5], [-10.5, 40.0], [-9.8, 36.8], [-6.5, 35.9], 'algeciras',
      [-6.0, 35.85], 'tanger-med', [-6.5, 35.7], [-10.0, 33.0], [-17.0, 25.0], [-20.0, 15.0], [-23.0, 5.0],
      [-30.0, -5.0], [-36.0, -13.0], [-38.5, -20.0], [-43.0, -24.0], [-46.0, -24.3], 'santos', [-46.3, -24.4],
      [-47.5, -26.0], [-49.5, -30.0], [-52.0, -34.0], [-55.5, -35.6], [-57.0, -35.2], [-58.0, -34.7],
      'buenos-aires',
    ],
  },
  {
    id: 'europe-africa',
    name: 'Europe → Africa',
    from: 'Europe',
    to: 'Africa',
    typicalTransitDays: 24,
    annualTEUMillions: 1.8,
    nodes: [
      'valencia', [-0.1, 39.0], [0.5, 37.5], [-2.0, 36.4], [-5.3, 36.0], 'tanger-med', [-6.5, 35.7],
      [-8.0, 34.5], [-17.0, 25.0], [-18.0, 14.0], [-14.0, 8.0], [-10.0, 4.0], [-4.0, 4.3], [2.0, 5.5],
      'lagos', [4.0, 5.0], [6.0, 2.5], [7.5, -2.0], [10.0, -8.0], [10.5, -16.0], [12.5, -25.0],
      [16.5, -33.5], [18.3, -35.2], [20.5, -35.5], [24.0, -35.0], [28.3, -33.6], [31.0, -31.5], 'durban',
      [31.5, -29.5], [34.5, -26.0], [36.5, -22.0], [41.5, -16.0], [41.0, -10.0], [40.5, -6.0], [39.9, -4.3],
      'mombasa',
    ],
  },
  {
    id: 'intra-asia',
    name: 'Intra-Asia',
    from: 'Asia',
    to: 'Asia',
    typicalTransitDays: 9,
    annualTEUMillions: 12.6,
    nodes: [
      'tianjin', [119.0, 38.6], [121.5, 38.1], [123.0, 37.8], [123.0, 36.5], [120.9, 35.9], 'qingdao',
      [121.2, 35.7], [123.0, 35.5], [124.5, 34.5], [126.0, 33.6], [128.0, 34.0], [128.8, 34.5], 'busan',
      [129.2, 34.8], [128.0, 33.6], [126.5, 32.5], [124.0, 29.0], [122.5, 27.0], [122.5, 26.0], [122.3, 24.5],
      [121.5, 22.0], [120.6, 21.6], 'kaohsiung', [119.8, 21.5], [119.8, 18.5], [119.8, 15.5], [120.5, 14.4],
      'manila', [120.6, 14.4], [119.5, 13.5], [117.0, 12.0], [114.0, 11.5], [109.8, 10.5], [107.3, 10.2],
      'ho-chi-minh', [107.3, 10.0], [105.0, 7.5], [102.5, 9.0], [101.5, 12.0], 'laem-chabang',
    ],
  },
];

function compile(seed: LaneSeed): ShippingLane & { portIndex: Map<string, number> } {
  const waypoints: [number, number][] = [];
  const ports: string[] = [];
  const portIndex = new Map<string, number>();
  for (const node of seed.nodes) {
    if (typeof node === 'string') {
      const port = PORT_BY_ID.get(node);
      if (!port) throw new Error(`Lane ${seed.id} references unknown port "${node}"`);
      // Keep longitude continuous with the previous waypoint (antimeridian safety).
      let lng = port.longitude;
      const prev = waypoints[waypoints.length - 1];
      if (prev) {
        while (lng - prev[0] > 180) lng -= 360;
        while (lng - prev[0] < -180) lng += 360;
      }
      portIndex.set(node, waypoints.length);
      ports.push(node);
      waypoints.push([lng, port.latitude]);
    } else {
      waypoints.push(node);
    }
  }
  return {
    id: seed.id,
    name: seed.name,
    from: seed.from,
    to: seed.to,
    ports,
    waypoints,
    typicalTransitDays: seed.typicalTransitDays,
    annualTEUMillions: seed.annualTEUMillions,
    portIndex,
  };
}

export interface CompiledLane extends ShippingLane {
  /** Port id → waypoint index. */
  portIndex: Map<string, number>;
}

export const LANES: CompiledLane[] = SEEDS.map(compile);
export const LANE_BY_ID: ReadonlyMap<string, CompiledLane> = new Map(LANES.map((l) => [l.id, l]));
