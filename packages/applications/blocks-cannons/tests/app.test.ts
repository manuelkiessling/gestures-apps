import { describe, expect, it } from 'vitest';
import { APP_ID, APP_MANIFEST, APP_NAME, APP_VERSION } from '../src/index.js';

describe('blocks-cannons app', () => {
  describe('smoke test', () => {
    it('should export app identifier', () => {
      expect(APP_ID).toBe('blocks-cannons');
    });

    it('should export app name', () => {
      expect(APP_NAME).toBe('Blocks & Cannons');
    });

    it('should export app version', () => {
      expect(APP_VERSION).toBe('1.0.0');
    });

    it('should export app manifest', () => {
      expect(APP_MANIFEST.id).toBe('blocks-cannons');
      expect(APP_MANIFEST.name).toBe('Blocks & Cannons');
      expect(APP_MANIFEST.version).toBe('1.0.0');
      expect(APP_MANIFEST.description).toBe('A two-player competitive hand-gesture game');
    });
  });
});
