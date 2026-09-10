import { Radar, Settings, SlidersHorizontal, UserRound, Activity } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ui, useUI, isFilterActive } from '@/lib/store/ui';
import { useSimulation } from '@/lib/hooks';
import { IconButton } from '@/components/ui';
import { GlobalSearch } from '@/components/search/GlobalSearch';

export function TopBar() {
  const running = useSimulation((s) => s.running);
  const overlay = useUI((s) => s.overlay);
  const filtersActive = useUI((s) => isFilterActive(s.filters));

  return (
    <header className="glass-strong flex h-12 items-center gap-2 rounded-lg px-2 sm:gap-3 sm:px-3">
      <div className="flex items-center gap-2 md:hidden">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-soft text-accent">
          <Radar size={15} />
        </div>
      </div>
      <div className="hidden min-w-0 items-center gap-2 md:flex">
        <span className="text-[12px] font-semibold tracking-[0.18em] text-ink">GLOBAL SHIPPING RADAR</span>
      </div>

      <button
        type="button"
        onClick={() => ui.setOverlay('simulation')}
        className={cn(
          'flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.16em]',
          running ? 'border-danger/40 text-danger' : 'border-warning/40 text-warning',
        )}
        title={running ? 'Live simulation running' : 'Simulation paused'}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full', running ? 'bg-danger animate-live' : 'bg-warning')} />
        {running ? 'LIVE' : 'PAUSED'}
      </button>

      <div className="mx-1 min-w-0 flex-1 sm:mx-2">
        <GlobalSearch />
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton label="Filters" active={overlay === 'filters'} onClick={() => ui.setOverlay('filters')} className="relative">
          <SlidersHorizontal size={15} />
          {filtersActive && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />}
        </IconButton>
        <IconButton label="Simulation" active={overlay === 'simulation'} onClick={() => ui.setOverlay('simulation')} className="hidden sm:inline-flex">
          <Activity size={15} />
        </IconButton>
        <IconButton label="Settings" active={overlay === 'settings'} onClick={() => ui.setOverlay('settings')}>
          <Settings size={15} />
        </IconButton>
        <div className="ml-1 hidden h-7 w-7 items-center justify-center rounded-full border hairline text-muted sm:flex" title="Operator (demo)" aria-label="Operator account (demo)">
          <UserRound size={14} />
        </div>
      </div>
    </header>
  );
}
