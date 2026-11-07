import React, { useState } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Globe,
  Server,
  Activity,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Info,
  Clock,
  Layers,
  HelpCircle,
  Network,
} from 'lucide-react';
import type { ScanResponse, RiskClassification, IndicatorSeverity } from '../types/scan';

interface InvestigationReportProps {
  report: ScanResponse;
  onNewScanClick?: () => void;
  onExploreGraph?: (query: string) => void;
  onVerifyBlockchain?: (reportId: string) => void;
}

export const InvestigationReport: React.FC<InvestigationReportProps> = ({ report, onExploreGraph, onVerifyBlockchain }) => {
  const [activeTab, setActiveTab] = useState<'indicators' | 'ssl' | 'headers' | 'dns' | 'intel'>('indicators');

  const getRiskTheme = (risk: RiskClassification) => {
    switch (risk) {
      case 'Confirmed Malicious':
        return {
          bg: 'bg-rose-950/40',
          border: 'border-rose-600/60',
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          accent: 'text-rose-400',
          gauge: 'bg-rose-500',
          icon: <ShieldAlert className="w-8 h-8 text-rose-400" />,
        };
      case 'High Risk':
        return {
          bg: 'bg-orange-950/40',
          border: 'border-orange-600/60',
          badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
          accent: 'text-orange-400',
          gauge: 'bg-orange-500',
          icon: <AlertTriangle className="w-8 h-8 text-orange-400" />,
        };
      case 'Suspicious':
        return {
          bg: 'bg-amber-950/40',
          border: 'border-amber-600/60',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          accent: 'text-amber-400',
          gauge: 'bg-amber-500',
          icon: <AlertTriangle className="w-8 h-8 text-amber-400" />,
        };
      case 'Inconclusive':
        return {
          bg: 'bg-slate-900/60',
          border: 'border-slate-700',
          badge: 'bg-slate-800 text-slate-300 border-slate-700',
          accent: 'text-slate-400',
          gauge: 'bg-slate-500',
          icon: <HelpCircle className="w-8 h-8 text-slate-400" />,
        };
      case 'Low Risk':
      default:
        return {
          bg: 'bg-emerald-950/30',
          border: 'border-emerald-600/50',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          accent: 'text-emerald-400',
          gauge: 'bg-emerald-500',
          icon: <ShieldCheck className="w-8 h-8 text-emerald-400" />,
        };
    }
  };

  const getSeverityBadge = (severity: IndicatorSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'high':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'medium':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'low':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      case 'info':
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const theme = getRiskTheme(report.risk_classification);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-16 animate-fadeIn">
      {/* 1. Executive Verdict Card */}
      <div className={`rounded-2xl border ${theme.border} ${theme.bg} p-6 sm:p-8 backdrop-blur-md shadow-2xl mb-8 relative overflow-hidden`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
          <div className="flex items-start sm:items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-xl shrink-0">
              {theme.icon}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${theme.badge}`}>
                  {report.risk_classification}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Confidence: <strong className="text-slate-200">{report.confidence}</strong>
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(report.created_at).toLocaleTimeString()}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5 break-all font-mono">
                {report.hostname}
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5 break-all">
                Target URL: <span className="text-cyan-300">{report.url}</span>
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                {onExploreGraph && (
                  <a
                    href="#relationship-graph"
                    onClick={() => onExploreGraph(report.registered_domain || report.hostname)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/70 text-cyan-300 border border-cyan-800/60 text-xs font-mono transition-colors"
                  >
                    <Network className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Explore in Threat Graph</span>
                  </a>
                )}
                {onVerifyBlockchain && (
                  <a
                    href="#blockchain-trust"
                    onClick={() => onVerifyBlockchain(report.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 hover:border-cyan-500/50 text-xs font-mono transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Verify on Blockchain</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Risk Score Meter */}
          <div className="flex items-center gap-4 self-end md:self-auto bg-slate-950/80 border border-slate-800 rounded-2xl px-6 py-4 shadow-lg shrink-0">
            <div className="text-right">
              <div className="text-xs text-slate-400 font-mono uppercase tracking-wider">Threat Score</div>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-white">
                <span className={theme.accent}>{report.risk_score}</span>
                <span className="text-slate-600 text-xl font-normal">/100</span>
              </div>
            </div>
            <div className="w-14 h-14 rounded-full border-4 border-slate-800 flex items-center justify-center relative">
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-xs ${theme.badge}`}
              >
                {report.risk_score}%
              </div>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="mt-5">
          <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal">
            {report.summary}
          </p>
        </div>

        {/* Actionable Recommendations Checklist */}
        {report.recommended_actions && report.recommended_actions.length > 0 && (
          <div className="mt-6 p-4 rounded-xl bg-slate-950/80 border border-slate-800/90">
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              Recommended Security Actions:
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {report.recommended_actions.map((act, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 2. Detailed Forensic Tabs */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
        {/* Navigation Tab Bar */}
        <div className="flex border-b border-slate-800 overflow-x-auto bg-slate-950/60 p-1.5 gap-1">
          <button
            onClick={() => setActiveTab('indicators')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'indicators'
                ? 'bg-slate-800 text-cyan-300 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Activity className="w-4 h-4 text-cyan-400" />
            Detected Indicators
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
              {report.indicators.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ssl')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'ssl'
                ? 'bg-slate-800 text-cyan-300 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Lock className="w-4 h-4 text-cyan-400" />
            SSL/TLS Certificate
            {report.ssl_analysis.valid ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('headers')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'headers'
                ? 'bg-slate-800 text-cyan-300 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Server className="w-4 h-4 text-cyan-400" />
            Security Headers
            {report.headers_analysis.missing_headers.length === 0 ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <span className="text-[10px] text-amber-400">
                ({report.headers_analysis.missing_headers.length} missing)
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('dns')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'dns'
                ? 'bg-slate-800 text-cyan-300 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Globe className="w-4 h-4 text-cyan-400" />
            DNS Infrastructure
          </button>

          <button
            onClick={() => setActiveTab('intel')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'intel'
                ? 'bg-slate-800 text-cyan-300 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            Threat Intelligence
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="p-6">
          {/* TAB 1: DETECTED INDICATORS */}
          {activeTab === 'indicators' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Forensic Threat Indicators ({report.indicators.length})
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  Multi-vector heuristic signals
                </span>
              </div>

              {report.indicators.length === 0 ? (
                <div className="text-center py-10 bg-slate-950/60 rounded-xl border border-slate-800">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-300 font-medium">No suspicious threat indicators identified</p>
                  <p className="text-xs text-slate-500 mt-1">Target adheres to baseline structural and configuration safety checks.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {report.indicators.map((ind, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                        <span className="text-sm font-bold text-white flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          {ind.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {ind.category}
                          </span>
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getSeverityBadge(
                              ind.severity
                            )}`}
                          >
                            {ind.severity}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300">{ind.description}</p>
                      <div className="mt-2 text-[11px] font-mono text-slate-400 bg-slate-900/90 p-2 rounded border border-slate-800/80 break-all">
                        <strong className="text-slate-500">Evidence: </strong>
                        <span className="text-cyan-300">{ind.technical_evidence}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SSL/TLS CERTIFICATE */}
          {activeTab === 'ssl' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  SSL/TLS Security Analysis
                </h3>
                <span className="text-xs text-slate-400 font-mono">Port 443 Transport Layer</span>
              </div>

              {!report.ssl_analysis.https_available ? (
                <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/50 text-xs text-rose-300">
                  <p className="font-semibold text-sm mb-1">HTTPS Unavailable</p>
                  <p>{report.ssl_analysis.error_message || 'Target did not accept TLS connection on port 443.'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                      <span className="text-slate-400">Validity State</span>
                      {report.ssl_analysis.valid ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Valid &amp; Trusted
                        </span>
                      ) : (
                        <span className="text-rose-400 font-bold flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Invalid / Flagged
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Days to Expiration</span>
                      <span className="text-slate-200 font-mono font-bold">
                        {report.ssl_analysis.days_remaining !== null ? `${report.ssl_analysis.days_remaining} days` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Protocol Version</span>
                      <span className="text-cyan-300 font-mono">{report.ssl_analysis.protocol || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Negotiated Cipher</span>
                      <span className="text-slate-300 font-mono text-[11px] truncate max-w-[200px]" title={report.ssl_analysis.cipher || ''}>
                        {report.ssl_analysis.cipher || 'Standard'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5 text-xs">
                    <div className="pb-2 border-b border-slate-800">
                      <span className="text-slate-400 block mb-1">Certificate Issuer</span>
                      <span className="text-white font-mono font-semibold">
                        {report.ssl_analysis.issuer.organization || report.ssl_analysis.issuer.common_name || 'Generic / Self-Signed'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Common Name (CN)</span>
                      <span className="text-cyan-300 font-mono">
                        {report.ssl_analysis.subject.common_name || report.hostname}
                      </span>
                    </div>
                    {report.ssl_analysis.subject.alt_names && report.ssl_analysis.subject.alt_names.length > 0 && (
                      <div>
                        <span className="text-slate-400 block mb-1">Subject Alt Names (SANs)</span>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                          {report.ssl_analysis.subject.alt_names.slice(0, 6).map((san, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300">
                              {san}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SECURITY HEADERS */}
          {activeTab === 'headers' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-cyan-400" />
                  HTTP Security Headers &amp; Redirection Audit
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  HTTP {report.headers_analysis.status_code || 'N/A'} • Server: {report.headers_analysis.server || 'Undisclosed'}
                </span>
              </div>

              {/* Redirect Chain Inspection */}
              {report.headers_analysis.redirect_count > 0 && (
                <div className="mb-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <span className="text-slate-400 font-mono block mb-1">
                    Redirection Chain ({report.headers_analysis.redirect_count} hop(s)):
                  </span>
                  <div className="space-y-1 font-mono text-[11px]">
                    {report.headers_analysis.redirect_chain.map((url, i) => (
                      <div key={i} className="flex items-center gap-2 text-slate-300">
                        <span className="text-cyan-400">[{i}]</span>
                        <span className="truncate">{url}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Security Header Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className={`p-3.5 rounded-xl border ${report.headers_analysis.hsts_present ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-slate-950 border-slate-800'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white">Strict-Transport-Security</span>
                    {report.headers_analysis.hsts_present ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Present</span>
                    ) : (
                      <span className="text-slate-500 font-mono">Missing</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">Enforces HTTPS and shields against protocol downgrade attacks.</p>
                </div>

                <div className={`p-3.5 rounded-xl border ${report.headers_analysis.csp_present ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-slate-950 border-slate-800'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white">Content-Security-Policy</span>
                    {report.headers_analysis.csp_present ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Present</span>
                    ) : (
                      <span className="text-slate-500 font-mono">Missing</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">Restricts unauthorized script injection and XSS exploits.</p>
                </div>

                <div className={`p-3.5 rounded-xl border ${report.headers_analysis.x_frame_options ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-slate-950 border-slate-800'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white">X-Frame-Options</span>
                    {report.headers_analysis.x_frame_options ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {report.headers_analysis.x_frame_options}</span>
                    ) : (
                      <span className="text-slate-500 font-mono">Missing</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">Defends against UI redress and clickjacking attacks.</p>
                </div>

                <div className={`p-3.5 rounded-xl border ${report.headers_analysis.x_content_type_options ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-slate-950 border-slate-800'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white">X-Content-Type-Options</span>
                    {report.headers_analysis.x_content_type_options ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {report.headers_analysis.x_content_type_options}</span>
                    ) : (
                      <span className="text-slate-500 font-mono">Missing</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">Prevents browser MIME-type sniffing vulnerabilities.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DNS INFRASTRUCTURE */}
          {activeTab === 'dns' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  DNS Records &amp; Network Routing
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  Status: <strong className="text-cyan-300 capitalize">{report.dns_analysis.status}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                {/* A & AAAA Records */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block mb-2 font-sans font-semibold">IPv4 Addresses (A Records)</span>
                  {report.dns_analysis.a_records.length === 0 ? (
                    <span className="text-slate-500">None found</span>
                  ) : (
                    <ul className="space-y-1 text-cyan-300">
                      {report.dns_analysis.a_records.map((ip, i) => (
                        <li key={i}>{ip}</li>
                      ))}
                    </ul>
                  )}

                  {report.dns_analysis.aaaa_records.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-800">
                      <span className="text-slate-400 block mb-1 font-sans font-semibold">IPv6 Addresses (AAAA Records)</span>
                      <ul className="space-y-1 text-slate-300 text-[11px]">
                        {report.dns_analysis.aaaa_records.map((ip, i) => (
                          <li key={i}>{ip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* MX & Nameservers */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block mb-2 font-sans font-semibold">Nameservers (NS Records)</span>
                  {report.dns_analysis.ns_records.length === 0 ? (
                    <span className="text-slate-500">None found</span>
                  ) : (
                    <ul className="space-y-1 text-slate-300 text-[11px]">
                      {report.dns_analysis.ns_records.map((ns, i) => (
                        <li key={i}>{ns}</li>
                      ))}
                    </ul>
                  )}

                  {report.dns_analysis.mx_records.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-800">
                      <span className="text-slate-400 block mb-1 font-sans font-semibold">Mail Servers (MX Records)</span>
                      <ul className="space-y-1 text-slate-300 text-[11px]">
                        {report.dns_analysis.mx_records.map((mx, i) => (
                          <li key={i}>{mx}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: THREAT INTELLIGENCE */}
          {activeTab === 'intel' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Threat Intelligence Providers
                </h3>
                <span className="text-xs text-slate-400 font-mono">Multi-Feed Aggregation</span>
              </div>

              <div className="space-y-3">
                {report.threat_intel.map((feed, i) => (
                  <div key={i} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{feed.provider}</span>
                        {feed.status === 'clean' && (
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-700/40 font-semibold text-[10px]">
                            Clean
                          </span>
                        )}
                        {feed.status === 'malicious' && (
                          <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-700/40 font-semibold text-[10px]">
                            Malicious
                          </span>
                        )}
                        {feed.status === 'not_configured' && (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[10px]">
                            Not Configured
                          </span>
                        )}
                        {feed.status === 'unavailable' && (
                          <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-700/40 text-[10px]">
                            Unavailable
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs mt-1">{feed.details || 'No additional details reported.'}</p>
                    </div>

                    {feed.reference_url && (
                      <a
                        href={feed.reference_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-white border border-slate-800 shrink-0"
                        title="View reference"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. Mandatory Safety Disclaimer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-start gap-2.5 text-xs text-slate-400">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-300">Integrity Disclaimer: </strong>
            {report.disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
};
