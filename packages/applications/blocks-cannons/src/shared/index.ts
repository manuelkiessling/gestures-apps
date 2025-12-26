/**
 * @fileoverview Blocks & Cannons shared exports.
 * Re-exports types, protocol, and constants for the blocks-cannons game.
 */

// Constants
export {
  BLOCK_COLORS,
  BLOCK_FLOAT_AMPLITUDE,
  BLOCK_REACH_DISTANCE,
  CAMERA_MARGIN,
  CANNON_COLOR,
  EDGE_THRESHOLD,
  EXPLOSION_DURATION_MS,
  EXPLOSION_PARTICLE_COUNT,
  HAND_COLORS,
  HIGHLIGHT_COLORS,
  PINCH_THRESHOLD,
  POSITION_SEND_THROTTLE_MS,
  PROJECTILE_COLOR,
} from './constants.js';
// Protocol
export type { ClientMessage, ServerMessage } from './protocol.js';
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
} from './protocol.js';
// Types
export type {
  Block,
  BlockId,
  BlockType,
  DestroyedBlockInfo,
  GamePhase,
  Player,
  PlayerId,
  PlayerNumber,
  Position,
  Projectile,
  ProjectileId,
  RoomBounds,
  Velocity,
  WallGridConfig,
  WallHitInfo,
} from './types.js';
export { MAX_GRABBED_BLOCKS } from './types.js';
