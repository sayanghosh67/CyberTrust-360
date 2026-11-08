import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, Globe2, Loader2, ScanLine, ShieldCheck, AlertCircle, Fingerprint, LockKeyhole } from 'lucide-react';
import { HeroSculpture } from './HeroSculpture';
import horizontalLogo from '../assets/cybertrust-logo-horizontal.png';

interface Props {
  onInvestigate: (url: string) => Promise<void>;
  isScanning: boolean;
  error: string | null;
  requestedUrl?: string | null;
}

const presets = [
  { label: 'example.com', url: 'https://example.com' },
  { label: 'wikipedia.org', url: 'https://wikipedia.org' },
  { label: 'Test a phishing pattern', url: 'https://paypa1-account-login-update.com' }
];

export function ThreatSearchHero({ onInvestigate, isScanning, error, requestedUrl }: Props) {
  const [url, setUrl] = useState('');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (requestedUrl) {
      setUrl(requestedUrl);
    }
  }, [requestedUrl]);

  useEffect(() => {
    if (!isScanning) return;
    const start = Date.now();
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [isScanning]);

  const submit = (target: string) => {
    if (!isScanning && target.trim()) {
      setElapsed(0);
      void onInvestigate(target.trim());
    }
  };

  return (
    <>
      <section className="hero-section shell" id="home">
        <div className="hero-copy">
          <div className="mb-3">
            <img
              src={horizontalLogo}
              alt="CyberTrust 360"
              className="h-8 sm:h-10 object-contain filter drop-shadow-[0_2px_10px_rgba(16,185,129,0.3)]"
            />
          </div>
          <div className="eyebrow">
            <span className="signal-dot" /> THE NEXT LAYER OF DIGITAL TRUST <span className="version-tag">DIGITAL TRUST PLATFORM</span>
          </div>
          <h1>
            Trust is earned.<br /> <span>Verify everything.</span>
          </h1>
          <p className="hero-description">
            The internet moves fast. Threats move faster.<br className="desktop-break" />
            Uncover hidden risks, investigate suspicious links, and sequence deceptive message DNA
            <br className="desktop-break" /> into transparent, explainable intelligence.
          </p>
          <div className="hero-actions">
            <a className="button-primary" href="#investigate">
              Investigate URL <ArrowUpRight size={17} />
            </a>
            <a className="text-link" href="#scam-dna">
              <span className="play-circle"><ArrowRight size={13} /></span> Scan Scam Message
            </a>
          </div>
          <div className="hero-proof">
            <span><ShieldCheck size={15} /> Explainable threat scoring</span>
            <span><Fingerprint size={15} /> AI Scam DNA sequencing</span>
          </div>
        </div>
        <HeroSculpture />
        <div className="hero-index">
          <span>01 — INTELLIGENCE WITHOUT BLIND SPOTS</span>
          <span>SCROLL TO EXPLORE <span>↓</span></span>
        </div>
      </section>

      <section className="scanner-section shell" id="investigate" aria-labelledby="scanner-heading">
        <div className="scanner-panel">
          <div className="scanner-heading">
            <div>
              <span className="section-kicker"><ScanLine size={15} /> URL &amp; DOMAIN INVESTIGATION ENGINE</span>
              <h2 id="scanner-heading">One domain. The whole picture.</h2>
            </div>
            <span className="private-note"><LockKeyhole size={13} /> Public domains only</span>
          </div>
          <form onSubmit={e => { e.preventDefault(); submit(url); }}>
            <label className="sr-only" htmlFor="domain-input">URL or domain to investigate</label>
            <div className="scan-input-wrap">
              <Globe2 size={21} />
              <input
                id="domain-input"
                type="text"
                autoComplete="url"
                spellCheck={false}
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="Enter a URL or domain to investigate"
                disabled={isScanning}
                required
              />
              <span className="input-hint">URL / DOMAIN</span>
              <button className="button-primary" type="submit" disabled={isScanning || !url.trim()}>
                {isScanning ? (
                  <><Loader2 className="spin" size={17} /> Investigating</>
                ) : (
                  <>Analyze domain <ArrowRight size={17} /></>
                )}
              </button>
            </div>
          </form>
          <div className="scanner-bottom">
            <div className="presets">
              <span>Try a scan</span>
              {presets.map(p => (
                <button
                  key={p.url}
                  disabled={isScanning}
                  onClick={() => {
                    setUrl(p.url);
                    submit(p.url);
                  }}
                >
                  {p.label}<ArrowUpRight size={11} />
                </button>
              ))}
            </div>
            <span className="scan-depth"><span className="signal-dot" /> 5 layers of deep analysis</span>
          </div>
          {isScanning && (
            <div className="scan-progress" role="status">
              <span className="scanning-line" />
              <Loader2 className="spin" size={14} />
              <span>Investigating URL, DNS, TLS, headers &amp; threat intelligence…</span>
              <span>{elapsed}s</span>
            </div>
          )}
          {error && (
            <div className="scan-error" role="alert">
              <AlertCircle size={16} />{error}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
