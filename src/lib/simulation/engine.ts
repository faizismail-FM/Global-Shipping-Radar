import type { ActivityEvent, Alert, Congestion, Port, Vessel } from '@/types';
import { createStore, type Store } from '@/lib/store/createStore';
import { bearing, destination, distanceNm, normalizeLongitude, pathSegmentLengthNm, type LngLat } from '@/lib/geo';
import { createRng, type Rng } from '@/lib/seed';
import { LANE_BY_ID, type CompiledLane } from '@/data/lanes';
import { PORT_BY_ID, PORTS } from '@/data/ports';
import { ZONES, type MaritimeZone } from '@/data/zones';
import { makeVoyageNumber, remainingDistanceNm, routeNames } from '@/data/vessels';
import type { SimulationConfig, VesselNav } from './types';

export interface SimulationState {
  /** 'simulated' = generated fleet moved by the engine; 'ais' = live positions dead-reckoned between polls. */
  dataSource: 'simulated' | 'ais';
  vessels: Vessel[];
  ports: Port[];
  events: ActivityEvent[];
  alerts: Alert[];
  running: boolean;
  tick: number;
  /** Simulated clock in ms since epoch. */
  simTime: number;
  /** Wall-clock time of the last tick. */
  lastTickAt: number;
  config: SimulationConfig;
  /** Incremented whenever vessel positions change (cheap change detection for the map). */
  positionsVersion: number;
}

export interface EngineOptions {
  vessels: Vessel[];
  nav: Map<string, VesselNav>;
  ports: Port[];
  config?: Partial<SimulationConfig>;
  /** Called after every tick with the new vessel array (used to keep providers in sync). */
  onTick?: (vessels: Vessel[]) => void;
}

const MAX_EVENTS = 20;
const MAX_ALERTS = 24;

const DEFAULT_CONFIG: SimulationConfig = {
  intervalMs: 2000,
  hoursPerTick: 1,
  movement: true,
  activity: true,
  realTime: false,
};

/** Live-mode limits. */
const LIVE_MAX_STEP_HOURS = 0.25;
const LIVE_NEAR_PORT_NM = 25;

function portIdAt(lane: CompiledLane, waypointIndex: number): string | null {
  for (const [id, idx] of lane.portIndex) if (idx === waypointIndex) return id;
  return null;
}

function portNameAt(lane: CompiledLane, waypointIndex: number): string {
  const id = portIdAt(lane, waypointIndex);
  return id ? (PORT_BY_ID.get(id)?.name ?? id) : 'At sea';
}

function sortedPortIndices(lane: CompiledLane): number[] {
  return lane.ports.map((id) => lane.portIndex.get(id) as number).sort((a, b) => a - b);
}

/**
 * SimulationEngine drives the "live" behaviour of the dashboard: vessel
 * movement along shipping lanes, port calls, activity events, drifting port
 * statistics and derived alerts. State is exposed through a small external
 * store that React components subscribe to.
 */
export class SimulationEngine {
  readonly store: Store<SimulationState>;
  private nav: Map<string, VesselNav>;
  private timer: ReturnType<typeof setInterval> | null = null;
  private rng: Rng;
  private eventCounter = 0;
  private onTick: ((vessels: Vessel[]) => void) | undefined;
  private lastAlertTick = -100;
  /** Snapshot of the simulated fleet while a live source is active. */
  private simulatedSnapshot: Vessel[] | null = null;
  /** Zone membership for live vessels (simulated vessels keep it on their nav state). */
  private liveZones: Map<string, string | null> = new Map();

