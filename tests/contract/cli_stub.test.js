import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const cli = join(root, 'src/headless/cli.js');
const proofDir = join(root, 'docs/proof/phase-1');
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
  mkdirSync(proofDir, { recursive: true });
});

describe('headless CLI stub (step 1)', () => {
  it('runs and writes snapshot0 + end (exit 0)', () => {
    const out = join(outDir, 'stub_ok.jsonl');
    if (existsSync(out)) unlinkSync(out);

    const r = runCli([
      '--seed', '1',
      '--night', '1',
      '--scenario', 'tests/scenarios/minimal.json',
      '--inputs', 'tests/inputs/idle.json',
      '--ticks', '20',
      '--out', out,
      '--snapshot-every', '10',
    ]);

    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.ok(existsSync(out));

    const lines = parseJsonl(readFileSync(out, 'utf8'));
    assert.equal(lines[0].type, 'snapshot');
    assert.equal(lines[0].tick, 0);
    assert.equal(lines[0].state, 'playing');
    assert.equal(lines[0].player.flames, 3);
    assert.equal(lines[0].motes_active, 1);
    assert.equal(lines[0].shades.length, 1);
    assert.ok(lines[0].lanterns.some((l) => l.id === 'L1'));

    const end = lines[lines.length - 1];
    assert.equal(end.type, 'end');
    assert.equal(end.ticks, 20);
    assert.equal(end.state, 'playing');

    // snapshots at 0, 10, 20
    const snaps = lines.filter((l) => l.type === 'snapshot').map((l) => l.tick);
    assert.deepEqual(snaps, [0, 10, 20]);
  });

  it('exits 2 on invalid inputs JSON', () => {
    const out = join(outDir, 'should_not_write_bad_json.jsonl');
    const r = runCli([
      '--seed', '1',
      '--night', '1',
      '--inputs', 'tests/fixtures/not_json.txt',
      '--ticks', '5',
      '--out', out,
    ]);
    assert.equal(r.status, 2, `stderr: ${r.stderr}`);
    assert.match(r.stderr, /Invalid JSON|inputs/i);
  });

  it('exits 2 when frame ticks do not strictly increase', () => {
    const out = join(outDir, 'should_not_write_bad_ticks.jsonl');
    const r = runCli([
      '--seed', '1',
      '--night', '1',
      '--inputs', 'tests/inputs/bad_ticks.json',
      '--ticks', '5',
      '--out', out,
    ]);
    assert.equal(r.status, 2, `stderr: ${r.stderr}`);
  });

  it('exits non-zero when required args missing', () => {
    const r = runCli(['--seed', '1', '--night', '1', '--ticks', '5']);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /--out/);
  });

  it('is deterministic for stub (two identical runs)', () => {
    const a = join(outDir, 'det_a.jsonl');
    const b = join(outDir, 'det_b.jsonl');
    const args = [
      '--seed', '42',
      '--night', '1',
      '--scenario', 'tests/scenarios/minimal.json',
      '--ticks', '30',
      '--out',
    ];
    const r1 = runCli([...args, a]);
    const r2 = runCli([...args, b]);
    assert.equal(r1.status, 0, r1.stderr);
    assert.equal(r2.status, 0, r2.stderr);
    assert.equal(readFileSync(a, 'utf8'), readFileSync(b, 'utf8'));
  });
});
