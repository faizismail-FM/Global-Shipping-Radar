import {
  Map as MapLibreMap,
  setWorkerUrl,
  getWorkerUrl,
  type GeoJSONSource,
  type LngLatBoundsLike,
  type MapMouseEvent,
  type StyleSpecification,
} from 'maplibre-gl';
// Explicitly bundle MapLibre's web worker: the library resolves it with a
// dynamic `new URL()` that bundlers cannot trace, which leaves production
// builds without the worker file (tiles would never parse).
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type { FeatureCollection } from 'geojson';
import type { Theme } from '@/types';
import { buildLocalStyle, isLocalStyle, resolveStyle, LABEL_FONT } from './style';
import { applyBasemapTheme, BASEMAP_PALETTES } from './basemapTheme';
import { createVesselIcons } from './icons';
import { EMPTY_FC, graticuleGeoJSON } from './geojson';
import type { LngLat } from '@/lib/geo';

export interface SceneCallbacks {
  onReady: (fallback: boolean) => void;
  onHoverVessel: (id: string | null, point: { x: number; y: number } | null) => void;
  onClickVessel: (id: string) => void;
  onClickPort: (id: string) => void;
  onClickEmpty: () => void;
}

export interface LayerToggles {
  vessels: boolean;
  ports: boolean;
  routes: boolean;
  heatmap: boolean;
  labels: boolean;
}

export const WORLD_VIEW = { center: [20, 22] as [number, number], zoom: 1.65, bearing: 0, pitch: 0 };

/** Zoom level that fits the full longitude range into the given width. */
export function worldZoomForWidth(width: number): number {
  if (!width) return WORLD_VIEW.zoom;
  return Math.max(1.2, Math.min(2.2, Math.log2(width / 512) - 0.02));
}

const SRC = {
  graticule: 'gsr-graticule',
  lanes: 'gsr-lanes',
  laneHighlight: 'gsr-lane-highlight',
  routeDone: 'gsr-route-done',
  route: 'gsr-route',
  ports: 'gsr-ports',
  vessels: 'gsr-vessels',
} as const;

const palette = (theme: Theme) =>
  theme === 'dark'
    ? {
        graticule: '#7ea2c9',
        lane: '#4cc3de',
        laneHighlight: '#7ee8ff',
        routeDone: '#9fb3c8',
        route: '#38e1ff',
        selected: '#38e1ff',
        label: '#d3dfee',
        labelHalo: BASEMAP_PALETTES.dark.ocean,
        portLabel: '#a9bbd1',
        portStroke: BASEMAP_PALETTES.dark.ocean,
        low: '#34d399',
        medium: '#fbbf24',
        high: '#fb7185',
      }
    : {
        graticule: '#3f6a94',
        lane: '#2d7ea3',
        laneHighlight: '#0369a1',
        routeDone: '#64748b',
        route: '#0369a1',
        selected: '#0369a1',
        label: '#14283d',
        labelHalo: '#ffffff',
        portLabel: '#2e4761',
        portStroke: '#ffffff',
        low: '#059669',
        medium: '#d97706',
        high: '#e11d48',
      };

/**
 * MapScene owns the MapLibre instance and all radar layers. It keeps its own
 * copy of the latest data so layers can be rebuilt after a style switch.
 */
export class MapScene {
  readonly map: MapLibreMap;
  private theme: Theme;
  private callbacks: SceneCallbacks;
  private data: Record<keyof typeof SRC, FeatureCollection> = {
    graticule: graticuleGeoJSON(10),
    lanes: EMPTY_FC,
    laneHighlight: EMPTY_FC,
    routeDone: EMPTY_FC,
    route: EMPTY_FC,
    ports: EMPTY_FC,
    vessels: EMPTY_FC,
  };
  private toggles: LayerToggles = { vessels: true, ports: true, routes: true, heatmap: false, labels: true };
  private selectedVesselId: string | null = null;
  private usingFallback = false;
  private destroyed = false;
  private pulseFrame: number | null = null;
  private pulseStart = 0;
  private styleErrorHandled = false;
  /** Extra right-hand padding (px) so camera moves avoid the detail panel. */
  private paddingRight = 0;

