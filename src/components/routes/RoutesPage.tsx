import { useMemo } from 'react';
import { Route, MapPinned, ArrowRight } from 'lucide-react';
import { useSimulation } from '@/lib/hooks';
import { useSettings } from '@/lib/store/settings';
import { ui, useUI } from '@/lib/store/ui';
import { computeLaneStats } from '@/lib/selectors';
import { formatDistance, formatNumber } from '@/lib/formatting';
import { Button } from '@/components/ui';
import { PageShell } from '@/components/dashboard/PageShell';
import { cn } from '@/lib/cn';
import { PORT_BY_ID } from '@/data/ports';

export function RoutesPage() {
  const vessels = useSimulation((s) => s.vessels);
  const stats = useMemo(() => computeLaneStats(vessels), [vessels]);
  const distanceUnit = useSettings((s) => s.distanceUnit);
  const highlighted = useUI((s) => s.highlightedLaneId);
  const isLive = useSimulation((s) => s.dataSource === 'ais');

  const totals = stats.reduce((acc, s) => ({ vessels: acc.vessels + s.vessels, active: acc.active + s.active, delayed: acc.delayed + s.delayed }), { vessels: 0, active: 0, delayed: 0 });

  return (
    <PageShell title="Routes" icon={Route} description={`${stats.length} major shipping lanes · ${formatNumber(totals.active)} vessels underway · ${formatNumber(totals.delayed)} delayed`}>
      {isLive && (
        <p className="mx-4 mt-4 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-[12px] text-ink">
          Live AIS vessels are not assigned to shipping lanes, so lane statistics are empty while the live feed is active. Switch to the simulated fleet to see lane figures.
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((s) => {
          const isActive = highlighted === s.lane.id;
          const portNames = s.lane.ports.map((id) => PORT_BY_ID.get(id)?.name ?? id);
          return (
            <article key={s.lane.id} className={cn('flex flex-col rounded-lg border p-4 transition-colors', isActive ? 'border-accent bg-accent-soft/40' : 'hairline hover:border-line-strong')}>
              <header className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                    {s.lane.from} <ArrowRight size={11} className="inline" /> {s.lane.to}
                  </h2>
                  <p className="mt-0.5 text-[15px] font-semibold text-ink">{s.lane.name}</p>
                </div>
                <span className="num rounded bg-line px-1.5 py-0.5 text-[10px] text-muted">{formatDistance(s.distanceNm, distanceUnit)}</span>
              </header>

              <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4">
                <div>
                  <dt className="label-caps">Vessels</dt>
                  <dd className="num text-[20px] font-semibold text-ink">{formatNumber(s.vessels)}</dd>
                </div>
                <div>
                  <dt className="label-caps">Avg transit</dt>
                  <dd className="num text-[20px] font-semibold text-ink">
                    {s.avgTransitDays.toFixed(1)}<span className="ml-1 text-[11px] font-normal text-muted">days</span>
                  </dd>
                </div>
                <div>
                  <dt className="label-caps">Active</dt>
                  <dd className="num text-[20px] font-semibold text-accent">{formatNumber(s.active)}</dd>
                </div>
                <div>
                  <dt className="label-caps">Delayed</dt>
                  <dd className={cn('num text-[20px] font-semibold', s.delayed > 0 ? 'text-warning' : 'text-ink')}>{formatNumber(s.delayed)}</dd>
                </div>
              </dl>

              <div className="mt-4 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line" title={`${s.active} underway of ${s.vessels}`}>
                  <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${s.vessels ? (s.active / s.vessels) * 100 : 0}%` }} />
                </div>
                <span className="num text-[10px] text-faint">{s.vessels ? Math.round((s.active / s.vessels) * 100) : 0}% at sea</span>
              </div>

              <p className="mt-3 line-clamp-2 text-[11px] leading-relaxed text-muted">{portNames.join(' → ')}</p>
              <p className="mt-1 text-[10px] text-faint">Schedule transit ~{s.lane.typicalTransitDays} days · ~{s.lane.annualTEUMillions}M TEU/yr (illustrative)</p>

              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant={isActive ? 'primary' : 'outline'}
                  icon={MapPinned}
                  onClick={() => {
                    ui.highlightLane(s.lane.id);
                    ui.setView('overview');
                  }}
                >
                  View on map
                </Button>
                <Button size="sm" variant="ghost" onClick={() => ui.openVesselsForLane(s.lane.id)}>
                  {s.vessels} vessels
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </PageShell>
  );
}
