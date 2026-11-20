import { TUNING } from '../../shared/tuning.js';
import { TICK_HZ } from '../../shared/constants.js';

/** Internal fuel units: 1 display fuel = TICK_HZ units (integer, no FP drift). */
export const FUEL_SCALE = TICK_HZ;

export function fuelMaxUnits(tuning = TUNING) {
  return Math.round((tuning.fuel_max ?? 100) * FUEL_SCALE);
}

export function fuelPerMoteUnits(tuning = TUNING) {
  return Math.round((tuning.fuel_per_mote ?? 10) * FUEL_SCALE);
}

export function lowFuelUnits(tuning = TUNING) {
  return Math.round((tuning.low_fuel_threshold ?? 30) * FUEL_SCALE);
}

/** Export fuel for snapshots (one decimal place). Unlit → 0. */
export function exportFuel(lantern) {
  if (!lantern.lit) return 0;
  return Math.round((lantern.fuelUnits / FUEL_SCALE) * 10) / 10;
}

export function floorFuel(lantern) {
  if (!lantern.lit) return 0;
  return Math.floor(lantern.fuelUnits / FUEL_SCALE);
}

export function hasSafetyZone(lantern, tuning = TUNING) {
  return Boolean(lantern.lit) && lantern.fuelUnits >= lowFuelUnits(tuning);
}

export function isWeakLit(lantern, tuning = TUNING) {
  return Boolean(lantern.lit) && lantern.fuelUnits > 0 && lantern.fuelUnits < lowFuelUnits(tuning);
}

export function setFuelFull(lantern, tuning = TUNING) {
  lantern.fuelUnits = fuelMaxUnits(tuning);
  lantern.lit = true;
  lantern.ever_lit = true;
}

/**
 * Step 2b: natural decay (1 fuel/s) + stacked shade drain (5 fuel/s each).
 * Emits fuel_drain once every 60 ticks per draining shade.
 * Immediately extinguishes lanterns with fuelUnits <= 0 → lantern_out.
 * @returns {object[]} events without tick
 */
export function applyFuelTick(world, tuning = TUNING) {
  const events = [];
  const decayPerTick = Math.round((tuning.fuel_decay_per_s ?? 1) * FUEL_SCALE) / TICK_HZ; // 1
  const drainPerTick = Math.round((tuning.drain_per_s ?? 5) * FUEL_SCALE) / TICK_HZ; // 5
  const drainEventEvery = TICK_HZ; // once per second while draining

  // Natural decay for all lit lanterns
  for (const lantern of world.lanterns) {
    if (!lantern.lit) {
      lantern.fuelUnits = 0;
      continue;
    }
    lantern.fuelUnits = Math.max(0, lantern.fuelUnits - decayPerTick);
  }

  // Shade drain stacks; emit fuel_drain every 60 ticks of continuous drain
  for (const shade of world.shades) {
    if (shade.state !== 'drain') continue;
    const lantern = world.lanterns.find((l) => l.id === shade.targetLanternId);
    if (!lantern || !lantern.lit) continue;

    lantern.fuelUnits = Math.max(0, lantern.fuelUnits - drainPerTick);
    shade.drainEmitTicks = (shade.drainEmitTicks ?? 0) + 1;
    if (shade.drainEmitTicks >= drainEventEvery) {
      shade.drainEmitTicks = 0;
      events.push({
        type: 'event',
        name: 'fuel_drain',
        data: {
          lantern_id: lantern.id,
          shade_id: shade.id,
          fuel: exportFuel(lantern),
        },
      });
    }
  }

  // Extinguish after decay + drain
  for (const lantern of world.lanterns) {
    if (!lantern.lit) continue;
    if (lantern.fuelUnits > 0) continue;
    lantern.lit = false;
    lantern.fuelUnits = 0;
    lantern.deposited = 0;
    // ever_lit preserved
    events.push({
      type: 'event',
      name: 'lantern_out',
      data: { lantern_id: lantern.id },
    });
  }

  return events;
}
