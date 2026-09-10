import { useMemo, useState } from 'react';
import { Anchor, Search } from 'lucide-react';
import type { Port } from '@/types';
import { useAsync, useSimulation } from '@/lib/hooks';
import { getProviders } from '@/lib/providers';
import { ui } from '@/lib/store/ui';
import { mapBus } from '@/lib/map/bus';
import { formatNumber, flagEmoji } from '@/lib/formatting';
import { CongestionBar, CongestionBadge, EmptyState, Select, TextInput } from '@/components/ui';
import { PageShell, SortHeader, TableSkeleton } from '@/components/dashboard/PageShell';
import { REGIONS } from '@/data/regions';

type Column = 'name' | 'country' | 'congestion' | 'vesselsInPort' | 'vesselsAnchored' | 'arrivalsToday' | 'departuresToday' | 'averageWaitingHours';
const CONGESTION_RANK = { low: 0, medium: 1, high: 2 } as const;

function focusPort(p: Port) {
  ui.setView('overview');
  ui.openPort(p.id);
  mapBus.dispatch({ type: 'focusPort', id: p.id });
}

export function PortsPage() {
  const { loading } = useAsync(() => getProviders().ports.getPorts(), [], 300);
  const ports = useSimulation((s) => s.ports);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('all');
  const [sort, setSort] = useState<{ column: Column; dir: 'asc' | 'desc' }>({ column: 'vesselsInPort', dir: 'desc' });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = ports.filter((p) => (region === 'all' || p.region === region) && (!q || p.name.toLowerCase().includes(q) || p.country.toLowerCase().includes(q) || p.locode.toLowerCase().includes(q)));
    const dir = sort.dir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      if (sort.column === 'congestion') return (CONGESTION_RANK[a.congestion] - CONGESTION_RANK[b.congestion]) * dir;
      const av = a[sort.column];
      const bv = b[sort.column];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return list;
  }, [ports, query, region, sort]);

  const onSort = (column: Column) => setSort((s) => ({ column, dir: s.column === column && s.dir === 'asc' ? 'desc' : 'asc' }));
  const high = ports.filter((p) => p.congestion === 'high').length;

  return (
    <PageShell
      title="Ports"
      icon={Anchor}
      description={`${ports.length} ports monitored · ${high} with high congestion`}
      actions={
        <>
          <div className="relative w-full sm:w-52">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
            <TextInput placeholder="Search port, country…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" aria-label="Search ports" />
          </div>
          <Select label="Region" value={region} onChange={setRegion} options={[{ value: 'all', label: 'All regions' }, ...REGIONS.map((r) => ({ value: r, label: r }))]} />
        </>
      }
    >
      {loading ? (
        <TableSkeleton rows={10} cols={8} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Anchor} title="No ports match.">Try a different port name, country or region.</EmptyState>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[860px] border-collapse text-[13px]">
              <thead className="sticky top-0 z-10 bg-panel-solid/95 backdrop-blur">
                <tr className="border-b hairline">
                  <SortHeader label="Port" column="name" sort={sort} onSort={onSort} />
                  <SortHeader label="Country" column="country" sort={sort} onSort={onSort} />
                  <SortHeader label="Congestion" column="congestion" sort={sort} onSort={onSort} />
                  <SortHeader label="Vessels" column="vesselsInPort" sort={sort} onSort={onSort} align="right" />
                  <SortHeader label="Anchored" column="vesselsAnchored" sort={sort} onSort={onSort} align="right" />
                  <SortHeader label="Arrivals" column="arrivalsToday" sort={sort} onSort={onSort} align="right" />
                  <SortHeader label="Departures" column="departuresToday" sort={sort} onSort={onSort} align="right" />
                  <SortHeader label="Waiting time" column="averageWaitingHours" sort={sort} onSort={onSort} align="right" />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr
                    key={p.id}
                    tabIndex={0}
                    onClick={() => focusPort(p)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        focusPort(p);
                      }
                    }}
                    className="cursor-pointer border-b hairline transition-colors hover:bg-accent-soft/60 focus-visible:bg-accent-soft/60"
                  >
                    <td className="px-3 py-2 font-medium text-ink">
                      {p.name} <span className="num ml-1 text-[10px] text-faint">{p.locode}</span>
                    </td>
                    <td className="px-3 py-2 text-muted">
                      <span aria-hidden>{flagEmoji(p.countryCode)}</span> {p.country}
                    </td>
                    <td className="px-3 py-2"><CongestionBar congestion={p.congestion} hours={p.averageWaitingHours} /></td>
                    <td className="num px-3 py-2 text-right text-ink">{formatNumber(p.vesselsInPort)}</td>
                    <td className="num px-3 py-2 text-right text-muted">{formatNumber(p.vesselsAnchored)}</td>
                    <td className="num px-3 py-2 text-right text-muted">{formatNumber(p.arrivalsToday)}</td>
                    <td className="num px-3 py-2 text-right text-muted">{formatNumber(p.departuresToday)}</td>
                    <td className="num px-3 py-2 text-right text-ink">{p.averageWaitingHours.toFixed(1)} h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-[var(--border)] md:hidden">
            {rows.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => focusPort(p)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-medium text-ink">{p.name}</span>
                      <CongestionBadge congestion={p.congestion} />
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted">
                      {p.country} · <span className="num">{formatNumber(p.vesselsInPort)}</span> in port · <span className="num">{formatNumber(p.vesselsAnchored)}</span> anchored
                    </div>
                  </div>
                  <div className="num text-right text-[12px] text-ink">{p.averageWaitingHours.toFixed(1)} h</div>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </PageShell>
  );
}
