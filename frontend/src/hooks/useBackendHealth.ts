import { useState, useEffect, useCallback } from 'react';
import type { HealthState, ConnectionStatus } from '../types/health';
import { fetchBackendHealth } from '../services/api';

export function useBackendHealth(pollIntervalMs: number = 10000) {
  const [state, setState] = useState<HealthState>({
    status: 'checking',
    data: null,
    error: null,
    latencyMs: null,
    lastChecked: null,
  });

  const checkStatus = useCallback(async () => {
    setState((prev) => ({ ...prev, status: prev.data ? prev.status : 'checking' }));
    try {
      const { data, latencyMs } = await fetchBackendHealth();
      const status: ConnectionStatus = data.status === 'healthy' ? 'connected' : 'degraded';
      setState({
        status,
        data,
        error: null,
        latencyMs,
        lastChecked: new Date(),
      });
    } catch (err: any) {
      setState({
        status: 'disconnected',
        data: null,
        error: err.message || 'Backend unreachable',
        latencyMs: null,
        lastChecked: new Date(),
      });
    }
  }, []);

  useEffect(() => {
    checkStatus();
    if (pollIntervalMs > 0) {
      const interval = setInterval(checkStatus, pollIntervalMs);
      return () => clearInterval(interval);
    }
  }, [checkStatus, pollIntervalMs]);

  return {
    ...state,
    refetch: checkStatus,
  };
}
