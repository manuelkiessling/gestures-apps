/**
 * @fileoverview Tests for HelloHandsHooks session logic.
 */

import type { Participant } from '@gesture-app/framework-server';
import { beforeEach, describe, expect, it } from 'vitest';
import { HelloHandsHooks } from '../../src/server/HelloHandsSession.js';
import type { ClientMessage } from '../../src/shared/protocol.js';

describe('HelloHandsHooks', () => {
  let hooks: HelloHandsHooks;

  beforeEach(() => {
    hooks = new HelloHandsHooks();
  });

  describe('generateParticipantId', () => {
    it('should generate unique IDs for each participant number', () => {
      const id1 = hooks.generateParticipantId(1);
      const id2 = hooks.generateParticipantId(2);

      expect(id1).toBe('hand-1');
      expect(id2).toBe('hand-2');
      expect(id1).not.toBe(id2);
    });
  });

  describe('onParticipantJoin', () => {
    it('should return welcome data with color', () => {
      const participant: Participant = {
        id: 'hand-1',
        number: 1,
        isReady: false,
        isBot: false,
        wantsPlayAgain: false,
      };

      const data = hooks.onParticipantJoin(participant);

      expect(data.color).toBe(0x4ecdc4); // Teal for player 1
      expect(data.opponentColor).toBeUndefined();
    });

    it('should include opponent color when opponent exists', () => {
      const participant1: Participant = {
        id: 'hand-1',
        number: 1,
        isReady: false,
        isBot: false,
        wantsPlayAgain: false,
      };
      const participant2: Participant = {
        id: 'hand-2',
        number: 2,
        isReady: false,
        isBot: false,
        wantsPlayAgain: false,
      };

      hooks.onParticipantJoin(participant1);
      const data2 = hooks.onParticipantJoin(participant2);

      expect(data2.color).toBe(0xff6b6b); // Coral for player 2
      expect(data2.opponentColor).toBe(0x4ecdc4); // Teal from player 1
    });

    it('should include existing strokes in welcome data for late joiner', () => {
      const participant1: Participant = {
        id: 'hand-1',
        number: 1,
        isReady: false,
        isBot: false,
        wantsPlayAgain: false,
      };
      hooks.onParticipantJoin(participant1);

      // Simulate participant 1 drawing
      hooks.onMessage({ type: 'draw_start' }, 'hand-1', 'playing');
      hooks.onMessage({ type: 'draw_point', x: 0.1, y: 0.1 }, 'hand-1', 'playing');
      hooks.onMessage({ type: 'draw_point', x: 0.2, y: 0.2 }, 'hand-1', 'playing');
      hooks.onMessage({ type: 'draw_end' }, 'hand-1', 'playing');

      // Participant 2 joins late
      const participant2: Participant = {
        id: 'hand-2',
        number: 2,
        isReady: false,
        isBot: false,
        wantsPlayAgain: false,
      };
      const data2 = hooks.onParticipantJoin(participant2);

      expect(data2.strokes).toBeDefined();
      expect(data2.strokes).toHaveLength(1);
      expect(data2.strokes?.[0].participantId).toBe('hand-1');
      expect(data2.strokes?.[0].points).toHaveLength(2);
    });
  });

  describe('onParticipantLeave', () => {
    it('should clean up participant strokes on leave', () => {
      const participant1: Participant = {
        id: 'hand-1',
        number: 1,
        isReady: false,
        isBot: false,
        wantsPlayAgain: false,
      };
      hooks.onParticipantJoin(participant1);

      // Draw a stroke
      hooks.onMessage({ type: 'draw_start' }, 'hand-1', 'playing');
      hooks.onMessage({ type: 'draw_point', x: 0.5, y: 0.5 }, 'hand-1', 'playing');
      hooks.onMessage({ type: 'draw_end' }, 'hand-1', 'playing');

      // Leave
      hooks.onParticipantLeave('hand-1');

      // New participant should not see the old strokes
      const participant2: Participant = {
        id: 'hand-2',
        number: 2,
        isReady: false,
        isBot: false,
        wantsPlayAgain: false,
      };
      const data2 = hooks.onParticipantJoin(participant2);

      expect(data2.strokes).toBeUndefined();
    });
  });

  describe('onMessage - hand_update', () => {
    it('should broadcast hand_update to opponent', () => {
      const message: ClientMessage = {
        type: 'hand_update',
        handState: {
          position: { x: 0.5, y: 0.5 },
          isPinching: false,
          isRaised: true,
        },
      };

      const responses = hooks.onMessage(message, 'hand-1', 'playing');

      expect(responses).toHaveLength(1);
      expect(responses[0].target).toBe('opponent');
      expect(responses[0].message.type).toBe('hand_broadcast');
    });
  });

  describe('onMessage - wave', () => {
    it('should broadcast wave to opponent', () => {
      const message: ClientMessage = { type: 'wave' };

      const responses = hooks.onMessage(message, 'hand-1', 'playing');

      expect(responses).toHaveLength(1);
      expect(responses[0].target).toBe('opponent');
      expect(responses[0].message.type).toBe('wave_broadcast');
    });
  });

  describe('onMessage - draw_start', () => {
    it('should broadcast draw_start to opponent', () => {
      const message: ClientMessage = { type: 'draw_start' };

      const responses = hooks.onMessage(message, 'hand-1', 'playing');

      expect(responses).toHaveLength(1);
      expect(responses[0].target).toBe('opponent');
      expect(responses[0].message.type).toBe('draw_start_broadcast');
      if (responses[0].message.type === 'draw_start_broadcast') {
        expect(responses[0].message.participantId).toBe('hand-1');
      }
    });
  });

  describe('onMessage - draw_point', () => {
    it('should broadcast draw_point to opponent', () => {
      // Start a stroke first
      hooks.onMessage({ type: 'draw_start' }, 'hand-1', 'playing');

      const message: ClientMessage = { type: 'draw_point', x: 0.3, y: 0.7 };
      const responses = hooks.onMessage(message, 'hand-1', 'playing');

      expect(responses).toHaveLength(1);
      expect(responses[0].target).toBe('opponent');
      expect(responses[0].message.type).toBe('draw_point_broadcast');
      if (responses[0].message.type === 'draw_point_broadcast') {
        expect(responses[0].message.participantId).toBe('hand-1');
        expect(responses[0].message.x).toBe(0.3);
        expect(responses[0].message.y).toBe(0.7);
      }
    });

    it('should accumulate points in active stroke', () => {
      const participant: Participant = {
        id: 'hand-1',
        number: 1,
        isReady: false,
        isBot: false,
        wantsPlayAgain: false,
      };
      hooks.onParticipantJoin(participant);

      hooks.onMessage({ type: 'draw_start' }, 'hand-1', 'playing');
      hooks.onMessage({ type: 'draw_point', x: 0.1, y: 0.1 }, 'hand-1', 'playing');
      hooks.onMessage({ type: 'draw_point', x: 0.2, y: 0.2 }, 'hand-1', 'playing');
      hooks.onMessage({ type: 'draw_point', x: 0.3, y: 0.3 }, 'hand-1', 'playing');
      hooks.onMessage({ type: 'draw_end' }, 'hand-1', 'playing');

      // Check that stroke was saved with all points
      const participant2: Participant = {
        id: 'hand-2',
        number: 2,
        isReady: false,
        isBot: false,
        wantsPlayAgain: false,
      };
      const data = hooks.onParticipantJoin(participant2);

      expect(data.strokes).toHaveLength(1);
      expect(data.strokes?.[0].points).toHaveLength(3);
      expect(data.strokes?.[0].points[0]).toEqual({ x: 0.1, y: 0.1 });
      expect(data.strokes?.[0].points[2]).toEqual({ x: 0.3, y: 0.3 });
    });
  });

  describe('onMessage - draw_end', () => {
    it('should broadcast draw_end to opponent', () => {
      hooks.onMessage({ type: 'draw_start' }, 'hand-1', 'playing');
      hooks.onMessage({ type: 'draw_point', x: 0.5, y: 0.5 }, 'hand-1', 'playing');

      const message: ClientMessage = { type: 'draw_end' };
      const responses = hooks.onMessage(message, 'hand-1', 'playing');

      expect(responses).toHaveLength(1);
      expect(responses[0].target).toBe('opponent');
      expect(responses[0].message.type).toBe('draw_end_broadcast');
      if (responses[0].message.type === 'draw_end_broadcast') {
        expect(responses[0].message.participantId).toBe('hand-1');
      }
    });

    it('should finalize stroke only if it has points', () => {
      const participant: Participant = {
        id: 'hand-1',
        number: 1,
        isReady: false,
        isBot: false,
        wantsPlayAgain: false,
      };
      hooks.onParticipantJoin(participant);

      // Start and immediately end without any points
      hooks.onMessage({ type: 'draw_start' }, 'hand-1', 'playing');
      hooks.onMessage({ type: 'draw_end' }, 'hand-1', 'playing');

      // No stroke should be saved
      const participant2: Participant = {
        id: 'hand-2',
        number: 2,
        isReady: false,
        isBot: false,
        wantsPlayAgain: false,
      };
      const data = hooks.onParticipantJoin(participant2);

      expect(data.strokes).toBeUndefined();
    });
  });

  describe('onMessage - clear_drawings', () => {
    it('should broadcast clear_drawings to opponent', () => {
      const message: ClientMessage = { type: 'clear_drawings' };

      const responses = hooks.onMessage(message, 'hand-1', 'playing');

      expect(responses).toHaveLength(1);
      expect(responses[0].target).toBe('opponent');
      expect(responses[0].message.type).toBe('clear_drawings_broadcast');
      if (responses[0].message.type === 'clear_drawings_broadcast') {
        expect(responses[0].message.participantId).toBe('hand-1');
      }
    });

    it('should only remove sender strokes, not opponent strokes', () => {
      const participant1: Participant = {
        id: 'hand-1',
        number: 1,
        isReady: false,
        isBot: false,
        wantsPlayAgain: false,
      };
      const participant2: Participant = {
        id: 'hand-2',
        number: 2,
        isReady: false,
        isBot: false,
        wantsPlayAgain: false,
      };
      hooks.onParticipantJoin(participant1);
      hooks.onParticipantJoin(participant2);

      // Both participants draw
      hooks.onMessage({ type: 'draw_start' }, 'hand-1', 'playing');
      hooks.onMessage({ type: 'draw_point', x: 0.1, y: 0.1 }, 'hand-1', 'playing');
      hooks.onMessage({ type: 'draw_end' }, 'hand-1', 'playing');

      hooks.onMessage({ type: 'draw_start' }, 'hand-2', 'playing');
      hooks.onMessage({ type: 'draw_point', x: 0.9, y: 0.9 }, 'hand-2', 'playing');
      hooks.onMessage({ type: 'draw_end' }, 'hand-2', 'playing');

      // Player 1 clears their drawings
      hooks.onMessage({ type: 'clear_drawings' }, 'hand-1', 'playing');

      // Add a new participant to check remaining strokes (without clearing the existing ones)
      const newParticipant: Participant = {
        id: 'hand-3',
        number: 1,
        isReady: false,
        isBot: false,
        wantsPlayAgain: false,
      };
      const data = hooks.onParticipantJoin(newParticipant);

      // Only hand-2's stroke should remain (hand-1's was cleared)
      expect(data.strokes).toHaveLength(1);
      expect(data.strokes?.[0].participantId).toBe('hand-2');
    });

    it('should also clear active stroke when clearing drawings', () => {
      const participant: Participant = {
        id: 'hand-1',
        number: 1,
        isReady: false,
        isBot: false,
        wantsPlayAgain: false,
      };
      hooks.onParticipantJoin(participant);

      // Start drawing but don't end
      hooks.onMessage({ type: 'draw_start' }, 'hand-1', 'playing');
      hooks.onMessage({ type: 'draw_point', x: 0.5, y: 0.5 }, 'hand-1', 'playing');

      // Clear while drawing
      hooks.onMessage({ type: 'clear_drawings' }, 'hand-1', 'playing');

      // End the stroke (should not add anything since active stroke was cleared)
      hooks.onMessage({ type: 'draw_end' }, 'hand-1', 'playing');

      // Check no strokes saved
      const participant2: Participant = {
        id: 'hand-2',
        number: 2,
        isReady: false,
        isBot: false,
        wantsPlayAgain: false,
      };
      const data = hooks.onParticipantJoin(participant2);

      expect(data.strokes).toBeUndefined();
    });
  });

  describe('onReset', () => {
    it('should clear all strokes on reset', () => {
      const participant: Participant = {
        id: 'hand-1',
        number: 1,
        isReady: false,
        isBot: false,
        wantsPlayAgain: false,
      };
      hooks.onParticipantJoin(participant);

      // Draw some strokes
      hooks.onMessage({ type: 'draw_start' }, 'hand-1', 'playing');
      hooks.onMessage({ type: 'draw_point', x: 0.5, y: 0.5 }, 'hand-1', 'playing');
      hooks.onMessage({ type: 'draw_end' }, 'hand-1', 'playing');

      // Reset
      const resetData = hooks.onReset();

      expect(resetData.message).toBe('Ready to wave again!');

      // Check strokes are cleared
      const participant2: Participant = {
        id: 'hand-2',
        number: 2,
        isReady: false,
        isBot: false,
        wantsPlayAgain: false,
      };
      const data = hooks.onParticipantJoin(participant2);

      expect(data.strokes).toBeUndefined();
    });
  });

  describe('multiple strokes', () => {
    it('should support multiple strokes from same participant', () => {
      const participant: Participant = {
        id: 'hand-1',
        number: 1,
        isReady: false,
        isBot: false,
        wantsPlayAgain: false,
      };
      hooks.onParticipantJoin(participant);

      // First stroke
      hooks.onMessage({ type: 'draw_start' }, 'hand-1', 'playing');
      hooks.onMessage({ type: 'draw_point', x: 0.1, y: 0.1 }, 'hand-1', 'playing');
      hooks.onMessage({ type: 'draw_end' }, 'hand-1', 'playing');

      // Second stroke
      hooks.onMessage({ type: 'draw_start' }, 'hand-1', 'playing');
      hooks.onMessage({ type: 'draw_point', x: 0.9, y: 0.9 }, 'hand-1', 'playing');
      hooks.onMessage({ type: 'draw_end' }, 'hand-1', 'playing');

      const participant2: Participant = {
        id: 'hand-2',
        number: 2,
        isReady: false,
        isBot: false,
        wantsPlayAgain: false,
      };
      const data = hooks.onParticipantJoin(participant2);

      expect(data.strokes).toHaveLength(2);
    });
  });
});
