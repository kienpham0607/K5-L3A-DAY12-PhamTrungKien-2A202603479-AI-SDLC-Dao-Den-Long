import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultWorld, applyScenario } from '../../src/sim/stubWorld.js';
import { applyPulse } from '../../src/sim/systems/pulse.js';
import { updateShades } from '../../src/sim/systems/shades.js';
import { TUNING } from '../../src/shared/tuning.js';

describe('applyPulse (Phase 2 standardized: cost=3, radius=5, push over 15 ticks)', () => {
  it('stuns 120 ticks, pushes 4m over 15 ticks, spends 3 carried (not flames), scores +5', () => {
    const world = createDefaultWorld();
    applyScenario(world, {
      player: { flames: 3, carried: 4 },
      random_motes: false,
      random_shades: false,
      motes: [],
      shades: [{ id: 'S1', pos: [3, 0, 0] }],
    });
    const beforeX = world.shades[0].pos[0];
    const events = applyPulse(world, { pulse: true }, { pulse: false }, TUNING);
    assert.equal(events.length, 1);
    assert.equal(events[0].name, 'pulse');
    assert.deepEqual(events[0].data.stunned_ids, ['S1']);
    assert.equal(world.player.flames, 3);
    assert.equal(world.player.carried, 4 - TUNING.pulse_cost);
    assert.equal(world.shades[0].state, 'stunned');
    assert.equal(world.shades[0].stunTicks, 120);
    assert.equal(world.score, TUNING.score.per_stun);

    // Run 15 shade ticks -> pushed total 4m
    for (let i = 0; i < 15; i += 1) updateShades(world, TUNING);
    assert.ok(Math.abs(world.shades[0].pos[0] - (beforeX + 4)) < 0.05);
  });

  it('does nothing without edge or when carried < 3', () => {
    const world = createDefaultWorld();
    applyScenario(world, {
      player: { flames: 3, carried: 2 },
      random_motes: false,
      random_shades: false,
      motes: [],
      shades: [{ id: 'S1', pos: [2, 0, 0] }],
    });
    assert.equal(applyPulse(world, { pulse: true }, { pulse: false }, TUNING).length, 0);
    world.player.carried = 5;
    assert.equal(applyPulse(world, { pulse: true }, { pulse: true }, TUNING).length, 0);
  });
});
