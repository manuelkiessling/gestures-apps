/**
 * @fileoverview MediaPipe hand tracking for Hello Hands.
 *
 * Tracks hand position, gestures, and provides all 21 landmarks for visualization.
 */

import { Camera } from '@mediapipe/camera_utils';
import { Hands } from '@mediapipe/hands';

/** MediaPipe configuration */
const MEDIAPIPE_CONFIG = {
  HANDS_PATH: './mediapipe/hands/',
  MAX_HANDS: 1, // Only track one hand for simplicity
  MODEL_COMPLEXITY: 1,
  MIN_DETECTION_CONFIDENCE: 0.7,
  MIN_TRACKING_CONFIDENCE: 0.5,
  VIDEO_WIDTH: 640,
  VIDEO_HEIGHT: 480,
} as const;

/** Hand landmark indices */
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
} as const;

/** Connections between landmarks for drawing the skeleton */
export const HAND_CONNECTIONS: [number, number][] = [
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
];

/** Pinch detection threshold (normalized distance) */
const PINCH_THRESHOLD = 0.08;

/** Raised hand detection threshold (wrist Y position) */
const RAISED_THRESHOLD = 0.4;

/** A single 2D point */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * Hand state with full landmark data for visualization.
 */
export interface HandState {
  /** Normalized position (0-1 range, center of palm) */
  position: Point2D;
  /** All 21 hand landmarks (normalized 0-1 coordinates) */
  landmarks: Point2D[];
  /** Whether thumb and index are pinched together */
  isPinching: boolean;
  /** Whether hand is raised above threshold */
  isRaised: boolean;
}

/**
 * Callback for hand tracking updates.
 */
export type HandCallback = (hand: HandState | null) => void;

/**
 * Manages MediaPipe hand tracking.
 */
export class HandTracker {
  private hands: Hands | null = null;
  private camera: Camera | null = null;
  private readonly video: HTMLVideoElement;
  private callback: HandCallback | null = null;
  private isRunning = false;

  constructor(videoElement: HTMLVideoElement) {
    this.video = videoElement;
  }

  /**
   * Initialize hand tracking.
   */
  async initialize(onHand: HandCallback): Promise<void> {
    this.callback = onHand;

    // Get camera stream
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: MEDIAPIPE_CONFIG.VIDEO_WIDTH,
        height: MEDIAPIPE_CONFIG.VIDEO_HEIGHT,
        facingMode: 'user',
      },
    });
    this.video.srcObject = stream;
    await this.video.play();

    // Initialize MediaPipe Hands
    this.hands = new Hands({
      locateFile: (file: string) => `${MEDIAPIPE_CONFIG.HANDS_PATH}${file}`,
    });

    this.hands.setOptions({
      maxNumHands: MEDIAPIPE_CONFIG.MAX_HANDS,
      modelComplexity: MEDIAPIPE_CONFIG.MODEL_COMPLEXITY,
      minDetectionConfidence: MEDIAPIPE_CONFIG.MIN_DETECTION_CONFIDENCE,
      minTrackingConfidence: MEDIAPIPE_CONFIG.MIN_TRACKING_CONFIDENCE,
    });

    this.hands.onResults((results) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        if (landmarks) {
          const handState = this.extractHandState(landmarks);
          this.callback?.(handState);
        }
      } else {
        this.callback?.(null);
      }
    });

    // Initialize camera feed
    this.camera = new Camera(this.video, {
      onFrame: async () => {
        if (this.hands && this.isRunning) {
          await this.hands.send({ image: this.video });
        }
      },
      width: MEDIAPIPE_CONFIG.VIDEO_WIDTH,
      height: MEDIAPIPE_CONFIG.VIDEO_HEIGHT,
    });
  }

  /**
   * Extract hand state from landmarks, including all 21 points for visualization.
   */
  private extractHandState(rawLandmarks: { x: number; y: number; z: number }[]): HandState {
    const wrist = rawLandmarks[LANDMARKS.WRIST];
    const thumbTip = rawLandmarks[LANDMARKS.THUMB_TIP];
    const indexTip = rawLandmarks[LANDMARKS.INDEX_TIP];
    const middleTip = rawLandmarks[LANDMARKS.MIDDLE_TIP];

    // Calculate palm center (average of key points)
    const palmX = (wrist.x + indexTip.x + middleTip.x) / 3;
    const palmY = (wrist.y + indexTip.y + middleTip.y) / 3;

    // Detect pinch (thumb and index finger close together)
    const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
    const isPinching = pinchDist < PINCH_THRESHOLD;

    // Detect raised hand (wrist above threshold)
    const isRaised = wrist.y < RAISED_THRESHOLD;

    // Extract all landmarks as 2D points
    const landmarks: Point2D[] = rawLandmarks.map((lm) => ({ x: lm.x, y: lm.y }));

    return {
      position: { x: palmX, y: palmY },
      landmarks,
      isPinching,
      isRaised,
    };
  }

  /**
   * Start tracking.
   */
  start(): void {
    if (this.camera && !this.isRunning) {
      this.isRunning = true;
      this.camera.start();
    }
  }

  /**
   * Stop tracking.
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * Check if tracking is running.
   */
  get running(): boolean {
    return this.isRunning;
  }
}
