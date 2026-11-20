import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
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

describe('T-pulse (cost=3, radius=5, 120t stun, 4m push over 15t)', () => {
  it('pulse stuns S1, spends 3 carried not flames, no player_hit while stunned', () => {
    const out = join(outDir, 'pulse_stun.jsonl');
    const r = runCli([
      '--seed', '1',
      '--night', '1',
      '--scenario', 'tests/scenarios/pulse_stun.json',
      '--inputs', 'tests/inputs/pulse_once.json',
      '--ticks', '60',
      '--out', out,
      '--snapshot-every', '60',
    ]);
    assert.equal(r.status, 0, r.stderr);
    const lines = parseJsonl(readFileSync(out, 'utf8'));
    const pulse = lines.find((l) => l.name === 'pulse');
    assert.ok(pulse);
    assert.equal(pulse.tick, 1);
    assert.deepEqual(pulse.data.stunned_ids, ['S1']);
    assert.equal(lines.filter((l) => l.name === 'player_hit').length, 0);

    const snap60 = lines.find((l) => l.type === 'snapshot' && l.tick === 60);
    assert.equal(snap60.player.flames, 3, 'Q must not reduce flames/HP');
    assert.equal(snap60.player.carried, 4 - TUNING.pulse_cost);
    assert.equal(snap60.shades[0].state, 'stunned');
    assert.equal(snap60.score, TUNING.score.per_stun);
    assert.ok(snap60.shades[0].pos[0] >= 6.9, `expected pushed +4m from 3, got ${snap60.shades[0].pos[0]}`);
  });

  it('no pulse when carried < pulse_cost', () => {
    const out = join(outDir, 'pulse_nofuel.jsonl');
    const r = runCli([
      '--seed', '1',
      '--night', '1',
      '--scenario', 'tests/scenarios/pulse_no_flames.json',
      '--inputs', 'tests/inputs/pulse_once.json',
      '--ticks', '5',
      '--out', out,
      '--snapshot-every', '5',
    ]);
    assert.equal(r.status, 0, r.stderr);
    const lines = parseJsonl(readFileSync(out, 'utf8'));
    assert.equal(lines.filter((l) => l.name === 'pulse').length, 0);
  });
});
