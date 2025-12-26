import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RUNTIME_CONFIG,
  FRAMEWORK_SERVER_VERSION,
  type SessionRuntimeConfig,
} from '../src/index.js';

describe('framework-server', () => {
  describe('smoke test', () => {
    it('should export server version', () => {
      expect(FRAMEWORK_SERVER_VERSION).toBe('1.0.0');
    });

    it('should export default runtime config', () => {
      expect(DEFAULT_RUNTIME_CONFIG.maxParticipants).toBe(2);
      expect(DEFAULT_RUNTIME_CONFIG.tickEnabled).toBe(false);
    });

    it('should allow creating custom runtime config', () => {
      const config: SessionRuntimeConfig = {
        maxParticipants: 2,
        tickEnabled: true,
        tickIntervalMs: 16,
      };
      expect(config.tickEnabled).toBe(true);
    });
  });
});
