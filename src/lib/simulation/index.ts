import { SimulationEngine } from './engine';
import { getProviders, MockVesselProvider } from '@/lib/providers';
import { settingsStore } from '@/lib/store/settings';

export { SimulationEngine } from './engine';
export type { SimulationState } from './engine';
export type { SimulationConfig, VesselNav } from './types';

let engine: SimulationEngine | null = null;
let booting: Promise<SimulationEngine> | null = null;

/**
 * Boot the simulation once for the lifetime of the page. Data comes from the
 * provider layer; when the vessel provider is the simulated one, its internal
 * navigation state is handed to the engine so vessels can move.
 */
export function bootSimulation(): Promise<SimulationEngine> {
  if (engine) return Promise.resolve(engine);
  if (booting) return booting;
  booting = (async () => {
    const providers = getProviders();
    const [vessels, ports] = await Promise.all([providers.vessels.getVessels(), providers.ports.getPorts()]);
    const vesselProvider = providers.vessels;
    const nav = vesselProvider instanceof MockVesselProvider ? vesselProvider.getNavigationState() : new Map();
    const { updateIntervalMs } = settingsStore.getState();
    const created = new SimulationEngine({
      vessels,
      ports,
      nav,
      config: { intervalMs: updateIntervalMs },
      onTick: (v) => {
        if (vesselProvider instanceof MockVesselProvider) vesselProvider.syncLive(v);
      },
    });
    created.start();
    engine = created;
    return created;
  })();
  return booting;
}

export function getEngine(): SimulationEngine {
  if (!engine) throw new Error('Simulation has not been booted yet');
  return engine;
}

export function hasEngine(): boolean {
  return engine !== null;
}
