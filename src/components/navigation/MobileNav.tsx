import { Activity, Menu, Settings, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ui, useUI } from '@/lib/store/ui';
import { useSimulation, useEscape } from '@/lib/hooks';
import { PRIMARY_NAV, TOOL_NAV } from './Sidebar';

export function MobileNav() {
  const view = useUI((s) => s.view);
  const open = useUI((s) => s.mobileNavOpen);
  const alertsCount = useSimulation((s) => s.alerts.filter((a) => a.severity !== 'info').length);
  const running = useSimulation((s) => s.running);
  useEscape(() => ui.setMobileNav(false), open);

  return (
    <>
      <nav className="glass-strong pointer-events-auto flex items-stretch justify-around rounded-lg md:hidden" aria-label="Primary navigation">
        {PRIMARY_NAV.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const active = view === item.view;
          return (
            <button
              key={item.view}
              type="button"
              onClick={() => ui.setView(item.view)}
              aria-current={active ? 'page' : undefined}
              className={cn('relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]', active ? 'text-accent' : 'text-muted')}
            >
              <Icon size={17} aria-hidden />
              {item.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => ui.setMobileNav(true)}
          className={cn('relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]', open ? 'text-accent' : 'text-muted')}
          aria-expanded={open}
          aria-label="More navigation"
        >
          <Menu size={17} aria-hidden />
          More
          {alertsCount > 0 && <span className="absolute right-3 top-1.5 h-1.5 w-1.5 rounded-full bg-danger" aria-hidden />}
        </button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close navigation" onClick={() => ui.setMobileNav(false)} />
          <div className="glass-strong absolute inset-x-3 bottom-3 rounded-lg p-3 animate-slide-up">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="label-caps">Navigation</span>
              <button type="button" onClick={() => ui.setMobileNav(false)} aria-label="Close" className="text-muted">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {[...PRIMARY_NAV, ...TOOL_NAV].map((item) => {
                const Icon = item.icon;
                const active = view === item.view;
                return (
                  <button
                    key={item.view}
                    type="button"
                    onClick={() => ui.setView(item.view)}
                    className={cn('flex items-center gap-2 rounded-md px-3 py-2.5 text-[13px]', active ? 'bg-accent-soft text-ink' : 'text-muted')}
                  >
                    <Icon size={15} className={active ? 'text-accent' : ''} aria-hidden />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.view === 'alerts' && alertsCount > 0 && <span className="num rounded-full bg-danger-soft px-1.5 text-[10px] text-danger">{alertsCount}</span>}
                  </button>
                );
              })}
              <button type="button" onClick={() => { ui.setMobileNav(false); ui.setOverlay('simulation'); }} className="flex items-center gap-2 rounded-md px-3 py-2.5 text-[13px] text-muted">
                <Activity size={15} aria-hidden />
                <span className="flex-1 text-left">Simulation</span>
                <span className={cn('h-2 w-2 rounded-full', running ? 'bg-success' : 'bg-warning')} />
              </button>
              <button type="button" onClick={() => { ui.setMobileNav(false); ui.setOverlay('settings'); }} className="flex items-center gap-2 rounded-md px-3 py-2.5 text-[13px] text-muted">
                <Settings size={15} aria-hidden />
                <span className="flex-1 text-left">Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
