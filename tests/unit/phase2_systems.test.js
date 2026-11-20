import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultWorld, applyScenario } from '../../src/sim/stubWorld.js';
import { spawnDefaultsIfNeeded } from '../../src/sim/spawn.js';
import { step } from '../../src/sim/step.js';
import { getLevel } from '../../src/shared/levels.js';
import { TUNING } from '../../src/shared/tuning.js';

const IDLE = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false, pause: false };

describe('Phase 2 Levels Configuration (Night 1, 2, 3)', () => {
  it('defines exact lantern counts, durations, shade speeds, and features', () => {
    const n1 = getLevel(1);
    const n2 = getLevel(2);
    const n3 = getLevel(3);
    assert.equal(n1.lanterns.length, 5);
    assert.equal(n1.duration_s, 240);
    assert.equal(n1.shadeSpeed, 4.0);
    assert.equal(n1.hasDrifters, false);

    assert.equal(n2.lanterns.length, 6);
    assert.equal(n2.duration_s, 270);
    assert.equal(n2.islands.length, 2);
    assert.equal(n2.bridges.length, 1);
    assert.equal(n2.jumpPads.length, 2);
    assert.equal(n2.charms.length, 1);
    assert.equal(n2.hasDrifters, true);

    assert.equal(n3.lanterns.length, 7);
    assert.equal(n3.duration_s, 300);
    assert.equal(n3.shadeSpeed, 4.5);
    assert.equal(n3.tiers.length, 2);
    assert.equal(n3.ramps.length, 2);
    assert.equal(n3.obstacles.length, 1);
    assert.equal(n3.jumpPads.length, 1);
    assert.equal(n3.charms.length, 2);
    assert.equal(n3.moteSpawns.length, 30);
    assert.equal(n3.hasWind, true);
  });
});

describe('Phase 2 Jump, Dash & Cooldown', () => {
  it('jumps only when grounded, dashes at 14 m/s holding altitude in air, enforces 1.5s cooldown', () => {
    const w = createDefaultWorld(1, 1);
    applyScenario(w, { random_motes: false, random_shades: false, motes: [], shades: [] });

    // Jump on tick 1
    step(w, { ...IDLE, move: [0, 1], jump: true }, TUNING);
    assert.equal(w.player.grounded, false);
    assert.ok(w.player.vel[1] > 6.5);

    // Advance 4 ticks in air
    for (let i = 0; i < 4; i += 1) step(w, { ...IDLE, move: [0, 1] }, TUNING);
    const yBeforeDash = w.player.pos[1];
    assert.ok(yBeforeDash > 0.3);

    // Dash in air: holds altitude, speed = 14 m/s, cooldown = 90 ticks
    const { events } = step(w, { ...IDLE, move: [0, 1], dash: true }, TUNING);
    assert.ok(events.some((e) => e.name === 'dash'));
    assert.equal(w.player.vel[1], 0);
    assert.equal(w.player.pos[1], yBeforeDash);
    assert.equal(w.player.dashCdTicks, 90);

    // Next 5 ticks of dash keep Y constant
    for (let i = 0; i < 5; i += 1) step(w, { ...IDLE, move: [0, 1] }, TUNING);
    assert.equal(w.player.pos[1], yBeforeDash);

    // Cannot dash again while on cooldown
    const retry = step(w, { ...IDLE, dash: true }, TUNING);
    assert.equal(retry.events.filter((e) => e.name === 'dash').length, 0);
  });
});

describe('Phase 2 Mote & Shade Scheduled Spawning', () => {
  it('spawns initial motes, respawns on interval, and first shades at shade_first_spawn_tick', () => {
    const w = createDefaultWorld(1, 42);
    spawnDefaultsIfNeeded(w, 42, TUNING);
    const initial = Math.min(TUNING.initial_motes, w.level.moteSpawns.length);
    assert.equal(w.motes.filter((m) => m.active).length, initial);

    const until = Math.max(TUNING.mote_spawn_interval_ticks, TUNING.shade_first_spawn_tick);
    let spawned = [];
    for (let i = 0; i < until; i += 1) {
      const { events } = step(w, IDLE, TUNING);
      spawned.push(...events.filter((e) => e.name === 'shade_spawned'));
    }

    assert.ok(w.motes.filter((m) => m.active).length >= initial + 1);
    assert.equal(spawned.length, 2);
    assert.equal(w.shades.length, 2);
    for (const s of w.shades) {
      const d = Math.hypot(s.pos[0] - w.player.pos[0], s.pos[2] - w.player.pos[2]);
      assert.ok(d >= TUNING.shade_min_spawn_dist, `shade spawned too close: ${d}`);
    }
  });
});

