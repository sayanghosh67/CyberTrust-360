import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Cpu,
  Terminal,
  ExternalLink,
  Phone,
  Mail,
  CreditCard,
  Building2,
  DollarSign,
  Copy,
  Check,
  Search,
  AlertOctagon,
  Languages,
  Network,
} from 'lucide-react';
import type { ScamAnalysisResponse, RiskClassification, IndicatorType } from '../types/scam';

interface ScamDnaReportProps {
  report: ScamAnalysisResponse;
  onInvestigateUrl?: (url: string) => void;
  onExploreGraph?: (query: string) => void;
}

export const ScamDnaReport: React.FC<ScamDnaReportProps> = ({
  report,
  onInvestigateUrl,
  onExploreGraph,
}) => {
  const [copied, setCopied] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

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

  const getTacticSeverityClass = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'high':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'medium':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'low':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const getIndicatorIcon = (type: IndicatorType) => {
    switch (type) {
      case 'url':
      case 'domain':
        return <ExternalLink className="w-4 h-4 text-cyan-400" />;
      case 'phone':
        return <Phone className="w-4 h-4 text-emerald-400" />;
      case 'email':
        return <Mail className="w-4 h-4 text-purple-400" />;
      case 'upi_id':
        return <CreditCard className="w-4 h-4 text-yellow-400" />;
      case 'brand':
        return <Building2 className="w-4 h-4 text-blue-400" />;
      case 'currency_amount':
        return <DollarSign className="w-4 h-4 text-amber-400" />;
      default:
        return <AlertOctagon className="w-4 h-4 text-slate-400" />;
    }
  };

  const handleCopySummary = () => {
    const textToCopy = `[CyberTrust 360 Scam DNA Report]
Verdict: ${report.risk_classification} (Threat Score: ${report.risk_score}/100, Confidence: ${report.confidence})
Archetype: ${report.scam_archetype}
Source: ${report.analysis_source === 'ai_llm' ? 'AI LLM (' + (report.model_used || 'Standard') + ')' : 'Deterministic Threat Rule Engine'}
Summary: ${report.summary}
Indicators Extracted: ${report.extracted_indicators.map((i) => `${i.type}: ${i.value}`).join(', ') || 'None'}
Tactics: ${report.tactics.map((t) => t.name).join(', ') || 'None'}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const riskTheme = getRiskTheme(report.risk_classification);

  const filteredIndicators =
    filterType === 'all'
      ? report.extracted_indicators
      : report.extracted_indicators.filter((i) => i.type === filterType);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Executive Verdict Card */}
      <div
        className={`rounded-2xl border p-6 md:p-8 backdrop-blur-md transition-all ${riskTheme.bg} ${riskTheme.border}`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-700/60">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/80 shadow-lg">
              {riskTheme.icon}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span
                  className={`px-3 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full border ${riskTheme.badge}`}
                >
                  {report.risk_classification}
                </span>
                <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Confidence: {report.confidence}
                </span>
                <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                  <Languages className="w-3 h-3 text-cyan-400" />
                  {report.detected_language}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                {report.scam_archetype}
              </h3>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {report.summary}
              </p>
            </div>
          </div>

          {/* Risk Score Dial */}
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-950/70 border border-slate-800 min-w-[140px] shadow-inner">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
              Threat Score
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-4xl font-extrabold tracking-tight ${riskTheme.accent}`}>
                {report.risk_score}
              </span>
              <span className="text-xs text-slate-500 font-mono">/100</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full ${riskTheme.gauge}`}
                style={{ width: `${Math.min(100, Math.max(5, report.risk_score))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Intelligence Source & Action Bar */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>
              Engine:{' '}
              {report.analysis_source === 'ai_llm' ? (
                <strong className="text-cyan-300">
                  AI Model ({report.model_used || 'Active'})
                </strong>
              ) : (
                <strong className="text-amber-300">
                  Rule-based Heuristic Engine (Deterministic Fallback)
                </strong>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onExploreGraph && (
              <a
                href="#relationship-graph"
                onClick={() => onExploreGraph(report.scam_archetype)}
                className="px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/60 flex items-center gap-1.5 transition-colors text-xs font-mono"
              >
                <Network className="w-3.5 h-3.5 text-cyan-400" />
                <span>View Threat Graph</span>
              </a>
            )}
            <button
              onClick={handleCopySummary}
              className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied Forensic Report</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Scam DNA Tactics & Extracted Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tactics & Psychological Manipulation (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              <h4 className="text-base font-semibold text-white">
                Detected Scam Tactics ({report.tactics.length})
              </h4>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Forensic Evidence Breakdown
            </span>
          </div>

          {report.tactics.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-slate-400 text-sm">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              No deceptive pressure, credential harvesting, or threat patterns detected in this message.
            </div>
          ) : (
            <div className="space-y-3.5">
              {report.tactics.map((tactic) => (
                <div
                  key={tactic.id}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/90 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-sm font-semibold text-slate-200">
                      {tactic.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded-md border uppercase tracking-wider ${getTacticSeverityClass(
                        tactic.severity
                      )}`}
                    >
                      {tactic.severity}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                    {tactic.explanation}
                  </p>

                  {/* Forensic Quote Box */}
                  <div className="p-2.5 rounded-lg bg-black/50 border border-slate-800/80 font-mono text-xs text-cyan-300/90 flex items-start gap-2">
                    <span className="text-slate-600 select-none">&gt;</span>
                    <div className="break-words">
                      <span className="text-slate-500 mr-1.5">[Evidence]:</span>
                      <q className="italic text-slate-300">{tactic.evidence}</q>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Extracted Indicators & Cross-Scanner CTA (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur-md flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-base font-semibold text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-purple-400" />
              Extracted Indicators ({report.extracted_indicators.length})
            </h4>
          </div>

          {/* Quick Filter Pills */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2 py-0.5 text-xs rounded-md border transition-colors ${
                filterType === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-medium'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
              }`}
            >
              All ({report.extracted_indicators.length})
            </button>
            {['url', 'phone', 'upi_id', 'brand'].map((t) => {
              const count = report.extracted_indicators.filter((i) => i.type === t).length;
              if (count === 0) return null;
              return (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-2 py-0.5 text-xs rounded-md border transition-colors ${
                    filterType === t
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-medium'
                      : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
                  }`}
                >
                  {t.toUpperCase()} ({count})
                </button>
              );
            })}
          </div>

          {filteredIndicators.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-slate-500 text-sm flex-1 flex flex-col items-center justify-center">
              <span>No {filterType !== 'all' ? filterType : ''} indicators detected.</span>
            </div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto max-h-[460px] pr-1">
              {filteredIndicators.map((indicator, idx) => (
                <div
                  key={`${indicator.type}-${idx}-${indicator.value}`}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {getIndicatorIcon(indicator.type)}
                      <span className="text-xs font-mono font-medium text-slate-200 truncate">
                        {indicator.value}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {indicator.type}
                    </span>
                  </div>

                  {/* Cross-Module URL Scan Action */}
                  {(indicator.type === 'url' || indicator.type === 'domain') && onInvestigateUrl && (
                    <button
                      type="button"
                      onClick={() => onInvestigateUrl(indicator.value)}
                      className="mt-1 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-600/50 hover:to-blue-600/50 text-cyan-200 border border-cyan-500/40 text-xs font-medium transition-all group shadow-sm"
                    >
                      <Search className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                      <span>Investigate URL in Phase 2 Scanner</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recommended Actions & Threat Containment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
          <h4 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Recommended Defensive Actions
          </h4>
          <ul className="space-y-2 text-xs text-slate-300">
            {report.recommended_actions.map((action, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold mt-0.5">
                  ✓
                </span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Limitations & Legal Disclaimer */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between">
          <div>
            <h4 className="text-base font-semibold text-slate-300 mb-2 flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-amber-400" />
              Engine Limitations
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-400 mb-4">
              {report.limitations.map((limitation, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-slate-600">•</span>
                  <span>{limitation}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-500 italic leading-snug">
            {report.disclaimer}
          </div>
        </div>
      </div>
    </div>
  );
};

