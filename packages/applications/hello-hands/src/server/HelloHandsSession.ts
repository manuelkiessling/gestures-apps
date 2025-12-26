/**
 * @fileoverview Hello Hands session logic using SessionRuntime.
 *
 * A minimal implementation demonstrating the framework's AppHooks interface.
 * Participants can see each other's hand positions and wave to each other.
 */

import type {
  ParticipantId,
  ParticipantNumber,
  SessionPhase,
} from '@gesture-app/framework-protocol';
import type {
  AppHooks,
  MessageResponse,
  Participant,
  SessionRuntimeConfig,
} from '@gesture-app/framework-server';
import type {
  ClientMessage,
  HandState,
  HelloHandsResetData,
  HelloHandsWelcomeData,
  ServerMessage,
} from '../shared/protocol.js';
import type { Position2D, Stroke } from '../shared/types.js';
import { getParticipantColor } from '../shared/types.js';

/**
 * Active stroke being drawn by a participant.
 */
interface ActiveStroke {
  participantId: ParticipantId;
  points: Position2D[];
}

/**
 * Session state for Hello Hands.
 */
interface HelloHandsState {
  /** Current hand states by participant ID */
  handStates: Map<ParticipantId, HandState>;
  /** Completed strokes drawn by participants */
  strokes: Stroke[];
  /** Currently active strokes (being drawn) by participant ID */
  activeStrokes: Map<ParticipantId, ActiveStroke>;
}

/**
 * Create the initial session state.
 */
function createInitialState(): HelloHandsState {
  return {
    handStates: new Map(),
    strokes: [],
    activeStrokes: new Map(),
  };
}

/**
 * Hello Hands AppHooks implementation.
 */
export class HelloHandsHooks
  implements AppHooks<ClientMessage, ServerMessage, HelloHandsWelcomeData, HelloHandsResetData>
{
  private state: HelloHandsState = createInitialState();
  private participantColors = new Map<ParticipantId, number>();

  generateParticipantId(participantNumber: ParticipantNumber): ParticipantId {
    return `hand-${participantNumber}`;
  }

  onParticipantJoin(participant: Participant): HelloHandsWelcomeData {
    const color = getParticipantColor(participant.number);
    this.participantColors.set(participant.id, color);

    // Find opponent's color if they exist
    let opponentColor: number | undefined;
    for (const [id, c] of this.participantColors) {
      if (id !== participant.id) {
        opponentColor = c;
        break;
      }
    }

    return {
      color,
      opponentColor,
      strokes: this.state.strokes.length > 0 ? this.state.strokes : undefined,
    };
  }

  onParticipantLeave(participantId: ParticipantId): void {
    this.state.handStates.delete(participantId);
    this.participantColors.delete(participantId);
    // Clean up any active stroke
    this.state.activeStrokes.delete(participantId);
    // Remove all strokes by this participant
    this.state.strokes = this.state.strokes.filter(
      (stroke) => stroke.participantId !== participantId
    );
  }

  onMessage(
    message: ClientMessage,
    senderId: ParticipantId,
    _phase: SessionPhase
  ): MessageResponse<ServerMessage>[] {
    switch (message.type) {
      case 'hand_update':
        // Store the hand state
        this.state.handStates.set(senderId, message.handState);

        // Broadcast to opponent
        return [
          {
            target: 'opponent',
            message: {
              type: 'hand_broadcast',
              participantId: senderId,
              handState: message.handState,
            },
          },
        ];

      case 'wave':
        // Broadcast wave to opponent
        return [
          {
            target: 'opponent',
            message: {
              type: 'wave_broadcast',
              participantId: senderId,
            },
          },
        ];

      case 'draw_start':
        // Start a new stroke for this participant
        this.state.activeStrokes.set(senderId, {
          participantId: senderId,
          points: [],
        });
        return [
          {
            target: 'opponent',
            message: {
              type: 'draw_start_broadcast',
              participantId: senderId,
            },
          },
        ];

      case 'draw_point': {
        // Add point to active stroke
        const activeStroke = this.state.activeStrokes.get(senderId);
        if (activeStroke) {
          activeStroke.points.push({ x: message.x, y: message.y });
        }
        return [
          {
            target: 'opponent',
            message: {
              type: 'draw_point_broadcast',
              participantId: senderId,
              x: message.x,
              y: message.y,
            },
          },
        ];
      }

      case 'draw_end': {
        // Finalize the stroke
        const completedStroke = this.state.activeStrokes.get(senderId);
        if (completedStroke && completedStroke.points.length > 0) {
          this.state.strokes.push({
            participantId: completedStroke.participantId,
            points: completedStroke.points,
          });
        }
        this.state.activeStrokes.delete(senderId);
        return [
          {
            target: 'opponent',
            message: {
              type: 'draw_end_broadcast',
              participantId: senderId,
            },
          },
        ];
      }

      case 'clear_drawings':
        // Remove all strokes by this sender
        this.state.strokes = this.state.strokes.filter(
          (stroke) => stroke.participantId !== senderId
        );
        // Also clear any active stroke
        this.state.activeStrokes.delete(senderId);
        return [
          {
            target: 'opponent',
            message: {
              type: 'clear_drawings_broadcast',
              participantId: senderId,
            },
          },
        ];

      default:
        return [];
    }
  }

  onSessionStart(): void {
    // Nothing special needed for hello-hands
    console.log('[HelloHands] Session started!');
  }

  onReset(): HelloHandsResetData {
    // Clear hand states
    this.state = createInitialState();
    return {
      message: 'Ready to wave again!',
    };
  }
}

/**
 * Create a runtime configuration for Hello Hands.
 * No tick loop needed - we just relay hand updates.
 */
export function createHelloHandsConfig(): SessionRuntimeConfig {
  return {
    maxParticipants: 2,
    tickEnabled: false,
    tickIntervalMs: 16,
  };
}

/**
 * Message serialization for Hello Hands.
 */
export function serializeMessage(message: ServerMessage): string {
  return JSON.stringify(message);
}

/**
 * Message parsing for Hello Hands.
 */
export function parseMessage(data: string): ClientMessage | null {
  try {
    const parsed = JSON.parse(data);
    // Basic validation - ensure it has a type
    if (typeof parsed === 'object' && parsed !== null && typeof parsed.type === 'string') {
      return parsed as ClientMessage;
    }
    return null;
  } catch {
    return null;
  }
}
