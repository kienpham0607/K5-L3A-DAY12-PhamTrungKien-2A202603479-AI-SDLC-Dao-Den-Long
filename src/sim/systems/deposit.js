import { TUNING } from '../../shared/tuning.js';
import { distXZ } from '../math.js';
import {
  fuelMaxUnits,
  fuelPerMoteUnits,
  exportFuel,
  setFuelFull,
  hasSafetyZone,
} from './fuel.js';

function playerCapacity(world, tuning = TUNING) {
  const base = tuning.carry_capacity ?? 10;
  const max = tuning.capacity_max ?? 20;
  return Math.min(max, base + 2 * (world.player.successful_lights ?? 0));
}

/**
 * Eligible interact targets:
 * - unlit lanterns (first light or relight progress)
 * - lit lanterns with fuel < 100 (refuel)
 * Full lanterns are never selected.
 * Nearest by XZ; ties → smallest id.
 */
export function findInteractLantern(world, tuning = TUNING) {
  const radius = tuning.interact_radius ?? 2.0;
  const maxUnits = fuelMaxUnits(tuning);
  let best = null;
  let bestDist = Infinity;

  for (const lantern of world.lanterns) {
    if (lantern.lit && lantern.fuelUnits >= maxUnits) continue;
    if (Math.abs(world.player.pos[1] - lantern.pos[1]) > 2.0) continue;
    const d = distXZ(world.player.pos, lantern.pos);
    if (d > radius) continue;
    if (d < bestDist || (d === bestDist && (!best || lantern.id < best.id))) {
      best = lantern;
      bestDist = d;
    }
  }
  return best;
}

function lightCost(lantern, tuning = TUNING) {
  if (lantern.ever_lit) return tuning.relight_cost ?? 5;
  return tuning.lantern_cost ?? 10;
}

/**
 * Step 5: interact edge — deposit toward light/relight, or refuel lit lanterns.
 * Scoring (Phase 3): +5 per mote, +100 first light, +40 relight.
 * Refuel: used = min(carried, ceil((100-fuel)/10)); no score if used=0.
 * @returns {object[]} events without tick
 */
export function applyDeposit(world, input, prevInput, tuning = TUNING) {
  const events = [];
  if (world.player.respawnTicks > 0) return events;

  const edge = Boolean(input?.interact) && !Boolean(prevInput?.interact);
  if (!edge) return events;
  if (world.player.carried <= 0) return events;

  const lantern = findInteractLantern(world, tuning);
  if (!lantern) return events;

  const perMote = tuning.score?.per_mote ?? 5;

  // --- Refuel path (already lit, fuel < 100) ---
  if (lantern.lit) {
    const maxUnits = fuelMaxUnits(tuning);
    const perMoteUnits = fuelPerMoteUnits(tuning);
    const needUnits = maxUnits - lantern.fuelUnits;
    if (needUnits <= 0) return events;

    const used = Math.min(world.player.carried, Math.ceil(needUnits / perMoteUnits));
    if (used <= 0) return events;

    const hadSafety = hasSafetyZone(lantern, tuning);
    world.player.carried -= used;
    lantern.fuelUnits = Math.min(maxUnits, lantern.fuelUnits + used * perMoteUnits);
    world.score += used * perMote;

    events.push({
      type: 'event',
      name: 'refuel',
      data: {
        lantern_id: lantern.id,
        amount: used,
        fuel: exportFuel(lantern),
      },
    });

    // Crossing into safety (>=30) reuses safe-zone repulsion next step 6
    if (!hadSafety && hasSafetyZone(lantern, tuning)) {
      lantern._justGainedSafety = true;
    }
    return events;
  }

  // --- First light / relight path ---
  const cost = lightCost(lantern, tuning);
  const need = Math.max(0, cost - lantern.deposited);
  const amount = Math.min(world.player.carried, need);
  if (amount <= 0) return events;

  world.player.carried -= amount;
  lantern.deposited += amount;
  world.score += amount * perMote;

  events.push({
    type: 'event',
    name: 'deposit',
    data: {
      lantern_id: lantern.id,
      amount,
      deposited: lantern.deposited,
    },
  });

  if (lantern.deposited >= cost) {
    const wasEverLit = Boolean(lantern.ever_lit);
    const relight = wasEverLit;
    setFuelFull(lantern, tuning);
    lantern.deposited = cost; // keep deposited at cost while lit for HUD progress
    lantern._justGainedSafety = true;

    if (relight) {
      lantern.relit_count = (lantern.relit_count ?? 0) + 1;
      world.score += tuning.score?.per_relight ?? 40;
    } else {
      world.score += tuning.score?.per_lantern ?? 100;
    }

    world.player.successful_lights = (world.player.successful_lights ?? 0) + 1;
    // Capacity is derived from successful_lights; clamp carried if somehow over
    const cap = playerCapacity(world, tuning);
    if (world.player.carried > cap) world.player.carried = cap;

    events.push({
      type: 'event',
      name: 'lantern_lit',
      data: {
        lantern_id: lantern.id,
        relight,
      },
    });
  }

  return events;
}

export { playerCapacity };
