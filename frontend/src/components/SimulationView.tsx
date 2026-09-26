import React, { useState } from 'react';
import { LocationItem, SimulationResult, api } from '../services/api';
import { 
  Sliders, 
  Play, 
  ArrowRight, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  TrendingUp, 
  Car, 
  Gauge,
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface SimulationViewProps {
  locations: LocationItem[];
}

export const SimulationView: React.FC<SimulationViewProps> = ({ locations }) => {
  const [location, setLocation] = useState<string>('Vignan University Gate');
  const [volumeDelta, setVolumeDelta] = useState<number>(25); // +25%
  const [accidentInjected, setAccidentInjected] = useState<boolean>(false);
  const [weatherOverride, setWeatherOverride] = useState<string>('Clear');
  const [roadCondOverride, setRoadCondOverride] = useState<string>('Good');
  const [hour, setHour] = useState<number>(18);

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        location,
        volume_delta_percent: Number(volumeDelta),
        accident_injected: accidentInjected ? 1 : 0,
        weather_override: weatherOverride,
        road_condition_override: roadCondOverride,
        hour: Number(hour),
        rainfall_override: weatherOverride === 'Heavy Rain' ? 20.0 : weatherOverride === 'Rainy' ? 8.0 : 0.0
      };

      const res = await api.runSimulation(payload);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Simulation error');
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-purple-700 bg-purple-50 border-purple-200';
      case 'HIGH': return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'MEDIUM': return 'text-amber-700 bg-amber-50 border-amber-200';
      default: return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Simulation Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">Scenario Simulation (Stress Test Lab)</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate capacity stress, traffic volume modulations (+10% to +50%), and incident bottlenecks.
            </p>
          </div>
        </div>

        {/* Notice */}
        <div className="px-3 py-1.5 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium">
          Scenario simulation — mathematical stress test, not live traffic
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-100 pb-3">
            Simulation Parameters
          </h3>

          {/* Location */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Monitored corridor</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            >
              {locations.map((l) => (
                <option key={l.Location_ID} value={l.Location_Name}>{l.Location_Name}</option>
              ))}
            </select>
          </div>

          {/* Volume Modulation Slider */}
          <div className="space-y-1.5 bg-slate-50 p-3 rounded-md border border-slate-200">
            <div className="flex justify-between text-xs font-medium text-slate-600">
              <span>Traffic volume modulation</span>
              <span className={`font-mono font-semibold ${volumeDelta > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {volumeDelta > 0 ? `+${volumeDelta}%` : `${volumeDelta}%`}
              </span>
            </div>
            <input
              type="range"
              min="-40"
              max="60"
              step="5"
              value={volumeDelta}
              onChange={(e) => setVolumeDelta(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>-40% (drop)</span>
              <span>Baseline (0%)</span>
              <span>+60% (gridlock surge)</span>
            </div>
          </div>

          {/* Incident Stress Injector */}
          <div className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Inject simulated carriageway accident
              </span>
              <input
                type="checkbox"
                checked={accidentInjected}
                onChange={(e) => setAccidentInjected(e.target.checked)}
                className="rounded accent-rose-600 w-4 h-4"
              />
            </label>
            <p className="text-[11px] text-slate-500">
              Forces capacity restriction and incident friction to test city response escalation.
            </p>
          </div>

          {/* Environmental Stress */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-600">Weather friction</label>
              <select
                value={weatherOverride}
                onChange={(e) => setWeatherOverride(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              >
                <option value="Clear">Clear</option>
                <option value="Rainy">Rainy</option>
                <option value="Heavy Rain">Heavy Rain</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-600">Surface friction</label>
              <select
                value={roadCondOverride}
                onChange={(e) => setRoadCondOverride(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              >
                <option value="Good">Good</option>
                <option value="Waterlogging">Waterlogging</option>
                <option value="Construction">Construction</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleSimulate}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-md text-sm shadow-sm transition-colors flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <span>Simulating…</span>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Run Sensitivity Simulation</span>
              </>
            )}
          </button>
        </div>

        {/* Comparison Output */}
        <div className="lg:col-span-7 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-700 text-xs">
              {error}
            </div>
          )}

          {result ? (
            <div className="space-y-4">
              {/* Baseline vs Simulated Comparison */}
              <div className="grid grid-cols-2 gap-4">
                {/* Baseline Card */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[11px] font-semibold uppercase text-slate-500">Baseline (observed)</span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded border ${getLevelColor(result.comparison.baseline.congestion_level)}`}>
                      {result.comparison.baseline.congestion_level}
                    </span>
                  </div>
                  <div className="text-xs space-y-1.5 text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Volume:</span>
                      <span className="font-semibold">{result.comparison.baseline.estimated_volume} veh/h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Average speed:</span>
                      <span className="font-semibold text-emerald-600">{result.comparison.baseline.estimated_speed_kmph} km/h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">T/C ratio:</span>
                      <span className="font-semibold">{result.comparison.baseline.tc_ratio}</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Card */}
                <div className="bg-white border border-indigo-200 rounded-lg p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[11px] font-semibold uppercase text-indigo-600">Simulated outcome</span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded border ${getLevelColor(result.comparison.simulated.congestion_level)}`}>
                      {result.comparison.simulated.congestion_level}
                    </span>
                  </div>
                  <div className="text-xs space-y-1.5 text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sim. volume:</span>
                      <span className="font-semibold text-indigo-700">{result.comparison.simulated.estimated_volume} veh/h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sim. speed:</span>
                      <span className="font-semibold text-rose-600">{result.comparison.simulated.estimated_speed_kmph} km/h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sim. T/C ratio:</span>
                      <span className="font-semibold text-amber-600">{result.comparison.simulated.tc_ratio}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stress Deltas Bar */}
              <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm grid grid-cols-3 gap-3 text-center">
                <div>
                  <span className="text-[10px] uppercase text-slate-500">Volume surge</span>
                  <p className="text-base font-semibold text-indigo-600 mt-0.5">
                    {result.comparison.deltas.volume_change_veh_hr > 0 ? `+${result.comparison.deltas.volume_change_veh_hr}` : result.comparison.deltas.volume_change_veh_hr} v/h
                  </p>
                </div>
                <div className="border-x border-slate-100">
                  <span className="text-[10px] uppercase text-slate-500">Speed drop</span>
                  <p className="text-base font-semibold text-rose-600 mt-0.5">
                    -{Math.abs(result.comparison.deltas.speed_loss_kmph)} km/h
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-500">T/C increase</span>
                  <p className="text-base font-semibold text-amber-600 mt-0.5">
                    +{result.comparison.deltas.tc_ratio_increase}
                  </p>
                </div>
              </div>

              {/* Recommended Intervention */}
              <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  Intervention strategy under stress
                </h4>
                {result.recommendations.traffic_management_recommendations.slice(0, 2).map((rec: any, i: number) => (
                  <div key={i} className="p-2.5 bg-slate-50 rounded-md border border-slate-200 text-xs space-y-1">
                    <p className="font-semibold text-amber-700">{rec.action}</p>
                    <p className="text-slate-500 text-[11px]">{rec.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                <Sliders className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-900">Stress Test Simulator Ready</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Set volume modulations and optional incident triggers on the left, then click "Run Sensitivity Simulation" to view delta impacts.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
