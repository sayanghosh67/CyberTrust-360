import { useState } from 'react';
import { ArrowUpRight, Menu, X, Shield, Sparkles, AlertTriangle, Network, Lock } from 'lucide-react';
import type { ConnectionStatus } from '../types/health';

interface HeaderProps {
  status: ConnectionStatus;
  latencyMs: number | null;
  onRefresh: () => void;
}

export function Header({ status, latencyMs, onRefresh }: HeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href="#home" aria-label="CyberTrust 360 home">
          <span className="brand-symbol">
            <Shield size={23} strokeWidth={1.8} />
          </span>
          <span>
            cybertrust<span className="brand-360">360</span>
            <small>DIGITAL TRUST. DECODED. · BY TECHNIX PRO</small>
          </span>
        </a>

        <nav className={open ? 'main-nav is-open' : 'main-nav'} aria-label="Main navigation">
          <a href="#platform-overview" onClick={() => setOpen(false)}>
            Overview
          </a>
          <a href="#investigate" onClick={() => setOpen(false)}>
            URL Scanner
          </a>
          <a href="#scam-dna" onClick={() => setOpen(false)} className="flex items-center gap-1">
            <Sparkles size={13} className="text-cyan-400" />
            <span>Scam DNA</span>
          </a>
          <a href="#relationship-graph" onClick={() => setOpen(false)} className="flex items-center gap-1">
            <Network size={13} className="text-cyan-400" />
            <span>Threat Graph</span>
          </a>
          <a href="#blockchain-trust" onClick={() => setOpen(false)} className="flex items-center gap-1">
            <Lock size={13} className="text-cyan-400" />
            <span>Blockchain Trust</span>
          </a>
          <a href="#incident-guidance" onClick={() => setOpen(false)} className="flex items-center gap-1">
            <AlertTriangle size={13} className="text-amber-400" />
            <span>Incident Response</span>
          </a>
        </nav>

        <div className="header-actions">
          <button
            className={`system-status ${status}`}
            onClick={onRefresh}
            title={`Refresh service status${latencyMs !== null ? ` · ${latencyMs}ms` : ''}`}
          >
            <i />
            {status === 'connected'
              ? 'System operational'
              : status === 'checking'
              ? 'Connecting'
              : status === 'degraded'
              ? 'Service degraded'
              : 'Service offline'}
          </button>
          <a href="#scam-dna" className="header-cta">
            Scam Analyzer <ArrowUpRight size={14} />
          </a>
          <button
            className="menu-button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label="Toggle navigation"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
