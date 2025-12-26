/**
 * @fileoverview Hello Hands types.
 */

/**
 * Unique identifier for a participant.
 */
export type ParticipantId = string;

/**
 * Participant number (1 or 2).
 */
export type ParticipantNumber = 1 | 2;

/**
 * 2D position (normalized 0-1 range from hand tracking).
 */
export interface Position2D {
  readonly x: number;
  readonly y: number;
}

/**
 * Hand state for a participant.
 */
export interface HandState {
  /** Position of the hand (normalized 0-1) */
  readonly position: Position2D;
  /** Whether a pinch gesture is detected */
  readonly isPinching: boolean;
  /** Whether the hand is raised (above certain threshold) */
  readonly isRaised: boolean;
}

/**
 * Participant state in the session.
 */
export interface Participant {
  readonly id: ParticipantId;
  readonly number: ParticipantNumber;
  /** Current hand state (if tracking) */
  readonly handState?: HandState;
  /** Color to display this participant's hand */
  readonly color: number;
}

/**
 * Colors for participants.
 */
export const PARTICIPANT_COLORS: Record<ParticipantNumber, number> = {
  1: 0x4ecdc4, // Teal
  2: 0xff6b6b, // Coral
};

/**
 * Get the color for a participant number.
 */
export function getParticipantColor(number: ParticipantNumber): number {
  return PARTICIPANT_COLORS[number];
}
