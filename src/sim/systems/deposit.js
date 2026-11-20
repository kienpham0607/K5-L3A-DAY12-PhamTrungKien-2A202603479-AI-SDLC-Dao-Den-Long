import { TUNING } from '../../shared/tuning.js';
import { distXZ } from '../math.js';

/**
 * Find nearest unlit lantern within interact_radius (XZ <= 2m, reasonable height).
 * Tie-break: smaller id string.
 */
export function findInteractLantern(world, tuning = TUNING) {
  const radius = tuning.interact_radius ?? 2.0;
  let best = null;
  let bestDist = Infinity;

  for (const lantern of world.lanterns) {
    if (lantern.lit) continue;
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

/**
 * Step 5: On interact edge, deposit carried motes into nearest unlit lantern in range.
 * +10 score per mote deposited, +100 score when lantern lights (reaches 10).
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

  const cost = tuning.lantern_cost ?? 10;
  const need = Math.max(0, cost - lantern.deposited);
  const amount = Math.min(world.player.carried, need);
  if (amount <= 0) return events;

  world.player.carried -= amount;
  lantern.deposited += amount;
  world.score += amount * (tuning.score?.per_mote ?? 10);

  events.push({
    type: 'event',
    name: 'deposit',
    data: {
      lantern_id: lantern.id,
      amount,
      deposited: lantern.deposited,
    },
  });

  if (!lantern.lit && lantern.deposited >= cost) {
    lantern.lit = true;
    world.score += tuning.score?.per_lantern ?? 100;
    events.push({
      type: 'event',
      name: 'lantern_lit',
      data: { lantern_id: lantern.id },
    });
  }

  return events;
}
