import { createDefaultWorld } from './stubWorld.js';
import { createRng } from './rng.js';
import { fuelMaxUnits } from './systems/fuel.js';
import { TUNING } from '../shared/tuning.js';

/**
 * Contract v1.3 benchmark scene (Night 1):
 * - 200 wander shades evenly on island
 * - 100 motes (may exceed gameplay cap)
 * - L1–L3 lit @ fuel 100
 * - Player frozen at (0,0,0)
 * - No spawn / damage / pickup / fuel decay / night end (benchMode)
 */
export function createBenchWorld(seed = 42) {
  const world = createDefaultWorld(1, seed);
  world.benchMode = true;
  world.random_motes = false;
  world.random_shades = false;
  world.random_drifters = false;
  world.player.pos = [0, 0, 0];
  world.player.vel = [0, 0, 0];
  world.player.grounded = true;
  world.player.carried = 0;
  world.player.flames = TUNING.flames;
  world.drifters = [];
  world.charms = [];
  world.wind = { active: false, warning: false, dir_deg: 0, cycleTick: 0 };

  const rng = createRng(seed);
  const islandR = 38;

  // 200 shades evenly on rings
  world.shades = [];
  for (let i = 0; i < 200; i += 1) {
    const ring = 10 + (i % 8) * 3.5;
    const angle = (i / 200) * Math.PI * 2 + (i % 8) * 0.08;
    const x = Math.cos(angle) * Math.min(ring, islandR);
    const z = Math.sin(angle) * Math.min(ring, islandR);
    world.shades.push({
      id: `S${i + 1}`,
      pos: [x, 0, z],
      state: 'wander',
      spawnTicks: 0,
      stunTicks: 0,
      pushTicks: 0,
      pushDir: [0, 0],
      recoilTicks: 0,
      recoilDir: [0, 0],
      safePushTicks: 0,
      inSafePush: false,
      wanderAngle: rng() * Math.PI * 2,
      wanderTimer: 30 + Math.floor(rng() * 60),
      targetLanternId: null,
      drainEmitTicks: 0,
      wasDraining: false,
    });
  }
  world._nextShadeId = 201;

  // 100 motes
  world.motes = [];
  for (let i = 0; i < 100; i += 1) {
    const angle = (i / 100) * Math.PI * 2;
    const r = 6 + (i % 10) * 3;
    world.motes.push({
      id: `M${i + 1}`,
      pos: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
      active: true,
      dropped: false,
      ttlTicks: null,
      spawnedTick: -1,
    });
  }
  world._nextMoteId = 101;

  // L1–L3 lit fuel 100; L4–L5 unlit
  for (const l of world.lanterns) {
    if (l.id === 'L1' || l.id === 'L2' || l.id === 'L3') {
      l.lit = true;
      l.ever_lit = true;
      l.fuelUnits = fuelMaxUnits(TUNING);
      l.deposited = TUNING.lantern_cost ?? 10;
      l.relit_count = 0;
    } else {
      l.lit = false;
      l.fuelUnits = 0;
      l.deposited = 0;
      l.ever_lit = false;
      l.relit_count = 0;
    }
  }

  return world;
}
