import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  PhoneCall,
  ExternalLink,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Lock,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import type { ActionTakenType, SafetyGuidanceResponse } from '../types/scam';
import { fetchSafetyGuidance } from '../services/scamService';

const INCIDENT_OPTIONS: { id: ActionTakenType; label: string; icon: string; desc: string }[] = [
  {
    id: 'received_only',
    label: 'A. I only received the message',
    icon: '📩',
    desc: 'Did not click links, share codes, or pay money',
  },
  {
    id: 'clicked_link',
    label: 'B. I clicked the suspicious link',
    icon: '🔗',
    desc: 'Opened the webpage, but did not enter passwords',
  },
  {
    id: 'entered_password',
    label: 'C. I entered my password',
    icon: '🔑',
    desc: 'Typed netbanking password or account credentials',
  },
  {
    id: 'shared_otp',
    label: 'D. I shared an OTP',
    icon: '📲',
    desc: 'Provided one-time password to caller or on portal',
  },
  {
    id: 'made_upi_payment',
    label: 'E. I made a UPI payment',
    icon: '💸',
    desc: 'Transferred funds or approved a collect request',
  },
];

export const WhatShouldIDoNow: React.FC = () => {
  const [selectedAction, setSelectedAction] = useState<ActionTakenType>('received_only');
  const [guidance, setGuidance] = useState<SafetyGuidanceResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const loadGuidance = async (action: ActionTakenType) => {
    setLoading(true);
    try {
      const data = await fetchSafetyGuidance(action);
      setGuidance(data);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGuidance(selectedAction);
  }, [selectedAction]);

  const getSeverityBadge = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'high':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'medium':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'low':
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 my-16" id="incident-guidance">
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-700/40 text-xs font-mono mb-2">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>INCIDENT RESPONSE PROTOCOL</span>
              {loading && <Loader2 className="w-3 h-3 animate-spin text-cyan-400 ml-1" />}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              What Should I Do Now?
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Select what action occurred to receive immediate, situation-specific safety guidance.
            </p>
          </div>

          {/* National Cyber Helpline 1930 Pill */}
          <div className="bg-gradient-to-br from-rose-950/80 to-slate-950 border border-rose-700/50 rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
            <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
              <PhoneCall className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-rose-300 font-semibold block">
                Financial Cyber Fraud Helpline
              </span>
              <span className="text-2xl font-black text-white font-mono tracking-tight">
                Dial 1930
              </span>
              <span className="text-[10px] text-slate-400 block">Toll-Free • 24/7 National Portal</span>
            </div>
          </div>
        </div>

        {/* 5 Interactive Incident Choices */}
        <div className="my-6">
          <label className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 block mb-3">
            Step 1: What happened?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {INCIDENT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedAction(opt.id)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedAction === opt.id
                    ? 'bg-cyan-950/50 border-cyan-500/80 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/40'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xl">{opt.icon}</span>
                  <span className="text-xs font-bold text-white tracking-wide">{opt.label}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal pl-7">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Situation-Specific Safety Guidance Card */}
        {guidance && (
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
              <div>
                <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${getSeverityBadge(guidance.severity_level)}`}>
                  {guidance.severity_level} RISK SITUATION
                </span>
                <h3 className="text-lg font-bold text-white mt-1.5">{guidance.action_title}</h3>
              </div>
            </div>

            {/* Urgent Warning if any */}
            {guidance.urgent_warning && (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start gap-3 text-xs text-rose-200">
                <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed font-semibold">{guidance.urgent_warning}</p>
              </div>
            )}

            {/* Immediate Action Steps */}
            <div>
              <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Immediate Action Checklist
              </h4>
              <div className="space-y-2.5">
                {guidance.immediate_steps.map((step, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3 text-xs text-slate-200">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold flex items-center justify-center shrink-0 text-[11px] border border-cyan-500/30">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Official Indian Reporting Channels */}
            <div>
              <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Authoritative Cybercrime &amp; Financial Reporting Channels
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {guidance.reporting_channels.map((ch, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/90 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white">{ch.name}</span>
                      {ch.url && (
                        <a
                          href={ch.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px]"
                        >
                          Visit <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    {ch.contact && <p className="text-cyan-300 font-mono font-semibold mb-1">{ch.contact}</p>}
                    <p className="text-slate-400 text-[11px] leading-relaxed">{ch.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Preventative Measures */}
            <div>
              <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-400" />
                Long-Term Preventative Defense
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-400">
                {guidance.preventative_measures.map((prev, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span>{prev}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Security Rule Note */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>
            Strict Privacy Guarantee: CyberTrust 360 never asks for passwords, OTPs, bank account numbers, or private keys.
          </span>
        </div>
      </div>
    </div>
  );
};
