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

    it('should parse draw_start message', () => {
      const raw = { type: 'draw_start' };

      const parsed = parseClientMessage(raw);

      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe('draw_start');
    });

    it('should parse draw_point message', () => {
      const raw = { type: 'draw_point', x: 0.5, y: 0.75 };

      const parsed = parseClientMessage(raw);

      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe('draw_point');
      if (parsed?.type === 'draw_point') {
        expect(parsed.x).toBe(0.5);
        expect(parsed.y).toBe(0.75);
      }
    });

    it('should parse draw_end message', () => {
      const raw = { type: 'draw_end' };

      const parsed = parseClientMessage(raw);

      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe('draw_end');
    });

    it('should parse clear_drawings message', () => {
      const raw = { type: 'clear_drawings' };

      const parsed = parseClientMessage(raw);

      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe('clear_drawings');
    });

    it('should return null for malformed draw_point (missing x)', () => {
      const raw = { type: 'draw_point', y: 0.5 };

      const parsed = parseClientMessage(raw);

      expect(parsed).toBeNull();
    });

    it('should return null for malformed draw_point (invalid coordinates)', () => {
      const raw = { type: 'draw_point', x: 'invalid', y: 0.5 };

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

    it('should serialize draw_start_broadcast message', () => {
      const message: ServerMessage = {
        type: 'draw_start_broadcast',
        participantId: 'hand-1',
      };

      const serialized = serializeServerMessage(message);
      const parsed = JSON.parse(serialized);

      expect(parsed.type).toBe('draw_start_broadcast');
      expect(parsed.participantId).toBe('hand-1');
    });

    it('should serialize draw_point_broadcast message', () => {
      const message: ServerMessage = {
        type: 'draw_point_broadcast',
        participantId: 'hand-1',
        x: 0.25,
        y: 0.75,
      };

      const serialized = serializeServerMessage(message);
      const parsed = JSON.parse(serialized);

      expect(parsed.type).toBe('draw_point_broadcast');
      expect(parsed.participantId).toBe('hand-1');
      expect(parsed.x).toBe(0.25);
      expect(parsed.y).toBe(0.75);
    });

    it('should serialize draw_end_broadcast message', () => {
      const message: ServerMessage = {
        type: 'draw_end_broadcast',
        participantId: 'hand-2',
      };

      const serialized = serializeServerMessage(message);
      const parsed = JSON.parse(serialized);

      expect(parsed.type).toBe('draw_end_broadcast');
      expect(parsed.participantId).toBe('hand-2');
    });

    it('should serialize clear_drawings_broadcast message', () => {
      const message: ServerMessage = {
        type: 'clear_drawings_broadcast',
        participantId: 'hand-1',
      };

      const serialized = serializeServerMessage(message);
      const parsed = JSON.parse(serialized);

      expect(parsed.type).toBe('clear_drawings_broadcast');
      expect(parsed.participantId).toBe('hand-1');
    });
  });
});
