import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Anchor, Container, MapPin, Search, Ship, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { search, type SearchResult } from '@/lib/search';
import { ui, useUI } from '@/lib/store/ui';
import { mapBus } from '@/lib/map/bus';
import { useSimulation, useClickOutside, useIsMobile } from '@/lib/hooks';
import { Kbd, StatusDot } from '@/components/ui';
import { CONTAINERS } from '@/data/containers';

const ICONS: Record<SearchResult['type'], typeof Ship> = { vessel: Ship, port: Anchor, container: Container, location: MapPin };

export function focusVesselFromSearch(id: string) {
  ui.setView('overview');
  ui.openVessel(id);
  mapBus.dispatch({ type: 'focusVessel', id, zoom: 7 });
}

export function focusPortFromSearch(id: string) {
  ui.setView('overview');
  ui.openPort(id);
  mapBus.dispatch({ type: 'focusPort', id });
}

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const open = useUI((s) => s.searchOpen);
  const vessels = useSimulation((s) => s.vessels);
  const ports = useSimulation((s) => s.ports);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const response = useMemo(() => (query.trim() ? search(query, vessels, ports) : null), [query, vessels, ports]);
  const results = response?.results ?? [];

  useEffect(() => setActive(0), [query]);

  const close = useCallback(() => ui.setSearchOpen(false), []);
  useClickOutside(wrapRef, close, open);

  // Global keyboard shortcuts: "/" focuses, Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (e.key === '/' && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
        ui.setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const select = useCallback(
    (r: SearchResult) => {
      close();
      setQuery('');
      inputRef.current?.blur();
      switch (r.type) {
        case 'vessel':
          focusVesselFromSearch(r.id);
          break;
        case 'port':
          focusPortFromSearch(r.id);
          break;
        case 'container':
          ui.setView('overview');
          ui.openContainer(r.id);
          break;
        case 'location':
          ui.setView('overview');
          if ('bounds' in r.target) {
            const [w, s, e, n] = r.target.bounds;
            mapBus.dispatch({ type: 'fitBounds', bounds: [[w, s], [e, n]] });
          } else {
            mapBus.dispatch({ type: 'flyTo', longitude: r.target.longitude, latitude: r.target.latitude, zoom: r.target.zoom });
          }
          break;
      }
    },
    [close],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (query) setQuery('');
      else {
        close();
        inputRef.current?.blur();
      }
      return;
    }
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[active] ?? results[0];
      if (r) select(r);
    }
  };

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const showDropdown = open && (query.trim().length > 0);
  const containerQuery = response?.query.kind === 'container' ? response.query.value : null;
  const knownContainer = containerQuery ? CONTAINERS.some((c) => c.containerNumber === containerQuery) : false;

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className={cn('flex h-8 items-center gap-2 rounded-md border bg-elevated/60 px-2.5 transition-colors', open ? 'border-accent/60' : 'hairline')}>
        <Search size={14} className="shrink-0 text-faint" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="global-search-results"
          aria-autocomplete="list"
          aria-label="Search vessels, IMO, MMSI, ports, containers"
          placeholder={isMobile ? 'Search…' : 'Search vessels, IMO, MMSI, ports, containers…'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => ui.setSearchOpen(true)}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-ink placeholder:text-faint focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {query ? (
          <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="text-faint hover:text-ink">
            <X size={13} />
          </button>
        ) : (
          <span className="hidden sm:inline-flex">
            <Kbd>/</Kbd>
          </span>
        )}
      </div>

      {showDropdown && (
        <div
          id="global-search-results"
          role="listbox"
          ref={listRef}
          className="glass-strong absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-[min(70vh,520px)] overflow-y-auto rounded-lg p-1.5 animate-slide-down"
        >
          {response && response.groups.length === 0 && (
            <div className="px-3 py-6 text-center">
              <p className="text-[13px] font-medium text-ink">No results found.</p>
              <p className="mt-1 text-[12px] text-muted">Try another vessel name, IMO number, MMSI, port or a container number.</p>
            </div>
          )}

          {response?.groups.map((group) => (
            <div key={group.type} className="mb-1 last:mb-0">
              <div className="label-caps px-2.5 pb-1 pt-2">{group.label}</div>
              {group.items.map((r) => {
                const index = results.indexOf(r);
                const Icon = ICONS[r.type];
                const isActive = index === active;
                return (
                  <button
                    key={`${r.type}-${r.id}`}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    data-index={index}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => select(r)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors',
                      isActive ? 'bg-accent-soft' : 'hover:bg-accent-soft/50',
                    )}
                  >
                    <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', r.type === 'container' ? 'bg-warning-soft text-warning' : 'bg-line text-accent')}>
                      <Icon size={14} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-[13px] font-medium text-ink">
                        <span className={cn(r.type === 'container' && 'num')}>{r.title}</span>
                        {r.type === 'vessel' && <StatusDot status={r.vessel.status} />}
                      </span>
                      <span className="block truncate text-[11px] text-muted">
                        {r.type === 'vessel' ? (
                          <>
                            <span className="num">{r.subtitle}</span> · {r.detail}
                          </>
                        ) : (
                          <>
                            {r.subtitle}
                            {r.detail ? ` · ${r.detail}` : ''}
                          </>
                        )}
                      </span>
                    </span>
                    {r.type === 'container' && r.known && <span className="rounded border border-warning/30 px-1 text-[9px] uppercase tracking-wider text-warning">Demo</span>}
                    {r.type === 'port' && <span className="text-[10px] uppercase tracking-wider text-faint">View port</span>}
                  </button>
                );
              })}
              {group.type === 'container' && containerQuery && !knownContainer && (
                <p className="px-2.5 pb-2 pt-1 text-[11px] leading-relaxed text-faint">
                  Container tracking requires a connected carrier / tracking data source. This demo only resolves its built-in sample records.
                </p>
              )}
            </div>
          ))}

          <div className="mt-1 flex items-center gap-3 border-t hairline px-2.5 pt-2 text-[10px] text-faint">
            <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
            <span className="flex items-center gap-1"><Kbd>↵</Kbd> select</span>
            <span className="flex items-center gap-1"><Kbd>esc</Kbd> close</span>
          </div>
        </div>
      )}
    </div>
  );
}
