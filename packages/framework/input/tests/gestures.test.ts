/**
 * @fileoverview Tests for gesture detection utilities.
 *
 * These tests verify the core gesture detection logic that is reused
 * across all gesture apps.
 */

import { describe, expect, it } from 'vitest';
import { GESTURE_THRESHOLDS, LANDMARKS } from '../src/constants.js';
import {
  extractLandmarks2D,
  getPalmCenter,
  getPinchPoint,
  isHandRaised,
  isPinching,
} from '../src/gestures.js';
import type { HandLandmarks } from '../src/types.js';

/**
 * Create hand landmarks at a specific normalized position.
 * All landmarks are placed at the same position for simplicity.
 */
function createLandmarksAt(x: number, y: number, z = 0): HandLandmarks {
  return Array(21)
    .fill(null)
    .map(() => ({ x, y, z }));
}

/**
 * Create landmarks with specific thumb and index positions for pinch testing.
 */
function createLandmarksWithPinch(
  thumbX: number,
  thumbY: number,
  indexX: number,
  indexY: number
): HandLandmarks {
  const landmarks = createLandmarksAt(0.5, 0.5, 0);
  // Create mutable copy and set thumb/index tips
  const mutableLandmarks = [...landmarks];
  mutableLandmarks[LANDMARKS.THUMB_TIP] = { x: thumbX, y: thumbY, z: 0 };
  mutableLandmarks[LANDMARKS.INDEX_TIP] = { x: indexX, y: indexY, z: 0 };
  return mutableLandmarks;
}

describe('isPinching', () => {
  it('should detect pinch when thumb and index are close together', () => {
    const landmarks = createLandmarksWithPinch(0.5, 0.5, 0.505, 0.505);

    expect(isPinching(landmarks)).toBe(true);
  });

  it('should NOT detect pinch when thumb and index are far apart', () => {
    const landmarks = createLandmarksWithPinch(0.3, 0.3, 0.7, 0.7);

    expect(isPinching(landmarks)).toBe(false);
  });

  it('should NOT detect pinch at exactly the threshold distance', () => {
    // Distance >= threshold should NOT be a pinch (< threshold required)
    // Use a distance slightly above threshold to avoid floating point issues
    const threshold = GESTURE_THRESHOLDS.PINCH;
    const landmarks = createLandmarksWithPinch(0.5, 0.5, 0.5 + threshold + 0.001, 0.5);

    expect(isPinching(landmarks)).toBe(false);
  });

  it('should detect pinch just under the threshold', () => {
    const threshold = GESTURE_THRESHOLDS.PINCH;
    const landmarks = createLandmarksWithPinch(0.5, 0.5, 0.5 + threshold - 0.01, 0.5);

    expect(isPinching(landmarks)).toBe(true);
  });

  it('should use custom threshold when provided', () => {
    // Distance ~0.14 with default threshold 0.08 would not be a pinch
    const landmarks = createLandmarksWithPinch(0.5, 0.5, 0.6, 0.6);

    expect(isPinching(landmarks, 0.08)).toBe(false);
    expect(isPinching(landmarks, 0.2)).toBe(true); // Larger threshold
  });

  it('should return false if landmarks are invalid', () => {
    const emptyLandmarks: HandLandmarks = [];
    expect(isPinching(emptyLandmarks)).toBe(false);
  });
});

