import { RadioTower, RefreshCw, AlertTriangle } from 'lucide-react';
import { useLiveFeed, liveFeed } from '@/lib/live';
import { useNow, useSimulation } from '@/lib/hooks';
import { useUI } from '@/lib/store/ui';
import { formatRelative } from '@/lib/formatting';
import { cn } from '@/lib/cn';

/** Compact live-feed status shown over the map while a real AIS source is active. */
export function LiveStatusPill() {
  const feed = useLiveFeed((s) => s);
  const dataSource = useSimulation((s) => s.dataSource);
  const view = useUI((s) => s.view);
  const dropMode = useUI((s) => s.dropMode);
  const now = useNow(5000);
  if (dataSource !== 'ais' || view !== 'overview' || dropMode) return null;

  const tone = feed.status === 'error' ? 'text-warning' : 'text-success';
  return (
    <div className="pointer-events-auto absolute left-1/2 top-3 z-20 flex max-w-[calc(100%-24px)] -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border hairline bg-panel-strong px-3 py-1.5 text-[11px] text-ink shadow-panel md:top-4">
      {feed.status === 'error' ? <AlertTriangle size={13} className={tone} /> : <RadioTower size={13} className={cn(tone, feed.status === 'connecting' && 'animate-pulse')} />}
      <span className="font-semibold uppercase tracking-wider">{feed.status === 'connecting' ? 'Connecting' : feed.status === 'error' ? 'Feed error' : 'Live AIS'}</span>
      <span className="hidden text-muted sm:inline">· {feed.sourceName}</span>
      {feed.status !== 'connecting' && (
        <span className="num text-muted">
          · {feed.vesselCount} vessels{feed.lastUpdate ? ` · ${formatRelative(feed.lastUpdate, now)}` : ''}
        </span>
      )}
      {feed.status === 'error' && feed.error && <span className="hidden max-w-[220px] truncate text-warning md:inline">· {feed.error}</span>}
      {feed.attribution && feed.attributionUrl && (
        <a href={feed.attributionUrl} target="_blank" rel="noreferrer" className="hidden text-faint hover:text-ink xl:inline" title="Data licence">
          · {feed.attribution}
        </a>
      )}
      <button type="button" onClick={() => void liveFeed.refresh()} aria-label="Refresh live data" className="ml-1 text-muted hover:text-ink">
        <RefreshCw size={12} />
      </button>
    </div>
  );
}
