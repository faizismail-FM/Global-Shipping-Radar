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

/** Update the vessel provider's label when the live AIS feed is switched on or off. */
export function setVesselSourceInfo(info: { name: string; simulated: boolean }): void {
  const p = getProviders().vessels;
  if (p instanceof MockVesselProvider) {
    p.name = info.name;
    p.simulated = info.simulated;
  }
}
