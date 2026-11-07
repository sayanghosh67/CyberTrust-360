import React from 'react';
import { History, ArrowRight, Clock } from 'lucide-react';
import type { ScanSummaryItem, RiskClassification } from '../types/scan';

interface RecentScansListProps {
  scans: ScanSummaryItem[];
  onSelectScan: (id: string) => void;
  isLoading: boolean;
}

export const RecentScansList: React.FC<RecentScansListProps> = ({
  scans,
  onSelectScan,
  isLoading,
}) => {
  const getBadgeClass = (risk: RiskClassification) => {
    switch (risk) {
      case 'Confirmed Malicious':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'High Risk':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'Suspicious':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'Inconclusive':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      case 'Low Risk':
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  if (scans.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-12">
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
              Recent Investigation Telemetry ({scans.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Persisted in Database</span>
        </div>

        <div className="space-y-2">
          {scans.map((scan) => (
            <div
              key={scan.id}
              onClick={() => onSelectScan(scan.id)}
              className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-cyan-500/40 flex items-center justify-between gap-3 cursor-pointer transition-all hover:bg-slate-950"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0 ${getBadgeClass(
                    scan.risk_classification
                  )}`}
                >
                  {scan.risk_classification}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate font-mono">
                    {scan.hostname}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate font-mono">
                    {scan.url}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-slate-200">
                    Score: {scan.risk_score}
                  </span>
                  <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {new Date(scan.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <button
                  type="button"
                  className="p-1 rounded bg-slate-800 text-slate-400 hover:text-cyan-300 hover:bg-slate-700 transition-colors"
                  title="View report"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
