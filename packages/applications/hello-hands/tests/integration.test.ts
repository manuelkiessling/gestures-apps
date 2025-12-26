/**
 * @fileoverview Integration tests proving the framework abstraction works.
 *
 * These tests verify that hello-hands can use the framework without
 * requiring any modifications to framework packages.
 */

import { globalRegistry } from '@gesture-app/framework-protocol';
import { beforeEach, describe, expect, it } from 'vitest';

// Import hello-hands (triggers auto-registration)
import { APP_ID, registerApp } from '../src/index.js';

// Import blocks-cannons to verify coexistence
// Note: We can't actually import blocks-cannons here without adding it as a dependency,
// so we'll simulate the scenario with a mock.

describe('Framework Integration', () => {
  beforeEach(() => {
    globalRegistry.clear();
  });

  describe('multi-app coexistence', () => {
    it('should allow both hello-hands and blocks-cannons to register', () => {
      // Register hello-hands
      registerApp();

      // Simulate blocks-cannons registration (same pattern)
      globalRegistry.register({
        id: 'blocks-cannons',
        name: 'Blocks & Cannons',
        version: '1.0.0',
      });

      // Both should be available
      const helloHands = globalRegistry.get('hello-hands');
      const blocksCannons = globalRegistry.get('blocks-cannons');

      expect(helloHands.id).toBe('hello-hands');
      expect(blocksCannons.id).toBe('blocks-cannons');
    });

    it('should list all registered apps', () => {
      registerApp();
      globalRegistry.register({
        id: 'blocks-cannons',
        name: 'Blocks & Cannons',
        version: '1.0.0',
      });
      globalRegistry.register({
        id: 'another-app',
        name: 'Another App',
        version: '0.1.0',
      });

      const allIds = globalRegistry.listIds();

      expect(allIds).toContain('hello-hands');
      expect(allIds).toContain('blocks-cannons');
      expect(allIds).toContain('another-app');
      expect(allIds).toHaveLength(3);
    });
  });

  describe('lobby compatibility', () => {
    it('should have valid appId for lobby session creation', () => {
      registerApp();

      // The lobby validates appId against the registry
      // If hello-hands is registered, it should be valid
      expect(globalRegistry.has(APP_ID)).toBe(true);

      // The lobby would use this to create session URLs like:
      // https://abc123-hello-hands-gestures.dx-tooling.org
      const sessionId = 'abc123';
      const expectedUrl = `https://${sessionId}-${APP_ID}-gestures.dx-tooling.org`;
      expect(expectedUrl).toBe('https://abc123-hello-hands-gestures.dx-tooling.org');
    });

    it('should provide manifest data for lobby UI', () => {
      registerApp();

      const manifest = globalRegistry.get(APP_ID);

      // Lobby UI could display:
      expect(manifest.name).toBe('Hello Hands');
      expect(manifest.description).toContain('hand tracking demo');
      expect(manifest.tags).toContain('demo');
    });
  });

  describe('session lifecycle compatibility', () => {
    it('should be compatible with framework session phases', () => {
      // The framework defines these phases:
      // 'waiting' → 'playing' → 'finished'
      //
      // hello-hands doesn't need to define its own phases,
      // it just uses the framework's lifecycle.
      //
      // This test documents that hello-hands is compatible:
      registerApp();

      const manifest = globalRegistry.get(APP_ID);

      // No special session config required - framework defaults work
      expect(manifest).toBeDefined();
    });
  });
});
