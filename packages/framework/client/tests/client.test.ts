import { describe, expect, it } from 'vitest';
import {
  type ConnectionState,
  DEFAULT_CLIENT_CONFIG,
  FRAMEWORK_CLIENT_VERSION,
  type SessionClientConfig,
} from '../src/index.js';

describe('framework-client', () => {
  describe('smoke test', () => {
    it('should export client version', () => {
      expect(FRAMEWORK_CLIENT_VERSION).toBe('1.0.0');
    });

    it('should export default client config', () => {
      expect(DEFAULT_CLIENT_CONFIG.autoReconnect).toBe(false);
      expect(DEFAULT_CLIENT_CONFIG.reconnectDelayMs).toBe(1000);
      expect(DEFAULT_CLIENT_CONFIG.maxReconnectAttempts).toBe(5);
    });

    it('should allow creating custom client config', () => {
      const config: SessionClientConfig = {
        autoReconnect: true,
        reconnectDelayMs: 500,
        maxReconnectAttempts: 3,
      };
      expect(config.autoReconnect).toBe(true);
    });

    it('should export connection state type', () => {
      const states: ConnectionState[] = ['disconnected', 'connecting', 'connected', 'error'];
      expect(states).toHaveLength(4);
    });
  });
});
