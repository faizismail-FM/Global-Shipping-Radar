import { Activity, ChevronDown, ChevronUp } from 'lucide-react';
import type { ActivityEvent } from '@/types';
import { useNow, useSimulation } from '@/lib/hooks';
import { ui, useUI } from '@/lib/store/ui';
import { mapBus } from '@/lib/map/bus';
import { formatRelative } from '@/lib/formatting';
import { cn } from '@/lib/cn';

const KIND_COLOR: Record<ActivityEvent['kind'], string> = {
  'zone-enter': 'bg-accent',
  departed: 'bg-teal',
  arrived: 'bg-success',
  congestion: 'bg-danger',
  destination: 'bg-slate',
  eta: 'bg-warning',
  delay: 'bg-warning',
};

function focusEvent(e: ActivityEvent) {
  if (!e.target) return;
  ui.setView('overview');
  if (e.target.vesselId) ui.openVessel(e.target.vesselId);
  if (e.target.portId) ui.openPort(e.target.portId);
  mapBus.dispatch({ type: 'flyTo', longitude: e.target.longitude, latitude: e.target.latitude, zoom: e.target.zoom ?? 6 });
}

export function ActivityFeed({ className }: { className?: string }) {
  const events = useSimulation((s) => s.events);
  const isLive = useSimulation((s) => s.dataSource === 'ais');
  const open = useUI((s) => s.activityOpen);
  const now = useNow(1000);

  return (
    <section className={cn('glass pointer-events-auto flex flex-col rounded-lg', className)} aria-label="Live activity">
      <button type="button" onClick={() => ui.toggleActivity()} className="flex items-center gap-2 px-3 py-2 text-left" aria-expanded={open}>
        <Activity size={13} className="text-accent" aria-hidden />
        <span className="label-caps flex-1 !text-muted">Live activity</span>
        <span className="num text-[10px] text-faint">{events.length}</span>
        {open ? <ChevronDown size={13} className="text-faint" /> : <ChevronUp size={13} className="text-faint" />}
      </button>
      {open && (
        <ul className="max-h-[220px] overflow-y-auto border-t hairline px-1 py-1 md:max-h-[300px]">
          {events.length === 0 && (
            <li className="px-2 py-3 text-[12px] text-faint">{isLive ? 'Waiting for AIS status changes (arrivals, departures, zone entries)…' : 'Waiting for simulated events…'}</li>
          )}
          {events.map((e) => (
            <li key={e.id} className="animate-feed-in">
              <button
                type="button"
                onClick={() => focusEvent(e)}
                disabled={!e.target}
                className="flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-accent-soft/60 disabled:cursor-default"
              >
                <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', KIND_COLOR[e.kind])} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] text-ink">{e.title}</span>
                  <span className="block truncate text-[11px] text-muted">{e.subject}</span>
                </span>
                <span className="num shrink-0 text-[10px] text-faint">{formatRelative(e.timestamp, now)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
