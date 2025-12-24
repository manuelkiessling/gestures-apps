/**
 * @fileoverview Block and projectile mesh management.
 * Handles creation, updates, and removal of game entities.
 */

import * as THREE from 'three';
import {
  BLOCK_FLOAT_AMPLITUDE,
  CANNON_VISUAL,
  HIGHLIGHT_COLORS,
  LASER_BEAM,
  PROJECTILE_COLORS,
} from '../constants.js';
import type { Block, BlockEntity, Projectile, ProjectileEntity, RoomBounds } from '../types.js';

/**
 * Create a distinctive cannon mesh with octagonal barrel and muzzle.
 * @param color - The cannon color
 * @param isMyBlock - Whether this cannon belongs to the local player
 * @returns A group containing the cannon mesh components
 */
function createCannonMesh(color: number, isMyBlock: boolean): THREE.Group {
  const group = new THREE.Group();

  // Main barrel - octagonal cylinder
  const barrelGeometry = new THREE.CylinderGeometry(0.35, 0.4, 1.2, 8);
  barrelGeometry.rotateX(Math.PI / 2); // Point forward along Z

  const barrelMaterial = new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity: isMyBlock ? 0.95 : 0.6,
    emissive: color,
    emissiveIntensity: CANNON_VISUAL.EMISSIVE_INTENSITY,
    metalness: 0.7,
    roughness: 0.3,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });

  const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
  barrel.position.z = 0.1; // Slight offset forward
  group.add(barrel);

  // Muzzle ring at the front
  const muzzleGeometry = new THREE.TorusGeometry(0.38, 0.08, 8, 8);
  muzzleGeometry.rotateX(Math.PI / 2);

  const muzzleMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: color,
    emissiveIntensity: CANNON_VISUAL.MUZZLE_GLOW,
    metalness: 0.9,
    roughness: 0.1,
  });

  const muzzle = new THREE.Mesh(muzzleGeometry, muzzleMaterial);
  muzzle.position.z = -0.5; // At the front of barrel
  group.add(muzzle);

  // Inner glow core (visible from muzzle)
  const coreGeometry = new THREE.CircleGeometry(0.25, 16);
  const coreMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  core.position.z = -0.52;
  group.add(core);

  // Back cap with accent ring
  const backCapGeometry = new THREE.CylinderGeometry(0.42, 0.35, 0.15, 8);
  backCapGeometry.rotateX(Math.PI / 2);

  const backCapMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    emissive: color,
    emissiveIntensity: 0.15,
    metalness: 0.8,
    roughness: 0.2,
  });

  const backCap = new THREE.Mesh(backCapGeometry, backCapMaterial);
  backCap.position.z = 0.65;
  group.add(backCap);

  return group;
}

/**
 * Manages block and projectile meshes in the scene.
 */
export class BlockRenderer {
  private readonly scene: THREE.Scene;
  private readonly _blocks: Map<string, BlockEntity> = new Map();
  private readonly _projectiles: Map<string, ProjectileEntity> = new Map();
  private readonly myBlockIds: Set<string> = new Set();

  /** Read-only access to blocks collection */
  get blocks(): ReadonlyMap<string, BlockEntity> {
    return this._blocks;
  }

  /** Read-only access to projectiles collection */
  get projectiles(): ReadonlyMap<string, ProjectileEntity> {
    return this._projectiles;
  }

  // Highlights
  private readonly reachableHighlight: THREE.LineSegments;
  private readonly grabbedHighlight: THREE.LineSegments;
  private readonly opponentGrabHighlight: THREE.LineSegments;

  // Laser beams for cannons (group containing beam line and crosshair)
  private readonly laserBeams: Map<string, THREE.Group> = new Map();
  private roomBounds: RoomBounds | null = null;

  private playerId: string | null = null;
  private playerNumber: 1 | 2 | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Create highlight meshes
    const highlightGeo = new THREE.BoxGeometry(1.15, 1.15, 1.15);
    const highlightEdges = new THREE.EdgesGeometry(highlightGeo);

    this.reachableHighlight = new THREE.LineSegments(
      highlightEdges,
      new THREE.LineBasicMaterial({
        color: HIGHLIGHT_COLORS.REACHABLE,
        transparent: true,
        opacity: 0.9,
      })
    );
    this.reachableHighlight.visible = false;
    this.scene.add(this.reachableHighlight);

