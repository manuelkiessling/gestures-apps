/**
 * @fileoverview Client-specific type definitions for Blocks & Cannons.
 */

import type * as THREE from 'three';
import type {
  Block,
  GamePhase,
  Projectile,
  RoomBounds,
  WallGridConfig,
} from '../src/shared/index.js';

// Re-export hand tracking types from framework-input
export type {
  Handedness,
  HandLandmarks,
  MultiHandResult,
  Point3D as HandLandmark,
  TrackedHand,
} from '@gesture-app/framework-input';
// Re-export shared types for convenience
export type {
  Block,
  BlockId,
  BlockType,
  GamePhase,
  PlayerId,
  PlayerNumber,
  Position,
  Projectile,
  ProjectileId,
  RoomBounds,
  WallGridConfig,
} from '../src/shared/index.js';

/**
 * Extended block data with Three.js mesh and local state.
 * Mesh can be a single Mesh (regular blocks) or a Group (cannons with complex geometry).
 */
export interface BlockEntity {
  mesh: THREE.Mesh | THREE.Group;
  data: Block;
  /** Base Y position for floating animation */
  baseY: number;
  /** Phase offset for floating animation */
  phase: number;
  /** Whether this block is currently grabbed (by anyone) */
  isGrabbed: boolean;
}

/**
 * Extended projectile data with Three.js mesh.
 */
export interface ProjectileEntity {
  mesh: THREE.Mesh;
  data: Projectile;
}

/**
 * Explosion particle data.
 */
export interface ExplosionParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotationSpeed: THREE.Vector3;
}

/**
 * Active explosion effect.
 */
export interface Explosion {
  particles: ExplosionParticle[];
  startTime: number;
  duration: number;
}

/**
 * Wall hit highlight data.
 */
export interface WallHighlight {
  group: THREE.Group;
  meshes: THREE.Object3D[];
  startTime: number;
  timeoutId: ReturnType<typeof setTimeout>;
}

/**
 * Game initialization data from server welcome message.
 */
export interface GameInitData {
  playerId: string;
  playerNumber: 1 | 2;
  blocks: Block[];
  projectiles: Projectile[];
  room: RoomBounds;
  cameraDistance: number;
  wallGrid: WallGridConfig;
  projectileSize: number;
  gamePhase: GamePhase;
}

/**
 * Connection state.
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
