import { Bell, AlertTriangle, Clock, Waves, CheckCircle2 } from 'lucide-react';
import type { Alert } from '@/types';
import { useNow, useSimulation } from '@/lib/hooks';
import { ui } from '@/lib/store/ui';
import { mapBus } from '@/lib/map/bus';
import { formatRelative } from '@/lib/formatting';
import { EmptyState } from '@/components/ui';
import { PageShell } from '@/components/dashboard/PageShell';
import { cn } from '@/lib/cn';

const KIND_ICON: Record<Alert['kind'], typeof Bell> = { congestion: AlertTriangle, delay: Clock, traffic: Waves };
const SEVERITY: Record<Alert['severity'], { text: string; bg: string; label: string }> = {
  critical: { text: 'text-danger', bg: 'bg-danger-soft', label: 'Critical' },
  warning: { text: 'text-warning', bg: 'bg-warning-soft', label: 'Warning' },
  info: { text: 'text-accent', bg: 'bg-accent-soft', label: 'Info' },
};

export function focusAlert(a: Alert) {
  ui.setView('overview');
  if (a.target.vesselId) ui.openVessel(a.target.vesselId);
  else if (a.target.portId) ui.openPort(a.target.portId);
  else ui.closePanels();
  mapBus.dispatch({ type: 'flyTo', longitude: a.target.longitude, latitude: a.target.latitude, zoom: a.target.zoom });
}

export function AlertsPage() {
  const alerts = useSimulation((s) => s.alerts);
  const now = useNow(5000);
  const counts = { critical: alerts.filter((a) => a.severity === 'critical').length, warning: alerts.filter((a) => a.severity === 'warning').length, info: alerts.filter((a) => a.severity === 'info').length };

  return (
    <PageShell title="Alerts" icon={Bell} provenance="vessels" description={`${counts.critical} critical · ${counts.warning} warnings · ${counts.info} informational`}>
      {alerts.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="No active alerts">
          Alerts are derived from the simulation: port congestion, vessel delays and chokepoint traffic.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-2 p-4 md:grid-cols-2 xl:grid-cols-3">
          {alerts.map((a) => {
            const Icon = KIND_ICON[a.kind];
            const sev = SEVERITY[a.severity];
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => focusAlert(a)}
                  className="flex w-full items-start gap-3 rounded-lg border hairline p-3 text-left transition-colors hover:border-accent"
                >
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md', sev.bg, sev.text)}>
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={cn('label-caps', sev.text)}>{a.title}</span>
                      <span className={cn('rounded px-1 text-[9px] uppercase tracking-wider', sev.bg, sev.text)}>{sev.label}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[14px] font-medium text-ink">{a.subject}</span>
                    <span className="block text-[12px] text-muted">{a.detail}</span>
                  </span>
                  <span className="num shrink-0 text-[10px] text-faint">{formatRelative(a.createdAt, now)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
