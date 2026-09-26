import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { CommandCenterView } from './components/CommandCenterView';
import { PredictionView } from './components/PredictionView';
import { SimulationView } from './components/SimulationView';
import { PlaceSelection } from './components/PlaceSearch';
import { Skeleton, Spinner } from './components/ui';
import { LocationItem, AnalyticsSummary, api } from './services/api';
import { AlertCircle, RefreshCw } from 'lucide-react';

// Heavy views (Leaflet map, large analytics tables) are code-split and only
// fetched when their tab is opened — the dashboard renders first.
const HistoricalMapView = lazy(() => import('./components/HistoricalMapView').then(m => ({ default: m.HistoricalMapView })));
const DatasetAnalyticsView = lazy(() => import('./components/DatasetAnalyticsView').then(m => ({ default: m.DatasetAnalyticsView })));
const ModelPerformanceView = lazy(() => import('./components/ModelPerformanceView').then(m => ({ default: m.ModelPerformanceView })));
const RouteIntelligenceView = lazy(() => import('./components/RouteIntelligenceView').then(m => ({ default: m.RouteIntelligenceView })));

const TabFallback: React.FC = () => (
  <div className="space-y-4">
    <Skeleton className="h-20 w-full" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
    </div>
    <Skeleton className="h-96 w-full" />
  </div>
);

export function App() {
  const [activeTab, setActiveTab] = useState<string>('command-center');
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [routeHandoff, setRouteHandoff] = useState<{ origin: PlaceSelection | null; destination: PlaceSelection | null }>({
    origin: null,
    destination: null,
  });

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [locsData, sumData] = await Promise.all([
        api.getLocations(),
        api.getSummary()
      ]);
      setLocations(locsData);
      setSummary(sumData);
    } catch (err: any) {
      console.error('Failed to load initial data:', err);
      setError(err.message || 'Failed to connect to TRAFFIQ backend service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const navigateToRouteWithPlaces = (origin: PlaceSelection | null, destination: PlaceSelection | null) => {
    if (!origin && !destination) return;
    setRouteHandoff({ origin, destination });
    setActiveTab('route-intelligence');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          // Dashboard-first skeleton: primary UI shape appears immediately
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <Skeleton className="lg:col-span-8 h-[420px]" />
              <Skeleton className="lg:col-span-4 h-[420px]" />
            </div>
            <p className="text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Spinner className="w-3.5 h-3.5" /> Connecting to TRAFFIQ backend…
            </p>
          </div>
        ) : error ? (
          <div className="max-w-lg mx-auto mt-20 p-6 bg-white border border-rose-200 rounded-lg text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Backend Connection Error</h3>
            <p className="text-xs text-slate-500">{error}</p>
            <button
              onClick={loadInitialData}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Connection
            </button>
          </div>
        ) : (
          <Suspense fallback={<TabFallback />}>
            {activeTab === 'command-center' && (
              <CommandCenterView
                locations={locations}
                summary={summary}
                onNavigate={(tab) => setActiveTab(tab)}
                onRouteRequest={navigateToRouteWithPlaces}
              />
            )}

            {activeTab === 'dataset-analytics' && (
              <DatasetAnalyticsView
                onNavigate={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'traffic-map' && (
              <HistoricalMapView
                locations={locations}
                summary={summary}
                onRouteRequest={navigateToRouteWithPlaces}
              />
            )}

            {activeTab === 'model-performance' && (
              <ModelPerformanceView />
            )}

            {activeTab === 'prediction' && (
              <PredictionView
                locations={locations}
              />
            )}

            {activeTab === 'route-intelligence' && (
              <RouteIntelligenceView
                locations={locations}
                initialOrigin={routeHandoff.origin}
                initialDestination={routeHandoff.destination}
              />
            )}

            {activeTab === 'simulation' && (
              <SimulationView
                locations={locations}
              />
            )}
          </Suspense>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>TRAFFIQ — Smart City Traffic Intelligence &amp; Route Analytics · DataQuest 2026</p>
          <p className="text-[11px] text-slate-400">
            Historical dataset analytics · OpenStreetMap geocoding · OSRM routing (no live traffic claims)
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
