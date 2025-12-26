/**
 * @fileoverview Hello Hands client application.
 *
 * A minimal demo that shows hand positions between two participants.
 * Uses mouse input for simplicity (no MediaPipe dependency).
 */

import type { ParticipantId } from '@gesture-app/framework-protocol';
import type {
  ClientMessage,
  HandState,
  HelloHandsWelcomeData,
  ServerMessage,
} from '../src/shared/protocol.js';
import { PARTICIPANT_COLORS } from '../src/shared/types.js';

// ============ DOM Elements ============

const connectionOverlay = document.getElementById('connection-overlay') as HTMLDivElement;
const waitingOverlay = document.getElementById('waiting-overlay') as HTMLDivElement;
const readyOverlay = document.getElementById('ready-overlay') as HTMLDivElement;
const waveNotification = document.getElementById('wave-notification') as HTMLDivElement;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const controls = document.getElementById('controls') as HTMLDivElement;
const lobbyLink = document.getElementById('lobby-link') as HTMLAnchorElement;

const connectionStatus = document.getElementById('connection-status') as HTMLDivElement;
const manualConnect = document.getElementById('manual-connect') as HTMLDivElement;
const wsUrlInput = document.getElementById('ws-url') as HTMLInputElement;
const connectBtn = document.getElementById('connect-btn') as HTMLButtonElement;
const participantInfo = document.getElementById('participant-info') as HTMLParagraphElement;
const readyBtn = document.getElementById('ready-btn') as HTMLButtonElement;
const waveBtn = document.getElementById('wave-btn') as HTMLButtonElement;
const myColorIndicator = document.getElementById('my-color') as HTMLDivElement;
const friendColorIndicator = document.getElementById('friend-color') as HTMLDivElement;

const ctx = canvas.getContext('2d');
if (!ctx) {
  throw new Error('Could not get 2D context from canvas');
}

// ============ State ============

interface AppState {
  ws: WebSocket | null;
  participantId: ParticipantId | null;
  participantNumber: 1 | 2 | null;
  myColor: number;
  friendColor: number;
  phase: 'connecting' | 'waiting' | 'ready' | 'playing' | 'finished';
  myHandState: HandState;
  friendHandState: HandState | null;
  hasOpponent: boolean;
}

const state: AppState = {
  ws: null,
  participantId: null,
  participantNumber: null,
  myColor: PARTICIPANT_COLORS[1],
  friendColor: PARTICIPANT_COLORS[2],
  phase: 'connecting',
  myHandState: {
    position: { x: 0.5, y: 0.5 },
    isPinching: false,
    isRaised: false,
  },
  friendHandState: null,
  hasOpponent: false,
};

// ============ Initialization ============

function init(): void {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Track mouse movement as hand position
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mouseup', handleMouseUp);

  // Button handlers
  connectBtn.addEventListener('click', handleManualConnect);
  readyBtn.addEventListener('click', handleReady);
  waveBtn.addEventListener('click', handleWave);

  // Try auto-connect or show manual connect
  tryAutoConnect();

  // Start render loop
  requestAnimationFrame(render);
}

function resizeCanvas(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

// ============ Connection ============

async function tryAutoConnect(): Promise<void> {
  // Try to fetch session config
  try {
    const response = await fetch('/session.json');
    if (response.ok) {
      const config = await response.json();
      if (config.wsUrl) {
        connect(config.wsUrl);
        if (config.lobbyUrl) {
          lobbyLink.href = config.lobbyUrl;
        }
        return;
      }
    }
  } catch {
    // Ignore fetch errors
  }

  // Check for local development
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    connectionStatus.textContent = 'Local development mode';
    manualConnect.style.display = 'flex';
  } else {
    // Try WebSocket on same host
    const wsUrl = `wss://${location.host}/ws`;
    connect(wsUrl);
  }
}

function handleManualConnect(): void {
  const url = wsUrlInput.value.trim();
  if (url) {
    connect(url);
  }
}

function connect(url: string): void {
  connectionStatus.textContent = `Connecting to ${url}...`;
  manualConnect.style.display = 'none';

  state.ws = new WebSocket(url);

  state.ws.onopen = () => {
    connectionStatus.textContent = 'Connected!';
  };

  state.ws.onmessage = (event) => {
    handleMessage(JSON.parse(event.data));
  };

  state.ws.onclose = () => {
    connectionStatus.textContent = 'Disconnected';
    manualConnect.style.display = 'flex';
    state.phase = 'connecting';
    showOverlay('connection');
  };

  state.ws.onerror = () => {
    connectionStatus.textContent = 'Connection failed';
    manualConnect.style.display = 'flex';
  };
}

function send(message: ClientMessage): void {
  if (state.ws?.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify(message));
  }
}

// ============ Message Handling ============

