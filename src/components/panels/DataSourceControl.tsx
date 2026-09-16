import type { DataSource } from '@/types';
import { updateSettings, useSettings } from '@/lib/store/settings';
import { applyDataSource } from '@/lib/live';
import { Segmented } from '@/components/ui';

/** Segmented switch between the simulated fleet and live AIS sources (persisted). */
export function DataSourceControl() {
  const dataSource = useSettings((s) => s.dataSource);
  return (
    <>
      <Segmented<DataSource>
        value={dataSource}
        options={[
          { value: 'simulated', label: 'Simulated fleet' },
          { value: 'digitraffic', label: 'Live AIS · Baltic' },
        ]}
        onChange={(v) => {
          updateSettings({ dataSource: v });
          void applyDataSource(v, { flyToCoverage: true });
        }}
        label="Vessel data source"
      />
      <p className="mt-1 text-[10px] leading-relaxed text-faint">
        {dataSource === 'digitraffic'
          ? 'Real cargo and tanker positions from Fintraffic / Digitraffic (Finnish AIS network, CC BY 4.0). Coverage: Baltic Sea.'
          : 'Deterministic simulated container fleet on the world\'s major lanes. Switch to Live AIS for real positions.'}
      </p>
    </>
  );
}
