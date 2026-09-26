import React, { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { LocationItem, RouteIntelligenceResult, api } from '../services/api';
import { PlaceSearch, PlaceSelection } from './PlaceSearch';
import { STATUS_META, btn, Card, CardHeader, inputCls, selectCls, labelCls, Spinner } from './ui';
import {
  Navigation2,
  MapPin,
  Clock,
  Calendar,
  ShieldAlert,
  CheckCircle2,
  Compass,
  ShieldCheck,
  Info,
  Car,
  Bike,
  Footprints,
  Gauge
} from 'lucide-react';

interface RouteIntelligenceViewProps {
  locations: LocationItem[];
  /** Pre-filled origin/destination coming from the Traffic Map handoff. */
  initialOrigin?: PlaceSelection | null;
  initialDestination?: PlaceSelection | null;
}

type OriginMode = 'dataset' | 'place';
type DestMode = 'dataset' | 'place';

const VEHICLES = [
  { id: 'car', label: 'Car', icon: Car },
  { id: 'bike', label: 'Bike / Motorcycle', icon: Bike },
  { id: 'bicycle', label: 'Bicycle', icon: Bike },
  { id: 'walking', label: 'Walking', icon: Footprints },
] as const;

type VehicleId = (typeof VEHICLES)[number]['id'];

/** Unified map-drawing model shared by both analysis paths */
interface DrawRoute {
  oName: string; oLat: number; oLon: number;
  dName: string; dLat: number; dLon: number;
  distanceKm: number; durationMin: number;
  coords: [number, number][];
  originDataset: boolean;
  destDataset: boolean;
  /** ML departure prediction — only present for dataset-dataset routes */
  originPred?: string;
}

export const RouteIntelligenceView: React.FC<RouteIntelligenceViewProps> = ({ locations, initialOrigin, initialDestination }) => {
  const [originMode, setOriginMode] = useState<OriginMode>(initialOrigin ? 'place' : 'dataset');
  const [destMode, setDestMode] = useState<DestMode>(initialDestination ? 'place' : 'dataset');
  const [origin, setOrigin] = useState<string>(locations[0]?.Location_Name || 'Vignan University Gate');
  const [destination, setDestination] = useState<string>(locations[1]?.Location_Name || 'City Center');
  const [placeO, setPlaceO] = useState<PlaceSelection | null>(initialOrigin || null);
  const [placeD, setPlaceD] = useState<PlaceSelection | null>(initialDestination || null);

  const [hour, setHour] = useState<number>(18);
  const [dayOfWeek, setDayOfWeek] = useState<number>(2); // Wednesday (backend default)
  const [weather, setWeather] = useState<string>('Clear');
  const [roadCondition, setRoadCondition] = useState<string>('Good');
  const [accidentReported, setAccidentReported] = useState<number>(0);

  // Travel-mode context (UI layer only — OSRM routing runs on the car profile)
  const [vehicle, setVehicle] = useState<VehicleId>('car');
  const [speedInput, setSpeedInput] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [intel, setIntel] = useState<RouteIntelligenceResult | null>(null); // dataset-dataset path (unchanged backend logic)
  const [draw, setDraw] = useState<DrawRoute | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const initialRunRef = useRef(false);

  const handleAnalyze = useCallback(async () => {
    const oName = originMode === 'place' ? placeO?.name : origin;
    const dName = destMode === 'place' ? placeD?.name : destination;
    if (!oName || !dName) { setError('Select both an origin and a destination first.'); return; }
    if (oName === dName) {
      setError('Origin and destination cannot be identical. Please select distinct locations.');
      return;
    }

    // Resolve endpoint coordinates: selected places use geocoded coords, dataset picks use master coords
    const resolvePoint = (mode: OriginMode | DestMode, place: PlaceSelection | null, datasetName: string) => {
      if (mode === 'place') {
        if (!place) return null;
        const shortName = place.displayName ? place.displayName.split(',').slice(0, 2).join(', ') : place.name;
        return { name: shortName, lat: place.lat, lon: place.lon, inDataset: place.inDataset };
      }
      const loc = locations.find(l => l.Location_Name === datasetName);
      return loc ? { name: loc.Location_Name, lat: loc.Latitude, lon: loc.Longitude, inDataset: true } : null;
    };

    const pO = resolvePoint(originMode, placeO, origin);
    const pD = resolvePoint(destMode, placeD, destination);
    if (!pO || !pD) { setError('Resolve both endpoints before analyzing.'); return; }

    setLoading(true);
    setError(null);

    try {
      if (!pO.inDataset || !pD.inDataset) {
        // Real-world place involved → coordinate-based OSRM routing (same engine, no ML claims for places)
        const res = await api.getRouteByPoints(
          { lat: pO.lat, lon: pO.lon, name: pO.name },
          { lat: pD.lat, lon: pD.lon, name: pD.name }
        );
        setIntel(null);
        setDraw({
          oName: res.origin.name, oLat: res.origin.lat, oLon: res.origin.lon,
          dName: res.destination.name, dLat: res.destination.lat, dLon: res.destination.lon,
          distanceKm: res.distance_km, durationMin: res.duration_min,
          coords: res.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]),
          originDataset: pO.inDataset, destDataset: pD.inDataset,
        });
      } else {
        // Existing dataset-dataset path — backend Route Intelligence logic unchanged
        const payload = {
          origin: pO.name,
          destination: pD.name,
          hour: Number(hour),
          day_of_week: Number(dayOfWeek),
          weather,
          road_condition: roadCondition,
          accident_reported: Number(accidentReported)
        };
        const res = await api.getRouteIntelligence(payload);
        setIntel(res);
        setDraw({
          oName: res.route.origin.name, oLat: res.route.origin.lat, oLon: res.route.origin.lon,
          dName: res.route.destination.name, dLat: res.route.destination.lat, dLon: res.route.destination.lon,
          distanceKm: res.route.distance_km, durationMin: res.route.estimated_duration_min,
          coords: res.route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]),
          originDataset: true, destDataset: true,
          originPred: res.origin_intelligence.departure_ml_prediction,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve route intelligence');
    } finally {
      setLoading(false);
    }
  }, [originMode, placeO, origin, destMode, placeD, destination, locations, hour, dayOfWeek, weather, roadCondition, accidentReported]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [16.27, 80.50],
      zoom: 12,
      zoomControl: true,
    });

    // Standard OpenStreetMap raster tiles — free, no API key required (proper attribution kept)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    routeLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Trigger initial route analysis once on mount
  useEffect(() => {
    if (initialRunRef.current) return;
    initialRunRef.current = true;
    handleAnalyze();
  }, [handleAnalyze]);

  // Redraw route on map whenever a route is available
  useEffect(() => {
    if (!mapInstanceRef.current || !routeLayerRef.current || !draw) return;

    routeLayerRef.current.clearLayers();

    const originIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center;">
          <div style="background: #059669; color: white; font-weight: 600; font-size: 10.5px; padding: 2px 7px; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.9); white-space: nowrap;">
            START · ${draw.oName}
          </div>
          <div style="width: 12px; height: 12px; background: #059669; border: 2px solid white; border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.35);"></div>
        </div>
      `,
      iconSize: [0, 0]
    });
    L.marker([draw.oLat, draw.oLon], { icon: originIcon }).addTo(routeLayerRef.current);

    const destIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center;">
          <div style="background: #e11d48; color: white; font-weight: 600; font-size: 10.5px; padding: 2px 7px; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.9); white-space: nowrap;">
            DEST · ${draw.dName}
          </div>
          <div style="width: 12px; height: 12px; background: #e11d48; border: 2px solid white; border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.35);"></div>
        </div>
      `,
      iconSize: [0, 0]
    });
    L.marker([draw.dLat, draw.dLon], { icon: destIcon }).addTo(routeLayerRef.current);

    // Dataset-dataset routes keep ML-prediction coloring; routes touching real-world
    // places stay neutral blue — OSRM geometry implies no congestion level.
    const routeColor = draw.originPred
      ? (draw.originPred === 'CRITICAL' ? '#9333ea'
        : draw.originPred === 'HIGH' ? '#e11d48'
        : draw.originPred === 'MEDIUM' ? '#f59e0b' : '#10b981')
      : '#2563eb';

    const polyline = L.polyline(draw.coords, {
      color: routeColor,
      weight: 5,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(routeLayerRef.current);

    mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [50, 50] });
  }, [draw]);

  const getBadgeClass = (pred: string) => STATUS_META[pred]?.badge || 'bg-slate-100 text-slate-600 border-slate-200';

  // Travel-mode simulation estimate (user-entered speed; routing stays OSRM car profile)
  const speedNum = parseFloat(speedInput);
  const simDurationMin = draw && !isNaN(speedNum) && speedNum > 0
    ? Math.round((draw.distanceKm / speedNum) * 60)
    : null;
  const VehicleIcon = VEHICLES.find(v => v.id === vehicle)?.icon || Car;

  const EndpointHonesty = ({ name, inDataset }: { name: string; inDataset: boolean }) =>
    inDataset ? null : (
      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-[11px] text-amber-800">
          <span className="font-semibold">{name}</span> — no TRAFFIQ historical traffic data available for this location.
        </p>
      </div>
    );

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Dataset-Informed Route Intelligence</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Real OpenStreetMap road geometry via OSRM, with historical baselines &amp; ML inference for monitored endpoints.
            </p>
          </div>
        </div>

        {/* Data honesty pill */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>OSRM routing &amp; duration — no live congestion claimed</span>
        </div>
      </Card>

      {/* Query Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {/* Origin */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls + ' !mb-0 flex items-center gap-1'}>
                <MapPin className="w-3 h-3 text-emerald-600" />
                From (Origin)
              </label>
              <div className="flex bg-slate-100 rounded p-0.5 border border-slate-200">
                <button onClick={() => setOriginMode('dataset')} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${originMode === 'dataset' ? 'bg-white shadow-sm border border-slate-200 text-slate-900' : 'text-slate-500'}`}>Dataset</button>
                <button onClick={() => setOriginMode('place')} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${originMode === 'place' ? 'bg-white shadow-sm border border-slate-200 text-slate-900' : 'text-slate-500'}`}>Any place</button>
              </div>
            </div>
            {originMode === 'dataset' ? (
              <select value={origin} onChange={(e) => setOrigin(e.target.value)} className={selectCls}>
                {locations.map((l) => (
                  <option key={l.Location_ID} value={l.Location_Name}>{l.Location_Name}</option>
                ))}
              </select>
            ) : (
              <PlaceSearch
                label=""
                compact
                placeholder="e.g. Charminar, Hyderabad…"
                datasetLocations={locations}
                onSelect={setPlaceO}
                initialQuery={placeO ? (placeO.displayName ? placeO.displayName.split(',').slice(0, 2).join(', ') : placeO.name) : ''}
              />
            )}
          </div>

          {/* Destination */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls + ' !mb-0 flex items-center gap-1'}>
                <MapPin className="w-3 h-3 text-rose-500" />
                To (Destination)
              </label>
              <div className="flex bg-slate-100 rounded p-0.5 border border-slate-200">
                <button onClick={() => setDestMode('dataset')} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${destMode === 'dataset' ? 'bg-white shadow-sm border border-slate-200 text-slate-900' : 'text-slate-500'}`}>Dataset</button>
                <button onClick={() => setDestMode('place')} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${destMode === 'place' ? 'bg-white shadow-sm border border-slate-200 text-slate-900' : 'text-slate-500'}`}>Any place</button>
              </div>
            </div>
            {destMode === 'dataset' ? (
              <select value={destination} onChange={(e) => setDestination(e.target.value)} className={selectCls}>
                {locations.map((l) => (
                  <option key={l.Location_ID} value={l.Location_Name}>{l.Location_Name}</option>
                ))}
              </select>
            ) : (
              <PlaceSearch
                label=""
                compact
                placeholder="e.g. Vijayawada…"
                datasetLocations={locations}
                onSelect={setPlaceD}
                initialQuery={placeD ? (placeD.displayName ? placeD.displayName.split(',').slice(0, 2).join(', ') : placeD.name) : ''}
              />
            )}
          </div>

          {/* Departure hour */}
          <div>
            <label className={labelCls + ' flex items-center gap-1'}>
              <Clock className="w-3 h-3 text-slate-400" />
              Departure time · {hour}:00
            </label>
            <select value={hour} onChange={(e) => setHour(Number(e.target.value))} className={selectCls}>
              <option value={8}>08:00 AM (Morning rush)</option>
              <option value={12}>12:00 PM (Midday)</option>
              <option value={17}>05:00 PM (Early evening)</option>
              <option value={18}>06:00 PM (Evening rush)</option>
              <option value={21}>09:00 PM (Night free flow)</option>
            </select>
          </div>

          {/* Day of week */}
          <div>
            <label className={labelCls + ' flex items-center gap-1'}>
              <Calendar className="w-3 h-3 text-slate-400" />
              Day of week
            </label>
            <select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))} className={selectCls}>
              <option value={0}>Monday (Weekday)</option>
              <option value={1}>Tuesday (Weekday)</option>
              <option value={2}>Wednesday (Weekday)</option>
              <option value={3}>Thursday (Weekday)</option>
              <option value={4}>Friday (Weekday)</option>
              <option value={5}>Saturday (Weekend)</option>
              <option value={6}>Sunday (Weekend)</option>
            </select>
          </div>

          {/* Weather */}
          <div>
            <label className={labelCls}>Weather condition</label>
            <select value={weather} onChange={(e) => setWeather(e.target.value)} className={selectCls}>
              <option value="Clear">Clear</option>
              <option value="Rainy">Rainy</option>
              <option value="Heavy Rain">Heavy Rain</option>
            </select>
          </div>

          {/* Road condition */}
          <div>
            <label className={labelCls}>Road condition</label>
            <select value={roadCondition} onChange={(e) => setRoadCondition(e.target.value)} className={selectCls}>
              <option value="Good">Good</option>
              <option value="Construction">Construction</option>
              <option value="Waterlogging">Waterlogging</option>
              <option value="Potholes">Potholes</option>
            </select>
          </div>

          {/* Incident toggle */}
          <div className="flex items-end">
            <label className={`flex items-center justify-between gap-2 w-full px-2.5 py-2 rounded-md border cursor-pointer transition-colors ${
              accidentReported === 1
                ? 'bg-rose-50 border-rose-300 text-rose-700'
                : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'
            }`}>
              <span className="text-xs font-medium flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                Accident reported
              </span>
              <input
                type="checkbox"
                checked={accidentReported === 1}
                onChange={(e) => setAccidentReported(e.target.checked ? 1 : 0)}
                className="rounded accent-rose-600"
              />
            </label>
          </div>

          {/* Submit */}
          <div className="flex items-end">
            <button onClick={handleAnalyze} disabled={loading} className={btn.primary + ' w-full py-2'}>
              {loading ? <Spinner className="w-3.5 h-3.5" /> : <Navigation2 className="w-3.5 h-3.5" />}
              <span>{loading ? 'Analyzing…' : 'Analyze Route'}</span>
            </button>
          </div>
        </div>

        {/* Travel-mode context: vehicle + user-entered speed (simulation inputs only) */}
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={labelCls + ' flex items-center gap-1'}>
              <VehicleIcon className="w-3 h-3 text-slate-400" />
              Travel mode
              <span className="text-[10px] font-normal text-slate-400">(travel-mode context)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {VEHICLES.map(v => {
                const VIcon = v.icon;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVehicle(v.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      vehicle === v.id
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                        : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <VIcon className="w-3.5 h-3.5" />
                    {v.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Routing always uses the OSRM car profile — mode is recorded as trip context, not a different road network.
            </p>
          </div>

          <div>
            <label className={labelCls + ' flex items-center gap-1'}>
              <Gauge className="w-3 h-3 text-slate-400" />
              User-entered speed
              <span className="text-[10px] font-normal text-slate-400">(simulation speed, km/h)</span>
            </label>
            <input
              type="number"
              min={5}
              max={120}
              value={speedInput}
              onChange={(e) => setSpeedInput(e.target.value)}
              placeholder="e.g. 40"
              className={inputCls}
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Optional. Never feeds the ML prediction — used only to estimate travel time in this simulation layer.
            </p>
          </div>
        </div>
      </Card>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Main Grid: Map (Left) + Intelligence Details (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Leaflet OSRM Route Map */}
        <div className="lg:col-span-7 rounded-lg overflow-hidden border border-slate-200 shadow-sm relative h-[520px] bg-white">
          <div ref={mapContainerRef} className="w-full h-full" />

          {draw && (
            <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-sm border border-slate-200 p-3 rounded-md text-xs shadow-sm space-y-0.5 max-w-[calc(100%-1.5rem)]">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <span className="text-[10px] uppercase text-slate-500">Distance</span>
                  <p className="text-sm font-semibold text-slate-900">{draw.distanceKm} km</p>
                </div>
                <div className="border-l border-slate-200 pl-4">
                  <span className="text-[10px] uppercase text-slate-500">Routing duration</span>
                  <p className="text-sm font-semibold text-slate-900">{draw.durationMin} min</p>
                </div>
                {simDurationMin != null && (
                  <div className="border-l border-slate-200 pl-4">
                    <span className="text-[10px] uppercase text-indigo-600">At {speedNum} km/h</span>
                    <p className="text-sm font-semibold text-indigo-700">≈ {simDurationMin} min</p>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                {draw.originPred
                  ? 'Line color reflects the ML departure prediction at the origin (dataset endpoint). Duration is the OSRM free-flow driving estimate — not live traffic.'
                  : 'OSRM driving route (free-flow estimate) — no TRAFFIQ congestion data claimed for this route.'}
              </p>
            </div>
          )}
        </div>

        {/* Intelligence Context & Recommendations */}
        <div className="lg:col-span-5 space-y-4">
          {intel ? (
            <div className="space-y-4">
              {/* Travel Mode summary (simulation layer) */}
              <Card className="p-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 flex items-center gap-1.5">
                    <VehicleIcon className="w-3.5 h-3.5 text-slate-500" />
                    Travel Mode — simulation inputs
                  </h3>
                  <span className="text-[10px] text-slate-400">not live data</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2.5 text-center">
                  <div className="bg-slate-50 p-2 rounded-md border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500">Mode</span>
                    <p className="text-xs font-semibold text-slate-900 mt-0.5">{VEHICLES.find(v => v.id === vehicle)?.label}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-md border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500">Speed</span>
                    <p className="text-xs font-semibold text-slate-900 mt-0.5">{speedInput ? `${speedNum} km/h` : '—'}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-md border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500">Est. time</span>
                    <p className="text-xs font-semibold text-slate-900 mt-0.5">
                      {simDurationMin != null ? `${simDurationMin} min` : '—'}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Origin vs Destination Congestion Cards (dataset endpoints only) */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase text-emerald-700 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Departure
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getBadgeClass(intel.origin_intelligence.departure_ml_prediction)}`}>
                      {intel.origin_intelligence.departure_ml_prediction}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-900 truncate">{intel.origin_intelligence.location_name}</h4>
                  <div className="text-[11px] text-slate-500 space-y-0.5">
                    <p>Est. volume: <strong className="text-slate-700">{intel.origin_intelligence.estimated_traffic_volume} v/h</strong></p>
                    <p>Corridor speed: <strong className="text-slate-700">{intel.origin_intelligence.estimated_speed_kmph} km/h</strong></p>
                    <p>T/C ratio: <strong className="text-slate-700">{intel.origin_intelligence.tc_ratio}</strong></p>
                  </div>
                </Card>

                <Card className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase text-rose-600 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Arrival
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getBadgeClass(intel.destination_intelligence.arrival_ml_prediction)}`}>
                      {intel.destination_intelligence.arrival_ml_prediction}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-900 truncate">{intel.destination_intelligence.location_name}</h4>
                  <div className="text-[11px] text-slate-500 space-y-0.5">
                    <p>Est. volume: <strong className="text-slate-700">{intel.destination_intelligence.estimated_traffic_volume} v/h</strong></p>
                    <p>Corridor speed: <strong className="text-slate-700">{intel.destination_intelligence.estimated_speed_kmph} km/h</strong></p>
                    <p>T/C ratio: <strong className="text-slate-700">{intel.destination_intelligence.tc_ratio}</strong></p>
                  </div>
                </Card>
              </div>

              {/* Actionable Recommendations */}
              <Card>
                <CardHeader title="Travel Advice & City Operations" icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />} />
                <div className="p-4 space-y-2">
                  {intel.recommendations.user_travel_advice.map((adv, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 rounded-md border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-900">{adv.title}</span>
                        <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">
                          {adv.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{adv.detail}</p>
                    </div>
                  ))}

                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      City operations &amp; signal management
                    </h4>
                    {intel.recommendations.traffic_management_recommendations.slice(0, 2).map((mgmt, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded-md border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-amber-700">{mgmt.action}</span>
                          <span className="text-[10px] text-slate-400">{mgmt.category}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">{mgmt.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Data honesty notice */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-500 space-y-1 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <p>{intel.data_honesty_notice}</p>
              </div>
            </div>
          ) : draw ? (
            /* Real-world place route — routing info only, no invented traffic data */
            <div className="space-y-4">
              <Card className="p-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 flex items-center gap-1.5">
                    <VehicleIcon className="w-3.5 h-3.5 text-slate-500" />
                    Travel Mode — simulation inputs
                  </h3>
                  <span className="text-[10px] text-slate-400">not live data</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2.5 text-center">
                  <div className="bg-slate-50 p-2 rounded-md border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500">Mode</span>
                    <p className="text-xs font-semibold text-slate-900 mt-0.5">{VEHICLES.find(v => v.id === vehicle)?.label}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-md border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500">Speed</span>
                    <p className="text-xs font-semibold text-slate-900 mt-0.5">{speedInput ? `${speedNum} km/h` : '—'}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-md border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500">Est. time</span>
                    <p className="text-xs font-semibold text-slate-900 mt-0.5">
                      {simDurationMin != null ? `${simDurationMin} min` : '—'}
                    </p>
                  </div>
                </div>
              </Card>

              <EndpointHonesty name={draw.oName} inDataset={draw.originDataset} />
              <EndpointHonesty name={draw.dName} inDataset={draw.destDataset} />

              <Card className="p-3.5 text-[11px] text-slate-500 space-y-1 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <p>
                  Road geometry, distance and duration come from OpenStreetMap / OSRM (free-flow driving estimate).
                  TRAFFIQ ML congestion predictions and historical analytics are only available for the 7 monitored
                  dataset locations — none are shown for places outside the dataset.
                </p>
              </Card>
            </div>
          ) : (
            <Card className="p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center space-y-2.5 py-8">
                  <Spinner className="w-5 h-5 text-indigo-500" />
                  <p className="text-xs text-slate-500">Calculating road geometry and corridor context…</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2.5 py-8 text-center">
                  <Compass className="w-8 h-8 text-slate-300" />
                  <h4 className="text-sm font-semibold text-slate-800">No route analyzed yet</h4>
                  <p className="text-xs text-slate-500 max-w-xs">Choose origin and destination, then run “Analyze Route”.</p>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
