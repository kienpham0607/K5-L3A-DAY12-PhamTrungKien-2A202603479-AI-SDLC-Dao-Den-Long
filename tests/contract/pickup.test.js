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

describe('T-pickup (Contract mote_picked)', () => {
  it('picks nearby mote on first step; updates carried & motes_active', () => {
    const out = join(outDir, 'pickup_near.jsonl');
    if (existsSync(out)) unlinkSync(out);

    const r = runCli([
      '--seed', '1',
      '--night', '1',
      '--scenario', 'tests/scenarios/pickup_near.json',
      '--ticks', '5',
      '--out', out,
      '--snapshot-every', '1',
    ]);
    assert.equal(r.status, 0, r.stderr);

    const lines = parseJsonl(readFileSync(out, 'utf8'));
    const snap0 = lines.find((l) => l.type === 'snapshot' && l.tick === 0);
    assert.equal(snap0.motes_active, 1);
    assert.equal(snap0.player.carried, 0);

    const picked = lines.find((l) => l.type === 'event' && l.name === 'mote_picked');
    assert.ok(picked, 'expected mote_picked event');
    assert.equal(picked.tick, 1);
    assert.equal(picked.data.carried, 1);

    const snap1 = lines.find((l) => l.type === 'snapshot' && l.tick === 1);
    assert.equal(snap1.player.carried, 1);
    assert.equal(snap1.motes_active, 0);
  });

  it('walks to mote at z=5 and picks within pickup_radius (1m)', () => {
    const out = join(outDir, 'pickup_walk.jsonl');
    const r = runCli([
      '--seed', '1',
      '--night', '1',
      '--scenario', 'tests/scenarios/pickup_walk.json',
      '--inputs', 'tests/inputs/move_forward.json',
      '--ticks', '60',
      '--out', out,
      '--snapshot-every', '60',
    ]);
    assert.equal(r.status, 0, r.stderr);
    const lines = parseJsonl(readFileSync(out, 'utf8'));
    const picked = lines.find((l) => l.type === 'event' && l.name === 'mote_picked');
    assert.ok(picked);
    assert.ok(picked.tick >= 1 && picked.tick <= 60);
    const endSnap = lines.find((l) => l.type === 'snapshot' && l.tick === 60);
    assert.equal(endSnap.player.carried, 1);
    assert.equal(endSnap.motes_active, 0);
  });

  it('does not pick when already at carry_capacity (10)', () => {
    const out = join(outDir, 'pickup_cap.jsonl');
    const r = runCli([
      '--seed', '1',
      '--night', '1',
      '--scenario', 'tests/scenarios/pickup_capacity.json',
      '--ticks', '5',
      '--out', out,
      '--snapshot-every', '5',
    ]);
    assert.equal(r.status, 0, r.stderr);
    const lines = parseJsonl(readFileSync(out, 'utf8'));
    assert.equal(lines.filter((l) => l.name === 'mote_picked').length, 0);
    const snap5 = lines.find((l) => l.type === 'snapshot' && l.tick === 5);
    assert.equal(snap5.player.carried, TUNING.carry_capacity);
    assert.equal(snap5.motes_active, 2);
  });
});
