import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Congestion, VesselStatus } from '@/types';

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function Panel({ className, strong, children, ...rest }: HTMLAttributes<HTMLDivElement> & { strong?: boolean }) {
  return (
    <div className={cn(strong ? 'glass-strong' : 'glass', 'rounded-lg', className)} {...rest}>
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  icon: Icon,
  onClose,
  onBack,
  actions,
  className,
}: {
  title: ReactNode;
  icon?: LucideIcon;
  onClose?: () => void;
  onBack?: () => void;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2 border-b hairline px-4 py-3', className)}>
      {onBack && (
        <IconButton label="Back" onClick={onBack} size="sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </IconButton>
      )}
      {Icon && <Icon size={14} className="text-accent" aria-hidden />}
      <h2 className="label-caps flex-1 truncate !text-muted">{title}</h2>
      {actions}
      {onClose && (
        <IconButton label="Close" onClick={onClose} size="sm">
          <X size={14} />
        </IconButton>
      )}
    </div>
  );
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('label-caps mb-1.5', className)}>{children}</div>;
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'danger';

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md'; icon?: LucideIcon; block?: boolean }
>(function Button({ variant = 'outline', size = 'md', icon: Icon, block, className, children, ...rest }, ref) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 select-none';
  const sizes = size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-4 text-[13px]';
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-accent text-[#04101a] hover:brightness-110 shadow-glow',
    ghost: 'text-muted hover:text-ink hover:bg-accent-soft',
    outline: 'border border-line-strong text-ink hover:border-accent hover:text-accent bg-transparent',
    danger: 'border border-danger/40 text-danger hover:bg-danger-soft',
  };
  return (
    <button ref={ref} className={cn(base, sizes, variants[variant], block && 'w-full', className)} {...rest}>
      {Icon && <Icon size={size === 'sm' ? 13 : 15} aria-hidden />}
      {children}
    </button>
  );
});

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { label: string; size?: 'sm' | 'md' | 'lg'; active?: boolean }
>(function IconButton({ label, size = 'md', active, className, children, ...rest }, ref) {
  const sizes = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-10 w-10' : 'h-8 w-8';
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-md transition-colors',
        active ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-accent-soft hover:text-ink',
        sizes,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

// ---------------------------------------------------------------------------
// Form controls
// ---------------------------------------------------------------------------

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={cn('flex cursor-pointer items-center justify-between gap-3 py-1.5', disabled && 'cursor-not-allowed opacity-60', className)}>
      <span className="min-w-0">
        <span className="block text-[13px] text-ink">{label}</span>
        {description && <span className="block text-[11px] text-faint">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full border transition-colors',
          checked ? 'border-accent bg-accent/80' : 'border-line-strong bg-transparent',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-3.5 w-3.5 rounded-full transition-transform',
            checked ? 'translate-x-[18px] bg-[#04101a]' : 'translate-x-0.5 bg-muted',
          )}
        />
      </button>
    </label>
  );
}

