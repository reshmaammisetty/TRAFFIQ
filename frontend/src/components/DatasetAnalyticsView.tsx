import React, { useEffect, useState } from 'react';
import {
  DatasetOverview, DatasetPreview, FullAnalytics, UploadAnalysis, api
} from '../services/api';
import {
  FileText, BarChart3, Search, Upload, Table, Info, AlertTriangle,
  CheckCircle2, RefreshCw, Activity, TrendingUp, Clock, CloudRain
} from 'lucide-react';

const LEVEL_COLOR: Record<string, string> = {
  Low: '#10b981', Medium: '#f59e0b', High: '#ef4444', Critical: '#9333ea'
};

/* ---------- small building blocks ---------- */

const Section: React.FC<{ title: string; icon?: React.ReactNode; subtitle?: string; children: React.ReactNode; span?: string }> =
({ title, icon, subtitle, children, span }) => (
  <div className={`bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3 ${span || ''}`}>
    <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-2">
      <div>
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          {icon}
          {title}
        </h3>
        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {children}
  </div>
);

const UnavailableCard: React.FC<{ reason: string }> = ({ reason }) => (
  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-500 flex items-start gap-2">
    <Info className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
    <span>Not available for this dataset: {reason}</span>
  </div>
);

const HBars: React.FC<{ items: Array<{ label: string; value: number; display: string; color?: string }> }> = ({ items }) => {
  const max = Math.max(1, ...items.map(i => i.value));
  return (
    <div className="space-y-2">
      {items.map((it, idx) => (
        <div key={idx} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-slate-800">{it.label}</span>
            <span className="font-bold text-slate-900">{it.display}</span>
          </div>
          <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-200">
            <div className="h-full rounded-full" style={{ width: `${(it.value / max) * 100}%`, backgroundColor: it.color || '#6366f1' }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const MiniLineChart: React.FC<{ values: Array<number | null>; color: string; height?: number }> = ({ values, color, height = 110 }) => {
  const clean = values.map(v => (typeof v === 'number' ? v : null));
  const nums = clean.filter((v): v is number => v !== null);
  if (nums.length < 2) return <p className="text-xs text-slate-500">Not enough data points to plot.</p>;
  const min = Math.min(...nums), max = Math.max(...nums);
  const range = max - min || 1;
  const W = 600, H = height, PAD = 6;
  let d = '';
  let started = false;
  clean.forEach((v, i) => {
    if (v === null) return;
    const x = PAD + (i / (clean.length - 1)) * (W - 2 * PAD);
    const y = H - PAD - ((v - min) / range) * (H - 2 * PAD);
    d += `${started ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)} `;
    started = true;
  });
  return (
    <div className="bg-slate-50 rounded-md border border-slate-200 p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
        <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between text-[10px] text-slate-500 px-1">
        <span>min {min.toLocaleString()}</span>
        <span>max {max.toLocaleString()}</span>
      </div>
    </div>
  );
};

const CompareCards: React.FC<{ rows: Array<Record<string, any>>; metricKey: string; label: string; unit: string; inverse?: boolean }> =
({ rows, metricKey, label, unit, inverse }) => {
  const vals = rows.map(r => r[metricKey] ?? 0);
  const best = inverse ? Math.min(...vals) : Math.max(...vals);
  return (
    <div className="grid grid-cols-2 gap-3">
      {rows.map((r, idx) => {
        const isKey = r[metricKey] === best;
        return (
          <div key={idx} className={`p-3 rounded-lg border space-y-1.5 ${isKey ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">{r.segment}</span>
              {isKey && <span className="text-[9px] font-semibold uppercase text-rose-400">{inverse ? 'lowest' : 'peak'} {label.split(' ')[0].toLowerCase()}</span>}
            </div>
            <p className="text-lg font-bold text-rose-400">{r[metricKey]}<span className="text-[10px] font-normal text-slate-500"> {unit}</span></p>
            <div className="text-[10px] text-slate-500 space-y-0.5">
              <p>{r.records.toLocaleString()} records</p>
              {r.avg_volume != null && <p>avg volume {r.avg_volume} veh/h</p>}
              {r.avg_speed != null && <p>avg speed {r.avg_speed} km/h</p>}
              {r.low_congestion_pct != null && <p>low {r.low_congestion_pct}% • medium {r.medium_congestion_pct}%</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Heatmap: React.FC<{ data: Record<string, any> }> = ({ data }) => {
  const { hours, locations, high_pct } = data;
  return (
    <div className="overflow-x-auto">
      <div style={{ display: 'grid', gridTemplateColumns: `110px repeat(${hours.length}, minmax(0,1fr))`, gap: '2px' }} className="min-w-[720px]">
        <div />
        {hours.map((h: number) => (
          <div key={h} className="text-[9px] text-slate-500 text-center font-mono">{h % 2 === 0 ? `${h}` : ''}</div>
        ))}
        {locations.map((loc: string) => (
          <React.Fragment key={loc}>
            <div className="text-[10px] text-slate-600 font-semibold truncate pr-2" title={loc}>{loc}</div>
            {hours.map((h: number) => {
              const v = high_pct?.[String(h)]?.[loc];
              const alpha = v == null ? 0 : Math.min(0.85, v / 40);
              return (
                <div
                  key={h}
                  title={v == null ? `${loc} @ ${h}:00 — no data` : `${loc} @ ${h}:00 — ${v}% High congestion`}
                  className="h-6 rounded-sm border border-slate-200"
                  style={{ backgroundColor: v == null ? '#f1f5f9' : `rgba(239,68,68,${alpha})` }}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
        <span>0% High</span>
        {[0.05, 0.2, 0.4, 0.6, 0.85].map(a => (
          <span key={a} className="w-6 h-2.5 rounded-sm border border-slate-200" style={{ backgroundColor: `rgba(239,68,68,${a})` }} />
        ))}
        <span>35%+ High</span>
        <span className="ml-2">— share of records at High congestion per (hour, location)</span>
      </div>
    </div>
  );
};

/* ---------- main view ---------- */

interface DatasetAnalyticsViewProps {
  onNavigate?: (tab: string) => void;
}

export const DatasetAnalyticsView: React.FC<DatasetAnalyticsViewProps> = ({ onNavigate }) => {
  const [overview, setOverview] = useState<DatasetOverview | null>(null);
  const [full, setFull] = useState<FullAnalytics | null>(null);
  const [upload, setUpload] = useState<UploadAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [preview, setPreview] = useState<DatasetPreview | null>(null);
  const [previewSearch, setPreviewSearch] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const activeOverview = upload ? upload.overview : overview;
  const activeAnalytics: Record<string, any> | null = upload ? upload.analytics : (full?.analytics ?? null);
  const isUpload = !!upload;

  const loadDefault = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, fa] = await Promise.all([api.getDatasetOverview(), api.getFullAnalytics()]);
      setOverview(ov);
      setFull(fa);
      setUpload(null);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze dataset');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDefault(); }, []);

  const loadPreview = async (search: string) => {
    setPreviewLoading(true);
    try {
      const p = await api.getDatasetPreview(search, 12);
      setPreview(p);
    } catch { /* preview is non-critical */ }
    finally { setPreviewLoading(false); }
  };
  useEffect(() => { loadPreview(''); }, []);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const res = await api.uploadDataset(file);
      setUpload(res);
    } catch (err: any) {
      setError(err.message || 'Upload analysis failed');
    } finally {
      setUploading(false);
    }
  };

  const a = activeAnalytics;

  const previewHandler = (e: React.FormEvent) => {
    e.preventDefault();
    loadPreview(previewSearch);
  };

  const dataNaturePill = upload ? upload.data_nature : 'Historical / static dataset — not live or real-time traffic';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Dataset &amp; Analytics — Automatic Analysis</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Every chart below is generated automatically from the loaded CSV. No manual chart selection required.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-700">
          <Info className="w-4 h-4 text-indigo-600" />
          <span>{dataNaturePill}</span>
        </div>
      </div>

      {/* Upload row */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-600">
          <p className="font-semibold text-slate-800">Custom CSV analysis</p>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Upload a compatible traffic CSV to inspect its schema and generate all supported analytics. The default 50,000-row dataset stays the active demo dataset for map, prediction, routing and simulation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors ${uploading ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'}`}>
            <Upload className="w-3.5 h-3.5" />
            {uploading ? 'Analyzing…' : 'Upload CSV'}
            <input
              type="file"
              accept=".csv"
              className="hidden"
              disabled={uploading}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }}
            />
          </label>
          {isUpload && (
            <button onClick={loadDefault} className="px-3 py-2 rounded-lg text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Back to default dataset
            </button>
          )}
        </div>
      </div>

      {isUpload && upload && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
          <p className="font-bold text-slate-900 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Analyzed: {upload.filename} ({upload.overview.row_count.toLocaleString()} rows × {upload.overview.column_count} columns)</p>
          {upload.sampled_note && <p className="text-amber-700 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {upload.sampled_note}</p>}
          <p>{upload.ml_feature_availability.notice}</p>
          {upload.geography.notice && <p className="text-amber-700">{upload.geography.notice}</p>}
          {upload.geography.available && upload.geography.method && (
            <p className="text-emerald-700">Geography: {upload.geography.method} ({upload.geography.locations.length} points)</p>
          )}
          {!upload.geography.available && !upload.geography.notice && (
            <p className="text-amber-700">No location/coordinate information found — map visualization is not generated (no fabricated geography).</p>
          )}
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-700 text-xs">{error}</div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-3 text-slate-500">
          <RefreshCw className="w-7 h-7 animate-spin text-indigo-500" />
          <p className="text-sm">Analyzing dataset automatically…</p>
        </div>
      ) : !activeOverview || !a ? (
        <div className="p-6 bg-white border border-slate-200 rounded-lg text-slate-500 text-sm">No dataset loaded.</div>
      ) : (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Rows', value: activeOverview.row_count.toLocaleString() },
              { label: 'Columns', value: String(activeOverview.column_count) },
              { label: 'Missing cells', value: activeOverview.missing_cells.toLocaleString() },
              { label: 'Duplicate rows', value: activeOverview.duplicate_rows.toLocaleString() },
              { label: 'Unique locations', value: String(activeOverview.unique_locations) },
              { label: 'Time span', value: activeOverview.timestamp_range.available ? `${activeOverview.timestamp_range.start?.slice(0, 10)} → ${activeOverview.timestamp_range.end?.slice(0, 10)}` : 'n/a' },
            ].map(k => (
              <div key={k.label} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{k.label}</span>
                <p className="text-sm font-bold text-slate-900 mt-1 break-words">{k.value}</p>
              </div>
            ))}
          </div>

          {/* Schema overview */}
          <Section title="Dataset Schema & Quality" icon={<Table className="w-4 h-4 text-indigo-600" />} subtitle={activeOverview.source}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold">
                      <th className="py-2">Column</th>
                      <th className="py-2">Type</th>
                      <th className="py-2">Missing</th>
                      <th className="py-2">Unique</th>
                      <th className="py-2">Sample</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeOverview.columns.map(c => (
                      <tr key={c.name} className="hover:bg-slate-50">
                        <td className="py-1.5 font-semibold text-slate-900">{c.name}</td>
                        <td className="py-1.5 text-slate-500">{c.dtype}</td>
                        <td className={`py-1.5 ${c.missing > 0 ? 'text-amber-600 font-semibold' : 'text-slate-500'}`}>{c.missing}</td>
                        <td className="py-1.5 text-slate-500">{c.unique.toLocaleString()}</td>
                        <td className="py-1.5 text-slate-500 font-mono text-[10px]">{c.sample ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-3 max-h-72 overflow-y-auto">
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Categorical values (top)</h4>
                  <div className="space-y-2">
                    {activeOverview.categorical_values.slice(0, 5).map(cv => (
                      <div key={cv.column} className="bg-slate-50 p-2 rounded-md border border-slate-200">
                        <p className="text-[11px] font-bold text-slate-800">{cv.column} <span className="text-slate-500 font-normal">({cv.unique} unique)</span></p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {cv.top_values.map(tv => `${tv.value || '∅'}: ${tv.count.toLocaleString()}`).join(' • ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                {activeOverview.timestamp_range.available && (
                  <div className="bg-slate-50 p-2 rounded-md border border-slate-200 text-[11px] text-slate-600">
                    <p className="font-bold text-slate-800">Timestamp range <span className="text-slate-500 font-normal">({activeOverview.timestamp_range.column})</span></p>
                    <p className="text-slate-500 mt-0.5">{activeOverview.timestamp_range.start} → {activeOverview.timestamp_range.end}</p>
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* Analytics grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* 1. Congestion distribution */}
            <Section title="Congestion Level Distribution" icon={<BarChart3 className="w-4 h-4 text-indigo-600" />} subtitle="Historical label distribution across the dataset">
              {a.congestion_distribution?.available ? (
                <HBars
                  items={a.congestion_distribution.levels.map((lv: string) => ({
                    label: lv,
                    value: a.congestion_distribution.counts[lv] ?? 0,
                    display: `${(a.congestion_distribution.percentages[lv] ?? 0).toFixed(2)}% (${(a.congestion_distribution.counts[lv] ?? 0).toLocaleString()})`,
                    color: a.congestion_distribution.colors?.[lv] || LEVEL_COLOR[lv] || '#6366f1',
                  }))}
                />
              ) : <UnavailableCard reason={a.congestion_distribution?.reason || ''} />}
            </Section>

            {/* 2. Volume by hour */}
            <Section title="Traffic Volume by Hour" icon={<Clock className="w-4 h-4 text-indigo-600" />} subtitle="Historical average and peak volume per hour of day">
              {a.volume_by_hour?.available ? (
                <div>
                  <div className="grid gap-1 items-end h-40 bg-slate-50 p-3 rounded-md border border-slate-200" style={{ gridTemplateColumns: `repeat(${a.volume_by_hour.hours.length}, minmax(0,1fr))` }}>
                    {a.volume_by_hour.hours.map((h: number, i: number) => {
                      const maxV = Math.max(...a.volume_by_hour.avg_volume, 1);
                      const rush = [8, 9, 10, 17, 18, 19].includes(h);
                      return (
                        <div key={h} className="flex flex-col items-center gap-1 h-full justify-end">
                          <div
                            className={`w-full rounded-t ${rush ? 'bg-rose-500' : 'bg-indigo-500'}`}
                            style={{ height: `${Math.max(6, (a.volume_by_hour.avg_volume[i] / maxV) * 100)}%` }}
                            title={`${h}:00 — avg ${a.volume_by_hour.avg_volume[i]} veh/h (peak ${a.volume_by_hour.max_volume[i]})`}
                          />
                          <span className="text-[8px] text-slate-500 font-mono">{h % 2 === 0 ? h : ''}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5">Red bars mark typical commuter rush hours (08-10, 17-19).</p>
                </div>
              ) : <UnavailableCard reason={a.volume_by_hour?.reason || ''} />}
            </Section>

            {/* 3. Congestion by hour */}
            <Section title="Congestion by Hour" icon={<Activity className="w-4 h-4 text-indigo-600" />} subtitle="Share of each congestion level per hour (stacked)">
              {a.congestion_by_hour?.available ? (
                <div>
                  <div className="grid gap-1 items-end h-44 bg-slate-50 p-3 rounded-md border border-slate-200" style={{ gridTemplateColumns: `repeat(${a.congestion_by_hour.hours.length}, minmax(0,1fr))` }}>
                    {a.congestion_by_hour.hours.map((h: number, i: number) => (
                      <div key={h} className="flex flex-col justify-end h-full rounded-t overflow-hidden border border-slate-200" title={`${h}:00 — ` + a.congestion_by_hour.levels.map((lv: string) => `${lv} ${a.congestion_by_hour.shares[lv][i]}%`).join(', ')}>
                        {a.congestion_by_hour.levels.map((lv: string) => {
                          const share = a.congestion_by_hour.shares[lv][i] ?? 0;
                          if (share <= 0) return null;
                          return <div key={lv} style={{ height: `${share}%`, backgroundColor: a.congestion_by_hour.colors?.[lv] || LEVEL_COLOR[lv] || '#6366f1' }} />;
                        })}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-slate-600">
                    {a.congestion_by_hour.levels.map((lv: string) => (
                      <span key={lv} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: a.congestion_by_hour.colors?.[lv] || LEVEL_COLOR[lv] }} /> {lv}
                      </span>
                    ))}
                  </div>
                </div>
              ) : <UnavailableCard reason={a.congestion_by_hour?.reason || ''} />}
            </Section>

            {/* 4. Location-wise congestion */}
            <Section title="Location-wise Congestion" icon={<BarChart3 className="w-4 h-4 text-indigo-600" />} subtitle="Per-location historical congestion profile">
              {a.location_congestion?.available ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold">
                        <th className="py-2">Location</th>
                        <th className="py-2">Records</th>
                        {a.location_congestion.levels.map((lv: string) => (
                          <th key={lv} className="py-2">{lv} %</th>
                        ))}
                        <th className="py-2">Avg Vol</th>
                        <th className="py-2">Avg Speed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {a.location_congestion.locations.map((r: any) => (
                        <tr key={r.location} className="hover:bg-slate-50">
                          <td className="py-2 font-bold text-slate-900">{r.location}</td>
                          <td className="py-2 text-slate-500">{r.records.toLocaleString()}</td>
                          {a.location_congestion.levels.map((lv: string) => (
                            <td key={lv} className="py-2 font-semibold" style={{ color: a.congestion_distribution?.colors?.[lv] || LEVEL_COLOR[lv] }}>
                              {r[`${lv.toLowerCase()}_pct`]}%
                            </td>
                          ))}
                          <td className="py-2 text-indigo-600">{r.avg_volume ?? '—'}</td>
                          <td className="py-2 text-emerald-400">{r.avg_speed ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <UnavailableCard reason={a.location_congestion?.reason || ''} />}
            </Section>

            {/* 5. Weather vs Congestion */}
            <Section title="Weather vs Congestion" icon={<CloudRain className="w-4 h-4 text-indigo-600" />} subtitle="Historical high-congestion share by weather condition">
              {a.weather_congestion?.available ? (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold">
                      <th className="py-2">Weather</th><th className="py-2">Records</th><th className="py-2">High %</th><th className="py-2">Avg Speed</th><th className="py-2">Avg T/C</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {a.weather_congestion.rows.map((r: any) => (
                      <tr key={r.weather} className="hover:bg-slate-50">
                        <td className="py-2 font-bold text-slate-900">{r.weather}</td>
                        <td className="py-2 text-slate-500">{r.records.toLocaleString()}</td>
                        <td className="py-2 font-bold text-rose-400">{r.high_congestion_pct}%</td>
                        <td className="py-2 text-emerald-400">{r.avg_speed ?? '—'}</td>
                        <td className="py-2 text-amber-400">{r.avg_tcr ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <UnavailableCard reason={a.weather_congestion?.reason || ''} />}
            </Section>

            {/* 6. Road condition vs Congestion */}
            <Section title="Road Condition vs Congestion" icon={<AlertTriangle className="w-4 h-4 text-amber-400" />} subtitle="Historical impact of surface state on congestion">
              {a.road_condition_congestion?.available ? (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold">
                      <th className="py-2">Surface</th><th className="py-2">Records</th><th className="py-2">High %</th><th className="py-2">Avg Speed</th><th className="py-2">Avg T/C</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {a.road_condition_congestion.rows.map((r: any) => (
                      <tr key={r.road_condition} className="hover:bg-slate-50">
                        <td className="py-2 font-bold text-slate-900">{r.road_condition}</td>
                        <td className="py-2 text-slate-500">{r.records.toLocaleString()}</td>
                        <td className="py-2 font-bold text-rose-400">{r.high_congestion_pct}%</td>
                        <td className="py-2 text-emerald-400">{r.avg_speed ?? '—'}</td>
                        <td className="py-2 text-amber-400">{r.avg_tcr ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <UnavailableCard reason={a.road_condition_congestion?.reason || ''} />}
            </Section>

            {/* 7. Weekday vs Weekend */}
            <Section title="Weekday vs Weekend Congestion" icon={<Clock className="w-4 h-4 text-indigo-600" />} subtitle={a.weekday_weekend?.source ? `Weekend flag source: ${a.weekday_weekend.source}` : undefined}>
              {a.weekday_weekend?.available ? (
                <CompareCards rows={a.weekday_weekend.rows} metricKey="high_congestion_pct" label="High congestion" unit="% High" />
              ) : <UnavailableCard reason={a.weekday_weekend?.reason || ''} />}
            </Section>

            {/* 8. Accident vs Congestion */}
            <Section title="Accident vs Congestion" icon={<AlertTriangle className="w-4 h-4 text-rose-400" />} subtitle="Historical congestion when incidents were reported">
              {a.accident_congestion?.available ? (
                <CompareCards rows={a.accident_congestion.rows} metricKey="high_congestion_pct" label="High congestion" unit="% High" />
              ) : <UnavailableCard reason={a.accident_congestion?.reason || ''} />}
            </Section>

            {/* 9. Local event vs Congestion */}
            <Section title="Local Event vs Congestion" icon={<Activity className="w-4 h-4 text-amber-400" />} subtitle="Historical congestion around local events">
              {a.event_congestion?.available ? (
                <CompareCards rows={a.event_congestion.rows} metricKey="high_congestion_pct" label="High congestion" unit="% High" />
              ) : <UnavailableCard reason={a.event_congestion?.reason || ''} />}
            </Section>

            {/* 10. Heatmap */}
            <Section title="Hour × Location Congestion Heatmap" icon={<Table className="w-4 h-4 text-indigo-600" />} subtitle="Historical High-congestion share for every hour at every location" span="lg:col-span-2">
              {a.hour_location_heatmap?.available ? (
                <Heatmap data={a.hour_location_heatmap} />
              ) : <UnavailableCard reason={a.hour_location_heatmap?.reason || ''} />}
            </Section>

            {/* 11. Volume trend */}
            <Section title="Traffic Volume Trend" icon={<TrendingUp className="w-4 h-4 text-indigo-600" />} subtitle={`${a.volume_trend?.granularity || ''} — historical averages`}>
              {a.volume_trend?.available ? (
                <MiniLineChart values={a.volume_trend.values} color="#818cf8" />
              ) : <UnavailableCard reason={a.volume_trend?.reason || ''} />}
            </Section>

            {/* 12. Speed trend */}
            <Section title="Average Speed Trend" icon={<TrendingUp className="w-4 h-4 text-emerald-400" />} subtitle={`${a.speed_trend?.granularity || ''} — historical averages`}>
              {a.speed_trend?.available ? (
                <MiniLineChart values={a.speed_trend.values} color="#34d399" />
              ) : <UnavailableCard reason={a.speed_trend?.reason || ''} />}
            </Section>

            {/* 13. T/C analysis */}
            <Section title="Traffic-to-Capacity Analysis" icon={<TrendingUp className="w-4 h-4 text-amber-400" />} subtitle="Historical distribution of the volume/capacity ratio (bottleneck threshold 0.70)">
              {a.tcr_analysis?.available ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] uppercase text-slate-500">Avg T/C</span>
                      <p className="text-base font-bold text-amber-400">{a.tcr_analysis.avg_tcr}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] uppercase text-slate-500">Above 0.70</span>
                      <p className="text-base font-bold text-rose-400">{a.tcr_analysis.pct_above_0_7}%</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] uppercase text-slate-500">Above 0.85</span>
                      <p className="text-base font-bold text-purple-400">{a.tcr_analysis.pct_above_0_85}%</p>
                    </div>
                  </div>
                  <div className="grid items-end h-28 bg-slate-50 p-2 rounded-md border border-slate-200" style={{ gridTemplateColumns: `repeat(${a.tcr_analysis.histogram_labels.length}, minmax(0,1fr))` }}>
                    {a.tcr_analysis.histogram_counts.map((c: number, i: number) => {
                      const max = Math.max(...a.tcr_analysis.histogram_counts, 1);
                      return (
                        <div key={i} className="flex flex-col items-center justify-end h-full gap-1">
                          <div className="w-full rounded-t bg-amber-500/80" style={{ height: `${Math.max(4, (c / max) * 100)}%` }} title={`${a.tcr_analysis.histogram_labels[i]}: ${c.toLocaleString()} records`} />
                          {i % 2 === 0 && <span className="text-[8px] text-slate-500 font-mono">{a.tcr_analysis.histogram_labels[i]}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : <UnavailableCard reason={a.tcr_analysis?.reason || ''} />}
            </Section>

            {/* 14. Corridor comparison */}
            <Section title="Corridor Comparison" icon={<BarChart3 className="w-4 h-4 text-rose-400" />} subtitle="Locations ranked by historical High-congestion share">
              {a.corridor_comparison?.available ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border bg-rose-50 border-rose-200">
                      <p className="text-[10px] uppercase font-bold text-rose-400">Highest risk</p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">{a.corridor_comparison.highest_risk.location}</p>
                      <p className="text-[11px] text-slate-500">{a.corridor_comparison.highest_risk.high_pct}% High • {a.corridor_comparison.highest_risk.records.toLocaleString()} records</p>
                    </div>
                    <div className="p-3 rounded-lg border bg-emerald-50 border-emerald-200">
                      <p className="text-[10px] uppercase font-bold text-emerald-400">Lowest risk</p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">{a.corridor_comparison.lowest_risk.location}</p>
                      <p className="text-[11px] text-slate-500">{a.corridor_comparison.lowest_risk.high_pct}% High • {a.corridor_comparison.lowest_risk.records.toLocaleString()} records</p>
                    </div>
                  </div>
                  <div className="max-h-44 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <tbody className="divide-y divide-slate-100">
                        {a.corridor_comparison.ranking.map((r: any, i: number) => (
                          <tr key={r.location}>
                            <td className="py-1.5 text-slate-500 font-mono">#{i + 1}</td>
                            <td className="py-1.5 font-semibold text-slate-800">{r.location}</td>
                            <td className="py-1.5 text-right font-bold text-rose-400">{r.high_pct}% High</td>
                            <td className="py-1.5 text-right text-slate-500">{r.avg_tcr ?? '—'} T/C</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('traffic-map')}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-300 flex items-center gap-1"
                    >
                      View these corridors on the Traffic Map →
                    </button>
                  )}
                </div>
              ) : <UnavailableCard reason={a.corridor_comparison?.reason || ''} />}
            </Section>

            {/* 15. Numeric correlations */}
            <Section title="Numeric Correlations with Congestion" icon={<Activity className="w-4 h-4 text-indigo-600" />} subtitle={a.numeric_correlations?.note || 'Ordinal correlation — correlation is not causation.'}>
              {a.numeric_correlations?.available ? (
                <div className="space-y-1.5">
                  {a.numeric_correlations.rows.map((r: any) => (
                    <div key={r.column} className="flex items-center gap-2 text-xs">
                      <span className="w-44 truncate text-slate-600 font-medium" title={r.column}>{r.column}</span>
                      <div className="flex-1 h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-200 relative">
                        <div
                          className={`absolute top-0 h-full ${r.correlation >= 0 ? 'bg-rose-500 left-1/2' : 'bg-emerald-500 right-1/2'}`}
                          style={{ width: `${Math.min(50, Math.abs(r.correlation) * 50)}%` }}
                        />
                        <div className="absolute left-1/2 top-0 h-full w-px bg-slate-600" />
                      </div>
                      <span className={`w-14 text-right font-mono font-bold ${r.correlation >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{r.correlation.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : <UnavailableCard reason={a.numeric_correlations?.reason || ''} />}
            </Section>
          </div>

          {/* Preview & search */}
          <Section title="Dataset Preview & Search" icon={<Search className="w-4 h-4 text-indigo-600" />} subtitle="Search across all text columns of the loaded dataset">
            <form onSubmit={previewHandler} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={previewSearch}
                  onChange={(e) => setPreviewSearch(e.target.value)}
                  placeholder="e.g. MG Road, Rainy, Friday…"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm">
                {previewLoading ? 'Searching…' : 'Search'}
              </button>
            </form>
            {preview && (
              <>
                <p className="text-[11px] text-slate-500">
                  Showing {preview.returned} of <strong className="text-slate-800">{preview.matched_total.toLocaleString()}</strong> matching rows
                  {preview.matched_total !== preview.dataset_total && ` (dataset total ${preview.dataset_total.toLocaleString()})`}
                  {preview.truncated && ' — truncated preview'}
                </p>
                <div className="overflow-x-auto max-h-96 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-[11px]">
                    <thead className="sticky top-0 bg-slate-50">
                      <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold">
                        {preview.columns.map(c => <th key={c} className="py-2 px-2 whitespace-nowrap">{c}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {preview.rows.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          {row.map((v: any, j: number) => (
                            <td key={j} className="py-1.5 px-2 text-slate-600 whitespace-nowrap font-mono text-[10px]">{String(v)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Section>

          {/* Honesty notice */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500 space-y-1">
            <p className="font-semibold text-slate-600 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-600" />
              Data honesty:
            </p>
            <p>
              All analytics on this page are computed from the loaded CSV file ({upload ? upload.filename : 'data/traffic_processed.csv'}) and describe historical conditions in that file only.
              No real-time traffic feed is connected; nothing on this page should be read as live traffic.
              {isUpload && ' The uploaded file was analyzed in place — the default TRAFFIQ dataset remains the active dataset for the map, prediction, routing, and simulation features.'}
              {!isUpload && ' Use the Traffic Map tab for spatial intelligence of the verified dataset locations.'}
            </p>
          </div>
        </>
      )}
    </div>
  );
};