describe('Phase 2 Safe Zone Pushout <= 30 ticks (no damage while pushed)', () => {
  it('pushes shade inside lit lantern out within 30 ticks without hurting player', () => {
    const w = createDefaultWorld(1, 1);
    applyScenario(w, {
      player: { pos: [0, 0, 0], flames: 3 },
      random_motes: false,
      random_shades: false,
      motes: [],
      lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, deposited: 10 }],
      shades: [{ id: 'S1', pos: [0.5, 0, 0], state: 'chase' }],
    });

    let hits = 0;
    for (let i = 0; i < 30; i += 1) {
      const { events } = step(w, IDLE, TUNING);
      hits += events.filter((e) => e.name === 'player_hit').length;
    }
    assert.equal(hits, 0, 'shade being pushed out of safe zone must not deal damage');
    const dist = Math.hypot(w.shades[0].pos[0], w.shades[0].pos[2]);
    assert.ok(dist >= TUNING.safe_radius, `expected shade pushed outside 6m, got ${dist}`);
  });
});

describe('Phase 2 Fall & Respawn', () => {
  it('loses 1 flame (ignoring invuln), loses all carried motes, respawns after 60 ticks with 90t invuln', () => {
    const w = createDefaultWorld(1, 1);
    applyScenario(w, {
      player: { pos: [45, -9.9, 0], vel: [0, -10, 0], grounded: false, carried: 7, flames: 3, invuln: true },
      random_motes: false,
      random_shades: false,
      motes: [],
      shades: [],
    });

    const { events } = step(w, IDLE, TUNING);
    const hit = events.find((e) => e.name === 'player_hit');
    assert.ok(hit);
    assert.equal(hit.data.by, 'fall');
    assert.equal(hit.data.flames, 2);
    assert.equal(hit.data.lost, 7);
    assert.equal(w.player.carried, 0);
    assert.equal(w.player.respawnTicks, 60);

    for (let i = 0; i < 60; i += 1) step(w, IDLE, TUNING);
    assert.deepEqual(w.player.pos, w.level.spawn);
    assert.deepEqual(w.player.vel, [0, 0, 0]);
    assert.equal(w.player.invulnTicks, 90);
  });
});

