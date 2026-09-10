import { useCallback } from 'react';
import { ui, useUI } from '@/lib/store/ui';
import { useEscape, useIsMobile } from '@/lib/hooks';
import { FilterPanel } from './FilterPanel';
import { SimulationPanel } from './SimulationPanel';
import { SettingsPanel } from './SettingsPanel';
import { cn } from '@/lib/cn';

/** Floating utility panels (filters, simulation, settings). */
export function OverlayHost() {
  const overlay = useUI((s) => s.overlay);
  const isMobile = useIsMobile();
  const close = useCallback(() => ui.closeOverlay(), []);
  useEscape(close, Boolean(overlay));
  if (!overlay) return null;

  return (
    <div
      key={overlay}
      className={cn(
        'glass-strong pointer-events-auto z-40 flex flex-col overflow-hidden rounded-lg',
        isMobile ? 'absolute inset-x-2 bottom-[68px] max-h-[72vh] animate-slide-up' : 'absolute left-3 top-3 bottom-3 w-[320px] animate-fade-in md:left-4 md:top-4 md:bottom-4',
      )}
      role="dialog"
      aria-label={overlay}
    >
      {overlay === 'filters' && <FilterPanel onClose={close} />}
      {overlay === 'simulation' && <SimulationPanel onClose={close} />}
      {overlay === 'settings' && <SettingsPanel onClose={close} />}
    </div>
  );
}
