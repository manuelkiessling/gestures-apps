import { describe, expect, it } from 'vitest';
import { type ClientConfig, type ConnectionState, FRAMEWORK_CLIENT_VERSION } from '../src/index.js';

describe('framework-client', () => {
  describe('smoke test', () => {
    it('should export client version', () => {
      expect(FRAMEWORK_CLIENT_VERSION).toBe('1.0.0');
    });

    it('should allow creating client config', () => {
      const config: ClientConfig = {
        wsUrl: 'wss://example.com/ws',
        lobbyUrl: 'https://lobby.example.com',
      };
      expect(config.wsUrl).toBe('wss://example.com/ws');
      expect(config.lobbyUrl).toBe('https://lobby.example.com');
    });

    it('should allow null lobby URL', () => {
      const config: ClientConfig = {
        wsUrl: 'ws://localhost:3001',
        lobbyUrl: null,
      };
      expect(config.lobbyUrl).toBeNull();
    });

    it('should export connection state type', () => {
      const states: ConnectionState[] = ['disconnected', 'connecting', 'connected'];
      expect(states).toHaveLength(3);
    });
  });
});
