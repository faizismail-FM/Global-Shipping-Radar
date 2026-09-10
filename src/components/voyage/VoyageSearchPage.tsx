import { useMemo, useState } from 'react';
import { Search, Ship, ArrowRight, Container as ContainerIcon } from 'lucide-react';
import type { Vessel } from '@/types';
import { useSimulation } from '@/lib/hooks';
import { ui } from '@/lib/store/ui';
import { mapBus } from '@/lib/map/bus';
import { useSettings } from '@/lib/store/settings';
import { formatDateShort, formatSpeed, formatNumber } from '@/lib/formatting';
import { PORTS, PORT_BY_ID } from '@/data/ports';
import { LANE_BY_ID } from '@/data/lanes';
import { CONTAINERS } from '@/data/containers';
import { Button, EmptyState, Select, StatusBadge, TextInput } from '@/components/ui';
import { PageShell } from '@/components/dashboard/PageShell';

const PORT_OPTIONS = [{ value: '', label: 'Any port' }, ...[...PORTS].sort((a, b) => a.name.localeCompare(b.name)).map((p) => ({ value: p.name, label: p.name }))];

type MatchKind = 'calls' | 'transits';

/**
 * A vessel matches a port pair when it calls both ports in order on its
 * current voyage ("calls"), or when its lane passes both ports in its sailing
 * direction and the discharge port is still ahead of it ("transits").
 */
function matchVoyage(v: Vessel, pol: string, pod: string, vesselQuery: string, voyage: string): MatchKind | null {
  if (vesselQuery && !v.name.toLowerCase().includes(vesselQuery) && !v.operator.toLowerCase().includes(vesselQuery)) return null;
  if (voyage && !v.voyage.toLowerCase().includes(voyage)) return null;
  if (!pol && !pod) return 'calls';

  const a = pol ? v.route.indexOf(pol) : 0;
  const b = pod ? v.route.indexOf(pod) : v.route.length - 1;
  if ((!pol || a !== -1) && (!pod || b !== -1) && a < b) return 'calls';

  const lane = LANE_BY_ID.get(v.laneId);
  if (!lane) return null;
  const names = lane.ports.map((id) => PORT_BY_ID.get(id)?.name ?? id);
  const from = names.indexOf(v.departurePort);
  const to = names.indexOf(v.arrivalPort);
  if (from === -1 || to === -1 || from === to) return null;
  const dir = Math.sign(to - from);
  const iPol = pol ? names.indexOf(pol) : from;
  const iPod = pod ? names.indexOf(pod) : to;
  if (iPol === -1 || iPod === -1) return null;
  if (Math.sign(iPod - iPol) !== dir) return null;
  // The discharge port must still be ahead of the vessel.
  if ((iPod - from) * dir <= 0) return null;
  return 'transits';
}

