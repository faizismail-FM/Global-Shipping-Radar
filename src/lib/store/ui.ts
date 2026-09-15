import type { Region, VesselStatus } from '@/types';
import { createStore, useStore } from './createStore';

export type View = 'overview' | 'vessels' | 'ports' | 'routes' | 'alerts' | 'tracking' | 'voyage';

export type SpeedBand = 'all' | '0-5' | '5-15' | '15-25' | '25+';

export interface VesselFilters {
  statuses: VesselStatus[];
  types: ['container'];
  speed: SpeedBand;
  regions: Region[];
  destination: string;
}

export type PanelEntry =
  | { type: 'vessel'; id: string }
  | { type: 'port'; id: string }
  | { type: 'container'; number: string };

export type Overlay = 'filters' | 'layers' | 'simulation' | 'settings' | null;

export interface LayerVisibility {
  vessels: boolean;
  heatmap: boolean;
  /** Weather is a placeholder: no provider is connected in the MVP. */
  weather: false;
}

export interface UIState {
  view: View;
  /** Stack of detail panels; the last entry is visible. */
  panels: PanelEntry[];
  overlay: Overlay;
  searchOpen: boolean;
  activityOpen: boolean;
  mobileNavOpen: boolean;
  hoveredVesselId: string | null;
  /** Vessel whose remaining route is drawn on the map. */
  routeVesselId: string | null;
  /** Lane highlighted on the map (from the Routes page). */
  highlightedLaneId: string | null;
  filters: VesselFilters;
  layers: LayerVisibility;
  /** Port id used to pre-filter the Vessels page ("View vessels" from a port). */
  vesselsPagePort: string | null;
  /** Lane id used to pre-filter the Vessels page ("Vessels" from the Routes page). */
  vesselsPageLane: string | null;
  /** Container number pre-filled on the tracking page. */
  trackingQuery: string;
  /** "Drop pin" mode: the next click on the map zooms to that location. */
  dropMode: boolean;
  /** Whether the map style finished loading (for the loading screen). */
  mapReady: boolean;
  /** True when the remote basemap failed and the bundled fallback is used. */
  mapFallback: boolean;
}

export const ALL_STATUSES: VesselStatus[] = ['underway', 'anchored', 'moored', 'delayed'];

export const DEFAULT_FILTERS: VesselFilters = {
  statuses: [...ALL_STATUSES],
  types: ['container'],
  speed: 'all',
  regions: [],
  destination: '',
};

function initialView(): View {
  if (typeof window === 'undefined') return 'overview';
  const hash = window.location.hash.replace('#', '');
  const views: View[] = ['overview', 'vessels', 'ports', 'routes', 'alerts', 'tracking', 'voyage'];
  return (views as string[]).includes(hash) ? (hash as View) : 'overview';
}

export const uiStore = createStore<UIState>({
  view: initialView(),
  panels: [],
  overlay: null,
  searchOpen: false,
  activityOpen: true,
  mobileNavOpen: false,
  hoveredVesselId: null,
  routeVesselId: null,
  highlightedLaneId: null,
  filters: DEFAULT_FILTERS,
  layers: { vessels: true, heatmap: false, weather: false },
  vesselsPagePort: null,
  vesselsPageLane: null,
  trackingQuery: '',
  dropMode: false,
  mapReady: false,
  mapFallback: false,
});

export function useUI<S>(selector: (s: UIState) => S): S {
  return useStore(uiStore, selector);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export const ui = {
  setView(view: View) {
    uiStore.setState({ view, mobileNavOpen: false, overlay: null });
    if (typeof window !== 'undefined') {
      const hash = view === 'overview' ? '' : `#${view}`;
      if (window.location.hash !== hash) window.history.replaceState(null, '', `${window.location.pathname}${hash}`);
    }
  },
  openVessel(id: string) {
    const { panels } = uiStore.getState();
    const top = panels[panels.length - 1];
    if (top?.type === 'vessel' && top.id === id) return;
    const entry: PanelEntry = { type: 'vessel', id };
    uiStore.setState({ panels: [...panels.filter((p) => !(p.type === 'vessel' && p.id === id)), entry].slice(-4), overlay: null, searchOpen: false });
  },
  openPort(id: string) {
    const { panels } = uiStore.getState();
    const top = panels[panels.length - 1];
    if (top?.type === 'port' && top.id === id) return;
    const entry: PanelEntry = { type: 'port', id };
    uiStore.setState({ panels: [...panels.filter((p) => !(p.type === 'port' && p.id === id)), entry].slice(-4), overlay: null, searchOpen: false });
  },
  openContainer(number: string) {
    const { panels } = uiStore.getState();
    const entry: PanelEntry = { type: 'container', number };
    uiStore.setState({ panels: [...panels.filter((p) => p.type !== 'container'), entry].slice(-4), overlay: null, searchOpen: false });
  },
  back() {
    const { panels } = uiStore.getState();
    uiStore.setState({ panels: panels.slice(0, -1) });
  },
  closePanels() {
    uiStore.setState({ panels: [], routeVesselId: null });
  },
  setOverlay(overlay: Overlay) {
    const current = uiStore.getState().overlay;
    uiStore.setState({ overlay: current === overlay ? null : overlay, searchOpen: false });
  },
  closeOverlay() {
    uiStore.setState({ overlay: null });
  },
  setSearchOpen(open: boolean) {
    uiStore.setState({ searchOpen: open });
  },
  toggleActivity() {
    uiStore.setState({ activityOpen: !uiStore.getState().activityOpen });
  },
  setMobileNav(open: boolean) {
    uiStore.setState({ mobileNavOpen: open });
  },
  setHovered(id: string | null) {
    if (uiStore.getState().hoveredVesselId !== id) uiStore.setState({ hoveredVesselId: id });
  },
  showRoute(vesselId: string | null) {
    uiStore.setState({ routeVesselId: vesselId, highlightedLaneId: null });
  },
  highlightLane(laneId: string | null) {
    uiStore.setState({ highlightedLaneId: laneId, routeVesselId: null });
  },
  setFilters(partial: Partial<VesselFilters>) {
    uiStore.setState({ filters: { ...uiStore.getState().filters, ...partial } });
  },
  resetFilters() {
    uiStore.setState({ filters: DEFAULT_FILTERS });
  },
  setLayer(key: 'vessels' | 'heatmap', visible: boolean) {
    uiStore.setState({ layers: { ...uiStore.getState().layers, [key]: visible } });
  },
  openVesselsForPort(portId: string | null) {
    uiStore.setState({ vesselsPagePort: portId, vesselsPageLane: null, view: 'vessels', overlay: null, mobileNavOpen: false });
  },
  openVesselsForLane(laneId: string | null) {
    uiStore.setState({ vesselsPageLane: laneId, vesselsPagePort: null, view: 'vessels', overlay: null, mobileNavOpen: false });
  },
  openTracking(query: string) {
    uiStore.setState({ trackingQuery: query, view: 'tracking', overlay: null, searchOpen: false, mobileNavOpen: false });
  },
  setDropMode(on: boolean) {
    if (uiStore.getState().dropMode !== on) uiStore.setState({ dropMode: on });
  },
  setMapReady(ready: boolean, fallback = false) {
    uiStore.setState({ mapReady: ready, mapFallback: fallback });
  },
};

export function isFilterActive(f: VesselFilters): boolean {
  return f.statuses.length !== ALL_STATUSES.length || f.speed !== 'all' || f.regions.length > 0 || f.destination.trim() !== '';
}
