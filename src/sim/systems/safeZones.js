import { TUNING } from '../../shared/tuning.js';
import { TICK_HZ } from '../../shared/constants.js';
import { distXZ } from '../math.js';

/**
 * Step 6: Lit lanterns create safe zones of radius 6m.
 * Shades already inside must be pushed out in at most 30 ticks and deal no damage while being pushed.
 */
export function applySafeZones(world, tuning = TUNING) {
  const safeR = tuning.safe_radius ?? 6;
  const maxPushTicks = tuning.safe_push_max_ticks ?? 30;
  // Push speed sufficient to clear full radius (6m) within <= 30 ticks (0.5s) -> >= 12.6 m/s
  const pushStep = (safeR + 0.3) / maxPushTicks;

  const litLanterns = world.lanterns.filter((l) => l.lit);

  for (const shade of world.shades) {
    shade.inSafePush = false;
    if (litLanterns.length === 0) continue;

    for (const l of litLanterns) {
      const d = distXZ(shade.pos, l.pos);
      if (d < safeR) {
        shade.inSafePush = true;
        let dx = shade.pos[0] - l.pos[0];
        let dz = shade.pos[2] - l.pos[2];
        let len = Math.hypot(dx, dz);
        if (len < 1e-6) {
          dx = 1;
          dz = 0;
          len = 1;
        }
        const remaining = safeR - d + 0.05;
        const stepDist = Math.min(remaining, pushStep);
        shade.pos[0] += (dx / len) * stepDist;
        shade.pos[2] += (dz / len) * stepDist;
      }
    }
  }
}

/**
 * Clamp a shade's candidate XZ position so an outside shade cannot enter any lit lantern safe zone.
 */
export function clampOutsideSafeZones(world, x, z, tuning = TUNING) {
  const safeR = (tuning.safe_radius ?? 6) + 0.05;
  let rx = x;
  let rz = z;
  for (const l of world.lanterns) {
    if (!l.lit) continue;
    const dx = rx - l.pos[0];
    const dz = rz - l.pos[2];
    const d = Math.hypot(dx, dz);
    if (d < safeR) {
      if (d < 1e-6) {
        rx = l.pos[0] + safeR;
        rz = l.pos[2];
      } else {
        rx = l.pos[0] + (dx / d) * safeR;
        rz = l.pos[2] + (dz / d) * safeR;
      }
    }
  }
  return [rx, rz];
}
