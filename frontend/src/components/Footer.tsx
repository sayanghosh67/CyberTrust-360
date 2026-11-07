import React from 'react';
import { Shield } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-900 bg-slate-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-500" />
          <span className="font-semibold text-slate-400">CyberTrust 360</span>
          <span>•</span>
          <span>Engineered by <strong className="text-slate-300">TECHNIX PRO</strong></span>
        </div>
        <p className="font-mono text-[11px]">
          48-Hour Hackathon MVP • Phase 1: Project Foundation Complete
        </p>
      </div>
    </footer>
  );
};
