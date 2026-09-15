import { useEffect, useRef, useState } from 'react';
import type { Vessel } from '@/types';
import { MapScene } from '@/lib/map/scene';
import { EMPTY_FC, lanesToGeoJSON, lineFeature, portsToGeoJSON, vesselsToGeoJSON } from '@/lib/map/geojson';
import { mapBus } from '@/lib/map/bus';
import { getEngine } from '@/lib/simulation';
import { settingsStore } from '@/lib/store/settings';
import { ui, uiStore } from '@/lib/store/ui';
import { applyFilters } from '@/lib/selectors';
import { LANES, LANE_BY_ID } from '@/data/lanes';
import { PORT_BY_ID } from '@/data/ports';
import { SimulationEngine } from '@/lib/simulation/engine';
import { distanceNm, normalizeLongitude, type LngLat } from '@/lib/geo';
import { VesselTooltip } from './VesselTooltip';
import { MapControls } from './MapControls';

interface Hover {
  id: string;
  x: number;
  y: number;
}

/** Shortest-path longitude interpolation (antimeridian safe). */
function lerpLngLat(a: LngLat, b: LngLat, t: number): LngLat {
  let dl = b[0] - a[0];
  if (dl > 180) dl -= 360;
  if (dl < -180) dl += 360;
  return [normalizeLongitude(a[0] + dl * t), a[1] + (b[1] - a[1]) * t];
}

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const engine = getEngine();
    const store = engine.store;

    // ------------------------------------------------------------------
    // Scene
    // ------------------------------------------------------------------
    const scene = new MapScene(container, settingsStore.getState().theme, {
      onReady: (fallback) => {
        setReady(true);
        ui.setMapReady(true, fallback);
        pushStaticData();
        pushVessels(1);
        syncToggles();
        syncSelection();
      },
      onHoverVessel: (id, point) => {
        if (id && point) {
          setHover({ id, x: point.x, y: point.y });
          ui.setHovered(id);
        } else {
          setHover(null);
          ui.setHovered(null);
        }
      },
      onClickVessel: (id) => {
        ui.openVessel(id);
      },
      onClickPort: (id) => {
        ui.openPort(id);
        const port = PORT_BY_ID.get(id);
        if (port) scene.flyTo(port.longitude, port.latitude, Math.max(scene.map.getZoom(), 7.5));
      },
      onClickEmpty: () => {
        if (uiStore.getState().searchOpen) ui.setSearchOpen(false);
        if (uiStore.getState().overlay) ui.closeOverlay();
      },
    });

    // "Drop pin" mode: any click on the map (vessel, port or empty sea) zooms there.
    const dropAt = (point: { x: number; y: number }) => {
      const [lng, lat] = scene.unproject(point);
      const ports = store.getState().ports;
      let nearest: (typeof ports)[number] | null = null;
      let best = Infinity;
      for (const p of ports) {
        const d = distanceNm([lng, lat], [p.longitude, p.latitude]);
        if (d < best) {
          best = d;
          nearest = p;
        }
      }
      ui.setDropMode(false);
      if (nearest && best <= 90) {
        ui.openPort(nearest.id);
        scene.flyTo(nearest.longitude, nearest.latitude, 8.5, 1800);
      } else {
        ui.closePanels();
        scene.flyTo(lng, lat, 6.5, 1800);
      }
    };
    scene.map.on('click', (e) => {
      if (uiStore.getState().dropMode) dropAt({ x: e.point.x, y: e.point.y });
    });

    // ------------------------------------------------------------------
    // Vessel positions with interpolation between ticks
    // ------------------------------------------------------------------
    let fromPositions = new Map<string, LngLat>();
    let toPositions = new Map<string, LngLat>();
    let displayed = new Map<string, LngLat>();
    let animStart = 0;
    let animDuration = 2000;
    let frame: number | null = null;
    let lastVersion = -1;
    let visibleVessels: Vessel[] = [];

    const computeVisible = () => {
      const { vessels } = store.getState();
      const { filters, layers } = uiStore.getState();
      visibleVessels = layers.vessels || layers.heatmap ? applyFilters(vessels, filters) : [];
    };

    const render = (t: number) => {
      const p = animDuration > 0 ? Math.min(1, (t - animStart) / animDuration) : 1;
      for (const v of visibleVessels) {
        const to = toPositions.get(v.id);
        if (!to) continue;
        const from = fromPositions.get(v.id) ?? to;
        displayed.set(v.id, p >= 1 ? to : lerpLngLat(from, to, p));
      }
      scene.setVessels(vesselsToGeoJSON(visibleVessels, displayed));
      if (p < 1) frame = requestAnimationFrame(render);
      else frame = null;
    };

    const pushVessels = (version: number) => {
      const { vessels, config, running } = store.getState();
      computeVisible();
      if (version !== lastVersion) {
        lastVersion = version;
        fromPositions = new Map(displayed);
        toPositions = new Map(vessels.map((v) => [v.id, [v.longitude, v.latitude] as LngLat]));
        // Interpolate over one tick interval so motion is continuous; snap when paused.
        animDuration = running ? Math.min(config.intervalMs, 6000) : 400;
        animStart = performance.now();
      }
      if (frame === null) frame = requestAnimationFrame(render);
    };

    const pushStaticData = () => {
      scene.setLanes(lanesToGeoJSON(LANES));
      scene.setPorts(portsToGeoJSON(store.getState().ports));
    };

    // ------------------------------------------------------------------
    // Route highlight (vessel voyage) with a short draw-in animation
    // ------------------------------------------------------------------
    let routeFrame: number | null = null;
    let routeVessel: string | null = null;
    const drawRoute = (vesselId: string, animate: boolean) => {
      const remaining = engine.getRemainingRoute(vesselId);
      const done = engine.getCompletedRoute(vesselId);
      if (routeFrame !== null) cancelAnimationFrame(routeFrame);
      if (!animate || remaining.length < 2) {
        scene.setRoute(lineFeature(remaining), lineFeature(done));
        return;
      }
      const start = performance.now();
      const duration = 900;
      const step = (t: number) => {
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 2);
        const count = Math.max(2, Math.round(eased * remaining.length));
        scene.setRoute(lineFeature(remaining.slice(0, count)), lineFeature(done));
        if (p < 1) routeFrame = requestAnimationFrame(step);
        else routeFrame = null;
      };
      routeFrame = requestAnimationFrame(step);
    };

    const syncRoute = () => {
      const { routeVesselId } = uiStore.getState();
      if (routeVesselId !== routeVessel) {
        routeVessel = routeVesselId;
        if (routeVesselId) {
          drawRoute(routeVesselId, true);
          const pts = engine.getRemainingRoute(routeVesselId);
          if (pts.length > 1) {
            let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
            for (const [lng, lat] of pts) {
              w = Math.min(w, lng); e = Math.max(e, lng); s = Math.min(s, lat); n = Math.max(n, lat);
            }
            scene.fitBounds([[w, s], [e, n]], 90);
          }
        } else {
          scene.setRoute(EMPTY_FC, EMPTY_FC);
        }
      } else if (routeVessel) {
        drawRoute(routeVessel, false);
      }
    };

    let highlightedLane: string | null = null;
    const syncLane = () => {
      const { highlightedLaneId } = uiStore.getState();
      if (highlightedLaneId === highlightedLane) return;
      highlightedLane = highlightedLaneId;
      const lane = highlightedLaneId ? LANE_BY_ID.get(highlightedLaneId) : undefined;
      if (lane) {
        scene.setLaneHighlight(lanesToGeoJSON([lane]));
        scene.fitBounds(SimulationEngine.laneBounds(lane), 70);
      } else {
        scene.setLaneHighlight(EMPTY_FC);
      }
    };

    // ------------------------------------------------------------------
    // Selection + toggles + theme
    // ------------------------------------------------------------------
    let selected: string | null = null;
    const syncSelection = () => {
      const { panels } = uiStore.getState();
      const top = panels[panels.length - 1];
      const id = top?.type === 'vessel' ? top.id : null;
      // Keep camera targets clear of the right-hand detail panel on desktop.
      scene.setPaddingRight(panels.length > 0 && window.innerWidth >= 768 ? 380 : 0);
      if (id !== selected) {
        selected = id;
        scene.setSelectedVessel(id);
      }
    };

    const syncToggles = () => {
      const s = settingsStore.getState();
      const { layers } = uiStore.getState();
      scene.setToggles({ vessels: layers.vessels, heatmap: layers.heatmap, ports: s.showPorts, routes: s.showRoutes, labels: s.showVesselLabels });
    };

    let lastFilters = uiStore.getState().filters;
    let lastLayers = uiStore.getState().layers;
    let lastDrop = uiStore.getState().dropMode;
    const unsubUI = uiStore.subscribe(() => {
      const state = uiStore.getState();
      if (state.dropMode !== lastDrop) {
        lastDrop = state.dropMode;
        scene.map.getCanvas().style.cursor = state.dropMode ? 'crosshair' : '';
      }
      syncSelection();
      syncRoute();
      syncLane();
      if (state.filters !== lastFilters || state.layers !== lastLayers) {
        lastFilters = state.filters;
        lastLayers = state.layers;
        syncToggles();
        pushVessels(lastVersion);
      }
    });

    let lastTheme = settingsStore.getState().theme;
    const unsubSettings = settingsStore.subscribe(() => {
      const s = settingsStore.getState();
      if (s.theme !== lastTheme) {
        lastTheme = s.theme;
        scene.setTheme(s.theme);
      }
      syncToggles();
    });

    let lastPorts = store.getState().ports;
    const unsubSim = store.subscribe(() => {
      const state = store.getState();
      if (state.positionsVersion !== lastVersion) {
        pushVessels(state.positionsVersion);
        if (routeVessel) drawRoute(routeVessel, false);
      }
      if (state.ports !== lastPorts) {
        lastPorts = state.ports;
        scene.setPorts(portsToGeoJSON(state.ports));
      }
    });

    // ------------------------------------------------------------------
    // Imperative commands
    // ------------------------------------------------------------------
    const unsubBus = mapBus.subscribe((cmd) => {
      switch (cmd.type) {
        case 'flyTo':
          scene.flyTo(cmd.longitude, cmd.latitude, cmd.zoom, cmd.duration);
          break;
        case 'fitBounds':
          scene.fitBounds(cmd.bounds, cmd.padding);
          break;
        case 'world':
          scene.worldView();
          break;
        case 'reset':
          scene.resetView();
          break;
        case 'zoomIn':
          scene.zoomIn();
          break;
        case 'zoomOut':
          scene.zoomOut();
          break;
        case 'focusVessel': {
          const v = store.getState().vessels.find((x) => x.id === cmd.id);
          if (v) scene.flyTo(v.longitude, v.latitude, cmd.zoom ?? Math.max(scene.map.getZoom(), 6.5));
          break;
        }
        case 'focusPort': {
          const p = PORT_BY_ID.get(cmd.id);
          if (p) scene.flyTo(p.longitude, p.latitude, 8);
          break;
        }
        case 'dropAt':
          dropAt({ x: cmd.x, y: cmd.y });
          break;
      }
    });

    const ro = new ResizeObserver(() => scene.resize());
    ro.observe(container);

    // Expose the map for browser-based QA tooling only (?qa=1).
    if (new URLSearchParams(window.location.search).has('qa')) {
      (window as unknown as { __gsrMap?: unknown }).__gsrMap = scene.map;
    }

    return () => {
      ro.disconnect();
      unsubUI();
      unsubSettings();
      unsubSim();
      unsubBus();
      if (frame !== null) cancelAnimationFrame(frame);
      if (routeFrame !== null) cancelAnimationFrame(routeFrame);
      scene.destroy();
    };
  }, []);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="gsr-map absolute inset-0" role="application" aria-label="World map of simulated container vessels" />
      <div className="map-vignette" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg/60" aria-hidden>
          <span className="label-caps animate-pulse">Loading basemap…</span>
        </div>
      )}
      {hover && <VesselTooltip id={hover.id} x={hover.x} y={hover.y} />}
      <MapControls />
    </div>
  );
}
