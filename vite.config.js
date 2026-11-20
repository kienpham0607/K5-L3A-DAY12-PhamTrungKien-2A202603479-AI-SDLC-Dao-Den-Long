import { defineConfig } from 'vite';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadLeaderboardFile,
  saveLeaderboardFile,
  leaderboardPath,
  projectLeaderboardPath,
} from './src/leaderboard/store.js';

const rootDir = dirname(fileURLToPath(import.meta.url));

function leaderboardApiPlugin() {
  return {
    name: 'dao-den-long-leaderboard-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/leaderboard')) return next();

        if (req.method === 'GET') {
          const board = loadLeaderboardFile(projectLeaderboardPath(rootDir));
          const home = loadLeaderboardFile(leaderboardPath());
          const entries = (board.entries?.length ? board : home).entries || [];
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ entries }));
          return;
        }

        if (req.method === 'PUT' || req.method === 'POST') {
          const chunks = [];
          for await (const c of req) chunks.push(c);
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
            const entries = Array.isArray(body.entries) ? body.entries : [];
            saveLeaderboardFile({ entries }, leaderboardPath());
            saveLeaderboardFile({ entries }, projectLeaderboardPath(rootDir));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, entries }));
          } catch (err) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: String(err?.message || err) }));
          }
          return;
        }

        res.statusCode = 405;
        res.end('Method Not Allowed');
      });
    },
  };
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [leaderboardApiPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        bench: resolve(rootDir, 'bench.html'),
      },
    },
  },
  server: {
    port: 5173,
  },
});
