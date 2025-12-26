/**
 * @fileoverview Hello Hands protocol messages.
 *
 * This is a minimal protocol - just hand position updates and wave events.
 */

import { z } from 'zod';
import type { HandState, ParticipantId, Stroke } from './types.js';

// Re-export types for consumers
export type { HandState, Stroke } from './types.js';

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
 * Client starts drawing a new stroke.
 */
export interface DrawStartMessage {
  type: 'draw_start';
}

export const DrawStartMessageSchema = z.object({
  type: z.literal('draw_start'),
});

/**
 * Client adds a point to the current stroke.
 */
export interface DrawPointMessage {
  type: 'draw_point';
  x: number;
  y: number;
}

export const DrawPointMessageSchema = z.object({
  type: z.literal('draw_point'),
  x: z.number(),
  y: z.number(),
});

/**
 * Client ends the current stroke.
 */
export interface DrawEndMessage {
  type: 'draw_end';
}

export const DrawEndMessageSchema = z.object({
  type: z.literal('draw_end'),
});

/**
 * Client clears all their own drawings.
 */
export interface ClearDrawingsMessage {
  type: 'clear_drawings';
}

export const ClearDrawingsMessageSchema = z.object({
  type: z.literal('clear_drawings'),
});

/**
 * Union of all client messages.
 */
export type ClientMessage =
  | HandUpdateMessage
  | WaveMessage
  | DrawStartMessage
  | DrawPointMessage
  | DrawEndMessage
  | ClearDrawingsMessage;

export const ClientMessageSchema = z.discriminatedUnion('type', [
  HandUpdateMessageSchema,
  WaveMessageSchema,
  DrawStartMessageSchema,
  DrawPointMessageSchema,
  DrawEndMessageSchema,
  ClearDrawingsMessageSchema,
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
 * Server broadcasts that a participant started drawing.
 */
export interface DrawStartBroadcastMessage {
  type: 'draw_start_broadcast';
  participantId: ParticipantId;
}

/**
 * Server broadcasts a drawing point from a participant.
 */
export interface DrawPointBroadcastMessage {
  type: 'draw_point_broadcast';
  participantId: ParticipantId;
  x: number;
  y: number;
}

/**
 * Server broadcasts that a participant ended their stroke.
 */
export interface DrawEndBroadcastMessage {
  type: 'draw_end_broadcast';
  participantId: ParticipantId;
}

/**
 * Server broadcasts that a participant cleared their drawings.
 */
export interface ClearDrawingsBroadcastMessage {
  type: 'clear_drawings_broadcast';
  participantId: ParticipantId;
}

/**
 * Union of all server messages.
 */
export type ServerMessage =
  | HandBroadcastMessage
  | WaveBroadcastMessage
  | DrawStartBroadcastMessage
  | DrawPointBroadcastMessage
  | DrawEndBroadcastMessage
  | ClearDrawingsBroadcastMessage;

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
  /** Existing strokes on the canvas (for late joiners) */
  strokes?: Stroke[];
}

// ============ Reset Data ============

/**
 * App-specific data included in the reset message.
 */
export interface HelloHandsResetData {
  /** Placeholder - no special reset data needed */
  message: string;
}
