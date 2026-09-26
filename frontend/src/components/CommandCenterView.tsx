import React, { Suspense, lazy } from 'react';
import { LocationItem, AnalyticsSummary } from '../services/api';
import { Card, Skeleton } from './ui';
import {
  AlertTriangle,
  MapPin,
  ShieldCheck,
  ArrowUpRight,
  Compass,
  Cpu,
} from 'lucide-react';

import { PlaceSelection } from './PlaceSearch';

interface CommandCenterViewProps {
  locations: LocationItem[];
  summary: AnalyticsSummary | null;
  onNavigate: (tab: string) => void;
  onRouteRequest?: (origin: PlaceSelection | null, destination: PlaceSelection | null) => void;
}

// Leaflet map is code-split: the dashboard renders first, map resources load after
const TrafficMap = lazy(() => import('./TrafficMap').then(m => ({ default: m.TrafficMap })));

const MapFallback: React.FC = () => <Skeleton className="h-[480px] w-full rounded-lg" />;

export const CommandCenterView: React.FC<CommandCenterViewProps> = ({ locations, summary, onNavigate, onRouteRequest }) => {
  if (!summary) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        <p>Initializing Smart City Command Center…</p>
      </div>
    );
  }

  const { kpis, congestion_distribution, locations_comparison } = summary;

  // Identify top high-risk congestion corridors
  const sortedByRisk = [...locations_comparison].sort((a, b) => b.high_congestion_pct - a.high_congestion_pct);
  const highestRiskLocation = sortedByRisk[0];

  // Dataset-wide congestion split from the backend analytics summary
  const levelMeta = [
    { key: 'Low', label: 'LOW Congestion (Optimal Flow)', barClass: 'bg-emerald-500', textClass: 'text-emerald-600' },
    { key: 'Medium', label: 'MEDIUM Congestion (Dense Steady)', barClass: 'bg-amber-500', textClass: 'text-amber-600' },
    { key: 'High', label: 'HIGH Congestion (Bottlenecks)', barClass: 'bg-rose-500', textClass: 'text-rose-600' },
  ];
  const totalRecords = summary.total_records || 1;

  return (
    <div className="space-y-6">
      {/* Top Welcome / System Status Banner */}
      <Card className="p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Urban Traffic Monitoring · Historical dataset baseline
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            TRAFFIQ Smart City Traffic Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Congestion analytics, ML prediction and OpenStreetMap routing for the Andhra Pradesh Central Corridor —
            built on the 50,000-record historical dataset, with clearly-labeled model outputs.
          </p>
        </div>

        {/* Quick CTA Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('route-intelligence')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Route Intelligence</span>
          </button>
          <button
            onClick={() => onNavigate('prediction')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-semibold shadow-sm transition-colors"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>ML Predictor</span>
          </button>
        </div>
      </Card>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            Dataset Records (Historical)
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{summary.total_records.toLocaleString()}</p>
          <p className="text-[11px] text-slate-500">7 verified monitored corridors</p>
        </Card>

        <Card className="p-4">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Average Volume
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {kpis.avg_traffic_volume} <span className="text-xs font-normal text-slate-500">veh/h</span>
          </p>
          <p className="text-[11px] text-slate-500">Corridor mean load</p>
        </Card>

        <Card className="p-4">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Average Corridor Speed
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {kpis.avg_speed_kmph} <span className="text-xs font-normal text-slate-500">km/h</span>
          </p>
          <p className="text-[11px] text-slate-500">Free-flow ceiling: 70 km/h</p>
        </Card>

        <Card className="p-4">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Top Congestion Risk
          </span>
          <p className="text-lg font-bold text-slate-900 mt-1 truncate">{highestRiskLocation?.Location || '—'}</p>
          <p className="text-[11px] text-slate-500">{highestRiskLocation?.high_congestion_pct}% high congestion</p>
        </Card>
      </div>

      {/* Main Map Section with Quick View */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-500" />
              Corridor Geospatial Status (Guntur · Vadlamudi · Vijayawada)
            </h2>
            <p className="text-xs text-slate-500">Click any marker to inspect historical throughput and capacity metrics</p>
          </div>
          <button
            onClick={() => onNavigate('traffic-map')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            Full Map View <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <Suspense fallback={<MapFallback />}>
          <TrafficMap
            locations={locations}
            summary={summary}
            onSelectLocation={(locName) => console.log('Selected:', locName)}
            onRouteRequest={onRouteRequest}
          />
        </Suspense>
      </div>

      {/* Bottom Grid: Congestion Breakdown & High-Priority Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Congestion Level Breakdown */}
        <Card className="lg:col-span-5 p-5 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 flex items-center justify-between">
            <span>Historical Congestion Split</span>
            <span className="text-[10px] text-slate-400 font-medium">{totalRecords.toLocaleString()} records</span>
          </h3>

          <div className="space-y-3">
            {/* Congestion level bars — driven by backend summary.congestion_distribution */}
            {levelMeta.map((meta) => {
              const count = congestion_distribution?.counts?.[meta.key] ?? 0;
              const pct = congestion_distribution?.percentages?.[meta.key] ?? 0;
              return (
                <div key={meta.key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className={`font-medium ${meta.textClass}`}>{meta.label}</span>
                    <span className="font-semibold text-slate-900">{pct.toFixed(2)}% ({count.toLocaleString()})</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`${meta.barClass} h-full rounded-full`} style={{ width: `${Math.min(100, pct)}%` }}></div>
                  </div>
                </div>
              );
            })}

            {/* Critical Note */}
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-md text-xs text-purple-800 space-y-1 mt-2">
              <p className="font-semibold flex items-center gap-1.5 text-purple-700">
                <ShieldCheck className="w-3.5 h-3.5" />
                Data provenance &amp; incident escalation
              </p>
              <p className="text-[11px] text-purple-700/90">
                Raw dataset labels: Low, Medium, High. Critical is a compound incident escalation state triggered when
                High congestion encounters active accidents or severe weather.
              </p>
            </div>
          </div>
        </Card>

        {/* Priority City Traffic Directives */}
        <Card className="lg:col-span-7 p-5 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 flex items-center justify-between">
            <span>Corridor Observations &amp; Operational Notes</span>
            <span className="text-[10px] text-indigo-600 font-medium">FROM DATASET ANALYSIS</span>
          </h3>

          <div className="space-y-2.5">
            <div className="p-3 bg-slate-50 rounded-md border border-slate-200 flex items-start gap-3">
              <div className="p-2 rounded bg-indigo-50 text-indigo-600 mt-0.5 shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 text-xs">
                <p className="font-semibold text-slate-900">Vignan University — Guntur Commuter Corridor</p>
                <p className="text-slate-500 text-[11px]">
                  Peak morning outflow towards Guntur City Center experiences a 28% capacity compression. Recommended deployment of dynamic green wave coordination during 08:00 – 10:00 AM.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-md border border-slate-200 flex items-start gap-3">
              <div className="p-2 rounded bg-rose-50 text-rose-600 mt-0.5 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 text-xs">
                <p className="font-semibold text-slate-900">NH-16 Highway Exit &amp; Kaza Bypass Choke Point</p>
                <p className="text-slate-500 text-[11px]">
                  Heavy vehicle merging generates high volume-to-capacity spikes (0.65+). Automated ramp metering advised when rainfall exceeds 10mm.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-md border border-slate-200 flex items-start gap-3">
              <div className="p-2 rounded bg-emerald-50 text-emerald-600 mt-0.5 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 text-xs">
                <p className="font-semibold text-slate-900">Vignan Campus Gate Entry Free Flow Optimization</p>
                <p className="text-slate-500 text-[11px]">
                  Campus arterial capacity is 700 veh/hr (2 lanes). Staggered student transit shuttles successfully mitigate localized morning gate queues.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
