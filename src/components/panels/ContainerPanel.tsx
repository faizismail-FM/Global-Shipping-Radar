import { Container, Ship, ExternalLink } from 'lucide-react';
import { getProviders } from '@/lib/providers';
import { useAsync, useSimulation } from '@/lib/hooks';
import { ui } from '@/lib/store/ui';
import { mapBus } from '@/lib/map/bus';
import { formatDateLong } from '@/lib/formatting';
import { Button, DemoTag, EmptyState, KeyValue, PanelHeader, Skeleton } from '@/components/ui';
import { ContainerTimeline } from '@/components/tracking/ContainerTimeline';

export function ContainerPanel({ number, onBack, onClose }: { number: string; onBack?: () => void; onClose: () => void }) {
  const { loading, data: container } = useAsync(() => getProviders().containers.searchContainer(number), [number], 300);
  const vessel = useSimulation((s) => (container ? (s.vessels.find((v) => v.name === container.vesselName) ?? null) : null));

  return (
    <div className="flex h-full flex-col">
      <PanelHeader title="Container" icon={Container} onBack={onBack} onClose={onClose} />
      {loading ? (
        <ContainerSkeleton />
      ) : !container ? (
        <EmptyState
          icon={Container}
          title="Container not found."
          action={
            <Button size="sm" variant="outline" onClick={() => ui.openTracking(number)}>
              Open container tracking
            </Button>
          }
        >
          <span className="num">{number}</span> is not in the demo dataset. This demo only contains simulated tracking records; live lookups require a connected carrier or tracking data source.
        </EmptyState>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-warning-soft text-warning">
              <Container size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="num truncate text-[17px] font-semibold leading-tight text-ink">{container.containerNumber}</h3>
              <p className="text-[12px] text-muted">
                {container.sizeType} · {container.status}
              </p>
            </div>
            <DemoTag>Demo tracking data</DemoTag>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
            <KeyValue
              label="Vessel"
              value={
                vessel ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-accent hover:underline"
                    onClick={() => {
                      ui.openVessel(vessel.id);
                      mapBus.dispatch({ type: 'focusVessel', id: vessel.id, zoom: 6.5 });
                    }}
                  >
                    <Ship size={12} /> {container.vesselName}
                  </button>
                ) : (
                  container.vesselName
                )
              }
            />
            <KeyValue label="Voyage" value={container.voyage} mono />
            <KeyValue label="POL" value={container.portOfLoading} />
            <KeyValue label="POD" value={container.portOfDischarge} />
            <KeyValue label="Carrier" value={container.carrier} />
            <KeyValue label="Bill of lading" value={container.billOfLading} mono />
          </div>

          <div className="mt-5">
            <div className="label-caps mb-2">Route</div>
            <ContainerTimeline milestones={container.milestones} compact />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <KeyValue label="Current location" value={container.currentLocation} />
            <KeyValue label="ETA" value={formatDateLong(container.estimatedArrival)} />
          </div>

          <div className="mt-5">
            <Button variant="outline" icon={ExternalLink} block onClick={() => ui.openTracking(container.containerNumber)}>
              Open in Container Tracking
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ContainerSkeleton() {
  return (
    <div className="space-y-4 px-4 py-4" aria-busy="true" aria-label="Looking up container">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
      <Skeleton className="h-32" />
    </div>
  );
}
