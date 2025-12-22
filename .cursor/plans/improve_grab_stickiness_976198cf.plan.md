---
name: Improve Grab Stickiness
overview: ""
todos:
  - id: add-constant
    content: Add GRAB_RELEASE_GRACE_MS constant to constants.ts
    status: completed
  - id: implement-grace-period
    content: Implement release grace period in InteractionManager
    status: completed
    dependencies:
      - add-constant
  - id: setup-client-tests
    content: Set up Vitest testing infrastructure in client package
    status: completed
  - id: write-interaction-tests
    content: Write comprehensive InteractionManager tests
    status: completed
    dependencies:
      - implement-grace-period
      - setup-client-tests
---

# Improve Block Grab Stickiness

## Overview

Add hysteresis to the grab/release logic in `InteractionManager` to prevent blocks from being accidentally released during fast movements or momentary tracking lapses.

## Current Behavior

- Block is immediately released when `isPinching` becomes `false`
- New nearest block is found and can be grabbed on next frame
- No tolerance for momentary gesture detection failures

## Solution: Add Release Grace Period

Modify [`packages/client/src/game/InteractionManager.ts`](packages/client/src/game/InteractionManager.ts) to implement a grace period mechanism:

### Key Changes

1. **Add release grace period state**:

- Track `releaseGraceStart` timestamp when pinch first fails while holding a block
- Add configurable `GRAB_RELEASE_GRACE_MS` constant (e.g., 150-200ms)

2. **Modify release logic**:

- When `isPinching` becomes `false` while holding a block, start the grace timer instead of immediately releasing
- During grace period: keep block grabbed, continue following pinch point
- If `isPinching` becomes `true` again within grace period: cancel pending release
- Only release after grace period expires without valid pinch

3. **Prevent block jumping**:

- Skip `updateHighlight` during the grace period (block is still conceptually grabbed)
- This prevents finding and grabbing a different block

### Implementation Details

```typescript
// New constants in constants.ts
export const GRAB_RELEASE_GRACE_MS = 150;

// New state in InteractionManager
private releaseGraceStart: number | null = null;

// Modified processInteraction logic
if (isPinching) {
  // Cancel any pending release
  this.releaseGraceStart = null;
  // ... existing grab/move logic
} else {
  if (this.grabbedBlock) {
    if (this.releaseGraceStart === null) {
      // Start grace period
      this.releaseGraceStart = Date.now();
    } else if (Date.now() - this.releaseGraceStart > GRAB_RELEASE_GRACE_MS) {
      // Grace period expired - actually release
      this.releaseCurrentBlock();
      this.releaseGraceStart = null;
    }
    // During grace: keep block, continue moving to last known pinch point
  }
}
```



### Files to Modify

- [`packages/client/src/game/InteractionManager.ts`](packages/client/src/game/InteractionManager.ts) - Add grace period logic
- [`packages/client/src/constants.ts`](packages/client/src/constants.ts) - Add `GRAB_RELEASE_GRACE_MS` constant

---

## Testing

### Test Infrastructure Setup

The client package currently has no tests. We'll add Vitest (matching the server setup):

1. **Add dev dependencies** to `packages/client/package.json`:

- `vitest` (test runner)

2. **Create `packages/client/vitest.config.ts`** (similar to server)
3. **Add test scripts** to package.json: `test`, `test:watch`

### Test Strategy

The `InteractionManager` depends on `BlockRenderer` and `GameClient`. We'll create lightweight mocks that track method calls. Key approach:

- Mock `BlockRenderer.findNearestBlock()` to return controlled test blocks
- Mock `GameClient.sendBlockGrab/Move/Release()` to verify network calls
- Use fake timers (`vi.useFakeTimers()`) to control `Date.now()` for grace period tests

### Test Cases for `InteractionManager`

**File: `packages/client/tests/InteractionManager.test.ts`**

#### Basic Grab/Release (existing behavior preserved)

- Should grab block when pinching near a reachable block
- Should release block when pinch ends (after grace period)
- Should not grab when no block in reach
- Should move grabbed block to follow pinch point

#### Grace Period - Core Stickiness

- Should NOT release block immediately when pinch briefly fails
- Should keep block grabbed during grace period
- Should release block only after grace period expires
- Should cancel pending release if pinch resumes within grace period

#### Grace Period - Block Jumping Prevention

- Should NOT update highlight or find new blocks during grace period
- Should NOT switch to different block during grace period
- Should continue moving current block during grace period

#### Edge Cases

- Should release immediately when hand is lost (no pinch point)
- Should handle multiple quick pinch on/off cycles
- Should reset grace timer if pinch resumes then fails again
- Should clear grace state on `clear()` call

### Mock Structure

```typescript
// Minimal mock for BlockRenderer
const mockBlockRenderer = {
  findNearestBlock: vi.fn(),
  showReachableHighlight: vi.fn(),
  hideReachableHighlight: vi.fn(),
  showGrabbedHighlight: vi.fn(),
  hideGrabbedHighlight: vi.fn(),
};

// Minimal mock for GameClient
const mockGameClient = {
  sendBlockGrab: vi.fn(),
  sendBlockMove: vi.fn(),
  sendBlockRelease: vi.fn(),
};

// Test block entity factory
function createTestBlock(id: string): BlockEntity {
  return {
    mesh: { position: { x: 0, y: 0 } } as THREE.Mesh,
    data: { id, ownerId: 'player-1' } as Block,
    baseY: 0,
    phase: 0,
    isGrabbed: false,
  };
}

```