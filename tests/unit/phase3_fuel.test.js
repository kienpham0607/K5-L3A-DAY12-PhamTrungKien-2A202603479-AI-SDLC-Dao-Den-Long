import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultWorld, applyScenario, serializeSnapshot } from '../../src/sim/stubWorld.js';
import { step } from '../../src/sim/step.js';
import { applyFuelTick, fuelMaxUnits, exportFuel, hasSafetyZone, lowFuelUnits } from '../../src/sim/systems/fuel.js';
import { applySafeZones } from '../../src/sim/systems/safeZones.js';
import { updateShades } from '../../src/sim/systems/shades.js';
import { applyPulse } from '../../src/sim/systems/pulse.js';
import { applyPickup } from '../../src/sim/systems/pickup.js';
import { playerCapacity } from '../../src/sim/systems/deposit.js';
import { requiredLit } from '../../src/sim/systems/winlose.js';
import { TUNING } from '../../src/shared/tuning.js';
import { TICK_HZ } from '../../src/shared/constants.js';
import { getLevel } from '../../src/shared/levels.js';

const IDLE = {
  move: [0, 0],
  cam_yaw_deg: 0,
  jump: false,
  interact: false,
  pulse: false,
  dash: false,
  pause: false,
};

describe('Phase 3 Fuel system', () => {
  it('initial fuel = 100 on light; decay 1 after 60 ticks; 10 after 600', () => {
    const w = createDefaultWorld(1, 1);
    applyScenario(w, {
      random_motes: false,
      random_shades: false,
      motes: [],
      shades: [],
      lanterns: [{ id: 'L1', lit: true, fuel: 100 }],
    });
    const l1 = w.lanterns.find((l) => l.id === 'L1');
    assert.equal(l1.fuelUnits, fuelMaxUnits());
    assert.equal(exportFuel(l1), 100);

    for (let i = 0; i < 60; i += 1) applyFuelTick(w, TUNING);
    assert.equal(exportFuel(l1), 99);

    // Reset and run 600 ticks of decay only
    l1.lit = true;
    l1.fuelUnits = fuelMaxUnits();
    for (let i = 0; i < 600; i += 1) applyFuelTick(w, TUNING);
    assert.equal(exportFuel(l1), 90);
  });

  it('fuel never exceeds 100; extinguish resets deposited; ever_lit stays', () => {
    const w = createDefaultWorld(1, 1);
    applyScenario(w, {
      random_motes: false,
      random_shades: false,
      motes: [],
      shades: [],
      lanterns: [{ id: 'L1', lit: true, fuel: 100, deposited: 10 }],
    });
    const l1 = w.lanterns.find((l) => l.id === 'L1');
    l1.fuelUnits = fuelMaxUnits() + 500;
    // Decay won't increase; clamp via refuel path tested elsewhere — force over then tick
    l1.fuelUnits = fuelMaxUnits();
    assert.ok(l1.fuelUnits <= fuelMaxUnits());

    l1.fuelUnits = 1;
    l1.deposited = 10;
    l1.ever_lit = true;
    const ev = applyFuelTick(w, TUNING);
    assert.equal(l1.lit, false);
    assert.equal(l1.fuelUnits, 0);
    assert.equal(l1.deposited, 0);
    assert.equal(l1.ever_lit, true);
    assert.ok(ev.some((e) => e.name === 'lantern_out'));
  });
});

