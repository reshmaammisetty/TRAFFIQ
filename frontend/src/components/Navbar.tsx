import React from 'react';
import {
  Activity,
  Map as MapIcon,
  BarChart3,
  Cpu,
  Navigation2,
  Sliders,
  ShieldCheck,
  FileText,
  Target
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'command-center', label: 'Command Center', icon: Activity },
    { id: 'dataset-analytics', label: 'Dataset & Analytics', icon: FileText },
    { id: 'traffic-map', label: 'Traffic Map', icon: MapIcon },
    { id: 'prediction', label: 'Congestion Prediction', icon: Cpu },
    { id: 'model-performance', label: 'Model Performance', icon: Target },
    { id: 'route-intelligence', label: 'Route Intelligence', icon: Navigation2 },
    { id: 'simulation', label: 'What-If Simulation', icon: Sliders },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('command-center')}>
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-slate-900 shadow-sm">
              <span className="text-base font-bold text-white tracking-tight">T</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold tracking-tight text-slate-900">TRAFFIQ</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  DataQuest 2026
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block leading-tight">
                Smart Traffic Intelligence &amp; Route Analytics
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Provenance badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>50,000 records · historical</span>
          </div>
        </div>
      </div>

      {/* Mobile Bar */}
      <div className="md:hidden flex overflow-x-auto px-2 py-1.5 gap-1 border-t border-slate-100 bg-white">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs whitespace-nowrap font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
