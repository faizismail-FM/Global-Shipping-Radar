import { Ship, Route, Crosshair, Container } from 'lucide-react';
import { getProviders } from '@/lib/providers';
import { useAsync, useSimulation } from '@/lib/hooks';
import { useSettings } from '@/lib/store/settings';
import { ui, useUI } from '@/lib/store/ui';
import { mapBus } from '@/lib/map/bus';
import { formatCoordinate } from '@/lib/geo';
import { formatDateLong, formatDistance, formatHeading, formatRelative, formatSpeed, formatTeu, flagEmoji, formatNumber } from '@/lib/formatting';
import { Button, DemoTag, KeyValue, PanelHeader, RouteList, Skeleton, StatusBadge, EmptyState } from '@/components/ui';
import { CONTAINERS } from '@/data/containers';
import { PORTS } from '@/data/ports';
import { useNow } from '@/lib/hooks';

export function VesselDetailPanel({ id, onBack, onClose }: { id: string; onBack?: () => void; onClose: () => void }) {
  const { loading, data } = useAsync(() => getProviders().vessels.getVessel(id), [id], 260);
  const live = useSimulation((s) => s.vessels.find((v) => v.id === id) ?? null);
  const speedUnit = useSettings((s) => s.speedUnit);
  const distanceUnit = useSettings((s) => s.distanceUnit);
  const routeShown = useUI((s) => s.routeVesselId === id);
  const now = useNow(5000);

  const vessel = live ?? data;
  const containers = vessel ? CONTAINERS.filter((c) => c.vesselName === vessel.name) : [];

  return (
    <div className="flex h-full flex-col">
      <PanelHeader title="Vessel details" icon={Ship} onBack={onBack} onClose={onClose} />
      {loading && !vessel ? (
        <VesselSkeleton />
      ) : !vessel ? (
        <EmptyState icon={Ship} title="Vessel not found">
          The vessel is no longer in the simulated fleet.
        </EmptyState>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
              <Ship size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[17px] font-semibold leading-tight text-ink">{vessel.name}</h3>
              <p className="text-[12px] text-muted">
                Container ship · {vessel.operator}
              </p>
              <p className="mt-0.5 text-[12px] text-muted">
                <span aria-hidden>{flagEmoji(vessel.flagCode)}</span> {vessel.flag}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <KeyValue label="IMO" value={vessel.imo} mono />
            <KeyValue label="MMSI" value={vessel.mmsi} mono />
          </div>

          <div className="mt-4">
            <div className="label-caps">Status</div>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={vessel.status} />
              {vessel.delayHours > 0 && <span className="text-[11px] text-warning">+{vessel.delayHours}h behind schedule</span>}
            </div>
          </div>

          <div className="mt-4">
            <KeyValue label="Current position" value={formatCoordinate(vessel.latitude, vessel.longitude)} mono />
            <div className="mt-0.5 text-[11px] text-faint">Updated {formatRelative(new Date(vessel.lastUpdated).getTime(), now)}</div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <KeyValue label="Speed" value={formatSpeed(vessel.speed, speedUnit)} mono />
            <KeyValue label="Heading" value={formatHeading(vessel.heading)} mono />
          </div>

          <div className="mt-5">
            <div className="label-caps mb-2">Voyage {vessel.voyage}</div>
            <RouteList stops={vessel.route} current={vessel.status === 'moored' ? 0 : vessel.route.indexOf(vessel.destination)} />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-3">
            <KeyValue label={vessel.status === 'moored' ? 'ETD' : 'ETA'} value={formatDateLong(vessel.eta)} />
            <KeyValue label="Voyage distance" value={formatDistance(vessel.voyageDistanceNm, distanceUnit)} mono />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <KeyValue label="Capacity" value={formatTeu(vessel.capacityTEU)} mono />
            <KeyValue label="Dimensions" value={`${formatNumber(vessel.vesselLength)} × ${vessel.vesselWidth} m`} mono />
          </div>

          {containers.length > 0 && (
            <div className="mt-5">
              <div className="label-caps mb-1.5">Demo containers on board</div>
              <div className="space-y-1">
                {containers.map((c) => (
                  <button
                    key={c.containerNumber}
                    type="button"
                    onClick={() => ui.openContainer(c.containerNumber)}
                    className="flex w-full items-center gap-2 rounded-md border hairline px-2.5 py-1.5 text-left hover:border-accent"
                  >
                    <Container size={13} className="text-warning" />
                    <span className="num flex-1 text-[12px] text-ink">{c.containerNumber}</span>
                    <span className="text-[11px] text-muted">{c.status}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex gap-2">
            <Button
              variant={routeShown ? 'primary' : 'outline'}
              icon={Route}
              block
              onClick={() => ui.showRoute(routeShown ? null : vessel.id)}
            >
              {routeShown ? 'Hide route' : 'View route'}
            </Button>
            <Button variant="outline" icon={Crosshair} onClick={() => mapBus.dispatch({ type: 'focusVessel', id: vessel.id, zoom: 7 })} aria-label="Centre map on vessel">
              Locate
            </Button>
          </div>

          <div className="mt-4 flex items-center justify-between border-t hairline pt-3">
            <DemoTag />
            {PORTS.some((p) => p.name === vessel.destination) && (
              <button
                type="button"
                className="text-[11px] text-accent hover:underline"
                onClick={() => {
                  const port = PORTS.find((p) => p.name === vessel.destination);
                  if (port) {
                    ui.openPort(port.id);
                    mapBus.dispatch({ type: 'focusPort', id: port.id });
                  }
                }}
              >
                View {vessel.destination} →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function VesselSkeleton() {
  return (
    <div className="space-y-4 px-4 py-4" aria-busy="true" aria-label="Loading vessel details">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
      </div>
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-9" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-9" />
    </div>
  );
}
