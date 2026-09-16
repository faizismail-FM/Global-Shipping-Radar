import { createStore } from '@/lib/store/createStore';

export interface ViewportState {
  /** [west, south, east, north] of the visible map, or null before the map is ready. */
  bounds: [number, number, number, number] | null;
  zoom: number;
}

/** Current map viewport, published by MapView for viewport-driven data sources. */
export const viewportStore = createStore<ViewportState>({ bounds: null, zoom: 1.6 });
