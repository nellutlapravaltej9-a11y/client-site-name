import React, { useState, useEffect, useRef } from 'react';
import { Search, Plane, AlertCircle } from 'lucide-react';
import airportsData from '../utils/airports.json';

interface Airport {
  icao: string;
  iata: string;
  name: string;
  city: string;
  country: string;
}

interface HomeViewProps {
  onSearch: (icao: string) => void;
  isLoading: boolean;
  error: string | null;
}

export default function HomeView({ onSearch, isLoading, error }: HomeViewProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Airport[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLFormElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (!val.trim()) {
      setSuggestions([]);
      return;
    }

    const cleanQuery = val.trim().toLowerCase();

    // Filter airports matching icao, iata, name, city, or country
    const matches = (airportsData as Airport[]).filter((airport) => {
      return (
        airport.icao.toLowerCase().includes(cleanQuery) ||
        (airport.iata && airport.iata.toLowerCase().includes(cleanQuery)) ||
        airport.name.toLowerCase().includes(cleanQuery) ||
        (airport.city && airport.city.toLowerCase().includes(cleanQuery)) ||
        airport.country.toLowerCase().includes(cleanQuery)
      );
    });

    // Limit to top 8 suggestions for performance and UI layout
    setSuggestions(matches.slice(0, 8));
  };

  const handleSelectSuggestion = (airport: Airport) => {
    setQuery(`${airport.icao} - ${airport.name}`);
    onSearch(airport.icao);
    setShowSuggestions(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = query.trim().toUpperCase();
    if (!cleanQuery) return;

    // Check if the query is a valid 3 or 4 letter code directly
    if (cleanQuery.length >= 3 && cleanQuery.length <= 4 && /^[A-Z]{3,4}$/.test(cleanQuery)) {
      onSearch(cleanQuery);
      return;
    }

    // Try to extract ICAO from prefix e.g. "KJFK - New York JFK" -> "KJFK"
    const prefixMatch = query.match(/^([A-Z0-9]{3,4})\s*-\s*/i);
    if (prefixMatch) {
      onSearch(prefixMatch[1].toUpperCase());
      return;
    }

    // If query is text, fall back to top suggestion if available
    if (suggestions.length > 0) {
      handleSelectSuggestion(suggestions[0]);
    } else {
      // Fallback
      onSearch(cleanQuery);
    }
  };

  const handleQuickAccess = (code: string) => {
    const selected = (airportsData as Airport[]).find((a) => a.icao === code);
    if (selected) {
      setQuery(`${selected.icao} - ${selected.name}`);
    } else {
      setQuery(code);
    }
    onSearch(code);
  };

  const popularAirports = [
    { code: 'WSSS', name: 'Singapore Changi' },
    { code: 'EGLL', name: 'London Heathrow' },
    { code: 'KJFK', name: 'New York JFK' },
    { code: 'OMDB', name: 'Dubai Intl' }
  ];

  return (
    <div className="flex-1 flex flex-col justify-between max-w-4xl mx-auto px-4 py-12 md:py-24" id="home-view-container">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center text-center my-auto">
        
        {/* SkyBrief Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#38BDF8]/20 bg-[#38BDF8]/5 text-[#38BDF8] text-xs font-mono mb-8 tracking-wider uppercase">
          <Plane className="w-3.5 h-3.5 rotate-45" />
          Aviation Weather Service
        </div>

        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-4">
          SKY<span className="text-[#38BDF8] font-light">BRIEF</span>
        </h1>
        
        <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mb-12 leading-relaxed font-light">
          Professional glass-cockpit style briefing utility for student pilots. Decodes raw meteorological forecasts instantly.
        </p>

        {/* Search Bar Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-xl mb-8 relative" id="search-form" ref={dropdownRef}>
          <div className="relative flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search Airport Name, City, or ICAO (e.g. London, SIN, KJFK)"
                autoFocus
                disabled={isLoading}
                className="block w-full pl-11 pr-4 py-4 bg-[#1E293B] border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8] text-lg transition-all"
                id="icao-search-input"
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="px-8 py-4 bg-[#38BDF8] hover:bg-sky-400 disabled:bg-[#38BDF8]/40 disabled:text-slate-400 disabled:cursor-not-allowed text-[#0A0F1E] font-display font-bold text-lg rounded-xl shadow-lg shadow-[#38BDF8]/10 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
              id="get-briefing-btn"
            >
              {isLoading ? 'Decoding...' : 'Get Briefing'}
            </button>
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-[#1E293B]/95 backdrop-blur-md border border-slate-700/60 rounded-xl shadow-2xl z-50 overflow-hidden max-h-[300px] overflow-y-auto divide-y divide-slate-800 text-left">
              {suggestions.map((airport) => (
                <button
                  key={airport.icao}
                  type="button"
                  onClick={() => handleSelectSuggestion(airport)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-800/80 transition-colors flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex flex-col pr-4 min-w-0">
                    <span className="text-sm font-semibold text-slate-100 group-hover:text-[#38BDF8] transition-colors truncate">
                      {airport.name}
                    </span>
                    <span className="text-xs text-slate-400 truncate">
                      {airport.city ? `${airport.city}, ` : ''}{airport.country}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs shrink-0">
                    <span className="bg-slate-900 px-2 py-1 rounded text-white font-bold">
                      {airport.icao}
                    </span>
                    {airport.iata && (
                      <span className="bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20 px-2 py-1 rounded font-bold">
                        {airport.iata}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Error State */}
        {error && (
          <div className="w-full max-w-xl mb-8 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm flex items-center gap-3 text-left">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
            <div>
              <p className="font-semibold">Briefing Error</p>
              <p className="text-slate-300 text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Quick Access Buttons */}
        <div className="w-full max-w-xl text-left sm:text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold mb-4 text-center">
            Quick-Access Pilot Hubs
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {popularAirports.map((airport) => (
              <button
                key={airport.code}
                type="button"
                onClick={() => handleQuickAccess(airport.code)}
                disabled={isLoading}
                className="px-4 py-3 bg-[#1E293B] hover:bg-[#1E293B]/80 border border-slate-700/50 hover:border-[#38BDF8]/30 rounded-xl transition-all text-left flex flex-col justify-between group cursor-pointer disabled:opacity-50"
                id={`quick-${airport.code}-btn`}
              >
                <span className="font-mono font-bold text-white group-hover:text-[#38BDF8] transition-colors">
                  {airport.code}
                </span>
                <span className="text-[10px] text-slate-400 truncate mt-1">
                  {airport.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <footer className="mt-16 pt-8 border-t border-slate-800/50 text-center text-slate-500 text-xs font-mono">
        <p>
          Built by <span className="text-slate-400">Nellutla Pravaltej</span> — Student Pilot &amp; Aerospace Engineering Applicant
        </p>
      </footer>
    </div>
  );
}
