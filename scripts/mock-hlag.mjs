// Local stand-in for the Hapag-Lloyd Track & Trace API (DCSA T&T v2.2) used to
// test the container tracking relay without real credentials.
// Usage: node scripts/mock-hlag.mjs [port]   (expects client id "test-id" and secret "test-secret")
// Prints the container numbers it knows (valid ISO 6346 check digits) at startup.
//   HLAG_CLIENT_ID=test-id HLAG_CLIENT_SECRET=test-secret HLAG_API_BASE=http://127.0.0.1:9124/hlag/external/v2 npm run dev
import http from 'node:http';

const port = Number(process.argv[2] ?? 9124);

// ISO 6346 check digit so the mock numbers pass the app's validation.
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const VALUES = [10, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 34, 35, 36, 37, 38];
const withCheck = (p10) => {
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const ch = p10[i];
    sum += (/[A-Z]/.test(ch) ? VALUES[LETTERS.indexOf(ch)] : Number(ch)) * 2 ** i;
  }
  return p10 + ((sum % 11) % 10);
};

const H = 3_600_000;
const now = Date.now();
const iso = (t) => new Date(t).toISOString();
const call = (locode, name, vessel, imo, voyage, extra = {}) => ({
  transportCallID: `${locode}-${voyage}`,
  UNLocationCode: locode,
  facilityTypeCode: 'POTE',
  modeOfTransport: 'VESSEL',
  location: { locationName: name, UNLocationCode: locode },
  vessel: { vesselIMONumber: imo, vesselName: vessel, vesselOperatorCarrierCode: 'HLCU' },
  exportVoyageNumber: voyage,
  ...extra,
});
const docs = (bkg, trd) => [
  { documentReferenceType: 'BKG', documentReferenceValue: bkg },
  { documentReferenceType: 'TRD', documentReferenceValue: trd },
];
let seq = 0;
const ev = (type, cls, t, fields) => ({
  eventID: `evt-${++seq}`,
  eventType: type,
  eventClassifierCode: cls,
  eventDateTime: iso(t),
  eventCreatedDateTime: iso(Math.min(t, now)),
  ...fields,
});
const eq = (cls, t, code, ref, tc, empty = 'LADEN') => ev('EQUIPMENT', cls, t, { equipmentEventTypeCode: code, equipmentReference: ref, ISOEquipmentCode: '45G1', emptyIndicatorCode: empty, transportCall: tc, documentReferences: docs('HLBK12345678', 'HLCUSHA2409ABC123') });
const tr = (cls, t, code, tc) => ev('TRANSPORT', cls, t, { transportEventTypeCode: code, transportCall: tc, documentReferences: docs('HLBK12345678', 'HLCUSHA2409ABC123') });

// Scenario 1: in transit after a transshipment in Singapore, ETA Hamburg in 9 days.
const IN_TRANSIT = withCheck('HLCU458511');
const sha = call('CNSHA', 'SHANGHAI', 'BERLIN EXPRESS', '9540118', '091W');
const sinA = call('SGSIN', 'SINGAPORE', 'BERLIN EXPRESS', '9540118', '091W');
const sinB = call('SGSIN', 'SINGAPORE', 'HAMBURG EXPRESS', '9540120', '012W');
const ham = call('DEHAM', 'HAMBURG', 'HAMBURG EXPRESS', '9540120', '012W');
const inTransit = [
  ev('SHIPMENT', 'ACT', now - 30 * 24 * H, { shipmentEventTypeCode: 'CONF', documentTypeCode: 'BKG', documentID: 'HLBK12345678' }),
  eq('ACT', now - 26 * 24 * H, 'GTOT', IN_TRANSIT, { ...sha, vessel: undefined, modeOfTransport: 'TRUCK' }, 'EMPTY'),
  eq('ACT', now - 23 * 24 * H, 'GTIN', IN_TRANSIT, { ...sha, vessel: undefined, modeOfTransport: 'TRUCK' }),
  eq('ACT', now - 21 * 24 * H, 'LOAD', IN_TRANSIT, sha),
  tr('ACT', now - 21 * 24 * H + 6 * H, 'DEPA', sha),
  tr('ACT', now - 14 * 24 * H, 'ARRI', sinA),
  eq('ACT', now - 14 * 24 * H + 5 * H, 'DISC', IN_TRANSIT, sinA),
  eq('ACT', now - 11 * 24 * H, 'LOAD', IN_TRANSIT, sinB),
  tr('ACT', now - 11 * 24 * H + 4 * H, 'DEPA', sinB),
  tr('EST', now + 9 * 24 * H, 'ARRI', ham),
  eq('PLN', now + 9 * 24 * H + 8 * H, 'DISC', IN_TRANSIT, ham),
  eq('PLN', now + 11 * 24 * H, 'GTOT', IN_TRANSIT, { ...ham, vessel: undefined, modeOfTransport: 'TRUCK' }),
];

// Scenario 2: delivered (empty returned) Rotterdam → New York.
const DELIVERED = withCheck('HLXU812345');
const rtm = call('NLRTM', 'ROTTERDAM', 'NEW YORK EXPRESS', '9501344', '028W');
const nyc = call('USNYC', 'NEW YORK', 'NEW YORK EXPRESS', '9501344', '028W');
const delivered = [
  eq('ACT', now - 40 * 24 * H, 'GTIN', DELIVERED, { ...rtm, vessel: undefined, modeOfTransport: 'TRUCK' }),
  eq('ACT', now - 38 * 24 * H, 'LOAD', DELIVERED, rtm),
  tr('ACT', now - 38 * 24 * H + 3 * H, 'DEPA', rtm),
  tr('ACT', now - 27 * 24 * H, 'ARRI', nyc),
  eq('ACT', now - 27 * 24 * H + 7 * H, 'DISC', DELIVERED, nyc),
  eq('ACT', now - 25 * 24 * H, 'GTOT', DELIVERED, { ...nyc, vessel: undefined, modeOfTransport: 'TRUCK' }),
  eq('ACT', now - 20 * 24 * H, 'GTIN', DELIVERED, { ...nyc, vessel: undefined, modeOfTransport: 'TRUCK' }, 'EMPTY'),
];

const ERROR = withCheck('HLCU000000');
const UNKNOWN = withCheck('HLCU999999');
const DATA = new Map([[IN_TRANSIT, inTransit], [DELIVERED, delivered]]);

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const send = (status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
  if (url.pathname !== '/hlag/external/v2/events') return send(404, { httpCode: '404', httpMessage: 'Not Found' });
  if (req.headers['x-ibm-client-id'] !== 'test-id' || req.headers['x-ibm-client-secret'] !== 'test-secret') {
    return send(401, { httpCode: '401', httpMessage: 'Unauthorized', moreInformation: 'Invalid client id or secret.' });
  }
  const ref = (url.searchParams.get('equipmentReference') ?? '').toUpperCase();
  if (ref === ERROR) return send(500, { httpCode: '500', httpMessage: 'Internal Server Error', moreInformation: 'Backend unavailable' });
  const events = DATA.get(ref) ?? [];
  console.log(`[mock hlag] ${ref} -> ${events.length} events`);
  setTimeout(() => send(200, events), 150);
});
server.listen(port, '127.0.0.1', () => {
  console.log(`mock Hapag-Lloyd listening on http://127.0.0.1:${port}/hlag/external/v2/events`);
  console.log(`  in transit: ${IN_TRANSIT}   delivered: ${DELIVERED}   unknown: ${UNKNOWN}   error: ${ERROR}`);
});
