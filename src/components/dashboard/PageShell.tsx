import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';
import { ui } from '@/lib/store/ui';
import { useEscape } from '@/lib/hooks';
import { DemoTag, IconButton, SourceTag } from '@/components/ui';
import { useSimulation } from '@/lib/hooks';
import { useLiveFeed } from '@/lib/live';
import { cn } from '@/lib/cn';

/**
 * Data-provenance badge for a page header. Pages whose content is always
 * generated show "Simulated data". Pages built from the vessel set switch to
 * a live badge once a real AIS snapshot has actually arrived; until then (or
 * when the feed has not delivered anything) they keep the simulated label.
 */
function ProvenanceTag({ provenance, className }: { provenance: 'simulated' | 'vessels'; className?: string }) {
  const dataSource = useSimulation((s) => s.dataSource);
  const feed = useLiveFeed((s) => ({ status: s.status, count: s.vesselCount, name: s.sourceName }));
  const live = provenance === 'vessels' && dataSource === 'ais' && feed.count > 0 && (feed.status === 'live' || feed.status === 'error');
  if (live) return <SourceTag source="ais" sourceName={feed.name} className={className} />;
  return <DemoTag className={className} />;
}

/** Full-area view rendered over the map (Vessels, Ports, Routes, …). */
export function PageShell({
  title,
  icon: Icon,
  description,
  actions,
  children,
  className,
  provenance = 'simulated',
}: {
  title: string;
  icon: LucideIcon;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** 'vessels': content derives from the vessel set, so it is live when a real AIS feed has delivered data. */
  provenance?: 'simulated' | 'vessels';
}) {
  useEscape(() => ui.setView('overview'));
  return (
    <div className={cn('glass-strong pointer-events-auto absolute inset-2 z-20 flex flex-col overflow-hidden rounded-lg animate-fade-in md:inset-4', className)} role="region" aria-label={title}>
      <header className="flex items-center gap-3 border-b hairline px-4 py-3 md:px-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
          <Icon size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-[15px] font-semibold leading-tight text-ink">{title}</h1>
          {description && <p className="truncate text-[12px] text-muted">{description}</p>}
        </div>
        <div className="hidden items-center gap-2 sm:flex">{actions}</div>
        <ProvenanceTag provenance={provenance} className="hidden lg:inline-flex" />
        <IconButton label="Close and return to map" onClick={() => ui.setView('overview')}>
          <X size={16} />
        </IconButton>
      </header>
      {actions && <div className="flex items-center gap-2 border-b hairline px-4 py-2 sm:hidden">{actions}</div>}
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}

export function TableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-4" aria-busy="true">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((__, c) => (
            <div key={c} className="skeleton h-5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Pagination({ page, pages, onChange, total, pageSize }: { page: number; pages: number; onChange: (p: number) => void; total: number; pageSize: number }) {
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="flex items-center justify-between border-t hairline px-4 py-2 text-[12px] text-muted">
      <span className="num">
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button type="button" disabled={page === 0} onClick={() => onChange(page - 1)} className="rounded border hairline px-2 py-1 disabled:opacity-40 hover:border-accent">
          Prev
        </button>
        <span className="num px-2">
          {pages === 0 ? 0 : page + 1} / {pages}
        </span>
        <button type="button" disabled={page >= pages - 1} onClick={() => onChange(page + 1)} className="rounded border hairline px-2 py-1 disabled:opacity-40 hover:border-accent">
          Next
        </button>
      </div>
    </div>
  );
}

export function SortHeader<T extends string>({ label, column, sort, onSort, className, align = 'left' }: { label: string; column: T; sort: { column: T; dir: 'asc' | 'desc' }; onSort: (c: T) => void; className?: string; align?: 'left' | 'right' }) {
  const active = sort.column === column;
  return (
    <th scope="col" className={cn('whitespace-nowrap px-3 py-2 font-medium', align === 'right' ? 'text-right' : 'text-left', className)} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(column)} className={cn('label-caps inline-flex items-center gap-1 hover:!text-ink', active && '!text-accent')}>
        {label}
        <span aria-hidden className="text-[9px]">{active ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</span>
      </button>
    </th>
  );
}
