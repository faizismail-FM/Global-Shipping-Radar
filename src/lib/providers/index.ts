import { MockContainerProvider, MockPortProvider, MockVesselProvider } from './mock';
import type { ContainerDataProvider, PortDataProvider, VesselDataProvider } from './types';

export type { ContainerDataProvider, PortDataProvider, VesselDataProvider } from './types';
export { MockContainerProvider, MockPortProvider, MockVesselProvider } from './mock';

export interface Providers {
  vessels: VesselDataProvider;
  containers: ContainerDataProvider;
  ports: PortDataProvider;
}

let providers: Providers | null = null;

/**
 * Provider factory. To integrate real data, construct your own providers here
 * (e.g. `new AISVesselProvider(import.meta.env.PUBLIC_AIS_API_URL)`), keeping
 * the same interfaces. The rest of the app is unaffected.
 */
export function getProviders(): Providers {
  if (!providers) {
    providers = {
      vessels: new MockVesselProvider(),
      containers: new MockContainerProvider(),
      ports: new MockPortProvider(),
    };
  }
  return providers;
}
