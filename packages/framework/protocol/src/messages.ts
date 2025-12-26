import { z } from 'zod';
import { ParticipantIdSchema, ParticipantNumberSchema, SessionPhaseSchema } from './types.js';

/**
 * Framework client → server messages.
 */
export const ParticipantReadyMessageSchema = z.object({
  type: z.literal('participant_ready'),
});

export const BotIdentifyMessageSchema = z.object({
  type: z.literal('bot_identify'),
});

export const PlayAgainVoteMessageSchema = z.object({
  type: z.literal('play_again_vote'),
});

export const FrameworkClientMessageSchema = z.discriminatedUnion('type', [
  ParticipantReadyMessageSchema,
  BotIdentifyMessageSchema,
  PlayAgainVoteMessageSchema,
]);

export type FrameworkClientMessage = z.infer<typeof FrameworkClientMessageSchema>;

/**
 * Helper to compose app client messages with framework client messages.
 */
export function createSessionClientMessageSchema<TAppClientMessageSchema extends z.ZodTypeAny>(
  appClientMessageSchema: TAppClientMessageSchema
) {
  return z.union([FrameworkClientMessageSchema, appClientMessageSchema]);
}

/**
 * Framework server → client messages.
 */
export const SessionStartedMessageSchema = z.object({
  type: z.literal('session_started'),
});

export const OpponentLeftMessageSchema = z.object({
  type: z.literal('opponent_left'),
});

export const PlayAgainStatusMessageSchema = z.object({
  type: z.literal('play_again_status'),
  votedParticipantIds: z.array(ParticipantIdSchema),
  totalParticipants: z.number().int().nonnegative(),
});

export const ErrorMessageSchema = z.object({
  type: z.literal('error'),
  message: z.string(),
});

export const SessionEndedReasonSchema = z.enum([
  'completed',
  'participant_left',
  'timeout',
  'app_condition',
]);
export type SessionEndedReason = z.infer<typeof SessionEndedReasonSchema>;

/**
 * Helper to compose app server messages with framework server messages.
 *
 * The returned schema validates both framework-level lifecycle messages and
 * app-specific messages, while ensuring framework messages carry appData
 * payloads in dedicated fields.
 */
export function createSessionServerMessageSchema<
  TAppServerMessageSchema extends z.ZodTypeAny,
  TWelcomeDataSchema extends z.ZodTypeAny,
  TOpponentJoinedDataSchema extends z.ZodTypeAny = z.ZodUndefined,
  TResetDataSchema extends z.ZodTypeAny = z.ZodUndefined,
  TSessionEndedDataSchema extends z.ZodTypeAny = z.ZodUndefined,
>(options: {
  appServerMessageSchema: TAppServerMessageSchema;
  welcomeAppDataSchema: TWelcomeDataSchema;
  opponentJoinedAppDataSchema?: TOpponentJoinedDataSchema;
  resetAppDataSchema?: TResetDataSchema;
  sessionEndedAppDataSchema?: TSessionEndedDataSchema;
}) {
  const {
    appServerMessageSchema,
    welcomeAppDataSchema,
    opponentJoinedAppDataSchema,
    resetAppDataSchema,
    sessionEndedAppDataSchema,
  } = options;

  const WelcomeMessageSchema = z.object({
    type: z.literal('welcome'),
    participantId: ParticipantIdSchema,
    participantNumber: ParticipantNumberSchema,
    sessionPhase: SessionPhaseSchema,
    appData: welcomeAppDataSchema,
  });

  const OpponentJoinedMessageSchema = z.object({
    type: z.literal('opponent_joined'),
    appData: opponentJoinedAppDataSchema?.optional(),
  });

  const SessionEndedMessageSchema = z.object({
    type: z.literal('session_ended'),
    reason: SessionEndedReasonSchema,
    winnerId: ParticipantIdSchema.optional(),
    winnerNumber: ParticipantNumberSchema.optional(),
    appData: sessionEndedAppDataSchema?.optional(),
  });

  const SessionResetMessageSchema = z.object({
    type: z.literal('session_reset'),
    appData: resetAppDataSchema?.optional(),
  });

  const frameworkServerMessageSchema = z.discriminatedUnion('type', [
    WelcomeMessageSchema,
    OpponentJoinedMessageSchema,
    OpponentLeftMessageSchema,
    SessionStartedMessageSchema,
    SessionEndedMessageSchema,
    PlayAgainStatusMessageSchema,
    SessionResetMessageSchema,
    ErrorMessageSchema,
  ]);

  return z.union([frameworkServerMessageSchema, appServerMessageSchema]);
}