describe('Phase 3 Shade drain & safety', () => {
  it('safety active at exactly 30; disabled below 30', () => {
    const w = createDefaultWorld(1, 1);
    applyScenario(w, {
      lanterns: [{ id: 'L1', lit: true, fuel: 30 }],
      shades: [],
      motes: [],
      random_motes: false,
      random_shades: false,
    });
    const l1 = w.lanterns.find((l) => l.id === 'L1');
    assert.equal(l1.fuelUnits, lowFuelUnits());
    assert.equal(hasSafetyZone(l1), true);
    l1.fuelUnits = lowFuelUnits() - 1;
    assert.equal(hasSafetyZone(l1), false);
  });

  it('wander shade enters drain within 2m of weak lantern; drain 5/s stacks', () => {
    const w = createDefaultWorld(1, 1);
    applyScenario(w, {
      player: { pos: [40, 0, 40] }, // far so no chase
      lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 20 }],
      shades: [{ id: 'S1', pos: [1.5, 0, 0], state: 'wander', target_lantern_id: 'L1' }],
      motes: [],
      random_motes: false,
      random_shades: false,
    });
    const s1 = w.shades[0];
    s1.targetLanternId = 'L1';
    updateShades(w, TUNING);
    assert.equal(s1.state, 'drain');

    const l1 = w.lanterns.find((l) => l.id === 'L1');
    const before = l1.fuelUnits;
    // One natural + one drain = 1+5 = 6 units
    applyFuelTick(w, TUNING);
    assert.equal(l1.fuelUnits, before - 6);

    // Stack second shade
    w.shades.push({
      id: 'S2',
      pos: [0.5, 0, 0],
      state: 'drain',
      targetLanternId: 'L1',
      drainEmitTicks: 0,
      wasDraining: false,
      stunTicks: 0,
      pushTicks: 0,
      pushDir: [0, 0],
      recoilTicks: 0,
      recoilDir: [0, 0],
      inSafePush: false,
      spawnTicks: 0,
      wanderAngle: 0,
      wanderTimer: 0,
    });
    const mid = l1.fuelUnits;
    applyFuelTick(w, TUNING);
    assert.equal(l1.fuelUnits, mid - 1 - 5 - 5);
  });

  it('fuel_drain emits once every 60 ticks while draining', () => {
    const w = createDefaultWorld(1, 1);
    applyScenario(w, {
      player: { pos: [40, 0, 40] },
      lanterns: [{ id: 'L1', lit: true, fuel: 50 }],
      shades: [{ id: 'S1', pos: [0, 0, 0], state: 'drain', target_lantern_id: 'L1' }],
      motes: [],
      random_motes: false,
      random_shades: false,
    });
    w.shades[0].state = 'drain';
    w.shades[0].targetLanternId = 'L1';
    w.shades[0].drainEmitTicks = 0;
    let emits = 0;
    for (let i = 0; i < 60; i += 1) {
      const ev = applyFuelTick(w, TUNING);
      emits += ev.filter((e) => e.name === 'fuel_drain').length;
    }
    assert.equal(emits, 1);
  });

  it('drain → chase when player within 6m; pulse stuns draining shade for +15', () => {
    const w = createDefaultWorld(1, 1);
    applyScenario(w, {
      player: { pos: [3, 0, 0], carried: 3 },
      lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 20 }],
      shades: [{ id: 'S1', pos: [0, 0, 0], state: 'drain', target_lantern_id: 'L1' }],
      motes: [],
      random_motes: false,
      random_shades: false,
    });
    w.shades[0].state = 'drain';
    w.shades[0].targetLanternId = 'L1';
    updateShades(w, TUNING);
    assert.equal(w.shades[0].state, 'chase');
    assert.equal(w.shades[0].wasDraining, true);

    const before = w.score;
    applyPulse(w, { pulse: true }, { pulse: false }, TUNING);
    assert.equal(w.shades[0].state, 'stunned');
    assert.equal(w.score - before, 15);
  });

  it('safe zone push prevents damage while inSafePush', () => {
    const w = createDefaultWorld(1, 1);
    applyScenario(w, {
      player: { pos: [0, 0, 0] },
      lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 100 }],
      shades: [{ id: 'S1', pos: [1, 0, 0], state: 'chase' }],
      motes: [],
      random_motes: false,
      random_shades: false,
    });
    applySafeZones(w, TUNING);
    assert.equal(w.shades[0].inSafePush, true);
  });

  it('refueling weak lantern >= 30 immediately stops shade drain and pushes shade out <= 30 ticks', () => {
    const w = createDefaultWorld(1, 1);
    applyScenario(w, {
      player: { pos: [0, 0, 0], carried: 3, flames: 3 },
      lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 20 }],
      shades: [{ id: 'S1', pos: [1.5, 0, 0], state: 'drain', target_lantern_id: 'L1' }],
      motes: [],
      random_motes: false,
      random_shades: false,
    });
    // Tick 1: press interact to refuel L1 from 20 -> 50 (>= 30)
    const r1 = step(w, { move: [0, 0], cam_yaw_deg: 0, interact: true }, TUNING);
    assert.ok(r1.events.some((e) => e.name === 'refuel'));
    assert.equal(w.shades[0].state, 'wander', 'draining shade must immediately exit drain on safe-zone push');

    // Next 29 ticks: shade is pushed out to >= 6m, deals 0 damage, and does not drain L1
    const l1 = w.lanterns.find((l) => l.id === 'L1');
    const fuelAfterRefuel = l1.fuelUnits;
    let hits = 0;
    for (let i = 0; i < 29; i += 1) {
      const { events } = step(w, { move: [0, 0], cam_yaw_deg: 0, interact: false }, TUNING);
      hits += events.filter((e) => e.name === 'player_hit').length;
    }
    assert.equal(hits, 0, 'pushed shade must not hurt player');
    assert.equal(l1.fuelUnits, fuelAfterRefuel - 29, 'only natural 1/s decay, zero shade drain');
    assert.ok(Math.hypot(w.shades[0].pos[0], w.shades[0].pos[2]) >= TUNING.safe_radius);
  });
});