  constructor(container: HTMLElement, theme: Theme, callbacks: SceneCallbacks) {
    if (!getWorkerUrl()) setWorkerUrl(maplibreWorkerUrl);
    this.theme = theme;
    this.callbacks = callbacks;
    const style = resolveStyle(theme);
    this.usingFallback = isLocalStyle(style);
    this.map = new MapLibreMap({
      container,
      style,
      center: WORLD_VIEW.center,
      zoom: worldZoomForWidth(container.clientWidth),
      minZoom: 1.2,
      maxZoom: 14,
      attributionControl: { compact: true },
      renderWorldCopies: true,
      fadeDuration: 150,
      dragRotate: true,
      pitchWithRotate: true,
      touchPitch: false,
      // preserveDrawingBuffer is only needed for screenshot tooling (?qa=1), it costs GPU memory otherwise.
      canvasContextAttributes: { antialias: true, preserveDrawingBuffer: new URLSearchParams(window.location.search).has('qa') },
    });
    this.map.touchZoomRotate.enableRotation();
    this.map.on('style.load', () => this.onStyleLoad());
    this.map.on('error', (e) => this.onError(e as unknown as { error?: Error; sourceId?: string }));
    this.bindInteractions();
  }

  // ---------------------------------------------------------------------------
  // Style lifecycle
  // ---------------------------------------------------------------------------

  private onError(e: { error?: Error; sourceId?: string }) {
    if (this.destroyed) return;
    // A failed style request (offline / blocked CDN) → switch to the bundled fallback.
    const isStyleLoaded = this.map.isStyleLoaded();
    const msg = e.error?.message ?? '';
    const looksLikeStyleFailure =
      !this.usingFallback && !isStyleLoaded && !this.styleErrorHandled && (!e.sourceId || /style/i.test(msg) || /fetch/i.test(msg));
    if (looksLikeStyleFailure) {
      this.styleErrorHandled = true;
      this.usingFallback = true;
      console.warn('[GSR] Basemap style could not be loaded, using bundled fallback style.', msg);
      this.map.setStyle(buildLocalStyle(this.theme));
    } else if (!/glyph|font|sprite|tile/i.test(msg) && e.error) {
      // Tile / glyph failures are non-fatal (individual features simply do not render).
      console.warn('[GSR] Map error', e.error);
    }
  }

  private onStyleLoad() {
    if (this.destroyed) return;
    // The bundled fallback is authored in the palette already; remote basemaps get repainted.
    if (!this.usingFallback) applyBasemapTheme(this.map, this.theme);
    this.addImages();
    this.ensureSources();
    this.ensureLayers();
    this.applyToggles();
    this.applySelection();
    this.callbacks.onReady(this.usingFallback);
  }

  setTheme(theme: Theme) {
    if (theme === this.theme) return;
    this.theme = theme;
    const style = this.usingFallback ? buildLocalStyle(theme) : resolveStyle(theme);
    // Full reload rather than a style diff: the diff can stall against our
    // repainted basemap layers, and every radar layer is rebuilt on style.load anyway.
    this.map.setStyle(style, { diff: false });
  }

  private addImages() {
    for (const icon of createVesselIcons(this.theme)) {
      if (this.map.hasImage(icon.name)) this.map.removeImage(icon.name);
      this.map.addImage(icon.name, icon.data, { pixelRatio: icon.pixelRatio });
    }
  }

  private ensureSources() {
    (Object.keys(SRC) as (keyof typeof SRC)[]).forEach((key) => {
      const id = SRC[key];
      if (!this.map.getSource(id)) {
        this.map.addSource(id, { type: 'geojson', data: this.data[key], generateId: key === 'vessels' || key === 'ports' ? false : true });
      }
    });
  }

