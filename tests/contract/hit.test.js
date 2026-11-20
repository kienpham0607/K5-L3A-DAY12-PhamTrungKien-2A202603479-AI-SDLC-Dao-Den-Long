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
  return text
    .trim()
    .split(/\n+/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

before(() => {
  mkdirSync(outDir, { recursive: true });
});

describe('T-hit (shades + fall)', () => {
  it('shade contact → player_hit with drop and invuln blocks rapid re-hit', () => {
    const out = join(outDir, 'hit_shade.jsonl');
    const r = runCli([
      '--seed', '1',
      '--night', '1',
      '--scenario', 'tests/scenarios/hit_shade.json',
      '--ticks', '5',
      '--out', out,
      '--snapshot-every', '1',
    ]);
    assert.equal(r.status, 0, r.stderr);
    const lines = parseJsonl(readFileSync(out, 'utf8'));
    const hits = lines.filter((l) => l.name === 'player_hit');
    assert.equal(hits.length, 1);
    assert.equal(hits[0].tick, 1);
    assert.equal(hits[0].data.by, 'shade');
    assert.equal(hits[0].data.flames, 2);
    assert.equal(hits[0].data.dropped, Math.floor(4 * TUNING.hit_drop_ratio));

    const snap1 = lines.find((l) => l.type === 'snapshot' && l.tick === 1);
    assert.equal(snap1.player.flames, 2);
    assert.equal(snap1.player.carried, 2);
  });

  it('shade does not enter safe_radius of lit lantern at origin', () => {
    const out = join(outDir, 'shade_safe.jsonl');
    const r = runCli([
      '--seed', '1',
      '--night', '1',
      '--scenario', 'tests/scenarios/shade_safe.json',
      '--ticks', '300',
      '--out', out,
      '--snapshot-every', '300',
    ]);
    assert.equal(r.status, 0, r.stderr);
    const lines = parseJsonl(readFileSync(out, 'utf8'));
    assert.equal(lines.filter((l) => l.name === 'player_hit').length, 0);
    const snap = lines.find((l) => l.type === 'snapshot' && l.tick === 300);
    const s1 = snap.shades.find((s) => s.id === 'S1');
    const d = Math.hypot(s1.pos[0], s1.pos[2]);
    assert.ok(d > TUNING.safe_radius, `d=${d}`);
  });

  it('fall below Y < -10 → player_hit by fall with lost field', () => {
    const out = join(outDir, 'fall_hit.jsonl');
    const r = runCli([
      '--seed', '1',
      '--night', '1',
      '--scenario', 'tests/scenarios/fall_hit.json',
      '--ticks', '5',
      '--out', out,
      '--snapshot-every', '1',
    ]);
    assert.equal(r.status, 0, r.stderr);
    const hit = parseJsonl(readFileSync(out, 'utf8')).find((l) => l.name === 'player_hit');
    assert.ok(hit);
    assert.equal(hit.data.by, 'fall');
    assert.equal(hit.data.flames, 2);
    assert.equal(hit.data.lost, 3);
  });
});
