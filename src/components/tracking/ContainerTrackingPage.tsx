import { useEffect, useState } from 'react';
import { Container, Search, Ship, Info } from 'lucide-react';
import type { Container as ContainerRecord } from '@/types';
import { getProviders, useContainerTracking, ContainerLookupError } from '@/lib/providers';
import { useSimulation } from '@/lib/hooks';
import { ui, useUI } from '@/lib/store/ui';
import { mapBus } from '@/lib/map/bus';
import { classifyQuery } from '@/lib/search';
import { formatDateLong } from '@/lib/formatting';
import { CONTAINERS } from '@/data/containers';
import { Button, DemoTag, KeyValue, LiveTag, Skeleton } from '@/components/ui';
import { PageShell } from '@/components/dashboard/PageShell';
import { ContainerTimeline } from './ContainerTimeline';
import { cn } from '@/lib/cn';

type LookupState =
  | { status: 'idle' }
  | { status: 'loading'; number: string }
  | { status: 'found'; container: ContainerRecord }
  | { status: 'not-found'; number: string }
  | { status: 'invalid'; number: string }
  | { status: 'error'; number: string; message: string };

export function ContainerTrackingPage() {
  const initial = useUI((s) => s.trackingQuery);
  const [value, setValue] = useState(initial);
  const [state, setState] = useState<LookupState>({ status: 'idle' });
  const vessels = useSimulation((s) => s.vessels);
  const tracking = useContainerTracking((s) => ({ configured: s.configured, carriers: s.carriers, lastLookup: s.lastLookup }));
  const carriers = tracking.carriers.join(', ');

  const lookup = async (raw: string) => {
    const q = classifyQuery(raw);
    if (!raw.trim()) return;
    if (q.kind !== 'container') {
      setState({ status: 'invalid', number: raw.trim() });
      return;
    }
    setState({ status: 'loading', number: q.value });
    try {
      const result = await getProviders().containers.searchContainer(q.value);
      setState(result ? { status: 'found', container: result } : { status: 'not-found', number: q.value });
    } catch (err) {
      setState({ status: 'error', number: q.value, message: err instanceof ContainerLookupError ? err.message : 'The tracking lookup failed. Please try again.' });
    }
  };

  useEffect(() => {
    if (initial) {
      setValue(initial);
      void lookup(initial);
      ui.openTracking('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const found = state.status === 'found' ? state.container : null;
  const vessel = found ? vessels.find((v) => v.name === found.vesselName || (found.vesselImo !== undefined && v.imo === found.vesselImo)) : undefined;
  const badge = found && !found.demo ? <LiveTag label={`Live · ${found.carrier}`} title={`Carrier events from ${found.source?.name ?? found.carrier}`} /> : <DemoTag />;

  return (
    <PageShell
      title="Container Tracking"
      icon={Container}
      description={tracking.configured ? `Live carrier tracking via ${carriers} · demo records also available` : 'Look up a container number to see its simulated tracking timeline'}
      badge={badge}
    >
      <div className="mx-auto w-full max-w-3xl px-4 py-6 md:py-10">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void lookup(value);
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <label className="relative flex-1">
            <span className="sr-only">Container number</span>
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
            <input
              value={value}
              onChange={(e) => setValue(e.target.value.toUpperCase())}
              placeholder="Enter container number, e.g. MSBU5471161"
              autoComplete="off"
              spellCheck={false}
              className="num h-12 w-full rounded-lg border hairline bg-elevated/60 pl-11 pr-4 text-[15px] tracking-wider text-ink placeholder:font-sans placeholder:tracking-normal placeholder:text-faint focus:border-accent focus:outline-none"
            />
          </label>
          <Button type="submit" variant="primary" className="h-12 px-6" disabled={state.status === 'loading'}>
            Track container
          </Button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-faint">
          <span className="mr-1">Demo records:</span>
          {CONTAINERS.slice(0, 6).map((c) => (
            <button key={c.containerNumber} type="button" onClick={() => { setValue(c.containerNumber); void lookup(c.containerNumber); }} className="num rounded border hairline px-1.5 py-0.5 text-muted hover:border-accent hover:text-accent">
              {c.containerNumber}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {state.status === 'idle' && (
            <div className="rounded-lg border border-dashed hairline p-6 text-center">
              <Info size={18} className="mx-auto text-faint" />
              <p className="mt-2 text-[13px] text-muted">Enter an ISO 6346 container number (4 letters + 7 digits).</p>
              <p className="mt-1 text-[12px] text-faint">
                {tracking.configured
                  ? `Live tracking is connected for ${carriers}: any container on a ${carriers} booking resolves to real carrier events. Other carriers are not connected yet; the demo records above still work.`
                  : tracking.configured === null
                    ? 'Checking which carriers are connected…'
                    : 'No carrier is connected on the server, so only the built-in demo records resolve. Live tracking needs carrier credentials (see the README).'}
              </p>
            </div>
          )}

          {state.status === 'invalid' && (
            <div className="rounded-lg border border-warning/40 bg-warning-soft p-4 text-[13px]">
              <p className="font-medium text-warning">"{state.number}" does not look like a container number.</p>
              <p className="mt-1 text-muted">Container numbers have 4 letters (owner code + category identifier) followed by 7 digits, e.g. <span className="num">MSBU5471161</span>.</p>
            </div>
          )}

          {state.status === 'not-found' && (
            <div className="rounded-lg border hairline p-6 text-center">
              <Container size={20} className="mx-auto text-faint" />
              <p className="mt-2 text-[14px] font-medium text-ink">Container not found.</p>
              <p className="mt-1 text-[12px] text-muted">
                {tracking.configured ? (
                  <>
                    {carriers} reported no events for <span className="num">{state.number}</span>, and it is not a demo record. Only containers on {carriers} bookings are covered; other carriers are not connected yet.
                  </>
                ) : (
                  <>
                    <span className="num">{state.number}</span> is not part of this demo, and no carrier is connected for live lookups.
                  </>
                )}
              </p>
            </div>
          )}

          {state.status === 'error' && (
            <div className="rounded-lg border border-danger/40 bg-danger-soft p-4 text-[13px]">
              <p className="font-medium text-danger">Lookup failed for <span className="num">{state.number}</span>.</p>
              <p className="mt-1 text-muted">{state.message}</p>
              <p className="mt-1 text-[11px] text-faint">Details are in the feed log (Simulation panel) and the browser console.</p>
            </div>
          )}

          {state.status === 'loading' && (
            <div className="space-y-4" aria-busy="true" aria-label="Looking up container">
              <Skeleton className="h-8 w-1/2" />
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" />
              </div>
              <Skeleton className="h-48" />
            </div>
          )}

          {found && (
            <article className="animate-fade-in rounded-lg border hairline">
              <header className="flex flex-wrap items-center gap-3 border-b hairline px-5 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-warning-soft text-warning">
                  <Container size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="num text-[20px] font-semibold tracking-wider text-ink">{found.containerNumber}</h2>
                  <p className="text-[12px] text-muted">
                    {found.sizeType} · {found.carrier}
                    {found.billOfLading !== '—' && <> · B/L <span className="num">{found.billOfLading}</span></>}
                    {found.bookingReference && <> · Booking <span className="num">{found.bookingReference}</span></>}
                  </p>
                </div>
                <span className={cn('rounded-md px-2 py-1 text-[11px] font-medium', found.status === 'In Transit' ? 'bg-accent-soft text-accent' : found.status === 'Delivered' || found.status === 'Discharged' || found.status === 'Gate Out' ? 'bg-success-soft text-success' : 'bg-line text-ink')}>
                  {found.status}
                </span>
                {found.demo ? <DemoTag>Demo tracking data</DemoTag> : <LiveTag label={`Live · ${found.carrier}`} title={`Carrier events from ${found.source?.name ?? found.carrier}`} />}
              </header>

              <div className="grid grid-cols-2 gap-4 border-b hairline px-5 py-4 md:grid-cols-4">
                <KeyValue
                  label="Vessel"
                  value={
                    vessel ? (
                      <button type="button" className="inline-flex items-center gap-1 text-accent hover:underline" onClick={() => { ui.setView('overview'); ui.openVessel(vessel.id); mapBus.dispatch({ type: 'focusVessel', id: vessel.id, zoom: 6.5 }); }}>
                        <Ship size={12} /> {found.vesselName}
                      </button>
                    ) : (
                      found.vesselName
                    )
                  }
                />
                <KeyValue label="Voyage" value={found.voyage} mono />
                <KeyValue label="Current location" value={found.currentLocation} />
                <KeyValue label="ETA" value={formatDateLong(found.estimatedArrival)} />
              </div>

              <div className="grid grid-cols-1 gap-6 px-5 py-5 md:grid-cols-[1fr_220px]">
                <div>
                  <div className="label-caps mb-3">Tracking timeline</div>
                  <ContainerTimeline milestones={found.milestones} />
                </div>
                <aside className="space-y-4 md:border-l md:hairline md:pl-5">
                  <KeyValue label="Port of loading (POL)" value={found.portOfLoading} />
                  <KeyValue label="Port of discharge (POD)" value={found.portOfDischarge} />
                  <KeyValue label="Transshipments" value={Math.max(0, found.route.length - 2)} mono />
                  {found.demo ? (
                    <p className="text-[11px] leading-relaxed text-faint">Milestones are generated for demonstration and are not carrier events.</p>
                  ) : (
                    <p className="text-[11px] leading-relaxed text-faint">
                      Milestones are the carrier's DCSA Track &amp; Trace events ({found.source?.eventCount ?? 0} from {found.source?.name ?? found.carrier}
                      {found.source ? `, fetched ${formatDateLong(found.source.fetchedAt)}` : ''}). Planned and estimated events are shown as upcoming; times are in your local time zone.
                    </p>
                  )}
                </aside>
              </div>
            </article>
          )}
        </div>
      </div>
    </PageShell>
  );
}
