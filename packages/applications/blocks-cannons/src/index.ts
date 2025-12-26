/**
 * @fileoverview Blocks & Cannons application.
 *
 * This is a two-player competitive hand-gesture game where players:
 * - Control blocks using hand gestures (pinch to grab, move, release)
 * - Position blocks strategically to protect their side
 * - Fire projectiles from cannons to destroy opponent blocks
 * - Win by destroying all opponent blocks
 *
 * This package will contain the app-specific logic that plugs into
 * the framework runtime. For now it's a placeholder that will be
 * populated as we migrate code from packages/server and packages/client.
 */

/**
 * Application identifier.
 */
export const APP_ID = 'blocks-cannons';

/**
 * Application display name.
 */
export const APP_NAME = 'Blocks & Cannons';

/**
 * Application version.
 */
export const APP_VERSION = '1.0.0';

/**
 * Application manifest (placeholder for future registry integration).
 */
export const APP_MANIFEST = {
  id: APP_ID,
  name: APP_NAME,
  version: APP_VERSION,
  description: 'A two-player competitive hand-gesture game',
} as const;
