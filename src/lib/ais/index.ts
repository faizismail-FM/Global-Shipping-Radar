import type { DataSource } from '@/types';
import type { LiveAISSource } from './types';
import { DigitrafficAISSource } from './digitraffic';
import { AISStreamSource } from './aisstream';

export type { LiveAISSource } from './types';
export { DigitrafficAISSource } from './digitraffic';
export { AISStreamSource, AISSTREAM_DEFAULT_BOUNDS } from './aisstream';
export * from './codes';

const sources: Partial<Record<DataSource, LiveAISSource>> = {};

/** Live sources keyed by the `dataSource` setting. Add new providers here. */
export function getLiveSource(id: DataSource): LiveAISSource | null {
  if (id === 'simulated') return null;
  if (!sources[id]) {
    if (id === 'digitraffic') sources[id] = new DigitrafficAISSource();
    if (id === 'aisstream') sources[id] = new AISStreamSource();
  }
  return sources[id] ?? null;
}
