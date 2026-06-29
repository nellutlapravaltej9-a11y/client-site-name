import React from 'react';
import { Shield, Cpu, Globe, GraduationCap } from 'lucide-react';

export default function AboutView() {
  const techStack = [
    { category: 'Frontend', items: ['React 19', 'Vite 6', 'TypeScript', 'Tailwind CSS v4'] },
    { category: 'Data & Charts', items: ['Recharts (Wind/Vis Trends)', 'AviationWeather.gov API'] },
    { category: 'Design', items: ['EFB Glass-Cockpit Aesthetic', 'Lucide-React Vectors'] }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 animate-fade-in" id="about-view-container">
      {/* Title */}
      <div className="border-b border-slate-800 pb-6 mb-10">
        <h2 className="font-display text-3xl font-bold tracking-tight text-white mb-2">
          About SkyBrief
        </h2>
        <p className="text-slate-400 font-mono text-xs uppercase tracking-widest">
          Aviation Weather Briefing Tool Project &amp; Portfolio
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Biography Panel */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-6 shadow-xl">
            <h3 className="font-display text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[#38BDF8]" />
              Developer &amp; Aviator Biography
            </h3>
            <p className="text-slate-300 leading-relaxed text-sm mb-4">
              SkyBrief was built by <strong className="text-white font-medium">Nellutla Pravaltej</strong>, a student pilot and aspiring aerospace engineer, to make complex aviation weather reports accessible for pilots at every training level.
            </p>
            <p className="text-slate-300 leading-relaxed text-sm mb-4">
              During flight planning, pilots are required to decode METAR observations and TAF forecasts to evaluate if weather conditions meet safe VFR or IFR thresholds. Standard code strings can be error-prone and tedious to translate manually in the cockpit. SkyBrief instantly decodes raw codes into precise plain English variables, reducing cognitive load and enhancing situational awareness.
            </p>
            <p className="text-slate-400 font-mono text-xs italic border-l-2 border-[#38BDF8] pl-3 py-1 bg-slate-900/10">
              Part of my engineering portfolio — applying to Purdue, MIT, and Stanford.
            </p>
          </div>

          <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-6 shadow-xl">
            <h3 className="font-display text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[#38BDF8]" />
              Engineering Philosophy &amp; Features
            </h3>
            <ul className="space-y-3 text-slate-300 text-sm">
              <li className="flex gap-3">
                <span className="font-mono text-[#38BDF8] font-bold">01 /</span>
                <div>
                  <strong className="text-slate-200">Rule-Based Decoder:</strong> A fully responsive client-side algorithm parsing raw METAR strings to classify wind vectors, calculate dewpoint spread/fog probability, and identify clouds.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-[#38BDF8] font-bold">02 /</span>
                <div>
                  <strong className="text-slate-200">Horizontal TAF Timeline:</strong> Grouping forecast updates chronologically into scrollable steps, parsing specific TEMPO, BECMG, and PROB periods to track flight category degradation.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-[#38BDF8] font-bold">03 /</span>
                <div>
                  <strong className="text-slate-200">Visual Trend Lines:</strong> Interfacing with Recharts to plot wind velocities, gusts, and visibility miles over a 24-to-30-hour forecast horizon for proactive flight routing.
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Tech Stack & Metadata Sidebar */}
        <div className="space-y-6">
          <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-6 shadow-xl">
            <h3 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-4.5 h-4.5 text-[#38BDF8]" />
              Tech Stack
            </h3>
            
            <div className="space-y-4">
              {techStack.map((group) => (
                <div key={group.category}>
                  <p className="text-slate-500 font-mono text-[10px] uppercase tracking-wider mb-1.5 font-bold">
                    {group.category}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map((item) => (
                      <span 
                        key={item} 
                        className="px-2.5 py-1 bg-slate-900/40 text-slate-300 rounded-lg text-xs border border-slate-700/30"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-6 shadow-xl">
            <h3 className="font-display text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Globe className="w-4.5 h-4.5 text-[#38BDF8]" />
              Project Context
            </h3>
            <div className="space-y-3.5 text-xs font-mono text-slate-400">
              <div>
                <p className="text-slate-500 uppercase text-[10px] tracking-wider font-semibold">Repository</p>
                <span className="text-slate-200 hover:text-[#38BDF8] transition-colors cursor-pointer block mt-0.5">
                  github.com/nellutlapravaltej9/skyclear
                </span>
              </div>
              <div>
                <p className="text-slate-500 uppercase text-[10px] tracking-wider font-semibold">Target Domain</p>
                <p className="text-slate-200 mt-0.5">Aerospace Flight Briefings</p>
              </div>
              <div>
                <p className="text-slate-500 uppercase text-[10px] tracking-wider font-semibold">Environment</p>
                <p className="text-slate-200 mt-0.5">Vercel Deploy-Ready</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
