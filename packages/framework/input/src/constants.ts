/**
 * @fileoverview Hand landmark constants and connections for visualization.
 */

/**
 * Hand landmark indices matching MediaPipe's 21-point hand model.
 * @see https://google.github.io/mediapipe/solutions/hands.html
 */
export const LANDMARKS = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
  /** Total number of landmarks */
  COUNT: 21,
} as const;

/**
 * Connections between landmarks for drawing the hand skeleton.
 * Each tuple is [fromIndex, toIndex].
 */
export const HAND_CONNECTIONS: readonly (readonly [number, number])[] = [
  // Palm
  [0, 1],
  [0, 5],
  [0, 17],
  [5, 9],
  [9, 13],
  [13, 17],
  // Thumb
  [1, 2],
  [2, 3],
  [3, 4],
  // Index finger
  [5, 6],
  [6, 7],
  [7, 8],
  // Middle finger
  [9, 10],
  [10, 11],
  [11, 12],
  // Ring finger
  [13, 14],
  [14, 15],
  [15, 16],
  // Pinky finger
  [17, 18],
  [18, 19],
  [19, 20],
] as const;

/**
 * Default thresholds for gesture detection.
 */
export const GESTURE_THRESHOLDS = {
  /** Distance threshold for pinch detection (normalized units) */
  PINCH: 0.08,
  /** Y-position threshold for raised hand detection (0 = top of frame) */
  RAISED_HAND: 0.4,
} as const;

/**
 * Default MediaPipe configuration.
 */
export const DEFAULT_MEDIAPIPE_CONFIG = {
  MAX_HANDS: 2,
  MODEL_COMPLEXITY: 1,
  MIN_DETECTION_CONFIDENCE: 0.7,
  MIN_TRACKING_CONFIDENCE: 0.5,
  VIDEO_WIDTH: 640,
  VIDEO_HEIGHT: 480,
  HANDS_PATH: './mediapipe/hands/',
} as const;
