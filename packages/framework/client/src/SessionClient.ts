/**
 * @fileoverview Framework session client for two-participant applications.
 *
 * Handles:
 * - WebSocket connection management
 * - Session lifecycle (waiting → playing → finished)
 * - Ready-state signaling
 * - Play-again voting coordination
 * - Message routing to app handlers
 */

import type {
  ParticipantId,
  ParticipantNumber,
  SessionPhase,
} from '@gesture-app/framework-protocol';

/**
 * Connection state for the session client.
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Welcome data received from the server.
 */
export interface SessionWelcomeData<TAppData = unknown> {
  participantId: ParticipantId;
  participantNumber: ParticipantNumber;
  sessionPhase: SessionPhase;
  appData: TAppData;
}

/**
 * Session client event handlers.
 */
export interface SessionClientEvents<TServerMessage, TWelcomeData> {
  /** Called when connection state changes */
  onConnectionStateChange?: (state: ConnectionState) => void;

  /** Called when welcome message is received */
  onSessionJoin?: (data: SessionWelcomeData<TWelcomeData>) => void;

  /** Called when opponent joins */
  onOpponentJoined?: (appData?: unknown) => void;

  /** Called when opponent leaves */
  onOpponentLeft?: () => void;

  /** Called when session starts (all participants ready) */
  onSessionStart?: () => void;

  /** Called when session ends */
  onSessionEnd?: (winnerId: ParticipantId, winnerNumber: ParticipantNumber, reason: string) => void;

  /** Called when play again voting status updates */
  onPlayAgainStatus?: (votedCount: number, totalParticipants: number) => void;

  /** Called when session is reset for a new round */
  onSessionReset?: (appData?: unknown) => void;

  /** Called on server error */
  onError?: (message: string) => void;

  /** Called for app-specific messages */
  onAppMessage?: (message: TServerMessage) => void;
}

/**
 * Session client configuration.
 */
export interface SessionClientConfig {
  /** Enable automatic reconnection on disconnect */
  autoReconnect?: boolean;
  /** Reconnection delay in milliseconds */
  reconnectDelayMs?: number;
  /** Maximum reconnection attempts */
  maxReconnectAttempts?: number;
}

/**
 * Default session client configuration.
 */
export const DEFAULT_CLIENT_CONFIG: Required<SessionClientConfig> = {
  autoReconnect: false,
  reconnectDelayMs: 1000,
  maxReconnectAttempts: 5,
};

/**
 * Framework-level message types handled by SessionClient.
 */
const FRAMEWORK_MESSAGE_TYPES = new Set([
  'welcome',
  'opponent_joined',
  'opponent_left',
  'session_started',
  'game_started', // Backwards compatibility
  'session_ended',
  'game_over', // Backwards compatibility
  'play_again_status',
  'session_reset',
  'game_reset', // Backwards compatibility
  'error',
]);

/**
 * Session client for two-participant WebSocket applications.
 */
export class SessionClient<
  TClientMessage extends { type: string } = { type: string },
  TServerMessage extends { type: string } = { type: string },
  TWelcomeData = unknown,
