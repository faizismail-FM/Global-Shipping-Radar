import { useSimulation } from '@/lib/hooks';
import { useSettings } from '@/lib/store/settings';
import { formatDateShort, formatSpeed } from '@/lib/formatting';
import { StatusDot } from '@/components/ui';

export function VesselTooltip({ id, x, y }: { id: string; x: number; y: number }) {
  const vessel = useSimulation((s) => s.vessels.find((v) => v.id === id) ?? null);
  const speedUnit = useSettings((s) => s.speedUnit);
  if (!vessel) return null;

  const width = 220;
  const flipX = typeof window !== 'undefined' && x + width + 24 > window.innerWidth;
  const left = flipX ? x - width - 14 : x + 14;
  const top = Math.max(8, y - 12);

  return (
    <div
      role="tooltip"
      className="glass-strong pointer-events-none absolute z-30 w-[220px] rounded-md p-3 animate-fade-in"
      style={{ left, top }}
    >
      <div className="flex items-center gap-2">
        <StatusDot status={vessel.status} />
        <span className="truncate text-[13px] font-semibold text-ink">{vessel.name}</span>
      </div>
      <div className="mt-0.5 text-[11px] text-muted">Container ship · {vessel.operator}</div>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[12px]">
        <dt className="text-faint">Speed</dt>
        <dd className="num text-right text-ink">{formatSpeed(vessel.speed, speedUnit)}</dd>
        <dt className="text-faint">Destination</dt>
        <dd className="truncate text-right text-ink">{vessel.destination}</dd>
        <dt className="text-faint">ETA</dt>
        <dd className="num text-right text-ink">{formatDateShort(vessel.eta)}</dd>
      </dl>
      <div className="mt-2 border-t hairline pt-1.5 text-[10px] uppercase tracking-wider text-faint">Click for details →</div>
    </div>
  );
}
