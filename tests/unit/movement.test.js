import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { worldMoveFromInput, round3 } from '../../src/sim/math.js';
import { applyMovement } from '../../src/sim/systems/movement.js';
import { createDefaultWorld } from '../../src/sim/stubWorld.js';
import { TUNING } from '../../src/shared/tuning.js';
import { TICK_HZ } from '../../src/shared/constants.js';

describe('worldMoveFromInput (Contract C)', () => {
  it('θ=0: move [0,1] → +Z', () => {
    assert.deepEqual(worldMoveFromInput([0, 1], 0), [0, 1]);
  });

  it('θ=0: move [1,0] → +X', () => {
    assert.deepEqual(worldMoveFromInput([1, 0], 0), [1, 0]);
  });

  it('θ=90: move [0,1] → +X', () => {
    const [x, z] = worldMoveFromInput([0, 1], 90);
    assert.ok(Math.abs(x - 1) < 1e-9);
    assert.ok(Math.abs(z - 0) < 1e-9);
  });

  it('normalizes vectors longer than 1', () => {
    const [x, z] = worldMoveFromInput([3, 4], 0);
    assert.ok(Math.abs(Math.hypot(x, z) - 1) < 1e-9);
    assert.ok(Math.abs(x - 0.6) < 1e-9);
    assert.ok(Math.abs(z - 0.8) < 1e-9);
  });
});

describe('applyMovement (Phase 2 standardized physics)', () => {
  it('reaches full player_speed (6 m/s) within 0.1s (6 ticks) and advances +Z', () => {
    const world = createDefaultWorld();
    const inp = { move: [0, 1], cam_yaw_deg: 0 };
    for (let i = 0; i < 6; i += 1) {
      applyMovement(world, inp, inp, TUNING);
    }
    assert.equal(round3(world.player.vel[2]), TUNING.player_speed);
    const zBefore = world.player.pos[2];
    applyMovement(world, inp, inp, TUNING);
    assert.equal(round3(world.player.pos[2] - zBefore), round3(TUNING.player_speed / TICK_HZ));
  });
});
