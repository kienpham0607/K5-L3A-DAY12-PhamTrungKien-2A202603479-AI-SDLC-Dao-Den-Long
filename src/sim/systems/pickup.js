import { TUNING } from '../../shared/tuning.js';
import { distXZ } from '../math.js';

/**
 * Step 4: Pick up Motes (XZ <= 1m, |dy| <= 1.5m, capacity 10) and Wind Charms.
 * Dropped motes can be picked up starting from the next tick (spawnedTick < stepsDone).
 * @returns {object[]} events without tick
 */
export function applyPickup(world, tuning = TUNING) {
  const events = [];
  const p = world.player;
  if (p.respawnTicks > 0) return events;

  const radius = tuning.pickup_radius ?? 1.0;
  const maxDy = tuning.pickup_height ?? 1.5;
  const cap = tuning.carry_capacity ?? 10;

  // 1. Fireflies (Motes)
  if (p.carried < cap) {
    for (const mote of world.motes) {
      if (!mote.active) continue;
      if (p.carried >= cap) break;
      if (mote.dropped && mote.spawnedTick >= world.stepsDone) continue;

      if (distXZ(p.pos, mote.pos) <= radius && Math.abs(p.pos[1] - mote.pos[1]) <= maxDy) {
        mote.active = false;
        p.carried += 1;
        events.push({
          type: 'event',
          name: 'mote_picked',
          data: {
            mote_id: mote.id,
            carried: p.carried,
          },
        });
      }
    }
  }

  // 2. Wind Charms (Night 2 & 3)
  for (const charm of world.charms) {
    if (!charm.active) continue;
    if (distXZ(p.pos, charm.pos) <= radius && Math.abs(p.pos[1] - charm.pos[1]) <= maxDy) {
      charm.active = false;
      charm.respawnTicks = tuning.charm_respawn_ticks ?? 2700;
      p.charmTicks = tuning.charm_duration_ticks ?? 600;
      p.dashCdTicks = 0;
      events.push({
        type: 'event',
        name: 'charm_picked',
        data: { charm_id: charm.id },
      });
    }
  }

  return events;
}
