import React, { useState, useEffect, useRef } from 'react';
import { Header } from '../components/Header';
import { ThreatSearchHero } from '../components/ThreatSearchHero';
import { InvestigationReport } from '../components/InvestigationReport';
import { RecentScansList } from '../components/RecentScansList';
import { ScamDnaAnalyzer } from '../components/ScamDnaAnalyzer';
import { WhatShouldIDoNow } from '../components/WhatShouldIDoNow';
import { PlatformDashboardOverview } from '../components/PlatformDashboardOverview';
import { ThreatRelationshipGraph } from '../components/ThreatRelationshipGraph';
import { BlockchainTrustCenter } from '../components/BlockchainTrustCenter';
import { IntelligenceOverview } from '../components/IntelligenceOverview';
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
  const [requestedUrl, setRequestedUrl] = useState<string | null>(null);
  const [graphSearchQuery, setGraphSearchQuery] = useState<string | null>(null);
  const [blockchainReportId, setBlockchainReportId] = useState<string | null>(null);

  // The hash target does not exist when the browser first loads the React shell.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(window.location.hash.slice(1));
      target?.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const reportRef = useRef<HTMLDivElement>(null);

  const loadRecentScans = async () => {
    const items = await fetchRecentScans(8);
    setRecentScans(items);
  };

  useEffect(() => {
    loadRecentScans();
  }, []);

  const handleInvestigate = async (url: string) => {
    if (isScanning) return;
    setIsScanning(true);
    setScanError(null);
    setRequestedUrl(url);
    try {
      const report = await submitScan(url);
      setActiveReport(report);
      await loadRecentScans();
      // Smooth scroll to report
      setTimeout(() => {
        reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: unknown) {
      setScanError(err instanceof Error ? err.message : 'Failed to complete threat investigation.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectRecentScan = async (scanId: string) => {
    if (isScanning) return;
    setIsScanning(true);
    setScanError(null);
    try {
      const report = await fetchScanById(scanId);
      setActiveReport(report);
      setTimeout(() => {
        reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: unknown) {
      setScanError(err instanceof Error ? err.message : 'Failed to retrieve scan report.');
    } finally {
      setIsScanning(false);
    }
  };

  // Cross-module handler: when user clicks "Investigate in URL Scanner" from Scam DNA report
  const handleCrossModuleUrlInvestigation = (urlToInvestigate: string) => {
    setRequestedUrl(urlToInvestigate);
    const scannerSection = document.getElementById('investigate');
    if (scannerSection) {
      scannerSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // Automatically trigger investigation
    handleInvestigate(urlToInvestigate);
  };

  // Cross-module handler: when user clicks "Explore in Threat Graph" from URL scan or Scam report
  const handleExploreGraph = (query: string) => {
    setGraphSearchQuery(query);
    const graphSection = document.getElementById('relationship-graph');
    if (graphSection) {
      graphSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Cross-module handler: when user clicks "Verify on Blockchain" from URL scan or Scam report
  const handleVerifyBlockchain = (reportId: string) => {
    setBlockchainReportId(reportId);
    const bcSection = document.getElementById('blockchain-trust');
    if (bcSection) {
      bcSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="site-app">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Header
        status={healthState.status}
        latencyMs={healthState.latencyMs}
        onRefresh={healthState.refetch}
      />

      <main id="main-content">
        {/* Phase 2: URL & Domain Investigation Engine */}
        <ThreatSearchHero
          onInvestigate={handleInvestigate}
          isScanning={isScanning}
          error={scanError}
          requestedUrl={requestedUrl}
        />

        {/* Active URL Investigation Report */}
        <div ref={reportRef} className="report-section" id="report" aria-live="polite">
          {activeReport && (
            <InvestigationReport
              key={activeReport.id}
              report={activeReport}
              onExploreGraph={handleExploreGraph}
              onVerifyBlockchain={handleVerifyBlockchain}
            />
          )}
        </div>

        {/* 360° Platform Intelligence Overview & Live Telemetry */}
        <PlatformDashboardOverview />

        {/* Recent Investigations List */}
        <RecentScansList
          scans={recentScans}
          onSelectScan={handleSelectRecentScan}
          isLoading={isScanning}
        />

        {/* Phase 3: AI Scam DNA Analyzer */}
        <ScamDnaAnalyzer
          onInvestigateUrl={handleCrossModuleUrlInvestigation}
          onExploreGraph={handleExploreGraph}
          onVerifyBlockchain={handleVerifyBlockchain}
        />

        {/* Phase 4: Interactive Threat Relationship Intelligence Graph */}
        <ThreatRelationshipGraph
          onInvestigateUrl={handleCrossModuleUrlInvestigation}
          initialSearch={graphSearchQuery}
        />

        {/* Phase 5: Blockchain Threat Report Integrity & Trust Center */}
        <BlockchainTrustCenter
          initialReportId={blockchainReportId}
          onNavigateToScan={handleInvestigate}
        />

        {/* Phase 3: What Should I Do Now? Incident Guidance Protocol */}
        <WhatShouldIDoNow />

        {/* Platform Capabilities & Threat Matrix */}
        <IntelligenceOverview />
      </main>

      <Footer />
    </div>
  );
};
