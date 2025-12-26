import { describe, expect, it } from 'vitest';
import {
  FRAMEWORK_PROTOCOL_VERSION,
  isFrameworkMessage,
  type ParticipantReadyMessage,
  type SessionEndedMessage,
  type SessionStartedMessage,
} from '../src/index.js';

describe('framework-protocol', () => {
  describe('smoke test', () => {
    it('should export protocol version', () => {
      expect(FRAMEWORK_PROTOCOL_VERSION).toBe('1.0.0');
    });

    it('should export message types', () => {
      const readyMsg: ParticipantReadyMessage = { type: 'participant_ready' };
      const startedMsg: SessionStartedMessage = { type: 'session_started' };
      const endedMsg: SessionEndedMessage = { type: 'session_ended', reason: 'completed' };

      expect(readyMsg.type).toBe('participant_ready');
      expect(startedMsg.type).toBe('session_started');
      expect(endedMsg.type).toBe('session_ended');
    });
  });

  describe('isFrameworkMessage', () => {
    it('should return true for framework messages', () => {
      expect(isFrameworkMessage({ type: 'participant_ready' })).toBe(true);
      expect(isFrameworkMessage({ type: 'session_started' })).toBe(true);
      expect(isFrameworkMessage({ type: 'session_ended' })).toBe(true);
    });

    it('should return false for app-specific messages', () => {
      expect(isFrameworkMessage({ type: 'block_grabbed' })).toBe(false);
      expect(isFrameworkMessage({ type: 'projectile_spawned' })).toBe(false);
      expect(isFrameworkMessage({ type: 'custom_app_message' })).toBe(false);
    });
  });
});
