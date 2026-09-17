import type { Container, ContainerMilestone, ContainerStatus } from '@/types';

/**
 * DCSA Track & Trace v2.2 event model (the subset this app reads) and a pure
 * mapper from a container's event list to the app's `Container` record.
 *
 * Carriers that implement the DCSA standard (Hapag-Lloyd, Maersk, CMA CGM,
 * ONE, …) all return the same shapes, so one mapper serves every connector.
 * Spec: https://github.com/dcsaorg/DCSA-OpenAPI/tree/master/tnt/v2
 */

export type DcsaEventType = 'SHIPMENT' | 'TRANSPORT' | 'EQUIPMENT';
/** ACT = actual, PLN = planned, EST = estimated, REQ = requested. */
export type DcsaClassifier = 'ACT' | 'PLN' | 'EST' | 'REQ';

export interface DcsaLocation {
  locationName?: string;
  UNLocationCode?: string;
  facilityCode?: string;
  latitude?: string | number;
  longitude?: string | number;
  address?: { name?: string; street?: string; city?: string; country?: string };
}

export interface DcsaVessel {
  vesselIMONumber?: string;
  vesselName?: string;
  vesselFlag?: string;
  vesselOperatorCarrierCode?: string;
}

export interface DcsaTransportCall {
  transportCallID?: string;
  carrierServiceCode?: string;
  carrierVoyageNumber?: string;
  exportVoyageNumber?: string;
  importVoyageNumber?: string;
  transportCallSequenceNumber?: number;
  UNLocationCode?: string;
  facilityCode?: string;
  facilityTypeCode?: string;
  modeOfTransport?: string;
  location?: DcsaLocation;
  vessel?: DcsaVessel;
}

export interface DcsaEvent {
  eventID?: string;
  eventType: DcsaEventType;
  eventClassifierCode: DcsaClassifier;
  eventDateTime: string;
  eventCreatedDateTime?: string;
  // equipment events
  equipmentEventTypeCode?: string;
  equipmentReference?: string;
  ISOEquipmentCode?: string;
  emptyIndicatorCode?: 'EMPTY' | 'LADEN';
  eventLocation?: DcsaLocation;
  // transport events
  transportEventTypeCode?: string;
  delayReasonCode?: string;
  changeRemark?: string;
  transportCall?: DcsaTransportCall;
  // shipment events
  shipmentEventTypeCode?: string;
  documentTypeCode?: string;
  documentID?: string;
  reason?: string;
  documentReferences?: { documentReferenceType?: string; documentReferenceValue?: string }[];
  references?: { referenceType?: string; referenceValue?: string }[];
}

const EQUIPMENT_LABEL: Record<string, string> = {
  LOAD: 'Loaded',
  DISC: 'Discharged',
  GTIN: 'Gate in',
  GTOT: 'Gate out',
  STUF: 'Stuffed',
  STRP: 'Stripped',
  PICK: 'Picked up',
  DROP: 'Dropped off',
  INSP: 'Inspected',
  RSEA: 'Resealed',
  RMVD: 'Removed',
  AVPU: 'Available for pickup',
  CUSS: 'Customs selected',
  CUSI: 'Customs inspected',
  CUSR: 'Customs released',
};

const TRANSPORT_LABEL: Record<string, string> = {
  ARRI: 'Vessel arrived',
  DEPA: 'Vessel departed',
  OMIT: 'Port call omitted',
};

/** Resolve a UN/LOCODE to a port name; supplied by the caller (the app's port list plus extras). */
export type LocodeResolver = (locode: string) => string | null;

