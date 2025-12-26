/**
 * @fileoverview Re-exports protocol from @gesture-app/blocks-cannons.
 * @deprecated Import from '@gesture-app/blocks-cannons/shared' instead.
 */

export type { ClientMessage, GamePhase, ServerMessage } from '@gesture-app/blocks-cannons/shared';

export {
  BlockDestroyedMessage,
  BlockGrabbedMessage,
  BlockGrabMessage,
  BlockMovedMessage,
  BlockMoveMessage,
  BlockReleasedMessage,
  BlockReleaseMessage,
  BlockSchema,
  BlockTypeSchema,
  BotIdentifyMessage,
  CannonFireMessage,
  ErrorMessage,
  GameOverMessage,
  GamePhaseSchema,
  GameResetMessage,
  GameStartedMessage,
  isMessageType,
  JoinGameMessage,
  OpponentJoinedMessage,
  OpponentLeftMessage,
  PlayAgainStatusMessage,
  PlayAgainVoteMessage,
  PlayerReadyMessage,
  PositionSchema,
  ProjectileDestroyedMessage,
  ProjectileSchema,
  ProjectileSpawnedMessage,
  ProjectilesUpdateMessage,
  parseClientMessage,
  RoomBoundsSchema,
  serializeServerMessage,
  WallGridConfigSchema,
  WallHitMessage,
  WelcomeMessage,
} from '@gesture-app/blocks-cannons/shared';
