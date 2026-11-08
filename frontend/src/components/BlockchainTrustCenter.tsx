import { OrbitalScene } from './OrbitalScene';
import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Cpu,
  Layers,
  Lock,
  FileCheck,
  FileX,
  Info,
  Clock,
} from 'lucide-react';

import {
  fetchBlockchainStatus,
  registerReportOnChain,
  verifyReportOnChain,
  demoTamperOnChain,
  fetchBlockchainRegistrations,
} from '../services/blockchainService';
import type {
  BlockchainStatus,
  BlockchainVerification,
  BlockchainRegistrationSummary,
} from '../types/blockchain';

interface BlockchainTrustCenterProps {
  initialReportId?: string | null;
  onNavigateToScan?: (url: string) => void;
}

export const BlockchainTrustCenter: React.FC<BlockchainTrustCenterProps> = ({
  initialReportId,
}) => {
  const [status, setStatus] = useState<BlockchainStatus | null>(null);
  const [registrations, setRegistrations] = useState<BlockchainRegistrationSummary[]>([]);
  const [statusLoading, setStatusLoading] = useState<boolean>(true);

  // Active Verification Workbench State
  const [targetReportId, setTargetReportId] = useState<string>(initialReportId || '');
  const [verifying, setVerifying] = useState<boolean>(false);
  const [registering, setRegistering] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<BlockchainVerification | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const loadStatusAndHistory = useCallback(async () => {
    setStatusLoading(true);
    try {
      const [statusData, historyData] = await Promise.all([
        fetchBlockchainStatus(),
        fetchBlockchainRegistrations(20),
      ]);
      setStatus(statusData);
      setRegistrations(historyData);
    } catch {
      // Handled via null state
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatusAndHistory();
  }, [loadStatusAndHistory]);

  useEffect(() => {
    if (initialReportId) {
      setTargetReportId(initialReportId);
    }
  }, [initialReportId]);

  // Execute On-Chain Verification
  const handleVerify = async (reportIdToVerify?: string) => {
    const id = (reportIdToVerify || targetReportId).trim();
    if (!id) {
      setActionError('Please provide a report ID to verify.');
      return;
    }
    setActionError(null);
    setVerifying(true);
    setTargetReportId(id);
    try {
      const res = await verifyReportOnChain(id);
      setVerificationResult(res);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Verification query failed');
    } finally {
      setVerifying(false);
    }
  };

  // Execute On-Chain Registration
  const handleRegister = async () => {
    const id = targetReportId.trim();
    if (!id) {
      setActionError('Please provide a report ID to register.');
      return;
    }
    setActionError(null);
    setRegistering(true);
    try {
      await registerReportOnChain(id);
      // Auto-trigger verification to show confirmed proof
      await handleVerify(id);
      // Refresh registry history
      loadStatusAndHistory();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  // Execute Controlled Demonstration Scenario B: Tamper Detection
  const handleTamperDemo = async () => {
    const id = targetReportId.trim();
    if (!id) {
      setActionError('Select or register a report first before testing tamper detection.');
      return;
    }
    setActionError(null);
    setVerifying(true);
    try {
      const res = await demoTamperOnChain(id);
      setVerificationResult(res);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Tamper demonstration failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <section id="blockchain-trust" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="artwork-heading">
        <OrbitalScene variant="vault" className="module-sculpture" />
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/40 text-xs font-mono uppercase tracking-wider mb-2">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span>IMMUTABLE WEB3 LEDGER</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Blockchain Threat Report Integrity
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Cryptographic report fingerprinting, decentralized EVM attestation, and tamper-evident
            integrity verification powered by Solidity smart contracts.
          </p>
        </div>

        <button
          onClick={loadStatusAndHistory}
          disabled={statusLoading}
          className="self-start md:self-auto p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer flex items-center gap-2 text-xs font-mono"
          title="Refresh Blockchain Network State"
        >
          <RefreshCw className={`w-4 h-4 ${statusLoading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh EVM State</span>
        </button>
      </div>

      {/* Network Status & Contract Telemetry Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Card 1: Connection & Network */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Network State</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                status?.connected
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-rose-950 text-rose-300 border-rose-800'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${status?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              {status?.connected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
          <div className="text-sm font-bold text-white font-mono truncate" title={status?.network_name}>
            {status?.network_name || 'Connecting...'}
          </div>
          <span className="text-[11px] text-slate-500 font-mono block mt-1">Chain ID: {status?.chain_id ?? '31337'}</span>
        </div>

        {/* Card 2: Block Height */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">EVM Block Height</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-300 font-mono">
            #{status?.latest_block ?? 0}
          </div>
          <span className="text-[11px] text-slate-500 font-mono block mt-1">Confirmed Block Number</span>
        </div>

        {/* Card 3: Smart Contract Address */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Registry Contract</span>
            {status?.contract_address && (
              <button
                onClick={() => copyToClipboard(status.contract_address, 'contract')}
                className="text-slate-500 hover:text-cyan-300 transition-colors cursor-pointer"
                title="Copy Contract Address"
              >
                {copiedKey === 'contract' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
          <div className="text-xs font-mono font-bold text-slate-200 truncate" title={status?.contract_address}>
            {status?.contract_address || 'Loading contract...'}
          </div>
          <span className="text-[11px] text-cyan-500 font-mono block mt-1">CyberTrustReportRegistry.sol</span>
        </div>

        {/* Card 4: Total Attestations */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">On-Chain Attestations</span>
            <FileCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-300 font-mono">
            {status?.total_registered_reports ?? registrations.length}
          </div>
          <span className="text-[11px] text-slate-500 font-mono block mt-1">Registered Threat Reports</span>
        </div>
      </div>

      {/* Verification & Registration Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        {/* Left Column: Interactive Workbench Controls (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                  Report Integrity Verification Workbench
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                SHA-256 + EVM
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed font-mono">
              Enter any investigation report ID (from URL Scans or Scam DNA Intelligence) to verify
              its cryptographic hash against the local EVM registry.
            </p>

            {/* Target ID Input */}
            <div className="space-y-2 mb-4">
              <label htmlFor="blockchain-report-id" className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                Target Investigation Report UUID
              </label>
              <div className="relative">
                <input id="blockchain-report-id"
                  type="text"
                  value={targetReportId}
                  onChange={(e) => setTargetReportId(e.target.value)}
                  placeholder="e.g. 066d9d3d-6d7e-4b09-bef0-8a46d90ae1a2"
                  className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:border-cyan-500 pr-10"
                />
                {targetReportId && (
                  <button
                    onClick={() => setTargetReportId('')}
                    className="absolute right-3 top-3 text-slate-500 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Quick Picker from Recent Registrations */}
            {registrations.length > 0 && (
              <div className="mb-6 space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                  Quick Select from Registered Reports:
                </span>
                <div className="flex flex-wrap gap-2">
                  {registrations.slice(0, 4).map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setTargetReportId(r.report_id);
                        handleVerify(r.report_id);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-[10px] font-mono text-cyan-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span>{r.report_type.replace('_', ' ')}</span>
                      <span className="text-slate-500 truncate max-w-[80px]">#{r.report_id.slice(0, 8)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Error Message if any */}
            {actionError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs font-mono text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{actionError}</span>
              </div>
            )}
          </div>

          {/* Action Buttons Toolbar */}
          <div className="space-y-3 pt-4 border-t border-slate-800/80">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Primary Verify Button */}
              <button
                onClick={() => handleVerify()}
                disabled={verifying || registering}
                className="py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-cyan-500/20 disabled:opacity-50"
              >
                {verifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Querying Smart Contract...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify Report Integrity</span>
                  </>
                )}
              </button>

              {/* Register Button */}
              <button
                onClick={handleRegister}
                disabled={registering || verifying}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 hover:border-cyan-500/40 transition-colors cursor-pointer disabled:opacity-50"
              >
                {registering ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting EVM Transaction...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Register On-Chain</span>
                  </>
                )}
              </button>
            </div>

            {/* Hackathon Demonstration Walkthrough: Tamper Detection (Scenario B) */}
            <div className="pt-2">
              <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 block">
                    Hackathon Demo Scenario B: Tamper Detection
                  </span>
                  <p className="text-[11px] text-amber-400/90 font-mono">
                    Simulate an unauthorized change to risk score in-memory and observe cryptographic mismatch.
                  </p>
                </div>
                <button
                  onClick={handleTamperDemo}
                  disabled={verifying || registering}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-mono font-semibold shrink-0 cursor-pointer transition-colors"
                >
                  Simulate Tamper
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Verification Results & Evidence Drawer (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                  On-Chain Forensic Evidence
                </h4>
              </div>
              {verificationResult && (
                <span className="text-[10px] font-mono text-slate-500">
                  {new Date(verificationResult.verified_at).toLocaleTimeString()}
                </span>
              )}
            </div>

            {/* Verification State Banner */}
            {!verificationResult ? (
              <div className="py-12 px-4 text-center space-y-3">
                <ShieldCheck className="w-12 h-12 text-slate-700 mx-auto" />
                <div className="space-y-1">
                  <span className="text-xs font-mono font-bold text-slate-400 block">
                    Ready to Verify Threat Report
                  </span>
                  <p className="text-[11px] text-slate-500 font-mono max-w-xs mx-auto">
                    Select a report from the list or enter a UUID to compare its hash against the blockchain registry.
                  </p>
                </div>
              </div>
            ) : verificationResult.verification_status === 'VERIFIED' ? (
              /* VERIFIED — REPORT UNCHANGED */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-600/50 flex items-start gap-3">
                  <FileCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-emerald-300 font-mono block">
                      {verificationResult.status_label}
                    </span>
                    <p className="text-[11px] text-emerald-400/90 font-mono mt-0.5 leading-relaxed">
                      {verificationResult.explanation}
                    </p>
                  </div>
                </div>

                {/* Hashes Match Inspection */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                    Cryptographic Digest Comparison
                  </span>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-[11px] font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Computed Hash:</span>
                      <span className="text-emerald-300 font-bold truncate max-w-[180px]" title={verificationResult.computed_content_hash}>
                        {verificationResult.computed_content_hash}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1.5 border-t border-slate-800">
                      <span className="text-slate-500">On-Chain Hash:</span>
                      <span className="text-emerald-300 font-bold truncate max-w-[180px]" title={verificationResult.recorded_content_hash || ''}>
                        {verificationResult.recorded_content_hash}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Transaction Proof Metadata */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Block Height:</span>
                    <span className="text-cyan-300 font-bold">#{verificationResult.block_number}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Chain ID:</span>
                    <span className="text-slate-300">{verificationResult.chain_id}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                    <span className="text-slate-500">Tx Hash:</span>
                    <span className="text-cyan-400 font-mono truncate max-w-[180px]" title={verificationResult.transaction_hash || ''}>
                      {verificationResult.transaction_hash}
                    </span>
                  </div>
                </div>
              </div>
            ) : verificationResult.verification_status === 'MISMATCH' ? (
              /* MISMATCH — REPORT MODIFIED (SECURITY ALERT) */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-600/50 flex items-start gap-3">
                  <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <span className="text-xs font-bold text-rose-300 font-mono block">
                      {verificationResult.status_label}
                    </span>
                    <p className="text-[11px] text-rose-400/90 font-mono mt-0.5 leading-relaxed">
                      {verificationResult.explanation}
                    </p>
                  </div>
                </div>

                {/* Tamper Comparison */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 block">
                    Cryptographic Discrepancy
                  </span>
                  <div className="p-3 rounded-xl bg-slate-950 border border-rose-900/40 space-y-2 text-[11px] font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Altered Hash:</span>
                      <span className="text-rose-400 font-bold truncate max-w-[180px]" title={verificationResult.computed_content_hash}>
                        {verificationResult.computed_content_hash}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1.5 border-t border-slate-800">
                      <span className="text-slate-500">Original On-Chain:</span>
                      <span className="text-emerald-400 font-bold truncate max-w-[180px]" title={verificationResult.recorded_content_hash || ''}>
                        {verificationResult.recorded_content_hash}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* NOT REGISTERED / UNAVAILABLE */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-600/50 flex items-start gap-3">
                  <FileX className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-amber-300 font-mono block">
                      {verificationResult.status_label}
                    </span>
                    <p className="text-[11px] text-amber-400/90 font-mono mt-0.5 leading-relaxed">
                      {verificationResult.explanation}
                    </p>
                  </div>
                </div>

                {verificationResult.verification_status === 'NOT_REGISTERED' && (
                  <button
                    onClick={handleRegister}
                    disabled={registering}
                    className="w-full py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Register This Report Now</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Attestation Boundary Disclaimer */}
          <div className="pt-4 border-t border-slate-800/80 mt-4">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 flex items-start gap-2 text-[10px] text-slate-400 leading-normal font-mono">
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <p>
                <strong>Attestation Scope:</strong> Blockchain verification confirms that the current report
                matches the fingerprint recorded on-chain. It does not independently prove that the original threat
                classification is correct.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* On-Chain Registration Audit Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
              Recent On-Chain Attestations ({registrations.length})
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-500">Saved Local Registrations</span>
        </div>

        {registrations.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-slate-500">
            No threat reports have been registered on the blockchain yet. Complete an investigation to register its first fingerprint.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Report ID / Type</th>
                  <th className="py-3 px-3">Fingerprint (SHA-256)</th>
                  <th className="py-3 px-3">Block #</th>
                  <th className="py-3 px-3">Tx Hash</th>
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {registrations.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold border ${
                            r.report_type === 'url_scan'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border-rose-800'
                          }`}
                        >
                          {r.report_type === 'url_scan' ? 'URL' : 'SCAM'}
                        </span>
                        <span className="font-bold text-white truncate max-w-[120px]" title={r.report_id}>
                          {r.report_id.slice(0, 10)}...
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-slate-400 truncate max-w-[140px] block" title={r.content_hash}>
                        {r.content_hash.slice(0, 12)}...{r.content_hash.slice(-8)}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-cyan-300 font-bold">#{r.block_number}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-slate-400 truncate max-w-[130px] block" title={r.transaction_hash}>
                        {r.transaction_hash.slice(0, 10)}...
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {new Date(r.registered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          setTargetReportId(r.report_id);
                          handleVerify(r.report_id);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        Verify
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
