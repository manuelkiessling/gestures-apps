import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Express } from 'express';
import { createSessionRouter } from './routes/sessions.js';
import { SessionStore } from './services/SessionStore.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createServer(): Express {
  const app = express();
  const sessionStore = new SessionStore();

  // Middleware
  app.use(express.json());

  // API routes
  app.use('/api/sessions', createSessionRouter(sessionStore));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Serve static frontend files
  const publicDir = join(__dirname, '..', 'public');
  app.use(express.static(publicDir));

  // SPA fallback - serve index.html for all non-API routes
  // Use middleware instead of route to avoid Express 5 path-to-regexp restrictions
  app.use((req, res, next) => {
    // Skip if this is an API route
    if (req.path.startsWith('/api')) {
      return next();
    }
    // Skip if static file was found (express.static already handled it)
    // This middleware only runs if express.static didn't find a file
    res.sendFile(join(publicDir, 'index.html'));
  });

  return app;
}
