export interface DatabaseHealth {
  status: 'connected' | 'disconnected';
  message: string;
}

export interface BackendHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  app_name: string;
  team: string;
  version: string;
  environment: string;
  timestamp: string;
  database: DatabaseHealth;
  services: Record<string, string>;
}

export type ConnectionStatus = 'checking' | 'connected' | 'degraded' | 'disconnected';

export interface HealthState {
  status: ConnectionStatus;
  data: BackendHealthResponse | null;
  error: string | null;
  latencyMs: number | null;
  lastChecked: Date | null;
}

