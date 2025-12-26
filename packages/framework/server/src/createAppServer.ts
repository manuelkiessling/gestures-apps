/**
 * @fileoverview Factory function to create a gesture app WebSocket server.
 *
 * Reduces boilerplate for creating app servers by encapsulating:
 * - WebSocketServer setup
 * - Connection handling
 * - Message routing
 * - Graceful shutdown
 * - Inactivity monitoring (auto-cleanup)
 */

import {
  DEFAULT_INACTIVITY_CHECK_INTERVAL_MS,
  DEFAULT_INACTIVITY_TIMEOUT_MS,
  InactivityMonitor,
} from './InactivityMonitor.js';
import type { AppHooks, Connection, SessionRuntimeConfig } from './SessionRuntime.js';
import { SessionRuntime } from './SessionRuntime.js';

/**
 * Inactivity monitoring configuration.
 */
export interface InactivityConfig {
  /** Enable inactivity monitoring (default: true) */
  readonly enabled?: boolean;
  /** Timeout in milliseconds before shutdown (default: 300000 = 5 min) */
  readonly timeoutMs?: number;
  /** Interval in milliseconds between checks (default: 30000 = 30 sec) */
  readonly checkIntervalMs?: number;
  /**
   * Message types to ignore when tracking activity.
   * Useful for apps with continuous streaming (e.g., hand tracking).
   * Messages with these types won't reset the inactivity timer.
   * @example ['hand_update'] - ignore hand tracking updates
   */
  readonly ignoreMessageTypes?: readonly string[];
}

/**
 * Configuration for creating an app server.
 */
export interface AppServerConfig<
  TAppClientMessage extends { type: string },
  TAppServerMessage extends { type: string },
  TWelcomeData,
  TResetData = undefined,
  TOpponentJoinedData = undefined,
  TSessionEndedData = undefined,
> {
  /** Port to listen on (default: 3001, or PORT env var) */
  readonly port?: number;

  /** Runtime configuration (tick settings, etc.) */
  readonly runtimeConfig: SessionRuntimeConfig;

  /** Application hooks implementation */
  readonly hooks: AppHooks<
    TAppClientMessage,
    TAppServerMessage,
    TWelcomeData,
    TResetData,
    TOpponentJoinedData,
    TSessionEndedData
  >;

  /** Serialize server messages to string (default: JSON.stringify) */
  readonly serializer?: (message: TAppServerMessage | object) => string;

  /** Parse client messages from string (default: JSON.parse with type check) */
  readonly parser: (data: string) => TAppClientMessage | null;

  /** Optional logger */
  readonly logger?: {
    info: (message: string, data?: object) => void;
    error: (message: string, data?: object) => void;
    debug?: (message: string, data?: object) => void;
  };

  /**
   * Inactivity monitoring configuration.
   * Enabled by default to auto-cleanup idle session containers.
   * Pass { enabled: false } to disable.
   */
  readonly inactivity?: InactivityConfig;
}

/**
 * Running app server instance.
 */
export interface AppServer<
  TAppClientMessage extends { type: string } = { type: string },
  TAppServerMessage extends { type: string } = { type: string },
  TWelcomeData = unknown,
  TResetData = unknown,
  TOpponentJoinedData = unknown,
  TSessionEndedData = unknown,
> {
  /** The underlying SessionRuntime */
  readonly runtime: SessionRuntime<
    TAppClientMessage,
    TAppServerMessage,
    TWelcomeData,
    TResetData,
    TOpponentJoinedData,
    TSessionEndedData
  >;

  /** Stop the server gracefully */
  stop(): Promise<void>;

  /** Port the server is listening on */
  readonly port: number;

  /** Inactivity monitor (if enabled) */
  readonly inactivityMonitor?: InactivityMonitor;
}

/**
 * WebSocket interface for type compatibility.
 * Apps can pass ws.WebSocket instances directly.
 */
interface WebSocketLike extends Connection {
  on(event: 'message', callback: (data: Buffer | string) => void): void;
  on(event: 'close', callback: () => void): void;
  on(event: 'error', callback: (error: unknown) => void): void;
}

interface WebSocketServerLike {
  on(event: 'connection', callback: (ws: WebSocketLike) => void): void;
  close(callback?: () => void): void;
  emit?(event: string): void;
}

interface WebSocketServerConstructor {
  new (options: { port: number }): WebSocketServerLike;
}

/**
 * Create and start an app server with minimal boilerplate.
 *
 * Features automatic inactivity monitoring that shuts down the server
 * (and thus the container) after a period of inactivity. This is enabled
 * by default with a 5-minute timeout.
 *
 * @example
 * ```typescript
 * import { createAppServer } from '@gesture-app/framework-server';
 * import { WebSocketServer } from 'ws';
 *
 * const server = createAppServer({
 *   port: 3001,
 *   runtimeConfig: { maxParticipants: 2, tickEnabled: false, tickIntervalMs: 16 },
 *   hooks: new MyAppHooks(),
 *   parser: (data) => parseClientMessage(JSON.parse(data)),
 *   // Inactivity monitoring enabled by default (5 min timeout)
 *   // To customize: inactivity: { timeoutMs: 600000 }
 *   // To disable: inactivity: { enabled: false }
 * }, WebSocketServer);
 *
 * // Later: graceful shutdown
 * await server.stop();
 * ```
 */
