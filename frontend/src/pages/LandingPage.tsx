import React, { useState, useEffect, useRef } from 'react';
import { Header } from '../components/Header';
import { ThreatSearchHero } from '../components/ThreatSearchHero';
import { InvestigationReport } from '../components/InvestigationReport';
import { RecentScansList } from '../components/RecentScansList';
import { BackendStatusCard } from '../components/BackendStatusCard';
import { FoundationSpecCard } from '../components/FoundationSpecCard';
import { Footer } from '../components/Footer';
import { useBackendHealth } from '../hooks/useBackendHealth';
import { submitScan, fetchRecentScans, fetchScanById } from '../services/scanService';
import type { ScanResponse, ScanSummaryItem } from '../types/scan';

export const LandingPage: React.FC = () => {
  const healthState = useBackendHealth(10000);
  const [activeReport, setActiveReport] = useState<ScanResponse | null>(null);
  const [recentScans, setRecentScans] = useState<ScanSummaryItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const reportRef = useRef<HTMLDivElement>(null);

  const loadRecentScans = async () => {
    const items = await fetchRecentScans(8);
    setRecentScans(items);
  };

  useEffect(() => {
    loadRecentScans();
  }, []);

  const handleInvestigate = async (url: string) => {
    setIsScanning(true);
    setScanError(null);
    try {
      const report = await submitScan(url);
      setActiveReport(report);
      await loadRecentScans();
      // Smooth scroll to report
      setTimeout(() => {
        reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: any) {
      setScanError(err.message || 'Failed to complete threat investigation.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectRecentScan = async (scanId: string) => {
    setIsScanning(true);
    setScanError(null);
    try {
      const report = await fetchScanById(scanId);
      setActiveReport(report);
      setTimeout(() => {
        reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: any) {
      setScanError(err.message || 'Failed to retrieve scan report.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col selection:bg-cyan-500/20 selection:text-cyan-200">
      <Header
        status={healthState.status}
        latencyMs={healthState.latencyMs}
        onRefresh={healthState.refetch}
      />

      <main className="flex-1 pb-16">
        <ThreatSearchHero
          onInvestigate={handleInvestigate}
          isScanning={isScanning}
          error={scanError}
        />

        {/* Active Investigation Report */}
        <div ref={reportRef}>
          {activeReport && <InvestigationReport report={activeReport} />}
        </div>

        {/* Recent Investigations List */}
        <RecentScansList
          scans={recentScans}
          onSelectScan={handleSelectRecentScan}
          isLoading={isScanning}
        />

        {/* Backend & Database Telemetry Card */}
        <BackendStatusCard
          healthState={healthState}
          onRefresh={healthState.refetch}
        />

        {/* Foundation & Architecture Specs */}
        <FoundationSpecCard />
      </main>

      <Footer />
    </div>
  );
};
