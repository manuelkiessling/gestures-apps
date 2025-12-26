/**
 * @fileoverview Tests for hand landmark constants.
 */

import { describe, expect, it } from 'vitest';
import { HAND_CONNECTIONS, LANDMARKS } from '../src/constants.js';

describe('LANDMARKS', () => {
  it('should have 21 landmark indices (0-20)', () => {
    expect(LANDMARKS.WRIST).toBe(0);
    expect(LANDMARKS.PINKY_TIP).toBe(20);
    expect(LANDMARKS.COUNT).toBe(21);
  });

  it('should have all fingertip indices', () => {
    expect(LANDMARKS.THUMB_TIP).toBe(4);
    expect(LANDMARKS.INDEX_TIP).toBe(8);
    expect(LANDMARKS.MIDDLE_TIP).toBe(12);
    expect(LANDMARKS.RING_TIP).toBe(16);
    expect(LANDMARKS.PINKY_TIP).toBe(20);
  });

  it('should have all finger base (MCP) indices', () => {
    expect(LANDMARKS.THUMB_CMC).toBe(1);
    expect(LANDMARKS.INDEX_MCP).toBe(5);
    expect(LANDMARKS.MIDDLE_MCP).toBe(9);
    expect(LANDMARKS.RING_MCP).toBe(13);
    expect(LANDMARKS.PINKY_MCP).toBe(17);
  });
});

describe('HAND_CONNECTIONS', () => {
  it('should have connections for skeleton drawing', () => {
    // Total connections: 6 palm + 4 thumb + 3*4 fingers = 21
    expect(HAND_CONNECTIONS.length).toBe(21);
  });

  it('should have palm connections', () => {
    // Palm forms hexagon: wrist-thumb, wrist-index, wrist-pinky, index-middle, etc.
    expect(HAND_CONNECTIONS).toContainEqual([0, 1]); // Wrist to thumb CMC
    expect(HAND_CONNECTIONS).toContainEqual([0, 5]); // Wrist to index MCP
    expect(HAND_CONNECTIONS).toContainEqual([0, 17]); // Wrist to pinky MCP
  });

  it('should have finger connections from base to tip', () => {
    // Index finger: 5->6->7->8
    expect(HAND_CONNECTIONS).toContainEqual([5, 6]);
    expect(HAND_CONNECTIONS).toContainEqual([6, 7]);
    expect(HAND_CONNECTIONS).toContainEqual([7, 8]);
  });

  it('should only reference valid landmark indices (0-20)', () => {
    for (const [from, to] of HAND_CONNECTIONS) {
      expect(from).toBeGreaterThanOrEqual(0);
      expect(from).toBeLessThan(21);
      expect(to).toBeGreaterThanOrEqual(0);
      expect(to).toBeLessThan(21);
    }
  });
});
