import React from 'react';
import { Header } from '../components/Header';
import { ThreatSearchHero } from '../components/ThreatSearchHero';
import { BackendStatusCard } from '../components/BackendStatusCard';
import { FoundationSpecCard } from '../components/FoundationSpecCard';
import { Footer } from '../components/Footer';
import { useBackendHealth } from '../hooks/useBackendHealth';

export const LandingPage: React.FC = () => {
  const healthState = useBackendHealth(10000);

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col selection:bg-cyan-500/20 selection:text-cyan-200">
      <Header
        status={healthState.status}
        latencyMs={healthState.latencyMs}
        onRefresh={healthState.refetch}
      />

      <main className="flex-1">
        <ThreatSearchHero />
        <BackendStatusCard
          healthState={healthState}
          onRefresh={healthState.refetch}
        />
        <FoundationSpecCard />
      </main>

      <Footer />
    </div>
  );
};
