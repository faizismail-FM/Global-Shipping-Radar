import { useState } from 'react';
import { Activity, Pause, Play, StepForward, RefreshCw, RadioTower, ChevronDown, ChevronRight, Copy, Trash2, ScrollText } from 'lucide-react';
import { getEngine } from '@/lib/simulation';
import { useNow, useSimulation } from '@/lib/hooks';
import { updateSettings } from '@/lib/store/settings';
import { getProviders } from '@/lib/providers';
import { Button, PanelHeader, Segmented, Toggle } from '@/components/ui';
import { formatDateTime, formatRelative, formatTime } from '@/lib/formatting';
import { cn } from '@/lib/cn';
import { liveFeed, useLiveFeed, clearFeedLog, feedLogAsText } from '@/lib/live';
import type { FeedLogEntry } from '@/lib/live';
import { DataSourceControl } from './DataSourceControl';

const INTERVALS = [
  { value: '1000', label: '1 s' },
  { value: '2000', label: '2 s' },
  { value: '5000', label: '5 s' },
];

const TIME_SCALES = [
  { value: '0.25', label: '15 min' },
  { value: '1', label: '1 h' },
  { value: '3', label: '3 h' },
];

export function SimulationPanel({ onClose }: { onClose: () => void }) {
  const running = useSimulation((s) => s.running);
  const config = useSimulation((s) => s.config);
  const tick = useSimulation((s) => s.tick);
  const simTime = useSimulation((s) => s.simTime);
  const engine = getEngine();
  const providers = getProviders();
  const dataSource = useSimulation((s) => s.dataSource);
  const feed = useLiveFeed((s) => s);
  const now = useNow(5000);
  const isLive = dataSource === 'ais';

  return (
    <div className="flex h-full flex-col">
      <PanelHeader title={isLive ? 'Data & simulation' : 'Simulation mode'} icon={Activity} onClose={onClose} />
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <section>
          <div className="label-caps mb-1.5">Vessel data source</div>
          <DataSourceControl />
        </section>

        {isLive ? (
          <div className="mt-3 rounded-md border hairline px-3 py-2.5">
            <div className="flex items-center gap-2">
              <RadioTower size={14} className={cn(feed.status === 'error' ? 'text-warning' : 'text-success')} />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-ink">
                  {feed.status === 'connecting' ? 'Connecting to live feed…' : feed.status === 'error' ? 'Live feed error' : `Live AIS · ${feed.vesselCount} vessels`}
                </div>
                <div className="text-[11px] text-muted">
                  {feed.sourceName} · {feed.coverageLabel}
                  {feed.lastUpdate ? ` · updated ${formatRelative(feed.lastUpdate, now)}` : ''}
                </div>
                {feed.error && <div className="mt-0.5 text-[11px] text-warning">{feed.error}</div>}
              </div>
              <button type="button" onClick={() => void liveFeed.refresh()} aria-label="Refresh live data" className="text-muted hover:text-ink">
                <RefreshCw size={13} />
              </button>
            </div>
            {feed.attribution && (
              <a href={feed.attributionUrl ?? '#'} target="_blank" rel="noreferrer" className="mt-2 block text-[10px] text-faint hover:text-ink">
                {feed.attribution}
              </a>
            )}
            <FeedLog entries={feed.log} />
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-3 rounded-md border hairline px-3 py-2.5">
            <span className={cn('h-2.5 w-2.5 rounded-full', running ? 'bg-success animate-live' : 'bg-warning')} aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-ink">{running ? 'Simulation running' : 'Simulation paused'}</div>
              <div className="text-[11px] text-muted">
                Tick <span className="num">{tick}</span> · Sim clock <span className="num">{formatDateTime(simTime)}</span>
              </div>
            </div>
          </div>
        )}

        <p className="mt-3 text-[12px] leading-relaxed text-muted">
          {isLive ? (
            <>
              Vessel positions, courses and speeds come from the live AIS feed and are <strong className="font-medium text-ink">dead-reckoned</strong> between
              updates. Port statistics and container records remain <strong className="font-medium text-ink">simulated</strong> and are labelled as such.
            </>
          ) : (
            <>
              This dashboard currently uses <strong className="font-medium text-ink">simulated shipping data</strong>. Vessel positions, port statistics,
              events and alerts are generated locally by the simulation engine.
            </>
          )}
        </p>

        <section className={cn('mt-4', isLive && 'hidden')}>
          <div className="label-caps mb-1.5">Update frequency</div>
          <Segmented
            value={String(config.intervalMs)}
            options={INTERVALS}
            onChange={(v) => {
              const ms = Number(v);
              engine.setConfig({ intervalMs: ms });
              updateSettings({ updateIntervalMs: ms });
            }}
            label="Update frequency"
          />
        </section>

        <section className={cn('mt-4', isLive && 'hidden')}>
          <div className="label-caps mb-1.5">Simulated time per update</div>
          <Segmented value={String(config.hoursPerTick)} options={TIME_SCALES} onChange={(v) => engine.setConfig({ hoursPerTick: Number(v) })} label="Time acceleration" />
          <p className="mt-1 text-[10px] text-faint">Higher values make vessels move further per update.</p>
        </section>

        <section className="mt-3 divide-y divide-[var(--border)]">
          <Toggle
            checked={config.movement}
            onChange={(v) => engine.setConfig({ movement: v })}
            label={isLive ? 'Dead reckoning' : 'Vessel movement'}
            description={isLive ? 'Project positions along course and speed between AIS updates' : 'Advance underway vessels along their lanes'}
          />
          <Toggle
            checked={config.activity}
            onChange={(v) => engine.setConfig({ activity: v })}
            label="Activity feed"
            description={isLive ? 'Arrivals, departures and zone entries derived from AIS status changes' : 'Emit port calls, zone entries and ETA revisions'}
          />
        </section>

        {!isLive && (
          <div className="mt-4 flex gap-2">
            <Button variant={running ? 'outline' : 'primary'} icon={running ? Pause : Play} block onClick={() => engine.toggle()}>
              {running ? 'Pause simulation' : 'Resume simulation'}
            </Button>
            <Button variant="outline" icon={StepForward} onClick={() => engine.tick()} disabled={running} title="Advance one tick">
              Step
            </Button>
          </div>
        )}

        <section className="mt-5 border-t hairline pt-3">
          <div className="label-caps mb-1.5">Data providers</div>
          <ul className="space-y-1 text-[12px]">
            {[providers.vessels, providers.ports, providers.containers].map((p) => (
              <li key={p.name} className="flex items-center justify-between">
                <span className="text-ink">{p.name}</span>
                <span className={cn('text-[10px] uppercase tracking-wider', p.simulated ? 'text-warning' : 'text-success')}>{p.simulated ? 'Simulated' : 'Live'}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

const LEVEL_CLASS: Record<FeedLogEntry['level'], string> = {
  info: 'text-muted',
  ok: 'text-success',
  warn: 'text-warning',
  error: 'text-danger',
};

/** Collapsible diagnostic log of live-feed polls (also mirrored to the browser console). */
function FeedLog({ entries }: { entries: FeedLogEntry[] }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(feedLogAsText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  const latest = entries[0];
  return (
    <div className="mt-2 border-t hairline pt-2">
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-[11px] text-muted hover:text-ink">
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <ScrollText size={12} />
          <span className="font-medium">Feed log</span>
          <span className="num text-faint">({entries.length})</span>
          {!open && latest && <span className={cn('num min-w-0 truncate', LEVEL_CLASS[latest.level])}>· {latest.message}</span>}
        </button>
        {open && (
          <>
            <button type="button" onClick={() => void copy()} aria-label="Copy log" title={copied ? 'Copied' : 'Copy log as text'} className={cn('text-muted hover:text-ink', copied && 'text-success')}>
              <Copy size={12} />
            </button>
            <button type="button" onClick={clearFeedLog} aria-label="Clear log" title="Clear log" className="text-muted hover:text-ink">
              <Trash2 size={12} />
            </button>
          </>
        )}
      </div>
      {open && (
        <ol className="mt-1.5 max-h-56 space-y-1 overflow-y-auto pr-1" aria-live="polite" aria-label="Live feed log">
          {entries.length === 0 && <li className="text-[11px] text-faint">Nothing logged yet.</li>}
          {entries.map((e) => (
            <li key={e.id} className="text-[11px] leading-snug">
              <span className="num text-faint">{formatTime(e.at)}</span> <span className={LEVEL_CLASS[e.level]}>{e.message}</span>
              {e.detail && <div className="num break-words pl-[52px] text-[10px] text-faint">{e.detail}</div>}
            </li>
          ))}
        </ol>
      )}
      <p className="mt-1.5 text-[10px] leading-relaxed text-faint">
        Same lines go to the browser console (F12 → Console; enable “Log live feed to console” in Settings for info level). The relay’s own WebSocket
        log is in Vercel → Project → Logs.
      </p>
    </div>
  );
}
