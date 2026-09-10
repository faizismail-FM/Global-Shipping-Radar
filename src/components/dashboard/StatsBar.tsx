import { useMemo } from 'react';
import { useAnimatedNumber, useSimulation } from '@/lib/hooks';
import { computeFleetStats } from '@/lib/selectors';
import { formatNumber } from '@/lib/formatting';
import { cn } from '@/lib/cn';
import { ui } from '@/lib/store/ui';

function Stat({ label, value, tone, onClick }: { label: string; value: number; tone?: 'accent' | 'warning' | 'danger'; onClick?: () => void }) {
  const animated = useAnimatedNumber(value, 700);
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-[112px] flex-1 flex-col items-start px-3 py-1.5 text-left transition-colors hover:bg-accent-soft/50 sm:min-w-0 sm:px-4"
    >
      <span className="label-caps whitespace-nowrap">{label}</span>
      <span className={cn('num text-[17px] font-semibold leading-tight sm:text-[19px]', tone === 'accent' ? 'text-accent' : tone === 'warning' ? 'text-warning' : tone === 'danger' ? 'text-danger' : 'text-ink')}>
        {formatNumber(animated)}
      </span>
    </button>
  );
}

export function StatsBar() {
  const vessels = useSimulation((s) => s.vessels);
  const ports = useSimulation((s) => s.ports);
  const stats = useMemo(() => computeFleetStats(vessels, ports), [vessels, ports]);

  return (
    <div className="glass-strong pointer-events-auto flex items-stretch divide-x divide-[var(--border)] overflow-x-auto rounded-lg" role="status" aria-label="Fleet statistics">
      <Stat label="Vessels online" value={stats.total} tone="accent" onClick={() => ui.setView('vessels')} />
      <Stat label="At sea" value={stats.atSea} onClick={() => { ui.setFilters({ statuses: ['underway'] }); ui.setView('vessels'); }} />
      <Stat label="In port" value={stats.inPort} onClick={() => { ui.setFilters({ statuses: ['moored'] }); ui.setView('vessels'); }} />
      <Stat label="Anchored" value={stats.anchored} onClick={() => { ui.setFilters({ statuses: ['anchored'] }); ui.setView('vessels'); }} />
      <Stat label="Delayed" value={stats.delayed} tone="warning" onClick={() => { ui.setFilters({ statuses: ['delayed'] }); ui.setView('vessels'); }} />
      <Stat label="Ports monitored" value={stats.ports} onClick={() => ui.setView('ports')} />
    </div>
  );
}
