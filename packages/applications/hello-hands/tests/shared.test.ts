/**
 * @fileoverview Tests for Hello Hands shared types and protocol.
 */

import { describe, expect, it } from 'vitest';
import {
  parseClientMessage,
  type ServerMessage,
  serializeServerMessage,
} from '../src/shared/index.js';
import { getParticipantColor, PARTICIPANT_COLORS } from '../src/shared/types.js';

describe('Hello Hands Shared', () => {
  describe('types', () => {
    it('should define participant colors', () => {
      expect(PARTICIPANT_COLORS[1]).toBe(0x4ecdc4); // Teal
      expect(PARTICIPANT_COLORS[2]).toBe(0xff6b6b); // Coral
    });

    it('should get participant color by number', () => {
      expect(getParticipantColor(1)).toBe(0x4ecdc4);
      expect(getParticipantColor(2)).toBe(0xff6b6b);
    });
  });

  describe('protocol - client messages', () => {
    it('should parse hand_update message', () => {
      const raw = {
        type: 'hand_update',
        handState: {
          position: { x: 0.5, y: 0.3 },
          isPinching: false,
          isRaised: true,
        },
      };

      const parsed = parseClientMessage(raw);

      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe('hand_update');
      if (parsed?.type === 'hand_update') {
        expect(parsed.handState.position.x).toBe(0.5);
        expect(parsed.handState.position.y).toBe(0.3);
        expect(parsed.handState.isPinching).toBe(false);
        expect(parsed.handState.isRaised).toBe(true);
      }
    });

    it('should parse wave message', () => {
      const raw = { type: 'wave' };

      const parsed = parseClientMessage(raw);

      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe('wave');
    });

    it('should return null for invalid message', () => {
      const raw = { type: 'unknown_type' };

      const parsed = parseClientMessage(raw);

      expect(parsed).toBeNull();
    });

    it('should return null for malformed hand_update', () => {
      const raw = {
        type: 'hand_update',
        handState: {
          position: { x: 'not a number' }, // Invalid
        },
      };

      const parsed = parseClientMessage(raw);

      expect(parsed).toBeNull();
    });
  });

  describe('protocol - server messages', () => {
    it('should serialize hand_broadcast message', () => {
      const message: ServerMessage = {
        type: 'hand_broadcast',
        participantId: 'participant-1',
        handState: {
          position: { x: 0.5, y: 0.5 },
          isPinching: true,
          isRaised: false,
        },
      };

      const serialized = serializeServerMessage(message);
      const parsed = JSON.parse(serialized);

      expect(parsed.type).toBe('hand_broadcast');
      expect(parsed.participantId).toBe('participant-1');
      expect(parsed.handState.position.x).toBe(0.5);
    });

    it('should serialize wave_broadcast message', () => {
      const message: ServerMessage = {
        type: 'wave_broadcast',
        participantId: 'participant-2',
      };

      const serialized = serializeServerMessage(message);
      const parsed = JSON.parse(serialized);

      expect(parsed.type).toBe('wave_broadcast');
      expect(parsed.participantId).toBe('participant-2');
    });
  });
});
