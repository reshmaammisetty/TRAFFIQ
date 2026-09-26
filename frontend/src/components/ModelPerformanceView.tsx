import React, { useEffect, useState } from 'react';
import { ModelPerformance, api } from '../services/api';
import {
  Target, RefreshCw, ShieldCheck, Info, BarChart3, CheckCircle2
} from 'lucide-react';

const CLASS_COLOR: Record<string, string> = {
  High: '#ef4444', Low: '#10b981', Medium: '#f59e0b', Critical: '#9333ea'
};

export const ModelPerformanceView: React.FC = () => {
  const [perf, setPerf] = useState<ModelPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setPerf(await api.getModelPerformance());
    } catch (err: any) {
      setError(err.message || 'Failed to load model performance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-3 text-slate-500">
        <RefreshCw className="w-7 h-7 animate-spin text-indigo-500" />
        <p className="text-sm">Loading model evaluation artifacts…</p>
      </div>
    );
  }

  if (error || !perf) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">{error || 'No data'}</div>
    );
  }

  const pct = (v: number | null | undefined) => (v == null ? '—' : `${(v * 100).toFixed(2)}%`);
  const maxImp = Math.max(1, ...perf.feature_importance.map(f => f.percentage));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Model Performance</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Evaluation of the deployed leakage-free classifier on a held-out split of the supplied dataset.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-700">
          <Info className="w-4 h-4 text-indigo-600" />
          <span>{perf.data_nature}</span>
        </div>
      </div>

      {/* Data basis notice */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
        <p>{perf.data_basis_notice}</p>
      </div>

      {/* Model comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(perf.models).map(([name, m]) => (
          <div key={name} className={`bg-slate-900 border rounded-lg p-5 shadow-sm space-y-3 ${m.selected ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                {name}
              </h3>
              {m.selected && (
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Deployed (best weighted F1)
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200">
                <span className="text-[10px] uppercase text-slate-500">Accuracy</span>
                <p className="text-base font-bold text-slate-900 mt-0.5">{pct(m.accuracy)}</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200">
                <span className="text-[10px] uppercase text-slate-500">Weighted F1</span>
                <p className="text-base font-bold text-indigo-600 mt-0.5">{pct(m.weighted_f1)}</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200">
                <span className="text-[10px] uppercase text-slate-500">Macro F1</span>
                <p className="text-base font-bold text-amber-600 mt-0.5">{pct(m.macro_f1)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Overall metrics + per-class */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">Overall Metrics ({perf.best_model})</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['Accuracy', pct(perf.overall.accuracy)],
                ['Precision (weighted)', pct(perf.overall.precision_weighted)],
                ['Precision (macro)', pct(perf.overall.precision_macro)],
                ['Recall (weighted)', pct(perf.overall.recall_weighted)],
                ['Recall (macro)', pct(perf.overall.recall_macro)],
                ['F1 (weighted)', pct(perf.overall.f1_weighted)],
                ['F1 (macro)', pct(perf.overall.f1_macro)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-bold text-slate-900">{value}</span>
                </div>
              ))}
              <div className="flex justify-between bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5">
                <span className="text-slate-500">Test split</span>
                <span className="font-bold text-slate-900">{perf.test_split.size.toLocaleString()} rows ({(perf.test_split.fraction * 100).toFixed(0)}% {perf.test_split.strategy})</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">Per-Class Metrics</h3>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <th className="py-2">Class</th><th className="py-2">Precision</th><th className="py-2">Recall</th><th className="py-2">F1</th><th className="py-2">Support</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(perf.per_class).map(([cls, m]) => (
                  <tr key={cls}>
                    <td className="py-2 font-bold" style={{ color: CLASS_COLOR[cls] || '#e2e8f0' }}>{cls}</td>
                    <td className="py-2 text-slate-600">{(m.precision * 100).toFixed(2)}%</td>
                    <td className="py-2 text-slate-600">{(m.recall * 100).toFixed(2)}%</td>
                    <td className="py-2 text-slate-600">{(m.f1_score * 100).toFixed(2)}%</td>
                    <td className="py-2 text-slate-500">{m.support.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Confusion matrix + feature importance */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">Confusion Matrix <span className="text-[10px] text-slate-500 font-normal">(rows = actual, columns = predicted)</span></h3>
            <div className="overflow-x-auto">
              <table className="text-xs">
                <thead>
                  <tr>
                    <th className="p-2" />
                    {perf.confusion_matrix.labels.map(l => (
                      <th key={l} className="p-2 text-center font-bold" style={{ color: CLASS_COLOR[l] || '#e2e8f0' }}>pred {l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {perf.confusion_matrix.labels.map((rowLabel, i) => (
                    <tr key={rowLabel}>
                      <td className="p-2 font-bold text-right whitespace-nowrap" style={{ color: CLASS_COLOR[rowLabel] || '#e2e8f0' }}>actual {rowLabel}</td>
                      {perf.confusion_matrix.matrix[i].map((v, j) => {
                        const rowTotal = perf.confusion_matrix.matrix[i].reduce((s, x) => s + x, 0) || 1;
                        const intensity = v / rowTotal;
                        const correct = i === j;
                        return (
                          <td key={j} className="p-1">
                            <div
                              className="h-14 min-w-[74px] rounded-lg border flex flex-col items-center justify-center"
                              style={{
                                backgroundColor: correct ? `rgba(16,185,129,${0.15 + intensity * 0.6})` : (v > 0 ? `rgba(239,68,68,${0.15 + intensity * 0.5})` : 'rgba(15,23,42,0.8)'),
                                borderColor: correct ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.35)'
                              }}
                              title={`${v.toLocaleString()} records: actual ${rowLabel}, predicted ${perf.confusion_matrix.labels[j]}`}
                            >
                              <span className="text-sm font-bold text-slate-900">{v.toLocaleString()}</span>
                              <span className="text-[9px] text-slate-600">{((v / rowTotal) * 100).toFixed(1)}% of row</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">Feature Importance (RandomForest, aggregated to raw features)</h3>
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {perf.feature_importance.map(f => (
                <div key={f.feature} className="flex items-center gap-2 text-xs">
                  <span className="w-48 truncate text-slate-600 font-medium" title={f.feature}>{f.feature}</span>
                  <div className="flex-1 h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-200">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(f.percentage / maxImp) * 100}%` }} />
                  </div>
                  <span className="w-12 text-right font-mono font-bold text-indigo-600">{f.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Leakage prevention */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-2">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Target-Leakage Prevention
        </h3>
        <div className="flex flex-wrap gap-2">
          {perf.leakage_prevention.excluded_features.map(f => (
            <span key={f} className="text-[11px] font-mono px-2 py-1 rounded bg-rose-50 text-rose-600 border border-rose-200 line-through">{f}</span>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">{perf.leakage_prevention.explanation}</p>
        <p className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          The prediction feature uses only pre-trip inputs; lag features fall back to per-location historical medians when not supplied.
        </p>
      </div>
    </div>
  );
};