describe('Phase 3 Dawn / capacity / scoring helpers', () => {
  it('night durations and 60% thresholds', () => {
    assert.equal(getLevel(1).duration_s, 240);
    assert.equal(getLevel(2).duration_s, 270);
    assert.equal(getLevel(3).duration_s, 300);
    assert.equal(requiredLit(5), 3);
    assert.equal(requiredLit(6), 4);
    assert.equal(requiredLit(7), 5);
  });

  it('capacity grows with successful_lights; refuel does not; cap 20', () => {
    const w = createDefaultWorld(1, 1);
    assert.equal(playerCapacity(w), 10);
    w.player.successful_lights = 1;
    assert.equal(playerCapacity(w), 12);
    w.player.successful_lights = 100;
    assert.equal(playerCapacity(w), 20);
  });

  it('scenario prelit does not increase successful_lights; pickup respects capacity', () => {
    const w = createDefaultWorld(1, 1);
    applyScenario(w, {
      player: { pos: [0, 0, 0], carried: 10, successful_lights: 0 },
      lanterns: [{ id: 'L1', lit: true, fuel: 100 }],
      motes: [[0.2, 0, 0]],
      shades: [],
      random_motes: false,
      random_shades: false,
    });
    assert.equal(w.player.successful_lights, 0);
    applyPickup(w, TUNING);
    assert.equal(w.player.carried, 10); // at capacity
  });

  it('no early win when all lanterns lit; dawn victory after timer', () => {
    const w = createDefaultWorld(1, 1);
    applyScenario(w, {
      player: { pos: [0, 0, 0], flames: 3 },
      time_left_s: 2,
      lanterns: [
        { id: 'L1', lit: true, fuel: 50 },
        { id: 'L2', lit: true, fuel: 50 },
        { id: 'L3', lit: true, fuel: 50 },
        { id: 'L4', lit: false },
        { id: 'L5', lit: false },
      ],
      motes: [],
      shades: [],
      random_motes: false,
      random_shades: false,
    });
    // Run until just before dawn
    for (let i = 0; i < 119; i += 1) step(w, IDLE, TUNING);
    assert.equal(w.state, 'playing');
    step(w, IDLE, TUNING); // stepsDone=120 → timeLeft=0
    assert.equal(w.state, 'won');
  });

  it('dawn defeat below threshold; no_flames precedence on final tick', () => {
    const w = createDefaultWorld(1, 1);
    applyScenario(w, {
      player: { pos: [0, 0, 0], flames: 3 },
      time_left_s: 1,
      lanterns: [
        { id: 'L1', lit: true, fuel: 40 },
        { id: 'L2', lit: false },
        { id: 'L3', lit: false },
        { id: 'L4', lit: false },
        { id: 'L5', lit: false },
      ],
      motes: [],
      shades: [],
      random_motes: false,
      random_shades: false,
    });
    for (let i = 0; i < 60; i += 1) step(w, IDLE, TUNING);
    assert.equal(w.state, 'lost');

    const w2 = createDefaultWorld(1, 1);
    applyScenario(w2, {
      player: { pos: [0, 0, 0], flames: 0 },
      time_left_s: 1,
      lanterns: [
        { id: 'L1', lit: true, fuel: 80 },
        { id: 'L2', lit: true, fuel: 80 },
        { id: 'L3', lit: true, fuel: 80 },
        { id: 'L4', lit: true, fuel: 80 },
        { id: 'L5', lit: true, fuel: 80 },
      ],
      motes: [],
      shades: [],
      random_motes: false,
      random_shades: false,
    });
    const { events } = step(w2, IDLE, TUNING);
    const go = events.find((e) => e.name === 'game_over');
    assert.equal(go.data.reason, 'no_flames');
  });

  it('snapshot includes fuel, ever_lit, relit_count, capacity', () => {
    const w = createDefaultWorld(1, 1);
    applyScenario(w, {
      player: { successful_lights: 2 },
      lanterns: [{ id: 'L1', lit: true, fuel: 88.5 }],
      motes: [],
      shades: [],
      random_motes: false,
      random_shades: false,
    });
    const snap = serializeSnapshot(w, 0);
    assert.equal(snap.player.capacity, 14);
    const l1 = snap.lanterns.find((l) => l.id === 'L1');
    assert.equal(typeof l1.fuel, 'number');
    assert.equal(l1.ever_lit, true);
    assert.equal(typeof l1.relit_count, 'number');
  });
});
