import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultWorld, applyScenario } from '../../src/sim/stubWorld.js';
import { applyDeposit } from '../../src/sim/systems/deposit.js';
import { TUNING } from '../../src/shared/tuning.js';

describe('applyDeposit (Phase 2 standardized: lantern_cost=10)', () => {
  it('deposits 10 and lights L1 with +10/mote +100/lantern score', () => {
    const world = createDefaultWorld();
    applyScenario(world, {
      player: { pos: [0, 0, 25], carried: 10 },
      random_motes: false,
      random_shades: false,
      motes: [],
      shades: [],
      lanterns: [{ id: 'L1', pos: [0, 0, 25], deposited: 0 }],
    });
    const events = applyDeposit(world, { interact: true }, { interact: false }, TUNING);
    assert.equal(events[0].name, 'deposit');
    assert.deepEqual(events[0].data, { lantern_id: 'L1', amount: 10, deposited: 10 });
    assert.equal(events[1].name, 'lantern_lit');
    assert.equal(events[1].data.lantern_id, 'L1');
    assert.equal(world.player.carried, 0);
    assert.equal(world.lanterns.find((l) => l.id === 'L1').lit, true);
    assert.equal(world.score, 10 * TUNING.score.per_mote + TUNING.score.per_lantern);
  });

  it('ignores held interact (no edge)', () => {
    const world = createDefaultWorld();
    applyScenario(world, {
      player: { pos: [0, 0, 25], carried: 10 },
      lanterns: [{ id: 'L1', pos: [0, 0, 25], deposited: 0 }],
      motes: [],
      shades: [],
      random_motes: false,
      random_shades: false,
    });
    const events = applyDeposit(world, { interact: true }, { interact: true }, TUNING);
    assert.equal(events.length, 0);
  });

  it('partial deposit scores +10/mote and does not light', () => {
    const world = createDefaultWorld();
    applyScenario(world, {
      player: { pos: [0, 0, 25], carried: 4 },
      lanterns: [{ id: 'L1', pos: [0, 0, 25], deposited: 0 }],
      motes: [],
      shades: [],
      random_motes: false,
      random_shades: false,
    });
    const events = applyDeposit(world, { interact: true }, { interact: false }, TUNING);
    assert.equal(events.length, 1);
    assert.equal(events[0].name, 'deposit');
    assert.equal(events[0].data.deposited, 4);
    assert.equal(world.lanterns.find((l) => l.id === 'L1').lit, false);
    assert.equal(world.score, 4 * TUNING.score.per_mote);
  });
});
