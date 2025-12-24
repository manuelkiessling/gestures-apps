/**
 * @fileoverview DOM-based status display management.
 */

import type { ConnectionState } from '../types.js';

/**
 * Get a required DOM element by ID, throwing if not found.
 */
function getRequiredElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Required DOM element not found: #${id}`);
  }
  return element;
}

/**
 * Manages status displays in the DOM.
 */
export class StatusDisplay {
  private readonly statusElement: HTMLElement;
  private readonly connectionElement: HTMLElement;
  private readonly playerInfoElement: HTMLElement;
  private readonly serverConfigElement: HTMLElement;
  private readonly fallbackElement: HTMLElement;
  private readonly handRaiseOverlay: HTMLElement;
  private readonly overlayWebcam: HTMLVideoElement;

  constructor() {
    this.statusElement = getRequiredElement('status');
    this.connectionElement = getRequiredElement('connection-status');
    this.playerInfoElement = getRequiredElement('player-info');
    this.serverConfigElement = getRequiredElement('server-config');
    this.fallbackElement = getRequiredElement('fallback');
    this.handRaiseOverlay = getRequiredElement('hand-raise-overlay');
    this.overlayWebcam = getRequiredElement('overlay-webcam') as HTMLVideoElement;
  }

  /**
   * Update the main status text.
   */
  updateStatus(text: string): void {
    this.statusElement.textContent = text;
  }

  /**
   * Update with opponent info.
   */
  updateInteractionStatus(interactionStatus: string, opponentConnected: boolean): void {
    const opponentText = opponentConnected ? '' : ' [waiting for opponent]';
    this.statusElement.textContent = interactionStatus + opponentText;
  }

  /**
   * Update connection status display.
   */
  updateConnectionStatus(state: ConnectionState, extra?: string): void {
    let text = `Server: ${state}`;
    if (extra) {
      text += ` - ${extra}`;
    }
    this.connectionElement.textContent = text;
  }

  /**
   * Update player info display.
   */
  updatePlayerInfo(playerId: string, playerNumber: 1 | 2): void {
    this.playerInfoElement.textContent = `Player ${playerNumber} (${playerId})`;
  }

  /**
   * Show the server config dialog.
   */
  showServerConfig(): void {
    this.serverConfigElement.classList.remove('hidden');
  }

  /**
   * Hide the server config dialog.
   */
  hideServerConfig(): void {
    this.serverConfigElement.classList.add('hidden');
  }

  /**
   * Show the fallback screen (camera error).
   */
  showFallback(): void {
    this.fallbackElement.classList.remove('hidden');
  }

  /**
   * Hide the fallback screen.
   */
  hideFallback(): void {
    this.fallbackElement.classList.add('hidden');
  }

  /**
   * Show the hand raise overlay (waiting for hand to start game).
   */
  showHandRaiseOverlay(): void {
    this.handRaiseOverlay.classList.remove('hidden');
    this.handRaiseOverlay.classList.remove('fade-out');
  }

  /**
   * Sync the camera stream to the overlay webcam preview.
   */
  syncOverlayCamera(sourceVideo: HTMLVideoElement): void {
    if (sourceVideo.srcObject) {
      this.overlayWebcam.srcObject = sourceVideo.srcObject;
      this.overlayWebcam.play().catch(() => {
        // Ignore autoplay errors - user will see it when they interact
      });
    }
  }

  /**
   * Hide the hand raise overlay with a fade animation.
   */
  hideHandRaiseOverlay(): void {
    this.handRaiseOverlay.classList.add('fade-out');
    // Remove from DOM after animation completes
    setTimeout(() => {
      this.handRaiseOverlay.classList.add('hidden');
    }, 400);
  }

  /**
   * Set up connect button handler.
   */
  setupConnectButton(onConnect: (url: string) => void): void {
    const connectBtn = getRequiredElement('connect-btn');
    const serverUrlInput = getRequiredElement('server-url') as HTMLInputElement;

    const handleConnect = (): void => {
      onConnect(serverUrlInput.value);
    };

    connectBtn.addEventListener('click', handleConnect);
    serverUrlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleConnect();
      }
    });
  }
}
