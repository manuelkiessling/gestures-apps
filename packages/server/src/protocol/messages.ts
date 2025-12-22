/**
 * @fileoverview Re-exports protocol messages from shared package.
 * This maintains backward compatibility while using the shared definitions.
 */

// Re-export types for convenience
export type {
  Block,
  Position,
  Projectile,
  RoomBounds,
  WallGridConfig,
} from '@block-game/shared';
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
  CannonFireMessage,
  ClientMessage,
  ErrorMessage,
  // Client messages
  JoinGameMessage,
  OpponentJoinedMessage,
  OpponentLeftMessage,
  // Schemas
  PositionSchema,
  ProjectileDestroyedMessage,
  ProjectileSchema,
  ProjectileSpawnedMessage,
  ProjectilesUpdateMessage,
  // Utilities
  parseClientMessage,
  RoomBoundsSchema,
  ServerMessage,
  serializeServerMessage,
  WallGridConfigSchema,
  WallHitMessage,
  // Server messages
  WelcomeMessage,
} from '@block-game/shared';
