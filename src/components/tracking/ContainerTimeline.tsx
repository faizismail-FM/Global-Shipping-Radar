import type { ContainerMilestone } from '@/types';
import { formatDateTime } from '@/lib/formatting';
import { cn } from '@/lib/cn';

export function ContainerTimeline({ milestones, compact = false }: { milestones: ContainerMilestone[]; compact?: boolean }) {
  return (
    <ol className={cn('relative', compact ? 'space-y-0' : 'space-y-0')} aria-label="Tracking timeline">
      {milestones.map((m, i) => {
        const isLast = i === milestones.length - 1;
        const next = milestones[i + 1];
        const lineDone = m.state === 'completed' && next && next.state !== 'upcoming';
        return (
          <li key={`${m.location}-${i}`} className="flex gap-3">
            <div className="flex w-5 flex-col items-center">
              <span
                className={cn(
                  'relative z-10 flex shrink-0 items-center justify-center rounded-full border transition-colors',
                  compact ? 'mt-1 h-3.5 w-3.5' : 'mt-0.5 h-5 w-5',
                  m.state === 'completed' && 'border-success bg-success text-[#04101a]',
                  m.state === 'current' && 'border-accent bg-accent text-[#04101a] shadow-glow',
                  m.state === 'upcoming' && 'border-line-strong bg-transparent',
                )}
                aria-hidden
              >
                {m.state === 'completed' && (
                  <svg width={compact ? 8 : 11} height={compact ? 8 : 11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
                {m.state === 'current' && <span className={cn('rounded-full bg-[#04101a]', compact ? 'h-1 w-1' : 'h-1.5 w-1.5')} />}
              </span>
              {!isLast && <span className={cn('w-px flex-1', lineDone ? 'bg-success/60' : m.state === 'completed' || m.state === 'current' ? 'bg-accent/50' : 'bg-line-strong')} style={{ minHeight: compact ? 14 : 22 }} />}
            </div>
            <div className={cn('min-w-0 flex-1', compact ? 'pb-2.5' : 'pb-5')}>
              <div className={cn('flex flex-wrap items-baseline gap-x-2', compact ? 'text-[13px]' : 'text-[14px]')}>
                <span className={cn('font-medium', m.state === 'upcoming' ? 'text-muted' : 'text-ink')}>{m.location}</span>
                <span className={cn('text-[11px] uppercase tracking-wider', m.state === 'current' ? 'text-accent' : m.state === 'completed' ? 'text-success' : 'text-faint')}>{m.event}</span>
              </div>
              {!compact && (
                <div className="num mt-0.5 text-[11px] text-faint">{m.timestamp ? formatDateTime(m.timestamp) : m.state === 'upcoming' ? 'Planned' : ''}</div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
