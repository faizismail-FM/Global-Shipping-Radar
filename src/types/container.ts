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

  /** Bill of lading / transport document number ('—' when not reported). */
  billOfLading: string;
  /** Carrier booking reference, when reported. */
  bookingReference?: string;
  /** Carrier operating the booking. */
  carrier: string;
  /** IMO number of the current/next vessel, when reported. */
  vesselImo?: string;
  /** Time of the most recent actual carrier event (ISO-8601). */
  lastEventAt?: string;
  /** True for the built-in simulated records; false for records from a carrier API. */
  demo: boolean;
  /** Provenance of a live record. */
  source?: {
    /** Human-readable source, e.g. "Hapag-Lloyd Track & Trace". */
    name: string;
    /** When the relay fetched it (ISO-8601). */
    fetchedAt: string;
    /** Number of carrier events the record was built from. */
    eventCount: number;
  };
}
