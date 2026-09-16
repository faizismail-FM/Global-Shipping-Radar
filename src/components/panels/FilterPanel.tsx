import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import type { Region, VesselStatus, VesselType } from '@/types';
import { ALL_STATUSES, ALL_TYPES, ui, useUI, isFilterActive, type SpeedBand } from '@/lib/store/ui';
import { useSimulation } from '@/lib/hooks';
import { applyFilters, vesselRegion, vesselTypeLabel } from '@/lib/selectors';
import { REGIONS } from '@/data/regions';
import { Button, Checkbox, PanelHeader, Segmented, TextInput } from '@/components/ui';
import { useMemo } from 'react';

const SPEED_OPTIONS: { value: SpeedBand; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: '0-5', label: '0–5' },
  { value: '5-15', label: '5–15' },
  { value: '15-25', label: '15–25' },
  { value: '25+', label: '25+' },
];

export function FilterPanel({ onClose }: { onClose: () => void }) {
  const filters = useUI((s) => s.filters);
  const vessels = useSimulation((s) => s.vessels);
  const active = isFilterActive(filters);

  const counts = useMemo(() => {
    const byStatus: Record<VesselStatus, number> = { underway: 0, anchored: 0, moored: 0, delayed: 0 };
    const byRegion = new Map<Region, number>();
    const byType = new Map<VesselType, number>();
    for (const v of vessels) {
      byStatus[v.status]++;
      const r = vesselRegion(v);
      byRegion.set(r, (byRegion.get(r) ?? 0) + 1);
      byType.set(v.type, (byType.get(v.type) ?? 0) + 1);
    }
    return { byStatus, byRegion, byType, visible: applyFilters(vessels, filters).length };
  }, [vessels, filters]);
  const presentTypes = ALL_TYPES.filter((t) => (counts.byType.get(t) ?? 0) > 0);

  const toggleStatus = (s: VesselStatus, on: boolean) =>
    ui.setFilters({ statuses: on ? [...filters.statuses, s] : filters.statuses.filter((x) => x !== s) });
  const toggleType = (t: VesselType, on: boolean) =>
    ui.setFilters({ types: on ? [...filters.types, t] : filters.types.filter((x) => x !== t) });
  const toggleRegion = (r: Region, on: boolean) =>
    ui.setFilters({ regions: on ? [...filters.regions, r] : filters.regions.filter((x) => x !== r) });

  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        title="Filters"
        icon={SlidersHorizontal}
        onClose={onClose}
        actions={
          active ? (
            <button type="button" onClick={() => ui.resetFilters()} className="flex items-center gap-1 text-[11px] text-accent hover:underline">
              <RotateCcw size={11} /> Reset
            </button>
          ) : undefined
        }
      />
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="mb-3 flex items-center justify-between rounded-md bg-accent-soft px-3 py-2 text-[12px]">
          <span className="text-muted">Vessels shown</span>
          <span className="num font-semibold text-ink">
            {counts.visible} / {vessels.length}
          </span>
        </div>

        <section className="mb-4">
          <div className="label-caps mb-1">Vessel status</div>
          {ALL_STATUSES.map((s) => (
            <Checkbox key={s} checked={filters.statuses.includes(s)} onChange={(on) => toggleStatus(s, on)} label={<span className="capitalize">{s}</span>} count={counts.byStatus[s]} />
          ))}
        </section>

        <section className="mb-4">
          <div className="label-caps mb-1">Vessel type</div>
          {presentTypes.map((t) => (
            <Checkbox key={t} checked={filters.types.includes(t)} onChange={(on) => toggleType(t, on)} label={vesselTypeLabel(t)} count={counts.byType.get(t) ?? 0} />
          ))}
          {presentTypes.length === 1 && presentTypes[0] === 'container' && (
            <p className="mt-0.5 text-[10px] text-faint">The simulated fleet contains container vessels only.</p>
          )}
          {presentTypes.includes('cargo') && (
            <p className="mt-0.5 text-[10px] text-faint">AIS reports container ships as cargo vessels.</p>
          )}
        </section>

        <section className="mb-4">
          <div className="label-caps mb-1.5">Speed (knots)</div>
          <Segmented value={filters.speed} options={SPEED_OPTIONS} onChange={(speed) => ui.setFilters({ speed })} label="Speed range" />
        </section>

        <section className="mb-4">
          <div className="label-caps mb-1">Region</div>
          <div className="grid grid-cols-2 gap-x-3">
            {REGIONS.map((r) => (
              <Checkbox key={r} checked={filters.regions.includes(r)} onChange={(on) => toggleRegion(r, on)} label={r} count={counts.byRegion.get(r) ?? 0} />
            ))}
          </div>
        </section>

        <section className="mb-2">
          <div className="label-caps mb-1.5">Destination</div>
          <TextInput placeholder="Search destination…" value={filters.destination} onChange={(e) => ui.setFilters({ destination: e.target.value })} aria-label="Filter by destination" />
        </section>
      </div>
      <div className="border-t hairline px-4 py-3 md:hidden">
        <Button variant="primary" block onClick={onClose}>
          Show {counts.visible} vessels
        </Button>
      </div>
    </div>
  );
}
