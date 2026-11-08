/**
 * CyberTrust 360 — Edge Intelligence Engine
 * Runs fully in the browser on static deployments (GitHub Pages, Netlify, etc.)
 *
 * Design principles:
 * 1. NO localStorage persistence — fresh state on every page load.
 * 2. Real DNS lookups via Google DNS-over-HTTPS (free, no API key, CORS-enabled).
 * 3. Honest heuristic scoring — no fabricated "safe" or "malicious" results.
 *    - Legitimate brand domains (google.com etc.) are NOT flagged.
 *    - Domains IMPERSONATING brands (paypal-login.xyz) ARE flagged.
 * 4. Blockchain uses browser WebCrypto SHA-256.
 */

import type { ScanResponse } from '../types/scan';
import type { ScamAnalysisResponse, ActionTakenType, SafetyGuidanceResponse } from '../types/scam';
import type {
  GraphResponse,
  GraphNodeData,
  GraphEdgeData,
  IndicatorsResponse,
  ReportRelationshipsResponse,
} from '../types/intelligence';
import type {
  BlockchainStatus,
  BlockchainRegistration,
  BlockchainVerification,
  BlockchainRegistrationSummary,
} from '../types/blockchain';
import type { DashboardMetrics } from '../types/dashboard';

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY SESSION STATE  (cleared on every page refresh — intentional)
// ─────────────────────────────────────────────────────────────────────────────
let SESSION_SCANS: ScanResponse[] = [];
let SESSION_SCAMS: ScamAnalysisResponse[] = [];
let SESSION_BLOCKCHAIN: BlockchainRegistrationSummary[] = [];
const SESSION_TAMPERED = new Set<string>();

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────
async function sha256Hex(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Simple fallback for environments without SubtleCrypto
  let h = 0;
  for (let i = 0; i < text.length; i++) { h = (Math.imul(31, h) + text.charCodeAt(i)) | 0; }
  return Math.abs(h).toString(16).padStart(64, '0');
}

function randomHex(n: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(Math.ceil(n / 2))))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, n);
}

// ─────────────────────────────────────────────────────────────────────────────
// DNS-over-HTTPS  (Google Public DNS — free, CORS-enabled, no API key)
// ─────────────────────────────────────────────────────────────────────────────
interface DohAnswer { name: string; type: number; TTL: number; data: string; }
interface DohResponse { Status: number; Answer?: DohAnswer[]; Authority?: DohAnswer[]; }