describe('Phase 2 Night 2 Bridge, Jump Pads & Wind Charm', () => {
  it('supports walking across bamboo bridge and falling off side', () => {
    const w = createDefaultWorld(2, 1);
    applyScenario(w, {
      player: { pos: [35, 0, 0], flames: 3 },
      random_motes: false,
      random_shades: false,
      random_drifters: false,
      motes: [],
      shades: [],
      charms: [],
    });
    // Walk along bridge +X -> stays grounded at Y=0
    for (let i = 0; i < 15; i += 1) step(w, { ...IDLE, move: [1, 0] }, TUNING);
    assert.equal(w.player.grounded, true);
    assert.equal(w.player.pos[1], 0);

    // Walk off bridge +Z (past z=2) -> falls
    for (let i = 0; i < 40; i += 1) step(w, { ...IDLE, move: [0, 1] }, TUNING);
    assert.equal(w.player.grounded, false);
    assert.ok(w.player.pos[1] < -0.5);
  });

  it('launches player from Night 2 Jump Pad toward Island B', () => {
    const w = createDefaultWorld(2, 1);
    applyScenario(w, {
      player: { pos: [20, 0, 18] },
      random_motes: false,
      random_shades: false,
      random_drifters: false,
      motes: [],
      shades: [],
    });
    step(w, IDLE, TUNING);
    assert.equal(w.player.launching, true);
    assert.equal(w.player.vel[1], 14);
    assert.ok(Math.abs(Math.hypot(w.player.vel[0], w.player.vel[2]) - 24) < 0.05);
    assert.ok(w.player.vel[0] > 20, 'should launch toward Island B (+X)');
  });

  it('picks Wind Charm: 7.2 m/s speed, 0s dash cd, no double-dash while active, respawns after 2700 ticks', () => {
    const w = createDefaultWorld(2, 1);
    applyScenario(w, {
      player: { pos: [35, 0, 0] },
      random_motes: false,
      random_shades: false,
      random_drifters: false,
      motes: [],
      shades: [],
    });
    const r1 = step(w, IDLE, TUNING);
    assert.ok(r1.events.some((e) => e.name === 'charm_picked'));
    assert.equal(w.player.charmTicks, 600);
    assert.equal(w.charms[0].active, false);
    assert.equal(w.charms[0].respawnTicks, 2700);

    // Accelerate to 7.2 m/s
    for (let i = 0; i < 8; i += 1) step(w, { ...IDLE, move: [1, 0] }, TUNING);
    assert.ok(Math.abs(w.player.vel[0] - 7.2) < 0.05);

    // Dash has 0 cooldown during charm, but blocked while dash is still active
    const d1 = step(w, { ...IDLE, move: [1, 0], dash: true }, TUNING);
    assert.ok(d1.events.some((e) => e.name === 'dash'));
    assert.equal(w.player.dashCdTicks, 0);
    // Try dashing mid-dash -> blocked
    step(w, { ...IDLE, move: [1, 0], dash: false }, TUNING);
    const dMid = step(w, { ...IDLE, move: [1, 0], dash: true }, TUNING);
    assert.equal(dMid.events.filter((e) => e.name === 'dash').length, 0);

    // Advance 2700 ticks total -> charm respawns
    for (let i = 0; i < 2700; i += 1) step(w, IDLE, TUNING);
    assert.equal(w.charms[0].active, true);
  });
});

describe('Phase 2 Drifter (Gió Lạc) AI & Pulse Interaction', () => {
  it('chases when carried >= 5, steals up to 3 ignoring safe zone & invuln, drops on pulse during flee', () => {
    const w = createDefaultWorld(2, 1);
    applyScenario(w, {
      player: { pos: [0, 0, 0], carried: 6, flames: 3, invuln: true },
      random_motes: false,
      random_shades: false,
      random_drifters: false,
      motes: [],
      shades: [],
      lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, deposited: 10 }],
      drifters: [{ id: 'D1', pos: [0, 0, 2], state: 'idle' }],
    });

    // Run until drifter steals
    let stealEv = null;
    for (let i = 0; i < 30; i += 1) {
      const { events } = step(w, IDLE, TUNING);
      const s = events.find((e) => e.name === 'drifter_steal');
      if (s) {
        stealEv = s;
        break;
      }
    }
    assert.ok(stealEv, 'expected drifter_steal event');
    assert.equal(stealEv.data.stolen, 3);
    assert.equal(w.player.carried, 3);
    assert.equal(w.player.flames, 3, 'drifter must never reduce flames');
    assert.equal(w.drifters[0].state, 'flee');

    // Pulse immediately while fleeing within 5m -> drifter drops all 3 stolen motes
    const { events } = step(w, { ...IDLE, pulse: true }, TUNING);
    const dropEv = events.find((e) => e.name === 'drifter_drop');
    assert.ok(dropEv, 'expected drifter_drop event');
    assert.equal(dropEv.data.dropped, 3);
    assert.equal(w.drifters[0].stolen, 0);
    // Step 7 sets fleeTicks = 120, Step 8 ticks 1 -> 119 remaining
    assert.equal(w.drifters[0].fleeTicks, 119);
  });
});

