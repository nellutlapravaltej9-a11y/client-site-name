import React from 'react';
import { Plane, Info, Search } from 'lucide-react';

interface NavbarProps {
  activeTab: 'home' | 'briefing' | 'about';
  setActiveTab: (tab: 'home' | 'briefing' | 'about') => void;
  hasBriefingData: boolean;
}

export default function Navbar({ activeTab, setActiveTab, hasBriefingData }: NavbarProps) {
  return (
    <header className="border-b border-slate-800 bg-[#0A0F1E]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo Section */}
        <button 
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-3 group focus:outline-none cursor-pointer"
          id="nav-logo-btn"
        >
          <div className="w-10 h-10 bg-[#38BDF8] rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-250">
            <Plane className="w-6 h-6 text-[#0A0F1E] rotate-45 transform" />
          </div>
          <div className="text-left">
            <span className="font-display font-bold text-lg tracking-wider text-slate-100 block leading-tight">
              SKY<span className="text-[#38BDF8] font-light">CLEAR</span>
            </span>
            <span className="hidden sm:block text-[9px] font-mono tracking-widest text-slate-500 uppercase">
              EFB Weather Briefing
            </span>
          </div>
        </button>

        {/* Navigation Actions */}
        <nav className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setActiveTab('home')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium tracking-wide transition-all cursor-pointer ${
              activeTab === 'home'
                ? 'bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] border border-transparent'
            }`}
            id="nav-home-btn"
          >
            <span className="flex items-center gap-1.5">
              <Search className="w-4 h-4" />
              Search
            </span>
          </button>

          {hasBriefingData && (
            <button
              onClick={() => setActiveTab('briefing')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium tracking-wide transition-all cursor-pointer ${
                activeTab === 'briefing'
                  ? 'bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] border border-transparent'
              }`}
              id="nav-briefing-btn"
            >
              <span className="flex items-center gap-1.5">
                <Plane className="w-4 h-4" />
                Weather Briefing
              </span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('about')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium tracking-wide transition-all cursor-pointer ${
              activeTab === 'about'
                ? 'bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] border border-transparent'
            }`}
            id="nav-about-btn"
          >
            <span className="flex items-center gap-1.5">
              <Info className="w-4 h-4" />
              About
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
}
