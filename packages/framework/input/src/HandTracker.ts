/**
 * @fileoverview Unified hand tracking using MediaPipe.
 *
 * Provides a configurable HandTracker that works for both single-hand
 * and multi-hand tracking scenarios.
 */

import { Camera } from '@mediapipe/camera_utils';
import { Hands } from '@mediapipe/hands';
import { DEFAULT_MEDIAPIPE_CONFIG } from './constants.js';
import type { Handedness, HandTrackerConfig, MultiHandCallback, TrackedHand } from './types.js';

/**
 * Manages MediaPipe hand tracking with support for multiple hands.
 *
 * @example Single-hand tracking
 * ```typescript
 * const tracker = new HandTracker(videoElement, { maxHands: 1 });
 * await tracker.initialize((hands) => {
 *   if (hands.length > 0) {
 *     console.log('Hand detected:', hands[0]);
 *   }
 * });
 * tracker.start();
 * ```
 *
 * @example Multi-hand tracking
 * ```typescript
 * const tracker = new HandTracker(videoElement, { maxHands: 2 });
 * await tracker.initialize((hands) => {
 *   for (const hand of hands) {
 *     console.log(`${hand.handedness} hand:`, hand.landmarks);
 *   }
 * });
 * tracker.start();
 * ```
 */
export class HandTracker {
  private hands: Hands | null = null;
  private camera: Camera | null = null;
  private readonly video: HTMLVideoElement;
  private readonly config: Required<HandTrackerConfig>;
  private callback: MultiHandCallback | null = null;
  private isRunning = false;

  /**
   * Create a new HandTracker.
   *
   * @param videoElement - The video element to use for camera feed
   * @param config - Optional configuration overrides
   */
  constructor(videoElement: HTMLVideoElement, config: HandTrackerConfig = {}) {
    this.video = videoElement;
    this.config = {
      maxHands: config.maxHands ?? (DEFAULT_MEDIAPIPE_CONFIG.MAX_HANDS as 1 | 2),
      modelComplexity:
        config.modelComplexity ?? (DEFAULT_MEDIAPIPE_CONFIG.MODEL_COMPLEXITY as 0 | 1),
      minDetectionConfidence:
        config.minDetectionConfidence ?? DEFAULT_MEDIAPIPE_CONFIG.MIN_DETECTION_CONFIDENCE,
      minTrackingConfidence:
        config.minTrackingConfidence ?? DEFAULT_MEDIAPIPE_CONFIG.MIN_TRACKING_CONFIDENCE,
      videoWidth: config.videoWidth ?? DEFAULT_MEDIAPIPE_CONFIG.VIDEO_WIDTH,
      videoHeight: config.videoHeight ?? DEFAULT_MEDIAPIPE_CONFIG.VIDEO_HEIGHT,
      handsPath: config.handsPath ?? DEFAULT_MEDIAPIPE_CONFIG.HANDS_PATH,
    };
  }

  /**
   * Initialize hand tracking.
   *
   * This requests camera access, initializes MediaPipe Hands, and sets up
   * the camera feed. Call `start()` after initialization to begin tracking.
   *
   * @param onHands - Callback for hand updates (receives array of tracked hands)
   * @throws Error if camera access is denied
   */
  async initialize(onHands: MultiHandCallback): Promise<void> {
    this.callback = onHands;

    // Get camera stream
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: this.config.videoWidth,
        height: this.config.videoHeight,
        facingMode: 'user',
      },
    });
    this.video.srcObject = stream;
    await this.video.play();

    // Initialize MediaPipe Hands
    this.hands = new Hands({
      locateFile: (file: string) => `${this.config.handsPath}${file}`,
    });

    this.hands.setOptions({
      maxNumHands: this.config.maxHands,
      modelComplexity: this.config.modelComplexity,
      minDetectionConfidence: this.config.minDetectionConfidence,
      minTrackingConfidence: this.config.minTrackingConfidence,
    });

    this.hands.onResults((results) => {
      const trackedHands: TrackedHand[] = [];

      if (results.multiHandLandmarks && results.multiHandedness) {
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
          const landmarks = results.multiHandLandmarks[i];
          const handedness = results.multiHandedness[i];

          if (landmarks && handedness) {
            trackedHands.push({
              landmarks,
              handedness: handedness.label as Handedness,
              score: handedness.score ?? 1,
            });
          }
        }
      }

      this.callback?.(trackedHands);
    });

    // Initialize camera
    this.camera = new Camera(this.video, {
      onFrame: async () => {
        if (this.hands && this.isRunning) {
          await this.hands.send({ image: this.video });
        }
      },
      width: this.config.videoWidth,
      height: this.config.videoHeight,
    });
  }

  /**
   * Start tracking.
   *
   * Begins the camera capture and hand detection loop.
   * Must call `initialize()` before calling this method.
   */
  start(): void {
    if (this.camera && !this.isRunning) {
      this.isRunning = true;
      this.camera.start();
    }
  }

  /**
   * Stop tracking.
   *
   * Pauses hand detection but keeps the camera initialized.
   * Call `start()` to resume tracking.
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * Check if tracking is currently running.
   */
  get running(): boolean {
    return this.isRunning;
  }
}
