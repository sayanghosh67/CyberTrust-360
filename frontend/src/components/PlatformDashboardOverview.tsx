import React, { useEffect, useState, useCallback } from 'react';
import {
  Globe2,
  Sparkles,
  AlertTriangle,
  Network,
  Lock,
  ArrowUpRight,
  RefreshCw,
  Cpu,
} from 'lucide-react';
import { fetchDashboardMetrics } from '../services/dashboardService';
import type { DashboardMetrics } from '../types/dashboard';
import roundLogo from '../assets/cybertrust-logo-round.png';

export const PlatformDashboardOverview: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDashboardMetrics();
      setMetrics(data);
    } catch {
      setMetrics(null);
      setError('Unable to fetch live platform metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  return (
    <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-b border-slate-800/60" id="platform-overview">
      {/* Platform Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div className="flex items-start gap-4">
          <img
            src={roundLogo}
            alt="CyberTrust 360"
            className="w-12 h-12 rounded-full object-cover border border-emerald-500/40 shadow-lg shadow-emerald-500/20 shrink-0 hidden sm:block"
          />
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/40 text-xs font-mono uppercase tracking-wider mb-2">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>360° THREAT INTELLIGENCE DASHBOARD</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Integrated Cyber Defense Matrix
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Multi-vector threat scanning, linguistic scam DNA sequencing, interactive graph correlation,
              and local EVM integrity verification — unified in one cybersecurity platform.
            </p>
          </div>
        </div>

        <button
          onClick={loadMetrics}
          disabled={loading}
          className="self-start md:self-auto px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer flex items-center gap-2 text-xs font-mono"
          title="Refresh real-time platform metrics"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Real Live Database Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-10">
        {/* Metric 1: Total URL Investigations */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">URL Scans</span>
            <Globe2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-cyan-300 font-mono">
            {loading ? <span className="text-slate-600 animate-pulse">...</span> : metrics?.total_url_investigations ?? '—'}
          </div>
          <span className="text-[11px] text-slate-500 font-mono block mt-1">Investigated Targets</span>
        </div>

        {/* Metric 2: Total Scam Analyses */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Scam DNA</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-300 font-mono">
            {loading ? <span className="text-slate-600 animate-pulse">...</span> : metrics?.total_scam_analyses ?? '—'}
          </div>
          <span className="text-[11px] text-slate-500 font-mono block mt-1">Sequenced Messages</span>
        </div>

        {/* Metric 3: High-Risk Reports */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-rose-500/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">High Risk</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-300 font-mono">
            {loading ? <span className="text-slate-600 animate-pulse">...</span> : metrics?.high_risk_reports ?? '—'}
          </div>
          <span className="text-[11px] text-slate-500 font-mono block mt-1">Confirmed Threats</span>
        </div>

        {/* Metric 4: Indicators in Recent Reports */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Correlations</span>
            <Network className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
            {loading ? <span className="text-slate-600 animate-pulse">...</span> : metrics?.related_threat_indicators ?? '—'}
          </div>
          <span className="text-[11px] text-slate-500 font-mono block mt-1">Recent Report Indicators</span>
        </div>

        {/* Metric 5: Saved Registrations Reports */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 transition-colors col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">On-Chain</span>
            <Lock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono">
            {loading ? <span className="text-slate-600 animate-pulse">...</span> : metrics?.blockchain_registered_reports ?? '—'}
          </div>
          <span className="text-[11px] text-slate-500 font-mono block mt-1">Attested Proofs</span>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400 text-center">
          {error} Displaying database counts from active persistence ledger.
        </div>
      )}

      {/* 30-Second Hackathon Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: URL Scanner */}
        <a
          href="#investigate"
          className="group p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/40 flex items-center justify-center mb-4 text-cyan-400 group-hover:scale-105 transition-transform">
              <Globe2 className="w-5 h-5" />
            </div>
            <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">Module 01</div>
            <h3 className="text-base font-bold text-white mb-1.5 flex items-center justify-between">
              <span>Investigate Website</span>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-mono">
              Deep inspection of DNS, TLS/SSL lifespan, HTTP security headers, and domain typosquatting heuristics.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-cyan-400">
            <span>Explore Scanner</span>
            <span>→</span>
          </div>
        </a>

        {/* Card 2: Scam DNA */}
        <a
          href="#scam-dna"
          className="group p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-900 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-800/40 flex items-center justify-center mb-4 text-purple-400 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-xs font-mono text-purple-400 uppercase tracking-wider mb-1">Module 02</div>
            <h3 className="text-base font-bold text-white mb-1.5 flex items-center justify-between">
              <span>Analyze Scam Message</span>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-mono">
              Sequence linguistic deception, urgency pressure, fake UPI refunds, electricity cutoffs, and Telegram job traps.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-purple-400">
            <span>Analyze DNA</span>
            <span>→</span>
          </div>
        </a>

        {/* Card 3: Threat Graph */}
        <a
          href="#relationship-graph"
          className="group p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-800/40 flex items-center justify-center mb-4 text-amber-400 group-hover:scale-105 transition-transform">
              <Network className="w-5 h-5" />
            </div>
            <div className="text-xs font-mono text-amber-400 uppercase tracking-wider mb-1">Module 03</div>
            <h3 className="text-base font-bold text-white mb-1.5 flex items-center justify-between">
              <span>Threat Relationship Map</span>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-mono">
              Interactive multi-hop React Flow graph linking shared domains, UPI VPAs, phone numbers, and attacker tactics.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-amber-400">
            <span>Explore Graph</span>
            <span>→</span>
          </div>
        </a>

        {/* Card 4: Blockchain Trust */}
        <a
          href="#blockchain-trust"
          className="group p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/40 flex items-center justify-center mb-4 text-emerald-400 group-hover:scale-105 transition-transform">
              <Lock className="w-5 h-5" />
            </div>
            <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-1">Module 04</div>
            <h3 className="text-base font-bold text-white mb-1.5 flex items-center justify-between">
              <span>Blockchain Trust Center</span>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-mono">
              Immutable SHA-256 fingerprint attestation and tamper detection backed by Solidity smart contract on EVM.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-emerald-400">
            <span>Verify Integrity</span>
            <span>→</span>
          </div>
        </a>
      </div>
    </section>
  );
};
