import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeFpsMetrics } from '../../src/bench/metrics.js';
import { createBenchWorld } from '../../src/sim/benchWorld.js';
import { step } from '../../src/sim/step.js';
import { TUNING } from '../../src/shared/tuning.js';
import { upsertEntry, validateName, toExportJson } from '../../src/shared/leaderboard.js';
import { exportLeaderboard, saveLeaderboardFile, projectLeaderboardPath } from '../../src/leaderboard/store.js';
import { findKeybindConflicts, DEFAULT_KEYBINDS } from '../../src/view/settings.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const IDLE = {
  move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false, pause: false,
};

describe('Phase 4 metrics & bench world', () => {
  it('computeFpsMetrics matches contract formulas', () => {
    const dts = Array.from({ length: 100 }, () => 16);
    const m = computeFpsMetrics(dts);
    assert.equal(m.frames, 100);
    assert.ok(Math.abs(m.avg_fps - 62.5) < 0.2);
    assert.ok(m.p1_low_fps > 0);
    assert.ok(m.frame_ms_p95 >= 16);
  });

  it('bench world has 200 shades wander, 100 motes, L1-L3 lit, no gameplay side effects', () => {
    const w = createBenchWorld(42);
    assert.equal(w.benchMode, true);
    assert.equal(w.shades.length, 200);
    assert.equal(w.motes.filter((m) => m.active).length, 100);
    assert.equal(w.lanterns.filter((l) => l.lit).length, 3);
    assert.deepEqual(w.player.pos, [0, 0, 0]);
    const beforeFuel = w.lanterns.find((l) => l.id === 'L1').fuelUnits;
    for (let i = 0; i < 120; i += 1) step(w, IDLE, TUNING);
    assert.equal(w.state, 'playing');
    assert.equal(w.lanterns.find((l) => l.id === 'L1').fuelUnits, beforeFuel);
    assert.ok(w.shades.every((s) => s.state === 'wander'));
    assert.deepEqual(w.player.pos, [0, 0, 0]);
  });
});

describe('Phase 4 leaderboard', () => {
  it('validates names and keeps top 10 sorted', () => {
    assert.equal(validateName('Ab'), false);
    assert.equal(validateName('Player_01'), true);
    let board = { entries: [] };
    for (let i = 0; i < 12; i += 1) {
      board = {
        entries: upsertEntry(board, {
          name: `P_${i}`,
          score: i * 10,
          nights_won: i % 4,
          achieved_at: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00+07:00`,
          seed: i,
        }).entries,
      };
    }
    assert.equal(board.entries.length, 10);
    assert.equal(board.entries[0].score, 110);
    assert.ok(board.entries[0].score >= board.entries[9].score);
  });

  it('export-leaderboard writes entries JSON', () => {
    const path = projectLeaderboardPath(root);
    saveLeaderboardFile({
      entries: [{
        name: 'May_01', score: 900, nights_won: 3,
        achieved_at: '2026-11-20T10:00:00+07:00', seed: 42,
      }],
    }, path);
    const out = join(root, 'tests/.out/lb_export.json');
    const payload = exportLeaderboard(out);
    assert.equal(payload.entries.length, 1);
    assert.equal(payload.entries[0].name, 'May_01');
    assert.deepEqual(toExportJson(payload), payload);
    if (existsSync(out)) unlinkSync(out);
  });
});

describe('Phase 4 accessibility helpers', () => {
  it('detects keybind conflicts', () => {
    const bad = { ...DEFAULT_KEYBINDS, jump: 'KeyW' };
    const c = findKeybindConflicts(bad);
    assert.ok(c.length >= 1);
  });
});
