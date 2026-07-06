import React from 'react';
import { 
  RefreshCw, Wind, Eye, Cloud, HelpCircle, Thermometer, Gauge, Clock, 
  BookOpen, AlertTriangle, Activity, TrendingUp
} from 'lucide-react';
import { BriefingData } from '../utils/aviationTypes';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend, LineChart, Line 
} from 'recharts';

interface BriefingViewProps {
  briefingData: BriefingData;
  onRefresh: () => void;
  isRefreshing: boolean;
  onBackToSearch: () => void;
}

// Sleek theme colors mapping helper based on Flight Category code
function getCategorySleekTheme(code: string) {
  switch (code) {
    case 'VFR':
      return {
        color: '#22C55E',
        textClass: 'text-[#22C55E]',
        bgClass: 'bg-[#22C55E]/10',
        borderClass: 'border-[#22C55E]',
        borderLClass: 'border-l-[#22C55E]',
        bgHex: 'rgba(34, 197, 94, 0.1)',
      };
    case 'MVFR':
      return {
        color: '#38BDF8',
        textClass: 'text-[#38BDF8]',
        bgClass: 'bg-[#38BDF8]/10',
        borderClass: 'border-[#38BDF8]',
        borderLClass: 'border-l-[#38BDF8]',
        bgHex: 'rgba(56, 189, 248, 0.1)',
      };
    case 'IFR':
      return {
        color: '#EF4444', // Red
        textClass: 'text-[#EF4444]',
        bgClass: 'bg-[#EF4444]/10',
        borderClass: 'border-[#EF4444]',
        borderLClass: 'border-l-[#EF4444]',
        bgHex: 'rgba(239, 68, 68, 0.1)',
      };
    case 'LIFR':
    default:
      return {
        color: '#A855F7', // Purple
        textClass: 'text-[#A855F7]',
        bgClass: 'bg-[#A855F7]/10',
        borderClass: 'border-[#A855F7]',
        borderLClass: 'border-l-[#A855F7]',
        bgHex: 'rgba(168, 85, 247, 0.1)',
      };
  }
}

import { DecodedMETAR, DecodedTAF } from '../utils/aviationTypes';

// Helper function to predict weather at selected ETA offset based on TAF periods
function getPredictedWeatherAtETA(taf: DecodedTAF | null, metar: DecodedMETAR, etaOffsetHours: number) {
  if (!taf || !taf.periods || taf.periods.length === 0) {
    // If no TAF, the best prediction is the current METAR weather
    return {
      wind: metar.wind,
      visibility: metar.visibility,
      clouds: metar.clouds,
      weatherPhenomena: metar.weatherPhenomena,
      flightCategory: metar.flightCategory,
      tempC: metar.temperature.tempC,
      pressure: metar.pressure,
      tempoPeriod: null as any
    };
  }

  const targetEpoch = Math.floor(Date.now() / 1000) + etaOffsetHours * 3600;

  // 1. Find the active BASE/FM period
  const basePeriods = taf.periods.filter(p => (p.type === 'BASE' || p.type === 'FM') && p.epochStart !== undefined);
  
  // Sort by epochStart ascending
  basePeriods.sort((a, b) => (a.epochStart || 0) - (b.epochStart || 0));

  let activeBase = basePeriods[0];
  for (const p of basePeriods) {
    if (p.epochStart !== undefined && p.epochStart <= targetEpoch) {
      activeBase = p;
    }
  }

  // 2. Check if there are any active TEMPO / BECMG / PROB periods covering the targetEpoch
  const activeTempos = taf.periods.filter(p => {
    if (p.type === 'BASE' || p.type === 'FM') return false;
    if (p.epochStart === undefined) return false;
    
    // Parse timeEnd to calculate epochEnd
    const match = p.timeEnd.match(/Day (\d+) @ (\d{2}):(\d{2})/);
    if (!match) return false;
    
    const day = parseInt(match[1]);
    const hour = parseInt(match[2]);
    const min = parseInt(match[3]);
    
    const now = new Date();
    const utcEndDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, hour, min));
    const epochEnd = Math.floor(utcEndDate.getTime() / 1000);
    
    return p.epochStart <= targetEpoch && targetEpoch <= epochEnd;
  });

  const tempoPeriod = activeTempos.length > 0 ? activeTempos[activeTempos.length - 1] : null;

  return {
    wind: activeBase?.wind || metar.wind,
    visibility: activeBase?.visibility || metar.visibility,
    clouds: activeBase?.clouds || metar.clouds,
    weatherPhenomena: activeBase?.weatherPhenomena || metar.weatherPhenomena,
    flightCategory: activeBase?.flightCategory || metar.flightCategory,
    tempC: metar.temperature.tempC, // Default to current temperature as TAF doesn't detail hourly temperature
    pressure: metar.pressure,       // Default to current pressure
    tempoPeriod: tempoPeriod
  };
}

