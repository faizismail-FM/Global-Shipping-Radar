import { useEffect, useMemo, useState } from 'react';
import { Ship, Search, SlidersHorizontal, X } from 'lucide-react';
import type { Vessel, VesselStatus } from '@/types';
import { useAsync, useSimulation, useNow } from '@/lib/hooks';
import { getProviders } from '@/lib/providers';
import { ui, useUI, isFilterActive, ALL_STATUSES } from '@/lib/store/ui';
import { useSettings } from '@/lib/store/settings';
import { mapBus } from '@/lib/map/bus';
import { applyFilters, vesselsForPort } from '@/lib/selectors';
import { formatDateShort, formatNumber, formatRelative, formatSpeed } from '@/lib/formatting';
import { PORT_BY_ID } from '@/data/ports';
import { LANE_BY_ID } from '@/data/lanes';
import { Button, EmptyState, Select, StatusBadge, TextInput } from '@/components/ui';
import { PageShell, Pagination, SortHeader, TableSkeleton } from '@/components/dashboard/PageShell';
import { cn } from '@/lib/cn';

type Column = 'name' | 'imo' | 'status' | 'speed' | 'destination' | 'eta' | 'operator' | 'capacityTEU' | 'lastUpdated';
const PAGE_SIZE = 20;

function focusVessel(v: Vessel) {
  ui.setView('overview');
  ui.openVessel(v.id);
  mapBus.dispatch({ type: 'focusVessel', id: v.id, zoom: 6.5 });
}

