import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Globe,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Building2,
  Terminal,
  Phone,
  CreditCard,
  Mail,
  Fingerprint,
} from 'lucide-react';
import type { GraphNodeData } from '../types/intelligence';

interface ExtendedNodeData extends GraphNodeData {
  isNeighbor?: boolean;
  isDimmed?: boolean;
  isSelected?: boolean;
}

export const CyberGraphNode: React.FC<NodeProps> = ({ data, selected }) => {
  const node = data as unknown as ExtendedNodeData;

  const getNodeTheme = () => {
    switch (node.type) {
      case 'domain':
        return {
          border: 'border-cyan-500/80',
          bg: 'bg-slate-950/90',
          accent: 'text-cyan-400',
          glow: 'shadow-cyan-500/20',
          icon: <Globe className="w-4 h-4 text-cyan-400" />,
          typeBadge: 'bg-cyan-950 text-cyan-300 border-cyan-800',
        };
      case 'url':
        return {
          border: 'border-cyan-600/60',
          bg: 'bg-slate-950/90',
          accent: 'text-cyan-300',
          glow: 'shadow-cyan-600/10',
          icon: <ExternalLink className="w-4 h-4 text-cyan-400" />,
          typeBadge: 'bg-cyan-950 text-cyan-400 border-cyan-800',
        };
      case 'scam_report':
        return {
          border: (node.risk_score || 0) >= 70 ? 'border-rose-500/80' : 'border-amber-500/80',
          bg: 'bg-slate-950/95',
          accent: (node.risk_score || 0) >= 70 ? 'text-rose-400' : 'text-amber-400',
          glow: (node.risk_score || 0) >= 70 ? 'shadow-rose-500/20' : 'shadow-amber-500/20',
          icon: <Fingerprint className="w-4 h-4 text-rose-400" />,
          typeBadge: 'bg-rose-950 text-rose-300 border-rose-800',
        };
      case 'url_scan':
        return {
          border: (node.risk_score || 0) >= 70 ? 'border-rose-500/80' : 'border-emerald-500/80',
          bg: 'bg-slate-950/95',
          accent: (node.risk_score || 0) >= 70 ? 'text-rose-400' : 'text-emerald-400',
          glow: (node.risk_score || 0) >= 70 ? 'shadow-emerald-500/20' : 'shadow-rose-500/20',
          icon: (node.risk_score || 0) >= 70 ? <ShieldAlert className="w-4 h-4 text-rose-400" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />,
          typeBadge: 'bg-emerald-950 text-emerald-300 border-emerald-800',
        };
      case 'brand':
        return {
          border: 'border-blue-500/70',
          bg: 'bg-slate-950/90',
          accent: 'text-blue-400',
          glow: 'shadow-blue-500/20',
          icon: <Building2 className="w-4 h-4 text-blue-400" />,
          typeBadge: 'bg-blue-950 text-blue-300 border-blue-800',
        };
      case 'tactic':
        return {
          border: 'border-purple-500/70',
          bg: 'bg-slate-950/90',
          accent: 'text-purple-400',
          glow: 'shadow-purple-500/20',
          icon: <Terminal className="w-4 h-4 text-purple-400" />,
          typeBadge: 'bg-purple-950 text-purple-300 border-purple-800',
        };
      case 'indicator':
      default:
        return {
          border: 'border-amber-500/80',
          bg: 'bg-slate-950/90',
          accent: 'text-amber-400',
          glow: 'shadow-amber-500/20',
          icon: node.indicator_type === 'upi_id' ? <CreditCard className="w-4 h-4 text-amber-400" /> : node.indicator_type === 'email' ? <Mail className="w-4 h-4 text-amber-400" /> : <Phone className="w-4 h-4 text-amber-400" />,
          typeBadge: 'bg-amber-950 text-amber-300 border-amber-800',
        };
    }
  };

  const theme = getNodeTheme();
  const isHighlighted = selected || node.isSelected;
  const isNeighbor = node.isNeighbor;

  return (
    <div
      className={`relative px-4 py-3 rounded-2xl border-2 transition-all duration-300 cursor-pointer backdrop-blur-md min-w-[200px] max-w-[280px] shadow-lg ${
        theme.bg
      } ${theme.border} ${theme.glow} ${
        isHighlighted
          ? 'ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-950 scale-105 shadow-cyan-400/50'
          : isNeighbor
          ? 'ring-2 ring-cyan-400/80 ring-offset-1 ring-offset-slate-950 shadow-cyan-500/30'
          : 'hover:scale-[1.02]'
      }`}
    >
      {/* Handles for connections */}
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-cyan-400 !border-slate-950" />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-cyan-400 !border-slate-950" />

      {/* Header with Type and Report Count Badge */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${theme.typeBadge}`}
        >
          {node.type.replace('_', ' ')}
        </span>

        {node.report_count > 1 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {node.report_count} Reports
          </span>
        )}

        {node.risk_score !== undefined && node.risk_score !== null && (
          <span
            className={`text-[11px] font-mono font-extrabold ${
              node.risk_score >= 70
                ? 'text-rose-400'
                : node.risk_score >= 40
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}
          >
            {node.risk_score}/100
          </span>
        )}
      </div>

      {/* Main Label */}
      <div className="flex items-center gap-2">
        <div className="shrink-0">{theme.icon}</div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-white truncate font-mono" title={node.label}>
            {node.label}
          </div>
          {node.sublabel && (
            <div className="text-[10px] text-slate-400 truncate mt-0.5">{node.sublabel}</div>
          )}
        </div>
      </div>
    </div>
  );
};
