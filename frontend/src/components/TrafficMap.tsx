import React, { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { LocationItem, AnalyticsSummary, PredictionResult, api } from '../services/api';
import { PlaceSearch, PlaceSelection } from './PlaceSearch';
import { STATUS_META, btn, Spinner } from './ui';
import {
  Layers,
  MapPin,
  CheckCircle2,
  History,
  HelpCircle,
  Info,
  Navigation2,
  X
} from 'lucide-react';

interface TrafficMapProps {
  locations: LocationItem[];
  summary: AnalyticsSummary | null;
  onSelectLocation?: (locationName: string) => void;
  /** Fired when the user asks to route from/to a selected place (real-world search). */
  onRouteRequest?: (origin: PlaceSelection | null, destination: PlaceSelection | null) => void;
}

type VisMode = 'congestion' | 'volume' | 'speed' | 'tc_ratio';

export const TrafficMap: React.FC<TrafficMapProps> = ({ locations, summary, onSelectLocation, onRouteRequest }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  const [visMode, setVisMode] = useState<VisMode>('congestion');
  const [selectedLocation, setSelectedLocation] = useState<any | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [handoff, setHandoff] = useState<{ origin: PlaceSelection | null; destination: PlaceSelection | null }>({
    origin: null,
    destination: null,
  });
  const [mapReady, setMapReady] = useState(false);

  // Match locations with their analytics stats from summary
  const locationStatsMap = React.useMemo(() => {
    const map = new Map<string, any>();
    if (summary && summary.locations_comparison) {
      summary.locations_comparison.forEach((item) => {
        map.set(item.Location, item);
      });
    }
    return map;
  }, [summary]);

  const selectAndFocus = useCallback((loc: LocationItem) => {
    setSelectedLocation({ ...loc, external: false, stats: locationStatsMap.get(loc.Location_Name) });
    if (onSelectLocation) onSelectLocation(loc.Location_Name);
  }, [locationStatsMap, onSelectLocation]);

  // Any real-world place found via geocoding search (not necessarily in dataset)
  const selectExternalPlace = useCallback((place: PlaceSelection) => {
    setSelectedLocation({
      external: true,
      Location_ID: 'PLACE',
      Location_Name: place.displayName ? place.displayName.split(',').slice(0, 2).join(', ') : place.name,
      Latitude: place.lat,
      Longitude: place.lon,
      Road_Type: null,
      Lanes: null,
      Road_Capacity: null,
      Geocoding_Source: 'OpenStreetMap Nominatim',
      Geocoding_Status: 'ok',
      City: place.displayName ? place.displayName.split(',').slice(1, 3).join(', ') : undefined,
      stats: undefined,
    });
  }, []);

  // Center the map on the selected location (also covers programmatic search selection)
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedLocation) return;
    mapInstanceRef.current.flyTo(
      [selectedLocation.Latitude, selectedLocation.Longitude],
      Math.max(mapInstanceRef.current.getZoom(), 13),
      { duration: 0.8 }
    );
  }, [selectedLocation]);

  // Recalculate map size after layout changes (inspection panel opens/closes)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const t = window.setTimeout(() => mapInstanceRef.current?.invalidateSize(), 300);
    return () => window.clearTimeout(t);
  }, [selectedLocation]);

  // ML prediction ONLY for dataset locations (external places get no traffic data — honesty rule)
  useEffect(() => {
    if (!selectedLocation || selectedLocation.external) { setPrediction(null); return; }
    let cancelled = false;
    const now = new Date();
    setPrediction(null);
    api.predict({
      location: selectedLocation.Location_Name,
      hour: now.getHours(),
      day_of_week: (now.getDay() + 6) % 7,
      month: now.getMonth() + 1,
      weather: 'Clear',
      temperature: 31.0,
      visibility_km: 6.0,
      road_condition: 'Good',
      local_event: 0,
      is_holiday: 0,
      accident_reported: 0,
      aqi_level: 120,
      rainfall_mm: 0.0
    })
      .then(res => { if (!cancelled) setPrediction(res); })
      .catch(() => { if (!cancelled) setPrediction(null); });
    return () => { cancelled = true; };
  }, [selectedLocation]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Centered around Guntur - Vadlamudi - Vijayawada corridor (16.35° N, 80.52° E)
    const map = L.map(mapContainerRef.current, {
      center: [16.35, 80.52],
      zoom: 11,
      zoomControl: true,
    });

    // Standard OpenStreetMap raster tiles — free, no API key required (proper attribution kept)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Update dataset markers based on locations & visMode
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !markersRef.current || locations.length === 0) return;

    markersRef.current.clearLayers();

    locations.forEach((loc) => {
      const stats = locationStatsMap.get(loc.Location_Name);

      let badgeColor = '#10b981'; // Low
      let metricValue = '';

      if (visMode === 'congestion') {
        const highPct = stats ? stats.high_congestion_pct : 0;
        if (highPct > 15) {
          badgeColor = '#ef4444'; // High
        } else if (highPct > 8) {
          badgeColor = '#f59e0b'; // Medium
        }
        metricValue = stats ? `${stats.high_congestion_pct}% High` : 'Nominal';
      } else if (visMode === 'volume') {
        const vol = stats ? stats.avg_volume : 0;
        metricValue = stats ? `${Math.round(vol)} veh/h` : '—';
        badgeColor = vol > 380 ? '#ef4444' : vol > 320 ? '#f59e0b' : '#10b981';
      } else if (visMode === 'speed') {
        const spd = stats ? stats.avg_speed : 0;
        metricValue = stats ? `${spd.toFixed(1)} km/h` : '—';
        badgeColor = spd < 43 ? '#ef4444' : spd < 46 ? '#f59e0b' : '#10b981';
      } else if (visMode === 'tc_ratio') {
        const tc = stats ? stats.avg_tc_ratio : 0;
        metricValue = stats ? `T/C: ${tc.toFixed(2)}` : '—';
        badgeColor = tc > 0.35 ? '#ef4444' : tc > 0.2 ? '#f59e0b' : '#10b981';
      }

      // Custom HTML Marker Icon — compact label + dot
      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: pointer;">
            <div style="
              background-color: ${badgeColor};
              color: white;
              font-weight: 600;
              font-size: 10.5px;
              padding: 2px 7px;
              border-radius: 6px;
              box-shadow: 0 1px 4px rgba(0,0,0,0.35);
              border: 1px solid rgba(255,255,255,0.9);
              white-space: nowrap;
              letter-spacing: 0.2px;
            ">
              ${loc.Location_Name} · ${metricValue}
            </div>
            <div style="
              width: 12px;
              height: 12px;
              background-color: ${badgeColor};
              border-radius: 50%;
              border: 2px solid white;
              box-shadow: 0 1px 4px rgba(0,0,0,0.35);
              margin-top: -2px;
            "></div>
          </div>
        `,
        iconSize: [0, 0],
      });

      const marker = L.marker([loc.Latitude, loc.Longitude], { icon: customIcon });

      marker.on('click', () => {
        selectAndFocus(loc);
      });

      markersRef.current?.addLayer(marker);
    });

    // Auto-fit bounds around the dataset points
    const bounds = L.latLngBounds(locations.map(l => [l.Latitude, l.Longitude]));
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
  }, [locations, visMode, locationStatsMap, mapReady, selectAndFocus]);

  const routeFromSelection = (role: 'origin' | 'destination') => {
    if (!selectedLocation) return;
    const place: PlaceSelection = {
      name: selectedLocation.Location_Name,
      displayName: selectedLocation.Location_Name,
      lat: selectedLocation.Latitude,
      lon: selectedLocation.Longitude,
      inDataset: !selectedLocation.external,
    };
    const next = { ...handoff, [role]: place };
    setHandoff(next);
    if (onRouteRequest) onRouteRequest(next.origin, next.destination);
  };

  return (
    <div className="space-y-4">
      {/* Controls & Mode Switcher */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 flex flex-wrap items-center justify-between gap-3">
        {/* Real-world place search (any location via Nominatim) */}
        <div className="w-full sm:w-72">
          <PlaceSearch
            label=""
            compact
            placeholder="Search any place, road or city…"
            datasetLocations={locations}
            onSelect={selectExternalPlace}
          />
        </div>

        {/* Metric Modes */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            Layer:
          </span>
          <div className="flex bg-slate-100 p-0.5 rounded-md border border-slate-200">
            {([
              ['congestion', 'Congestion'],
              ['volume', 'Volume'],
              ['speed', 'Speed'],
              ['tc_ratio', 'T/C Ratio'],
            ] as const).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setVisMode(mode)}
                className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                  visMode === mode
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span>Low</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span><span>Medium</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span><span>High</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-600"></span><span>Critical (escalated)</span></div>
        </div>
      </div>

      {/* Main Map + Inspection Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Leaflet Container */}
        <div className={`rounded-lg overflow-hidden border border-slate-200 shadow-sm relative ${selectedLocation ? 'lg:col-span-8 h-[560px]' : 'lg:col-span-12 h-[600px]'}`}>
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Overlay Map Badge */}
          <div className="absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur-sm border border-slate-200 px-3 py-1.5 rounded-md text-xs shadow-sm pointer-events-none">
            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-500" />
              Monitored Corridor — Guntur · Vadlamudi · Vijayawada
            </p>
            <p className="text-slate-500 text-[11px]">Markers = dataset sensor locations (historical data)</p>
          </div>
        </div>

        {/* Selected Location Inspection Panel */}
        {selectedLocation && (
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg shadow-sm p-4 space-y-4 self-start">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                  {selectedLocation.external
                    ? 'OpenStreetMap place'
                    : `${selectedLocation.Location_ID} · ${selectedLocation.Road_Type}`}
                </span>
                <h3 className="text-base font-semibold text-slate-900 mt-0.5 truncate">
                  {selectedLocation.Location_Name}
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  {selectedLocation.external
                    ? (selectedLocation.City || 'Real-world location')
                    : `${selectedLocation.City || 'Guntur District'}, AP`}
                </p>
              </div>
              <button
                onClick={() => setSelectedLocation(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100"
                aria-label="Close panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* HONESTY BANNER for real-world places without dataset coverage */}
            {selectedLocation.external && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">
                  No TRAFFIQ historical traffic data available for this location.
                </p>
              </div>
            )}

            {/* Historical metrics — only for dataset locations */}
            {!selectedLocation.external && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                  <History className="w-3 h-3" />
                  Historical — computed from the 50,000-row dataset
                </p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wide">Hist. Volume</span>
                    <p className="text-base font-semibold text-slate-900 mt-0.5">
                      {selectedLocation.stats ? `${Math.round(selectedLocation.stats.avg_volume)} veh/h` : '—'}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wide">Hist. Avg Speed</span>
                    <p className="text-base font-semibold text-slate-900 mt-0.5">
                      {selectedLocation.stats ? `${selectedLocation.stats.avg_speed.toFixed(1)} km/h` : '—'}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wide">Hist. T/C Ratio</span>
                    <p className="text-base font-semibold text-slate-900 mt-0.5">
                      {selectedLocation.stats ? selectedLocation.stats.avg_tc_ratio.toFixed(2) : '—'}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wide">Road Capacity</span>
                    <p className="text-base font-semibold text-slate-900 mt-0.5">
                      {selectedLocation.Road_Capacity} veh/h ({selectedLocation.Lanes}L)
                    </p>
                  </div>
                </div>

                {/* Congestion Level Distribution */}
                {selectedLocation.stats && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs text-slate-600 font-medium">
                      <span>Congestion profile</span>
                      <span className="text-slate-400">{selectedLocation.stats.records.toLocaleString()} records</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                      <div style={{ width: `${selectedLocation.stats.low_congestion_pct}%` }} className="bg-emerald-500 h-full" title={`Low: ${selectedLocation.stats.low_congestion_pct}%`} />
                      <div style={{ width: `${selectedLocation.stats.medium_congestion_pct}%` }} className="bg-amber-500 h-full" title={`Medium: ${selectedLocation.stats.medium_congestion_pct}%`} />
                      <div style={{ width: `${selectedLocation.stats.high_congestion_pct}%` }} className="bg-rose-500 h-full" title={`High: ${selectedLocation.stats.high_congestion_pct}%`} />
                    </div>
                    <div className="flex justify-between text-[11px] pt-0.5">
                      <span className="text-emerald-600">Low {selectedLocation.stats.low_congestion_pct}%</span>
                      <span className="text-amber-600">Med {selectedLocation.stats.medium_congestion_pct}%</span>
                      <span className="text-rose-600">High {selectedLocation.stats.high_congestion_pct}%</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ML Prediction — model output for dataset locations only, clearly separated */}
            {!selectedLocation.external && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                  <HelpCircle className="w-3 h-3" />
                  ML prediction — current hour, normal conditions
                </p>
                {prediction ? (
                  <>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${STATUS_META[prediction.prediction]?.badge || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {prediction.prediction}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        confidence {(prediction.confidence * 100).toFixed(1)}% · base class {prediction.base_ml_prediction}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Model inference for {new Date().getHours()}:00 today (Clear, no incidents) — not a live traffic measurement.
                    </p>
                    <div className="bg-slate-50 p-2 rounded-md border border-slate-200 space-y-1">
                      <p className="text-[10px] font-semibold text-slate-700 flex items-center gap-1.5">
                        <HelpCircle className="w-3 h-3 text-indigo-500" />
                        Why this prediction?
                      </p>
                      {prediction.explainability.top_factors.slice(0, 3).map((f, i) => (
                        <p key={i} className="text-[10px] text-slate-600">
                          <span className="font-medium text-slate-800">{f.factor}</span> (+{f.importance_pct.toFixed(1)}% weight) — {f.description}
                        </p>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                        <span className="text-[8px] uppercase text-slate-500">Pred. Volume</span>
                        <p className="text-[11px] font-semibold text-slate-900">{Math.round(prediction.estimated_metrics.estimated_volume_veh_hr)}</p>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                        <span className="text-[8px] uppercase text-slate-500">Pred. Speed</span>
                        <p className="text-[11px] font-semibold text-slate-900">{prediction.estimated_metrics.estimated_speed_kmph}</p>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                        <span className="text-[8px] uppercase text-slate-500">Pred. T/C</span>
                        <p className="text-[11px] font-semibold text-slate-900">{prediction.estimated_metrics.estimated_tc_ratio}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                    <Spinner className="w-3 h-3" /> Generating model prediction…
                  </p>
                )}
              </div>
            )}

            {/* Geocoding provenance */}
            <div className="p-2.5 bg-slate-50 rounded-md border border-slate-200 space-y-0.5 text-xs">
              <p className="text-slate-600 font-medium flex items-center gap-1.5">
                {selectedLocation.external ? <MapPin className="w-3.5 h-3.5 text-indigo-500" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                Coordinates:
              </p>
              <p className="text-[11px] text-slate-700 font-mono">
                {selectedLocation.Latitude.toFixed(6)}, {selectedLocation.Longitude.toFixed(6)}
              </p>
              <p className="text-[11px] text-slate-500">
                Source: {selectedLocation.Geocoding_Source}
                {selectedLocation.Geocoding_Status ? ` (${selectedLocation.Geocoding_Status})` : ''}
              </p>
            </div>

            {/* Route handoff: use this place as origin/destination in Route Intelligence */}
            <div className="pt-1 border-t border-slate-100 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                <Navigation2 className="w-3 h-3" />
                Use in Route Intelligence
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button className={btn.secondary} onClick={() => routeFromSelection('origin')}>
                  As origin
                </button>
                <button className={btn.secondary} onClick={() => routeFromSelection('destination')}>
                  As destination
                </button>
              </div>
              {(handoff.origin || handoff.destination) && (
                <p className="text-[10px] text-slate-500">
                  {handoff.origin && <span>Origin: {handoff.origin.name}. </span>}
                  {handoff.destination && <span>Destination: {handoff.destination.name}.</span>}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
