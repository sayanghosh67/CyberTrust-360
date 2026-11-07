import React from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Search,
  ArrowRight,
  Info,
  Layers,
} from 'lucide-react';
import type { GraphNodeData, GraphEdgeData } from '../types/intelligence';

interface GraphDetailPanelProps {
  selectedNode: GraphNodeData | null;
  selectedEdge: GraphEdgeData | null;
  connectedEdges?: GraphEdgeData[];
  onClose: () => void;
  onInvestigateUrl?: (url: string) => void;
  onSelectEdge?: (edge: GraphEdgeData) => void;
}

export const GraphDetailPanel: React.FC<GraphDetailPanelProps> = ({
  selectedNode,
  selectedEdge,
  connectedEdges = [],
  onClose,
  onInvestigateUrl,
  onSelectEdge,
}) => {
  if (!selectedNode && !selectedEdge) return null;

  return (
    <div className="w-full lg:w-96 bg-slate-950/95 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl flex flex-col max-h-[640px] overflow-y-auto animate-fadeIn text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
            {selectedNode ? 'Entity Telemetry' : 'Relationship Forensic Evidence'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          aria-label="Close detail panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Selected Edge Details */}
      {selectedEdge && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
              Connection Topology
            </span>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
              <span className="truncate max-w-[120px] text-cyan-300" title={selectedEdge.source}>
                {selectedEdge.source}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate max-w-[120px] text-emerald-300" title={selectedEdge.target}>
                {selectedEdge.target}
              </span>
            </div>
          </div>

          {/* Classification Badge */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">
              Relationship Classification
            </span>
            {selectedEdge.category === 'VERIFIED_SHARED_INDICATOR' ? (
              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-600/50 flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-emerald-300 block font-mono">
                    VERIFIED SHARED INDICATOR
                  </span>
                  <p className="text-[11px] text-emerald-400/90 mt-0.5 leading-snug">
                    Direct technical match supported by exact stored indicators (shared domain, URL, or phone).
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-600/50 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-amber-300 block font-mono">
                    POSSIBLE RELATIONSHIP (INFERRED)
                  </span>
                  <p className="text-[11px] text-amber-400/90 mt-0.5 leading-snug">
                    Heuristic link inferred from shared deceptive playbooks, brands, or linguistic cues.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Technical Evidence */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">
              Supporting Technical Evidence
            </span>
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs font-mono text-cyan-200 leading-relaxed">
              &gt; {selectedEdge.evidence}
            </div>
          </div>

          {/* Relationship Metadata */}
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-500 block">Type</span>
              <span className="font-bold text-slate-200">{selectedEdge.relationship_type}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-500 block">Confidence</span>
              <span className="font-bold text-cyan-300">{selectedEdge.confidence}</span>
            </div>
          </div>

          {/* Attribution Limitations Notice */}
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 text-[10px] text-slate-400 leading-normal flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p>{selectedEdge.limitations}</p>
          </div>
        </div>
      )}

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-800">
                {selectedNode.type.replace('_', ' ')}
              </span>
              {selectedNode.report_count > 1 && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {selectedNode.report_count} Linked Reports
                </span>
              )}
            </div>
            <h4 className="text-base font-bold text-white font-mono break-words">
              {selectedNode.label}
            </h4>
            {selectedNode.sublabel && (
              <p className="text-xs text-slate-400 mt-0.5">{selectedNode.sublabel}</p>
            )}
          </div>

          {/* Risk Score Dial if applicable */}
          {selectedNode.risk_score !== undefined && selectedNode.risk_score !== null && (
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                  Threat Classification
                </span>
                <span className="text-sm font-bold text-white font-mono">
                  {selectedNode.risk_classification || 'Evaluated'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                  Score
                </span>
                <span
                  className={`text-2xl font-black font-mono ${
                    selectedNode.risk_score >= 70
                      ? 'text-rose-400'
                      : selectedNode.risk_score >= 40
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {selectedNode.risk_score}/100
                </span>
              </div>
            </div>
          )}

          {/* Cross-Module URL Scanner Action */}
          {(selectedNode.type === 'domain' || selectedNode.type === 'url') && onInvestigateUrl && (
            <button
              onClick={() => {
                const target =
                  (selectedNode.properties.full_url as string) ||
                  (selectedNode.properties.domain as string) ||
                  selectedNode.label;
                onInvestigateUrl(target);
              }}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-600/50 hover:to-blue-600/50 text-cyan-200 border border-cyan-500/40 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md group cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span>Deep Investigate Target in URL Scanner</span>
            </button>
          )}

          {/* Node Metadata Attributes */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              Node Properties
            </span>
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-3 space-y-2 text-xs font-mono">
              {Object.entries(selectedNode.properties).map(([key, val]) => (
                <div key={key} className="flex justify-between items-start gap-2 border-b border-slate-800/60 pb-1.5 last:border-none last:pb-0">
                  <span className="text-slate-500 text-[11px] shrink-0">{key}:</span>
                  <span className="text-slate-300 text-[11px] text-right break-all">
                    {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Connected Relationships in Graph */}
          {connectedEdges.length > 0 && onSelectEdge && (
            <div className="space-y-1.5 pt-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                Connected Relationships ({connectedEdges.length})
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {connectedEdges.map((edge) => (
                  <button
                    key={edge.id}
                    onClick={() => onSelectEdge(edge)}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-colors flex items-center justify-between gap-2 group cursor-pointer"
                  >
                    <div className="min-w-0">
                      <span className="text-[11px] font-mono font-bold text-slate-200 block truncate group-hover:text-cyan-300">
                        {edge.label}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono block truncate">
                        {edge.relationship_type}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                        edge.category === 'VERIFIED_SHARED_INDICATOR'
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                          : 'bg-amber-950/80 text-amber-300 border-amber-800'
                      }`}
                    >
                      {edge.category === 'VERIFIED_SHARED_INDICATOR' ? 'Verified' : 'Inferred'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