describe('isHandRaised', () => {
  it('should return true when wrist is above threshold (top of frame)', () => {
    const landmarks = createLandmarksAt(0.5, 0.2, 0); // y=0.2 is near top
    expect(isHandRaised(landmarks)).toBe(true);
  });

  it('should return false when wrist is below threshold', () => {
    const landmarks = createLandmarksAt(0.5, 0.6, 0); // y=0.6 is below default 0.4
    expect(isHandRaised(landmarks)).toBe(false);
  });

  it('should return false when wrist is exactly at threshold', () => {
    const threshold = GESTURE_THRESHOLDS.RAISED_HAND;
    const landmarks = createLandmarksAt(0.5, threshold, 0);
    expect(isHandRaised(landmarks)).toBe(false);
  });

  it('should return true when wrist is just above threshold', () => {
    const threshold = GESTURE_THRESHOLDS.RAISED_HAND;
    const landmarks = createLandmarksAt(0.5, threshold - 0.01, 0);
    expect(isHandRaised(landmarks)).toBe(true);
  });

  it('should use custom threshold when provided', () => {
    const landmarks = createLandmarksAt(0.5, 0.5, 0);

    expect(isHandRaised(landmarks, 0.4)).toBe(false); // 0.5 > 0.4
    expect(isHandRaised(landmarks, 0.6)).toBe(true); // 0.5 < 0.6
  });

  it('should return false if landmarks are invalid', () => {
    const emptyLandmarks: HandLandmarks = [];
    expect(isHandRaised(emptyLandmarks)).toBe(false);
  });
});

describe('getPalmCenter', () => {
  it('should return average of wrist, index tip, and middle tip', () => {
    const landmarks = createLandmarksAt(0.5, 0.5, 0);
    const mutableLandmarks = [...landmarks];
    mutableLandmarks[LANDMARKS.WRIST] = { x: 0.3, y: 0.6, z: 0 };
    mutableLandmarks[LANDMARKS.INDEX_TIP] = { x: 0.5, y: 0.4, z: 0 };
    mutableLandmarks[LANDMARKS.MIDDLE_TIP] = { x: 0.4, y: 0.5, z: 0 };

    const center = getPalmCenter(mutableLandmarks);

    expect(center).not.toBeNull();
    expect(center?.x).toBeCloseTo(0.4, 5); // (0.3 + 0.5 + 0.4) / 3
    expect(center?.y).toBeCloseTo(0.5, 5); // (0.6 + 0.4 + 0.5) / 3
  });

  it('should return null if landmarks are invalid', () => {
    const emptyLandmarks: HandLandmarks = [];
    expect(getPalmCenter(emptyLandmarks)).toBeNull();
  });
});

describe('getPinchPoint', () => {
  it('should return midpoint between thumb and index tips', () => {
    const landmarks = createLandmarksWithPinch(0.4, 0.3, 0.6, 0.5);

    const point = getPinchPoint(landmarks);

    expect(point).not.toBeNull();
    expect(point?.x).toBeCloseTo(0.5, 5); // (0.4 + 0.6) / 2
    expect(point?.y).toBeCloseTo(0.4, 5); // (0.3 + 0.5) / 2
  });

  it('should include z coordinate', () => {
    const landmarks = createLandmarksAt(0.5, 0.5, 0);
    const mutableLandmarks = [...landmarks];
    mutableLandmarks[LANDMARKS.THUMB_TIP] = { x: 0.5, y: 0.5, z: 0.2 };
    mutableLandmarks[LANDMARKS.INDEX_TIP] = { x: 0.5, y: 0.5, z: 0.4 };

    const point = getPinchPoint(mutableLandmarks);

    expect(point?.z).toBeCloseTo(0.3, 5); // (0.2 + 0.4) / 2
  });

  it('should return null if landmarks are invalid', () => {
    const emptyLandmarks: HandLandmarks = [];
    expect(getPinchPoint(emptyLandmarks)).toBeNull();
  });
});

describe('extractLandmarks2D', () => {
  it('should extract x and y from 3D landmarks', () => {
    const landmarks = createLandmarksAt(0.5, 0.6, 0.7);

    const landmarks2D = extractLandmarks2D(landmarks);

    expect(landmarks2D).toHaveLength(21);
    expect(landmarks2D[0]).toEqual({ x: 0.5, y: 0.6 });
    // Should not have z property
    expect('z' in (landmarks2D[0] ?? {})).toBe(false);
  });
});
