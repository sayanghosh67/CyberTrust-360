import React, { useState, useRef } from 'react';
import {
  Sparkles,
  AlertCircle,
  RotateCcw,
  Zap,
  Shield,
  Loader2,
} from 'lucide-react';
import { analyzeScamMessage } from '../services/scamService';
import type { ScamAnalysisResponse } from '../types/scam';
import { ScamDnaReport } from './ScamDnaReport';

interface ScamDnaAnalyzerProps {
  onInvestigateUrl?: (url: string) => void;
  onExploreGraph?: (query: string) => void;
}

const PRESET_MESSAGES = [
  {
    title: '🏦 SBI KYC Block Trap',
    tag: 'Banking KYC',
    medium: 'SMS',
    content:
      'Dear SBI Customer, your YONO account has been blocked today due to pending KYC update. Please update your Pan Card immediately by clicking http://sbi-kyc-update-portal.xyz/verify or your account will be suspended within 24 hours.',
  },
  {
    title: '💸 UPI ₹25,000 Refund Scam',
    tag: 'UPI Fraud',
    medium: 'WhatsApp',
    content:
      'Your PhonePe refund of Rs 25,000 is approved. Click here to claim your cashback instantly http://phonepe-reward-claim.online/claim and enter your UPI PIN to receive the money in your account.',
  },
  {
    title: '⚡ Bijli Disconnection (Hinglish)',
    tag: 'Utility Scam',
    medium: 'SMS',
    content:
      'Dear consumer aapka bijli connection aaj raat 9:30 baje disconnect kar diya jayega kyonki aapka pichle mahine ka bill update nahi hua hai. Call electricity officer at 9876543210 immediately.',
  },
  {
    title: '💼 YouTube Like & Earn ₹5000',
    tag: 'Job Scam',
    medium: 'WhatsApp',
    content:
      'Congratulation! You are selected for Part-time Online Job at Global Media. Earn Rs 2500 - 5000 daily by liking YouTube videos and completing simple rating tasks. Contact our manager on Telegram @EarnDailyTask24 to claim Rs 500 joining bonus.',
  },
  {
    title: '📦 India Post Parcel Fee',
    tag: 'Delivery Scam',
    medium: 'SMS',
    content:
      'India Post: Your package #IN9842104 cannot be delivered due to incomplete street address. Please update your address and pay re-delivery fee of Rs 48 at http://indiapost-redelivery.org/track within 12 hours.',
  },
  {
    title: '🛡️ Legitimate Bank Alert',
    tag: 'Benign Control',
    medium: 'SMS',
    content:
      'Dear Customer, your A/C ending in 4102 has been debited by INR 1,500.00 on 07-Nov-2026 towards Amazon India. Avail Bal: INR 34,210.50. Never share your OTP, password or UPI PIN with anyone.',
  },
];

export const ScamDnaAnalyzer: React.FC<ScamDnaAnalyzerProps> = ({ onInvestigateUrl, onExploreGraph }) => {
  const [messageText, setMessageText] = useState('');
  const [medium, setMedium] = useState('SMS');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ScamAnalysisResponse | null>(null);

  const reportRef = useRef<HTMLDivElement>(null);

  const charCount = messageText.length;
  const isValidLength = charCount >= 5 && charCount <= 5000;

  const handleAnalyze = async () => {
    if (!isValidLength || isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const response = await analyzeScamMessage(messageText, medium);
      setReport(response);
      setTimeout(() => {
        reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to analyze suspicious message. Please verify network connection.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectPreset = (content: string, presetMedium: string) => {
    setMessageText(content);
    setMedium(presetMedium);
    setError(null);
  };

  const handleClear = () => {
    setMessageText('');
    setReport(null);
    setError(null);
  };

  return (
    <section id="scam-dna" className="py-16 px-4 md:px-8 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>TECHNIX PRO — AI Intelligence Engine</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          AI Scam DNA Analyzer
        </h2>
        <p className="text-slate-400 text-base mt-2">
          Deconstruct deceptive SMS, WhatsApp messages, emails, and job offers. Detect psychological
          manipulation, fake KYC traps, UPI refund tricks, and extract malicious indicators.
        </p>
      </div>

      {/* Main Input Workbench */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Medium Selector */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
              Message Medium:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {['SMS', 'WhatsApp', 'Email', 'Job Offer', 'Payment Request', 'Other'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMedium(m)}
                  className={`px-3 py-1 text-xs rounded-lg border transition-all ${
                    medium === m
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-semibold shadow-sm'
                      : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span
              className={
                charCount === 0
                  ? 'text-slate-500'
                  : charCount < 5 || charCount > 5000
                  ? 'text-rose-400 font-semibold'
                  : 'text-emerald-400'
              }
            >
              {charCount} / 5,000 characters
            </span>
          </div>
        </div>

        {/* Message Input Textarea */}
        <div className="relative mb-4">
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Paste suspicious SMS, WhatsApp forward, job offer, or email here to extract threat DNA..."
            rows={5}
            className="w-full bg-slate-950/90 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/50 transition-all font-sans leading-relaxed resize-y"
          />
        </div>

        {/* 1-Click Threat Presets */}
        <div className="mb-6">
          <div className="flex items-center gap-1.5 mb-2.5 text-xs text-slate-400">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold uppercase tracking-wider">
              1-Click Investigation Presets (Real-World Indian Scams):
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {PRESET_MESSAGES.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(preset.content, preset.medium)}
                className="p-2.5 text-left rounded-xl bg-slate-950/60 hover:bg-slate-800/70 border border-slate-800 hover:border-slate-700 transition-all group flex flex-col justify-between"
              >
                <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 line-clamp-1">
                  {preset.title}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-mono">
                  {preset.tag}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-cyan-400/80" />
            <span>Privacy-Preserving: Messages are analyzed safely and never broadcasted.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {messageText && (
              <button
                type="button"
                onClick={handleClear}
                disabled={isAnalyzing}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                Clear
              </button>
            )}

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!isValidLength || isAnalyzing}
              className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${
                isValidLength && !isAnalyzing
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/20 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Sequencing Scam DNA...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze Scam DNA</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-950/40 border border-rose-600/50 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Forensic Report Display */}
      <div ref={reportRef} aria-live="polite">
        {report && (
          <div className="space-y-6">
            <ScamDnaReport
              report={report}
              onInvestigateUrl={onInvestigateUrl}
              onExploreGraph={onExploreGraph}
            />
          </div>
        )}
      </div>
    </section>
  );
};