export function VesselsPage() {
  const { loading } = useAsync(() => getProviders().vessels.getVessels(), [], 350);
  const vessels = useSimulation((s) => s.vessels);
  const isLive = useSimulation((s) => s.dataSource === 'ais');
  const filters = useUI((s) => s.filters);
  const portId = useUI((s) => s.vesselsPagePort);
  const laneId = useUI((s) => s.vesselsPageLane);
  const lane = laneId ? LANE_BY_ID.get(laneId) : undefined;
  const speedUnit = useSettings((s) => s.speedUnit);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ column: Column; dir: 'asc' | 'desc' }>({ column: 'name', dir: 'asc' });
  const [page, setPage] = useState(0);
  const now = useNow(10_000);
  const port = portId ? PORT_BY_ID.get(portId) : undefined;

  const rows = useMemo(() => {
    let list = applyFilters(vessels, filters);
    if (port) list = vesselsForPort(list, port);
    if (lane) list = list.filter((v) => v.laneId === lane.id);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((v) => v.name.toLowerCase().includes(q) || v.imo.includes(q) || v.mmsi.includes(q) || v.destination.toLowerCase().includes(q) || v.operator.toLowerCase().includes(q));
    }
    const dir = sort.dir === 'asc' ? 1 : -1;
    const col = sort.column;
    return [...list].sort((a, b) => {
      const av = a[col];
      const bv = b[col];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [vessels, filters, port, lane, query, sort]);

  const pages = Math.ceil(rows.length / PAGE_SIZE);
  useEffect(() => setPage(0), [query, filters, portId, laneId, sort]);
  useEffect(() => {
    if (page > 0 && page >= pages) setPage(Math.max(0, pages - 1));
  }, [page, pages]);
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const onSort = (column: Column) => setSort((s) => ({ column, dir: s.column === column && s.dir === 'asc' ? 'desc' : 'asc' }));
  const statusValue = filters.statuses.length === 1 ? (filters.statuses[0] as string) : 'all';

  return (
    <PageShell
      title="Vessels"
      icon={Ship}
      description={`${formatNumber(rows.length)} of ${formatNumber(vessels.length)} ${isLive ? 'live AIS vessels (cargo and tankers)' : 'simulated container vessels'}`}
      actions={
        <>
          <div className="relative w-full sm:w-56">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
            <TextInput placeholder="Search name, IMO, MMSI…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" aria-label="Search vessels" />
          </div>
          <Select
            label="Status"
            value={statusValue}
            onChange={(v) => ui.setFilters({ statuses: v === 'all' ? [...ALL_STATUSES] : [v as VesselStatus] })}
            options={[{ value: 'all', label: 'All statuses' }, ...ALL_STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))]}
          />
          <Button size="sm" variant="outline" icon={SlidersHorizontal} onClick={() => ui.setOverlay('filters')} className="hidden sm:inline-flex">
            Filters
          </Button>
        </>
      }
    >
      {(port || lane || isFilterActive(filters)) && (
        <div className="flex flex-wrap items-center gap-2 border-b hairline px-4 py-2 text-[12px]">
          {port && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-accent">
              Near / bound for {port.name}
              <button type="button" aria-label="Clear port filter" onClick={() => ui.openVesselsForPort(null)}>
                <X size={12} />
              </button>
            </span>
          )}
          {lane && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-accent">
              Lane: {lane.name}
              <button type="button" aria-label="Clear lane filter" onClick={() => ui.openVesselsForLane(null)}>
                <X size={12} />
              </button>
            </span>
          )}
          {isFilterActive(filters) && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-line px-2.5 py-1 text-muted">
              Map filters active
              <button type="button" aria-label="Reset filters" onClick={() => ui.resetFilters()}>
                <X size={12} />
              </button>
            </span>
          )}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={10} cols={7} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Ship} title="No vessels found." action={<Button size="sm" onClick={() => { setQuery(''); ui.resetFilters(); ui.openVesselsForPort(null); ui.openVesselsForLane(null); ui.setView('vessels'); }}>Clear search & filters</Button>}>
          Try searching for another vessel name, IMO number, or MMSI — or relax the active filters.
        </EmptyState>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] border-collapse text-[13px]">
              <thead className="sticky top-0 z-10 bg-panel-solid/95 backdrop-blur">
                <tr className="border-b hairline">
                  <SortHeader label="Vessel" column="name" sort={sort} onSort={onSort} />
                  <SortHeader label="IMO" column="imo" sort={sort} onSort={onSort} />
                  <SortHeader label="Status" column="status" sort={sort} onSort={onSort} />
                  <SortHeader label="Speed" column="speed" sort={sort} onSort={onSort} align="right" />
                  <SortHeader label="Destination" column="destination" sort={sort} onSort={onSort} />
                  <SortHeader label="ETA" column="eta" sort={sort} onSort={onSort} />
                  <SortHeader label="Operator" column="operator" sort={sort} onSort={onSort} />
                  <SortHeader label="Capacity" column="capacityTEU" sort={sort} onSort={onSort} align="right" />
                  <SortHeader label="Updated" column="lastUpdated" sort={sort} onSort={onSort} align="right" />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((v) => (
                  <tr
                    key={v.id}
                    tabIndex={0}
                    onClick={() => focusVessel(v)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        focusVessel(v);
                      }
                    }}
                    className="cursor-pointer border-b hairline transition-colors hover:bg-accent-soft/60 focus-visible:bg-accent-soft/60"
                  >
                    <td className="px-3 py-2 font-medium text-ink">{v.name}</td>
                    <td className="num px-3 py-2 text-muted">{v.imo || '—'}</td>
                    <td className="px-3 py-2"><StatusBadge status={v.status} /></td>
                    <td className="num px-3 py-2 text-right text-ink">{formatSpeed(v.speed, speedUnit)}</td>
                    <td className="px-3 py-2 text-ink">{v.destination || '—'}</td>
                    <td className="num px-3 py-2 text-muted">{v.eta ? formatDateShort(v.eta) : '—'}</td>
                    <td className="max-w-[200px] truncate px-3 py-2 text-muted">{v.operator || (v.callSign ? `Call sign ${v.callSign}` : '—')}</td>
                    <td className="num px-3 py-2 text-right text-muted">{v.capacityTEU > 0 ? formatNumber(v.capacityTEU) : '—'}</td>
                    <td className="num px-3 py-2 text-right text-faint">{formatRelative(new Date(v.lastUpdated).getTime(), now)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="divide-y divide-[var(--border)] md:hidden">
            {pageRows.map((v) => (
              <li key={v.id}>
                <button type="button" onClick={() => focusVessel(v)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-medium text-ink">{v.name}</span>
                      <StatusBadge status={v.status} />
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-muted">
                      IMO <span className="num">{v.imo || '—'}</span> · {v.operator || (v.callSign ? `Call sign ${v.callSign}` : 'Live AIS')}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted">
                      → {v.destination || '—'} · ETA <span className="num">{v.eta ? formatDateShort(v.eta) : '—'}</span>
                    </div>
                  </div>
                  <div className={cn('num text-right text-[12px]', v.status === 'underway' ? 'text-accent' : 'text-faint')}>{formatSpeed(v.speed, speedUnit)}</div>
                </button>
              </li>
            ))}
          </ul>
          <Pagination page={page} pages={pages} onChange={setPage} total={rows.length} pageSize={PAGE_SIZE} />
        </>
      )}
    </PageShell>
  );
}
