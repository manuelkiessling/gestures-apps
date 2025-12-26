/**
 * @fileoverview Server-side exports for blocks-cannons.
 */

// BotAI: Export specific items to avoid conflict with clampToRoom from game/types
export {
  type AIAction,
  type AIConfig,
  type AIDecision,
  type AIDerivedParams,
  type BotGameState,
  calculateAimOffset,
  calculateAimPosition,
  canAct,
  decideAction,
  deriveAIParams,
  detectThreats,
  distanceXY,
  getBlockThreat,
  getEscapeDirection,
  isPositionSafe,
  planEvasion,
  predictCollision,
  predictProjectilePosition,
  type RandomGenerator,
  selectTarget,
  type TargetInfo,
  type Threat,
  // Note: clampToRoom is not re-exported here to avoid conflict with game/types.js
} from './bot/BotAI.js';
export * from './bot/BotBehavior.js';
// Bot exports
export { BotClient, type BotConfig } from './bot/BotClient.js';
export * from './bot/BotMovement.js';
export type { GameConfigYaml } from './config/gameConfig.js';
export { clearConfigCache, loadGameConfig } from './config/gameConfig.js';
export * from './game/index.js';
export { logger } from './utils/logger.js';

// Note: InactivityMonitor has been moved to @gesture-app/framework-server
// and is now automatically integrated via createAppServer
