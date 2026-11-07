import { useEffect, useState } from 'react';
import { ArrowUpRight, Menu, X, Sparkles, AlertTriangle, Network, Lock } from 'lucide-react';
import type { ConnectionStatus } from '../types/health';
import roundLogo from '../assets/cybertrust-logo-round.png';

interface HeaderProps {
  status: ConnectionStatus;
  latencyMs: number | null;
  onRefresh: () => void;
}

export function Header({ status, latencyMs, onRefresh }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(location.hash.slice(1) || 'home');
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
    }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });
    ['home', 'platform-overview', 'investigate', 'scam-dna', 'relationship-graph', 'blockchain-trust', 'incident-guidance'].forEach(id => {
      const element = document.getElementById(id); if (element) observer.observe(element);
    });
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', escape);
    return () => { observer.disconnect(); document.removeEventListener('keydown', escape); };
  }, []);

  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href="#home" aria-label="CyberTrust 360 home">
          <span className="brand-symbol">
            <img
              src={roundLogo}
              alt="CyberTrust 360"
              className="w-8 h-8 rounded-full object-contain filter drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
            />
          </span>
          <span>
            cybertrust<span className="brand-360">360</span>
            <small>DIGITAL TRUST. DECODED. · BY TECHNIX PRO</small>
          </span>
        </a>

        <nav id="main-navigation" className={open ? 'main-nav is-open' : 'main-nav'} aria-label="Main navigation">
          <a href="#platform-overview" aria-current={active === 'platform-overview' ? 'location' : undefined} onClick={() => { setOpen(false); setActive('platform-overview'); }}>
            Overview
          </a>
          <a href="#investigate" aria-current={active === 'investigate' ? 'location' : undefined} onClick={() => { setOpen(false); setActive('investigate'); }}>
            URL Scanner
          </a>
          <a href="#scam-dna" aria-current={active === 'scam-dna' ? 'location' : undefined} onClick={() => { setOpen(false); setActive('scam-dna'); }} className="flex items-center gap-1">
            <Sparkles size={13} className="text-cyan-400" />
            <span>Scam DNA</span>
          </a>
          <a href="#relationship-graph" aria-current={active === 'relationship-graph' ? 'location' : undefined} onClick={() => { setOpen(false); setActive('relationship-graph'); }} className="flex items-center gap-1">
            <Network size={13} className="text-cyan-400" />
            <span>Threat Graph</span>
          </a>
          <a href="#blockchain-trust" aria-current={active === 'blockchain-trust' ? 'location' : undefined} onClick={() => { setOpen(false); setActive('blockchain-trust'); }} className="flex items-center gap-1">
            <Lock size={13} className="text-cyan-400" />
            <span>Blockchain Trust</span>
          </a>
          <a href="#incident-guidance" aria-current={active === 'incident-guidance' ? 'location' : undefined} onClick={() => { setOpen(false); setActive('incident-guidance'); }} className="flex items-center gap-1">
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
            aria-controls="main-navigation"
            aria-label="Toggle navigation"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
