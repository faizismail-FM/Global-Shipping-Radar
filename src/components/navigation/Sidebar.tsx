import { Activity, Anchor, Bell, Container, Globe2, PanelLeftClose, PanelLeftOpen, Radar, Route, Settings, Ship, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ui, useUI, type View } from '@/lib/store/ui';
import { updateSettings, useSettings } from '@/lib/store/settings';
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

function NavButton({
  icon: Icon,
  label,
  active,
  badge,
  collapsed,
  onClick,
  trailing,
}: {
  icon: typeof Globe2;
  label: string;
  active: boolean;
  badge?: number;
  collapsed: boolean;
  onClick: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        'group relative flex w-full items-center rounded-md py-2 text-[13px] transition-colors',
        collapsed ? 'justify-center px-0' : 'gap-3 px-3',
        active ? 'bg-accent-soft text-ink' : 'text-muted hover:bg-accent-soft/60 hover:text-ink',
      )}
    >
      <span className={cn('absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent transition-opacity', active ? 'opacity-100' : 'opacity-0')} />
      <span className="relative">
        <Icon size={collapsed ? 17 : 15} className={cn(active ? 'text-accent' : 'text-faint group-hover:text-muted')} aria-hidden />
        {collapsed && badge !== undefined && badge > 0 && (
          <span className="absolute -right-1.5 -top-1.5 h-2 w-2 rounded-full bg-danger" aria-hidden />
        )}
        {collapsed && trailing && <span className="absolute -right-1.5 -top-1">{trailing}</span>}
      </span>
      {!collapsed && <span className="flex-1 text-left">{label}</span>}
      {!collapsed && badge !== undefined && badge > 0 && (
        <span className="num rounded-full bg-danger-soft px-1.5 py-0.5 text-[10px] font-semibold text-danger">{badge}</span>
      )}
      {!collapsed && trailing}
    </button>
  );
}

export function Sidebar() {
  const view = useUI((s) => s.view);
  const alertsCount = useSimulation((s) => s.alerts.filter((a) => a.severity !== 'info').length);
  const running = useSimulation((s) => s.running);
  const overlay = useUI((s) => s.overlay);
  const collapsed = useSettings((s) => s.sidebarCollapsed);
  const dataSource = useSimulation((s) => s.dataSource);

  const runningDot = <span className={cn('block h-2 w-2 rounded-full', running ? 'bg-success animate-live' : 'bg-warning')} aria-label={running ? 'running' : 'paused'} />;

  return (
    <aside
      className={cn('glass-strong hidden shrink-0 flex-col rounded-lg transition-[width] duration-300 md:flex', collapsed ? 'w-[64px]' : 'w-[220px]')}
      aria-label="Primary navigation"
      data-collapsed={collapsed || undefined}
    >
      <div className={cn('flex items-center border-b hairline', collapsed ? 'flex-col gap-2 px-0 py-3' : 'gap-2.5 px-3 py-3.5')}>
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent" title="Global Shipping Radar">
          <Radar size={17} />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-[12px] font-semibold tracking-wide text-ink">GLOBAL SHIPPING</div>
            <div className="text-[12px] font-semibold tracking-[0.2em] text-accent">RADAR</div>
          </div>
        )}
        <button
          type="button"
          onClick={() => updateSettings({ sidebarCollapsed: !collapsed })}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-faint transition-colors hover:bg-accent-soft hover:text-ink"
        >
          {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      <nav className={cn('flex-1 space-y-4 overflow-y-auto py-3', collapsed ? 'px-2' : 'px-2')}>
        <div className="space-y-0.5">
          {PRIMARY_NAV.map((item) => (
            <NavButton key={item.view} icon={item.icon} label={item.label} collapsed={collapsed} active={view === item.view} badge={item.view === 'alerts' ? alertsCount : undefined} onClick={() => ui.setView(item.view)} />
          ))}
        </div>
        <div>
          {collapsed ? <div className="mx-2 mb-2 h-px bg-line" /> : <div className="label-caps px-3 pb-1.5">Tools</div>}
          <div className="space-y-0.5">
            {TOOL_NAV.map((item) => (
              <NavButton key={item.view} icon={item.icon} label={item.label} collapsed={collapsed} active={view === item.view} onClick={() => ui.setView(item.view)} />
            ))}
          </div>
        </div>
        <div>
          {collapsed ? <div className="mx-2 mb-2 h-px bg-line" /> : <div className="label-caps px-3 pb-1.5">System</div>}
          <div className="space-y-0.5">
            <NavButton icon={Activity} label="Simulation" collapsed={collapsed} active={overlay === 'simulation'} onClick={() => ui.setOverlay('simulation')} trailing={runningDot} />
            <NavButton icon={Settings} label="Settings" collapsed={collapsed} active={overlay === 'settings'} onClick={() => ui.setOverlay('settings')} />
          </div>
        </div>
      </nav>

      {!collapsed && (
        <div className="border-t hairline px-4 py-3">
          <div className="label-caps">Data source</div>
          <div className="mt-1 flex items-center gap-2 text-[12px] text-muted">
            <span className={cn('h-1.5 w-1.5 rounded-full', dataSource === 'ais' ? 'bg-success animate-live' : 'bg-warning')} aria-hidden />
            {dataSource === 'ais' ? 'Live AIS · ports simulated' : 'Simulated demo data'}
          </div>
        </div>
      )}
    </aside>
  );
}
