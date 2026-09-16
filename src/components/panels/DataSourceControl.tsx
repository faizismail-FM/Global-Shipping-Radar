import type { DataSource } from '@/types';
import { updateSettings, useSettings } from '@/lib/store/settings';
import { applyDataSource } from '@/lib/live';
import { Segmented } from '@/components/ui';

const HINTS: Record<DataSource, string> = {
  simulated: "Deterministic simulated container fleet on the world's major lanes.",
  digitraffic: 'Real cargo and tanker positions from Fintraffic / Digitraffic (Finnish AIS network, CC BY 4.0, no key). Coverage: Baltic Sea.',
  aisstream: 'Real positions worldwide via aisstream.io, relayed by the server. Shows vessels in the current map view; pan or zoom to load other areas. Requires AISSTREAM_API_KEY on the server.',
};

/** Segmented switch between the simulated fleet and live AIS sources (persisted). */
export function DataSourceControl() {
  const dataSource = useSettings((s) => s.dataSource);
  return (
    <>
      <Segmented<DataSource>
        value={dataSource}
        options={[
          { value: 'simulated', label: 'Simulated' },
          { value: 'digitraffic', label: 'Baltic AIS' },
          { value: 'aisstream', label: 'Global AIS' },
        ]}
        onChange={(v) => {
          updateSettings({ dataSource: v });
          void applyDataSource(v, { flyToCoverage: true });
        }}
        label="Vessel data source"
      />
      <p className="mt-1 text-[10px] leading-relaxed text-faint">{HINTS[dataSource]}</p>
    </>
  );
}
