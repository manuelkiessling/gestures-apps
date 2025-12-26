import { z } from 'zod';

/**
 * Participant identifier.
 */
export type ParticipantId = string;

/**
 * Participant number (1 or 2).
 */
export type ParticipantNumber = 1 | 2;

/**
 * Session lifecycle phase.
 */
export type SessionPhase = 'waiting' | 'playing' | 'finished';

/**
 * Zod schema for participant identifier.
 */
export const ParticipantIdSchema = z.string().min(1);

/**
 * Zod schema for participant number.
 */
export const ParticipantNumberSchema = z.union([z.literal(1), z.literal(2)]);

/**
 * Zod schema for session phase.
 */
export const SessionPhaseSchema = z.enum(['waiting', 'playing', 'finished']);