describe('Phase 2 Night 3 Multi-level Collision, Ramps, Bell Tower & Wind', () => {
  it('blocks walking through vertical Tier 2 wall & Bell Tower, allows walking up 30° ramp', () => {
    const w = createDefaultWorld(3, 1);
    applyScenario(w, {
      player: { pos: [0, 0, -9], flames: 3 },
      random_motes: false,
      random_shades: false,
      random_drifters: false,
      motes: [],
      shades: [],
    });

    // Try walking straight north (+Z) into Tier 2 (r=8, Y=6) from Y=0 -> blocked outside r=8
    for (let i = 0; i < 40; i += 1) step(w, { ...IDLE, move: [0, 1] }, TUNING);
    assert.ok(Math.hypot(w.player.pos[0], w.player.pos[2]) >= 8, 'must not walk through Tier 2 vertical wall');
    assert.equal(w.player.pos[1], 0);

    // Place on Tier 2 beside Bell Tower (r=2) and try walking into center -> blocked outside r=2
    w.player.pos = [0, 6, 3];
    w.player.vel = [0, 0, 0];
    for (let i = 0; i < 30; i += 1) step(w, { ...IDLE, move: [0, -1] }, TUNING);
    assert.ok(Math.hypot(w.player.pos[0], w.player.pos[2]) >= 2, 'must not walk through Bell Tower');

    // Walk up 30° ramp from r=30 to r=24 -> rises smoothly from Y=0 to Y=3
    const rad = (30 * Math.PI) / 180;
    w.player.pos = [Math.cos(rad) * 30, 0, Math.sin(rad) * 30];
    w.player.vel = [0, 0, 0];
    const inwardMove = [-Math.cos(rad), -Math.sin(rad)];
    for (let i = 0; i < 75; i += 1) step(w, { ...IDLE, move: inwardMove }, TUNING);
    assert.ok(w.player.pos[1] >= 2.8, `expected to climb ramp to Y=3, got Y=${w.player.pos[1]}`);
  });

  it('triggers Night 3 wind deterministically every 30s (1800t) with 2s warn and 5s gust pushing player', () => {
    const w = createDefaultWorld(3, 7);
    applyScenario(w, {
      player: { pos: [0, 0, -25] },
      random_motes: false,
      random_shades: false,
      random_drifters: false,
      motes: [],
      shades: [],
    });

    // Advance to tick 1680 (2s before 1800) -> warning active
    for (let i = 0; i < 1680; i += 1) step(w, IDLE, TUNING);
    assert.equal(w.wind.warning, true);
    assert.equal(w.wind.active, false);

    // Advance 120 more ticks (tick 1800) -> gust active
    for (let i = 0; i < 120; i += 1) step(w, IDLE, TUNING);
    assert.equal(w.wind.active, true);
    const beforePos = [...w.player.pos];

    // Advance 60 ticks during wind -> pushed ~2m
    for (let i = 0; i < 60; i += 1) step(w, IDLE, TUNING);
    const moved = Math.hypot(w.player.pos[0] - beforePos[0], w.player.pos[2] - beforePos[2]);
    assert.ok(moved > 1.8 && moved < 2.2, `expected ~2m wind push in 1s, got ${moved}`);

    // Advance 240 more ticks (end of 300-tick gust) -> wind stops
    for (let i = 0; i < 240; i += 1) step(w, IDLE, TUNING);
    assert.equal(w.wind.active, false);
  });
});

describe('Phase 2 Pause / Resume', () => {
  it('advances tick while freezing sim_tick and timers when paused', () => {
    const w = createDefaultWorld(1, 1);
    applyScenario(w, { random_motes: false, random_shades: false, motes: [], shades: [] });

    step(w, { ...IDLE, move: [0, 1] }, TUNING);
    assert.equal(w.tick, 1);
    assert.equal(w.stepsDone, 1);

    // Pause edge
    const pEv = step(w, { ...IDLE, pause: true }, TUNING);
    assert.ok(pEv.events.some((e) => e.name === 'paused'));
    assert.equal(w.paused, true);
    assert.equal(w.tick, 2);
    assert.equal(w.stepsDone, 1);

    // 10 ticks while paused -> tick increases, sim_tick stays frozen
    for (let i = 0; i < 10; i += 1) step(w, { ...IDLE, move: [0, 1] }, TUNING);
    assert.equal(w.tick, 12);
    assert.equal(w.stepsDone, 1);

    // Resume edge
    const rEv = step(w, { ...IDLE, pause: true }, TUNING);
    assert.ok(rEv.events.some((e) => e.name === 'resumed'));
    assert.equal(w.paused, false);
    assert.equal(w.stepsDone, 2);
  });
});
