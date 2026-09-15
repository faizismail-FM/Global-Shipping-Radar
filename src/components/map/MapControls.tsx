import { useCallback, useEffect, useRef, useState } from 'react';
import { Layers, Minus, Plus, RotateCcw, Crosshair, CloudSun, PersonStanding, X } from 'lucide-react';
import { mapBus } from '@/lib/map/bus';
import { ui, useUI } from '@/lib/store/ui';
import { updateSettings, useSettings } from '@/lib/store/settings';
import { useClickOutside, useEscape, useIsMobile } from '@/lib/hooks';
import { Checkbox, IconButton, Panel } from '@/components/ui';
import { cn } from '@/lib/cn';

/** Pixel distance below which a pointer gesture counts as a click rather than a drag. */
const CLICK_THRESHOLD = 6;

export function MapControls() {
  const [layersOpen, setLayersOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setLayersOpen(false), []);
  useClickOutside(ref, close, layersOpen);
  useEscape(close, layersOpen);

  const layers = useUI((s) => s.layers);
  const showPorts = useSettings((s) => s.showPorts);
  const showRoutes = useSettings((s) => s.showRoutes);
  const mapFallback = useUI((s) => s.mapFallback);
  const panelOpen = useUI((s) => s.panels.length > 0);
  const overlayOpen = useUI((s) => s.overlay !== null);
  const view = useUI((s) => s.view);
  const dropMode = useUI((s) => s.dropMode);
  const isMobile = useIsMobile();

  // Drag state for the "person" control (Google Maps pegman-style).
  const [drag, setDrag] = useState<{ x: number; y: number; overMap: boolean } | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  useEscape(() => ui.setDropMode(false), dropMode);

  const mapRect = () => document.querySelector('.gsr-map')?.getBoundingClientRect() ?? null;

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY };
    setDrag({ x: e.clientX, y: e.clientY, overMap: false });
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStart.current) return;
    const r = mapRect();
    const overMap = !!r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    setDrag({ x: e.clientX, y: e.clientY, overMap });
  };
  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const start = dragStart.current;
    dragStart.current = null;
    setDrag(null);
    if (!start) return;
    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    if (moved < CLICK_THRESHOLD) {
      // Plain click toggles "drop mode": the next click on the map zooms there.
      ui.setDropMode(!dropMode);
      return;
    }
    const r = mapRect();
    if (!r) return;
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    // Ignore drops on the controls themselves.
    const onControls = ref.current?.contains(document.elementFromPoint(e.clientX, e.clientY));
    if (inside && !onControls) mapBus.dispatch({ type: 'dropAt', x: e.clientX - r.left, y: e.clientY - r.top });
  };

  useEffect(() => {
    if (view !== 'overview' && dropMode) ui.setDropMode(false);
  }, [view, dropMode]);

  // Controls yield to full-page views, to the bottom sheet on phones, and slide
  // left of the detail panel on desktop.
  if (view !== 'overview') return null;
  if (isMobile && (panelOpen || overlayOpen)) return null;

  return (
    <>
      <div
        ref={ref}
        className={cn('absolute top-3 z-20 flex flex-col items-end gap-2 transition-[right] duration-300 md:top-4', panelOpen && !isMobile ? 'right-[392px]' : 'right-3 md:right-4')}
      >
        <Panel strong className="flex flex-col p-1">
          <IconButton label="Zoom in" onClick={() => mapBus.dispatch({ type: 'zoomIn' })}>
            <Plus size={15} />
          </IconButton>
          <IconButton label="Zoom out" onClick={() => mapBus.dispatch({ type: 'zoomOut' })}>
            <Minus size={15} />
          </IconButton>
          <div className="mx-1.5 my-0.5 h-px bg-line" />
          <IconButton label="Reset rotation and tilt" onClick={() => mapBus.dispatch({ type: 'reset' })}>
            <RotateCcw size={15} />
          </IconButton>
          <IconButton label="World view" onClick={() => mapBus.dispatch({ type: 'world' })}>
            <Crosshair size={15} />
          </IconButton>
          <div className="mx-1.5 my-0.5 h-px bg-line" />
          <button
            type="button"
            aria-label={dropMode ? 'Cancel drop mode' : 'Drop a marker to zoom to a location (drag onto the map or click, then click the map)'}
            title={dropMode ? 'Click the map to zoom there, or press Esc' : 'Drag onto the map to zoom to a location'}
            aria-pressed={dropMode}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => { dragStart.current = null; setDrag(null); }}
            className={cn(
              'inline-flex h-8 w-8 touch-none select-none items-center justify-center rounded-md transition-colors',
              dropMode ? 'bg-warning-soft text-warning' : 'text-muted hover:bg-accent-soft hover:text-ink',
              drag ? 'cursor-grabbing' : 'cursor-grab',
            )}
          >
            <PersonStanding size={17} className={cn(drag && 'opacity-30')} />
          </button>
          <div className="mx-1.5 my-0.5 h-px bg-line" />
          <IconButton label="Map layers" active={layersOpen} onClick={() => setLayersOpen((o) => !o)} aria-expanded={layersOpen}>
            <Layers size={15} />
          </IconButton>
        </Panel>

        {layersOpen && (
          <Panel strong className="w-52 p-3 animate-slide-down" role="group" aria-label="Map layers">
            <div className="label-caps mb-1">Layers</div>
            <Checkbox checked={layers.vessels} onChange={(v) => ui.setLayer('vessels', v)} label="Vessels" />
            <Checkbox checked={showPorts} onChange={(v) => updateSettings({ showPorts: v })} label="Ports" />
            <Checkbox checked={showRoutes} onChange={(v) => updateSettings({ showRoutes: v })} label="Routes" />
            <Checkbox checked={layers.heatmap} onChange={(v) => ui.setLayer('heatmap', v)} label="Traffic heatmap" />
            <div className="mt-1 flex items-center gap-2 py-1 text-[13px] text-faint" title="Weather overlays require a connected weather provider (not part of the MVP).">
              <span className="flex h-4 w-4 items-center justify-center rounded border border-dashed border-line-strong">
                <CloudSun size={10} />
              </span>
              <span className="flex-1">Weather</span>
              <span className="text-[9px] uppercase tracking-wider">No provider</span>
            </div>
            {mapFallback && (
              <p className="mt-2 border-t hairline pt-2 text-[10px] leading-relaxed text-warning">
                Basemap CDN unreachable — showing bundled offline outlines.
              </p>
            )}
          </Panel>
        )}
      </div>

      {/* Hint while drop mode is armed */}
      {dropMode && !drag && (
        <div className="pointer-events-auto absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-warning/40 bg-panel-strong px-3 py-1.5 text-[12px] text-ink shadow-panel animate-slide-down md:top-4">
          <PersonStanding size={14} className="text-warning" />
          Click anywhere on the map to zoom there
          <button type="button" onClick={() => ui.setDropMode(false)} aria-label="Cancel" className="ml-1 text-muted hover:text-ink">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Ghost marker following the pointer while dragging */}
      {drag && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full"
          style={{ left: drag.x, top: drag.y }}
          aria-hidden
        >
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-glow transition-colors', drag.overMap ? 'border-warning bg-warning text-[#1a1200]' : 'border-line-strong bg-panel-strong text-muted')}>
            <PersonStanding size={20} />
          </div>
          <div className={cn('mx-auto h-3 w-0.5', drag.overMap ? 'bg-warning' : 'bg-line-strong')} />
        </div>
      )}
    </>
  );
}
