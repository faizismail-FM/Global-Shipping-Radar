/**
 * Headless soak test for the SimulationEngine: runs thousands of ticks and
 * asserts that every vessel keeps valid coordinates, speeds and statuses.
 * Run with: npm run test:sim
 */
import { generateFleet } from '../src/data/vessels';
import { PORTS } from '../src/data/ports';
import { SimulationEngine } from '../src/lib/simulation/engine';
import { LANES } from '../src/data/lanes';
import { CONTAINERS } from '../src/data/containers';
import { isValidContainerNumber, isValidImo } from '../src/lib/identifiers';

const TICKS = Number(process.argv[2] ?? 3000);
const { vessels, nav } = generateFleet({ now: Date.now(), hoursPerTick: 1 });
const engine = new SimulationEngine({ vessels, ports: PORTS.map((p) => ({ ...p })), nav, config: { hoursPerTick: 1, intervalMs: 1000 } });

let problems = 0;
const fail = (msg: string) => {
  problems++;
  if (problems <= 20) console.error('FAIL', msg);
};

console.log(`Fleet: ${vessels.length} vessels, ${PORTS.length} ports, ${LANES.length} lanes, ${CONTAINERS.length} demo containers`);
for (const v of vessels) if (!isValidImo(v.imo)) fail(`invalid IMO ${v.imo} for ${v.name}`);
for (const c of CONTAINERS) if (!isValidContainerNumber(c.containerNumber)) fail(`invalid container check digit ${c.containerNumber}`);

const statusCounts = () => {
  const s = engine.store.getState();
  const counts: Record<string, number> = {};
  for (const v of s.vessels) counts[v.status] = (counts[v.status] ?? 0) + 1;
  return counts;
};

let arrivals = 0;
let departures = 0;
let zone = 0;
const seenEvents = new Set<string>();
const start = performance.now();
for (let i = 0; i < TICKS; i++) {
  engine.tick();
  const s = engine.store.getState();
  for (const v of s.vessels) {
    if (!Number.isFinite(v.latitude) || !Number.isFinite(v.longitude)) fail(`${v.name} NaN position at tick ${i}`);
    if (Math.abs(v.latitude) > 90 || Math.abs(v.longitude) > 180) fail(`${v.name} out of range (${v.latitude}, ${v.longitude}) at tick ${i}`);
    if (!Number.isFinite(v.speed) || v.speed < 0 || v.speed > 30) fail(`${v.name} bad speed ${v.speed}`);
    if (!Number.isFinite(v.heading) || v.heading < 0 || v.heading > 360) fail(`${v.name} bad heading ${v.heading}`);
    if (Number.isNaN(new Date(v.eta).getTime())) fail(`${v.name} bad eta ${v.eta}`);
    if (v.route.length < 2) fail(`${v.name} route too short`);
    if (v.status === 'underway' && v.speed < 5) fail(`${v.name} underway but speed ${v.speed}`);
  }
  for (const e of s.events) {
    if (seenEvents.has(e.id)) continue;
    seenEvents.add(e.id);
    if (e.kind === 'arrived') arrivals++;
    if (e.kind === 'departed') departures++;
    if (e.kind === 'zone-enter') zone++;
  }
  if (problems > 50) break;
}
const ms = performance.now() - start;
const s = engine.store.getState();
console.log(`Ran ${s.tick} ticks in ${ms.toFixed(0)} ms (${(ms / s.tick).toFixed(2)} ms/tick)`);
console.log('Status counts:', statusCounts());
console.log(`Events seen — arrivals: ${arrivals}, departures: ${departures}, zone entries: ${zone}, alerts now: ${s.alerts.length}`);
console.log(`Ports with high congestion: ${s.ports.filter((p) => p.congestion === 'high').length}`);
if (problems > 0) {
  console.error(`${problems} problem(s) found`);
  process.exit(1);
}
console.log('OK');
