/**
 * @fileoverview Framework client runtime.
 *
 * This package provides the core client runtime for two-participant,
 * WebSocket-networked, hand-gesture-driven applications. It handles:
 * - WebSocket connection lifecycle
 * - Lifecycle overlays and standardized UX flows
 * - Hand input provider abstraction (hiding MediaPipe details)
 * - Message dispatch to app handlers
 */

import type {
  ParticipantId,
  ParticipantNumber,
  SessionPhase,
} from '@gesture-app/framework-protocol';

// Re-export protocol types for convenience
export type { ParticipantId, ParticipantNumber, SessionPhase };

/**
 * Connection state.
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected';

/**
 * Client configuration.
 */
export interface ClientConfig {
  /** WebSocket URL */
  readonly wsUrl: string;
  /** Lobby URL for "return to lobby" functionality */
  readonly lobbyUrl: string | null;
}

/**
 * Framework client version.
 */
export const FRAMEWORK_CLIENT_VERSION = '1.0.0';
