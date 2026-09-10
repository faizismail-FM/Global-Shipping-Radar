import { Settings, Moon, Sun, RotateCcw } from 'lucide-react';
import { resetSettings, updateSettings, useSettings } from '@/lib/store/settings';
import { getEngine } from '@/lib/simulation';
import { PanelHeader, Segmented, Toggle } from '@/components/ui';

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const settings = useSettings((s) => s);
  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        title="Settings"
        icon={Settings}
        onClose={onClose}
        actions={
          <button type="button" onClick={() => { resetSettings(); getEngine().setConfig({ intervalMs: 2000 }); }} className="flex items-center gap-1 text-[11px] text-muted hover:text-accent">
            <RotateCcw size={11} /> Reset
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <section>
          <div className="label-caps mb-1.5">Appearance</div>
          <Segmented
            value={settings.theme}
            options={[
              { value: 'dark', label: <span className="inline-flex items-center gap-1.5"><Moon size={12} /> Dark</span> },
              { value: 'light', label: <span className="inline-flex items-center gap-1.5"><Sun size={12} /> Light</span> },
            ]}
            onChange={(theme) => updateSettings({ theme })}
            label="Theme"
          />
        </section>

        <section className="mt-5">
          <div className="label-caps mb-1">Map</div>
          <div className="divide-y divide-[var(--border)]">
            <Toggle checked={settings.showRoutes} onChange={(v) => updateSettings({ showRoutes: v })} label="Show routes" description="Major shipping lanes" />
            <Toggle checked={settings.showPorts} onChange={(v) => updateSettings({ showPorts: v })} label="Show ports" description="Port markers and labels" />
            <Toggle checked={settings.showVesselLabels} onChange={(v) => updateSettings({ showVesselLabels: v })} label="Show vessel labels" description="Names appear when zoomed in" />
          </div>
        </section>

        <section className="mt-5">
          <div className="label-caps mb-1.5">Simulation update interval</div>
          <Segmented
            value={String(settings.updateIntervalMs)}
            options={[
              { value: '1000', label: '1 s' },
              { value: '2000', label: '2 s' },
              { value: '5000', label: '5 s' },
            ]}
            onChange={(v) => {
              updateSettings({ updateIntervalMs: Number(v) });
              getEngine().setConfig({ intervalMs: Number(v) });
            }}
            label="Update interval"
          />
        </section>

        <section className="mt-5">
          <div className="label-caps mb-1.5">Speed units</div>
          <Segmented
            value={settings.speedUnit}
            options={[
              { value: 'kn', label: 'Knots' },
              { value: 'kmh', label: 'km/h' },
            ]}
            onChange={(speedUnit) => updateSettings({ speedUnit })}
            label="Speed units"
          />
        </section>

        <section className="mt-5">
          <div className="label-caps mb-1.5">Distance units</div>
          <Segmented
            value={settings.distanceUnit}
            options={[
              { value: 'nm', label: 'Nautical miles' },
              { value: 'km', label: 'Kilometres' },
            ]}
            onChange={(distanceUnit) => updateSettings({ distanceUnit })}
            label="Distance units"
          />
        </section>

        <p className="mt-6 border-t hairline pt-3 text-[11px] text-faint">Preferences are stored in this browser (localStorage).</p>
      </div>
    </div>
  );
}
