import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultWorld, applyScenario } from '../../src/sim/stubWorld.js';
import { updateShades } from '../../src/sim/systems/shades.js';
import { applyCombat } from '../../src/sim/systems/combat.js';
import { TUNING } from '../../src/shared/tuning.js';
import { distXZ } from '../../src/sim/math.js';

describe('updateShades', () => {
  it('moves toward player', () => {
    const world = createDefaultWorld();
    applyScenario(world, {
      random_shades: false,
      shades: [{ id: 'S1', pos: [10, 0, 0] }],
      motes: [],
      random_motes: false,
    });
    const before = world.shades[0].pos[0];
    updateShades(world, TUNING);
    assert.ok(world.shades[0].pos[0] < before);
    assert.equal(world.shades[0].state, 'chase');
  });

  it('does not enter safe_radius of lit lantern', () => {
    const world = createDefaultWorld();
    applyScenario(world, {
      player: { pos: [0, 0, 0] },
      random_shades: false,
      random_motes: false,
      motes: [],
      shades: [{ id: 'S1', pos: [8, 0, 0] }],
      lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, deposited: 3 }],
    });
    for (let i = 0; i < 600; i += 1) updateShades(world, TUNING);
    const d = distXZ(world.shades[0].pos, [0, 0, 0]);
    assert.ok(d > TUNING.safe_radius, `shade entered safe zone: d=${d}`);
  });

  it('orbits instead of freezing when straight path is blocked', () => {
    const world = createDefaultWorld();
    applyScenario(world, {
      player: { pos: [-12, 0, 0] },
      random_shades: false,
      random_motes: false,
      motes: [],
      shades: [{ id: 'S1', pos: [8, 0, 0] }],
      lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, deposited: 3 }],
    });
    const start = [...world.shades[0].pos];
    let maxTravel = 0;
    for (let i = 0; i < 180; i += 1) {
      updateShades(world, TUNING);
      const p = world.shades[0].pos;
      maxTravel = Math.max(maxTravel, Math.hypot(p[0] - start[0], p[2] - start[2]));
      assert.ok(distXZ(p, [0, 0, 0]) > TUNING.safe_radius);
    }
    assert.ok(maxTravel > 1, `shade froze near start; travel=${maxTravel}`);
  });

  it('three shades approach from different directions and stay separated', () => {
    const world = createDefaultWorld();
    applyScenario(world, {
      player: { pos: [0, 0, 0] },
      random_shades: false,
      random_motes: false,
      motes: [],
      // Start stacked on purpose — AI must spread via flank + separation
      shades: [
        { id: 'S1', pos: [12, 0, 0] },
        { id: 'S2', pos: [12.1, 0, 0.05] },
        { id: 'S3', pos: [11.9, 0, -0.05] },
      ],
    });
    for (let i = 0; i < 240; i += 1) updateShades(world, TUNING);

    const [a, b, c] = world.shades;
    assert.ok(distXZ(a.pos, b.pos) > 1.5, `S1-S2 too close: ${distXZ(a.pos, b.pos)}`);
    assert.ok(distXZ(a.pos, c.pos) > 1.5, `S1-S3 too close: ${distXZ(a.pos, c.pos)}`);
    assert.ok(distXZ(b.pos, c.pos) > 1.5, `S2-S3 too close: ${distXZ(b.pos, c.pos)}`);

    // Angles around player should span (not all clustered)
    const angs = world.shades.map((s) => Math.atan2(s.pos[2], s.pos[0]));
    angs.sort((x, y) => x - y);
    const span = angs[angs.length - 1] - angs[0];
    assert.ok(span > 1.0, `angles too clustered: span=${span}`);
  });
});

describe('applyCombat', () => {
  it('emits player_hit by shade and drops floor(carried*ratio)', () => {
    const world = createDefaultWorld();
    applyScenario(world, {
      player: { pos: [0, 0, 0], carried: 4, flames: 3 },
      random_shades: false,
      random_motes: false,
      motes: [],
      shades: [{ id: 'S1', pos: [0.5, 0, 0] }],
    });
    const events = applyCombat(world, TUNING);
    assert.equal(events.length, 1);
    assert.equal(events[0].name, 'player_hit');
    assert.equal(events[0].data.by, 'shade');
    assert.equal(events[0].data.flames, 2);
    assert.equal(events[0].data.dropped, 2);
    assert.equal(world.player.carried, 2);
    assert.equal(world.motes.filter((m) => m.active).length, 2);
  });

  it('respects invulnerability', () => {
    const world = createDefaultWorld();
    applyScenario(world, {
      player: { pos: [0, 0, 0], carried: 0, flames: 3 },
      random_shades: false,
      random_motes: false,
      motes: [],
      shades: [{ id: 'S1', pos: [0.2, 0, 0] }],
    });
    applyCombat(world, TUNING);
    assert.equal(world.player.flames, 2);
    const second = applyCombat(world, TUNING);
    assert.equal(second.length, 0);
    assert.equal(world.player.flames, 2);
  });
});
