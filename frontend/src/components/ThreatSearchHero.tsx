import React, { useState } from 'react';
import { Globe, ShieldAlert, Sparkles, Lock } from 'lucide-react';

export const ThreatSearchHero: React.FC = () => {
  const [urlInput, setUrlInput] = useState('');

  return (
    <div className="relative overflow-hidden pt-12 pb-16">
      {/* Decorative gradient glow background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-cyan-600/10 via-indigo-600/10 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        {/* Technix Pro Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700/80 text-slate-300 text-xs font-mono mb-6 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>TECHNIX PRO ENGINEERING</span>
          <span className="text-slate-500">•</span>
          <span className="text-cyan-400 font-semibold">FOUNDATION PHASE</span>
        </div>

        {/* Project Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight mb-4">
          AI-Powered Web Threat Detection &amp;{' '}
          <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
            Digital Trust Intelligence
          </span>
        </h1>

        {/* Short Project Description */}
        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          CyberTrust 360 delivers proactive URL security assessment, deceptive infrastructure identification,
          and verifiable trust intelligence to protect users and enterprises from modern web threats.
        </p>

        {/* URL Input Form Container */}
        <div className="max-w-2xl mx-auto bg-slate-900/90 border border-slate-700/80 rounded-2xl p-2.5 sm:p-3 shadow-2xl shadow-black/60 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative w-full flex items-center">
              <div className="absolute left-3.5 text-slate-500 pointer-events-none">
                <Globe className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Enter suspicious URL or domain (e.g., https://secure-login-portal.net)..."
                className="w-full pl-11 pr-4 py-3 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all font-mono"
              />
            </div>

            {/* Disabled Coming Soon Button */}
            <button
              disabled
              type="button"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-sm font-semibold flex items-center justify-center gap-2 cursor-not-allowed opacity-90 transition-all whitespace-nowrap shadow-inner"
              title="URL Investigation Engine will be activated in Phase 2"
            >
              <Lock className="w-4 h-4 text-slate-400" />
              <span>Investigate (Phase 2)</span>
            </button>
          </div>

          {/* Transparent Notice */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 px-2 flex-wrap gap-2">
            <span className="flex items-center gap-1.5 text-amber-400/90 font-medium">
              <ShieldAlert className="w-3.5 h-3.5" />
              Safe Mode: Live threat scanning is deactivated during Phase 1 Foundation.
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              Engine: Ready for Phase 2 Integration
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
