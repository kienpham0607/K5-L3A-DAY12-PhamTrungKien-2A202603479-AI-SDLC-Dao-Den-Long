import { TUNING } from '../shared/tuning.js';
import { distXZ } from './math.js';
import { reseedWorld } from './stubWorld.js';

function isSpotOccupied(world, pos) {
  for (const m of world.motes) {
    if (!m.active) continue;
    if (distXZ(m.pos, pos) < 0.5 && Math.abs(m.pos[1] - pos[1]) < 0.5) return true;
  }
  return false;
}

/**
 * Deterministic initial world setup (tuning.initial_motes if random_motes).
 * Shades/Drifters spawn on schedule (shade_first_spawn_tick / drifter interval).
 */
export function spawnDefaultsIfNeeded(world, seed = 1, tuning = TUNING) {
  reseedWorld(world, seed);

  if (world.random_motes && world.motes.length === 0) {
    const spots = world.level.moteSpawns.map((p) => [...p]);
    // Deterministic Fisher-Yates shuffle using world.rng
    for (let i = spots.length - 1; i > 0; i -= 1) {
      const j = Math.floor(world.rng() * (i + 1));
      const tmp = spots[i];
      spots[i] = spots[j];
      spots[j] = tmp;
    }
    const count = Math.min(tuning.initial_motes ?? 40, spots.length);
    for (let i = 0; i < count; i += 1) {
      world.motes.push({
        id: `M${world._nextMoteId++}`,
        pos: spots[i],
        active: true,
        dropped: false,
        ttlTicks: null,
        spawnedTick: -1,
      });
    }
  }
}

function pickShadeSpawnPoint(world, minDist, usedIndices) {
  const spots = world.level.shadeSpawns;
  const candidates = [];
  for (let i = 0; i < spots.length; i += 1) {
    if (usedIndices.has(i)) continue;
    if (distXZ(world.player.pos, spots[i]) >= minDist) {
      candidates.push(i);
    }
  }
  if (candidates.length === 0) {
    // Fallback to farthest point if player is somehow close to all
    let bestIdx = 0;
    let bestDist = -1;
    for (let i = 0; i < spots.length; i += 1) {
      if (usedIndices.has(i)) continue;
      const d = distXZ(world.player.pos, spots[i]);
      if (d > bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    return bestIdx;
  }
  return candidates[Math.floor(world.rng() * candidates.length)];
}

function spawnOneShade(world, pos) {
  const id = `S${world._nextShadeId++}`;
  const shade = {
    id,
    pos: [...pos],
    state: 'spawning',
    spawnTicks: 30,
    stunTicks: 0,
    pushTicks: 0,
    pushDir: [0, 0],
    recoilTicks: 0,
    recoilDir: [0, 0],
    safePushTicks: 0,
    inSafePush: false,
    wanderAngle: world.rng() * Math.PI * 2,
    wanderTimer: 60,
  };
  world.shades.push(shade);
  return {
    type: 'event',
    name: 'shade_spawned',
    data: { shade_id: id, pos: [...pos] },
  };
}

/**
 * Step 10 of the 12-step tick order: scheduled spawning of Motes, Shades, and Drifters.
 * @returns {object[]} events without tick
 */
export function applySpawns(world, tuning = TUNING) {
  const events = [];
  const simTick = world.stepsDone;

  // 1. Mote respawn periodically up to max_motes
  const moteInterval = tuning.mote_spawn_interval_ticks ?? 120;
  if (world.random_motes && simTick > 0 && simTick % moteInterval === 0) {
    const activeCount = world.motes.filter((m) => m.active).length;
    if (activeCount < (tuning.max_motes ?? 55)) {
      const freeSpots = world.level.moteSpawns.filter((p) => !isSpotOccupied(world, p));
      if (freeSpots.length > 0) {
        const chosen = freeSpots[Math.floor(world.rng() * freeSpots.length)];
        world.motes.push({
          id: `M${world._nextMoteId++}`,
          pos: [...chosen],
          active: true,
          dropped: false,
          ttlTicks: null,
          spawnedTick: simTick,
        });
      }
    }
  }

  // 2. Shade spawning: 2 at tick 300, then 1 every shadeIntervalTicks up to maxShades
  if (world.random_shades) {
    const minDist = tuning.shade_min_spawn_dist ?? 15;
    if (!world._shadeFirstDone && simTick >= (tuning.shade_first_spawn_tick ?? 300)) {
      world._shadeFirstDone = true;
      const used = new Set();
      for (let k = 0; k < 2; k += 1) {
        if (world.shades.length >= world.level.maxShades) break;
        const idx = pickShadeSpawnPoint(world, minDist, used);
        used.add(idx);
        events.push(spawnOneShade(world, world.level.shadeSpawns[idx]));
      }
      world._nextShadeSpawnTick = simTick + world.level.shadeIntervalTicks;
    } else if (world._shadeFirstDone && simTick >= world._nextShadeSpawnTick) {
      world._nextShadeSpawnTick = simTick + world.level.shadeIntervalTicks;
      if (world.shades.length < world.level.maxShades) {
        const idx = pickShadeSpawnPoint(world, minDist, new Set());
        events.push(spawnOneShade(world, world.level.shadeSpawns[idx]));
      }
    }
  }

  // 3. Drifter spawning (Night 2 & 3): at ticks 1200, 2400... max 2 active
  const drifterInterval = tuning.drifter_spawn_interval_ticks ?? 1200;
  if (
    world.level.hasDrifters &&
    world.random_drifters &&
    simTick > 0 &&
    simTick % drifterInterval === 0
  ) {
    const activeDrifters = world.drifters.filter((d) => d.state !== 'removed').length;
    if (activeDrifters < (tuning.drifter_max ?? 2)) {
      const spots = world.level.drifterSpawns;
      if (spots.length > 0) {
        const pos = spots[Math.floor(world.rng() * spots.length)];
        world.drifters.push({
          id: `D${world._nextDrifterId++}`,
          pos: [...pos],
          state: 'idle',
          stolen: 0,
          hasStolen: false,
          fleeTicks: 0,
          idleAngle: world.rng() * Math.PI * 2,
          idleTimer: 90,
        });
      }
    }
  }

  return events;
}
