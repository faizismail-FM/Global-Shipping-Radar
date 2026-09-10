import { Activity, Anchor, Bell, Container, Globe2, Radar, Route, Settings, Ship, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ui, useUI, type View } from '@/lib/store/ui';
import { useSimulation } from '@/lib/hooks';

interface NavItem {
  view: View;
  label: string;
  icon: typeof Globe2;
}

export const PRIMARY_NAV: NavItem[] = [
  { view: 'overview', label: 'Overview', icon: Globe2 },
  { view: 'vessels', label: 'Vessels', icon: Ship },
  { view: 'ports', label: 'Ports', icon: Anchor },
  { view: 'routes', label: 'Routes', icon: Route },
  { view: 'alerts', label: 'Alerts', icon: Bell },
];

export const TOOL_NAV: NavItem[] = [
  { view: 'tracking', label: 'Container Tracking', icon: Container },
  { view: 'voyage', label: 'Voyage Search', icon: Search },
];

function NavButton({ item, active, badge, onClick }: { item: NavItem; active: boolean; badge?: number; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors',
        active ? 'bg-accent-soft text-ink' : 'text-muted hover:bg-accent-soft/60 hover:text-ink',
      )}
    >
      <span className={cn('absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent transition-opacity', active ? 'opacity-100' : 'opacity-0')} />
      <Icon size={15} className={cn(active ? 'text-accent' : 'text-faint group-hover:text-muted')} aria-hidden />
      <span className="flex-1 text-left">{item.label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="num rounded-full bg-danger-soft px-1.5 py-0.5 text-[10px] font-semibold text-danger">{badge}</span>
      )}
    </button>
  );
}

export function Sidebar() {
  const view = useUI((s) => s.view);
  const alertsCount = useSimulation((s) => s.alerts.filter((a) => a.severity !== 'info').length);
  const running = useSimulation((s) => s.running);
  const overlay = useUI((s) => s.overlay);

  return (
    <aside className="glass-strong hidden w-[220px] shrink-0 flex-col rounded-lg md:flex" aria-label="Primary navigation">
      <div className="flex items-center gap-2.5 border-b hairline px-4 py-3.5">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-md bg-accent-soft text-accent">
          <Radar size={17} />
        </div>
        <div className="min-w-0 leading-tight">
          <div className="text-[12px] font-semibold tracking-wide text-ink">GLOBAL SHIPPING</div>
          <div className="text-[12px] font-semibold tracking-[0.2em] text-accent">RADAR</div>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
        <div className="space-y-0.5">
          {PRIMARY_NAV.map((item) => (
            <NavButton key={item.view} item={item} active={view === item.view} badge={item.view === 'alerts' ? alertsCount : undefined} onClick={() => ui.setView(item.view)} />
          ))}
        </div>
        <div>
          <div className="label-caps px-3 pb-1.5">Tools</div>
          <div className="space-y-0.5">
            {TOOL_NAV.map((item) => (
              <NavButton key={item.view} item={item} active={view === item.view} onClick={() => ui.setView(item.view)} />
            ))}
          </div>
        </div>
        <div>
          <div className="label-caps px-3 pb-1.5">System</div>
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => ui.setOverlay('simulation')}
              className={cn(
                'group flex w-full items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors',
                overlay === 'simulation' ? 'bg-accent-soft text-ink' : 'text-muted hover:bg-accent-soft/60 hover:text-ink',
              )}
            >
              <Activity size={15} className="text-faint group-hover:text-muted" aria-hidden />
              <span className="flex-1 text-left">Simulation</span>
              <span className={cn('h-2 w-2 rounded-full', running ? 'bg-success animate-live' : 'bg-warning')} aria-label={running ? 'running' : 'paused'} />
            </button>
            <button
              type="button"
              onClick={() => ui.setOverlay('settings')}
              className={cn(
                'group flex w-full items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors',
                overlay === 'settings' ? 'bg-accent-soft text-ink' : 'text-muted hover:bg-accent-soft/60 hover:text-ink',
              )}
            >
              <Settings size={15} className="text-faint group-hover:text-muted" aria-hidden />
              <span className="flex-1 text-left">Settings</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="border-t hairline px-4 py-3">
        <div className="label-caps">Data source</div>
        <div className="mt-1 flex items-center gap-2 text-[12px] text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden />
          Simulated demo data
        </div>
      </div>
    </aside>
  );
}