export default function BriefingView({ briefingData, onRefresh, isRefreshing, onBackToSearch }: BriefingViewProps) {
  const { metar, taf, timestamp } = briefingData;
  const [etaOffset, setEtaOffset] = React.useState<number>(0); // hours from now
  const [runwayInput, setRunwayInput] = React.useState<string>(''); // landing runway

  // Parse runway heading
  const getRunwayHeading = (rw: string): number | null => {
    const clean = rw.trim().replace(/[^0-9]/g, '');
    if (!clean) return null;
    const num = parseInt(clean);
    if (num < 1 || num > 36) return null;
    return num * 10;
  };

  const runwayHeading = getRunwayHeading(runwayInput);

  // Predict weather variables at selected ETA
  const predicted = getPredictedWeatherAtETA(taf, metar, etaOffset);
  const predictedWind = predicted.wind;

  let headwind: number | null = null;
  let crosswind: number | null = null;
  let headwindGust: number | null = null;
  let crosswindGust: number | null = null;
  let crosswindDirection: 'left' | 'right' | null = null;

  if (runwayHeading !== null && predictedWind && !predictedWind.isCalm && predictedWind.direction !== 'VRB') {
    const windDir = predictedWind.direction;
    const windSpd = predictedWind.speedKt;
    const windGusts = predictedWind.gustsKt || windSpd;

    // Angle in degrees between wind direction and runway heading
    let angleDiff = windDir - runwayHeading;
    // Normalize to [-180, 180]
    while (angleDiff > 180) angleDiff -= 360;
    while (angleDiff < -180) angleDiff += 360;

    const angleRad = (angleDiff * Math.PI) / 180;

    headwind = windSpd * Math.cos(angleRad);
    crosswind = windSpd * Math.sin(angleRad);

    headwindGust = windGusts * Math.cos(angleRad);
    crosswindGust = windGusts * Math.sin(angleRad);

    if (crosswind > 0) {
      crosswindDirection = 'right';
    } else if (crosswind < 0) {
      crosswindDirection = 'left';
    }
    
    crosswind = Math.abs(crosswind);
    crosswindGust = Math.abs(crosswindGust);
  }

  // Compile trend chart data from TAF periods
  const hasTrendData = taf && taf.periods && taf.periods.length > 0;
  
  const trendChartData = hasTrendData 
    ? taf.periods.map((p, idx) => {
        let timeLabel = `P${idx + 1}`;
        if (p.timeStart) {
          const match = p.timeStart.match(/Day (\d+) @ (\d{2}):(\d{2})/);
          if (match) {
            timeLabel = `${match[1]}/${match[2]}Z`;
          } else {
            timeLabel = p.timeStart.replace('Day ', '').replace(' UTC', '');
          }
        }

        const speed = p.wind ? p.wind.speedKt : 0;
        const gusts = p.wind ? (p.wind.gustsKt || speed) : 0;
        const vis = p.visibility ? p.visibility.distanceSm : 10;

        return {
          name: timeLabel,
          periodType: p.type,
          'Wind Speed': speed,
          'Wind Gusts': gusts,
          'Visibility (SM)': vis,
          category: p.flightCategory.code
        };
      })
    : [];

  const sleekTheme = getCategorySleekTheme(metar.flightCategory.code);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6" id="briefing-view-container">
      
      {/* Header Navigation */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0" id="briefing-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#38BDF8] rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-[#0A0F1E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              SkyBrief <span className="text-[#38BDF8] font-light">Briefing</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Aviation Weather Decoder &bull; Station {metar.icao}
            </p>
          </div>
        </div>

        {/* Quick ICAO details container */}
        <div className="flex items-center gap-4 bg-[#1E293B] p-1.5 rounded-xl border border-slate-700/50">
          <div className="flex items-center px-3">
            <span className="text-xs font-mono text-slate-500 mr-2">ICAO:</span>
            <span className="bg-transparent text-white font-bold uppercase w-16 focus:outline-none">{metar.icao}</span>
          </div>
          <button 
            onClick={onBackToSearch}
            className="bg-[#38BDF8] hover:bg-sky-400 text-[#0A0F1E] font-bold px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer"
            id="back-to-search-header-btn"
          >
            New Briefing
          </button>
        </div>

        {/* Dynamic Fetch & Refresh */}
        <div className="flex items-center gap-6 self-end sm:self-auto">
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Generated Local</p>
            <p className="text-xs text-slate-300 font-mono">{timestamp}</p>
          </div>
          <button 
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh weather data"
            id="refresh-briefing-circle-btn"
          >
            <svg className={`w-5 h-5 text-slate-400 ${isRefreshing ? 'animate-spin text-[#38BDF8]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </header>

      {/* Raw METAR / TAF Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Raw METAR Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
          <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2 block">Raw METAR</label>
          <code className="text-[#38BDF8] font-mono text-sm leading-relaxed block break-all select-all cursor-pointer" title="Double click to copy">
            {metar.raw}
          </code>
        </div>

        {/* Raw TAF Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
          <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2 block">Raw TAF</label>
          <code className="text-[#38BDF8] font-mono text-sm leading-relaxed block break-all select-all cursor-pointer" title="Double click to copy">
            {taf ? taf.raw : 'No active TAF forecast available for this station.'}
          </code>
        </div>
      </div>

      {/* Briefing Summary */}
      <div className="bg-sky-900/10 border-l-4 border-[#38BDF8] p-5 rounded-r-2xl">
        <h3 className="text-sm font-bold text-[#38BDF8] uppercase mb-1 tracking-wide">Plain English Summary</h3>
        <p className="text-slate-300 leading-relaxed text-sm sm:text-base">
          {metar.summary}
        </p>
      </div>

      {/* Main Grid Layout containing Columns */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* Left Section: METAR Decoder elements */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* MCDU Landing Weather Predictor */}
          <div className="bg-[#1E293B] border border-slate-700/50 rounded-3xl p-5 shadow-xl flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-3 gap-2">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-[#38BDF8]" />
                  MCDU Arrival &amp; Landing Predictor
                </h3>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">
                  Calculate target weather inputs and runway wind components for arrival prep
                </p>
              </div>
              <div className="bg-slate-900/60 px-3 py-1 rounded-lg text-[10px] font-mono text-slate-400 border border-slate-800">
                MCDU INPUT STATUS: {runwayInput ? 'READY' : 'SELECT RWY'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Left Settings: ETA Offset & Runway Selector */}
              <div className="md:col-span-5 flex flex-col gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-2 block">
                    Estimated Time of Arrival (ETA)
                  </label>
                  <div className="grid grid-cols-5 md:grid-cols-5 gap-2">
                    {[
                      { val: 0, label: 'Now' },
                      { val: 1, label: '+1h' },
                      { val: 2, label: '+2h' },
                      { val: 4, label: '+4h' },
                      { val: 6, label: '+6h' },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setEtaOffset(opt.val)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-semibold font-mono border transition-all cursor-pointer text-center ${
                          etaOffset === opt.val
                            ? 'bg-[#38BDF8] text-[#0A0F1E] border-[#38BDF8]'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">
                    Arrival Runway
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={3}
                      value={runwayInput}
                      onChange={(e) => setRunwayInput(e.target.value.toUpperCase())}
                      placeholder="e.g. 09, 27L, 36R"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-[#38BDF8] font-mono font-bold uppercase text-sm"
                    />
                    {runwayInput && runwayHeading === null && (
                      <p className="text-[9px] text-amber-400 mt-1 italic font-semibold">
                        Enter 2 digits (01-36) optionally followed by L/R/C (e.g. 09R)
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Output: MCDU Variables & Wind Components */}
              <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* MCDU Target Values Card */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block mb-3">MCDU target parameters</span>
                  <div className="space-y-3 font-mono">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                      <span className="text-xs text-slate-400 uppercase">MCDU WIND</span>
                      <span className="text-sm font-bold text-white">
                        {predictedWind.isCalm 
                          ? '00000KT' 
                          : `${predictedWind.direction === 'VRB' ? 'VRB' : String(predictedWind.direction).padStart(3, '0')}/${String(predictedWind.speedKt).padStart(2, '0')}KT`
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                      <span className="text-xs text-slate-400 uppercase">TEMP (C)</span>
                      <span className="text-sm font-bold text-white">{predicted.tempC}°C</span>
                    </div>
                    <div className="flex justify-between items-center pb-0.5">
                      <span className="text-xs text-slate-400 uppercase">QNH / BARO</span>
                      <span className="text-sm font-bold text-white flex flex-col items-end text-right">
                        <span>{predicted.pressure.hPa} hPa</span>
                        <span className="text-[10px] text-slate-500 font-normal">{predicted.pressure.inHg} inHg</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Wind Components Calculation */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block mb-3">Runway wind components</span>
                  
                  {runwayHeading === null ? (
                    <div className="flex-1 flex items-center justify-center text-center p-2">
                      <p className="text-[11px] text-slate-500 italic">
                        Enter arrival runway to compute headwind/crosswind limits
                      </p>
                    </div>
                  ) : predictedWind.direction === 'VRB' ? (
                    <div className="flex-1 flex items-center justify-center text-center p-2">
                      <p className="text-[11px] text-slate-500 italic">
                        Wind is variable — headwind/crosswind cannot be computed
                      </p>
                    </div>
                  ) : predictedWind.isCalm ? (
                    <div className="flex-1 flex items-center justify-center text-center p-2">
                      <p className="text-[11px] text-[#22C55E] font-bold">
                        Calm winds — no wind components detected
                      </p>
                    </div>
                  ) : (
                    <div className="flex-grow flex flex-col justify-center gap-3.5 font-mono text-xs">
                      {/* Headwind / Tailwind */}
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">HW / TW:</span>
                        {headwind !== null && (
                          <span className={`font-bold text-sm ${headwind >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {headwind >= 0 
                              ? `${Math.round(headwind)} KT Head` 
                              : `${Math.round(Math.abs(headwind))} KT Tail`
                            }
                            {predictedWind.gustsKt && headwindGust !== null && Math.round(headwindGust) !== Math.round(headwind) && (
                              <span className="text-[10px] font-normal text-slate-400 ml-1">
                                (G {Math.round(headwindGust)})
                              </span>
                            )}
                          </span>
                        )}
                      </div>

                      {/* Crosswind */}
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">X-WIND:</span>
                        {crosswind !== null && (
                          <span className={`font-bold text-sm ${crosswind > 15 ? 'text-red-400 animate-pulse' : crosswind > 10 ? 'text-amber-400' : 'text-green-400'}`}>
                            {Math.round(crosswind)} KT
                            {crosswindDirection && ` from ${crosswindDirection.toUpperCase()}`}
                            {predictedWind.gustsKt && crosswindGust !== null && Math.round(crosswindGust) !== Math.round(crosswind) && (
                              <span className="text-[10px] font-normal text-slate-400 ml-1">
                                (G {Math.round(crosswindGust)})
                              </span>
                            )}
                          </span>
                        )}
                      </div>

                      {/* Alerts */}
                      <div className="mt-1">
                        {headwind !== null && headwind < 0 && (
                          <div className="bg-red-500/10 text-red-400 px-2 py-1 rounded border border-red-500/20 text-[9px] font-semibold text-center uppercase tracking-wider">
                            ⚠️ Tailwind Landing detected
                          </div>
                        )}
                        {crosswind !== null && crosswind > 15 && (
                          <div className="bg-amber-500/10 text-amber-400 px-2 py-1 rounded border border-amber-500/20 text-[9px] font-semibold text-center uppercase tracking-wider">
                            ⚠️ Crosswind exceeds C172 student limit (15KT)
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>

              </div>

            </div>

            {/* Tempo warnings at ETA */}
            {predicted.tempoPeriod && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-amber-400 uppercase tracking-wider block mb-0.5">
                    ⚠️ {predicted.tempoPeriod.type} conditions forecast at ETA ({predicted.tempoPeriod.timeStart.replace('Day ', 'D')})
                  </span>
                  <p className="text-slate-300 leading-normal">
                    {predicted.tempoPeriod.summary}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">
                    Raw: {predicted.tempoPeriod.rawText}
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* Detailed Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Station & Time */}
            <div className="bg-[#1E293B] border border-slate-700/50 p-4 rounded-2xl flex flex-col justify-between h-[140px]">
              <span className="text-[10px] uppercase text-slate-500 font-bold">Station &amp; Time</span>
              <div className="mt-2">
                <p className="text-2xl font-bold text-white uppercase">{metar.icao}</p>
                <p className="text-xs text-slate-400 mt-1 truncate">Local: {metar.time.localString}</p>
                <p className="text-xs text-slate-400 font-mono">UTC: {metar.time.utcString}</p>
              </div>
            </div>

            {/* Wind */}
            <div className={`bg-[#1E293B] border border-slate-700/50 p-4 rounded-2xl flex flex-col justify-between border-l-4 ${
              metar.wind.colorClass === 'text-red-400' ? 'border-l-red-500' : metar.wind.colorClass === 'text-amber-400' ? 'border-l-amber-500' : 'border-l-green-500'
            } h-[140px]`}>
              <span className="text-[10px] uppercase text-slate-500 font-bold">Wind</span>
              <div className="mt-2">
                <p className="text-2xl font-bold text-white">
                  {metar.wind.isCalm ? 'Calm' : `${metar.wind.direction === 'VRB' ? 'VRB' : metar.wind.direction + '°'} @ ${metar.wind.speedKt}`}
                  {metar.wind.gustsKt && <span className="text-sm font-normal text-slate-400 ml-1 italic">G{metar.wind.gustsKt}</span>}
                  {!metar.wind.isCalm && <span className="text-xs text-slate-400 font-normal ml-1">KT</span>}
                </p>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-tight truncate">
                  {metar.wind.directionText.includes(' — ') ? metar.wind.directionText.split(' — ')[1] : metar.wind.directionText}
                </p>
              </div>
            </div>

            {/* Visibility */}
            <div className={`bg-[#1E293B] border border-slate-700/50 p-4 rounded-2xl flex flex-col justify-between border-l-4 ${
              metar.visibility.colorClass === 'text-red-400' ? 'border-l-red-500' : metar.visibility.colorClass === 'text-amber-400' ? 'border-l-amber-500' : 'border-l-[#22C55E]'
            } h-[140px]`}>
              <span className="text-[10px] uppercase text-slate-500 font-bold">Visibility</span>
              <div className="mt-2">
                <p className="text-2xl font-bold text-white">{metar.visibility.distanceSm} SM</p>
                <p className={`text-xs ${metar.visibility.colorClass} mt-1 font-semibold uppercase`}>
                  {metar.visibility.label} ({metar.visibility.distanceKm} KM)
                </p>
              </div>
            </div>

            {/* Clouds */}
            <div className="bg-[#1E293B] border border-slate-700/50 p-4 rounded-2xl flex flex-col justify-between min-h-[140px]">
              <span className="text-[10px] uppercase text-slate-500 font-bold">Cloud Layers</span>
              <div className="mt-2 flex flex-col gap-1 max-h-[75px] overflow-y-auto">
                {metar.clouds.map((cl, idx) => {
                  const isHazard = cl.isCb || cl.isTcu;
                  return (
                    <p key={idx} className="text-xs text-slate-200">
                      <span className={`font-mono ${isHazard ? 'text-red-400 font-bold' : 'text-[#38BDF8]'}`}>
                        {cl.coverage}
                      </span>{' '}
                      {cl.heightFt !== null ? `${cl.heightFt.toLocaleString()}' AGL` : 'CLR'}
                    </p>
                  );
                })}
              </div>
            </div>

            {/* Temp & Dew */}
            <div className="bg-[#1E293B] border border-slate-700/50 p-4 rounded-2xl flex flex-col justify-between h-[140px]">
              <span className="text-[10px] uppercase text-slate-500 font-bold">Temp &amp; Dewpoint</span>
              <div className="mt-2">
                <p className="text-xl font-bold text-white">
                  {metar.temperature.tempC}°C / {metar.temperature.dewpointC}°C
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-850 rounded border border-slate-700/60 font-mono">
                    Spread: {metar.temperature.spreadC}°C
                  </span>
                  {metar.temperature.fogRisk ? (
                    <span className="text-[10px] text-red-400 font-bold uppercase animate-pulse">Fog Risk</span>
                  ) : (
                    <span className="text-[10px] text-[#22C55E] font-bold uppercase">Low Fog Risk</span>
                  )}
                </div>
              </div>
            </div>

            {/* Pressure */}
            <div className="bg-[#1E293B] border border-slate-700/50 p-4 rounded-2xl flex flex-col justify-between h-[140px]">
              <span className="text-[10px] uppercase text-slate-500 font-bold">Pressure (QNH)</span>
              <div className="mt-2">
                <p className="text-2xl font-bold text-white">
                  {metar.pressure.inHg} <span className="text-sm font-normal text-slate-400">inHg</span>
                </p>
                <p className="text-xs text-slate-400 mt-1 font-mono">{metar.pressure.hPa} hPa</p>
              </div>
            </div>

            {/* Weather Phenomena */}
            <div className="bg-[#1E293B] border border-slate-700/50 p-4 rounded-2xl flex flex-col justify-between sm:col-span-2 min-h-[140px]">
              <span className="text-[10px] uppercase text-slate-500 font-bold">Weather Phenomena</span>
              <div className="mt-2 space-y-1 max-h-[75px] overflow-y-auto">
                {metar.weatherPhenomena.map((item, index) => (
                  <p key={index} className="text-xs text-slate-300 font-mono">
                    &bull; {item}
                  </p>
                ))}
              </div>
            </div>

            {/* Air Performance / Atmosphere Type */}
            <div className="bg-[#1E293B] border border-slate-700/50 p-4 rounded-2xl flex flex-col justify-between h-[140px]">
              <span className="text-[10px] uppercase text-slate-500 font-bold">Atmosphere Performance</span>
              <div className="mt-1 text-[11px] text-slate-400 leading-snug">
                <p className="font-semibold text-slate-200">
                  {metar.pressure.isStandard ? 'Standard Baro' : metar.pressure.hPa > 1013 ? 'High Baro (Dense)' : 'Low Baro (Thin)'}
                </p>
                <p className="mt-0.5">
                  {metar.pressure.isStandard ? 'Standard altimeter setting.' : metar.pressure.hPa > 1013 ? 'High pressure improves aircraft lift.' : 'Low pressure reduces engine performance.'}
                </p>
              </div>
            </div>

          </div>

          {/* Trend Charts Panel */}
          {taf && hasTrendData ? (
            <div className="space-y-4 mt-2">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#38BDF8]" />
                  TAF Trend Analysis Charts
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Wind Velocity Trend Chart */}
                <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-5 shadow-lg">
                  <h4 className="font-display text-xs font-semibold text-slate-300 mb-4 flex items-center gap-1.5">
                    <Wind className="w-4 h-4 text-[#38BDF8]" />
                    Wind Velocity Trend (Knots)
                  </h4>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={trendChartData}
                        margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorWind" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#38BDF8" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorGusts" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                        <XAxis dataKey="name" stroke="#64748B" fontSize={10} />
                        <YAxis stroke="#64748B" fontSize={10} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1E293B', borderColor: 'rgba(100,116,139,0.3)', borderRadius: '12px' }}
                          labelStyle={{ color: '#F8FAFC', fontFamily: 'monospace', fontSize: '11px' }}
                          itemStyle={{ fontSize: '11px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                        <Area type="monotone" dataKey="Wind Speed" stroke="#38BDF8" strokeWidth={2} fillOpacity={1} fill="url(#colorWind)" />
                        <Area type="monotone" dataKey="Wind Gusts" stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorGusts)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Visibility Miles Trend Chart */}
                <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-5 shadow-lg">
                  <h4 className="font-display text-xs font-semibold text-slate-300 mb-4 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-[#22C55E]" />
                    Forecast Visibility (SM)
                  </h4>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={trendChartData}
                        margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                        <XAxis dataKey="name" stroke="#64748B" fontSize={10} />
                        <YAxis stroke="#64748B" fontSize={10} domain={[0, 10]} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1E293B', borderColor: 'rgba(100,116,139,0.3)', borderRadius: '12px' }}
                          labelStyle={{ color: '#F8FAFC', fontFamily: 'monospace', fontSize: '11px' }}
                          itemStyle={{ fontSize: '11px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                        <Line type="monotone" dataKey="Visibility (SM)" stroke="#22C55E" strokeWidth={2.5} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

        </div>

        {/* Right Section: Category Card, TAF Timeline, Pilot Notes */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Flight Category Card */}
          <div className={`${sleekTheme.bgClass} border-2 ${sleekTheme.borderClass} rounded-3xl p-6 text-center shadow-xl transition-all`}>
            <h2 className={`text-5xl font-black ${sleekTheme.textClass} tracking-tighter mb-1`}>
              {metar.flightCategory.code}
            </h2>
            <p className="text-white font-bold text-sm sm:text-base">
              {metar.flightCategory.code === 'VFR' 
                ? 'Visual Flight Rules' 
                : metar.flightCategory.code === 'MVFR' 
                  ? 'Marginal Visual Flight Rules' 
                  : metar.flightCategory.code === 'IFR' 
                    ? 'Instrument Flight Rules' 
                    : 'Low Instrument Flight Rules'}
            </p>
            <div className={`mt-4 pt-4 border-t ${sleekTheme.borderClass}/30`}>
              <p className={`text-[11px] ${sleekTheme.textClass} leading-snug uppercase tracking-wider font-semibold`}>
                {metar.flightCategory.explanation.split(': ')[1] || metar.flightCategory.explanation}
              </p>
            </div>
          </div>

          {/* TAF Timeline Panel */}
          <div className="flex-1 bg-slate-900/30 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between gap-4">
            <div>
              <h3 className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-4">
                Forecast (TAF) Timeline
              </h3>
              
              {taf ? (
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {taf.periods.map((p, index) => {
                    const periodTheme = getCategorySleekTheme(p.flightCategory.code);
                    return (
                      <div 
                        key={index} 
                        className="bg-[#1E293B] rounded-xl p-3 border-l-4 transition-all hover:translate-x-1"
                        style={{ borderLeftColor: periodTheme.color }}
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-mono text-[#38BDF8] font-bold uppercase">
                            {p.type} &bull; {p.timeStart.replace('Day ', 'D')}
                          </span>
                          <span 
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono"
                            style={{ backgroundColor: `${periodTheme.color}20`, color: periodTheme.color }}
                          >
                            {p.flightCategory.code}
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 mt-1.5 leading-normal">
                          {p.summary}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono mt-1.5 line-clamp-1 truncate" title={p.rawText}>
                          {p.rawText}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-[#1E293B] rounded-xl p-4 text-center border border-slate-800">
                  <p className="text-xs text-slate-500 italic">No forecast TAF available for {metar.icao}</p>
                </div>
              )}
            </div>

            {/* Pilot Notes Panel */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                Pilot Briefing Note
              </h4>
              <div className="bg-[#0A0F1E] rounded-lg p-3 text-[11px] text-slate-400 italic">
                {metar.temperature.fogRisk 
                  ? `Active Fog Alert: Temp-dewpoint spread is ${metar.temperature.spreadC}°C. High probability of visibility drops below VFR minimums tonight.`
                  : `Current dewpoint spread (${metar.temperature.spreadC}°C) is healthy. Monitor for radiation fog if surface temp drops rapidly.`}
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* Sticky Footer */}
      <footer className="mt-6 flex flex-col md:flex-row justify-between items-center text-[10px] sm:text-[11px] text-slate-500 shrink-0 border-t border-slate-800/50 pt-4 gap-2">
        <div className="flex gap-4 font-mono">
          <span>VFR MINIMUMS: 3SM / 1000' AGL</span>
          <span className="text-slate-700">|</span>
          <span>SOURCE: NOAA AVIATION WEATHER CENTER</span>
        </div>
        <p className="text-center md:text-right">
          Built for Student Pilots by <span className="text-[#38BDF8]">SkyBrief Engineering</span> &bull; Purdue Aerospace Portfolio
        </p>
      </footer>

    </div>
  );
}
