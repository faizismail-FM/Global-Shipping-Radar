import type { DataSource } from '@/types';
import type { LiveAISSource } from './types';
import { DigitrafficAISSource } from './digitraffic';

export type { LiveAISSource } from './types';
export { DigitrafficAISSource } from './digitraffic';
export * from './codes';

const sources: Partial<Record<DataSource, LiveAISSource>> = {};

/** Live sources keyed by the `dataSource` setting. Add new providers here. */
export function getLiveSource(id: DataSource): LiveAISSource | null {
  if (id === 'simulated') return null;
  if (!sources[id]) {
    if (id === 'digitraffic') sources[id] = new DigitrafficAISSource();
  }
  return sources[id] ?? null;
}