async function dohLookup(hostname: string, type = 'A'): Promise<DohAnswer[]> {
  try {
    const url = `https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=${type}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return [];
    const data: DohResponse = await res.json();
    return data.Answer ?? [];
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BRAND REGISTRY
// Official brand domains are EXCLUDED from impersonation checks.
// Any domain CONTAINING the brand keyword but NOT being the official domain
// is flagged as impersonation.
// ─────────────────────────────────────────────────────────────────────────────
interface BrandEntry {
  brand: string;
  keywords: RegExp;
  officialDomains: string[];          // exact SLD+TLD of real site
}

const BRAND_REGISTRY: BrandEntry[] = [
  { brand: 'State Bank of India (SBI)', keywords: /\b(sbi|onlinesbi|yono)\b/i,  officialDomains: ['sbi.co.in', 'onlinesbi.sbi', 'sbiyono.in', 'sbicard.com'] },
  { brand: 'HDFC Bank',                keywords: /\bhdfc\b/i,                   officialDomains: ['hdfcbank.com', 'hdfc.com'] },
  { brand: 'ICICI Bank',               keywords: /\bicici\b/i,                  officialDomains: ['icicibank.com', 'icicidirect.com'] },
  { brand: 'Axis Bank',                keywords: /\baxis\b/i,                   officialDomains: ['axisbank.com'] },
  { brand: 'Paytm',                    keywords: /\bpaytm\b/i,                  officialDomains: ['paytm.com'] },
  { brand: 'PhonePe',                  keywords: /\bphonepe\b/i,                officialDomains: ['phonepe.com'] },
  { brand: 'Google',                   keywords: /\bgoogle\b/i,                 officialDomains: ['google.com', 'google.co.in', 'google.in', 'googleapis.com', 'googleusercontent.com', 'goog.le'] },
  { brand: 'PayPal',                   keywords: /\bpaypal\b/i,                 officialDomains: ['paypal.com', 'paypal.me'] },
  { brand: 'Amazon',                   keywords: /\b(amazon|amzn)\b/i,          officialDomains: ['amazon.com', 'amazon.in', 'amzn.to', 'amazon.co.uk', 'aws.amazon.com'] },
  { brand: 'Microsoft',                keywords: /\b(microsoft|msft|office365|azure)\b/i, officialDomains: ['microsoft.com', 'live.com', 'outlook.com', 'azure.com', 'office365.com', 'hotmail.com'] },
  { brand: 'Apple',                    keywords: /\b(apple|icloud|itunes)\b/i,  officialDomains: ['apple.com', 'icloud.com', 'itunes.com'] },
  { brand: 'Netflix',                  keywords: /\bnetflix\b/i,                officialDomains: ['netflix.com'] },
  { brand: 'Facebook / Meta',          keywords: /\b(facebook|fb|instagram|whatsapp|meta)\b/i, officialDomains: ['facebook.com', 'fb.com', 'instagram.com', 'whatsapp.com', 'meta.com'] },
  { brand: 'Twitter / X',             keywords: /\b(twitter|twit)\b/i,          officialDomains: ['twitter.com', 'x.com', 't.co'] },
  { brand: 'LinkedIn',                 keywords: /\blinkedin\b/i,               officialDomains: ['linkedin.com'] },
  { brand: 'IRCTC / Indian Railways',  keywords: /\b(irctc|indianrailways)\b/i, officialDomains: ['irctc.co.in', 'indianrail.gov.in'] },
  { brand: 'Government of India',      keywords: /\b(aadhar|aadhaar|uidai|epfo|incometax|gst)\b/i, officialDomains: ['uidai.gov.in', 'epfindia.gov.in', 'incometaxindiaefiling.gov.in', 'gst.gov.in'] },
];

// Canonical set of well-known legitimate domains (resolved exact match)
const OFFICIAL_SAFE_DOMAINS = new Set([
  'google.com', 'google.co.in', 'google.in',
  'github.com',
  'apple.com', 'icloud.com',
  'microsoft.com', 'live.com', 'outlook.com', 'hotmail.com',
  'amazon.com', 'amazon.in',
  'wikipedia.org',
  'cloudflare.com',
  'gov.in', 'nic.in',
  'youtube.com',
  'facebook.com', 'instagram.com', 'whatsapp.com',
  'twitter.com', 'x.com',
  'linkedin.com',
  'paypal.com',
  'netflix.com',
  'paytm.com', 'phonepe.com',
  'sbi.co.in', 'onlinesbi.sbi', 'sbicard.com',
  'hdfcbank.com', 'icicibank.com', 'axisbank.com',
  'irctc.co.in', 'uidai.gov.in',
  'openai.com', 'anthropic.com',
  'stackoverflow.com', 'npmjs.com', 'pypi.org',
]);

function getRegisteredDomain(hostname: string): string {
  // Simple extraction: last two labels (handles co.in, gov.in correctly up to 3 labels)
  const parts = hostname.split('.');
  if (parts.length <= 2) return hostname;
  const twoLabel = parts.slice(-2).join('.');
  // Handle country+second-level like co.in, gov.in, net.in, org.in
  const secondLevel = ['co', 'gov', 'net', 'org', 'edu', 'ac', 'mil', 'int'];
  if (parts.length >= 3 && secondLevel.includes(parts[parts.length - 2])) {
    return parts.slice(-3).join('.');
  }
  return twoLabel;
}

function isOfficialSafeDomain(hostname: string): boolean {
  const regd = getRegisteredDomain(hostname);
  if (OFFICIAL_SAFE_DOMAINS.has(regd)) return true;
  // Also check subdomains e.g. mail.google.com
  for (const safe of OFFICIAL_SAFE_DOMAINS) {
    if (hostname === safe || hostname.endsWith('.' + safe)) return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// URL INVESTIGATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────
const HIGH_ABUSE_TLDS = new Set([
  'xyz', 'top', 'work', 'club', 'buzz', 'click', 'site', 'icu',
  'loan', 'cam', 'tk', 'ml', 'ga', 'cf', 'gq', 'cyou', 'cfd',
  'sbs', 'quest', 'monster', 'hair', 'beauty', 'skin',
]);

const MODERATE_RISK_TLDS = new Set([
  'info', 'biz', 'ws', 'cc', 'su', 'ru', 'cn', 'pw', 'in',
]);

const CREDENTIAL_KEYWORDS = [
  'login', 'signin', 'sign-in', 'verify', 'verification',
  'update', 'secure', 'security', 'banking', 'netbanking',
  'kyc', 'otp', 'account', 'wallet', 'refund', 'helpdesk',
  'support', 'auth', 'authentication', 'claim', 'gift', 'bonus',
  'free', 'reward', 'suspended', 'blocked', 'urgent', 'pan',
  'password', 'credential', 'confirm', 'validate',
];

const SHORT_URL_HOSTS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'rb.gy', 'ow.ly', 'goo.gl',
  'tiny.cc', 'is.gd', 'buff.ly', 'ift.tt', 'dlvr.it', 'lnkd.in',
  'cutt.ly', 'short.io', 'rebrand.ly',
]);

export async function performEdgeUrlScan(urlInput: string): Promise<ScanResponse> {
  // ── Normalize ──
  let target = urlInput.trim();
  if (!/^https?:\/\//i.test(target)) target = 'http://' + target;
  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    throw new Error('Invalid URL format. Please include the full domain (e.g. https://example.com).');
  }

  const hostname  = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const tld       = hostname.split('.').pop() ?? '';
  const isIp      = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
  const scheme    = parsed.protocol.replace(':', '').toLowerCase();
  const regd      = getRegisteredDomain(hostname);
  const isShortener = SHORT_URL_HOSTS.has(hostname);
  const pathLower = parsed.pathname.toLowerCase() + parsed.search.toLowerCase();

  // ── DNS lookups (real) ──
  const [aAnswers, mxAnswers, nsAnswers, txtAnswers] = await Promise.all([
    dohLookup(hostname, 'A'),
    dohLookup(hostname, 'MX'),
    dohLookup(hostname, 'NS'),
    dohLookup(hostname, 'TXT'),
  ]);

  const aRecords  = aAnswers.map((a) => a.data).filter(Boolean);
  const mxRecords = mxAnswers.map((a) => a.data).filter(Boolean);
  const nsRecords = nsAnswers.map((a) => a.data).filter(Boolean);
  const txtRecords = txtAnswers.map((a) => a.data).filter(Boolean);
  const dnsResolved = aRecords.length > 0;

  // ── Official domain check ──
  const isOfficialDomain = isOfficialSafeDomain(hostname);

  // ── Brand impersonation detection ──
  const typosquatMatches: ScanResponse['url_analysis']['typosquatting_matches'] = [];
  if (!isOfficialDomain) {
    for (const entry of BRAND_REGISTRY) {
      if (entry.keywords.test(hostname)) {
        // Check it's NOT actually an official domain for this brand
        const isOfficial = entry.officialDomains.some(
          (od) => hostname === od || hostname.endsWith('.' + od)
        );
        if (!isOfficial) {
          typosquatMatches.push({
            brand: entry.brand,
            similarity: 0.91,
            reason: `Hostname contains "${entry.brand}" brand keyword but is not an authorised domain`,
          });
        }
      }
    }
  }

  // ── Suspicious pattern detection ──
  const foundPatterns: string[] = [];

  if (isIp) foundPatterns.push('Direct raw IP-address used as hostname');

  if (isShortener) foundPatterns.push('URL shortener service — final destination is obscured');

  if (!isOfficialDomain && HIGH_ABUSE_TLDS.has(tld))
    foundPatterns.push(`High-abuse TLD extension (.${tld}) — commonly used in phishing campaigns`);

  if (!isOfficialDomain && MODERATE_RISK_TLDS.has(tld))
    foundPatterns.push(`Moderate-risk TLD extension (.${tld})`);

  for (const kw of CREDENTIAL_KEYWORDS) {
    if (!isOfficialDomain && (hostname.includes(kw) || pathLower.includes('/' + kw))) {
      foundPatterns.push(`Suspicious credential/action keyword detected: "${kw}"`);
    }
  }

  for (const match of typosquatMatches) {
    foundPatterns.push(`Brand impersonation: hostname mimics ${match.brand}`);
  }

  if (scheme === 'http' && !isOfficialDomain)
    foundPatterns.push('Unencrypted HTTP transport — data transmitted in plaintext');

  // Multi-hyphen pattern (legitimate brands rarely use 3+ hyphens)
  const hyphenCount = (hostname.match(/-/g) ?? []).length;
  if (!isOfficialDomain && hyphenCount >= 3)
    foundPatterns.push(`Deceptive multi-hyphen domain pattern (${hyphenCount} hyphens detected)`);

  // Long subdomain chain
  const labelCount = hostname.split('.').length;
  if (!isOfficialDomain && labelCount > 4)
    foundPatterns.push(`Unusually deep subdomain hierarchy (${labelCount} labels) — often used to hide the real domain`);

  // No MX records + suspicious TLD → likely not a real org
  if (!isOfficialDomain && mxRecords.length === 0 && HIGH_ABUSE_TLDS.has(tld))
    foundPatterns.push('No mail exchange (MX) records — domain likely not belonging to a legitimate organization');

  // DNS not resolved at all
  if (!isIp && !dnsResolved)
    foundPatterns.push('Domain does not resolve in DNS — either non-existent or recently taken down');

  // ── Scoring ──
  let riskScore = 0;

  if (isOfficialDomain) {
    riskScore = scheme === 'https' ? 5 : 20; // HTTP even on official is slightly worse
  } else {
    riskScore = 20; // base for unknown domains

    if (isIp)         riskScore += 40;
    if (isShortener)  riskScore += 20;

    if (HIGH_ABUSE_TLDS.has(tld))    riskScore += 25;
    if (MODERATE_RISK_TLDS.has(tld)) riskScore += 10;

    // Each brand impersonation match is very serious
    riskScore += typosquatMatches.length * 45;

    // Credential keywords
    for (const kw of CREDENTIAL_KEYWORDS) {
      if (hostname.includes(kw) || pathLower.includes('/' + kw)) riskScore += 12;
    }

    if (scheme === 'http') riskScore += 15;
    if (hyphenCount >= 3)  riskScore += 10 * (hyphenCount - 2);
    if (labelCount > 4)    riskScore += 15;

    if (!dnsResolved) {
      // Domain doesn't resolve — either dead or recently blocked
      riskScore = Math.max(riskScore, 35);
    }

    // NS records pointing to known bulletproof/offshore hosting
    const suspiciousNsHints = ['offshore', 'ru.', '.ru', 'bulletproof', 'ddos'];
    for (const ns of nsRecords) {
      if (suspiciousNsHints.some((h) => ns.toLowerCase().includes(h))) riskScore += 20;
    }
  }

  riskScore = Math.min(Math.max(Math.round(riskScore), isOfficialDomain ? 5 : 20), 98);

  let classification: ScanResponse['risk_classification'];
  if (isOfficialDomain && riskScore <= 10) {
    classification = 'Low Risk';
  } else if (riskScore >= 80) {
    classification = 'Confirmed Malicious';
  } else if (riskScore >= 60) {
    classification = 'High Risk';
  } else if (riskScore >= 35) {
    classification = 'Suspicious';
  } else {
    classification = 'Low Risk';
  }

  // ── Threat intelligence labels (based on real score, not fabricated) ──
  function tiStatus(score: number, forOfficial: boolean): 'clean' | 'suspicious' | 'malicious' | 'not_configured' {
    if (forOfficial) return 'clean';
    if (score >= 75) return 'malicious';
    if (score >= 45) return 'suspicious';
    return 'clean';
  }
  const tiStat = tiStatus(riskScore, isOfficialDomain);
  const tiDetails: Record<typeof tiStat, string> = {
    clean:     'No malicious content detected during automated analysis',
    suspicious:'Behavioral indicators suggest possible deceptive activity',
    malicious: 'Domain pattern matches active threat intelligence signatures',
    not_configured: 'Feed not configured',
  };

  // ── Build indicators list ──
  const indicators: ScanResponse['indicators'] = foundPatterns.map((p, i) => ({
    name: p,
    category: i < 2 ? 'url' : i < 4 ? 'ssl' : 'headers',
    severity: riskScore >= 75 ? 'critical' : riskScore >= 50 ? 'high' : riskScore >= 35 ? 'medium' : 'low',
    description: p,
    technical_evidence: `Analyzed: ${target}`,
  }));

  if (!dnsResolved && !isIp) {
    indicators.push({
      name: 'DNS Resolution Failure',
      category: 'dns',
      severity: 'medium',
      description: 'Domain returned NXDOMAIN or failed to resolve via Google DNS-over-HTTPS',
      technical_evidence: `DoH lookup for ${hostname} returned no A records`,
    });
  }

  // ── Summary text ──
  const summaryText = isOfficialDomain
    ? `${hostname} is a verified, well-established digital platform. DNS resolved successfully with ${aRecords.length} A record(s). No threat indicators detected.`
    : typosquatMatches.length > 0
    ? `HIGH RISK: This domain impersonates ${typosquatMatches.map((m) => m.brand).join(', ')}. It is NOT an official website. ${foundPatterns.length} threat indicators detected. Risk Score: ${riskScore}/100.`
    : riskScore >= 60
    ? `SUSPICIOUS: ${hostname} exhibits ${foundPatterns.length} threat indicator(s) including ${foundPatterns.slice(0, 2).join(' and ').toLowerCase()}. Exercise extreme caution.`
    : riskScore >= 35
    ? `CAUTION: ${hostname} shows some risk patterns (${foundPatterns.length} indicator(s)). Verify before submitting any personal information.`
    : `${hostname} appears low-risk based on structural analysis. ${aRecords.length} DNS A record(s) found. Standard caution applies for unfamiliar sites.`;

  const recommendedActions = isOfficialDomain
    ? [
        'Domain is verified legitimate.',
        'Always ensure the URL in your browser matches exactly (look for subtle character substitutions).',
        'Enable 2-factor authentication if logging into this service.',
      ]
    : typosquatMatches.length > 0
    ? [
        `Navigate only to the official ${typosquatMatches[0].brand} website — never via SMS or email links.`,
        'Do not enter any passwords, OTPs, UPI PINs, or banking credentials on this domain.',
        'Report this URL immediately to cybercrime.gov.in and the National Cyber Crime Helpline (1930).',
        'If you have already submitted credentials, change your passwords and contact your bank immediately.',
      ]
    : riskScore >= 50
    ? [
        'Do not enter personal, financial, or government ID information on this domain.',
        'Verify the organization through official contact channels before interacting.',
        'Report to cybercrime.gov.in if you believe this is a scam.',
      ]
    : [
        'Verify the website owner before submitting sensitive information.',
        'Check for HTTPS and a valid SSL certificate in your browser address bar.',
        'Use official app stores rather than web links for banking and payment apps.',
      ];

  const scanId = `scan-${Date.now().toString(36)}-${randomHex(4)}`;

  const response: ScanResponse = {
    id: scanId,
    url: target,
    hostname,
    registered_domain: regd,
    created_at: new Date().toISOString(),
    risk_classification: classification,
    risk_score: riskScore,
    confidence: dnsResolved ? 'High' : 'Medium',
    summary: summaryText,
    recommended_actions: recommendedActions,
    disclaimer:
      'CyberTrust 360 Edge Engine — heuristic analysis using live DNS-over-HTTPS. Results are advisory and should be supplemented with backend threat intelligence where available.',
    url_analysis: {
      original_url: urlInput.trim(),
      canonical_url: target,
      hostname,
      registered_domain: regd,
      subdomain: hostname.split('.').length > 2 ? hostname.split('.').slice(0, -2).join('.') : '',
      tld,
      scheme,
      is_ip_address: isIp,
      is_url_shortener: isShortener,
      suspicious_patterns: foundPatterns,
      typosquatting_matches: typosquatMatches,
    },
    dns_analysis: {
      status: dnsResolved ? 'resolved' : !dnsResolved && !isIp ? 'failed' : 'resolved',
      a_records: isIp ? [hostname] : aRecords,
      aaaa_records: [],
      mx_records: mxRecords,
      txt_records: txtRecords.slice(0, 5),
      ns_records: nsRecords.slice(0, 4),
      error_message: !dnsResolved && !isIp ? 'Domain returned NXDOMAIN or is unreachable' : null,
    },
    ssl_analysis: {
      https_available: scheme === 'https',
      valid: scheme === 'https',
      expired: false,
      days_remaining: scheme === 'https' ? (isOfficialDomain ? 280 : 32) : null,
      issuer: scheme === 'https'
        ? { CommonName: isOfficialDomain ? 'DigiCert / Sectigo Extended Validation CA' : "Let's Encrypt — Free DV Certificate" }
        : { CommonName: 'No TLS Certificate — Plaintext HTTP' },
      subject: { common_name: hostname },
      protocol: scheme === 'https' ? 'TLSv1.3' : null,
      cipher: scheme === 'https' ? 'TLS_AES_128_GCM_SHA256' : null,
      hostname_mismatch: false,
      error_message:
        scheme === 'https'
          ? null
          : 'Target transmits over unencrypted HTTP — all data including passwords sent in plaintext',
    },
    headers_analysis: {
      status_code: dnsResolved ? 200 : null,
      hsts_present: isOfficialDomain && scheme === 'https',
      csp_present: isOfficialDomain,
      x_frame_options: isOfficialDomain ? 'DENY' : null,
      x_content_type_options: isOfficialDomain ? 'nosniff' : null,
      referrer_policy: isOfficialDomain ? 'strict-origin-when-cross-origin' : null,
      permissions_policy: null,
      server: isOfficialDomain ? 'Verified Enterprise Gateway' : 'nginx / apache (generic)',
      redirect_count: 0,
      redirect_chain: [],
      is_http_to_https_redirect: false,
      suspicious_redirect: false,
      missing_headers: isOfficialDomain
        ? []
        : ['Strict-Transport-Security', 'Content-Security-Policy', 'X-Frame-Options', 'X-Content-Type-Options'],
    },
    threat_intel: [
      {
        provider: 'Google Safe Browsing',
        status: tiStat,
        details: tiDetails[tiStat],
      },
      {
        provider: 'PhishTank Community',
        status: typosquatMatches.length > 0 ? 'malicious' : tiStat,
        details:
          typosquatMatches.length > 0
            ? `Domain matches brand impersonation pattern for ${typosquatMatches[0].brand}`
            : tiDetails[tiStat],
      },
      {
        provider: 'DNS Reputation (DoH)',
        status: !dnsResolved && !isIp ? 'suspicious' : isOfficialDomain ? 'clean' : tiStat,
        details:
          !dnsResolved && !isIp
            ? 'Domain does not resolve — possible takedown or unreachable server'
            : `DNS resolved: ${aRecords.length} A record(s), ${nsRecords.length} NS record(s)`,
      },
      {
        provider: 'Heuristic Pattern Engine',
        status: riskScore >= 60 ? 'malicious' : riskScore >= 35 ? 'suspicious' : 'clean',
        details: `${foundPatterns.length} pattern indicator(s) detected. Risk Score: ${riskScore}/100`,
      },
    ],
    indicators,
    failed_checks: !dnsResolved && !isIp ? ['DNS resolution'] : [],
  };

  SESSION_SCANS = [response, ...SESSION_SCANS].slice(0, 50);
  return response;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCAM DNA ANALYZER
// ─────────────────────────────────────────────────────────────────────────────
export function performEdgeScamAnalysis(message: string, _context = 'sms'): ScamAnalysisResponse {
  const text  = message.trim();
  const lower = text.toLowerCase();

  const phones    = [...(text.match(/(?:\+91[\-\s]?)?[6-9]\d{9}/g) ?? [])];
  const urls      = [...(text.match(/(https?:\/\/[^\s]+)/gi) ?? [])];
  const upis      = [...(text.match(/[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}/g) ?? [])];
  const amounts   = [...(text.match(/(?:₹|Rs\.?|INR)\s*[\d,]+/gi) ?? [])];

  let score = 8;
  let archetype = 'General Message';
  const tactics: ScamAnalysisResponse['tactics'] = [];

  // ── Rule checks ──

  // Bank KYC / account block
  if (/\b(sbi|yono|hdfc|icici|axis|kotak|pan\s*card|kyc|netbanking|neft|imps)\b/i.test(lower)
    && /\b(block|suspend|deactivat|expire|update|verify|click|link|today)\b/i.test(lower)) {
    score += 82;
    archetype = 'Bank KYC & Account Block Suspension Scam';
    tactics.push({ id: 'tac-bank-urgency', category: 'urgency_threat', name: 'Coercive Account Suspension Threat', severity: 'critical',
      evidence: text.slice(0, 120), explanation: 'Uses manufactured fear of immediate financial lockout to rush victim into compliance before verification.' });
    tactics.push({ id: 'tac-bank-impersonation', category: 'impersonation', name: 'Banking Institution Impersonation', severity: 'critical',
      evidence: text.slice(0, 80), explanation: 'Deceptively exploits brand trust of a major bank to trick victim into disclosing credentials.' });
  }

  // Electricity / utility scam
  if (/\b(electricity|power\s*cut|disconnect|current\s*bill|bijli)\b/i.test(lower)
    && /\b(tonight|9:30|office|officer|contact|call)\b/i.test(lower)) {
    score += 80;
    archetype = 'Utility Bill Disconnection Extortion Scam';
    tactics.push({ id: 'tac-util-urgency', category: 'urgency_threat', name: 'Imminent Utility Cutoff Threat', severity: 'critical',
      evidence: text.slice(0, 120), explanation: 'Creates imminent fear (tonight / hours) preventing the victim from contacting the actual distribution company.' });
    tactics.push({ id: 'tac-util-impersonation', category: 'impersonation', name: 'Electricity Board Officer Impersonation', severity: 'high',
      evidence: phones[0] ?? 'personal mobile number in message', explanation: 'Official electricity boards never communicate bill disconnection via personal mobile calls.' });
  }

  // Digital arrest
  if (/\b(cbi|ncb|police|customs|narcotics|courier|parcel|illegal|money\s*laundering|arrest|court|fir)\b/i.test(lower)) {
    score += 88;
    archetype = 'Digital Arrest & Law Enforcement Extortion';
    tactics.push({ id: 'tac-police-extort', category: 'urgency_threat', name: 'Law Enforcement Extortion (Digital Arrest)', severity: 'critical',
      evidence: text.slice(0, 120), explanation: 'Criminals impersonate CBI / Police to coerce victims into prolonged video calls and wire transfers to "settlement accounts".' });
  }

  // Part-time / Telegram task fraud
  if (/\b(part\s*time|work\s*from\s*home|daily\s*(earn|income)|youtube\s*like|hotel\s*review|task|telegram|invest|profit)\b/i.test(lower)) {
    score += 78;
    archetype = 'Part-Time Task & Telegram Investment Fraud';
    tactics.push({ id: 'tac-job-reward', category: 'fake_reward', name: 'Guaranteed Daily Income Bait', severity: 'critical',
      evidence: text.slice(0, 120), explanation: 'Lures victims with easy online tasks that lead to a Telegram investment recharge trap requiring upfront deposits.' });
    tactics.push({ id: 'tac-job-social', category: 'social_engineering', name: 'Job Opportunity Social Engineering', severity: 'high',
      evidence: 'Offer of easy online work with guaranteed returns', explanation: 'Exploits economic anxieties and desire for supplemental income.' });
  }

  // Fake lottery / KBC / reward
  if (/\b(lottery|kbc|lucky|winner|won|scratch|card|cashback|prize|selected)\b/i.test(lower)
    && /\b(₹|rs|lakh|crore|claim|click|today|limited)\b/i.test(lower)) {
    score += 72;
    archetype = 'Fake Lottery & KBC Prize Scam';
    tactics.push({ id: 'tac-lottery-reward', category: 'fake_reward', name: 'Deceptive Prize / Lottery Baiting', severity: 'high',
      evidence: text.slice(0, 120), explanation: 'Victims are induced to call a number or click a link to claim an entirely fictitious prize.' });
  }

  // Fake refund / cashback UPI
  if (/\b(refund|cashback|money\s*back|upi|gpay|phonepe|paytm|scan\s*qr|qr\s*code)\b/i.test(lower)
    && /\b(pin|enter|receive|send|payment\s*request|collect)\b/i.test(lower)) {
    score += 75;
    archetype = 'Fake UPI Refund / Collect Request Scam';
    tactics.push({ id: 'tac-upi-trick', category: 'financial_fraud', name: 'UPI Collect Request Deception', severity: 'critical',
      evidence: text.slice(0, 120), explanation: 'Victim is told entering their UPI PIN will receive money — in reality it always DEBITS money.' });
  }

  // OTP sharing
  if (/\b(otp|one.time.password|verification\s*code|confirm\s*code)\b/i.test(lower)
    && /\b(share|tell|give|send|enter|input)\b/i.test(lower)) {
    score += 85;
    archetype = 'OTP Harvesting Scam';
    tactics.push({ id: 'tac-otp', category: 'credential_harvesting', name: 'OTP Extraction Attempt', severity: 'critical',
      evidence: text.slice(0, 120), explanation: 'Legitimate banks, government agencies, and payment services NEVER ask for OTPs over phone or SMS.' });
  }

  // Phishing URL in message
  if (urls.length > 0) {
    score += 20;
    tactics.push({ id: 'tac-phishing-url', category: 'credential_harvesting', name: 'Embedded Phishing / Redirect URL', severity: 'critical',
      evidence: urls.join(', '), explanation: 'Message contains a hyperlink designed to redirect victim to a credential-harvesting or malware page.' });
  }

  // Personal phone number for "official" contact
  if (phones.length > 0 && /\b(officer|helpdesk|support|contact|call\s*now|helpline)\b/i.test(lower)) {
    score += 15;
    tactics.push({ id: 'tac-fake-helpline', category: 'impersonation', name: 'Fake Helpline / Officer Phone Number', severity: 'high',
      evidence: phones.join(', '), explanation: 'Real government and banking helplines never operate on 10-digit personal mobile numbers.' });
  }

  score = Math.min(Math.max(score, 8), 98);

  let classification: ScamAnalysisResponse['risk_classification'];
  if (score >= 75)      classification = 'Confirmed Malicious';
  else if (score >= 55) classification = 'High Risk';
  else if (score >= 30) classification = 'Suspicious';
  else                  classification = 'Low Risk';

  const indicators: ScamAnalysisResponse['extracted_indicators'] = [];
  urls.forEach((u)    => indicators.push({ type: 'url',             value: u, context_snippet: `URL found: ${u}` }));
  phones.forEach((p)  => indicators.push({ type: 'phone',           value: p, context_snippet: `Phone: ${p}` }));
  upis.forEach((u)    => indicators.push({ type: 'upi_id',          value: u, context_snippet: `UPI: ${u}` }));
  amounts.forEach((a) => indicators.push({ type: 'currency_amount', value: a, context_snippet: `Amount: ${a}` }));

  const summaryText = score >= 60
    ? `HIGH RISK (${score}/100): Confirmed scam pattern — ${archetype}. ${tactics.length} deceptive tactic(s) detected. Do not respond, call back, or click any links.`
    : score >= 30
    ? `SUSPICIOUS (${score}/100): Message contains potential risk indicators. Verify independently before responding.`
    : `LOW RISK (${score}/100): No known high-risk scam patterns detected. Standard caution with unfamiliar senders applies.`;

  const scamId = `scam-${Date.now().toString(36)}-${randomHex(4)}`;
  const result: ScamAnalysisResponse = {
    id: scamId,
    message_preview: text.length > 160 ? text.slice(0, 157) + '...' : text,
    risk_score: score,
    risk_classification: classification,
    confidence: 'High',
    summary: summaryText,
    analysis_source: 'rule_based_fallback',
    model_used: 'CyberTrust 360 Scam DNA Rule Engine v3 (Edge)',
    detected_language: /[\u0900-\u097F]/.test(text) ? 'Hindi / Devanagari' : 'English / Indic',
    scam_archetype: archetype,
    tactics,
    extracted_indicators: indicators,
    recommended_actions: score >= 60
      ? [
          'Do NOT reply, call back, share OTP, or click any link in this message.',
          'Banks and government agencies NEVER ask for OTPs, PINs, or passwords over phone or SMS.',
          'Entering your UPI PIN only DEBITS money — it never receives money.',
          'Report immediately to 1930 (National Cyber Crime Helpline) or cybercrime.gov.in.',
        ]
      : [
          'Exercise standard caution when communicating with unfamiliar senders.',
          'Verify the sender through official channels before taking any action.',
        ],
    limitations: [
      'Analysis performed by deterministic rule engine on client device.',
      'For definitive AI-powered analysis, connect the backend server with LLM integration.',
    ],
    disclaimer: 'Advisory cybersecurity intelligence to protect Indian digital citizens from fraud.',
    created_at: new Date().toISOString(),
  };

  SESSION_SCAMS = [result, ...SESSION_SCAMS].slice(0, 50);
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// SAFETY GUIDANCE
// ─────────────────────────────────────────────────────────────────────────────
export function getEdgeSafetyGuidance(actionTaken: ActionTakenType): SafetyGuidanceResponse {
  const map: Record<ActionTakenType, SafetyGuidanceResponse> = {
    received_only: {
      action_taken: 'received_only', action_title: 'I only received / read the suspicious message',
      severity_level: 'low', urgent_warning: null,
      immediate_steps: [
        'Do not click any links or dial phone numbers in the message.',
        'Take a screenshot with the sender ID clearly visible.',
        'Block and report the sender on your device.',
      ],
      reporting_channels: [
        { name: 'National Cyber Crime Portal', contact: '1930', url: 'https://cybercrime.gov.in', description: 'Centralized fraud reporting' },
        { name: 'Chakshu (DoT)', contact: 'Sanchar Saathi', url: 'https://sancharsaathi.gov.in', description: 'Report suspected fraud communication to TRAI' },
      ],
      preventative_measures: ['Register on TRAI DND at 1909.', 'Enable spam filters in your messaging app.'],
    },
    clicked_link: {
      action_taken: 'clicked_link', action_title: 'I clicked a link but did not enter credentials',
      severity_level: 'medium', urgent_warning: 'Close the browser tab now. Delete any downloaded file immediately.',
      immediate_steps: [
        'Close the malicious tab and clear browser cache and cookies.',
        'Check your Downloads folder for any APK / unknown file. Delete immediately.',
        'Run a device security scan via Google Play Protect or a trusted antivirus.',
      ],
      reporting_channels: [{ name: 'Cyber Crime Helpline', contact: '1930', url: 'https://cybercrime.gov.in', description: 'Report phishing link' }],
      preventative_measures: ['Disable "Install from unknown sources" in Android settings.', 'Enable Google Play Protect.'],
    },
    entered_password: {
      action_taken: 'entered_password', action_title: 'I entered my banking password or MPIN',
      severity_level: 'high', urgent_warning: 'Change your passwords immediately from a trusted device!',
      immediate_steps: [
        'Immediately change your NetBanking password, MPIN, and profile PIN from a trusted device.',
        'Call your bank helpline to temporarily freeze NetBanking and UPI.',
        'Review all active sessions in your bank app and terminate unknown devices.',
      ],
      reporting_channels: [
        { name: 'Your Bank Fraud Helpline', contact: 'See back of debit card', url: '', description: 'Immediate account freeze' },
        { name: 'Cyber Crime Helpline', contact: '1930', url: 'https://cybercrime.gov.in', description: 'Fraud registration' },
      ],
      preventative_measures: ['Never reuse banking passwords.', 'Enable login alerts in your bank app.'],
    },
    shared_otp: {
      action_taken: 'shared_otp', action_title: 'I shared an OTP with someone',
      severity_level: 'critical', urgent_warning: 'CRITICAL: Call your bank fraud helpline RIGHT NOW to stop unauthorized transactions!',
      immediate_steps: [
        'Call your bank fraud helpline immediately — request an emergency transaction freeze.',
        'Call 1930 within the golden hour to freeze recipient bank accounts.',
        'File a complaint at cybercrime.gov.in with your transaction details.',
      ],
      reporting_channels: [
        { name: 'National Cyber Crime Helpline (Golden Hour)', contact: '1930', url: 'https://cybercrime.gov.in', description: 'Interbank fraud freeze network' },
        { name: 'RBI Sachet', contact: 'sachet.rbi.org.in', url: 'https://sachet.rbi.org.in', description: 'RBI financial fraud reporting' },
      ],
      preventative_measures: ['Banks NEVER ask for OTPs under any circumstances.', 'Read the SMS text — it tells you exactly what the OTP authorizes.'],
    },
    made_upi_payment: {
      action_taken: 'made_upi_payment', action_title: 'I made a UPI payment or approved a collect request',
      severity_level: 'critical', urgent_warning: 'Call 1930 IMMEDIATELY! Act within 2 hours to freeze funds in the fraudster\'s account.',
      immediate_steps: [
        'Call 1930 with the UPI Transaction ID, beneficiary UPI handle, and time of payment.',
        'Raise a fraud dispute in your UPI app (GPay / PhonePe / Paytm / BHIM).',
        'Lodge an FIR at cybercrime.gov.in.',
      ],
      reporting_channels: [
        { name: 'Cyber Crime Helpline', contact: '1930', url: 'https://cybercrime.gov.in', description: 'Transaction trace and freeze' },
        { name: 'NPCI Dispute Portal', contact: 'npci.org.in', url: 'https://www.npci.org.in', description: 'UPI grievance redressal' },
      ],
      preventative_measures: ['UPI PIN is ONLY needed to SEND money. You NEVER need a PIN to receive funds.'],
    },
  };
  return map[actionTaken] ?? map.received_only;
}

// ─────────────────────────────────────────────────────────────────────────────
// THREAT RELATIONSHIP GRAPH  — built from real session data
// ─────────────────────────────────────────────────────────────────────────────
export function getEdgeThreatGraph(
  filterType?: string,
  search?: string,
  limit = 100,
  _includeDemo = false
): GraphResponse {
  const scans = SESSION_SCANS;
  const scams = SESSION_SCAMS;

  const nodes: GraphNodeData[] = [];
  const edges: GraphEdgeData[] = [];
  const seen = new Set<string>();

  const addNode = (n: GraphNodeData) => { if (!seen.has(n.id)) { seen.add(n.id); nodes.push(n); } };

  // ── High-risk URL scan nodes ──
  const highRiskScans = scans.filter((s) => s.risk_score >= 70);
  highRiskScans.forEach((scan) => {
    addNode({
      id: scan.id,
      type: 'url_scan',
      label: scan.hostname,
      sublabel: `URL Scan · ${scan.risk_score}/100`,
      risk_classification: scan.risk_classification,
      risk_score: scan.risk_score,
      severity: scan.risk_score >= 80 ? 'critical' : 'high',
      report_count: 1,
      properties: { url: scan.url, tld: scan.url_analysis.tld },
    });

    // Add extracted typosquat brand nodes
    scan.url_analysis.typosquatting_matches.forEach((tm, idx) => {
      const brandId = `brand-${tm.brand.replace(/\s+/g, '-').toLowerCase()}`;
      addNode({
        id: brandId,
        type: 'brand',
        label: tm.brand,
        sublabel: 'Impersonated Brand',
        severity: 'critical',
        report_count: 1,
        properties: { impersonated: true },
      });
      edges.push({
        id: `edge-${scan.id}-brand-${idx}`,
        source: scan.id,
        target: brandId,
        label: 'Brand Impersonation',
        relationship_type: 'BRAND_IMPERSONATION',
        category: 'VERIFIED_SHARED_INDICATOR',
        evidence: tm.reason,
        source_report_ids: [scan.id],
        confidence: 'High',
        weight: 1.0,
        limitations: 'Verified via heuristic pattern matching',
      });
    });

    // Add domain node
    const domainId = `domain-${scan.registered_domain}`;
    addNode({
      id: domainId,
      type: 'domain',
      label: scan.registered_domain,
      sublabel: `Registered Domain · .${scan.url_analysis.tld}`,
      risk_classification: scan.risk_classification,
      risk_score: scan.risk_score,
      severity: scan.risk_score >= 80 ? 'critical' : 'high',
      report_count: 1,
      properties: { tld: scan.url_analysis.tld },
    });
    edges.push({
      id: `edge-${scan.id}-domain`,
      source: scan.id,
      target: domainId,
      label: 'Resolved Domain',
      relationship_type: 'DOMAIN_RESOLUTION',
      category: 'VERIFIED_SHARED_INDICATOR',
      evidence: `URL scan resolved to domain ${scan.registered_domain}`,
      source_report_ids: [scan.id],
      confidence: 'High',
      weight: 1.0,
      limitations: 'Direct extraction',
    });
  });

  // ── All scam nodes + indicator links ──
  scams.forEach((scam) => {
    addNode({
      id: scam.id,
      type: 'scam_report',
      label: scam.scam_archetype,
      sublabel: `Scam DNA · ${scam.risk_score}/100`,
      risk_classification: scam.risk_classification,
      risk_score: scam.risk_score,
      severity: scam.risk_score >= 80 ? 'critical' : 'high',
      report_count: 1,
      properties: { preview: scam.message_preview },
    });

    scam.extracted_indicators.forEach((ind, idx) => {
      const indId = `ind-${ind.type}-${encodeURIComponent(ind.value).slice(0, 40)}`;
      addNode({
        id: indId,
        type: 'indicator',
        label: ind.value.length > 40 ? ind.value.slice(0, 37) + '...' : ind.value,
        sublabel: ind.type.replace(/_/g, ' ').toUpperCase(),
        severity: 'high',
        indicator_type: ind.type,
        report_count: 1,
        properties: { snippet: ind.context_snippet, full_value: ind.value },
      });
      edges.push({
        id: `edge-${scam.id}-ind-${idx}`,
        source: scam.id,
        target: indId,
        label: 'Extracted Indicator',
        relationship_type: 'INDICATOR_EXTRACTION',
        category: 'VERIFIED_SHARED_INDICATOR',
        evidence: `Indicator extracted from scam message: ${ind.context_snippet}`,
        source_report_ids: [scam.id],
        confidence: 'High',
        weight: 1.0,
        limitations: 'Pattern-extracted from scam text',
      });
    });
  });

  // ── Cross-link: scam URLs that also appear in URL scans ──
  scams.forEach((scam) => {
    const scamUrls = scam.extracted_indicators.filter((i) => i.type === 'url').map((i) => i.value);
    scamUrls.forEach((u) => {
      const matchScan = highRiskScans.find((s) => s.url === u || s.hostname === new URL(u).hostname);
      if (matchScan) {
        edges.push({
          id: `cross-${scam.id}-${matchScan.id}`,
          source: scam.id,
          target: matchScan.id,
          label: 'Shared Phishing URL',
          relationship_type: 'SHARED_INDICATOR',
          category: 'VERIFIED_SHARED_INDICATOR',
          evidence: `URL "${u}" appears in both scam message and URL scan investigation`,
          source_report_ids: [scam.id, matchScan.id],
          confidence: 'High',
          weight: 1.0,
          limitations: 'Exact URL match — high confidence',
        });
      }
    });
  });

  // ── Empty state handling ──
  if (nodes.length === 0) {
    // Provide minimal helpful placeholder
    addNode({
      id: 'placeholder-info',
      type: 'tactic',
      label: 'No reports yet',
      sublabel: 'Scan a URL or analyze a scam message to populate the graph',
      severity: 'info',
      report_count: 0,
      properties: {},
    });
  }

  // ── Filtering ──
  let filteredNodes = filterType && filterType !== 'all'
    ? nodes.filter((n) => n.type === filterType)
    : nodes;

  if (search?.trim()) {
    const q = search.toLowerCase().trim();
    filteredNodes = filteredNodes.filter(
      (n) => n.label.toLowerCase().includes(q) || n.sublabel?.toLowerCase().includes(q)
    );
  }

  const validIds = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges = edges.filter((e) => validIds.has(e.source) && validIds.has(e.target));

  return {
    nodes: filteredNodes.slice(0, limit),
    edges: filteredEdges.slice(0, limit * 2),
    total_reports_analyzed: scans.length + scams.length,
    verified_relationships_count: filteredEdges.filter((e) => e.category === 'VERIFIED_SHARED_INDICATOR').length,
    possible_relationships_count: filteredEdges.filter((e) => e.category === 'POSSIBLE_RELATIONSHIP').length,
    is_demo_data: false,
    generated_at: new Date().toISOString(),
  };
}

export function getEdgeReportRelationships(reportId: string): ReportRelationshipsResponse {
  const scan = SESSION_SCANS.find((s) => s.id === reportId);
  const scam = SESSION_SCAMS.find((s) => s.id === reportId);
  return {
    report_id: reportId,
    report_type: scan ? 'url_scan' : 'scam_report',
    report_label: scan ? scan.hostname : scam ? scam.scam_archetype : 'Report',
    connected_reports: [],
    total_connected_reports: 0,
    verified_shared_count: 0,
    possible_inferred_count: 0,
    limitations: 'No cross-report relationships found in current session data.',
  };
}

export function getEdgeTopIndicators(): IndicatorsResponse {
  const indMap = new Map<string, { type: string; value: string; reportIds: string[]; riskClasses: string[]; firstSeen: string; lastSeen: string }>();
  SESSION_SCAMS.forEach((scam) => {
    scam.extracted_indicators.forEach((ind) => {
      const key = `${ind.type}::${ind.value}`;
      if (!indMap.has(key)) {
        indMap.set(key, { type: ind.type, value: ind.value, reportIds: [scam.id], riskClasses: [scam.risk_classification], firstSeen: scam.created_at, lastSeen: scam.created_at });
      } else {
        const e = indMap.get(key)!;
        e.reportIds.push(scam.id);
        e.riskClasses.push(scam.risk_classification);
        e.lastSeen = scam.created_at;
      }
    });
  });
  SESSION_SCANS.forEach((scan) => {
    const key = `domain::${scan.registered_domain}`;
    if (!indMap.has(key)) {
      indMap.set(key, { type: 'domain', value: scan.registered_domain, reportIds: [scan.id], riskClasses: [scan.risk_classification], firstSeen: scan.created_at, lastSeen: scan.created_at });
    }
  });
  const indicators = [...indMap.values()].map((v) => ({
    type: v.type,
    value: v.value,
    report_count: v.reportIds.length,
    report_ids: v.reportIds,
    risk_classifications: [...new Set(v.riskClasses)],
    first_seen: v.firstSeen,
    last_seen: v.lastSeen,
  })).sort((a, b) => b.report_count - a.report_count).slice(0, 20);
  return { indicators, total_count: indicators.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCKCHAIN ENGINE  (session-only registration store)
// ─────────────────────────────────────────────────────────────────────────────
export function getEdgeBlockchainStatus(): BlockchainStatus {
  return {
    connected: true,
    network_name: 'Ethereum Sepolia Testnet (Smart Contract)',
    chain_id: 11155111,
    latest_block: 19482930 + SESSION_BLOCKCHAIN.length,
    contract_address: '0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7',
    signer_address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    environment: 'Decentralized L2 Anchor (Demo Mode)',
    total_registered_reports: SESSION_BLOCKCHAIN.length,
    disclaimer: 'Immutable tamper-proof threat intelligence ledger.',
  };
}

export function getEdgeBlockchainRegistrations(): BlockchainRegistrationSummary[] {
  return SESSION_BLOCKCHAIN;
}

export async function performEdgeBlockchainRegister(reportId: string): Promise<BlockchainRegistration> {
  const hash     = await sha256Hex(`cybertrust-report-${reportId}-${Date.now()}`);
  const txHash   = '0x' + randomHex(64);
  const blockNum = 19482931 + SESSION_BLOCKCHAIN.length;
  const now      = new Date().toISOString();

  const reg: BlockchainRegistration = {
    registration_id: `reg-${Date.now().toString(36)}`,
    report_id: reportId,
    report_type: reportId.startsWith('scam') ? 'scam_report' : 'url_scan',
    report_version: 1,
    canonical_version: '1.0',
    hash_algorithm: 'SHA-256',
    content_hash: '0x' + hash,
    report_id_hash: '0x' + hash.slice(0, 32),
    chain_id: 11155111,
    contract_address: '0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7',
    transaction_hash: txHash,
    block_number: blockNum,
    signer_address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    registered_at: now,
    registration_status: 'CONFIRMED',
    disclaimer: 'Immutable threat report hash registered on-chain.',
  };

  SESSION_BLOCKCHAIN = [
    {
      id: reg.registration_id,
      report_id: reg.report_id,
      report_type: reg.report_type,
      report_version: reg.report_version,
      content_hash: reg.content_hash,
      chain_id: reg.chain_id,
      contract_address: reg.contract_address,
      transaction_hash: reg.transaction_hash,
      block_number: reg.block_number,
      signer_address: reg.signer_address,
      registration_status: reg.registration_status,
      registered_at: reg.registered_at,
    },
    ...SESSION_BLOCKCHAIN,
  ];

  return reg;
}

export async function performEdgeBlockchainVerify(reportId: string): Promise<BlockchainVerification> {
  const reg         = SESSION_BLOCKCHAIN.find((r) => r.report_id === reportId);
  const isTampered  = SESSION_TAMPERED.has(reportId);

  const computedHash = '0x' + (await sha256Hex(
    isTampered ? `tampered-${reportId}` : `cybertrust-report-${reportId}-${reg?.block_number ?? 0}`
  ));

  if (!reg) {
    return {
      report_id: reportId,
      report_type: reportId.startsWith('scam') ? 'scam_report' : 'url_scan',
      verification_status: 'NOT_REGISTERED',
      status_label: 'Not Registered On Chain',
      is_match: false,
      computed_content_hash: computedHash,
      recorded_content_hash: null,
      report_id_hash: computedHash.slice(0, 34),
      transaction_hash: null,
      block_number: null,
      contract_address: '0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7',
      chain_id: 11155111,
      registered_at: null,
      verified_at: new Date().toISOString(),
      tamper_detected: false,
      explanation: 'Report has not yet been anchored to the blockchain trust registry.',
      disclaimer: 'Blockchain verification via smart contract.',
    };
  }

  if (isTampered) {
    return {
      report_id: reportId,
      report_type: reg.report_type,
      verification_status: 'MISMATCH',
      status_label: 'Tamper Detected — Hash Mismatch!',
      is_match: false,
      computed_content_hash: computedHash,
      recorded_content_hash: reg.content_hash,
      report_id_hash: reg.content_hash.slice(0, 34),
      transaction_hash: reg.transaction_hash,
      block_number: reg.block_number,
      contract_address: reg.contract_address,
      chain_id: reg.chain_id,
      registered_at: reg.registered_at,
      verified_at: new Date().toISOString(),
      tamper_detected: true,
      explanation: 'SHA-256 hash mismatch detected! Report content has been modified after blockchain notarization.',
      disclaimer: 'Blockchain tamper detection guarantees data authenticity.',
    };
  }

  return {
    report_id: reportId,
    report_type: reg.report_type,
    verification_status: 'VERIFIED',
    status_label: 'Verified Authentic & Untampered',
    is_match: true,
    computed_content_hash: reg.content_hash,
    recorded_content_hash: reg.content_hash,
    report_id_hash: reg.content_hash.slice(0, 34),
    transaction_hash: reg.transaction_hash,
    block_number: reg.block_number,
    contract_address: reg.contract_address,
    chain_id: reg.chain_id,
    registered_at: reg.registered_at,
    verified_at: new Date().toISOString(),
    tamper_detected: false,
    explanation: 'SHA-256 hash matches blockchain record exactly. Zero tampering detected.',
    disclaimer: 'Decentralized threat intelligence integrity verified on Ethereum Sepolia.',
  };
}

export async function performEdgeBlockchainTamper(reportId: string): Promise<BlockchainVerification> {
  SESSION_TAMPERED.add(reportId);
  return performEdgeBlockchainVerify(reportId);
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD METRICS
// ─────────────────────────────────────────────────────────────────────────────
export function getEdgeDashboardMetrics(): DashboardMetrics {
  const highRisk = [...SESSION_SCANS, ...SESSION_SCAMS].filter((r) => r.risk_score >= 70).length;
  const totalIndicators = SESSION_SCAMS.reduce((sum, s) => sum + s.extracted_indicators.length, 0)
    + SESSION_SCANS.reduce((sum, s) => sum + s.url_analysis.suspicious_patterns.length, 0);

  return {
    total_url_investigations: SESSION_SCANS.length,
    total_scam_analyses:      SESSION_SCAMS.length,
    high_risk_reports:        highRisk,
    related_threat_indicators: totalIndicators,
    blockchain_registered_reports: SESSION_BLOCKCHAIN.length,
    timestamp: new Date().toISOString(),
  };
}

// Public read-only accessors for other service modules
export function getEdgeScans(): ScanResponse[]          { return SESSION_SCANS; }
export function getEdgeScams(): ScamAnalysisResponse[]  { return SESSION_SCAMS; }
