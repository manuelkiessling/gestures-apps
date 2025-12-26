/**
 * @fileoverview Types for hand tracking and gesture detection.
 */

/**
 * A single 2D point with normalized coordinates (0-1 range).
 */
export interface Point2D {
  readonly x: number;
  readonly y: number;
}

/**
 * A single 3D point with normalized coordinates.
 */
export interface Point3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * Hand landmarks - array of 21 3D points from MediaPipe.
 */
export type HandLandmarks = readonly Point3D[];

/**
 * Handedness (left or right hand).
 */
export type Handedness = 'Left' | 'Right';

/**
 * A tracked hand with its landmarks and metadata.
 */
export interface TrackedHand {
  /** All 21 hand landmarks (normalized 0-1 coordinates) */
  readonly landmarks: HandLandmarks;
  /** Whether this is the left or right hand */
  readonly handedness: Handedness;
  /** Detection confidence score (0-1) */
  readonly score: number;
}

/**
 * Hand state with extracted gesture information.
 * Simplified representation for applications.
 */
export interface HandState {
  /** Normalized position (0-1 range, center of palm) */
  readonly position: Point2D;
  /** All 21 hand landmarks (normalized 0-1 coordinates) */
  readonly landmarks: Point2D[];
  /** Whether thumb and index are pinched together */
  readonly isPinching: boolean;
  /** Whether hand is raised above threshold */
  readonly isRaised: boolean;
}

/**
 * Result of multi-hand detection.
 */
export type MultiHandResult = readonly TrackedHand[];

/**
 * Callback for single-hand tracking updates.
 * Receives HandState when hand is detected, null when no hand is visible.
 */
export type HandCallback = (hand: HandState | null) => void;

/**
 * Callback for multi-hand tracking updates.
 * Receives array of tracked hands (empty array if no hands detected).
 */
export type MultiHandCallback = (hands: MultiHandResult) => void;

/**
 * Configuration options for the hand tracker.
 */
export interface HandTrackerConfig {
  /** Maximum number of hands to track (1 or 2) */
  readonly maxHands?: 1 | 2;
  /** Model complexity (0=lite, 1=full) */
  readonly modelComplexity?: 0 | 1;
  /** Minimum detection confidence (0-1) */
  readonly minDetectionConfidence?: number;
  /** Minimum tracking confidence (0-1) */
  readonly minTrackingConfidence?: number;
  /** Video width for camera capture */
  readonly videoWidth?: number;
  /** Video height for camera capture */
  readonly videoHeight?: number;
  /** Path to MediaPipe hands assets */
  readonly handsPath?: string;
}
