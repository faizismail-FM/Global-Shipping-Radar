import { useCallback, useRef, useState } from 'react';
import { Layers, Minus, Plus, RotateCcw, Crosshair, CloudSun } from 'lucide-react';
import { mapBus } from '@/lib/map/bus';
import { ui, useUI } from '@/lib/store/ui';
import { updateSettings, useSettings } from '@/lib/store/settings';
import { useClickOutside, useEscape, useIsMobile } from '@/lib/hooks';
import { Checkbox, IconButton, Panel } from '@/components/ui';
import { cn } from '@/lib/cn';

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
  const isMobile = useIsMobile();

  // Controls yield to full-page views, to the bottom sheet on phones, and slide
  // left of the detail panel on desktop.
  if (view !== 'overview') return null;
  if (isMobile && (panelOpen || overlayOpen)) return null;

  return (
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
  );
}
