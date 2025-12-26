/**
 * @fileoverview Inactivity monitor for session servers.
 *
 * Monitors server activity and triggers shutdown after a period of inactivity.
 * This enables automatic cleanup of session containers when they're no longer
 * being used.
 *
 * Inactivity is defined as:
 * - No participant has ever connected AND startup timeout reached
 * - No participants currently connected AND last activity timeout reached
 * - Participants connected but no messages received for timeout period
 */

/** Default inactivity timeout in milliseconds (5 minutes) */
export const DEFAULT_INACTIVITY_TIMEOUT_MS = 300000;

/** Default check interval in milliseconds (30 seconds) */
export const DEFAULT_INACTIVITY_CHECK_INTERVAL_MS = 30000;

/**
 * Logger interface for InactivityMonitor.
 * Apps can provide their own logger implementation.
 */
export interface InactivityLogger {
  info(message: string, data?: object): void;
  debug?(message: string, data?: object): void;
}

/**
 * Default console logger.
 */
const defaultLogger: InactivityLogger = {
  info: (message: string, data?: object) =>
    console.log(`[InactivityMonitor] ${message}`, data ?? ''),
  debug: (message: string, data?: object) =>
    console.log(`[InactivityMonitor] ${message}`, data ?? ''),
};

/**
 * Configuration for InactivityMonitor.
 */
export interface InactivityMonitorConfig {
  /** Timeout in milliseconds before shutdown (default: 300000 = 5 min) */
  timeoutMs: number;
  /** Interval in milliseconds between checks (default: 30000 = 30 sec) */
  checkIntervalMs: number;
  /** Callback to invoke when shutdown is triggered */
  onShutdown: (reason: string) => void;
  /** Optional logger */
  logger?: InactivityLogger;
}

/**
 * Get inactivity timeout from environment or default.
 */
function getTimeoutMs(configValue?: number): number {
  // biome-ignore lint/complexity/useLiteralKeys: Required for noPropertyAccessFromIndexSignature
  const envValue = process.env['INACTIVITY_TIMEOUT_MS'];
  if (envValue) {
    const parsed = Number.parseInt(envValue, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return configValue ?? DEFAULT_INACTIVITY_TIMEOUT_MS;
}

/**
 * Get check interval from environment or default.
 */
function getCheckIntervalMs(configValue?: number): number {
  // biome-ignore lint/complexity/useLiteralKeys: Required for noPropertyAccessFromIndexSignature
  const envValue = process.env['INACTIVITY_CHECK_INTERVAL_MS'];
  if (envValue) {
    const parsed = Number.parseInt(envValue, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return configValue ?? DEFAULT_INACTIVITY_CHECK_INTERVAL_MS;
}

/**
 * Monitors server activity and triggers shutdown after a period of inactivity.
 *
 * @example
 * ```typescript
 * const monitor = new InactivityMonitor({
 *   onShutdown: (reason) => {
 *     console.log('Shutting down:', reason);
 *     process.exit(0);
 *   },
 * });
 *
 * // Track connections
 * monitor.recordConnection(true);  // on connect
 * monitor.recordConnection(false); // on disconnect
 *
 * // Track activity
 * monitor.recordActivity(); // on message received
 *
 * // Stop when done
 * monitor.stop();
 * ```
 */
export class InactivityMonitor {
  private readonly config: Required<Omit<InactivityMonitorConfig, 'logger'>> & {
    logger: InactivityLogger;
  };
  private readonly startTime: number;
  private lastActivityTime: number;
  private connectionCount: number;
  private hasEverConnected: boolean;
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<InactivityMonitorConfig> & { onShutdown: (reason: string) => void }) {
    this.config = {
      timeoutMs: getTimeoutMs(config.timeoutMs),
      checkIntervalMs: getCheckIntervalMs(config.checkIntervalMs),
      onShutdown: config.onShutdown,
      logger: config.logger ?? defaultLogger,
    };

    this.startTime = Date.now();
    this.lastActivityTime = Date.now();
    this.connectionCount = 0;
    this.hasEverConnected = false;

    this.startChecking();

    this.config.logger.info('Inactivity monitor started', {
      timeoutMs: this.config.timeoutMs,
      checkIntervalMs: this.config.checkIntervalMs,
    });
  }

  /**
   * Record that activity has occurred (e.g., a message was received).
   */
  recordActivity(): void {
    this.lastActivityTime = Date.now();
  }

  /**
   * Record a connection state change.
   * @param connected - true if a new connection, false if a disconnection
   */
  recordConnection(connected: boolean): void {
    if (connected) {
      this.connectionCount++;
      this.hasEverConnected = true;
      this.lastActivityTime = Date.now();
      this.config.logger.debug?.('Connection recorded', {
        connectionCount: this.connectionCount,
      });
    } else {
      this.connectionCount = Math.max(0, this.connectionCount - 1);
      this.lastActivityTime = Date.now();
      this.config.logger.debug?.('Disconnection recorded', {
        connectionCount: this.connectionCount,
      });
    }
  }

  /**
   * Get current connection count.
   */
  getConnectionCount(): number {
    return this.connectionCount;
  }

  /**
   * Check if any participant has ever connected.
   */
  hasHadConnection(): boolean {
    return this.hasEverConnected;
  }

  /**
   * Stop the inactivity monitor.
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      this.config.logger.info('Inactivity monitor stopped');
    }
  }

  private startChecking(): void {
    this.checkInterval = setInterval(() => this.check(), this.config.checkIntervalMs);
  }

  private check(): void {
    const now = Date.now();
    const timeSinceStart = now - this.startTime;
    const timeSinceActivity = now - this.lastActivityTime;

    // Case 1: No one has ever connected and startup timeout reached
    if (!this.hasEverConnected && timeSinceStart >= this.config.timeoutMs) {
      const reason = `No participants connected within ${this.config.timeoutMs / 1000} seconds of startup`;
      this.config.logger.info('Inactivity timeout triggered', { reason, timeSinceStart });
      this.stop();
      this.config.onShutdown(reason);
      return;
    }

    // Case 2: Had connections but now empty and timeout reached
    if (
      this.hasEverConnected &&
      this.connectionCount === 0 &&
      timeSinceActivity >= this.config.timeoutMs
    ) {
      const reason = `No participants connected for ${this.config.timeoutMs / 1000} seconds`;
      this.config.logger.info('Inactivity timeout triggered', { reason, timeSinceActivity });
      this.stop();
      this.config.onShutdown(reason);
      return;
    }

    // Case 3: Participants connected but no activity for timeout period
    if (this.connectionCount > 0 && timeSinceActivity >= this.config.timeoutMs) {
      const reason = `No activity for ${this.config.timeoutMs / 1000} seconds`;
      this.config.logger.info('Inactivity timeout triggered', { reason, timeSinceActivity });
      this.stop();
      this.config.onShutdown(reason);
      return;
    }

    // Log status periodically for debugging
    this.config.logger.debug?.('Inactivity check', {
      connectionCount: this.connectionCount,
      hasEverConnected: this.hasEverConnected,
      timeSinceActivity: Math.round(timeSinceActivity / 1000),
      timeSinceStart: Math.round(timeSinceStart / 1000),
      timeoutSeconds: this.config.timeoutMs / 1000,
    });
  }
}
