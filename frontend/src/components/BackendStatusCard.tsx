import React from 'react';
import { Server, Database, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Radio } from 'lucide-react';
import type { HealthState } from '../types/health';
import { API_BASE_URL } from '../services/api';

interface BackendStatusCardProps {
  healthState: HealthState;
  onRefresh: () => void;
}

export const BackendStatusCard: React.FC<BackendStatusCardProps> = ({ healthState, onRefresh }) => {
  const { status, data, error, latencyMs, lastChecked } = healthState;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-12">
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800/80 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/70 border border-cyan-800/40 text-cyan-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                Phase 1 Connectivity &amp; Infrastructure
                <span className="text-[11px] font-mono font-normal text-slate-400">
                  (Health Check Protocol)
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Target Endpoint: <span className="text-cyan-300">{API_BASE_URL}/api/health</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${status === 'checking' ? 'animate-spin text-cyan-400' : ''}`} />
              Re-check Health
            </button>
          </div>
        </div>

        {/* Status Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          {/* FastAPI Core */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">FastAPI Gateway</span>
              {status === 'connected' || status === 'degraded' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : status === 'checking' ? (
                <Radio className="w-4 h-4 text-sky-400 animate-pulse" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400" />
              )}
            </div>
            <div className="text-lg font-bold text-white capitalize">
              {status === 'checking' ? 'Verifying...' : status === 'disconnected' ? 'Offline' : data?.status || 'Online'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {data ? `v${data.version} • ${data.environment}` : 'Waiting for backend response'}
            </p>
          </div>

          {/* Database Connectivity */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                PostgreSQL Engine
              </span>
              {data?.database.status === 'connected' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div className="text-lg font-bold text-white capitalize">
              {data?.database.status || 'Standby'}
            </div>
            <p className="text-xs text-slate-500 mt-1 truncate" title={data?.database.message || 'Configured via SQLAlchemy'}>
              {data?.database.message || 'SQLAlchemy engine ready'}
            </p>
          </div>

          {/* Telemetry / Latency */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">Roundtrip Latency</span>
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            </div>
            <div className="text-lg font-bold text-white font-mono">
              {latencyMs !== null ? `${latencyMs} ms` : '—'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Last check: {lastChecked ? lastChecked.toLocaleTimeString() : 'Never'}
            </p>
          </div>
        </div>

        {/* Error notice if disconnected */}
        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-start gap-3">
            <XCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-rose-300">Backend Communication Issue</p>
              <p className="text-rose-400/90 font-mono mt-0.5">{error}</p>
              <p className="text-slate-400 mt-1.5">
                Ensure the backend is running with:{' '}
                <code className="text-cyan-300 bg-slate-900 px-1.5 py-0.5 rounded font-mono">
                  uvicorn backend.app.main:app --reload --port 8000
                </code>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