function titleCaseIfShouting(s: string): string {
  const t = s.trim();
  if (t.length < 3 || t !== t.toUpperCase()) return t;
  return t
    .toLowerCase()
    .split(/(\s+|-|\/)/)
    .map((w) => (w.length > 0 && /[a-z]/.test(w[0] ?? '') ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join('');
}

function locationName(ev: DcsaEvent, resolve: LocodeResolver): string {
  const loc = ev.transportCall?.location ?? ev.eventLocation;
  const code = loc?.UNLocationCode ?? ev.transportCall?.UNLocationCode;
  const fromCode = code ? resolve(code.toUpperCase()) : null;
  const name = loc?.locationName ?? loc?.address?.city ?? fromCode ?? code ?? ev.transportCall?.facilityCode ?? loc?.facilityCode;
  return name ? titleCaseIfShouting(name) : 'Unknown location';
}

function eventCode(ev: DcsaEvent): string | null {
  if (ev.eventType === 'EQUIPMENT') return ev.equipmentEventTypeCode ?? null;
  if (ev.eventType === 'TRANSPORT') return ev.transportEventTypeCode ?? null;
  return null;
}

function eventLabel(ev: DcsaEvent): string {
  const code = eventCode(ev) ?? '';
  if (ev.eventType === 'EQUIPMENT') {
    const empty = ev.emptyIndicatorCode === 'EMPTY';
    if (code === 'GTOT' && empty) return 'Empty gate out';
    if (code === 'GTIN' && empty) return 'Empty returned';
    return EQUIPMENT_LABEL[code] ?? titleCaseIfShouting(code);
  }
  return TRANSPORT_LABEL[code] ?? titleCaseIfShouting(code);
}

function voyageOf(tc: DcsaTransportCall | undefined): string {
  return tc?.exportVoyageNumber ?? tc?.carrierVoyageNumber ?? tc?.importVoyageNumber ?? '';
}

/**
 * Convert an ISO 6346 size/type code (e.g. "45G1") or a carrier short form
 * (e.g. "40HC", "22GP") into the app's display form ("40HC", "20GP", "40RF").
 */
export function sizeTypeFromIso(code: string | undefined): string {
  if (!code) return '—';
  const c = code.toUpperCase().replace(/\s/g, '');
  const m = c.match(/^([24LM])([0-9A-Z])([A-Z])([0-9A-Z])$/);
  if (!m) return c;
  const [, len, height, type] = m as unknown as [string, string, string, string, string];
  const feet = len === '2' ? '20' : len === '4' ? '40' : len === 'L' ? '45' : '48';
  const highCube = ['5', 'E', 'H', 'C'].includes(height);
  const kind: Record<string, string> = { G: 'GP', V: 'VH', R: 'RF', U: 'OT', P: 'FR', T: 'TK', B: 'BK', S: 'LV', A: 'AC', H: 'RF' };
  const k = kind[type] ?? 'GP';
  if (k === 'GP' && (highCube || c.endsWith('HC'))) return `${feet}HC`;
  if (c.endsWith('HC')) return `${feet}HC`;
  return `${feet}${k}`;
}

interface Timed {
  ev: DcsaEvent;
  t: number;
  actual: boolean;
  code: string;
  location: string;
  vessel?: DcsaVessel;
  voyage: string;
}

/**
 * Build a `Container` from a DCSA event list. Returns null when the events
 * contain nothing usable (no equipment or transport events).
 */
export function containerFromDcsaEvents(
  containerNumber: string,
  events: DcsaEvent[],
  options: { carrier: string; sourceName: string; fetchedAt?: string; resolveLocode?: LocodeResolver },
): Container | null {
  const resolve: LocodeResolver = options.resolveLocode ?? (() => null);
  const timed: Timed[] = [];
  for (const ev of events) {
    if (ev.eventType !== 'EQUIPMENT' && ev.eventType !== 'TRANSPORT') continue;
    const code = eventCode(ev);
    if (!code) continue;
    const t = Date.parse(ev.eventDateTime);
    if (!Number.isFinite(t)) continue;
    timed.push({ ev, t, actual: ev.eventClassifierCode === 'ACT', code, location: locationName(ev, resolve), vessel: ev.transportCall?.vessel, voyage: voyageOf(ev.transportCall) });
  }
  if (timed.length === 0) return null;

  // When an actual event exists for the same code + location + vessel, drop its planned/estimated twins.
  const key = (x: Timed) => `${x.code}|${x.location}|${x.vessel?.vesselIMONumber ?? x.vessel?.vesselName ?? ''}|${x.ev.emptyIndicatorCode ?? ''}`;
  const actualKeys = new Set(timed.filter((x) => x.actual).map(key));
  const deduped = timed.filter((x) => x.actual || !actualKeys.has(key(x)));
  // Keep only the latest planned/estimated twin when a plan was revised.
  const latestPlanned = new Map<string, Timed>();
  for (const x of deduped) if (!x.actual) {
    const k = key(x);
    const prev = latestPlanned.get(k);
    if (!prev || (x.ev.eventCreatedDateTime ?? '') >= (prev.ev.eventCreatedDateTime ?? '')) latestPlanned.set(k, x);
  }
  const list = deduped.filter((x) => x.actual || latestPlanned.get(key(x)) === x).sort((a, b) => a.t - b.t || Number(b.actual) - Number(a.actual));

  const actuals = list.filter((x) => x.actual);
  const lastActual = actuals[actuals.length - 1];

  // Vessel legs from LOAD / DISC events (any classifier).
  const loads = list.filter((x) => x.code === 'LOAD');
  const discs = list.filter((x) => x.code === 'DISC');
  const firstLoad = loads[0];
  const lastDisc = discs[discs.length - 1];
  const route: string[] = [];
  for (const x of list) if ((x.code === 'LOAD' || x.code === 'DISC') && !route.includes(x.location)) route.push(x.location);

  // Current / next vessel: the last actual LOAD not yet followed by an actual DISC, else the next planned LOAD, else the last vessel seen.
  let onBoard: Timed | undefined;
  for (const x of actuals) {
    if (x.code === 'LOAD') onBoard = x;
    else if (x.code === 'DISC') onBoard = undefined;
  }
  const nextLoad = loads.find((x) => !x.actual && (!lastActual || x.t >= lastActual.t));
  const vesselLeg = onBoard ?? nextLoad ?? [...list].reverse().find((x) => x.vessel?.vesselName) ?? firstLoad;
  const vesselName = vesselLeg?.vessel?.vesselName ? titleCaseIfShouting(vesselLeg.vessel.vesselName).toUpperCase() : '—';
  const vesselImo = vesselLeg?.vessel?.vesselIMONumber;
  const voyage = vesselLeg?.voyage || '—';

  const portOfLoading = firstLoad?.location ?? route[0] ?? actuals[0]?.location ?? '—';
  const portOfDischarge = lastDisc?.location ?? route[route.length - 1] ?? '—';

  // Status from the latest actual event.
  let status: ContainerStatus = 'Empty – Booked';
  if (lastActual) {
    const c = lastActual.code;
    const empty = lastActual.ev.emptyIndicatorCode === 'EMPTY';
    const laterPlannedLoad = loads.some((x) => !x.actual && x.t > lastActual.t);
    if (c === 'GTOT' && empty) status = 'Empty – Booked';
    else if (c === 'GTIN' && empty && actuals.some((x) => x.code === 'DISC')) status = 'Delivered';
    else if (c === 'STRP') status = 'Delivered';
    else if (c === 'GTIN' || c === 'STUF' || c === 'PICK') status = 'Gate In';
    else if (c === 'LOAD') status = 'Loaded';
    else if (c === 'DEPA' || c === 'ARRI') status = onBoard ? 'In Transit' : lastActual.location === portOfDischarge ? 'Discharged' : 'In Transit';
    else if (c === 'DISC') status = laterPlannedLoad || lastActual.location !== portOfDischarge ? 'Transshipment' : 'Discharged';
    else if (c === 'GTOT' || c === 'DROP' || c === 'AVPU') status = 'Gate Out';
    else status = onBoard ? 'In Transit' : 'Gate In';
  }

  // ETA: the DISC or ARRI at the port of discharge (actual time when it has happened).
  const podEvent = [...list].reverse().find((x) => x.location === portOfDischarge && (x.code === 'DISC' || x.code === 'ARRI'));
  const estimatedArrival = new Date(podEvent?.t ?? list[list.length - 1]!.t).toISOString();

  const currentLocation =
    status === 'In Transit' && onBoard
      ? `Aboard ${vesselName} → ${discs.find((x) => x.t > onBoard!.t)?.location ?? portOfDischarge}`
      : (lastActual?.location ?? firstLoad?.location ?? '—');

  const milestones: ContainerMilestone[] = list.map((x) => ({
    location: x.location,
    event: eventLabel(x.ev) + (x.vessel?.vesselName && (x.code === 'LOAD' || x.code === 'DISC' || x.code === 'ARRI' || x.code === 'DEPA') ? ` · ${titleCaseIfShouting(x.vessel.vesselName).toUpperCase()}${x.voyage ? ` ${x.voyage}` : ''}` : ''),
    ...(x.actual ? { timestamp: new Date(x.t).toISOString() } : {}),
    state: x.actual ? 'completed' : 'upcoming',
  }));
  const lastCompleted = milestones.map((m) => m.state).lastIndexOf('completed');
  if (lastCompleted >= 0) milestones[lastCompleted]!.state = 'current';

  const docRef = (type: string) => {
    for (const ev of events) for (const d of ev.documentReferences ?? []) if (d.documentReferenceType === type && d.documentReferenceValue) return d.documentReferenceValue;
    return undefined;
  };
  const iso = events.find((e) => e.ISOEquipmentCode)?.ISOEquipmentCode;
  const bookingReference = docRef('BKG');

  return {
    containerNumber,
    sizeType: sizeTypeFromIso(iso),
    status,
    vesselName,
    voyage,
    portOfLoading,
    portOfDischarge,
    currentLocation,
    estimatedArrival,
    route,
    milestones,
    billOfLading: docRef('TRD') ?? '—',
    ...(bookingReference ? { bookingReference } : {}),
    carrier: options.carrier,
    ...(vesselImo ? { vesselImo } : {}),
    ...(lastActual ? { lastEventAt: new Date(lastActual.t).toISOString() } : {}),
    demo: false,
    source: { name: options.sourceName, fetchedAt: options.fetchedAt ?? new Date().toISOString(), eventCount: events.length },
  };
}
