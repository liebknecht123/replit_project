// Shared TypeScript types for the monorepo

export interface Service {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error' | 'development';
  port?: number;
  health?: 'healthy' | 'unhealthy' | 'unknown';
  lastBuild?: string;
  version?: string;
  bundleSize?: string;
  platform?: string;
}

export interface ProjectStats {
  buildStatus: 'passing' | 'failing' | 'unknown';
  tests: {
    passed: number;
    total: number;
  };
  coverage: number;
}

export interface BuildConfig {
  service: string;
  environment: 'development' | 'production' | 'staging';
  branch?: string;
  buildNumber?: number;
}

export interface DeploymentInfo {
  id: string;
  service: string;
  status: 'pending' | 'deploying' | 'deployed' | 'failed';
  version: string;
  timestamp: string;
  environment: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  details?: Record<string, any>;
}
