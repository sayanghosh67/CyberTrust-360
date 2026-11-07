import React, { useState, useEffect } from 'react';
import { Globe, Sparkles, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

interface ThreatSearchHeroProps {
  onInvestigate: (url: string) => Promise<void>;
  isScanning: boolean;
  error: string | null;
}

const PRESET_URLS = [
  { label: 'example.com', desc: 'Benign standard', url: 'https://example.com' },
  { label: 'wikipedia.org', desc: 'Benign enterprise', url: 'https://wikipedia.org' },
  { label: 'paypa1-login.com', desc: 'Typosquatting', url: 'https://paypa1-account-login-update.com' },
  { label: 'paypal.com.account.xyz', desc: 'Subdomain Phish', url: 'https://paypal.com.account-update.xyz' },
];

export const ThreatSearchHero: React.FC<ThreatSearchHeroProps> = ({
  onInvestigate,
  isScanning,
  error,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [progressStep, setProgressStep] = useState(0);

  const scanSteps = [
    'Parsing & verifying URL structure...',
    'Resolving authoritative DNS records...',
    'Inspecting SSL/TLS certificate validity & ciphers...',
    'Auditing HTTP security headers & redirect hops...',
    'Evaluating multi-vector threat signals & trust score...',
  ];

  useEffect(() => {
    let timer: any;
    if (isScanning) {
      setProgressStep(0);
      timer = setInterval(() => {
        setProgressStep((prev) => (prev < scanSteps.length - 1 ? prev + 1 : prev));
      }, 700);
    } else {
      setProgressStep(0);
    }
    return () => clearInterval(timer);
  }, [isScanning]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed || isScanning) return;
    onInvestigate(trimmed);
  };

  const handleSelectPreset = (url: string) => {
    setUrlInput(url);
    if (!isScanning) {
      onInvestigate(url);
    }
  };

  return (
    <div className="relative overflow-hidden pt-8 pb-12">
      {/* Decorative gradient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[380px] bg-gradient-to-tr from-cyan-600/10 via-indigo-600/15 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        {/* Technix Pro Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700/80 text-slate-300 text-xs font-mono mb-4 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>TECHNIX PRO</span>
          <span className="text-slate-500">•</span>
          <span className="text-cyan-400 font-semibold">PHASE 2 INVESTIGATION ENGINE</span>
        </div>

        {/* Project Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight mb-4">
          AI-Powered Web Threat Detection &amp;{' '}
          <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
            Digital Trust Intelligence
          </span>
        </h1>

        {/* Short Project Description */}
        <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed font-normal">
          Inspect suspicious domains, typosquatting, deceptive infrastructure, SSL/TLS integrity,
          and security headers with instant explainable trust telemetry.
        </p>

        {/* URL Input Form Container */}
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-slate-900/90 border border-slate-700/80 rounded-2xl p-2.5 sm:p-3 shadow-2xl shadow-black/60 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative w-full flex items-center">
              <div className="absolute left-3.5 text-slate-500 pointer-events-none">
                <Globe className="w-5 h-5 text-cyan-400" />
              </div>
              <input
                type="text"
                disabled={isScanning}
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Enter URL or domain (e.g. example.com, paypa1-login.com)..."
                className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all font-mono"
              />
            </div>

            {/* Active Investigate Button */}
            <button
              type="submit"
              disabled={isScanning || !urlInput.trim()}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all whitespace-nowrap shadow-md cursor-pointer ${
                isScanning
                  ? 'bg-cyan-950/70 border border-cyan-700/40 text-cyan-300 cursor-wait'
                  : !urlInput.trim()
                  ? 'bg-slate-800 border border-slate-700 text-slate-400 cursor-not-allowed opacity-75'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold hover:shadow-cyan-500/25'
              }`}
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Investigating...</span>
                </>
              ) : (
                <>
                  <span>Investigate</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Real-time Scanning Progress Ticker */}
          {isScanning && (
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs text-cyan-300 animate-pulse font-mono">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>{scanSteps[progressStep]}</span>
            </div>
          )}

          {/* Error Message Notice */}
          {error && (
            <div className="mt-3 pt-2.5 border-t border-rose-900/50 flex items-center gap-2 text-xs text-rose-300 text-left px-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Preset Buttons */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 px-2 flex-wrap gap-2">
            <span className="text-slate-400 text-[11px] font-mono">1-Click Test Targets:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {PRESET_URLS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleSelectPreset(p.url)}
                  disabled={isScanning}
                  className="px-2 py-0.5 rounded bg-slate-800/90 hover:bg-slate-700 text-[11px] font-mono text-cyan-300 hover:text-white border border-slate-700/60 transition-colors"
                  title={`${p.desc} (${p.url})`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
