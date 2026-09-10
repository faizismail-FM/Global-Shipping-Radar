import { useEffect, useState } from 'react';
import { bootSimulation } from '@/lib/simulation';
import { useUI } from '@/lib/store/ui';
import { settingsStore } from '@/lib/store/settings';
import { Sidebar } from './navigation/Sidebar';
import { TopBar } from './navigation/TopBar';
import { MobileNav } from './navigation/MobileNav';
import { MapView } from './map/MapView';
import { StatsBar } from './dashboard/StatsBar';
import { ActivityFeed } from './dashboard/ActivityFeed';
import { DetailPanelHost } from './panels/DetailPanelHost';
import { OverlayHost } from './panels/OverlayHost';
import { VesselsPage } from './vessels/VesselsPage';
import { PortsPage } from './ports/PortsPage';
import { RoutesPage } from './routes/RoutesPage';
import { AlertsPage } from './alerts/AlertsPage';
import { ContainerTrackingPage } from './tracking/ContainerTrackingPage';
import { VoyageSearchPage } from './voyage/VoyageSearchPage';

function ActiveView() {
  const view = useUI((s) => s.view);
  switch (view) {
    case 'vessels':
      return <VesselsPage />;
    case 'ports':
      return <PortsPage />;
    case 'routes':
      return <RoutesPage />;
    case 'alerts':
      return <AlertsPage />;
    case 'tracking':
      return <ContainerTrackingPage />;
    case 'voyage':
      return <VoyageSearchPage />;
    default:
      return null;
  }
}

export default function App() {
  const [booted, setBooted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapReady = useUI((s) => s.mapReady);
  const feedVisible = useUI((s) => s.overlay === null && s.view === 'overview');

  useEffect(() => {
    // Ensure the theme attribute matches persisted settings (the layout script handles first paint).
    settingsStore.setState({});
    bootSimulation()
      .then(() => setBooted(true))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to start simulation'));
  }, []);

  useEffect(() => {
    if (!booted || !mapReady) return;
    const el = document.getElementById('boot-screen');
    if (!el) return;
    el.style.transition = 'opacity 400ms ease';
    el.style.opacity = '0';
    const t = setTimeout(() => el.remove(), 420);
    return () => clearTimeout(t);
  }, [booted, mapReady]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div>
          <p className="text-[15px] font-semibold text-danger">Unable to start Global Shipping Radar</p>
          <p className="mt-1 text-[12px] text-muted">{error}</p>
        </div>
      </div>
    );
  }
  if (!booted) return null;

  return (
    <div className="flex h-full flex-col gap-2 p-2 md:gap-3 md:p-3">
      <TopBar />
      <div className="flex min-h-0 flex-1 gap-3">
        <Sidebar />
        <main className="relative min-w-0 flex-1 overflow-hidden rounded-lg border hairline bg-bg">
          <MapView />
          {/* Floating chrome over the map */}
          <div className="pointer-events-none absolute inset-0 z-10">
            <OverlayHost />
            <DetailPanelHost />
            <ActiveView />
            {feedVisible && (
              <div className="pointer-events-none absolute bottom-3 left-3 hidden w-[300px] md:block">
                <ActivityFeed />
              </div>
            )}
          </div>
        </main>
      </div>
      <div className="hidden md:block">
        <StatsBar />
      </div>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  );
}
