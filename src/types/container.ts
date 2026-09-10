export type ContainerStatus =
  | 'Empty – Booked'
  | 'Gate In'
  | 'Loaded'
  | 'In Transit'
  | 'Transshipment'
  | 'Discharged'
  | 'Gate Out'
  | 'Delivered';

export type ContainerMilestoneState = 'completed' | 'current' | 'upcoming';

export interface ContainerMilestone {
  location: string;
  /** Short event description, e.g. "Loaded", "Transshipment", "In Transit". */
  event: string;
  /** ISO-8601 timestamp, undefined when the milestone is still planned. */
  timestamp?: string;
  state: ContainerMilestoneState;
}

export interface Container {
  containerNumber: string;
  /** ISO size/type code, e.g. "40HC", "20GP", "40RF". */
  sizeType: string;
  status: ContainerStatus;

  vesselName: string;
  voyage: string;

  portOfLoading: string;
  portOfDischarge: string;

  currentLocation: string;

  /** ISO-8601 timestamp. */
  estimatedArrival: string;

  route: string[];

  milestones: ContainerMilestone[];

  /** Bill of lading number (demo). */
  billOfLading: string;
  /** Carrier operating the booking. */
  carrier: string;
  /** Always true in the MVP: these records are simulated. */
  demo: true;
}
