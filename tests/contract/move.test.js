import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TUNING } from '../../src/shared/tuning.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const cli = join(root, 'src/headless/cli.js');
const outDir = join(root, 'tests/.out');

function runCli(args) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

function parseJsonl(text) {
  return text.trim().split(/\n+/).filter(Boolean).map((line) => JSON.parse(line));
}

before(() => {
  mkdirSync(outDir, { recursive: true });
});

describe('T-move (Contract movement with 0.1s accel)', () => {
  it('move [0,1] yaw0: reaches 6 m/s within 0.1s and advances +Z', () => {
    const out = join(outDir, 'move_forward.jsonl');
    if (existsSync(out)) unlinkSync(out);

    const r = runCli([
      '--seed', '1',
      '--night', '1',
      '--scenario', 'tests/scenarios/minimal.json',
      '--inputs', 'tests/inputs/move_forward.json',
      '--ticks', '60',
      '--out', out,
      '--snapshot-every', '60',
    ]);
    assert.equal(r.status, 0, r.stderr);

    const lines = parseJsonl(readFileSync(out, 'utf8'));
    const snap0 = lines.find((l) => l.type === 'snapshot' && l.tick === 0);
    const snap60 = lines.find((l) => l.type === 'snapshot' && l.tick === 60);
    assert.ok(snap0 && snap60);

    assert.deepEqual(snap0.player.pos, [0, 0, 0]);
    assert.equal(snap60.player.pos[0], 0);
    assert.equal(snap60.player.pos[1], 0);
    assert.equal(snap60.player.vel[2], TUNING.player_speed);
    // With 0.1s linear ramp (6 ticks), distance in 60 ticks is ~5.75m
    assert.ok(snap60.player.pos[2] > 5.5 && snap60.player.pos[2] <= 6.0);
  });

  it('move [0,1] yaw90: advances +X', () => {
    const out = join(outDir, 'move_yaw90.jsonl');
    const r = runCli([
      '--seed', '1',
      '--night', '1',
      '--inputs', 'tests/inputs/move_yaw90.json',
      '--ticks', '60',
      '--out', out,
      '--snapshot-every', '60',
    ]);
    assert.equal(r.status, 0, r.stderr);
    const snap60 = parseJsonl(readFileSync(out, 'utf8')).find((l) => l.type === 'snapshot' && l.tick === 60);
    assert.ok(snap60.player.pos[0] > 5.5 && snap60.player.pos[0] <= 6.0);
    assert.equal(snap60.player.pos[2], 0);
  });

  it('idle inputs keep player at spawn', () => {
    const out = join(outDir, 'move_idle.jsonl');
    const r = runCli([
      '--seed', '1',
      '--night', '1',
      '--inputs', 'tests/inputs/idle.json',
      '--ticks', '30',
      '--out', out,
      '--snapshot-every', '30',
    ]);
    assert.equal(r.status, 0, r.stderr);
    const snap30 = parseJsonl(readFileSync(out, 'utf8')).find((l) => l.type === 'snapshot' && l.tick === 30);
    assert.deepEqual(snap30.player.pos, [0, 0, 0]);
  });
});
