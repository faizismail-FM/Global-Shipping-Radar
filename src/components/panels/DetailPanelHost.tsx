import { useCallback } from 'react';
import { ui, useUI } from '@/lib/store/ui';
import { useEscape, useIsMobile } from '@/lib/hooks';
import { VesselDetailPanel } from './VesselDetailPanel';
import { PortDetailPanel } from './PortDetailPanel';
import { ContainerPanel } from './ContainerPanel';
import { cn } from '@/lib/cn';

/** Renders the top of the detail-panel stack: a right-side panel on desktop, a bottom sheet on mobile. */
export function DetailPanelHost() {
  const panels = useUI((s) => s.panels);
  const isMobile = useIsMobile();
  const top = panels[panels.length - 1];
  const close = useCallback(() => ui.closePanels(), []);
  const back = panels.length > 1 ? () => ui.back() : undefined;
  useEscape(close, Boolean(top));

  if (!top) return null;
  const key = top.type === 'container' ? `c:${top.number}` : `${top.type}:${top.id}`;

  return (
    <div
      key={key}
      className={cn(
        'glass-strong pointer-events-auto z-30 flex flex-col overflow-hidden rounded-lg',
        isMobile ? 'absolute inset-x-2 bottom-[68px] max-h-[62vh] animate-slide-up' : 'absolute bottom-3 right-3 top-3 w-[360px] animate-slide-in-right md:right-4 md:top-4 md:bottom-4',
      )}
      role="complementary"
      aria-label="Details"
    >
      {isMobile && <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong" aria-hidden />}
      {top.type === 'vessel' && <VesselDetailPanel id={top.id} onBack={back} onClose={close} />}
      {top.type === 'port' && <PortDetailPanel id={top.id} onBack={back} onClose={close} />}
      {top.type === 'container' && <ContainerPanel number={top.number} onBack={back} onClose={close} />}
    </div>
  );
}
