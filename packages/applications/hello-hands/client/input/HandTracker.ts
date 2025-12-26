/**
 * @fileoverview MediaPipe hand tracking for Hello Hands.
 *
 * This is a single-hand tracking wrapper that uses the framework-input
 * utilities for gesture detection and provides a simplified HandState interface.
 */

import {
  DEFAULT_MEDIAPIPE_CONFIG,
  extractLandmarks2D,
  type HandLandmarks,
  type HandState,
  isHandRaised,
  isPinching,
  LANDMARKS,
  type Point2D,
} from '@gesture-app/framework-input';
import { Camera } from '@mediapipe/camera_utils';
import { Hands } from '@mediapipe/hands';

// Re-export framework types and constants for convenience
export { HAND_CONNECTIONS, LANDMARKS } from '@gesture-app/framework-input';
export type { HandState, Point2D };

/**
 * Callback for hand tracking updates.
 */
export type HandCallback = (hand: HandState | null) => void;

/**
 * Manages single-hand MediaPipe hand tracking for Hello Hands.
 *
 * Returns a simplified HandState with gesture detection results.
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
        width: DEFAULT_MEDIAPIPE_CONFIG.VIDEO_WIDTH,
        height: DEFAULT_MEDIAPIPE_CONFIG.VIDEO_HEIGHT,
        facingMode: 'user',
      },
    });
    this.video.srcObject = stream;
    await this.video.play();

    // Initialize MediaPipe Hands with single-hand config
    this.hands = new Hands({
      locateFile: (file: string) => `${DEFAULT_MEDIAPIPE_CONFIG.HANDS_PATH}${file}`,
    });

    this.hands.setOptions({
      maxNumHands: 1, // Single-hand tracking for simplicity
      modelComplexity: DEFAULT_MEDIAPIPE_CONFIG.MODEL_COMPLEXITY,
      minDetectionConfidence: DEFAULT_MEDIAPIPE_CONFIG.MIN_DETECTION_CONFIDENCE,
      minTrackingConfidence: DEFAULT_MEDIAPIPE_CONFIG.MIN_TRACKING_CONFIDENCE,
    });

    this.hands.onResults((results) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        if (landmarks) {
          const handState = this.extractHandState(landmarks as HandLandmarks);
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
      width: DEFAULT_MEDIAPIPE_CONFIG.VIDEO_WIDTH,
      height: DEFAULT_MEDIAPIPE_CONFIG.VIDEO_HEIGHT,
    });
  }

  /**
   * Extract hand state from landmarks using framework utilities.
   */
  private extractHandState(rawLandmarks: HandLandmarks): HandState {
    const wrist = rawLandmarks[LANDMARKS.WRIST];
    const indexTip = rawLandmarks[LANDMARKS.INDEX_TIP];
    const middleTip = rawLandmarks[LANDMARKS.MIDDLE_TIP];

    // Calculate palm center (average of key points)
    const position: Point2D =
      wrist && indexTip && middleTip
        ? {
            x: (wrist.x + indexTip.x + middleTip.x) / 3,
            y: (wrist.y + indexTip.y + middleTip.y) / 3,
          }
        : { x: 0.5, y: 0.5 };

    // Use framework gesture detection utilities
    const pinching = isPinching(rawLandmarks);
    const raised = isHandRaised(rawLandmarks);

    // Extract 2D landmarks using framework utility
    const landmarks = extractLandmarks2D(rawLandmarks);

    return {
      position,
      landmarks,
      isPinching: pinching,
      isRaised: raised,
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
