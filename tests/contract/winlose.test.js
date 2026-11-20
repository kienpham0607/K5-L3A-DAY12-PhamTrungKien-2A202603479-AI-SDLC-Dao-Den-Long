import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
  return text
    .trim()
    .split(/\n+/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

before(() => {
  mkdirSync(outDir, { recursive: true });
});

describe('T-win / T-lose / T-dawn (Phase 3)', () => {
  it('lighting last lantern does NOT win early (all_lit removed)', () => {
    const out = join(outDir, 'win_no_early.jsonl');
    const r = runCli([
      '--seed', '1',
      '--night', '1',
      '--scenario', 'tests/scenarios/win_all_lit.json',
      '--inputs', 'tests/inputs/interact_pulse.json',
      '--ticks', '10',
      '--out', out,
      '--snapshot-every', '10',
    ]);
    assert.equal(r.status, 0, r.stderr);
    const lines = parseJsonl(readFileSync(out, 'utf8'));
    assert.ok(lines.some((l) => l.name === 'lantern_lit'));
    assert.equal(lines.filter((l) => l.name === 'game_over').length, 0);
    const end = lines[lines.length - 1];
    assert.equal(end.state, 'playing');
  });

  it('dawn_survived when enough lanterns lit at timer end', () => {
    const scenarioPath = join(outDir, 'dawn_win_scenario.json');
    writeFileSync(
      scenarioPath,
      JSON.stringify({
        player: { pos: [0, 0, 0], flames: 3 },
        time_left_s: 1,
        random_motes: false,
        random_shades: false,
        motes: [],
        shades: [],
        lanterns: [
          { id: 'L1', lit: true, fuel: 80 },
          { id: 'L2', lit: true, fuel: 70 },
          { id: 'L3', lit: true, fuel: 60 },
          { id: 'L4', lit: false },
          { id: 'L5', lit: false },
        ],
      }),
    );
    const out = join(outDir, 'dawn_win.jsonl');
    const r = runCli([
      '--seed', '1',
      '--night', '1',
      '--scenario', scenarioPath,
      '--ticks', '120',
      '--out', out,
      '--snapshot-every', '60',
    ]);
    assert.equal(r.status, 0, r.stderr);
    const lines = parseJsonl(readFileSync(out, 'utf8'));
    const go = lines.find((l) => l.name === 'game_over');
    assert.ok(go);
    assert.deepEqual(go.data, { result: 'won', reason: 'dawn_survived' });
    assert.equal(lines[lines.length - 1].state, 'won');
    // Dawn bonuses: 3*(50+floor fuel) + 3*50 — fuel decays 1 over 60 ticks
    assert.ok(lines[lines.length - 1].score > 0);
  });

  it('flames to 0 → lost no_flames', () => {
    const out = join(outDir, 'lose_flames.jsonl');
    const r = runCli([
      '--seed', '1',
      '--night', '1',
      '--scenario', 'tests/scenarios/lose_flames.json',
      '--ticks', '10',
      '--out', out,
      '--snapshot-every', '10',
    ]);
    assert.equal(r.status, 0, r.stderr);
    const lines = parseJsonl(readFileSync(out, 'utf8'));
    const go = lines.find((l) => l.name === 'game_over');
    assert.deepEqual(go.data, { result: 'lost', reason: 'no_flames' });
    assert.equal(lines[lines.length - 1].state, 'lost');
  });

  it('time out with too few lit → lost dawn', () => {
    const out = join(outDir, 'lose_dawn.jsonl');
    const r = runCli([
      '--seed', '1',
      '--night', '1',
      '--scenario', 'tests/scenarios/lose_dawn.json',
      '--ticks', '120',
      '--out', out,
      '--snapshot-every', '60',
    ]);
    assert.equal(r.status, 0, r.stderr);
    const lines = parseJsonl(readFileSync(out, 'utf8'));
    const go = lines.find((l) => l.name === 'game_over');
    assert.deepEqual(go.data, { result: 'lost', reason: 'dawn' });
    assert.equal(lines[lines.length - 1].state, 'lost');
    assert.equal(lines[lines.length - 1].ticks, 60);
  });

  it('determinism: two identical runs match', () => {
    const a = join(outDir, 'det2_a.jsonl');
    const b = join(outDir, 'det2_b.jsonl');
    const args = [
      '--seed', '7',
      '--night', '1',
      '--scenario', 'tests/scenarios/pulse_stun.json',
      '--inputs', 'tests/inputs/pulse_once.json',
      '--ticks', '90',
      '--out',
    ];
    assert.equal(runCli([...args, a]).status, 0);
    assert.equal(runCli([...args, b]).status, 0);
    assert.equal(readFileSync(a, 'utf8'), readFileSync(b, 'utf8'));
  });
});
