import React, { useState } from 'react';
import { LocationItem, PredictionResult, api } from '../services/api';
import { 
  Cpu, 
  Sparkles, 
  HelpCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  Clock, 
  CloudRain, 
  MapPin, 
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Info
} from 'lucide-react';

interface PredictionViewProps {
  locations: LocationItem[];
}

export const PredictionView: React.FC<PredictionViewProps> = ({ locations }) => {
  const [location, setLocation] = useState<string>('Vignan University Gate');
  const [hour, setHour] = useState<number>(18);
  const [dayOfWeek, setDayOfWeek] = useState<number>(4); // Friday
  const [weather, setWeather] = useState<string>('Clear');
  const [roadCondition, setRoadCondition] = useState<string>('Good');
  const [temperature, setTemperature] = useState<number>(31.0);
  const [rainfallMm, setRainfallMm] = useState<number>(0.0);
  const [visibilityKm, setVisibilityKm] = useState<number>(6.0);
  const [accidentReported, setAccidentReported] = useState<number>(0);
  const [localEvent, setLocalEvent] = useState<number>(0);
  const [isHoliday, setIsHoliday] = useState<number>(0);
  const [aqiLevel, setAqiLevel] = useState<number>(120);

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePredict = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        location,
        hour: Number(hour),
        day_of_week: Number(dayOfWeek),
        month: 5,
        weather,
        temperature: Number(temperature),
        visibility_km: Number(visibilityKm),
        road_condition: roadCondition,
        local_event: Number(localEvent),
        is_holiday: Number(isHoliday),
        accident_reported: Number(accidentReported),
        aqi_level: Number(aqiLevel),
        rainfall_mm: Number(rainfallMm)
      };

      const res = await api.predict(payload);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to generate prediction');
    } finally {
      setLoading(false);
    }
  };

  const getBadgeStyle = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'HIGH':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">Level 2 — ML Congestion Prediction Engine</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Trained on 40,000 observations using leakage-free pre-trip features with explainability attributions.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Parameters Form */}
        <form onSubmit={handlePredict} className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sliders className="w-4 h-4 text-indigo-400" />
            Commute & Environmental Parameters
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Location */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Target Corridor Location</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              >
                {locations.map((loc) => (
                  <option key={loc.Location_ID} value={loc.Location_Name}>
                    {loc.Location_Name} ({loc.Road_Type}, {loc.Road_Capacity} veh/h)
                  </option>
                ))}
              </select>
            </div>

            {/* Hour */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 flex justify-between">
                <span>Departure Time / Hour</span>
                <span className="text-indigo-400">{hour}:00 hrs</span>
              </label>
              <input
                type="range"
                min="0"
                max="23"
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Day of Week */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Day of Week</label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              >
                <option value={0}>Monday (Weekday)</option>
                <option value={1}>Tuesday (Weekday)</option>
                <option value={2}>Wednesday (Weekday)</option>
                <option value={3}>Thursday (Weekday)</option>
                <option value={4}>Friday (Rush Weekend Prep)</option>
                <option value={5}>Saturday (Weekend)</option>
                <option value={6}>Sunday (Weekend)</option>
              </select>
            </div>

            {/* Weather */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Weather Condition</label>
              <select
                value={weather}
                onChange={(e) => {
                  const val = e.target.value;
                  setWeather(val);
                  if (val === 'Heavy Rain') setRainfallMm(18.0);
                  else if (val === 'Rainy') setRainfallMm(7.5);
                  else setRainfallMm(0.0);
                }}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              >
                <option value="Clear">Clear Skies</option>
                <option value="Sunny">Sunny</option>
                <option value="Rainy">Rainy</option>
                <option value="Heavy Rain">Heavy Rain (Precipitation Surge)</option>
                <option value="Foggy">Foggy (Reduced Visibility)</option>
              </select>
            </div>

            {/* Road Condition */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Road Surface Condition</label>
              <select
                value={roadCondition}
                onChange={(e) => setRoadCondition(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              >
                <option value="Good">Good Surface</option>
                <option value="Construction">Construction Active (-20% Capacity)</option>
                <option value="Waterlogging">Waterlogging Present (High Friction)</option>
                <option value="Potholes">Potholes / Degraded</option>
              </select>
            </div>

            {/* Rainfall mm */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Rainfall (mm): {rainfallMm} mm</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="50"
                value={rainfallMm}
                onChange={(e) => setRainfallMm(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Incident & Event Toggles */}
          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-3">
            <label className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col gap-1 ${
              accidentReported === 1 
                ? 'bg-rose-50 border-rose-300 text-rose-700' 
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Accident Alert</span>
                <input
                  type="checkbox"
                  checked={accidentReported === 1}
                  onChange={(e) => setAccidentReported(e.target.checked ? 1 : 0)}
                  className="rounded accent-rose-500"
                />
              </div>
              <span className="text-[10px] text-slate-400">Incident on carriageway</span>
            </label>

            <label className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col gap-1 ${
              localEvent === 1 
                ? 'bg-amber-50 border-amber-300 text-amber-700' 
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Local Event</span>
                <input
                  type="checkbox"
                  checked={localEvent === 1}
                  onChange={(e) => setLocalEvent(e.target.checked ? 1 : 0)}
                  className="rounded accent-amber-500"
                />
              </div>
              <span className="text-[10px] text-slate-400">Crowd gathering</span>
            </label>

            <label className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col gap-1 ${
              isHoliday === 1 
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700' 
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Public Holiday</span>
                <input
                  type="checkbox"
                  checked={isHoliday === 1}
                  onChange={(e) => setIsHoliday(e.target.checked ? 1 : 0)}
                  className="rounded accent-indigo-500"
                />
              </div>
              <span className="text-[10px] text-slate-400">Holiday schedule</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-md shadow-sm transition-colors flex items-center justify-center gap-2 text-sm mt-3"
          >
            {loading ? (
              <span>Running Inference...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-indigo-200" />
                <span>Predict Congestion & Explain</span>
              </>
            )}
          </button>
        </form>

        {/* Prediction Results & "Why?" Panel */}
        <div className="lg:col-span-5 space-y-4">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-md text-rose-700 text-xs">
              {error}
            </div>
          )}

          {result ? (
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-5">
              {/* Prediction Result Badge */}
              <div className="text-center space-y-2 border-b border-slate-800 pb-4">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Predicted Congestion State
                </span>
                <div className="flex items-center justify-center gap-3">
                  <div className={`px-4 py-1.5 rounded-md text-xl font-bold tracking-wide border ${getBadgeStyle(result.prediction)}`}>
                    {result.prediction}
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <span>Model Confidence: <strong>{(result.confidence * 100).toFixed(1)}%</strong></span>
                  <span>•</span>
                  <span>Base Class: <strong>{result.base_ml_prediction}</strong></span>
                </div>

                {result.is_critical_escalated && (                    <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-md text-left text-xs text-purple-800 space-y-1">
                      <p className="font-semibold flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
                        Critical Incident Escalation:
                      </p>
                      <p className="text-[11px] text-purple-700/90">{result.escalation_reason}</p>
                  </div>
                )}
              </div>

              {/* Estimated Road Metrics */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 uppercase">Est. Volume</span>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {Math.round(result.estimated_metrics.estimated_volume_veh_hr)} v/h
                  </p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 uppercase">Est. Speed</span>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {result.estimated_metrics.estimated_speed_kmph} km/h
                  </p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 uppercase">T/C Ratio</span>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {result.estimated_metrics.estimated_tc_ratio}
                  </p>
                </div>
              </div>

              {/* "Why?" Explainability Panel */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-indigo-500" />
                  Why this Prediction? (Model Evidence)
                </h4>

                <div className="space-y-2">
                  {result.explainability.top_factors.map((factor, idx) => (
                    <div key={idx} className="bg-slate-50 p-2.5 rounded-md border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{factor.factor}</span>
                        <span className="text-[11px] font-mono text-indigo-600">+{factor.importance_pct.toFixed(1)}% weight</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {factor.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actionable Recommendations (Level 3) — returned by /api/predict */}
              {result.recommendations && (
                <div className="space-y-2.5 pt-1">
                  {/* User Travel Advice */}
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    User Travel Advice
                  </h4>
                  <div className="space-y-2">
                    {result.recommendations.user_travel_advice.map((adv, idx) => {
                      const badgeClass = adv.type === 'danger' || adv.type === 'warning'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : adv.type === 'caution'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : adv.type === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-indigo-50 text-indigo-600 border-indigo-200';
                      return (
                        <div key={idx} className="bg-slate-50 p-2.5 rounded-md border border-slate-200 space-y-1">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-slate-900">{adv.title}</span>
                            <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border whitespace-nowrap ${badgeClass}`}>
                              {adv.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">{adv.detail}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Traffic Management Recommendations */}
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600 flex items-center gap-1.5 pt-2 border-t border-slate-100">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    City Traffic Management
                  </h4>
                  <div className="space-y-2">
                    {result.recommendations.traffic_management_recommendations.map((mgmt, idx) => (
                      <div key={idx} className="bg-slate-50 p-2.5 rounded-md border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-amber-700">{mgmt.action}</span>
                          <span className="text-[10px] text-slate-400 uppercase whitespace-nowrap">{mgmt.category} • {mgmt.priority}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">{mgmt.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                <Cpu className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-900">Inference Engine Ready</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Adjust the commute parameters on the left and click "Predict Congestion" to receive model outputs and factor explainability.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