  constructor(options: EngineOptions) {
    const config = { ...DEFAULT_CONFIG, ...options.config };
    this.nav = options.nav;
    this.rng = createRng(7_331);
    this.onTick = options.onTick;
    this.store = createStore<SimulationState>({
      dataSource: 'simulated',
      vessels: options.vessels,
      ports: options.ports,
      events: [],
      alerts: [],
      running: false,
      tick: 0,
      simTime: Date.now(),
      lastTickAt: Date.now(),
      config,
      positionsVersion: 0,
    });
    // Initialise zone membership silently so we only emit real transitions.
    for (const v of options.vessels) {
      const n = this.nav.get(v.id);
      if (n) n.zoneId = this.zoneFor([v.longitude, v.latitude])?.id ?? null;
    }
    this.generateAlerts(true);
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  start(): void {
    if (this.timer) return;
    const { intervalMs } = this.store.getState().config;
    this.timer = setInterval(() => this.tick(), intervalMs);
    this.store.setState({ running: true, lastTickAt: Date.now() });
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.store.setState({ running: false });
  }

  toggle(): void {
    if (this.store.getState().running) this.stop();
    else this.start();
  }

  setConfig(partial: Partial<SimulationConfig>): void {
    const prev = this.store.getState().config;
    const next = { ...prev, ...partial };
    this.store.setState({ config: next });
    if (partial.intervalMs !== undefined && this.timer) {
      this.stop();
      this.start();
    }
  }

  destroy(): void {
    this.stop();
  }

  // ---------------------------------------------------------------------------
  // Tick
  // ---------------------------------------------------------------------------

  /** Advance the simulation by one step. Public so the UI can offer a manual "step". */
  tick(): void {
    const state = this.store.getState();
    const { config } = state;
    const now = Date.now();
    // Live mode advances by real elapsed time (capped so a suspended tab doesn't leap).
    const hours = config.realTime ? Math.min(LIVE_MAX_STEP_HOURS, Math.max(0, (now - state.lastTickAt) / 3_600_000)) : config.hoursPerTick;
    const simTime = config.realTime ? now : state.simTime + hours * 3_600_000;
    const tick = state.tick + 1;
    const events: ActivityEvent[] = [];

    let vessels = state.vessels;
    let positionsVersion = state.positionsVersion;
    if (config.movement) {
      vessels = this.updateVesselPositions(state.vessels, simTime, hours, events);
      positionsVersion++;
    }

    let ports = state.ports;
    if (tick % 5 === 0) ports = this.updatePortStatistics(state.ports, vessels, events);

    if (config.activity && !config.realTime) this.generateAmbientEvents(vessels, ports, events, tick);

    const nextEvents = config.activity ? this.mergeEvents(events, state.events) : state.events;

    this.store.setState({ vessels, ports, events: nextEvents, tick, simTime, lastTickAt: now, positionsVersion });
    if (tick - this.lastAlertTick >= 5) this.generateAlerts(false);
    this.onTick?.(vessels);
  }

  // ---------------------------------------------------------------------------
  // Vessel movement
  // ---------------------------------------------------------------------------

  /**
   * Move every underway vessel along its lane according to speed and heading,
   * handle port arrivals/departures and return a new vessel array.
   */
  updateVesselPositions(vessels: Vessel[], simTime: number, hoursPerTick: number, events: ActivityEvent[]): Vessel[] {
    const nowIso = new Date().toISOString();
    return vessels.map((vessel) => {
      if (vessel.source === 'ais') return this.deadReckon(vessel, hoursPerTick, events);
      const nav = this.nav.get(vessel.id);
      const lane = nav ? LANE_BY_ID.get(nav.laneId) : undefined;
      if (!nav || !lane) return vessel;

      if (vessel.status === 'underway') return this.moveUnderway(vessel, nav, lane, simTime, hoursPerTick, events, nowIso);

      // Moored / anchored / delayed vessels wait, then proceed.
      nav.dwell -= 1;
      if (nav.dwell > 0) {
        if (vessel.status === 'delayed' || vessel.status === 'anchored') {
          // gentle drift at anchorage
          const drift = destination([vessel.longitude, vessel.latitude], this.rng.range(0, 360), this.rng.range(0, 0.05));
          return { ...vessel, longitude: normalizeLongitude(drift[0]), latitude: drift[1], lastUpdated: nowIso };
        }
        return vessel;
      }

      if (vessel.status === 'moored') return this.depart(vessel, nav, lane, simTime, events, nowIso);

      // anchored / delayed → berth now
      const portIndex = nav.next;
      const portName = portNameAt(lane, portIndex);
      const wp = lane.waypoints[portIndex] as LngLat;
      const berth = destination(wp, this.rng.range(0, 360), this.rng.range(0.2, 1.0));
      nav.dwell = this.rng.int(3, Math.max(4, Math.round(18 / hoursPerTick)));
      nav.calls = nav.calls.filter((c) => c !== portIndex);
      nav.departure = portIndex;
      if (nav.calls.length === 0) this.planNextVoyage(nav, lane);
      const firstCall = nav.calls[0] as number;
      const lastCall = nav.calls[nav.calls.length - 1] as number;
      nav.next = portIndex + nav.dir;
      this.pushEvent(events, 'arrived', `Vessel berthed at ${portName}`, vessel.name, { vessel });
      return {
        ...vessel,
        status: 'moored',
        speed: 0,
        longitude: normalizeLongitude(berth[0]),
        latitude: berth[1],
        delayHours: 0,
        departurePort: portName,
        destination: portNameAt(lane, firstCall),
        arrivalPort: portNameAt(lane, lastCall),
        route: routeNames(lane, portIndex, nav.calls),
        eta: new Date(simTime + nav.dwell * hoursPerTick * 3_600_000 + (pathSegmentLengthNm(lane.waypoints, portIndex, firstCall) / nav.serviceSpeed) * 3_600_000).toISOString(),
        lastUpdated: nowIso,
      };
    });
  }

  /**
   * Live vessels: project the last reported position forward along the reported
   * course at the reported speed (standard AIS dead reckoning) until the next poll.
   */
  private deadReckon(vessel: Vessel, hours: number, events: ActivityEvent[]): Vessel {
    if (vessel.status !== 'underway' || vessel.speed < 0.5 || hours <= 0) return vessel;
    const pos = destination([vessel.longitude, vessel.latitude], vessel.heading, vessel.speed * hours);
    const next: Vessel = { ...vessel, longitude: normalizeLongitude(pos[0]), latitude: pos[1] };
    this.trackLiveZone(next, events);
    return next;
  }

  private trackLiveZone(vessel: Vessel, events: ActivityEvent[]): void {
    const zone = this.zoneFor([vessel.longitude, vessel.latitude]);
    const zoneId = zone?.id ?? null;
    const prev = this.liveZones.get(vessel.id);
    if (prev === undefined) {
      this.liveZones.set(vessel.id, zoneId);
      return;
    }
    if (zoneId !== prev) {
      this.liveZones.set(vessel.id, zoneId);
      if (zone && zone.kind !== 'sea' && vessel.status === 'underway') {
        this.pushEvent(events, 'zone-enter', `Vessel entered ${zone.name}`, vessel.name, { vessel });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Live AIS mode
  // ---------------------------------------------------------------------------

  /** Switch to live positions: the simulated fleet is parked and restored by exitLiveMode(). */
  enterLiveMode(): void {
    const state = this.store.getState();
    if (state.dataSource === 'ais') return;
    this.simulatedSnapshot = state.vessels;
    this.liveZones.clear();
    this.store.setState({
      dataSource: 'ais',
      vessels: [],
      events: [],
      alerts: [],
      simTime: Date.now(),
      lastTickAt: Date.now(),
      config: { ...state.config, realTime: true },
      positionsVersion: state.positionsVersion + 1,
    });
    this.onTick?.([]);
  }

  exitLiveMode(): void {
    const state = this.store.getState();
    if (state.dataSource !== 'ais') return;
    const vessels = this.simulatedSnapshot ?? [];
    this.simulatedSnapshot = null;
    this.liveZones.clear();
    this.store.setState({
      dataSource: 'simulated',
      vessels,
      events: [],
      simTime: Date.now(),
      lastTickAt: Date.now(),
      config: { ...state.config, realTime: false },
      positionsVersion: state.positionsVersion + 1,
    });
    this.generateAlerts(true);
    this.onTick?.(vessels);
  }

  /**
   * Replace the live vessel set with a fresh AIS snapshot. Status transitions
   * between polls become activity events (arrivals, departures, anchoring).
   */
  setLiveVessels(incoming: Vessel[]): void {
    const state = this.store.getState();
    if (state.dataSource !== 'ais') return;
    const previous = new Map(state.vessels.map((v) => [v.id, v]));
    const events: ActivityEvent[] = [];
    const first = previous.size === 0;
    for (const v of incoming) {
      const before = previous.get(v.id);
      if (!first && before && before.status !== v.status) {
        const port = this.nearestPortName([v.longitude, v.latitude]);
        if (before.status === 'underway' && v.status === 'moored') this.pushEvent(events, 'arrived', `Vessel berthed${port ? ` at ${port}` : ''}`, v.name, { vessel: v });
        else if (before.status === 'underway' && v.status === 'anchored') this.pushEvent(events, 'arrived', `Vessel anchored${port ? ` off ${port}` : ''}`, v.name, { vessel: v });
        else if (before.status !== 'underway' && v.status === 'underway') this.pushEvent(events, 'departed', `Vessel departed${port ? ` ${port}` : ''}`, v.name, { vessel: v });
      }
      if (!first && !before && v.status === 'underway') this.pushEvent(events, 'destination', 'New AIS contact', v.name, { vessel: v });
    }
    // Forget zone state for vessels that dropped out of the feed.
    const ids = new Set(incoming.map((v) => v.id));
    for (const id of this.liveZones.keys()) if (!ids.has(id)) this.liveZones.delete(id);

    const nextEvents = this.mergeEvents(events, state.events);
    this.store.setState({ vessels: incoming, events: nextEvents, positionsVersion: state.positionsVersion + 1, lastTickAt: Date.now() });
    this.generateAlerts(false);
    this.onTick?.(incoming);
  }

  private nearestPortName(pos: LngLat): string | null {
    let best: { name: string; d: number } | null = null;
    for (const p of this.store.getState().ports) {
      const d = distanceNm(pos, [p.longitude, p.latitude]);
      if (d <= LIVE_NEAR_PORT_NM && (!best || d < best.d)) best = { name: p.name, d };
    }
    return best?.name ?? null;
  }

  private moveUnderway(
    vessel: Vessel,
    nav: VesselNav,
    lane: CompiledLane,
    simTime: number,
    hoursPerTick: number,
    events: ActivityEvent[],
    nowIso: string,
  ): Vessel {
    const wp = lane.waypoints;
    let pos: LngLat = [vessel.longitude, vessel.latitude];
    // Keep longitude continuous with the lane geometry (antimeridian safety).
    const target0 = wp[nav.next] as LngLat;
    while (pos[0] - target0[0] > 180) pos = [pos[0] - 360, pos[1]];
    while (pos[0] - target0[0] < -180) pos = [pos[0] + 360, pos[1]];

    // Small speed variation so vessels do not move in lock-step.
    const speed = Math.max(6, Math.min(25, vessel.speed + this.rng.range(-0.25, 0.25)));
    let remaining = speed * hoursPerTick;
    let heading = vessel.heading;
    let arrivedAt: number | null = null;

    while (remaining > 0) {
      const target = wp[nav.next] as LngLat;
      const d = distanceNm(pos, target);
      if (remaining >= d) {
        pos = target;
        remaining -= d;
        const reachedCall = nav.calls[0] === nav.next;
        if (reachedCall) {
          arrivedAt = nav.next;
          break;
        }
        const nextIndex = nav.next + nav.dir;
        if (nextIndex < 0 || nextIndex >= wp.length) {
          // Reached the end of the lane without a scheduled call – treat as arrival.
          arrivedAt = nav.next;
          break;
        }
        nav.next = nextIndex;
        heading = bearing(pos, wp[nav.next] as LngLat);
      } else {
        heading = bearing(pos, target);
        pos = destination(pos, heading, remaining);
        remaining = 0;
      }
    }

    if (arrivedAt !== null) return this.arrive(vessel, nav, lane, arrivedAt, pos, simTime, hoursPerTick, events, nowIso);

    // Zone transitions for the activity feed.
    const zone = this.zoneFor(pos);
    const zoneId = zone?.id ?? null;
    if (zoneId !== nav.zoneId) {
      nav.zoneId = zoneId;
      if (zone && zone.kind !== 'sea') this.pushEvent(events, 'zone-enter', `Vessel entered ${zone.name}`, vessel.name, { vessel, pos });
    }

    const firstCall = nav.calls[0] as number;
    const remainingNm = remainingDistanceNm(lane, pos, nav.next, nav.dir, firstCall);
    const etaMs = simTime + (remainingNm / Math.max(speed, 8)) * 3_600_000 + vessel.delayHours * 3_600_000;

    // Occasional schedule slips.
    let delayHours = vessel.delayHours;
    if (this.rng.chance(0.004)) {
      const slip = this.rng.int(2, 8);
      delayHours += slip;
      this.pushEvent(events, 'eta', `ETA revised (+${slip}h) for ${vessel.destination}`, vessel.name, { vessel, pos });
    }

    return {
      ...vessel,
      longitude: Math.round(normalizeLongitude(pos[0]) * 1e5) / 1e5,
      latitude: Math.round(pos[1] * 1e5) / 1e5,
      heading: Math.round(heading),
      speed: Math.round(speed * 10) / 10,
      eta: new Date(etaMs).toISOString(),
      delayHours,
      lastUpdated: nowIso,
    };
  }

  private arrive(
    vessel: Vessel,
    nav: VesselNav,
    lane: CompiledLane,
    portIndex: number,
    pos: LngLat,
    simTime: number,
    hoursPerTick: number,
    events: ActivityEvent[],
    nowIso: string,
  ): Vessel {
    const port = portIdAt(lane, portIndex);
    const portData = port ? PORT_BY_ID.get(port) : undefined;
    const portName = portData?.name ?? 'port';
    const wp = lane.waypoints;
    // Waypoint the vessel came from (falls back to the other side at lane ends).
    const approach = (wp[portIndex - nav.dir] ?? wp[portIndex + nav.dir] ?? pos) as LngLat;
    nav.calls = nav.calls.filter((c) => c !== portIndex);
    nav.departure = portIndex;

    // Busy ports sometimes hold vessels at anchor before a berth is available.
    const congestion = portData?.congestion ?? 'low';
    const waitChance = congestion === 'high' ? 0.7 : congestion === 'medium' ? 0.4 : 0.15;
    const mustWait = this.rng.chance(waitChance);

    if (nav.calls.length === 0) this.planNextVoyage(nav, lane);
    const firstCall = nav.calls[0] as number;
    const lastCall = nav.calls[nav.calls.length - 1] as number;

    if (mustWait) {
      const anchorage = destination(pos, bearing(pos, approach), this.rng.range(3, 9));
      nav.dwell = this.rng.int(4, Math.max(5, Math.round(30 / hoursPerTick)));
      nav.next = portIndex; // berth is the next "waypoint"
      const delayed = this.rng.chance(congestion === 'high' ? 0.7 : congestion === 'medium' ? 0.35 : 0.1);
      const delayHours = delayed ? this.rng.int(6, 30) : 0;
      this.pushEvent(
        events,
        delayed ? 'delay' : 'arrived',
        delayed ? `Vessel delayed at ${portName} anchorage` : `Vessel anchored off ${portName}`,
        vessel.name,
        { vessel, pos: anchorage },
      );
      return {
        ...vessel,
        status: delayed ? 'delayed' : 'anchored',
        speed: Math.round(this.rng.range(0, 1.2) * 10) / 10,
        heading: Math.round(bearing(anchorage, pos)),
        longitude: normalizeLongitude(anchorage[0]),
        latitude: anchorage[1],
        delayHours,
        destination: portName,
        eta: new Date(simTime + (nav.dwell * hoursPerTick + delayHours) * 3_600_000).toISOString(),
        lastUpdated: nowIso,
      };
    }

    const berth = destination(pos, this.rng.range(0, 360), this.rng.range(0.2, 1.0));
    nav.dwell = this.rng.int(3, Math.max(4, Math.round(20 / hoursPerTick)));
    nav.next = portIndex + nav.dir;
    this.pushEvent(events, 'arrived', `Vessel arrived at ${portName}`, vessel.name, { vessel, pos: berth });
    return {
      ...vessel,
      status: 'moored',
      speed: 0,
      longitude: normalizeLongitude(berth[0]),
      latitude: berth[1],
      delayHours: 0,
      departurePort: portName,
      destination: portNameAt(lane, firstCall),
      arrivalPort: portNameAt(lane, lastCall),
      route: routeNames(lane, portIndex, nav.calls),
      voyageDistanceNm: Math.round(pathSegmentLengthNm(lane.waypoints, portIndex, lastCall)),
      eta: new Date(simTime + nav.dwell * hoursPerTick * 3_600_000 + (pathSegmentLengthNm(wp, portIndex, firstCall) / nav.serviceSpeed) * 3_600_000).toISOString(),
      lastUpdated: nowIso,
    };
  }

  private depart(vessel: Vessel, nav: VesselNav, lane: CompiledLane, simTime: number, events: ActivityEvent[], nowIso: string): Vessel {
    const wp = lane.waypoints;
    const portName = portNameAt(lane, nav.departure);
    const firstCall = nav.calls[0] as number;
    const lastCall = nav.calls[nav.calls.length - 1] as number;
    nav.next = nav.departure + nav.dir;
    const pos: LngLat = [vessel.longitude, vessel.latitude];
    const heading = bearing(pos, wp[nav.next] as LngLat);
    const remainingNm = remainingDistanceNm(lane, pos, nav.next, nav.dir, firstCall);
    const eta = simTime + (remainingNm / nav.serviceSpeed) * 3_600_000;
    nav.scheduledEta = eta;
    this.pushEvent(events, 'departed', `Vessel departed ${portName}`, vessel.name, { vessel, pos });
    return {
      ...vessel,
      status: 'underway',
      speed: Math.round(nav.serviceSpeed * this.rng.range(0.9, 1.0) * 10) / 10,
      heading: Math.round(heading),
      departurePort: portName,
      destination: portNameAt(lane, firstCall),
      arrivalPort: portNameAt(lane, lastCall),
      route: routeNames(lane, nav.departure, nav.calls),
      eta: new Date(eta).toISOString(),
      delayHours: 0,
      voyage: makeVoyageNumber(this.rng, nav.dir, lane),
      voyageDistanceNm: Math.round(pathSegmentLengthNm(wp, nav.departure, lastCall)),
      lastUpdated: nowIso,
    };
  }

  /** After the final call, plan a new voyage (continuing or reversing along the lane). */
  private planNextVoyage(nav: VesselNav, lane: CompiledLane): void {
    const idx = sortedPortIndices(lane);
    const departure = nav.departure;
    let dir = nav.dir;
    let ahead = dir === 1 ? idx.filter((i) => i > departure) : idx.filter((i) => i < departure).reverse();
    if (ahead.length === 0) {
      dir = dir === 1 ? -1 : 1;
      ahead = dir === 1 ? idx.filter((i) => i > departure) : idx.filter((i) => i < departure).reverse();
    }
    nav.dir = dir;
    const count = Math.min(ahead.length, this.rng.int(1, 5));
    const candidates = ahead.slice(0, count);
    const last = candidates[candidates.length - 1] as number;
    const calls = candidates.slice(0, -1).filter(() => this.rng.chance(0.55));
    calls.push(last);
    nav.calls = calls;
  }

  // ---------------------------------------------------------------------------
  // Ports
  // ---------------------------------------------------------------------------

  updatePortStatistics(ports: Port[], vessels: Vessel[], events: ActivityEvent[]): Port[] {
    return ports.map((port) => {
      const inPort = Math.max(1, port.vesselsInPort + this.rng.int(-3, 3));
      const anchored = Math.max(0, port.vesselsAnchored + this.rng.int(-2, 2));
      const arrivals = Math.max(0, port.arrivalsToday + this.rng.int(0, 2));
      const departures = Math.max(0, port.departuresToday + this.rng.int(0, 2));
      // Random walk with mean reversion towards the port's baseline waiting time.
      const baseline = PORT_BY_ID.get(port.id)?.averageWaitingHours ?? port.averageWaitingHours;
      let wait = Math.max(1, port.averageWaitingHours + this.rng.range(-0.7, 0.7) + (baseline - port.averageWaitingHours) * 0.04);

      // Anchored vessels from the simulated fleet nudge waiting time up.
      const waiting = vessels.filter(
        (v) => (v.status === 'anchored' || v.status === 'delayed') && v.destination === port.name,
      ).length;
      wait += waiting * 0.05;
      wait = Math.round(wait * 10) / 10;

      const congestion: Congestion = wait >= 16 ? 'high' : wait >= 7 ? 'medium' : 'low';
      // Port statistics are simulated; while a live AIS feed is active their drift must not masquerade as real events.
      if (congestion !== port.congestion && this.store.getState().dataSource === 'simulated') {
        const increased =
          (port.congestion === 'low' && congestion !== 'low') || (port.congestion === 'medium' && congestion === 'high');
        this.pushEvent(
          events,
          'congestion',
          increased ? 'Port congestion increased' : 'Port congestion eased',
          port.name,
          { port },
        );
      }
      return {
        ...port,
        vesselsInPort: inPort,
        vesselsAnchored: anchored,
        arrivalsToday: arrivals,
        departuresToday: departures,
        averageWaitingHours: wait,
        congestion,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  private generateAmbientEvents(vessels: Vessel[], ports: Port[], events: ActivityEvent[], tick: number): void {
    // Occasionally report a destination update for a random underway vessel.
    if (tick % 7 === 0 && this.rng.chance(0.5)) {
      const underway = vessels.filter((v) => v.status === 'underway');
      if (underway.length > 0) {
        const v = this.rng.pick(underway);
        this.pushEvent(events, 'destination', `Vessel destination confirmed: ${v.destination}`, v.name, { vessel: v });
      }
    }
    void ports;
  }

  private pushEvent(
    events: ActivityEvent[],
    kind: ActivityEvent['kind'],
    title: string,
    subject: string,
    ref: { vessel?: Vessel; port?: Port; pos?: LngLat },
  ): void {
    if (!this.store.getState().config.activity) return;
    this.eventCounter++;
    const target: ActivityEvent['target'] = ref.port
      ? { longitude: ref.port.longitude, latitude: ref.port.latitude, zoom: 8, portId: ref.port.id }
      : ref.vessel
        ? {
            longitude: normalizeLongitude(ref.pos?.[0] ?? ref.vessel.longitude),
            latitude: ref.pos?.[1] ?? ref.vessel.latitude,
            zoom: 7,
            vesselId: ref.vessel.id,
          }
        : undefined;
    const event: ActivityEvent = { id: `e-${this.eventCounter}`, kind, title, subject, timestamp: Date.now() };
    if (target) event.target = target;
    events.push(event);
  }

  private mergeEvents(fresh: ActivityEvent[], existing: ActivityEvent[]): ActivityEvent[] {
    if (fresh.length === 0) return existing;
    // Keep the feed readable: at most 3 new events per tick, newest first.
    const picked = fresh.slice(-3).reverse();
    return [...picked, ...existing].slice(0, MAX_EVENTS);
  }

  // ---------------------------------------------------------------------------
  // Alerts
  // ---------------------------------------------------------------------------

  generateAlerts(initial: boolean): void {
    const state = this.store.getState();
    this.lastAlertTick = state.tick;
    const previous = new Map(state.alerts.map((a) => [a.id, a]));
    const alerts: Alert[] = [];
    const now = Date.now();
    const live = state.dataSource === 'ais';

    for (const port of state.ports) {
      // Congestion alerts derive from simulated port statistics; only raise them for the simulated fleet.
      if (!live && port.congestion === 'high') {
        const id = `congestion:${port.id}`;
        alerts.push({
          id,
          kind: 'congestion',
          severity: port.averageWaitingHours >= 24 ? 'critical' : 'warning',
          title: 'High congestion',
          subject: port.name,
          detail: `Port waiting time > ${Math.floor(port.averageWaitingHours)}h`,
          createdAt: previous.get(id)?.createdAt ?? now,
          target: { longitude: port.longitude, latitude: port.latitude, zoom: 8, portId: port.id },
        });
      }
    }

    const delayed = state.vessels
      .filter((v) => v.status === 'delayed' || v.delayHours >= 6)
      .sort((a, b) => b.delayHours - a.delayHours)
      .slice(0, 10);
    for (const v of delayed) {
      const id = `delay:${v.id}`;
      alerts.push({
        id,
        kind: 'delay',
        severity: v.delayHours >= 24 ? 'critical' : 'warning',
        title: 'Vessel delay',
        subject: v.name,
        detail: `ETA ${v.destination} delayed by ${v.delayHours}h`,
        createdAt: previous.get(id)?.createdAt ?? now,
        target: { longitude: v.longitude, latitude: v.latitude, zoom: 7, vesselId: v.id },
      });
    }

    for (const zone of ZONES) {
      if (zone.kind === 'sea') continue;
      const count = state.vessels.filter(
        (v) => distanceNm([v.longitude, v.latitude], [zone.longitude, zone.latitude]) <= zone.radiusNm,
      ).length;
      if (count >= 5) {
        const id = `traffic:${zone.id}`;
        alerts.push({
          id,
          kind: 'traffic',
          severity: count >= 9 ? 'warning' : 'info',
          title: 'High traffic',
          subject: zone.name,
          detail: `${count} vessels transiting`,
          createdAt: previous.get(id)?.createdAt ?? now,
          target: { longitude: zone.longitude, latitude: zone.latitude, zoom: zone.zoom },
        });
      }
    }

    const order: Record<Alert['severity'], number> = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => order[a.severity] - order[b.severity] || b.createdAt - a.createdAt);
    const next = alerts.slice(0, MAX_ALERTS);
    if (initial || next.length !== state.alerts.length || next.some((a, i) => a.id !== state.alerts[i]?.id || a.detail !== state.alerts[i]?.detail)) {
      this.store.setState({ alerts: next });
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private zoneFor(pos: LngLat): MaritimeZone | null {
    let best: MaritimeZone | null = null;
    for (const z of ZONES) {
      if (z.kind === 'sea') continue;
      if (distanceNm([normalizeLongitude(pos[0]), pos[1]], [z.longitude, z.latitude]) <= z.radiusNm) {
        if (!best || z.radiusNm < best.radiusNm) best = z;
      }
    }
    return best;
  }

  /** Waypoints of the vessel's remaining voyage, starting at its current position. */
  getRemainingRoute(vesselId: string): LngLat[] {
    const state = this.store.getState();
    const vessel = state.vessels.find((v) => v.id === vesselId);
    if (vessel?.source === 'ais') {
      // Live vessels: great-circle leg from the reported position to the declared destination, when it is a known port.
      const port = state.ports.find((p) => p.name === vessel.destination);
      if (!port || vessel.status !== 'underway') return [];
      return [[vessel.longitude, vessel.latitude], [port.longitude, port.latitude]];
    }
    const nav = this.nav.get(vesselId);
    const lane = nav ? LANE_BY_ID.get(nav.laneId) : undefined;
    if (!vessel || !nav || !lane) return [];
    const wp = lane.waypoints;
    const last = nav.calls[nav.calls.length - 1];
    if (last === undefined) return [];
    const pts: LngLat[] = [];
    let start: LngLat = [vessel.longitude, vessel.latitude];
    const first = wp[nav.next] as LngLat;
    while (start[0] - first[0] > 180) start = [start[0] - 360, start[1]];
    while (start[0] - first[0] < -180) start = [start[0] + 360, start[1]];
    pts.push(start);
    if (vessel.status === 'underway') {
      for (let i = nav.next; nav.dir === 1 ? i <= last : i >= last; i += nav.dir) pts.push(wp[i] as LngLat);
    } else {
      // In port / at anchorage: the route starts at the port itself.
      const from = vessel.status === 'moored' ? nav.departure : nav.next;
      const step = nav.dir;
      for (let i = from; step === 1 ? i <= last : i >= last; i += step) pts.push(wp[i] as LngLat);
    }
    return pts;
  }

  /** Waypoints already sailed on the current voyage (departure port → current position). */
  getCompletedRoute(vesselId: string): LngLat[] {
    const state = this.store.getState();
    const vessel = state.vessels.find((v) => v.id === vesselId);
    const nav = this.nav.get(vesselId);
    const lane = nav ? LANE_BY_ID.get(nav.laneId) : undefined;
    if (!vessel || !nav || !lane || vessel.status !== 'underway') return [];
    const wp = lane.waypoints;
    const pts: LngLat[] = [];
    for (let i = nav.departure; nav.dir === 1 ? i < nav.next : i > nav.next; i += nav.dir) pts.push(wp[i] as LngLat);
    let end: LngLat = [vessel.longitude, vessel.latitude];
    const ref = pts[pts.length - 1] ?? (wp[nav.next] as LngLat);
    while (end[0] - ref[0] > 180) end = [end[0] - 360, end[1]];
    while (end[0] - ref[0] < -180) end = [end[0] + 360, end[1]];
    pts.push(end);
    return pts;
  }

  /** Lane geometry bounding box for "fit to lane" interactions. */
  static laneBounds(lane: CompiledLane): [[number, number], [number, number]] {
    let w = Infinity;
    let s = Infinity;
    let e = -Infinity;
    let n = -Infinity;
    for (const [lng, lat] of lane.waypoints) {
      w = Math.min(w, lng);
      e = Math.max(e, lng);
      s = Math.min(s, lat);
      n = Math.max(n, lat);
    }
    return [
      [w, s],
      [e, n],
    ];
  }
}

export { PORTS as DEFAULT_PORTS };
