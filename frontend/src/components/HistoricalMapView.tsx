import React, { useState } from 'react';
import { LocationItem, AnalyticsSummary } from '../services/api';
import { TrafficMap } from './TrafficMap';
import { PlaceSelection } from './PlaceSearch';
import { 
  Map as MapIcon, 
  Info
} from 'lucide-react';

interface HistoricalMapViewProps {
  locations: LocationItem[];
  summary: AnalyticsSummary | null;
  onRouteRequest?: (origin: PlaceSelection | null, destination: PlaceSelection | null) => void;
}

export const HistoricalMapView: React.FC<HistoricalMapViewProps> = ({ locations, summary, onRouteRequest }) => {
  const [selectedLocFilter, setSelectedLocFilter] = useState<string>('All');
  const [roadTypeFilter, setRoadTypeFilter] = useState<string>('All');

  // Filter locations if requested
  const filteredLocations = locations.filter((loc) => {
    if (selectedLocFilter !== 'All' && loc.Location_Name !== selectedLocFilter) return false;
    if (roadTypeFilter !== 'All' && loc.Road_Type !== roadTypeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600">
            <MapIcon className="w-5 h-5" />
          </div>
          <div>
          <h2 className="text-base font-semibold text-slate-900 tracking-tight">Level 1 — Historical Traffic Intelligence Map</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified OpenStreetMap geocoded locations with dataset throughput, speed, and congestion distributions. Search any real-world place above the map; dataset analytics appear only for monitored locations.
          </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Filter location:</span>
            <select
              value={selectedLocFilter}
              onChange={(e) => setSelectedLocFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            >
              <option value="All">All 7 Locations</option>
              {locations.map((l) => (
                <option key={l.Location_ID} value={l.Location_Name}>{l.Location_Name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Road type:</span>
            <select
              value={roadTypeFilter}
              onChange={(e) => setRoadTypeFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            >
              <option value="All">All Types</option>
              <option value="Urban">Urban Corridor</option>
              <option value="Highway">Highway Bypass</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Interactive Map */}
      <TrafficMap 
        locations={filteredLocations} 
        summary={summary} 
        onRouteRequest={onRouteRequest}
      />

      {/* Data Honesty Clarification Box */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-700 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-indigo-500" />
          Academic & Mapping Methodology Notice:
        </p>
        <p>
          Markers represent verified roadside sensor locations from the 50,000-row dataset in the Guntur – Vadlamudi – Vijayawada transit corridor. Consistent with data honesty principles, road segments between markers are not arbitrarily painted as congested without explicit segment-level sensor feeds.
        </p>
      </div>
    </div>
  );
};
