import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultWorld, applyScenario } from '../../src/sim/stubWorld.js';
import { applyPickup } from '../../src/sim/systems/pickup.js';
import { TUNING } from '../../src/shared/tuning.js';

describe('applyPickup (Phase 2 standardized)', () => {
  it('picks mote within pickup_radius (1m) and increments carried', () => {
    const world = createDefaultWorld();
    applyScenario(world, {
      random_motes: false,
      motes: [[0, 0, 1]],
      shades: [],
    });
    const events = applyPickup(world, TUNING);
    assert.equal(events.length, 1);
    assert.equal(events[0].name, 'mote_picked');
    assert.equal(events[0].data.carried, 1);
    assert.equal(world.player.carried, 1);
    assert.equal(world.motes[0].active, false);
  });

  it('does not pick when beyond radius or height > 1.5m', () => {
    const world = createDefaultWorld();
    applyScenario(world, {
      random_motes: false,
      motes: [[0, 0, 5], [0, 2.0, 0.2]],
      shades: [],
    });
    const events = applyPickup(world, TUNING);
    assert.equal(events.length, 0);
    assert.equal(world.player.carried, 0);
  });

  it('respects carry_capacity (10)', () => {
    const world = createDefaultWorld();
    applyScenario(world, {
      player: { carried: TUNING.carry_capacity },
      random_motes: false,
      motes: [[0, 0, 0.5]],
      shades: [],
    });
    const events = applyPickup(world, TUNING);
    assert.equal(events.length, 0);
    assert.equal(world.player.carried, TUNING.carry_capacity);
    assert.equal(world.motes[0].active, true);
  });
});
