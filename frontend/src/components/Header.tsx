import React from 'react';
import { Shield, Activity, RefreshCw } from 'lucide-react';
import type { ConnectionStatus } from '../types/health';

interface HeaderProps {
  status: ConnectionStatus;
  latencyMs: number | null;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({ status, latencyMs, onRefresh }) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-600/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Backend Online {latencyMs ? `(${latencyMs}ms)` : ''}
          </span>
        );
      case 'degraded':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-600/40">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            Backend Degraded (DB Offline)
          </span>
        );
      case 'checking':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-950/80 text-sky-400 border border-sky-600/40">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Connecting...
          </span>
        );
      case 'disconnected':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-400 border border-rose-600/40">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            Backend Offline
          </span>
        );
    }
  };

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-950/50">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-white text-lg">CyberTrust 360</span>
              <span className="text-[10px] tracking-wider uppercase font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Phase 1 MVP
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              Developed by <span className="text-slate-200 font-semibold">TECHNIX PRO</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {getStatusBadge()}
          <button
            onClick={onRefresh}
            title="Check backend status"
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800 transition-colors"
          >
            <Activity className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
