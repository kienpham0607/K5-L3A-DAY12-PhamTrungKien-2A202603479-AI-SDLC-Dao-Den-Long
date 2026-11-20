import { TUNING } from '../../shared/tuning.js';
import { TICK_HZ } from '../../shared/constants.js';
import { distXZ } from '../math.js';
import { getSurfaceHeight } from '../terrain.js';

/**
 * Step 8b: Gió Lạc (Drifter) AI for Night 2 & 3.
 * States: `idle`, `chase`, `flee`, `removed`.
 * - Ignores safe zones and can steal even while player is invulnerable.
 * - Never reduces player flames.
 * @returns {object[]} events without tick
 */
export function updateDrifters(world, tuning = TUNING) {
  const events = [];
  const dt = 1 / TICK_HZ;
  const idleSpeed = tuning.drifter_idle_speed ?? 2.0;
  const fastSpeed = tuning.drifter_speed ?? 7.0;
  const detectR = tuning.drifter_detect_radius ?? 15;
  const stealR = tuning.drifter_steal_radius ?? 1.2;
  const minCarried = tuning.drifter_min_carried ?? 5;
  const maxSteal = tuning.drifter_steal_max ?? 3;
  const fleeTicksDefault = tuning.drifter_flee_ticks ?? 240;

  const p = world.player;

  for (const d of world.drifters) {
    if (d.state === 'removed') continue;

    if (d.state === 'idle') {
      const dist = distXZ(d.pos, p.pos);
      if (p.respawnTicks <= 0 && !d.hasStolen && p.carried >= minCarried && dist <= detectR) {
        d.state = 'chase';
      } else {
        d.idleTimer = (d.idleTimer ?? 0) - 1;
        if (d.idleTimer <= 0) {
          d.idleAngle = world.rng() * Math.PI * 2;
          d.idleTimer = 60 + Math.floor(world.rng() * 90);
        }
        const nx = d.pos[0] + Math.cos(d.idleAngle) * idleSpeed * dt;
        const nz = d.pos[2] + Math.sin(d.idleAngle) * idleSpeed * dt;
        const surf = getSurfaceHeight(world.level, nx, nz, d.pos[1] + 6);
        if (surf !== null) {
          d.pos[0] = nx;
          d.pos[1] = surf;
          d.pos[2] = nz;
        } else {
          d.idleAngle += Math.PI * 0.8;
        }
      }
      continue;
    }

    if (d.state === 'chase') {
      if (p.respawnTicks > 0 || d.hasStolen) {
        d.state = 'idle';
        continue;
      }

      const dx = p.pos[0] - d.pos[0];
      const dz = p.pos[2] - d.pos[2];
      const dist = Math.hypot(dx, dz);
      if (dist > 1e-6) {
        const stepDist = Math.min(dist, fastSpeed * dt);
        d.pos[0] += (dx / dist) * stepDist;
        d.pos[2] += (dz / dist) * stepDist;
        const surf = getSurfaceHeight(world.level, d.pos[0], d.pos[2], Math.max(d.pos[1], p.pos[1]) + 6);
        if (surf !== null) d.pos[1] = surf;
      }

      // Steal on XZ <= 1.2m (ignores safe zones & player invulnerability)
      if (distXZ(d.pos, p.pos) <= stealR) {
        const stolen = Math.min(maxSteal, p.carried);
        p.carried -= stolen;
        d.stolen = stolen;
        d.hasStolen = true;
        d.state = 'flee';
        d.fleeTicks = fleeTicksDefault;
        events.push({
          type: 'event',
          name: 'drifter_steal',
          data: {
            drifter_id: d.id,
            stolen,
            carried: p.carried,
          },
        });
      }
      continue;
    }

    if (d.state === 'flee') {
      let dx = d.pos[0] - p.pos[0];
      let dz = d.pos[2] - p.pos[2];
      const len = Math.hypot(dx, dz);
      if (len < 1e-6) {
        dx = 1;
        dz = 0;
      } else {
        dx /= len;
        dz /= len;
      }
      d.pos[0] += dx * fastSpeed * dt;
      d.pos[2] += dz * fastSpeed * dt;
      d.fleeTicks = Math.max(0, (d.fleeTicks ?? 0) - 1);
      if (d.fleeTicks <= 0) {
        d.state = 'removed';
      }
    }
  }

  return events;
}
