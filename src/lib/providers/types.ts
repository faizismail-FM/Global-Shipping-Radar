import type { Container, Port, Vessel } from '@/types';

/**
 * Data provider contracts. The UI only talks to these interfaces, so a real
 * AIS / carrier integration can replace the mock providers without touching
 * components. See README → "Replacing MockVesselProvider with a real API".
 */

export interface VesselDataProvider {
  /** Human readable provider label, shown in the simulation panel. */
  readonly name: string;
  /** Whether the data is simulated (drives the "Simulated data" labels). */
  readonly simulated: boolean;
  getVessels(): Promise<Vessel[]>;
  getVessel(id: string): Promise<Vessel | null>;
  searchVessels(query: string): Promise<Vessel[]>;
}

export interface ContainerDataProvider {
  readonly name: string;
  readonly simulated: boolean;
  searchContainer(containerNumber: string): Promise<Container | null>;
}

export interface PortDataProvider {
  readonly name: string;
  readonly simulated: boolean;
  getPorts(): Promise<Port[]>;
  getPort(id: string): Promise<Port | null>;
}
