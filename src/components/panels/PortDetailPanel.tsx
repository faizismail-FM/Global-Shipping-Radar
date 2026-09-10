import { useMemo } from 'react';
import { Anchor, Ship, ListFilter, Crosshair } from 'lucide-react';
import { getProviders } from '@/lib/providers';
import { useAsync, useSimulation } from '@/lib/hooks';
import { ui } from '@/lib/store/ui';
import { mapBus } from '@/lib/map/bus';
import { useSettings } from '@/lib/store/settings';
import { formatDistance, formatNumber, flagEmoji } from '@/lib/formatting';
import { vesselsNearPort } from '@/lib/selectors';
import { Button, CongestionBadge, DemoTag, EmptyState, KeyValue, PanelHeader, Skeleton, StatusDot } from '@/components/ui';
import { cn } from '@/lib/cn';

export function PortDetailPanel({ id, onBack, onClose }: { id: string; onBack?: () => void; onClose: () => void }) {
  const { loading, data } = useAsync(() => getProviders().ports.getPort(id), [id], 220);
  const live = useSimulation((s) => s.ports.find((p) => p.id === id) ?? null);
  const vessels = useSimulation((s) => s.vessels);
  const distanceUnit = useSettings((s) => s.distanceUnit);
  const port = live ?? data;
  const nearby = useMemo(() => (port ? vesselsNearPort(vessels, port, 200).slice(0, 8) : []), [vessels, port]);

  return (
    <div className="flex h-full flex-col">
      <PanelHeader title="Port details" icon={Anchor} onBack={onBack} onClose={onClose} />
      {loading && !port ? (
        <PortSkeleton />
      ) : !port ? (
        <EmptyState icon={Anchor} title="Port not found" />
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
              <Anchor size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[17px] font-semibold leading-tight text-ink">{port.name}</h3>
              <p className="text-[12px] text-muted">
                <span aria-hidden>{flagEmoji(port.countryCode)}</span> {port.country} · <span className="num">{port.locode}</span>
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div className="label-caps">Congestion</div>
            <div className="mt-1 flex items-center gap-2">
              <CongestionBadge congestion={port.congestion} />
              <span className="num text-[12px] text-muted">{port.averageWaitingHours.toFixed(1)} h avg. waiting</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
            <KeyValue label="Vessels in port" value={formatNumber(port.vesselsInPort)} mono />
            <KeyValue label="Anchored" value={formatNumber(port.vesselsAnchored)} mono />
            <KeyValue label="Arrivals today" value={formatNumber(port.arrivalsToday)} mono />
            <KeyValue label="Departures today" value={formatNumber(port.departuresToday)} mono />
          </div>

          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="label-caps">Nearby fleet · {formatDistance(200, distanceUnit)}</div>
              <span className="num text-[11px] text-faint">{nearby.length}</span>
            </div>
            {nearby.length === 0 ? (
              <p className="text-[12px] text-faint">No simulated vessels within range.</p>
            ) : (
              <ul className="space-y-0.5">
                {nearby.map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => {
                        ui.openVessel(v.id);
                        mapBus.dispatch({ type: 'focusVessel', id: v.id, zoom: 8 });
                      }}
                      className={cn('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent-soft')}
                    >
                      <StatusDot status={v.status} />
                      <span className="flex-1 truncate text-[12px] text-ink">{v.name}</span>
                      <span className="num text-[11px] text-faint">{formatDistance(Math.round(v.distanceNm), distanceUnit)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-5 flex gap-2">
            <Button variant="primary" icon={ListFilter} block onClick={() => ui.openVesselsForPort(port.id)}>
              View vessels
            </Button>
            <Button variant="outline" icon={Crosshair} onClick={() => mapBus.dispatch({ type: 'focusPort', id: port.id })} aria-label="Centre map on port">
              Locate
            </Button>
          </div>
          <div className="mt-4 flex items-center justify-between border-t hairline pt-3">
            <DemoTag>Simulated statistics</DemoTag>
            <span className="flex items-center gap-1 text-[11px] text-faint">
              <Ship size={11} /> {vessels.filter((v) => v.destination === port.name).length} inbound
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function PortSkeleton() {
  return (
    <div className="space-y-4 px-4 py-4" aria-busy="true" aria-label="Loading port details">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-5 w-28" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
      <Skeleton className="h-24" />
      <Skeleton className="h-9" />
    </div>
  );
}