    this.grabbedHighlight = new THREE.LineSegments(
      highlightEdges.clone(),
      new THREE.LineBasicMaterial({
        color: HIGHLIGHT_COLORS.GRABBED,
        transparent: true,
        opacity: 1,
      })
    );
    this.grabbedHighlight.visible = false;
    this.scene.add(this.grabbedHighlight);

    this.opponentGrabHighlight = new THREE.LineSegments(
      highlightEdges.clone(),
      new THREE.LineBasicMaterial({
        color: HIGHLIGHT_COLORS.OPPONENT_GRAB,
        transparent: true,
        opacity: 0.7,
      })
    );
    this.opponentGrabHighlight.visible = false;
    this.scene.add(this.opponentGrabHighlight);
  }

  /**
   * Set the current player info.
   */
  setPlayer(playerId: string, playerNumber: 1 | 2): void {
    this.playerId = playerId;
    this.playerNumber = playerNumber;
  }

  /**
   * Set the room bounds for laser beam calculations.
   */
  setRoom(room: RoomBounds): void {
    this.roomBounds = room;
  }

  /**
   * Create a block mesh and add it to the scene.
   */
  createBlock(blockData: Block): BlockEntity {
    const isMyBlock = blockData.ownerId === this.playerId;
    const isCannon = blockData.blockType === 'cannon';

    let mesh: THREE.Mesh | THREE.Group;

    if (isCannon) {
      // Create distinctive cannon with octagonal barrel
      mesh = createCannonMesh(blockData.color, isMyBlock);
    } else {
      // Regular blocks are slightly smaller than 1.0 to prevent z-fighting when adjacent
      const geometry = new THREE.BoxGeometry(0.96, 0.96, 0.96);
      const material = new THREE.MeshStandardMaterial({
        color: blockData.color,
        transparent: true,
        opacity: isMyBlock ? 0.9 : 0.5,
        emissive: 0x000000,
        emissiveIntensity: 0,
        // Prevent z-fighting when blocks are adjacent
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      });
      mesh = new THREE.Mesh(geometry, material);
    }

    mesh.position.set(blockData.position.x, blockData.position.y, blockData.position.z);

    // Orient cannon to point towards enemy
    if (isCannon && this.playerNumber) {
      mesh.rotation.y = this.playerNumber === 1 ? 0 : Math.PI;
    }

    const entity: BlockEntity = {
      mesh,
      data: blockData,
      baseY: blockData.position.y,
      phase: Math.random() * Math.PI * 2,
      isGrabbed: false,
    };

    this.scene.add(mesh);
    this._blocks.set(blockData.id, entity);

    if (isMyBlock) {
      this.myBlockIds.add(blockData.id);
    }

    // Create laser beam for all cannons (both mine and opponent's)
    if (isCannon && this.roomBounds && this.playerNumber) {
      this.createLaserBeam(blockData.id, mesh.position, isMyBlock);
    }

    return entity;
  }

  /**
   * Create a crosshair mesh for the beam endpoint.
   */
  private createCrosshair(color: number): THREE.Group {
    const crosshairGroup = new THREE.Group();
    const size = LASER_BEAM.CROSSHAIR_SIZE;
    const innerSize = LASER_BEAM.CROSSHAIR_INNER_SIZE;

    // Outer ring
    const outerRingGeometry = new THREE.RingGeometry(size * 0.8, size, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: LASER_BEAM.OPACITY,
      side: THREE.DoubleSide,
    });
    const outerRing = new THREE.Mesh(outerRingGeometry, ringMaterial);
    crosshairGroup.add(outerRing);

    // Inner dot
    const dotGeometry = new THREE.CircleGeometry(innerSize, 16);
    const dotMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: LASER_BEAM.OPACITY + 0.2,
      side: THREE.DoubleSide,
    });
    const dot = new THREE.Mesh(dotGeometry, dotMaterial);
    crosshairGroup.add(dot);

    // Cross lines
    const lineMaterial = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: LASER_BEAM.OPACITY + 0.1,
    });

    // Horizontal line
    const hPoints = [
      new THREE.Vector3(-size * 1.2, 0, 0),
      new THREE.Vector3(-size * 0.4, 0, 0),
    ];
    const hPoints2 = [
      new THREE.Vector3(size * 0.4, 0, 0),
      new THREE.Vector3(size * 1.2, 0, 0),
    ];
    const hLine1 = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(hPoints),
      lineMaterial
    );
    const hLine2 = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(hPoints2),
      lineMaterial.clone()
    );
    crosshairGroup.add(hLine1);
    crosshairGroup.add(hLine2);

    // Vertical line
    const vPoints = [
      new THREE.Vector3(0, -size * 1.2, 0),
      new THREE.Vector3(0, -size * 0.4, 0),
    ];
    const vPoints2 = [
      new THREE.Vector3(0, size * 0.4, 0),
      new THREE.Vector3(0, size * 1.2, 0),
    ];
    const vLine1 = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(vPoints),
      lineMaterial.clone()
    );
    const vLine2 = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(vPoints2),
      lineMaterial.clone()
    );
    crosshairGroup.add(vLine1);
    crosshairGroup.add(vLine2);

    return crosshairGroup;
  }

  /**
   * Create a laser beam with crosshair from cannon to back wall.
   * @param cannonId - The cannon block ID
   * @param position - Current cannon position
   * @param isMyBlock - Whether this cannon belongs to the local player
   */
  private createLaserBeam(cannonId: string, position: THREE.Vector3, isMyBlock: boolean): void {
    if (!this.roomBounds || !this.playerNumber) return;

    // Remove existing laser beam if any
    this.removeLaserBeam(cannonId);

    // Determine cannon owner's player number for fire direction
    const ownerPlayerNumber = isMyBlock ? this.playerNumber : this.playerNumber === 1 ? 2 : 1;
    // Player 1 fires toward minZ, Player 2 fires toward maxZ
    const targetZ = ownerPlayerNumber === 1 ? this.roomBounds.minZ : this.roomBounds.maxZ;

    const beamGroup = new THREE.Group();
    const beamColor = isMyBlock ? LASER_BEAM.COLOR_OWN : LASER_BEAM.COLOR_OPPONENT;

    // Main beam line - solid and more visible
    const beamPoints = [
      new THREE.Vector3(position.x, position.y, position.z),
      new THREE.Vector3(position.x, position.y, targetZ),
    ];
    const beamGeometry = new THREE.BufferGeometry().setFromPoints(beamPoints);
    const beamMaterial = new THREE.LineBasicMaterial({
      color: beamColor,
      transparent: true,
      opacity: LASER_BEAM.OPACITY,
      linewidth: LASER_BEAM.LINE_WIDTH,
    });
    const beamLine = new THREE.Line(beamGeometry, beamMaterial);
    beamLine.name = 'beamLine';
    beamGroup.add(beamLine);

    // Glow beam (slightly wider, more transparent)
    const glowMaterial = new THREE.LineBasicMaterial({
      color: beamColor,
      transparent: true,
      opacity: LASER_BEAM.OPACITY * 0.4,
      linewidth: LASER_BEAM.LINE_WIDTH + 2,
    });
    const glowLine = new THREE.Line(beamGeometry.clone(), glowMaterial);
    glowLine.name = 'glowLine';
    beamGroup.add(glowLine);

    // Crosshair at the endpoint
    const crosshair = this.createCrosshair(beamColor);
    crosshair.name = 'crosshair';
    crosshair.position.set(position.x, position.y, targetZ + (ownerPlayerNumber === 1 ? 0.02 : -0.02));
    beamGroup.add(crosshair);

    this.scene.add(beamGroup);
    this.laserBeams.set(cannonId, beamGroup);
  }

  /**
   * Update laser beam position when cannon moves.
   */
  private updateLaserBeam(cannonId: string, position: THREE.Vector3): void {
    const beamGroup = this.laserBeams.get(cannonId);
    if (!beamGroup || !this.roomBounds || !this.playerNumber) return;

    // Determine cannon owner's player number for fire direction
    const entity = this._blocks.get(cannonId);
    const isMyBlock = entity ? entity.data.ownerId === this.playerId : true;
    const ownerPlayerNumber = isMyBlock ? this.playerNumber : this.playerNumber === 1 ? 2 : 1;
    const targetZ = ownerPlayerNumber === 1 ? this.roomBounds.minZ : this.roomBounds.maxZ;

    // Update beam lines
    beamGroup.traverse((child) => {
      if (child instanceof THREE.Line && (child.name === 'beamLine' || child.name === 'glowLine')) {
        const positions = child.geometry.attributes.position as THREE.BufferAttribute;
        positions.setXYZ(0, position.x, position.y, position.z);
        positions.setXYZ(1, position.x, position.y, targetZ);
        positions.needsUpdate = true;
      }
    });

    // Update crosshair position
    const crosshair = beamGroup.getObjectByName('crosshair');
    if (crosshair) {
      crosshair.position.set(position.x, position.y, targetZ + (ownerPlayerNumber === 1 ? 0.02 : -0.02));
    }
  }

  /**
   * Remove a laser beam and all its components.
   */
  private removeLaserBeam(cannonId: string): void {
    const beamGroup = this.laserBeams.get(cannonId);
    if (beamGroup) {
      this.scene.remove(beamGroup);
      beamGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        } else if (child instanceof THREE.Line) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
      this.laserBeams.delete(cannonId);
    }
  }

  /**
   * Create a projectile mesh and add it to the scene.
   * Uses player-specific colors: yellow for own, red for opponent.
   */
  createProjectile(projectileData: Projectile, projectileSize: number = 0.3): ProjectileEntity {
    // Use player-relative colors for visual distinction
    const isMyProjectile = projectileData.ownerId === this.playerId;
    const color = isMyProjectile ? PROJECTILE_COLORS.OWN : PROJECTILE_COLORS.OPPONENT;

    const geometry = new THREE.SphereGeometry(projectileSize, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.6,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      projectileData.position.x,
      projectileData.position.y,
      projectileData.position.z
    );

    const entity: ProjectileEntity = {
      mesh,
      data: projectileData,
    };

    this.scene.add(mesh);
    this._projectiles.set(projectileData.id, entity);

    return entity;
  }

  /**
   * Update a block's position.
   */
  updateBlockPosition(blockId: string, position: { x: number; y: number; z: number }): void {
    const entity = this._blocks.get(blockId);
    if (entity) {
      entity.mesh.position.set(position.x, position.y, position.z);
      entity.baseY = position.y;

      // Update laser beam if this is a cannon
      if (entity.data.blockType === 'cannon' && this.laserBeams.has(blockId)) {
        this.updateLaserBeam(blockId, entity.mesh.position);
      }
    }
  }

  /**
   * Update a projectile's position.
   */
  updateProjectilePosition(
    projectileId: string,
    position: { x: number; y: number; z: number }
  ): void {
    const entity = this._projectiles.get(projectileId);
    if (entity) {
      entity.mesh.position.set(position.x, position.y, position.z);
    }
  }

  /**
   * Remove a block from the scene.
   */
  removeBlock(blockId: string): void {
    const entity = this._blocks.get(blockId);
    if (entity) {
      this.scene.remove(entity.mesh);

      // Handle group disposal (cannon) vs single mesh disposal (regular block)
      if (entity.mesh instanceof THREE.Group) {
        entity.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (child.material instanceof THREE.Material) {
              child.material.dispose();
            }
          }
        });
      } else if (entity.mesh instanceof THREE.Mesh) {
        entity.mesh.geometry.dispose();
        if (entity.mesh.material instanceof THREE.Material) {
          entity.mesh.material.dispose();
        }
      }

      this._blocks.delete(blockId);
      this.myBlockIds.delete(blockId);

      // Remove laser beam if this was a cannon
      this.removeLaserBeam(blockId);
    }
  }

  /**
   * Remove a projectile from the scene.
   */
  removeProjectile(projectileId: string): void {
    const entity = this._projectiles.get(projectileId);
    if (entity) {
      this.scene.remove(entity.mesh);
      entity.mesh.geometry.dispose();
      if (entity.mesh.material instanceof THREE.Material) {
        entity.mesh.material.dispose();
      }
      this._projectiles.delete(projectileId);
    }
  }

  /**
   * Mark a block as grabbed.
   */
  setBlockGrabbed(blockId: string, isGrabbed: boolean): void {
    const entity = this._blocks.get(blockId);
    if (entity) {
      entity.isGrabbed = isGrabbed;
      if (isGrabbed && !this.myBlockIds.has(blockId)) {
        // Opponent grabbed a block - show highlight
        this.opponentGrabHighlight.position.copy(entity.mesh.position);
        this.opponentGrabHighlight.visible = true;
      }
    }
    if (!isGrabbed) {
      this.opponentGrabHighlight.visible = false;
    }
  }

  /**
   * Show reachable block highlight at a position.
   */
  showReachableHighlight(position: THREE.Vector3, rotation?: THREE.Euler): void {
    this.reachableHighlight.position.copy(position);
    if (rotation) {
      this.reachableHighlight.rotation.copy(rotation);
    }
    this.reachableHighlight.visible = true;
  }

  /**
   * Hide the reachable block highlight.
   */
  hideReachableHighlight(): void {
    this.reachableHighlight.visible = false;
  }

  /**
   * Show grabbed block highlight at a position.
   */
  showGrabbedHighlight(position: THREE.Vector3, rotation?: THREE.Euler): void {
    this.grabbedHighlight.position.copy(position);
    if (rotation) {
      this.grabbedHighlight.rotation.copy(rotation);
    }
    this.grabbedHighlight.visible = true;
  }

  /**
   * Hide the grabbed block highlight.
   */
  hideGrabbedHighlight(): void {
    this.grabbedHighlight.visible = false;
  }

  /**
   * Update floating animations for all blocks.
   */
  updateAnimations(elapsedTime: number, grabbedBlockId: string | null): void {
    for (const [id, entity] of this._blocks) {
      const isGrabbed = id === grabbedBlockId || entity.isGrabbed;

      if (!isGrabbed) {
        // Gentle floating animation for non-grabbed blocks
        entity.mesh.position.y =
          entity.baseY + Math.sin(elapsedTime + entity.phase) * BLOCK_FLOAT_AMPLITUDE;
      }

      // Update cannon-specific effects
      if (entity.data.blockType === 'cannon') {
        // Update laser beam position
        if (this.laserBeams.has(id)) {
          this.updateLaserBeam(id, entity.mesh.position);
        }

        // Pulse the cannon emissive glow
        if (entity.mesh instanceof THREE.Group) {
          const pulseIntensity =
            CANNON_VISUAL.EMISSIVE_INTENSITY +
            Math.sin(elapsedTime * CANNON_VISUAL.PULSE_SPEED + entity.phase) *
              CANNON_VISUAL.PULSE_RANGE;

          entity.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
              if (child.material.emissiveIntensity > 0.1) {
                child.material.emissiveIntensity = pulseIntensity;
              }
            }
          });
        }
      }
    }

    // Update opponent grab highlight position
    if (this.opponentGrabHighlight.visible) {
      for (const entity of this._blocks.values()) {
        if (entity.isGrabbed && !this.myBlockIds.has(entity.data.id)) {
          this.opponentGrabHighlight.position.copy(entity.mesh.position);
          break;
        }
      }
    }
  }

  /**
   * Get a block entity by ID.
   */
  getBlock(blockId: string): BlockEntity | undefined {
    return this._blocks.get(blockId);
  }

  /**
   * Get all my block IDs.
   */
  getMyBlockIds(): Set<string> {
    return this.myBlockIds;
  }

  /**
   * Check if a block is mine.
   */
  isMyBlock(blockId: string): boolean {
    return this.myBlockIds.has(blockId);
  }

  /**
   * Find the nearest block to a point within a max distance.
   */
  findNearestBlock(
    point: THREE.Vector3,
    maxDistance: number,
    onlyMyBlocks: boolean = true
  ): BlockEntity | null {
    let nearest: BlockEntity | null = null;
    let nearestDist = maxDistance;

    for (const [blockId, entity] of this._blocks) {
      if (onlyMyBlocks && !this.myBlockIds.has(blockId)) continue;

      const dx = entity.mesh.position.x - point.x;
      const dy = entity.mesh.position.y - point.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = entity;
      }
    }

    return nearest;
  }

  /**
   * Remove all blocks belonging to a player.
   */
  removePlayerBlocks(ownerId: string): void {
    for (const [blockId, entity] of this._blocks) {
      if (entity.data.ownerId === ownerId) {
        this.removeBlock(blockId);
      }
    }
  }

  /**
   * Remove all projectiles belonging to a player.
   */
  removePlayerProjectiles(ownerId: string): void {
    for (const [projId, entity] of this._projectiles) {
      if (entity.data.ownerId === ownerId) {
        this.removeProjectile(projId);
      }
    }
  }

  /**
   * Clear all blocks and projectiles.
   */
  clear(): void {
    for (const blockId of [...this._blocks.keys()]) {
      this.removeBlock(blockId);
    }
    for (const projId of [...this._projectiles.keys()]) {
      this.removeProjectile(projId);
    }
    // Clear any remaining laser beams
    for (const cannonId of [...this.laserBeams.keys()]) {
      this.removeLaserBeam(cannonId);
    }
    this.myBlockIds.clear();
    this.playerId = null;
    this.playerNumber = null;
    this.roomBounds = null;
  }

  /**
   * Dispose of all resources.
   */
  dispose(): void {
    this.clear();
    this.scene.remove(this.reachableHighlight);
    this.scene.remove(this.grabbedHighlight);
    this.scene.remove(this.opponentGrabHighlight);
  }
}
