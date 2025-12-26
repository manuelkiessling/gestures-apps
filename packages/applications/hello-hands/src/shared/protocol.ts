/**
 * @fileoverview Hello Hands protocol messages.
 *
 * This is a minimal protocol - just hand position updates and wave events.
 */

import { z } from 'zod';
import type { HandState, ParticipantId } from './types.js';

// Re-export HandState for consumers
export type { HandState } from './types.js';

// ============ Schemas ============

export const Position2DSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const HandStateSchema = z.object({
  position: Position2DSchema,
  isPinching: z.boolean(),
  isRaised: z.boolean(),
});

// ============ Client → Server Messages ============

/**
 * Client sends hand position update.
 */
export interface HandUpdateMessage {
  type: 'hand_update';
  handState: HandState;
}

export const HandUpdateMessageSchema = z.object({
  type: z.literal('hand_update'),
  handState: HandStateSchema,
});

/**
 * Client sends a wave gesture.
 */
export interface WaveMessage {
  type: 'wave';
}

export const WaveMessageSchema = z.object({
  type: z.literal('wave'),
});

/**
 * Union of all client messages.
 */
export type ClientMessage = HandUpdateMessage | WaveMessage;

export const ClientMessageSchema = z.discriminatedUnion('type', [
  HandUpdateMessageSchema,
  WaveMessageSchema,
]);

/**
 * Parse and validate a client message.
 */
export function parseClientMessage(data: unknown): ClientMessage | null {
  const result = ClientMessageSchema.safeParse(data);
  return result.success ? result.data : null;
}

// ============ Server → Client Messages ============

/**
 * Server broadcasts hand position update from a participant.
 */
export interface HandBroadcastMessage {
  type: 'hand_broadcast';
  participantId: ParticipantId;
  handState: HandState;
}

/**
 * Server broadcasts a wave from a participant.
 */
export interface WaveBroadcastMessage {
  type: 'wave_broadcast';
  participantId: ParticipantId;
}

/**
 * Union of all server messages.
 */
export type ServerMessage = HandBroadcastMessage | WaveBroadcastMessage;

/**
 * Serialize a server message to JSON string.
 */
export function serializeServerMessage(message: ServerMessage): string {
  return JSON.stringify(message);
}

// ============ Welcome Data ============

/**
 * App-specific data included in the welcome message.
 */
export interface HelloHandsWelcomeData {
  /** Color assigned to this participant */
  color: number;
  /** Color of the opponent (if present) */
  opponentColor?: number;
}

// ============ Reset Data ============

/**
 * App-specific data included in the reset message.
 */
export interface HelloHandsResetData {
  /** Placeholder - no special reset data needed */
  message: string;
}
