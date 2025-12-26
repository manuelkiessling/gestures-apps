/**
 * @fileoverview Tests for HandTracker configuration and state management.
 *
 * Note: Full integration testing with MediaPipe requires a browser environment.
 * These tests verify the configuration and state management logic without
 * requiring actual MediaPipe runtime.
 */

import { describe, expect, it } from 'vitest';
import { DEFAULT_MEDIAPIPE_CONFIG } from '../src/constants.js';

// We only test the configuration and state logic here.
// The HandTracker class itself requires MediaPipe which is not available in Node.

describe('HandTracker configuration', () => {
  describe('DEFAULT_MEDIAPIPE_CONFIG', () => {
    it('should have default max hands of 2', () => {
      expect(DEFAULT_MEDIAPIPE_CONFIG.MAX_HANDS).toBe(2);
    });

    it('should have default video dimensions', () => {
      expect(DEFAULT_MEDIAPIPE_CONFIG.VIDEO_WIDTH).toBe(640);
      expect(DEFAULT_MEDIAPIPE_CONFIG.VIDEO_HEIGHT).toBe(480);
    });

    it('should have confidence thresholds', () => {
      expect(DEFAULT_MEDIAPIPE_CONFIG.MIN_DETECTION_CONFIDENCE).toBe(0.7);
      expect(DEFAULT_MEDIAPIPE_CONFIG.MIN_TRACKING_CONFIDENCE).toBe(0.5);
    });

    it('should have model complexity setting', () => {
      expect(DEFAULT_MEDIAPIPE_CONFIG.MODEL_COMPLEXITY).toBe(1);
    });

    it('should have hands path for asset loading', () => {
      expect(DEFAULT_MEDIAPIPE_CONFIG.HANDS_PATH).toBe('./mediapipe/hands/');
    });
  });
});

// Note: The HandTracker class requires DOM and MediaPipe which are not available
// in the Node.js test environment. Full testing of HandTracker is done through:
// 1. The application-level tests that use the actual browser environment
// 2. Manual testing with real camera input
//
// The gesture utilities (isPinching, isHandRaised, etc.) are fully tested
// in gestures.test.ts since they are pure functions that don't require MediaPipe.
