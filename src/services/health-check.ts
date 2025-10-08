/**
 * Health check service for monitoring application health
 */

/**
 * Health status
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Dependency health check result
 */
export interface DependencyHealth {
  name: string;
  status: HealthStatus;
  message?: string;
  responseTime?: number;
  lastCheck: Date;
}

/**
 * Overall health check result
 */
export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: Date;
  uptime: number;
  version: string;
  dependencies: DependencyHealth[];
  circuitBreakers?: Record<string, { state: string; metrics: unknown }>;
  details?: Record<string, unknown>;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  timeout?: number; // Timeout for dependency checks in ms
}

/**
 * Health Check Service
 * Monitors application and dependency health
 */
export class HealthCheckService {
  private config: Required<HealthCheckConfig>;
  private startTime: Date;
  private version: string;
  private lastHealthCheck?: HealthCheckResult;

  /**
   * Create a new health check service
   * @param config - Health check configuration
   */
  constructor(config?: HealthCheckConfig) {
    this.config = {
      timeout: config?.timeout || 5000, // Default 5 seconds
    };

    this.startTime = new Date();
    this.version = process.env.npm_package_version || '1.0.0';
  }

  /**
   * Perform comprehensive health check
   * @returns Health check result
   */
  async check(): Promise<HealthCheckResult> {
    const checkStartTime = Date.now();
    const dependencies: DependencyHealth[] = [];

    // Future: Add dependency checks here as needed

    // Determine overall status
    const overallStatus = this.determineOverallStatus(dependencies);

    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime.getTime(),
      version: this.version,
      dependencies,
      details: {
        checkDuration: Date.now() - checkStartTime,
        memory: process.memoryUsage(),
        nodeVersion: process.version,
      },
    };

    this.lastHealthCheck = result;
    return result;
  }

  /**
   * Quick health check (no dependency checks)
   * Useful for liveness probes
   */
  async quickCheck(): Promise<{ status: HealthStatus; uptime: number }> {
    return {
      status: 'healthy',
      uptime: Date.now() - this.startTime.getTime(),
    };
  }


  /**
   * Determine overall health status from dependencies
   */
  private determineOverallStatus(dependencies: DependencyHealth[]): HealthStatus {
    if (dependencies.length === 0) {
      return 'healthy';
    }

    const hasUnhealthy = dependencies.some((dep) => dep.status === 'unhealthy');
    const hasDegraded = dependencies.some((dep) => dep.status === 'degraded');

    if (hasUnhealthy) {
      return 'unhealthy';
    }

    if (hasDegraded) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Get last health check result
   */
  getLastHealthCheck(): HealthCheckResult | undefined {
    return this.lastHealthCheck;
  }
}

/**
 * Create a health check service
 */
export function createHealthCheckService(config?: HealthCheckConfig): HealthCheckService {
  return new HealthCheckService(config);
}

/**
 * Singleton health check service
 */
let defaultHealthCheckService: HealthCheckService | null = null;

/**
 * Get or create the default health check service
 */
export function getHealthCheckService(config?: HealthCheckConfig): HealthCheckService {
  if (!defaultHealthCheckService) {
    defaultHealthCheckService = new HealthCheckService(config);
  }
  return defaultHealthCheckService;
}

/**
 * Reset the default health check service
 */
export function resetHealthCheckService(): void {
  defaultHealthCheckService = null;
}