function handleMessage(message: ServerMessage | { type: string; [key: string]: unknown }): void {
  switch (message.type) {
    case 'welcome':
      handleWelcome(
        message as ServerMessage &
          HelloHandsWelcomeData & {
            participantId: ParticipantId;
            participantNumber: 1 | 2;
            sessionPhase: string;
          }
      );
      break;

    case 'opponent_joined':
      state.hasOpponent = true;
      state.phase = 'ready';
      showOverlay('ready');
      break;

    case 'opponent_left':
      state.hasOpponent = false;
      state.friendHandState = null;
      state.phase = 'waiting';
      showOverlay('waiting');
      break;

    case 'session_started':
      state.phase = 'playing';
      showOverlay(null);
      controls.style.display = 'flex';
      lobbyLink.style.display = 'block';
      break;

    case 'hand_broadcast':
      if ('handState' in message) {
        state.friendHandState = message.handState as HandState;
      }
      break;

    case 'wave_broadcast':
      showWaveNotification();
      break;

    case 'session_ended':
      state.phase = 'finished';
      break;

    case 'session_reset':
      state.phase = 'ready';
      state.friendHandState = null;
      showOverlay('ready');
      break;

    case 'error':
      console.error('Server error:', message);
      break;
  }
}

function handleWelcome(message: {
  participantId: ParticipantId;
  participantNumber: 1 | 2;
  sessionPhase: string;
  color: number;
  opponentColor?: number;
}): void {
  state.participantId = message.participantId;
  state.participantNumber = message.participantNumber;
  state.myColor = message.color;

  if (message.opponentColor) {
    state.friendColor = message.opponentColor;
    state.hasOpponent = true;
    state.phase = 'ready';
    showOverlay('ready');
  } else {
    state.friendColor = PARTICIPANT_COLORS[message.participantNumber === 1 ? 2 : 1];
    state.phase = 'waiting';
    showOverlay('waiting');
  }

  // Update color indicators
  myColorIndicator.style.backgroundColor = colorToCSS(state.myColor);
  friendColorIndicator.style.backgroundColor = colorToCSS(state.friendColor);

  participantInfo.textContent = `You are participant ${message.participantNumber}`;
}

// ============ Input Handling ============

function handleMouseMove(event: MouseEvent): void {
  const x = event.clientX / canvas.width;
  const y = event.clientY / canvas.height;

  state.myHandState = {
    ...state.myHandState,
    position: { x, y },
  };

  // Send hand update if playing
  if (state.phase === 'playing') {
    send({
      type: 'hand_update',
      handState: state.myHandState,
    });
  }
}

function handleMouseDown(): void {
  state.myHandState = {
    ...state.myHandState,
    isPinching: true,
  };

  if (state.phase === 'playing') {
    send({
      type: 'hand_update',
      handState: state.myHandState,
    });
  }
}

function handleMouseUp(): void {
  state.myHandState = {
    ...state.myHandState,
    isPinching: false,
  };

  if (state.phase === 'playing') {
    send({
      type: 'hand_update',
      handState: state.myHandState,
    });
  }
}

function handleReady(): void {
  send({ type: 'participant_ready' } as unknown as ClientMessage);
  readyBtn.textContent = 'Waiting...';
  readyBtn.disabled = true;
}

function handleWave(): void {
  send({ type: 'wave' });

  // Animate button
  waveBtn.style.transform = 'scale(1.2)';
  setTimeout(() => {
    waveBtn.style.transform = '';
  }, 200);
}

// ============ UI Helpers ============

function showOverlay(type: 'connection' | 'waiting' | 'ready' | null): void {
  connectionOverlay.style.display = type === 'connection' ? 'flex' : 'none';
  waitingOverlay.style.display = type === 'waiting' ? 'flex' : 'none';
  readyOverlay.style.display = type === 'ready' ? 'flex' : 'none';

  if (type !== null) {
    controls.style.display = 'none';
  }
}

function showWaveNotification(): void {
  waveNotification.style.display = 'flex';
  setTimeout(() => {
    waveNotification.style.display = 'none';
  }, 2000);
}

function colorToCSS(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

// ============ Rendering ============

function render(): void {
  // Clear canvas
  ctx.fillStyle = 'rgba(26, 26, 46, 0.3)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state.phase === 'playing') {
    // Draw friend's hand
    if (state.friendHandState) {
      drawHand(
        state.friendHandState.position.x * canvas.width,
        state.friendHandState.position.y * canvas.height,
        state.friendColor,
        state.friendHandState.isPinching,
        'Friend'
      );
    }

    // Draw my hand
    drawHand(
      state.myHandState.position.x * canvas.width,
      state.myHandState.position.y * canvas.height,
      state.myColor,
      state.myHandState.isPinching,
      'You'
    );
  }

  requestAnimationFrame(render);
}

function drawHand(x: number, y: number, color: number, isPinching: boolean, label: string): void {
  const radius = isPinching ? 30 : 40;
  const cssColor = colorToCSS(color);

  // Outer glow
  ctx.beginPath();
  ctx.arc(x, y, radius + 10, 0, Math.PI * 2);
  ctx.fillStyle = `${cssColor}33`;
  ctx.fill();

  // Main circle
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = cssColor;
  ctx.fill();

  // Inner highlight
  ctx.beginPath();
  ctx.arc(x - radius * 0.2, y - radius * 0.2, radius * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fill();

  // Label
  ctx.font = '14px "Segoe UI", sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y + radius + 25);

  // Pinch indicator
  if (isPinching) {
    ctx.beginPath();
    ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

// ============ Start ============

init();
