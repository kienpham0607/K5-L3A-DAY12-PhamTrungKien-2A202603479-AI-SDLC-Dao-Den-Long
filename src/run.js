#!/usr/bin/env node
/**
 * Unified run entry (Contract v1.3 run_cmd).
 *   node src/run.js                         → vite dev
 *   node src/run.js --export-leaderboard out.json
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportLeaderboard } from './leaderboard/store.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function parse(argv) {
  const out = { exportLeaderboard: null };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--export-leaderboard') {
      out.exportLeaderboard = argv[++i] || 'leaderboard-export.json';
    }
  }
  return out;
}

const opts = parse(process.argv);

if (opts.exportLeaderboard) {
  const payload = exportLeaderboard(opts.exportLeaderboard);
  process.stdout.write(`Exported ${payload.entries.length} entries → ${opts.exportLeaderboard}\n`);
  process.exitCode = 0;
} else {
  const child = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['vite'],
    { cwd: root, stdio: 'inherit', shell: true },
  );
  child.on('exit', (code) => {
    process.exitCode = code ?? 0;
  });
}
