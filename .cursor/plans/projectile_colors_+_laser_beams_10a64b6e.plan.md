---
name: Projectile Colors + Laser Beams
overview: Implement player-specific projectile colors (yellow for own, red for opponent) and add laser beam indicators from cannons to back walls.
todos:
  - id: projectile-colors
    content: Add player-specific projectile colors (yellow=own, red=opponent) in BlockRenderer
    status: completed
  - id: laser-beams
    content: Add laser beam indicators from cannons to back walls
    status: completed
    dependencies:
      - projectile-colors
---

# Improve Game Visuals: Projectile Colors and Cannon Laser Beams

## Feature 1: Player-Specific Projectile Colors

The color distinction should be viewer-relative (yellow = mine, red = opponent), making it a client-side rendering concern.**Approach**: Modify [`BlockRenderer.createProjectile()`](packages/client/src/scene/BlockRenderer.ts) to accept the current player ID and override the server-provided color based on ownership:

- **Yellow** (`0xffff00`) for projectiles where `ownerId === playerId`
- **Danger red** (`0xff4444`) for projectiles where `ownerId !== playerId`

Since `BlockRenderer` already has `playerId` set via `setPlayer()`, the change is straightforward:

```typescript
createProjectile(projectileData: Projectile, projectileSize: number = 0.3): ProjectileEntity {
  const isMyProjectile = projectileData.ownerId === this.playerId;
  const color = isMyProjectile ? 0xffff00 : 0xff4444; // yellow vs danger-red
  // ... use color instead of projectileData.color
}
```

Add new constants to [`packages/client/src/constants.ts`](packages/client/src/constants.ts):

```typescript
export const PROJECTILE_COLORS = {
  OWN: 0xffff00,      // Yellow - my projectiles
  OPPONENT: 0xff4444, // Danger red - opponent projectiles
} as const;
```

---

## Feature 2: Cannon Laser Beam Indicators

**Approach**: Create laser beams as `THREE.Line` objects that extend from each cannon along the Z-axis to the room's back wall.**Where to implement**: Add laser beam management to [`BlockRenderer`](packages/client/src/scene/BlockRenderer.ts), since it already manages cannon blocks and has access to block positions.**Key details**:

- Store `roomBounds` in `BlockRenderer` (passed via new `setRoom()` method or alongside `setPlayer()`)
- Create a `Map<string, THREE.Line>` to track laser beam lines per cannon ID
- When a cannon block is created/updated, create/update its laser beam
- Laser endpoints:
- Player 1 cannons (at maxZ side) point toward `minZ`
- Player 2 cannons (at minZ side) point toward `maxZ`
- Use `playerNumber` to determine direction (same logic as cannon rotation)

**Visual style**:

- Subtle dashed or solid line
- Low opacity (~0.3-0.4) with a glow color (cyan or the cannon's emissive color)
- Start at cannon center, end at back wall Z position (same X/Y as cannon)

**Implementation in `BlockRenderer`**:

```typescript
private laserBeams: Map<string, THREE.Line> = new Map();
private roomBounds: RoomBounds | null = null;

setRoom(room: RoomBounds): void {
  this.roomBounds = room;
}

// In createBlock() for cannons:
if (isCannon && this.roomBounds && this.playerNumber) {
  this.createLaserBeam(blockData.id, mesh.position);
}

private createLaserBeam(cannonId: string, position: THREE.Vector3): void {
  // Calculate end Z based on fire direction
  const targetZ = this.playerNumber === 1 ? this.roomBounds.minZ : this.roomBounds.maxZ;
  const points = [
    new THREE.Vector3(position.x, position.y, position.z),
    new THREE.Vector3(position.x, position.y, targetZ)
  ];
  // Create dashed line with subtle glow
}
```

---

## Files to Modify

1. **[`packages/client/src/constants.ts`](packages/client/src/constants.ts)** - Add `PROJECTILE_COLORS` and `LASER_BEAM` constants
2. **[`packages/client/src/scene/BlockRenderer.ts`](packages/client/src/scene/BlockRenderer.ts)** - Main implementation:

- Add `roomBounds` field and `setRoom()` method
- Modify `createProjectile()` for player-specific colors
- Add laser beam creation/update/removal logic for cannons