> {
  private ws: WebSocket | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastUrl: string | null = null;

  private participantId: ParticipantId | null = null;
  private participantNumber: ParticipantNumber | null = null;
  private sessionPhase: SessionPhase = 'waiting';

  constructor(
    private readonly events: SessionClientEvents<TServerMessage, TWelcomeData> = {},
    private readonly config: SessionClientConfig = DEFAULT_CLIENT_CONFIG
  ) {}

  // ============ Connection Management ============

  /**
   * Connect to the session server.
   * @param url - WebSocket URL (e.g., ws://localhost:3001)
   */
  connect(url: string): void {
    this.lastUrl = url;
    this.setConnectionState('connecting');

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.setConnectionState('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string) as {
          type: string;
          [key: string]: unknown;
        };
        this.handleMessage(message);
      } catch {
        console.error('SessionClient: Failed to parse server message');
      }
    };

    this.ws.onclose = () => {
      this.setConnectionState('disconnected');
      this.maybeReconnect();
    };

    this.ws.onerror = () => {
      this.setConnectionState('error');
    };
  }

  /**
   * Disconnect from the server.
   */
  disconnect(): void {
    // Cancel any pending reconnect first
    this.cancelReconnect();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    // Cancel again after close, since close handler may have triggered maybeReconnect
    this.cancelReconnect();
    this.setConnectionState('disconnected');
    this.reset();
  }

  /**
   * Get current connection state.
   */
  get state(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if connected to server.
   */
  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get current participant ID (set after welcome).
   */
  getParticipantId(): ParticipantId | null {
    return this.participantId;
  }

  /**
   * Get current participant number (set after welcome).
   */
  getParticipantNumber(): ParticipantNumber | null {
    return this.participantNumber;
  }

  /**
   * Get current session phase.
   */
  getSessionPhase(): SessionPhase {
    return this.sessionPhase;
  }

  // ============ Outgoing Framework Messages ============

  /**
   * Send participant ready signal.
   * Called when participant is ready to start (e.g., hand detected).
   */
  sendReady(): void {
    this.send({ type: 'participant_ready' });
  }

  /**
   * Send play again vote.
   * Called when participant wants to play again after session ends.
   */
  sendPlayAgainVote(): void {
    this.send({ type: 'play_again_vote' });
  }

  // ============ Outgoing App Messages ============

  /**
   * Send an app-specific message to the server.
   */
  sendAppMessage(message: TClientMessage): void {
    this.send(message);
  }

  // ============ Private Methods ============

  private setConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    this.events.onConnectionStateChange?.(state);
  }

  private send(message: Record<string, unknown>): void {
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('SessionClient: Cannot send message - not connected', {
        messageType: message['type'],
        isConnected: this.isConnected,
      });
    }
  }

  private handleMessage(message: { type: string; [key: string]: unknown }): void {
    // Handle framework-level messages
    if (FRAMEWORK_MESSAGE_TYPES.has(message.type)) {
      this.handleFrameworkMessage(message);
    } else {
      // Delegate to app handler
      this.events.onAppMessage?.(message as TServerMessage);
    }
  }

  private handleFrameworkMessage(message: { type: string; [key: string]: unknown }): void {
    switch (message.type) {
      case 'welcome':
        this.handleWelcome(message);
        break;

      case 'opponent_joined':
        this.events.onOpponentJoined?.(message);
        break;

      case 'opponent_left':
        this.events.onOpponentLeft?.();
        break;

      case 'session_started':
      case 'game_started':
        this.sessionPhase = 'playing';
        this.events.onSessionStart?.();
        break;

      case 'session_ended':
      case 'game_over':
        this.sessionPhase = 'finished';
        this.events.onSessionEnd?.(
          message['winnerId'] as ParticipantId,
          message['winnerNumber'] as ParticipantNumber,
          (message['reason'] as string) ?? 'unknown'
        );
        break;

      case 'play_again_status':
        this.events.onPlayAgainStatus?.(
          (
            (message['votedParticipantIds'] as unknown[]) ??
            (message['votedPlayerIds'] as unknown[])
          )?.length ?? 0,
          (message['totalParticipants'] as number) ?? (message['totalPlayers'] as number) ?? 0
        );
        break;

      case 'session_reset':
      case 'game_reset':
        this.sessionPhase = 'waiting';
        this.events.onSessionReset?.(message);
        break;

      case 'error':
        this.events.onError?.(message['message'] as string);
        break;
    }
  }

  private handleWelcome(message: { type: string; [key: string]: unknown }): void {
    // Extract framework fields
    this.participantId = (message['participantId'] ?? message['playerId']) as ParticipantId;
    this.participantNumber = (message['participantNumber'] ??
      message['playerNumber']) as ParticipantNumber;
    this.sessionPhase = (message['sessionPhase'] ??
      message['gamePhase'] ??
      'waiting') as SessionPhase;

    // Pass through to handler with app data
    this.events.onSessionJoin?.({
      participantId: this.participantId,
      participantNumber: this.participantNumber,
      sessionPhase: this.sessionPhase,
      appData: message as TWelcomeData,
    });
  }

  private maybeReconnect(): void {
    const { autoReconnect, reconnectDelayMs, maxReconnectAttempts } = {
      ...DEFAULT_CLIENT_CONFIG,
      ...this.config,
    };

    if (!autoReconnect || !this.lastUrl) return;
    if (this.reconnectAttempts >= maxReconnectAttempts) {
      console.warn('SessionClient: Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `SessionClient: Reconnecting in ${reconnectDelayMs}ms (attempt ${this.reconnectAttempts}/${maxReconnectAttempts})`
    );

    this.reconnectTimeout = setTimeout(() => {
      if (this.lastUrl) {
        this.connect(this.lastUrl);
      }
    }, reconnectDelayMs);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.reconnectAttempts = 0;
  }

  private reset(): void {
    this.participantId = null;
    this.participantNumber = null;
    this.sessionPhase = 'waiting';
  }
}
