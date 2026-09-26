import React from 'react';

/**
 * Shared, restrained UI primitives for TRAFFIQ.
 * Intent: one consistent visual language — subtle borders, one shadow level,
 * no glow/gradient decoration, semantic traffic colors used only for status.
 */

export const STATUS_META: Record<string, { label: string; dot: string; badge: string; text: string }> = {
  LOW: {
    label: 'Low',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'text-emerald-600',
  },
  MEDIUM: {
    label: 'Medium',
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    text: 'text-amber-600',
  },
  HIGH: {
    label: 'High',
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    text: 'text-rose-600',
  },
  CRITICAL: {
    label: 'Critical',
    dot: 'bg-purple-600',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'text-purple-700',
  },
};

export const statusBadgeClass = (level?: string | null): string => {
  if (!level) return 'bg-slate-100 text-slate-600 border-slate-200';
  return STATUS_META[level.toUpperCase()]?.badge || 'bg-slate-100 text-slate-600 border-slate-200';
};

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...rest }) => (
  <div
    className={`bg-white border border-slate-200 rounded-lg shadow-sm ${className}`}
    {...rest}
  >
    {children}
  </div>
);

export const CardHeader: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode; icon?: React.ReactNode }> =
  ({ title, subtitle, action, icon }) => (
    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-slate-100">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          {icon}
          {title}
        </h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );

export const btn = {
  primary:
    'inline-flex items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm',
  secondary:
    'inline-flex items-center justify-center gap-1.5 rounded-md bg-white px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm',
  ghost:
    'inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors',
};

export const inputCls =
  'w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-shadow';

export const selectCls = inputCls;

export const labelCls = 'block text-xs font-medium text-slate-600 mb-1';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} />
);

export const Spinner: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; detail?: string; action?: React.ReactNode }> =
  ({ icon, title, detail, action }) => (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      {icon && (
        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
          {icon}
        </div>
      )}
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      {detail && <p className="text-xs text-slate-500 mt-1 max-w-sm">{detail}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
