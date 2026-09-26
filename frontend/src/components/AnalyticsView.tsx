import React, { useState } from 'react';
import { AnalyticsSummary } from '../services/api';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  CloudRain, 
  AlertTriangle, 
  Car, 
  Gauge, 
  Calendar,
  Building,
  ShieldAlert
} from 'lucide-react';

interface AnalyticsViewProps {
  summary: AnalyticsSummary | null;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ summary }) => {
  const [activeTab, setActiveTab] = useState<'trends' | 'weather_road' | 'corridors' | 'events'>('trends');

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <p>Loading Level 1 Analytics...</p>
      </div>
    );
  }

  const { kpis, congestion_distribution, hourly_trends, day_of_week_trends, weather_impact, road_condition_impact, locations_comparison } = summary;

  return (
    <div className="space-y-6">
      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Total Dataset</span>
            <Building className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1">{summary.total_records.toLocaleString()}</p>
          <span className="text-[11px] text-slate-400">7 Verified Locations</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Avg Traffic Volume</span>
            <Car className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-blue-400 mt-1">{kpis.avg_traffic_volume} <span className="text-xs font-normal text-slate-400">veh/h</span></p>
          <span className="text-[11px] text-slate-400">Peak observed: 1,284</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Avg Speed</span>
            <Gauge className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{kpis.avg_speed_kmph} <span className="text-xs font-normal text-slate-400">km/h</span></p>
          <span className="text-[11px] text-slate-400">Nominal 45.8 km/h</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Volume/Capacity</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-1">{kpis.avg_tc_ratio}</p>
          <span className="text-[11px] text-slate-400">Bottleneck threshold: 0.70</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Recorded Incidents</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-400 mt-1">{kpis.total_accidents.toLocaleString()}</p>
          <span className="text-[11px] text-slate-400">4.87% of observations</span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('trends')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'trends'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          Hourly & Weekly Trends
        </button>
        <button
          onClick={() => setActiveTab('weather_road')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'weather_road'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <CloudRain className="w-4 h-4" />
          Weather & Road Friction
        </button>
        <button
          onClick={() => setActiveTab('corridors')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'corridors'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          Corridor Comparison
        </button>
      </div>

      {/* TAB 1: Hourly & Day Trends */}
      {activeTab === 'trends' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hourly Traffic Curve */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">24-Hour Diurnal Traffic Volume & High-Congestion Risk</h3>
                <p className="text-xs text-slate-400">Demonstrates morning (8-10 AM) and evening (5-8 PM) commuter rush surges</p>
              </div>
            </div>

            {/* Custom SVG Hourly Chart */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-12 gap-1 items-end h-48 bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                {hourly_trends.filter((_, i) => i % 2 === 0).map((h) => {
                  const maxVol = 500;
                  const heightPct = Math.min(100, Math.max(15, (h.avg_volume / maxVol) * 100));
                  const isRush = [8, 9, 10, 17, 18, 19].includes(h.Hour);
                  return (
                    <div key={h.Hour} className="flex flex-col items-center gap-1 group relative">
                      <div 
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t transition-all ${
                          isRush ? 'bg-rose-500 hover:bg-rose-400' : 'bg-indigo-500 hover:bg-indigo-400'
                        }`}
                        title={`Hour ${h.Hour}:00: ${h.avg_volume} veh/h, ${h.avg_speed} km/h, ${h.high_congestion_pct}% High`}
                      />
                      <span className="text-[10px] text-slate-400 font-mono">{h.Hour}h</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-indigo-500"></span> Off-Peak Nominal</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-500"></span> Peak Commuter Rush (High Risk)</span>
              </div>
            </div>
          </div>

          {/* Day of Week Analysis */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">Weekly Day-by-Day Traffic Load</h3>
              <p className="text-xs text-slate-400">Comparison of weekday commuting vs weekend dispersion</p>
            </div>

            <div className="space-y-3 pt-2">
              {day_of_week_trends.map((day) => (
                <div key={day.DayOfWeek} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-300">{day.Day_Name}</span>
                    <span className="text-slate-400">{day.avg_volume} veh/h • {day.avg_speed} km/h • {day.high_congestion_pct}% High</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                    <div 
                      style={{ width: `${(day.avg_volume / 400) * 100}%` }}
                      className={`h-full ${[5, 6].includes(day.DayOfWeek) ? 'bg-teal-500' : 'bg-indigo-500'}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Weather & Road Condition */}
      {activeTab === 'weather_road' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weather Impact Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">Weather Condition vs Congestion & Speed</h3>
              <p className="text-xs text-slate-400">Impact of precipitation and poor visibility on corridor throughput</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <th className="py-2.5">Weather</th>
                    <th className="py-2.5">Observations</th>
                    <th className="py-2.5">Avg Speed</th>
                    <th className="py-2.5">High Congestion %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {weather_impact.map((w) => (
                    <tr key={w.Weather} className="hover:bg-slate-800/30">
                      <td className="py-2.5 font-bold text-white flex items-center gap-1.5">
                        <CloudRain className="w-3.5 h-3.5 text-indigo-400" />
                        {w.Weather}
                      </td>
                      <td className="py-2.5 text-slate-400">{w.records.toLocaleString()}</td>
                      <td className="py-2.5 font-semibold text-emerald-400">{w.avg_speed} km/h</td>
                      <td className="py-2.5 font-bold text-rose-400">{w.high_congestion_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Road Surface Impact Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">Road Surface Impedance Analysis</h3>
              <p className="text-xs text-slate-400">Corridor degradation under construction, potholes, and waterlogging</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <th className="py-2.5">Surface State</th>
                    <th className="py-2.5">Records</th>
                    <th className="py-2.5">Avg Speed</th>
                    <th className="py-2.5">High Congestion %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {road_condition_impact.map((r) => (
                    <tr key={r.Road_Condition} className="hover:bg-slate-800/30">
                      <td className="py-2.5 font-bold text-white">{r.Road_Condition}</td>
                      <td className="py-2.5 text-slate-400">{r.records.toLocaleString()}</td>
                      <td className="py-2.5 font-semibold text-emerald-400">{r.avg_speed} km/h</td>
                      <td className="py-2.5 font-bold text-rose-400">{r.high_congestion_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Corridor Comparison */}
      {activeTab === 'corridors' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">Corridor Master Comparison (All 7 Monitored Locations)</h3>
            <p className="text-xs text-slate-400">Authoritative baseline benchmarks derived from 50,000 observations</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <th className="py-3">Corridor Location</th>
                  <th className="py-3">Type / Lanes</th>
                  <th className="py-3">Capacity</th>
                  <th className="py-3">Records</th>
                  <th className="py-3">Avg Volume</th>
                  <th className="py-3">Avg Speed</th>
                  <th className="py-3">T/C Ratio</th>
                  <th className="py-3">High Congestion %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {locations_comparison.map((loc) => (
                  <tr key={loc.Location} className="hover:bg-slate-800/40">
                    <td className="py-3 font-bold text-white">{loc.Location}</td>
                    <td className="py-3 text-slate-300">{loc.road_type} • {loc.lanes}L</td>
                    <td className="py-3 text-slate-300 font-mono">{loc.capacity} veh/h</td>
                    <td className="py-3 text-slate-400">{loc.records.toLocaleString()}</td>
                    <td className="py-3 font-semibold text-indigo-400">{loc.avg_volume} veh/h</td>
                    <td className="py-3 font-semibold text-emerald-400">{loc.avg_speed} km/h</td>
                    <td className="py-3 font-semibold text-amber-400">{loc.avg_tc_ratio}</td>
                    <td className="py-3 font-bold text-rose-400">{loc.high_congestion_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
