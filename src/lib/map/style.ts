import type { StyleSpecification } from 'maplibre-gl';
import type { Theme } from '@/types';
import { BASEMAP_PALETTES } from './basemapTheme';

export const DEFAULT_DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
export const DEFAULT_LIGHT_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

/** Glyph endpoint used by the bundled fallback style (labels are optional if offline). */
const FALLBACK_GLYPHS = 'https://tiles.basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf';

export const LABEL_FONT = ['Montserrat Medium', 'Open Sans Bold', 'Noto Sans Regular'];

/**
 * Resolve the basemap style for a theme.
 * - `PUBLIC_MAP_STYLE_URL` / `PUBLIC_MAP_STYLE_URL_LIGHT` override the defaults.
 * - The literal value `local` forces the bundled offline style.
 */
export function resolveStyle(theme: Theme): string | StyleSpecification {
  const env = import.meta.env as Record<string, string | undefined>;
  const configured = theme === 'dark' ? env.PUBLIC_MAP_STYLE_URL : env.PUBLIC_MAP_STYLE_URL_LIGHT;
  if (configured === 'local') return buildLocalStyle(theme);
  if (configured && configured.trim()) return configured.trim();
  return theme === 'dark' ? DEFAULT_DARK_STYLE : DEFAULT_LIGHT_STYLE;
}

/**
 * Minimal self-contained style rendered from bundled Natural Earth 1:110m
 * country polygons. Used when the remote basemap cannot be loaded (offline,
 * blocked CDN) so the application never shows a blank map.
 */
export function buildLocalStyle(theme: Theme): StyleSpecification {
  const p = BASEMAP_PALETTES[theme];
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
  return {
    version: 8,
    name: `Global Shipping Radar fallback (${theme})`,
    glyphs: FALLBACK_GLYPHS,
    sources: {
      world: { type: 'geojson', data: `${base}data/world-110m.geojson` },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': p.ocean } },
      {
        id: 'land',
        type: 'fill',
        source: 'world',
        paint: { 'fill-color': p.land, 'fill-opacity': 1 },
      },
      {
        id: 'coastline',
        type: 'line',
        source: 'world',
        paint: { 'line-color': p.coastline, 'line-width': 0.8 },
      },
      {
        id: 'country-labels',
        type: 'symbol',
        source: 'world',
        minzoom: 2.5,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': LABEL_FONT,
          'text-size': 10,
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.1,
        },
        paint: { 'text-color': p.labelMuted, 'text-opacity': 0.9 },
      },
    ],
  };
}

export function isLocalStyle(style: string | StyleSpecification): boolean {
  return typeof style !== 'string';
}
