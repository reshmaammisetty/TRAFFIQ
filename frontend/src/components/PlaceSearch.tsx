import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, GeocodeResult, LocationItem } from '../services/api';
import { Search, MapPin, Database } from 'lucide-react';
import { Spinner } from './ui';

/**
 * Debounced, cached real-world place search backed by /api/geocode
 * (OpenStreetMap Nominatim — real coordinates only, no traffic data).
 * Shows the 7 dataset locations as quick matches when they fit the query,
 * plus one live geocoding result for any real-world place.
 */

export interface PlaceSelection {
  name: string;
  displayName?: string | null;
  lat: number;
  lon: number;
  inDataset: boolean;
}

interface PlaceSearchProps {
  label: string;
  placeholder?: string;
  datasetLocations: LocationItem[];
  onSelect: (selection: PlaceSelection) => void;
  /** Compact mode for query bars */
  compact?: boolean;
  /** Optional pre-filled query text (e.g. after a handoff from the map) */
  initialQuery?: string;
}

// Client-side cache so repeat searches never hit the API twice
const geocodeCache = new Map<string, GeocodeResult>();

export const PlaceSearch: React.FC<PlaceSearchProps> = ({
  label,
  placeholder = 'Search any place, road or city…',
  datasetLocations,
  onSelect,
  compact = false,
  initialQuery = '',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Array<{ kind: 'dataset'; loc: LocationItem } | { kind: 'place'; place: PlaceSelection }>>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      setNotFound(false);
      return;
    }
    const lower = trimmed.toLowerCase();
    const datasetMatches = datasetLocations.filter(
      (l) =>
        l.Location_Name.toLowerCase().includes(lower) ||
        l.Location_ID.toLowerCase() === lower
    ).slice(0, 3);

    let geocoded: GeocodeResult | null = null;
    if (geocodeCache.has(trimmed)) {
      geocoded = geocodeCache.get(trimmed)!;
    } else {
      setSearching(true);
      try {
        geocoded = await api.geocodeSearch(trimmed);
        geocodeCache.set(trimmed, geocoded);
      } catch {
        geocoded = null;
      }
    }
    setSearching(false);
    setNotFound(!datasetMatches.length && (!geocoded || geocoded.status !== 'ok'));

    const items: Array<{ kind: 'dataset'; loc: LocationItem } | { kind: 'place'; place: PlaceSelection }> = [];
    datasetMatches.forEach((loc) => items.push({ kind: 'dataset', loc }));
    if (geocoded && geocoded.status === 'ok' && geocoded.lat != null && geocoded.lon != null) {
      items.push({
        kind: 'place',
        place: {
          name: trimmed,
          displayName: geocoded.display_name,
          lat: geocoded.lat,
          lon: geocoded.lon,
          inDataset: !!geocoded.in_dataset,
        },
      });
    }
    setResults(items);
  }, [datasetLocations]);

  const onQueryChange = (value: string) => {
    setQuery(value);
    setOpen(true);
    setNotFound(false);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => runSearch(value), 450);
  };

  // Close on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const commitDataset = (loc: LocationItem) => {
    onSelect({ name: loc.Location_Name, displayName: loc.Location_Name, lat: loc.Latitude, lon: loc.Longitude, inDataset: true });
    setQuery(loc.Location_Name);
    setOpen(false);
    inputRef.current?.blur();
  };

  const commitPlace = (place: PlaceSelection) => {
    onSelect(place);
    setQuery(place.displayName ? place.displayName.split(',').slice(0, 2).join(', ') : place.name);
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={rootRef} className="relative">
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (results.length > 0) {
                const first = results[0];
                if (first.kind === 'dataset') commitDataset(first.loc);
                else commitPlace(first.place);
              } else {
                runSearch(query);
              }
            }
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder={placeholder}
          className={`w-full rounded-md border border-slate-300 bg-white pl-8 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-shadow ${compact ? 'py-1.5' : 'py-2'}`}
        />
        {searching && (
          <Spinner className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
        )}
      </div>

      {open && (query.trim().length >= 2) && (
        <div className="absolute z-[1100] mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-64 overflow-auto py-1">
          {results.length === 0 && !searching && (
            <p className="px-3 py-2 text-xs text-slate-500">
              {notFound ? 'No matching place found.' : 'Type to search…'}
            </p>
          )}
          {results.map((item, idx) =>
            item.kind === 'dataset' ? (
              <button
                key={`ds-${idx}`}
                onMouseDown={(e) => { e.preventDefault(); commitDataset(item.loc); }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-2"
              >
                <Database className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-slate-800 truncate">{item.loc.Location_Name}</span>
                  <span className="block text-[11px] text-slate-500 truncate">TRAFFIQ dataset location · {item.loc.Location_ID}</span>
                </span>
              </button>
            ) : (
              <button
                key={`pl-${idx}`}
                onMouseDown={(e) => { e.preventDefault(); commitPlace(item.place); }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-2"
              >
                <MapPin className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-slate-800 truncate">
                    {item.place.displayName ? item.place.displayName.split(',').slice(0, 3).join(', ') : item.place.name}
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    {item.place.inDataset ? 'OpenStreetMap place · in TRAFFIQ dataset' : 'OpenStreetMap place · no TRAFFIQ historical data'}
                  </span>
                </span>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
};
