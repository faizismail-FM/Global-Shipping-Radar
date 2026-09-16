import type { Container, Port, Vessel } from '@/types';
import type { ContainerDataProvider, PortDataProvider, VesselDataProvider } from './types';
import { generateFleet, type GeneratedFleet } from '@/data/vessels';
import { PORTS } from '@/data/ports';
import { CONTAINER_BY_NUMBER } from '@/data/containers';
import { normalizeContainerNumber } from '@/lib/identifiers';

/** Small artificial latency so loading states are visible and realistic. */
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * MockVesselProvider serves the deterministic simulated fleet. It also exposes
 * the internal navigation state needed by the SimulationEngine; a real
 * provider would not have that and the engine would simply not move vessels.
 */
export class MockVesselProvider implements VesselDataProvider {
  /** Reflects the active data source (a live AIS feed can replace the fleet at runtime). */
  name = 'Simulated fleet';
  simulated = true;
  private fleet: GeneratedFleet | null = null;

  /** Latest vessel snapshot, updated by the simulation engine. */
  private live: Map<string, Vessel> = new Map();

  private ensure(): GeneratedFleet {
    if (!this.fleet) {
      this.fleet = generateFleet({ now: Date.now() });
      this.live = new Map(this.fleet.vessels.map((v) => [v.id, v]));
    }
    return this.fleet;
  }

  /** Called by the SimulationEngine so provider reads reflect live positions. */
  syncLive(vessels: Vessel[]): void {
    this.live = new Map(vessels.map((v) => [v.id, v]));
  }

  /** Internal navigation state (only meaningful for the simulated fleet). */
  getNavigationState(): GeneratedFleet['nav'] {
    return this.ensure().nav;
  }

  async getVessels(): Promise<Vessel[]> {
    this.ensure();
    await wait(240);
    return Array.from(this.live.values());
  }

  async getVessel(id: string): Promise<Vessel | null> {
    this.ensure();
    await wait(180);
    return this.live.get(id) ?? null;
  }

  async searchVessels(query: string): Promise<Vessel[]> {
    this.ensure();
    const q = query.trim().toLowerCase();
    if (!q) return [];
    await wait(60);
    return Array.from(this.live.values()).filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.imo.includes(q) ||
        v.mmsi.includes(q) ||
        v.destination.toLowerCase().includes(q) ||
        v.operator.toLowerCase().includes(q),
    );
  }
}

export class MockContainerProvider implements ContainerDataProvider {
  readonly name = 'Demo tracking records';
  readonly simulated = true;

  async searchContainer(containerNumber: string): Promise<Container | null> {
    await wait(420);
    return CONTAINER_BY_NUMBER.get(normalizeContainerNumber(containerNumber)) ?? null;
  }
}

export class MockPortProvider implements PortDataProvider {
  readonly name = 'Simulated port statistics';
  readonly simulated = true;

  async getPorts(): Promise<Port[]> {
    await wait(120);
    return PORTS.map((p) => ({ ...p }));
  }

  async getPort(id: string): Promise<Port | null> {
    await wait(150);
    const port = PORTS.find((p) => p.id === id);
    return port ? { ...port } : null;
  }
}
