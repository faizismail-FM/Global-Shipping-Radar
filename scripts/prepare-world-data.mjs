// Downloads Natural Earth 1:110m country polygons and writes a compact GeoJSON
// used by the offline fallback map style (public/data/world-110m.geojson).
// Run with: npm run data:world
import { writeFile, mkdir } from 'node:fs/promises';

const SOURCE =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';

const round = (n) => Math.round(n * 100) / 100;

function roundCoords(coords) {
  if (typeof coords[0] === 'number') return coords.map(round);
  return coords.map(roundCoords);
}

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`Failed to download world data: ${res.status}`);
const geo = await res.json();

const compact = {
  type: 'FeatureCollection',
  features: geo.features.map((f) => ({
    type: 'Feature',
    properties: { name: f.properties.NAME ?? f.properties.name ?? '' },
    geometry: { type: f.geometry.type, coordinates: roundCoords(f.geometry.coordinates) },
  })),
};

await mkdir('public/data', { recursive: true });
await writeFile('public/data/world-110m.geojson', JSON.stringify(compact));
console.log(`Wrote public/data/world-110m.geojson (${compact.features.length} features)`);
