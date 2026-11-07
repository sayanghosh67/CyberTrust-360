import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Network,
  Lock,
  ArrowRight,
  Globe2,
  X,
} from 'lucide-react';

interface OpeningPageProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OpeningPage: React.FC<OpeningPageProps> = ({ isOpen, onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleEnter();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEnter = () => {
    if (dontShowAgain) {
      localStorage.setItem('cybertrust_hide_opening_screen', 'true');
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4 sm:p-6 overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to CyberTrust 360"
    >
      {/* Background Atmospheric Cyber Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/40 via-slate-950/80 to-slate-950 pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a15_1px,transparent_1px),linear-gradient(to_bottom,#0f172a15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Main Modal Card */}
      <div className="relative w-full max-w-4xl bg-slate-900/90 border border-emerald-500/40 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-emerald-500/10 backdrop-blur-2xl my-auto text-center flex flex-col items-center">
        {/* Dismiss Button */}
        <button
          onClick={handleEnter}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
          aria-label="Close welcome screen"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Team & Brand Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/90 border border-emerald-500/50 text-emerald-400 text-xs font-mono font-bold tracking-wider uppercase mb-6 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>TECHNIX PRO PRESENTS</span>
        </div>

        {/* Hero Logo Emblem with Neon Orbit Ring */}
        <div className="relative mb-6 group">
          <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 blur-xl opacity-75 group-hover:opacity-100 transition duration-700 animate-pulse" />
          <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full p-1.5 bg-gradient-to-tr from-emerald-500 via-cyan-400 to-lime-400 shadow-2xl">
            <img
              src="/cybertrust-logo-round.png"
              alt="CyberTrust 360 Official Logo"
              className="w-full h-full object-cover rounded-full bg-slate-950"
            />
          </div>
        </div>

        {/* Horizontal Brand Logo */}
        <div className="mb-3 max-w-md w-full px-4 flex justify-center">
          <img
            src="/cybertrust-logo-horizontal.png"
            alt="CyberTrust 360"
            className="h-10 sm:h-12 object-contain filter drop-shadow-[0_2px_8px_rgba(16,185,129,0.3)]"
          />
        </div>

        {/* Tagline */}
        <h1 className="text-xl sm:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-cyan-200 to-lime-300 tracking-tight mb-2">
          Your Digital World. Protected from Every Angle.
        </h1>

        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed mb-8 font-mono">
          An AI-powered web threat detection and digital trust intelligence platform engineered to expose
          deceptive infrastructure, sequence manipulation DNA, and prove forensic integrity on-chain.
        </p>

        {/* Four Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 w-full mb-8 text-left">
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-emerald-500/40 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800/50 flex items-center justify-center text-emerald-400 mb-2">
              <Globe2 className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-white mb-0.5">URL Forensics</div>
            <p className="text-[11px] text-slate-400 font-mono leading-normal">
              DNS, TLS/SSL lifespan & HTTP security header analysis.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-purple-500/40 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-purple-950 border border-purple-800/50 flex items-center justify-center text-purple-400 mb-2">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-white mb-0.5">Scam DNA AI</div>
            <p className="text-[11px] text-slate-400 font-mono leading-normal">
              Sequences SMS, UPI & WhatsApp deception patterns.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-amber-500/40 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-amber-950 border border-amber-800/50 flex items-center justify-center text-amber-400 mb-2">
              <Network className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-white mb-0.5">Threat Graph</div>
            <p className="text-[11px] text-slate-400 font-mono leading-normal">
              Multi-hop React Flow correlation of burner domains & VPAs.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-cyan-500/40 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800/50 flex items-center justify-center text-cyan-400 mb-2">
              <Lock className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-white mb-0.5">Web3 Integrity</div>
            <p className="text-[11px] text-slate-400 font-mono leading-normal">
              Solidity registry attestation with instant tamper detection.
            </p>
          </div>
        </div>

        {/* Enter CTA & Preferences */}
        <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4 pt-4 border-t border-slate-800/80">
          <label className="flex items-center gap-2 text-xs text-slate-400 font-mono cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span>Do not show again on startup</span>
          </label>

          <button
            onClick={handleEnter}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold font-mono text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] cursor-pointer"
          >
            <span>Launch Platform</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