export function Checkbox({ checked, onChange, label, count }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; count?: number }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-1 text-[13px]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        className={cn(
          'flex h-4 w-4 items-center justify-center rounded border transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--ring)]',
          checked ? 'border-accent bg-accent text-[#04101a]' : 'border-line-strong',
        )}
        aria-hidden
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </span>
      <span className="flex-1 text-ink">{label}</span>
      {count !== undefined && <span className="num text-[11px] text-faint">{count}</span>}
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex rounded-md border hairline p-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 rounded px-2 py-1 text-[12px] transition-colors whitespace-nowrap',
            value === o.value ? 'bg-accent-soft text-accent font-medium' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Select({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
  className?: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn('h-8 rounded-md border hairline bg-transparent px-2 text-[12px] text-ink focus:border-accent', className)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-panel-solid text-ink">
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function TextInput({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-8 w-full rounded-md border hairline bg-transparent px-2.5 text-[13px] text-ink placeholder:text-faint focus:border-accent focus:outline-none',
        className,
      )}
      {...rest}
    />
  );
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export const STATUS_STYLES: Record<VesselStatus, { dot: string; text: string; bg: string }> = {
  underway: { dot: 'bg-accent shadow-glow', text: 'text-accent', bg: 'bg-accent-soft' },
  anchored: { dot: 'bg-slate', text: 'text-muted', bg: 'bg-line' },
  moored: { dot: 'bg-slate/70', text: 'text-muted', bg: 'bg-line' },
  delayed: { dot: 'bg-warning shadow-[0_0_10px_var(--warning)]', text: 'text-warning', bg: 'bg-warning-soft' },
};

export const CONGESTION_STYLES: Record<Congestion, { dot: string; text: string; bg: string; label: string }> = {
  low: { dot: 'bg-success', text: 'text-success', bg: 'bg-success-soft', label: 'Low' },
  medium: { dot: 'bg-warning', text: 'text-warning', bg: 'bg-warning-soft', label: 'Medium' },
  high: { dot: 'bg-danger', text: 'text-danger', bg: 'bg-danger-soft', label: 'High' },
};

export function StatusDot({ status, className }: { status: VesselStatus; className?: string }) {
  return <span className={cn('inline-block h-1.5 w-1.5 rounded-full', STATUS_STYLES[status].dot, className)} aria-hidden />;
}

export function StatusBadge({ status, className }: { status: VesselStatus; className?: string }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium capitalize', s.bg, s.text, className)}>
      <StatusDot status={status} />
      {status}
    </span>
  );
}

export function CongestionBadge({ congestion, className }: { congestion: Congestion; className?: string }) {
  const s = CONGESTION_STYLES[congestion];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium', s.bg, s.text, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} aria-hidden />
      {s.label}
    </span>
  );
}

export function CongestionBar({ congestion, hours }: { congestion: Congestion; hours: number }) {
  const s = CONGESTION_STYLES[congestion];
  const pct = Math.min(100, Math.round((hours / 36) * 100));
  return (
    <div className="flex items-center gap-2" title={`${hours} h average waiting`}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-line">
        <div className={cn('h-full rounded-full transition-[width] duration-700', s.dot)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn('text-[11px] font-medium', s.text)}>{s.label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border hairline bg-elevated px-1 font-mono text-[10px] text-muted">
      {children}
    </kbd>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}

export function EmptyState({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon size={18} />
      </div>
      <p className="text-[13px] font-medium text-ink">{title}</p>
      {children && <p className="max-w-xs text-[12px] leading-relaxed text-muted">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function DemoTag({ className, children = 'Simulated data' }: { className?: string; children?: ReactNode }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded border border-warning/30 bg-warning-soft px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-warning', className)}
      title="This information is generated by the built-in simulation and is not real-time data."
    >
      {children}
    </span>
  );
}

export function KeyValue({ label, value, mono = false, className }: { label: ReactNode; value: ReactNode; mono?: boolean; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="label-caps">{label}</div>
      <div className={cn('mt-0.5 truncate text-[14px] text-ink', mono && 'num')}>{value}</div>
    </div>
  );
}

export function RouteList({ stops, current }: { stops: string[]; current?: number }) {
  return (
    <ol className="space-y-0.5">
      {stops.map((stop, i) => {
        const isLast = i === stops.length - 1;
        const state = current === undefined ? 'none' : i < current ? 'done' : i === current ? 'current' : 'next';
        return (
          <li key={`${stop}-${i}`} className="flex items-stretch gap-3">
            <div className="flex w-3 flex-col items-center">
              <span
                className={cn(
                  'mt-1.5 h-2 w-2 shrink-0 rounded-full border',
                  state === 'current' ? 'border-accent bg-accent shadow-glow' : state === 'done' ? 'border-muted bg-muted' : 'border-line-strong bg-transparent',
                )}
              />
              {!isLast && <span className={cn('w-px flex-1', state === 'done' ? 'bg-muted/60' : 'bg-line-strong')} />}
            </div>
            <div className={cn('pb-2 text-[13px]', state === 'current' ? 'font-medium text-ink' : state === 'done' ? 'text-muted' : 'text-ink/90')}>
              {stop}
              {i === 0 && <span className="ml-2 text-[10px] uppercase tracking-wider text-faint">POL</span>}
              {isLast && <span className="ml-2 text-[10px] uppercase tracking-wider text-faint">POD</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
