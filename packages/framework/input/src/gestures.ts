/**
 * @fileoverview Gesture detection utilities.
 */

import { GESTURE_THRESHOLDS, LANDMARKS } from './constants.js';
import type { HandLandmarks, Point2D, Point3D } from './types.js';

/**
 * Check if a hand is performing a pinch gesture.
 * A pinch is detected when thumb tip and index tip are close together.
 *
 * @param landmarks - Array of 21 hand landmarks
 * @param threshold - Distance threshold (default: 0.08 in normalized units)
 * @returns True if pinching
 */
export function isPinching(
  landmarks: HandLandmarks,
  threshold: number = GESTURE_THRESHOLDS.PINCH
): boolean {
  const thumb = landmarks[LANDMARKS.THUMB_TIP];
  const index = landmarks[LANDMARKS.INDEX_TIP];

  if (!thumb || !index) return false;

  const dist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
  return dist < threshold;
}

/**
 * Check if a hand is raised (above a Y-position threshold).
 * Uses the wrist position as reference.
 *
 * @param landmarks - Array of 21 hand landmarks
 * @param threshold - Y-position threshold (0 = top, 1 = bottom, default: 0.4)
 * @returns True if hand is raised
 */
export function isHandRaised(
  landmarks: HandLandmarks,
  threshold: number = GESTURE_THRESHOLDS.RAISED_HAND
): boolean {
  const wrist = landmarks[LANDMARKS.WRIST];
  if (!wrist) return false;

  // Lower Y value = higher in frame (0 at top)
  return wrist.y < threshold;
}

/**
 * Get the center point of the palm.
 * Calculated as the average of wrist, index tip, and middle tip.
 *
 * @param landmarks - Array of 21 hand landmarks
 * @returns Palm center position, or null if landmarks are invalid
 */
export function getPalmCenter(landmarks: HandLandmarks): Point2D | null {
  const wrist = landmarks[LANDMARKS.WRIST];
  const indexTip = landmarks[LANDMARKS.INDEX_TIP];
  const middleTip = landmarks[LANDMARKS.MIDDLE_TIP];

  if (!wrist || !indexTip || !middleTip) return null;

  return {
    x: (wrist.x + indexTip.x + middleTip.x) / 3,
    y: (wrist.y + indexTip.y + middleTip.y) / 3,
  };
}

/**
 * Get the pinch point (midpoint between thumb and index finger tips).
 *
 * @param landmarks - Array of 21 hand landmarks
 * @returns Pinch point position, or null if landmarks are invalid
 */
export function getPinchPoint(landmarks: HandLandmarks): Point3D | null {
  const thumb = landmarks[LANDMARKS.THUMB_TIP];
  const index = landmarks[LANDMARKS.INDEX_TIP];

  if (!thumb || !index) return null;

  return {
    x: (thumb.x + index.x) / 2,
    y: (thumb.y + index.y) / 2,
    z: (thumb.z + index.z) / 2,
  };
}

/**
 * Extract 2D landmarks from 3D landmarks (drops z coordinate).
 *
 * @param landmarks - Array of 21 3D hand landmarks
 * @returns Array of 21 2D points
 */
export function extractLandmarks2D(landmarks: HandLandmarks): Point2D[] {
  return landmarks.map((lm) => ({ x: lm.x, y: lm.y }));
}