  private ensureLayers() {
    const c = palette(this.theme);
    const m = this.map;
    const add = (layer: Parameters<MapLibreMap['addLayer']>[0]) => {
      if (!m.getLayer(layer.id)) m.addLayer(layer);
    };

    // Graticule sits beneath everything radar-related; barely visible at world
    // view, clearer when zoomed into open water.
    add({
      id: 'gsr-graticule',
      type: 'line',
      source: SRC.graticule,
      paint: {
        'line-color': c.graticule,
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 1, ['case', ['get', 'major'], 0.1, 0.05], 5, ['case', ['get', 'major'], 0.22, 0.12], 9, ['case', ['get', 'major'], 0.3, 0.16]],
        'line-width': ['case', ['get', 'major'], 0.9, 0.6],
      },
    });
    add({
      id: 'gsr-lanes',
      type: 'line',
      source: SRC.lanes,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': c.lane,
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 1, 0.22, 5, 0.3, 9, 0.18],
        'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.9, 4, 1.4, 9, 2.2],
        'line-dasharray': [3, 2.5],
      },
    });
    add({
      id: 'gsr-lane-highlight-glow',
      type: 'line',
      source: SRC.laneHighlight,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': c.laneHighlight, 'line-opacity': 0.25, 'line-width': 9, 'line-blur': 6 },
    });
    add({
      id: 'gsr-lane-highlight',
      type: 'line',
      source: SRC.laneHighlight,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': c.laneHighlight, 'line-opacity': 0.9, 'line-width': 2 },
    });
    add({
      id: 'gsr-route-done',
      type: 'line',
      source: SRC.routeDone,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': c.routeDone, 'line-opacity': 0.55, 'line-width': 1.6, 'line-dasharray': [1, 2] },
    });
    add({
      id: 'gsr-route-glow',
      type: 'line',
      source: SRC.route,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': c.route, 'line-opacity': 0.3, 'line-width': 8, 'line-blur': 6 },
    });
    add({
      id: 'gsr-route',
      type: 'line',
      source: SRC.route,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': c.route, 'line-opacity': 0.95, 'line-width': 2.2 },
    });

    add({
      id: 'gsr-heatmap',
      type: 'heatmap',
      source: SRC.vessels,
      maxzoom: 9,
      paint: {
        'heatmap-weight': ['case', ['==', ['get', 'status'], 'underway'], 0.8, 1],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 1, 0.6, 8, 1.4],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 1, 18, 5, 30, 8, 45],
        'heatmap-opacity': 0.75,
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0,
          'rgba(56,225,255,0)',
          0.2,
          'rgba(56,225,255,0.35)',
          0.5,
          'rgba(45,212,191,0.6)',
          0.8,
          'rgba(251,191,36,0.85)',
          1,
          'rgba(251,113,133,1)',
        ],
      },
    });

    const congestionColor = ['match', ['get', 'congestion'], 'low', c.low, 'medium', c.medium, 'high', c.high, c.low];
    add({
      id: 'gsr-ports-glow',
      type: 'circle',
      source: SRC.ports,
      paint: {
        'circle-color': congestionColor as never,
        'circle-opacity': 0.28,
        'circle-blur': 1,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, ['*', ['get', 'rank'], 3.5], 6, ['*', ['get', 'rank'], 7], 10, 26],
      },
    });
    add({
      id: 'gsr-ports',
      type: 'circle',
      source: SRC.ports,
      paint: {
        'circle-color': congestionColor as never,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, ['+', 1.6, ['get', 'rank']], 6, ['+', 3, ['get', 'rank']], 10, 8],
        'circle-stroke-color': c.portStroke,
        'circle-stroke-width': 1.2,
        'circle-opacity': 0.95,
      },
    });
    add({
      id: 'gsr-port-labels',
      type: 'symbol',
      source: SRC.ports,
      minzoom: 3,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': LABEL_FONT,
        'text-size': ['interpolate', ['linear'], ['zoom'], 3, 10, 8, 12],
        'text-offset': [0, 1.1],
        'text-anchor': 'top',
        'text-letter-spacing': 0.04,
        'text-optional': true,
        'text-padding': 4,
      },
      paint: { 'text-color': c.portLabel, 'text-halo-color': c.labelHalo, 'text-halo-width': 1.2 },
    });

    add({
      id: 'gsr-vessel-selected-glow',
      type: 'circle',
      source: SRC.vessels,
      filter: ['==', ['get', 'id'], '__none__'],
      paint: {
        'circle-color': c.selected,
        'circle-opacity': 0.35,
        'circle-blur': 0.9,
        'circle-radius': 22,
      },
    });
    add({
      id: 'gsr-vessel-selected-ring',
      type: 'circle',
      source: SRC.vessels,
      filter: ['==', ['get', 'id'], '__none__'],
      paint: {
        'circle-color': 'rgba(0,0,0,0)',
        'circle-stroke-color': c.selected,
        'circle-stroke-width': 1.5,
        'circle-stroke-opacity': 0.9,
        'circle-radius': 14,
      },
    });
    add({
      id: 'gsr-vessels',
      type: 'symbol',
      source: SRC.vessels,
      layout: {
        'icon-image': ['get', 'icon'],
        'icon-size': ['interpolate', ['linear'], ['zoom'], 1, 0.5, 3, 0.62, 6, 0.82, 10, 1.15],
        'icon-rotate': ['get', 'heading'],
        'icon-rotation-alignment': 'map',
        'icon-pitch-alignment': 'map',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'symbol-sort-key': ['case', ['==', ['get', 'status'], 'underway'], 0, ['==', ['get', 'status'], 'delayed'], 1, 2],
      },
      paint: {
        'icon-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          1,
          ['match', ['get', 'status'], 'underway', 0.95, 'delayed', 0.95, 0.75],
          6,
          1,
        ],
      },
    });
    add({
      id: 'gsr-vessel-labels',
      type: 'symbol',
      source: SRC.vessels,
      minzoom: 5.5,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': LABEL_FONT,
        'text-size': 10.5,
        'text-offset': [0, 1.3],
        'text-anchor': 'top',
        'text-letter-spacing': 0.03,
        'text-optional': true,
        'text-padding': 2,
        'symbol-sort-key': ['case', ['==', ['get', 'status'], 'underway'], 0, 1],
      },
      paint: { 'text-color': c.label, 'text-halo-color': c.labelHalo, 'text-halo-width': 1.1, 'text-opacity': 0.9 },
    });
  }

  private applyToggles() {
    const vis = (id: string, on: boolean) => {
      if (this.map.getLayer(id)) this.map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    };
    vis('gsr-lanes', this.toggles.routes);
    vis('gsr-ports-glow', this.toggles.ports);
    vis('gsr-ports', this.toggles.ports);
    vis('gsr-port-labels', this.toggles.ports);
    vis('gsr-heatmap', this.toggles.heatmap);
    vis('gsr-vessels', this.toggles.vessels);
    vis('gsr-vessel-labels', this.toggles.vessels && this.toggles.labels);
    vis('gsr-vessel-selected-glow', this.toggles.vessels);
    vis('gsr-vessel-selected-ring', this.toggles.vessels);
  }

  // ---------------------------------------------------------------------------
  // Interactions
  // ---------------------------------------------------------------------------

  private bindInteractions() {
    const m = this.map;
    let hovered: string | null = null;

    // Note: isStyleLoaded() can stay false while tiles stream in, so interaction
    // is gated on our own layers being present instead.
    m.on('mousemove', (e: MapMouseEvent) => {
      if (!m.getLayer('gsr-vessels')) return;
      const features = this.queryAt(e.point, ['gsr-vessels']);
      const id = (features[0]?.properties?.id as string | undefined) ?? null;
      const portHit = id ? [] : this.queryAt(e.point, ['gsr-ports']);
      m.getCanvas().style.cursor = id || portHit.length ? 'pointer' : '';
      if (id !== hovered) {
        hovered = id;
        this.callbacks.onHoverVessel(id, id ? { x: e.point.x, y: e.point.y } : null);
      } else if (id) {
        this.callbacks.onHoverVessel(id, { x: e.point.x, y: e.point.y });
      }
    });
    m.on('mouseout', () => {
      if (hovered) {
        hovered = null;
        this.callbacks.onHoverVessel(null, null);
      }
    });
    m.on('click', (e: MapMouseEvent) => {
      if (!m.getLayer('gsr-vessels')) return;
      const vessel = this.queryAt(e.point, ['gsr-vessels'])[0];
      if (vessel?.properties?.id) {
        this.callbacks.onClickVessel(String(vessel.properties.id));
        return;
      }
      const port = this.queryAt(e.point, ['gsr-ports', 'gsr-port-labels'])[0];
      if (port?.properties?.id) {
        this.callbacks.onClickPort(String(port.properties.id));
        return;
      }
      this.callbacks.onClickEmpty();
    });
    m.on('dragstart', () => this.callbacks.onHoverVessel(null, null));
  }

  private queryAt(point: { x: number; y: number }, layers: string[]) {
    const existing = layers.filter((l) => this.map.getLayer(l));
    if (existing.length === 0) return [];
    const pad = 6;
    return this.map.queryRenderedFeatures(
      [
        [point.x - pad, point.y - pad],
        [point.x + pad, point.y + pad],
      ],
      { layers: existing },
    );
  }

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  private setSourceData(key: keyof typeof SRC, data: FeatureCollection) {
    this.data[key] = data;
    const src = this.map.getSource(SRC[key]) as GeoJSONSource | undefined;
    if (src) src.setData(data);
  }

  setVessels(fc: FeatureCollection) {
    this.setSourceData('vessels', fc);
  }
  setPorts(fc: FeatureCollection) {
    this.setSourceData('ports', fc);
  }
  setLanes(fc: FeatureCollection) {
    this.setSourceData('lanes', fc);
  }
  setLaneHighlight(fc: FeatureCollection) {
    this.setSourceData('laneHighlight', fc);
  }
  setRoute(remaining: FeatureCollection, done: FeatureCollection) {
    this.setSourceData('route', remaining);
    this.setSourceData('routeDone', done);
  }

  setToggles(toggles: LayerToggles) {
    this.toggles = toggles;
    if (this.map.getLayer('gsr-vessels')) this.applyToggles();
  }

  setSelectedVessel(id: string | null) {
    this.selectedVesselId = id;
    this.applySelection();
  }

  private applySelection() {
    const id = this.selectedVesselId ?? '__none__';
    for (const layer of ['gsr-vessel-selected-glow', 'gsr-vessel-selected-ring']) {
      if (this.map.getLayer(layer)) this.map.setFilter(layer, ['==', ['get', 'id'], id]);
    }
    if (this.selectedVesselId) this.startPulse();
    else this.stopPulse();
  }

  private startPulse() {
    if (this.pulseFrame !== null) return;
    this.pulseStart = performance.now();
    const step = (t: number) => {
      if (this.destroyed || !this.selectedVesselId) {
        this.pulseFrame = null;
        return;
      }
      const phase = ((t - this.pulseStart) % 2200) / 2200;
      const radius = 10 + phase * 16;
      const opacity = 0.9 * (1 - phase);
      if (this.map.getLayer('gsr-vessel-selected-ring')) {
        this.map.setPaintProperty('gsr-vessel-selected-ring', 'circle-radius', radius);
        this.map.setPaintProperty('gsr-vessel-selected-ring', 'circle-stroke-opacity', opacity);
      }
      this.pulseFrame = requestAnimationFrame(step);
    };
    this.pulseFrame = requestAnimationFrame(step);
  }

  private stopPulse() {
    if (this.pulseFrame !== null) cancelAnimationFrame(this.pulseFrame);
    this.pulseFrame = null;
  }

  // ---------------------------------------------------------------------------
  // Camera
  // ---------------------------------------------------------------------------

  /**
   * Persistent viewport padding so camera moves keep their target clear of the
   * detail panel. MapLibre combines this with per-call padding, so flyTo /
   * fitBounds only pass their own symmetric margins.
   */
  setPaddingRight(px: number) {
    if (px === this.paddingRight) return;
    this.paddingRight = px;
    this.map.setPadding({ top: 0, bottom: 0, left: 0, right: px });
  }

  flyTo(lng: number, lat: number, zoom?: number, duration = 1600) {
    this.map.flyTo({ center: [lng, lat], zoom: zoom ?? Math.max(this.map.getZoom(), 5), duration, essential: true, curve: 1.4 });
  }

  fitBounds(bounds: LngLatBoundsLike, padding = 80) {
    this.map.fitBounds(bounds, { padding, duration: 1400, maxZoom: 8 });
  }

  worldView() {
    this.map.flyTo({ ...WORLD_VIEW, zoom: worldZoomForWidth(this.map.getContainer().clientWidth - this.paddingRight), duration: 1400, essential: true });
  }

  resetView() {
    this.map.easeTo({ bearing: 0, pitch: 0, duration: 600 });
  }

  zoomIn() {
    this.map.zoomIn({ duration: 350 });
  }

  zoomOut() {
    this.map.zoomOut({ duration: 350 });
  }

  project(lngLat: LngLat): { x: number; y: number } {
    const p = this.map.project([lngLat[0], lngLat[1]]);
    return { x: p.x, y: p.y };
  }

  unproject(point: { x: number; y: number }): LngLat {
    const ll = this.map.unproject([point.x, point.y]);
    return [ll.lng, ll.lat];
  }

  resize() {
    this.map.resize();
  }

  destroy() {
    this.destroyed = true;
    this.stopPulse();
    this.map.remove();
  }
}

export type { StyleSpecification };