export function createAppServer<
  TAppClientMessage extends { type: string },
  TAppServerMessage extends { type: string },
  TWelcomeData,
  TResetData = undefined,
  TOpponentJoinedData = undefined,
  TSessionEndedData = undefined,
>(
  config: AppServerConfig<
    TAppClientMessage,
    TAppServerMessage,
    TWelcomeData,
    TResetData,
    TOpponentJoinedData,
    TSessionEndedData
  >,
  WebSocketServerClass: WebSocketServerConstructor
): AppServer<
  TAppClientMessage,
  TAppServerMessage,
  TWelcomeData,
  TResetData,
  TOpponentJoinedData,
  TSessionEndedData
> {
  // biome-ignore lint/complexity/useLiteralKeys: Required for noPropertyAccessFromIndexSignature
  const port = config.port ?? (Number(process.env['PORT']) || 3001);
  const logger = config.logger ?? {
    info: (msg: string, data?: object) => console.log(`[AppServer] ${msg}`, data ?? ''),
    error: (msg: string, data?: object) => console.error(`[AppServer] ${msg}`, data ?? ''),
  };
  const serializer = config.serializer ?? ((msg: object) => JSON.stringify(msg));

  // Inactivity config - enabled by default
  const inactivityEnabled = config.inactivity?.enabled !== false;
  const inactivityTimeoutMs = config.inactivity?.timeoutMs ?? DEFAULT_INACTIVITY_TIMEOUT_MS;
  const inactivityCheckIntervalMs =
    config.inactivity?.checkIntervalMs ?? DEFAULT_INACTIVITY_CHECK_INTERVAL_MS;
  const ignoreMessageTypes = new Set(config.inactivity?.ignoreMessageTypes ?? []);

  logger.info(`Starting server on port ${port}...`);

  // Create runtime
  const runtime = new SessionRuntime<
    TAppClientMessage,
    TAppServerMessage,
    TWelcomeData,
    TResetData,
    TOpponentJoinedData,
    TSessionEndedData
  >(config.runtimeConfig, config.hooks, serializer as (message: unknown) => string, config.parser);

  // Create WebSocket server
  const wss = new WebSocketServerClass({ port });

  logger.info(`WebSocket server listening on port ${port}`);

  // Setup graceful shutdown handlers
  let isShuttingDown = false;
  const shutdown = async (): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info('Shutting down...');
    inactivityMonitor?.stop();
    runtime.stop();

    return new Promise((resolve) => {
      wss.close(() => {
        logger.info('Server stopped');
        resolve();
      });
    });
  };

  // Create inactivity monitor if enabled
  let inactivityMonitor: InactivityMonitor | undefined;
  if (inactivityEnabled) {
    inactivityMonitor = new InactivityMonitor({
      timeoutMs: inactivityTimeoutMs,
      checkIntervalMs: inactivityCheckIntervalMs,
      onShutdown: (reason: string) => {
        logger.info('Inactivity shutdown triggered', { reason });
        shutdown().then(() => process.exit(0));
      },
      logger: {
        info: logger.info,
        debug: logger.debug,
      },
    });

    logger.info('Inactivity monitoring enabled', {
      timeoutMs: inactivityTimeoutMs,
      checkIntervalMs: inactivityCheckIntervalMs,
    });
  }

  // Handle connections
  wss.on('connection', (ws: WebSocketLike) => {
    // Record connection for inactivity tracking
    inactivityMonitor?.recordConnection(true);

    const participant = runtime.handleConnection(ws as unknown as Connection);
    if (!participant) {
      // Connection was rejected, record disconnection
      inactivityMonitor?.recordConnection(false);
      return;
    }

    // Emit event for testing
    wss.emit?.('connection_handled');

    ws.on('message', (data: Buffer | string) => {
      const message = typeof data === 'string' ? data : data.toString();

      // Record activity for inactivity tracking (unless message type is ignored)
      if (inactivityMonitor && ignoreMessageTypes.size > 0) {
        try {
          const parsed = JSON.parse(message) as { type?: string };
          if (!parsed.type || !ignoreMessageTypes.has(parsed.type)) {
            inactivityMonitor.recordActivity();
          }
        } catch {
          // If we can't parse, count it as activity
          inactivityMonitor.recordActivity();
        }
      } else {
        inactivityMonitor?.recordActivity();
      }

      runtime.handleMessage(ws as unknown as Connection, message);
    });

    ws.on('close', () => {
      // Record disconnection for inactivity tracking
      inactivityMonitor?.recordConnection(false);
      runtime.handleDisconnection(ws as unknown as Connection);
    });

    ws.on('error', (error: unknown) => {
      logger.error('WebSocket error', { error });
    });
  });

  // Register signal handlers
  const handleSignal = (signal: string) => {
    logger.info(`${signal} received`);
    shutdown().then(() => process.exit(0));
  };

  process.on('SIGTERM', () => handleSignal('SIGTERM'));
  process.on('SIGINT', () => handleSignal('SIGINT'));

  return {
    runtime,
    port,
    stop: shutdown,
    inactivityMonitor,
  };
}
