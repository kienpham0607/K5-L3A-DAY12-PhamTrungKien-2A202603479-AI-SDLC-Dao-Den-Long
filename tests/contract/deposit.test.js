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

describe('T-deposit-lit (Phase 3 scoring + fuel)', () => {
  it('interact edge deposits 10 and lights L1 with +5/mote +100/lantern, relight:false', () => {
    const out = join(outDir, 'deposit_lit.jsonl');
    if (existsSync(out)) unlinkSync(out);

    const r = runCli([
      '--seed', '1',
      '--night', '1',
      '--scenario', 'tests/scenarios/deposit_lit.json',
      '--inputs', 'tests/inputs/interact_pulse.json',
      '--ticks', '5',
      '--out', out,
      '--snapshot-every', '1',
    ]);
    assert.equal(r.status, 0, r.stderr);

    const lines = parseJsonl(readFileSync(out, 'utf8'));
    const deposit = lines.find((l) => l.name === 'deposit');
    const lit = lines.find((l) => l.name === 'lantern_lit');
    assert.ok(deposit);
    assert.equal(deposit.tick, 1);
    assert.deepEqual(deposit.data, { lantern_id: 'L1', amount: 10, deposited: 10 });
    assert.ok(lit);
    assert.equal(lit.tick, 1);
    assert.equal(lit.data.lantern_id, 'L1');
    assert.equal(lit.data.relight, false);

    const snap1 = lines.find((l) => l.type === 'snapshot' && l.tick === 1);
    const l1 = snap1.lanterns.find((l) => l.id === 'L1');
    assert.equal(l1.lit, true);
    assert.equal(l1.fuel, 100);
    assert.equal(l1.ever_lit, true);
    assert.equal(snap1.player.carried, 0);
    assert.equal(snap1.player.capacity, 12);
    assert.equal(snap1.score, 10 * TUNING.score.per_mote + TUNING.score.per_lantern);
  });

  it('partial deposit scores +5/mote and does not light', () => {
    const out = join(outDir, 'deposit_partial.jsonl');
    const r = runCli([
      '--seed', '1',
      '--night', '1',
      '--scenario', 'tests/scenarios/deposit_partial.json',
      '--inputs', 'tests/inputs/interact_pulse.json',
      '--ticks', '3',
      '--out', out,
      '--snapshot-every', '3',
    ]);
    assert.equal(r.status, 0, r.stderr);
    const lines = parseJsonl(readFileSync(out, 'utf8'));
    const dep = lines.find((l) => l.name === 'deposit');
    assert.ok(dep);
    assert.equal(lines.filter((l) => l.name === 'lantern_lit').length, 0);
    const snap = lines.find((l) => l.type === 'snapshot' && l.tick === 3);
    assert.equal(snap.lanterns.find((l) => l.id === 'L1').lit, false);
    assert.equal(snap.score, dep.data.amount * TUNING.score.per_mote);
  });

  it('scenario lit:true full fuel does not emit lantern_lit or deposit on interact', () => {
    const out = join(outDir, 'deposit_prelit.jsonl');
    const r = runCli([
      '--seed', '1',
      '--night', '1',
      '--scenario', 'tests/scenarios/deposit_prelit.json',
      '--inputs', 'tests/inputs/interact_pulse.json',
      '--ticks', '3',
      '--out', out,
      '--snapshot-every', '3',
    ]);
    assert.equal(r.status, 0, r.stderr);
    const lines = parseJsonl(readFileSync(out, 'utf8'));
    assert.equal(lines.filter((l) => l.name === 'lantern_lit').length, 0);
    assert.equal(lines.filter((l) => l.name === 'deposit').length, 0);
    const snap0 = lines.find((l) => l.type === 'snapshot' && l.tick === 0);
    assert.equal(snap0.score, 0);
    assert.equal(snap0.lanterns.find((l) => l.id === 'L1').lit, true);
    assert.equal(snap0.lanterns.find((l) => l.id === 'L1').fuel, 100);
  });
});
