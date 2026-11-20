import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

describe('Contract v1.1 CLI, Schema, Scenarios & Benchmark', () => {
  it('supports --night 1, 2, 3 and rejects invalid --night 4', () => {
    for (const night of [1, 2, 3]) {
      const out = join(outDir, `v11_n${night}.jsonl`);
      const r = runCli(['--seed', '1', '--night', String(night), '--ticks', '20', '--out', out, '--snapshot-every', '10']);
      assert.equal(r.status, 0, r.stderr);
      const lines = parseJsonl(readFileSync(out, 'utf8'));
      const snap0 = lines.find((l) => l.type === 'snapshot' && l.tick === 0);
      const startEv = lines.find((l) => l.type === 'event' && l.name === 'night_start');
      assert.ok(snap0 && startEv);
      assert.equal(snap0.night, night);
      assert.equal(startEv.data.night, night);
      assert.ok(snap0.wind && typeof snap0.wind.active === 'boolean');
      assert.ok(Array.isArray(snap0.player.vel));
      assert.equal(typeof snap0.player.grounded, 'boolean');
      assert.equal(typeof snap0.player.invuln, 'boolean');
      assert.equal(typeof snap0.player.dash_cd_s, 'number');
      assert.equal(typeof snap0.player.pulse_cd_s, 'number');
      assert.equal(typeof snap0.player.charm_s, 'number');
      assert.ok(Array.isArray(snap0.motes));
      assert.ok(Array.isArray(snap0.drifters));
      assert.ok(Array.isArray(snap0.charms));
    }

    const bad = runCli(['--seed', '1', '--night', '4', '--ticks', '10', '--out', join(outDir, 'bad.jsonl')]);
    assert.notEqual(bad.status, 0);
  });

  it('headless scenario: jump + mid-air dash (p2_dash_jump)', () => {
    const out = join(outDir, 'p2_dash_jump.jsonl');
    const r = runCli([
      '--seed', '1', '--night', '1',
      '--scenario', 'tests/scenarios/p2_dash_jump.json',
      '--inputs', 'tests/inputs/p2_dash_jump.json',
      '--ticks', '30', '--out', out, '--snapshot-every', '5',
    ]);
    assert.equal(r.status, 0, r.stderr);
    const lines = parseJsonl(readFileSync(out, 'utf8'));
    assert.ok(lines.some((l) => l.name === 'dash'));
    const snap10 = lines.find((l) => l.type === 'snapshot' && l.tick === 10);
    assert.ok(snap10.player.dash_cd_s > 1.0);
  });

  it('headless scenario: Night 2 jump pad launch', () => {
    const out = join(outDir, 'p2_n2_pad.jsonl');
    const r = runCli([
      '--seed', '1', '--night', '2',
      '--scenario', 'tests/scenarios/p2_night2_jump_pad.json',
      '--ticks', '60', '--out', out, '--snapshot-every', '10',
    ]);
    assert.equal(r.status, 0, r.stderr);
    const lines = parseJsonl(readFileSync(out, 'utf8'));
    const snap10 = lines.find((l) => l.type === 'snapshot' && l.tick === 10);
    assert.ok(snap10.player.pos[0] > 23 && snap10.player.pos[1] > 1.5);
  });

  it('headless scenario: Night 2 Drifter steal', () => {
    const out = join(outDir, 'p2_n2_drifter.jsonl');
    const r = runCli([
      '--seed', '1', '--night', '2',
      '--scenario', 'tests/scenarios/p2_night2_drifter_steal.json',
      '--ticks', '30', '--out', out, '--snapshot-every', '10',
    ]);
    assert.equal(r.status, 0, r.stderr);
    const lines = parseJsonl(readFileSync(out, 'utf8'));
    const steal = lines.find((l) => l.name === 'drifter_steal');
    assert.ok(steal);
    assert.equal(steal.data.stolen, 3);
  });

  it('headless scenario: Night 2 Wind Charm + double dash (0s cooldown)', () => {
    const out = join(outDir, 'p2_n2_charm.jsonl');
    const r = runCli([
      '--seed', '1', '--night', '2',
      '--scenario', 'tests/scenarios/p2_night2_charm.json',
      '--inputs', 'tests/inputs/p2_double_dash.json',
      '--ticks', '30', '--out', out, '--snapshot-every', '10',
    ]);
    assert.equal(r.status, 0, r.stderr);
    const lines = parseJsonl(readFileSync(out, 'utf8'));
    assert.ok(lines.some((l) => l.name === 'charm_picked'));
    assert.equal(lines.filter((l) => l.name === 'dash').length, 2);
  });

  it('headless scenario: Pause & Resume freezes sim_tick', () => {
    const out = join(outDir, 'p2_pause.jsonl');
    const r = runCli([
      '--seed', '1', '--night', '1',
      '--scenario', 'tests/scenarios/minimal.json',
      '--inputs', 'tests/inputs/p2_pause_resume.json',
      '--ticks', '30', '--out', out, '--snapshot-every', '10',
    ]);
    assert.equal(r.status, 0, r.stderr);
    const lines = parseJsonl(readFileSync(out, 'utf8'));
    assert.ok(lines.some((l) => l.name === 'paused'));
    assert.ok(lines.some((l) => l.name === 'resumed'));
    const snap20 = lines.find((l) => l.type === 'snapshot' && l.tick === 20);
    assert.equal(snap20.paused, true);
    assert.equal(snap20.sim_tick, 5);
  });

  it('determinism: identical runs on Night 2 and Night 3 match byte-for-byte', () => {
    for (const night of [2, 3]) {
      const a = join(outDir, `det_n${night}_a.jsonl`);
      const b = join(outDir, `det_n${night}_b.jsonl`);
      assert.equal(runCli(['--seed', '99', '--night', String(night), '--ticks', '400', '--out', a, '--snapshot-every', '100']).status, 0);
      assert.equal(runCli(['--seed', '99', '--night', String(night), '--ticks', '400', '--out', b, '--snapshot-every', '100']).status, 0);
      assert.equal(readFileSync(a, 'utf8'), readFileSync(b, 'utf8'));
    }
  });

  it('performance benchmark: 21,600 ticks (Night 3) finishes in <= 30s', () => {
    const out = join(outDir, 'bench_21600.jsonl');
    const t0 = performance.now();
    const r = runCli([
      '--seed', '123', '--night', '3',
      '--ticks', '21600',
      '--out', out,
      '--snapshot-every', '600',
    ]);
    const elapsedMs = performance.now() - t0;
    assert.equal(r.status, 0, r.stderr);
    assert.ok(elapsedMs <= 30000, `benchmark took ${elapsedMs.toFixed(1)}ms (> 30000ms)`);
  });
});