export function VoyageSearchPage() {
  const vessels = useSimulation((s) => s.vessels);
  const speedUnit = useSettings((s) => s.speedUnit);
  const [pol, setPol] = useState('');
  const [pod, setPod] = useState('');
  const [vesselQuery, setVesselQuery] = useState('');
  const [voyage, setVoyage] = useState('');

  const results = useMemo(() => {
    const vq = vesselQuery.trim().toLowerCase();
    const vo = voyage.trim().toLowerCase();
    if (!pol && !pod && !vq && !vo) return [];
    return vessels
      .map((v) => ({ v, kind: matchVoyage(v, pol, pod, vq, vo) }))
      .filter((x): x is { v: Vessel; kind: MatchKind } => x.kind !== null)
      .sort((a, b) => (a.kind === b.kind ? new Date(a.v.eta).getTime() - new Date(b.v.eta).getTime() : a.kind === 'calls' ? -1 : 1))
      .slice(0, 60);
  }, [vessels, pol, pod, vesselQuery, voyage]);

  const containers = useMemo(() => {
    if (!pol && !pod) return [];
    return CONTAINERS.filter((c) => (!pol || c.route.includes(pol)) && (!pod || c.route.includes(pod)));
  }, [pol, pod]);

  const searched = Boolean(pol || pod || vesselQuery.trim() || voyage.trim());

  return (
    <PageShell title="Voyage Search" icon={Search} description="Find vessels sailing between two ports, or by voyage number">
      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        <div className="grid grid-cols-1 gap-3 rounded-lg border hairline p-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_1fr_1fr]">
          <label className="flex flex-col gap-1">
            <span className="label-caps">Port of loading (POL)</span>
            <Select label="Port of loading" value={pol} onChange={setPol} options={PORT_OPTIONS} />
          </label>
          <div className="hidden items-end justify-center pb-2 text-faint lg:flex">
            <ArrowRight size={16} />
          </div>
          <label className="flex flex-col gap-1">
            <span className="label-caps">Port of discharge (POD)</span>
            <Select label="Port of discharge" value={pod} onChange={setPod} options={PORT_OPTIONS} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label-caps">Vessel / operator</span>
            <TextInput value={vesselQuery} onChange={(e) => setVesselQuery(e.target.value)} placeholder="e.g. MAERSK" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label-caps">Voyage no.</span>
            <TextInput value={voyage} onChange={(e) => setVoyage(e.target.value)} placeholder="e.g. 123E" className="num" />
          </label>
        </div>

        {!searched ? (
          <div className="mt-8 rounded-lg border border-dashed hairline p-6 text-center text-[13px] text-muted">
            Select a port pair or type a vessel name to list matching simulated voyages.
          </div>
        ) : results.length === 0 ? (
          <div className="mt-6">
            <EmptyState icon={Ship} title="No voyages found." action={<Button size="sm" onClick={() => { setPol(''); setPod(''); setVesselQuery(''); setVoyage(''); }}>Clear search</Button>}>
              No simulated vessel currently sails {pol || 'anywhere'} → {pod || 'anywhere'} in that order. Try swapping the ports or removing a filter.
            </EmptyState>
          </div>
        ) : (
          <section className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="label-caps">Voyages · {formatNumber(results.length)}</h2>
              <span className="text-[11px] text-faint">Scheduled calls first, then vessels transiting the lane · sorted by ETA</span>
            </div>
            <ul className="divide-y divide-[var(--border)] rounded-lg border hairline">
              {results.map(({ v, kind }) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => { ui.setView('overview'); ui.openVessel(v.id); ui.showRoute(v.id); mapBus.dispatch({ type: 'focusVessel', id: v.id, zoom: 5 }); }}
                    className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-accent-soft/60 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-medium text-ink">{v.name}</span>
                        <span className="num text-[11px] text-faint">{v.voyage}</span>
                        <StatusBadge status={v.status} />
                        {(pol || pod) && (
                          <span className={kind === 'calls' ? 'rounded bg-success-soft px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-success' : 'rounded bg-line px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted'}>
                            {kind === 'calls' ? 'Scheduled call' : 'Transits lane'}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-muted">{v.route.join(' → ')}</div>
                    </div>
                    <div className="flex items-center gap-4 text-[12px]">
                      <span className="num text-muted">{formatSpeed(v.speed, speedUnit)}</span>
                      <span className="text-muted">
                        ETA {v.destination} <span className="num text-ink">{formatDateShort(v.eta)}</span>
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {containers.length > 0 && (
          <section className="mt-6">
            <h2 className="label-caps mb-2">Demo containers on this trade · {containers.length}</h2>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {containers.map((c) => (
                <li key={c.containerNumber}>
                  <button type="button" onClick={() => ui.openTracking(c.containerNumber)} className="flex w-full items-center gap-3 rounded-md border hairline px-3 py-2 text-left hover:border-accent">
                    <ContainerIcon size={14} className="text-warning" />
                    <span className="num flex-1 text-[12px] text-ink">{c.containerNumber}</span>
                    <span className="text-[11px] text-muted">{c.status}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </PageShell>
  );
}
