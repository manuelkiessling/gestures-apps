/**
 * @fileoverview Hello Hands standalone WebSocket server.
 *
 * A minimal server that can be run directly to host hello-hands sessions.
 * Uses the framework's built-in inactivity monitoring for automatic
 * container cleanup when idle.
 */

import { createAppServer } from '@gesture-app/framework-server';
import { WebSocketServer } from 'ws';
import type {
  ClientMessage,
  HelloHandsResetData,
  HelloHandsWelcomeData,
  ServerMessage,
} from '../shared/protocol.js';
import { createHelloHandsConfig, HelloHandsHooks, parseMessage } from './HelloHandsSession.js';

const logger = {
  info: (msg: string, data?: object) => console.log(`[HelloHands] ${msg}`, data ?? ''),
  error: (msg: string, data?: object) => console.error(`[HelloHands] ${msg}`, data ?? ''),
  debug: (msg: string, data?: object) => console.log(`[HelloHands] DEBUG: ${msg}`, data ?? ''),
};

logger.info('Starting server...');

// Create the session runtime with built-in inactivity monitoring
const hooks = new HelloHandsHooks();
const config = createHelloHandsConfig();

createAppServer<ClientMessage, ServerMessage, HelloHandsWelcomeData, HelloHandsResetData>(
  {
    port: 8080, // Default port for hello-hands
    runtimeConfig: config,
    hooks,
    parser: parseMessage,
    logger,
    // Inactivity monitoring with hand_update messages ignored
    // (continuous hand tracking shouldn't reset the activity timer)
    inactivity: {
      ignoreMessageTypes: [],
    },
  },
  WebSocketServer
);
