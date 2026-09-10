/**
 * Imperative map commands. Panels, search results and tables dispatch
 * navigation intents here; the MapView subscribes and performs them. This keeps
 * the MapLibre instance out of React state and out of business logic.
 */
export type MapCommand =
  | { type: 'flyTo'; longitude: number; latitude: number; zoom?: number; duration?: number }
  | { type: 'fitBounds'; bounds: [[number, number], [number, number]]; padding?: number }
  | { type: 'world' }
  | { type: 'reset' }
  | { type: 'zoomIn' }
  | { type: 'zoomOut' }
  | { type: 'focusVessel'; id: string; zoom?: number }
  | { type: 'focusPort'; id: string };

type Handler = (cmd: MapCommand) => void;

const handlers = new Set<Handler>();
let pending: MapCommand[] = [];

export const mapBus = {
  dispatch(cmd: MapCommand) {
    if (handlers.size === 0) {
      pending.push(cmd);
      return;
    }
    handlers.forEach((h) => h(cmd));
  },
  subscribe(handler: Handler) {
    handlers.add(handler);
    if (pending.length) {
      const queued = pending;
      pending = [];
      queued.forEach(handler);
    }
    return () => handlers.delete(handler);
  },
};
