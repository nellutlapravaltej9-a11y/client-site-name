import React from 'react';

export default function SkeletonLoader() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-pulse" id="skeleton-loader-container">
      
      {/* Top Header Placeholder */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-[#1E293B] rounded-lg"></div>
          <div className="h-4 w-40 bg-[#1E293B] rounded-md"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-[#1E293B] rounded-lg"></div>
          <div className="h-10 w-32 bg-[#1E293B] rounded-lg"></div>
        </div>
      </div>

      {/* Raw Monospace Blocks */}
      <div className="space-y-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-2.5">
          <div className="h-3 w-28 bg-[#1E293B] rounded font-mono"></div>
          <div className="h-5 w-full bg-[#1E293B] rounded-md"></div>
        </div>
      </div>

      {/* Primary 3-Column Cockpit Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* Main Content (Grid) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Plain English Paragraph Summary */}
          <div className="bg-sky-900/10 border-l-4 border-[#38BDF8] rounded-r-2xl p-6 space-y-3">
            <div className="h-4 w-44 bg-[#1E293B] rounded"></div>
            <div className="h-4 w-full bg-[#1E293B] rounded"></div>
            <div className="h-4 w-full bg-[#1E293B] rounded"></div>
            <div className="h-4 w-3/4 bg-[#1E293B] rounded"></div>
          </div>

          {/* METAR Cards Grid */}
          <div>
            <div className="h-5 w-44 bg-[#1E293B] rounded-md mb-4"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-5 h-[140px] flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-24 bg-slate-800 rounded"></div>
                    <div className="h-5 w-5 bg-slate-800 rounded-full"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-7 w-32 bg-slate-800 rounded"></div>
                    <div className="h-3.5 w-full bg-slate-800 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Static Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#1E293B]/40 border border-slate-700/50 rounded-2xl p-6 space-y-4">
            <div className="h-5 w-32 bg-slate-800 rounded"></div>
            <div className="space-y-2">
              <div className="h-3.5 w-full bg-slate-800 rounded"></div>
              <div className="h-3.5 w-full bg-slate-800 rounded"></div>
              <div className="h-3.5 w-5/6 bg-slate-800 rounded"></div>
            </div>
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <div className="h-4 w-40 bg-slate-800 rounded"></div>
              <div className="h-3.5 w-full bg-slate-800 rounded"></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
