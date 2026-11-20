import { TUNING } from '../../shared/tuning.js';
import { distXZ } from '../math.js';
import { hasSafetyZone } from './fuel.js';

/**
 * Step 6: Lit lanterns with fuel >= low_fuel_threshold create safe zones (radius 6m).
 * Shades inside are pushed out in ≤ 30 ticks and deal no damage while pushed.
 */
export function applySafeZones(world, tuning = TUNING) {
  const safeR = tuning.safe_radius ?? 6;
  const maxPushTicks = tuning.safe_push_max_ticks ?? 30;
  const pushStep = (safeR + 0.3) / maxPushTicks;

  const safeLanterns = world.lanterns.filter((l) => hasSafetyZone(l, tuning));

  for (const shade of world.shades) {
    shade.inSafePush = false;
    if (safeLanterns.length === 0) continue;

    for (const l of safeLanterns) {
      const d = distXZ(shade.pos, l.pos);
      if (d < safeR) {
        shade.inSafePush = true;
        if (shade.state === 'drain') {
          shade.state = 'wander';
          shade.targetLanternId = null;
          shade.drainEmitTicks = 0;
        }
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

  for (const l of world.lanterns) {
    l._justGainedSafety = false;
  }
}

/**
 * Clamp candidate XZ so shades outside cannot enter a fuel>=30 safety zone.
 */
export function clampOutsideSafeZones(world, x, z, tuning = TUNING) {
  const safeR = (tuning.safe_radius ?? 6) + 0.05;
  let rx = x;
  let rz = z;
  for (const l of world.lanterns) {
    if (!hasSafetyZone(l, tuning)) continue;
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
