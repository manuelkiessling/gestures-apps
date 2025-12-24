---
name: Visual Polish Improvements
overview: Enhance the game's visual appeal by fixing block spawn overlaps, improving the aiming beam with a crosshair, making cannons visually distinct from regular blocks, and upgrading the overall scene aesthetics.
todos:
  - id: spawn-overlap
    content: Add collision detection to block spawning in GameState.ts
    status: completed
  - id: block-colors
    content: Update BLOCK_COLORS to exclude red/pink hues in constants.ts
    status: completed
  - id: cannon-visuals
    content: Redesign cannon appearance with distinct geometry and glow effects
    status: completed
  - id: aiming-beam
    content: Improve laser beam thickness and add crosshair at endpoint
    status: completed
  - id: scene-enhance
    content: Enhance starfield, nebulae, and room visuals
    status: completed
---

# Visual Polish Improvements

## 1. Prevent Block Spawn Overlapping

**Problem**: In [`packages/server/src/game/GameState.ts`](packages/server/src/game/GameState.ts), the `createPlayerBlocks()` method spawns blocks at random positions without checking if they overlap.**Solution**: Add collision checking during spawn to ensure minimum separation between blocks:

- Create a helper function that generates valid spawn positions
- Check new positions against existing blocks using the existing `blocksCollide()` from [`CollisionSystem.ts`](packages/server/src/game/CollisionSystem.ts)
- Retry with new random positions if overlap is detected (with max attempts to prevent infinite loops)

---

## 2. Improve Aiming Beam with Crosshair

**Problem**: The current laser beam in [`packages/client/src/scene/BlockRenderer.ts`](packages/client/src/scene/BlockRenderer.ts) is a thin dashed line that looks cheap.**Solution**:

- Replace `LineDashedMaterial` with a custom shader or thicker solid line using `LineBasicMaterial` with `linewidth`
- Add a crosshair sprite/mesh at the beam endpoint (where it hits the wall)
- The crosshair could be a simple circle with crosshairs or a targeting reticle
- Add subtle glow effect using additive blending

---

## 3. Make Cannons Visually Distinct

**Problem**:

- Cannon color (`0xff3366` - red-pink) is similar to regular block colors
- Regular block colors include pink (`0xec4899`) which is too close to cannon red
- Cannon shape (0.8x0.8x1.5 box) doesn't stand out enough

**Solution**:

- Change cannon appearance: different geometry (perhaps octagonal/cylindrical barrel shape), or add distinctive features like a glowing barrel
- Update `BLOCK_COLORS` in [`packages/shared/src/constants.ts`](packages/shared/src/constants.ts) to exclude red/pink hues
- Add emissive glow and pulsing animation to cannons
- Consider adding a muzzle/barrel detail to the cannon

---

## 4. Enhance Scene/Universe Aesthetics

**Problem**: The game universe looks boring despite having starfield and nebulae.**Solution**: Enhance [`packages/client/src/scene/SceneManager.ts`](packages/client/src/scene/SceneManager.ts) and related files:

- **Room wireframe**: Add animated glow pulses, corner markers, or energy field effect
- **Floor grid**: Make it more dynamic with animated scan lines or energy grid effect
- **Nebulae**: Increase count, improve colors and opacity
- **Blocks**: Add subtle particle trails or energy field around them
- **Lighting**: Adjust to create more dramatic atmosphere

---

## Files to Modify

| File | Changes ||------|---------|| `packages/server/src/game/GameState.ts` | Add spawn collision checking || `packages/shared/src/constants.ts` | Update block colors (remove red/pink) || `packages/client/src/scene/BlockRenderer.ts` | Improve laser beam, add crosshair || `packages/client/src/scene/SceneManager.ts` | Enhance starfield/nebulae || `packages/client/src/scene/RoomRenderer.ts` | Improve wireframe visuals || `packages/client/src/constants.ts` | Add new visual constants |---

## Testing Strategy

- Run existing tests after each change to ensure nothing breaks
- Server tests: `npm run test -w packages/server`