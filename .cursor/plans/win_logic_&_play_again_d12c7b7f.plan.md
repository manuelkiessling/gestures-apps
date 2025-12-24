---
name: Win Logic & Play Again
overview: Add win condition detection when a player loses all their regular blocks (5 per player, cannons excluded), broadcast game over with winner, and implement a "play again" voting system that resets the game without creating a new session.
todos:
  - id: protocol-game-over
    content: Add game_over, play_again_vote, play_again_status, game_reset protocol messages and 'finished' phase
    status: pending
  - id: game-state-win
    content: Add win detection methods and resetForNewRound() to GameState, add wantsPlayAgain to Player
    status: pending
  - id: game-manager-win
    content: Add win detection in tick(), handle play again voting, implement game reset flow
    status: pending
  - id: protocol-handlers-vote
    content: Add handlePlayAgainVote handler
    status: pending
  - id: client-game-over
    content: Add game over overlay UI with Play Again button, handle game_over/game_reset events
    status: pending
  - id: bot-game-over
    content: Update BotClient to handle game_over (stop + auto-vote) and game_reset (reset state)
    status: pending
---

# Win Condition & Play Again Feature

## Overview

Detect when a player loses all 5 regular blocks (cannons are indestructible), declare a winner, and allow both players to vote for a rematch within the same session.

## Game Flow

```mermaid
stateDiagram-v2
    [*] --> Waiting
    Waiting --> Playing: All humans ready
    Playing --> Finished: Player loses all blocks
    Finished --> Waiting: Both vote play again
    Finished --> [*]: Player disconnects
```



## Changes

### 1. Protocol Messages ([packages/shared/src/protocol/index.ts](packages/shared/src/protocol/index.ts))

Add new messages:

- **Server → Client**: `game_over` with `winnerId`, `winnerNumber`, `reason` ("blocks_destroyed")
- **Client → Server**: `play_again_vote` - player votes to play again
- **Server → Client**: `play_again_status` with vote counts or "waiting for opponent"
- **Server → Client**: `game_reset` - new round starting, includes fresh block positions

Extend `GamePhaseSchema` to include `'finished'`.

### 2. Game State ([packages/server/src/game/GameState.ts](packages/server/src/game/GameState.ts))

Add methods:

- `getRegularBlockCountForPlayer(playerId)` - count non-cannon blocks
- `checkForWinner()` - returns winnerId if opponent has 0 regular blocks
- `resetForNewRound()` - clears blocks/projectiles, creates fresh blocks for existing players

Add to Player type:

- `wantsPlayAgain?: boolean` - track play again vote

### 3. Game Manager ([packages/server/src/game/GameManager.ts](packages/server/src/game/GameManager.ts))

After processing block destruction in `tick()`:

- Call `checkForWinner()` 
- If winner found: transition to `'finished'` phase, broadcast `game_over`
- Stop game loop processing (but keep connections alive)

Add handlers:

- `handlePlayAgainVote()` - mark player's vote, check if both agreed
- When both agree (bot auto-agrees): call `resetForNewRound()`, broadcast `game_reset`, transition back to `'waiting'`

### 4. Protocol Handlers ([packages/server/src/protocol/handlers.ts](packages/server/src/protocol/handlers.ts))

Add `handlePlayAgainVote` handler.

### 5. Human Client

**GameClient** ([packages/client/src/network/GameClient.ts](packages/client/src/network/GameClient.ts)):

- Add `onGameOver`, `onPlayAgainStatus`, `onGameReset` event handlers
- Add `sendPlayAgainVote()` method

**Main** ([packages/client/src/main.ts](packages/client/src/main.ts)):

- Handle `game_over`: show win/lose overlay with "Play Again" button
- Handle `play_again_status`: show waiting state
- Handle `game_reset`: clear scene, recreate blocks, transition to waiting phase (show hand raise overlay again)

**UI** ([packages/client/src/styles.css](packages/client/src/styles.css), [packages/client/index.html](packages/client/index.html)):

- Add game over overlay with winner announcement and "Play Again" button

### 6. Bot Client ([packages/server/src/bot/BotClient.ts](packages/server/src/bot/BotClient.ts))

- Handle `game_over`: stop behavior loop
- Handle `game_over`: immediately send `play_again_vote` (bot always agrees)
- Handle `game_reset`: reset internal state, wait for `game_started` to resume

## Key Details

- **Win condition**: Player wins when opponent has 0 regular blocks remaining (out of 5)
- **Cannons don't count**: They're indestructible, so excluded from win check
- **Play again voting**: Both players must vote; bots auto-vote yes