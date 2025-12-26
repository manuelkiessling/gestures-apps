/**
 * @fileoverview WebSocket client for game server communication.
 */

import type { Block, ServerMessage } from '../../src/shared/index.js';
import type { ConnectionState, GameInitData, Position } from '../types.js';

/**
 * Event handlers for game client.
 */
export interface GameClientEvents {
  /** Called when connection state changes */
  onConnectionStateChange?: (state: ConnectionState) => void;
  /** Called when welcome message is received */
  onWelcome?: (data: GameInitData) => void;
  /** Called when opponent joins */
  onOpponentJoined?: (blocks: Block[]) => void;
  /** Called when opponent leaves */
  onOpponentLeft?: () => void;
  /** Called when opponent grabs a block */
  onBlockGrabbed?: (playerId: string, blockId: string) => void;
  /** Called when a block is moved */
  onBlockMoved?: (playerId: string, blockId: string, position: Position) => void;
  /** Called when a block is released */
  onBlockReleased?: (playerId: string, blockId: string) => void;
  /** Called when a projectile is spawned */
  onProjectileSpawned?: (projectile: {
    id: string;
    position: Position;
    velocity: Position;
    ownerId: string;
    color: number;
  }) => void;
  /** Called when projectile positions are updated */
  onProjectilesUpdate?: (
    projectiles: Array<{
      id: string;
      position: Position;
      velocity: Position;
      ownerId: string;
      color: number;
    }>
  ) => void;
  /** Called when a projectile is destroyed */
  onProjectileDestroyed?: (projectileId: string) => void;
  /** Called when a block is destroyed */
  onBlockDestroyed?: (blockId: string, position: Position, color: number) => void;
  /** Called when a projectile hits a wall */
  onWallHit?: (position: Position, wallSide: 'minZ' | 'maxZ') => void;
  /** Called when game starts (all humans ready) */
  onGameStarted?: () => void;
  /** Called when game is over */
  onGameOver?: (winnerId: string, winnerNumber: 1 | 2, reason: string) => void;
  /** Called when play again voting status updates */
  onPlayAgainStatus?: (votedPlayerIds: string[], totalPlayers: number) => void;
  /** Called when game is reset for a new round */
  onGameReset?: (blocks: Block[]) => void;
  /** Called on server error */
  onError?: (message: string) => void;
}

/**
 * WebSocket client for communicating with the game server.
 */
export class GameClient {
  private ws: WebSocket | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private readonly events: GameClientEvents;

  constructor(events: GameClientEvents = {}) {
    this.events = events;
  }

  /**
   * Connect to the game server.
   * @param url - WebSocket URL (e.g., ws://localhost:3001)
   */
  connect(url: string): void {
    this.setConnectionState('connecting');

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.setConnectionState('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string) as ServerMessage;
        this.handleMessage(message);
      } catch {
        console.error('Failed to parse server message');
      }
    };

    this.ws.onclose = () => {
      this.setConnectionState('disconnected');
    };

    this.ws.onerror = () => {
      this.setConnectionState('error');
    };
  }

  /**
   * Disconnect from the server.
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setConnectionState('disconnected');
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

  // ============ Outgoing Messages ============

  /**
   * Send a block grab message.
   */
  sendBlockGrab(blockId: string): void {
    this.send({ type: 'block_grab', blockId });
  }

  /**
   * Send a block move message.
   */
  sendBlockMove(blockId: string, position: Position): void {
    this.send({ type: 'block_move', blockId, position });
  }

  /**
   * Send a block release message.
   */
  sendBlockRelease(blockId: string): void {
    this.send({ type: 'block_release', blockId });
  }

  /**
   * Send a cannon fire message.
   */
  sendCannonFire(cannonId: string): void {
    this.send({ type: 'cannon_fire', cannonId });
  }

  /**
   * Send player ready message (first hand tracking occurred).
   */
  sendPlayerReady(): void {
    this.send({ type: 'participant_ready' });
  }

  /**
   * Send play again vote message.
   */
  sendPlayAgainVote(): void {
    console.log('GameClient: sending play_again_vote message');
    this.send({ type: 'play_again_vote' });
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
      console.warn('GameClient: Cannot send message - not connected', {
        messageType: message.type,
        isConnected: this.isConnected,
        wsExists: this.ws !== null,
        wsReadyState: this.ws?.readyState,
      });
    }
  }

  private handleMessage(message: ServerMessage): void {
    switch (message.type) {
      // Framework messages (from SessionRuntime)
      case 'welcome':
        this.events.onWelcome?.({
          // Framework uses participantId/participantNumber, we expose as playerId/playerNumber
          playerId: message.participantId,
          playerNumber: message.participantNumber,
          // App data is nested in appData
          blocks: message.appData?.blocks ?? [],
          projectiles: message.appData?.projectiles ?? [],
          room: message.appData?.room,
          cameraDistance: message.appData?.cameraDistance,
          wallGrid: message.appData?.wallGrid,
          projectileSize: message.appData?.projectileSize,
          gamePhase: message.appData?.gamePhase ?? 'waiting',
        });
        break;

      case 'opponent_joined':
        this.events.onOpponentJoined?.(message.appData?.blocks ?? []);
        break;

      case 'opponent_left':
        this.events.onOpponentLeft?.();
        break;

      case 'session_started':
        this.events.onGameStarted?.();
        break;

      case 'session_ended':
        console.log('GameClient received session_ended:', message);
        this.events.onGameOver?.(
          message.winnerId ?? '',
          message.winnerNumber ?? 1,
          message.reason ?? 'completed'
        );
        break;

      case 'play_again_status':
        console.log('GameClient received play_again_status:', message);
        this.events.onPlayAgainStatus?.(
          message.votedParticipantIds ?? [],
          message.totalParticipants ?? 0
        );
        break;

      case 'session_reset':
        console.log('GameClient received session_reset:', message);
        this.events.onGameReset?.(message.appData?.blocks ?? []);
        break;

      case 'error':
        this.events.onError?.(message.message);
        break;

      // App-specific messages (from game logic)
      case 'block_grabbed':
        this.events.onBlockGrabbed?.(message.playerId, message.blockId);
        break;

      case 'block_moved':
        this.events.onBlockMoved?.(message.playerId, message.blockId, message.position);
        break;

      case 'block_released':
        this.events.onBlockReleased?.(message.playerId, message.blockId);
        break;

      case 'projectile_spawned':
        this.events.onProjectileSpawned?.(message.projectile);
        break;

      case 'projectiles_update':
        this.events.onProjectilesUpdate?.(message.projectiles);
        break;

      case 'projectile_destroyed':
        this.events.onProjectileDestroyed?.(message.projectileId);
        break;

      case 'block_destroyed':
        this.events.onBlockDestroyed?.(message.blockId, message.position, message.color);
        break;

      case 'wall_hit':
        this.events.onWallHit?.(message.position, message.wallSide);
        break;
    }
  }
}
