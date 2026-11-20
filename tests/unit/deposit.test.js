import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultWorld, applyScenario } from '../../src/sim/stubWorld.js';
import { applyDeposit, findInteractLantern } from '../../src/sim/systems/deposit.js';
import { fuelMaxUnits } from '../../src/sim/systems/fuel.js';
import { TUNING } from '../../src/shared/tuning.js';
import { TICK_HZ } from '../../src/shared/constants.js';

describe('applyDeposit (Phase 3 fuel / relight / refuel)', () => {
  it('first light: 10 motes → lit fuel 100, +5/mote +100, relight:false', () => {
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
    assert.equal(events[1].name, 'lantern_lit');
    assert.equal(events[1].data.relight, false);
    const l1 = world.lanterns.find((l) => l.id === 'L1');
    assert.equal(l1.lit, true);
    assert.equal(l1.ever_lit, true);
    assert.equal(l1.fuelUnits, fuelMaxUnits(TUNING));
    assert.equal(world.player.successful_lights, 1);
    assert.equal(world.score, 10 * 5 + 100);
  });

  it('relight costs 5 and awards +40', () => {
    const world = createDefaultWorld();
    applyScenario(world, {
      player: { pos: [0, 0, 25], carried: 5 },
      random_motes: false,
      random_shades: false,
      motes: [],
      shades: [],
      lanterns: [{ id: 'L1', pos: [0, 0, 25], lit: false, ever_lit: true, deposited: 0 }],
    });
    // Force ever_lit without fuel (unlit)
    const l1 = world.lanterns.find((l) => l.id === 'L1');
    l1.lit = false;
    l1.ever_lit = true;
    l1.fuelUnits = 0;
    l1.deposited = 0;

    const events = applyDeposit(world, { interact: true }, { interact: false }, TUNING);
    assert.equal(events.find((e) => e.name === 'lantern_lit').data.relight, true);
    assert.equal(l1.relit_count, 1);
    assert.equal(world.score, 5 * 5 + 40);
    assert.equal(world.player.successful_lights, 1);
  });

  it('refuel consumes ceil((100-fuel)/10) motes and emits refuel', () => {
    const world = createDefaultWorld();
    applyScenario(world, {
      player: { pos: [0, 0, 25], carried: 10 },
      random_motes: false,
      random_shades: false,
      motes: [],
      shades: [],
      lanterns: [{ id: 'L1', pos: [0, 0, 25], lit: true, fuel: 75 }],
    });
    const events = applyDeposit(world, { interact: true }, { interact: false }, TUNING);
    const refuel = events.find((e) => e.name === 'refuel');
    assert.ok(refuel);
    assert.equal(refuel.data.amount, 3); // ceil(25/10)=3
    assert.equal(world.player.carried, 7);
    assert.equal(world.player.successful_lights, 0);
    assert.equal(world.score, 3 * 5);
  });

  it('full lantern is not selectable', () => {
    const world = createDefaultWorld();
    applyScenario(world, {
      player: { pos: [0, 0, 25], carried: 10 },
      lanterns: [{ id: 'L1', pos: [0, 0, 25], lit: true, fuel: 100 }],
      motes: [],
      shades: [],
      random_motes: false,
      random_shades: false,
    });
    assert.equal(findInteractLantern(world, TUNING), null);
    const events = applyDeposit(world, { interact: true }, { interact: false }, TUNING);
    assert.equal(events.length, 0);
  });

  it('equal-distance tie-break picks smaller lantern id', () => {
    const world = createDefaultWorld();
    applyScenario(world, {
      player: { pos: [0, 0, 0], carried: 10 },
      lanterns: [
        { id: 'L2', pos: [1.5, 0, 0], deposited: 0 },
        { id: 'L1', pos: [-1.5, 0, 0], deposited: 0 },
      ],
      motes: [],
      shades: [],
      random_motes: false,
      random_shades: false,
    });
    // Distances equal (1.5); L1 < L2
    const pick = findInteractLantern(world, TUNING);
    assert.equal(pick.id, 'L1');
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

  it('partial deposit scores +5/mote and does not light', () => {
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
    assert.equal(world.lanterns.find((l) => l.id === 'L1').lit, false);
    assert.equal(world.score, 4 * 5);
  });
});
