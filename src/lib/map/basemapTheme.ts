import type { Map as MapLibreMap } from 'maplibre-gl';
import type { Theme } from '@/types';

/**
 * Maritime re-theme applied on top of the loaded basemap.
 *
 * The free CARTO styles ship as neutral grey cartography. Ships and ports
 * read far better on a nautical palette (blue ocean, muted land, quiet
 * borders), so after every style load we repaint the well-known layers by id
 * and type. The pass is best-effort: layers that don't exist in a custom style
 * are simply skipped.
 */

export interface BasemapPalette {
  ocean: string;
  oceanDeep: string;
  land: string;
  landAlt: string;
  park: string;
  building: string;
  waterway: string;
  coastline: string;
  borderStrong: string;
  borderSoft: string;
  road: string;
  roadMajor: string;
  label: string;
  labelMuted: string;
  labelOcean: string;
  labelContinent: string;
  halo: string;
}

export const BASEMAP_PALETTES: Record<Theme, BasemapPalette> = {
  dark: {
    ocean: '#0b1a2b',
    oceanDeep: '#08131f',
    land: '#1b2839',
    landAlt: '#1f2d40',
    park: '#1c2e3d',
    building: '#243448',
    waterway: '#173248',
    coastline: '#2c4762',
    borderStrong: 'rgba(129, 154, 184, 0.42)',
    borderSoft: 'rgba(129, 154, 184, 0.18)',
    road: '#28394f',
    roadMajor: '#334761',
    label: '#a9bbd1',
    labelMuted: '#6f849e',
    labelOcean: '#3f6383',
    labelContinent: '#5f7d9c',
    halo: '#0b1a2b',
  },
  light: {
    ocean: '#c9dcec',
    oceanDeep: '#b9d0e5',
    land: '#f3f2ec',
    landAlt: '#ecebe4',
    park: '#e4ebdd',
    building: '#e2e1da',
    waterway: '#a9c5dc',
    coastline: '#9db6cc',
    borderStrong: 'rgba(84, 106, 134, 0.42)',
    borderSoft: 'rgba(84, 106, 134, 0.2)',
    road: '#ffffff',
    roadMajor: '#f7e9c9',
    label: '#3f5570',
    labelMuted: '#6f8399',
    labelOcean: '#6f95b8',
    labelContinent: '#5b7692',
    halo: '#f3f2ec',
  },
};

type Rule = { test: (id: string, type: string) => boolean; apply: (map: MapLibreMap, id: string, p: BasemapPalette) => void };

const set = (map: MapLibreMap, id: string, prop: string, value: unknown) => {
  try {
    map.setPaintProperty(id, prop as never, value as never);
  } catch {
    /* property not applicable to this layer – ignore */
  }
};

const RULES: Rule[] = [
  { test: (_id, type) => type === 'background', apply: (m, id, p) => set(m, id, 'background-color', p.land) },
  { test: (id) => id === 'water', apply: (m, id, p) => { set(m, id, 'fill-color', p.ocean); set(m, id, 'fill-opacity', 1); } },
  { test: (id) => id === 'water_shadow', apply: (m, id, p) => { set(m, id, 'fill-color', p.oceanDeep); set(m, id, 'fill-opacity', 0.6); } },
  { test: (id, type) => type === 'line' && /^waterway/.test(id), apply: (m, id, p) => set(m, id, 'line-color', p.waterway) },
  { test: (id, type) => type === 'fill' && /^(landcover|landuse$)/.test(id), apply: (m, id, p) => { set(m, id, 'fill-color', p.landAlt); set(m, id, 'fill-opacity', 0.9); } },
  { test: (id, type) => type === 'fill' && /^park_/.test(id), apply: (m, id, p) => { set(m, id, 'fill-color', p.park); set(m, id, 'fill-opacity', 0.9); } },
  { test: (id, type) => type === 'fill' && /residential/.test(id), apply: (m, id) => set(m, id, 'fill-opacity', 0) },
  { test: (id, type) => type === 'fill' && /building/.test(id), apply: (m, id, p) => { set(m, id, 'fill-color', p.building); set(m, id, 'fill-opacity', 0.8); } },
  { test: (id) => id === 'boundary_country_outline', apply: (m, id, p) => { set(m, id, 'line-color', p.land); set(m, id, 'line-opacity', 0.9); } },
  { test: (id) => id === 'boundary_country_inner', apply: (m, id, p) => { set(m, id, 'line-color', p.borderStrong); set(m, id, 'line-dasharray', [1]); } },
  { test: (id) => /^boundary_(state|county)/.test(id), apply: (m, id, p) => set(m, id, 'line-color', p.borderSoft) },
  { test: (id, type) => type === 'line' && /^(road|highway|bridge|tunnel|rail|aeroway)/.test(id) && !/(motorway|trunk|major|primary)/.test(id), apply: (m, id, p) => set(m, id, 'line-color', p.road) },
  { test: (id, type) => type === 'line' && /^(road|highway|bridge|tunnel)/.test(id) && /(motorway|trunk|major|primary)/.test(id), apply: (m, id, p) => set(m, id, 'line-color', p.roadMajor) },
  { test: (id, type) => type === 'symbol' && /^watername_(ocean|sea)/.test(id), apply: (m, id, p) => { set(m, id, 'text-color', p.labelOcean); set(m, id, 'text-halo-color', p.ocean); set(m, id, 'text-halo-width', 0.8); } },
  { test: (id, type) => type === 'symbol' && /^(watername_lake|waterway_label)/.test(id), apply: (m, id, p) => { set(m, id, 'text-color', p.labelOcean); set(m, id, 'text-halo-color', p.land); } },
  { test: (id, type) => type === 'symbol' && id === 'place_continent', apply: (m, id, p) => { set(m, id, 'text-color', p.labelContinent); set(m, id, 'text-halo-color', p.halo); set(m, id, 'text-opacity', 0.85); } },
  { test: (id, type) => type === 'symbol' && /^place_(country|state)/.test(id), apply: (m, id, p) => { set(m, id, 'text-color', p.labelMuted); set(m, id, 'text-halo-color', p.land); set(m, id, 'text-halo-width', 1); } },
  { test: (id, type) => type === 'symbol' && /^place_/.test(id), apply: (m, id, p) => { set(m, id, 'text-color', p.label); set(m, id, 'text-halo-color', p.land); set(m, id, 'text-halo-width', 1); } },
  { test: (id, type) => type === 'symbol' && /^(roadname|housenumber|poi_)/.test(id), apply: (m, id, p) => { set(m, id, 'text-color', p.labelMuted); set(m, id, 'text-halo-color', p.land); } },
];

/** Repaint the current basemap into the maritime palette for the theme. */
export function applyBasemapTheme(map: MapLibreMap, theme: Theme): void {
  const style = map.getStyle();
  if (!style?.layers) return;
  const palette = BASEMAP_PALETTES[theme];
  for (const layer of style.layers) {
    if (layer.id.startsWith('gsr-')) continue;
    const rule = RULES.find((r) => r.test(layer.id, layer.type));
    if (rule) rule.apply(map, layer.id, palette);
  }
}
