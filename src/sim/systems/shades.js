import { TUNING } from '../../shared/tuning.js';
import { TICK_HZ } from '../../shared/constants.js';
import { distXZ } from '../math.js';
import { getSurfaceHeight } from '../terrain.js';
import { clampOutsideSafeZones } from './safeZones.js';

/**
 * Step 8a: Shade AI state machine (`spawning`, `wander`, `chase`, `recoil`, `stunned`).
 * - Speed: 4.0 m/s (Night 3: 4.5 m/s)
 * - Detect/leash từ tuning (mặc định 35m / 55m — đuổi từ xa)
 * - Stunned: 120 ticks, pushed 4m over first 15 ticks
 * - Recoil: 2m over 60 ticks after hitting player
 */
export function updateShades(world, tuning = TUNING) {
  const dt = 1 / TICK_HZ;
  const speed = world.level?.shadeSpeed ?? tuning.shade_speed ?? 4.0;
  const detectR = tuning.shade_detect_radius ?? 12;
  const leashR = tuning.shade_leash_radius ?? 18;
  const pushPerTick = (tuning.pulse_push_m ?? 4) / (tuning.pulse_push_ticks ?? 15);
  const recoilPerTick = (tuning.shade_recoil_m ?? 2) / (tuning.shade_recoil_ticks ?? 60);

  const p = world.player;

  for (const s of world.shades) {
    if (s.state === 'spawning') {
      s.spawnTicks = Math.max(0, (s.spawnTicks ?? 0) - 1);
      if (s.spawnTicks <= 0) s.state = 'wander';
      continue;
    }

    if (s.state === 'stunned') {
      if ((s.pushTicks ?? 0) > 0) {
        s.pos[0] += s.pushDir[0] * pushPerTick;
        s.pos[2] += s.pushDir[1] * pushPerTick;
        s.pushTicks -= 1;
      }
      s.stunTicks = Math.max(0, (s.stunTicks ?? 0) - 1);
      if (s.stunTicks <= 0) {
        s.state = 'wander';
      }
      continue;
    }

    if (s.state === 'recoil') {
      s.pos[0] += s.recoilDir[0] * recoilPerTick;
      s.pos[2] += s.recoilDir[1] * recoilPerTick;
      s.recoilTicks = Math.max(0, (s.recoilTicks ?? 0) - 1);
      if (s.recoilTicks <= 0) {
        s.state = 'wander';
      }
      continue;
    }

    // If currently being pushed out by a lit lantern safe zone, skip normal movement
    if (s.inSafePush) continue;

    const distToPlayer = distXZ(s.pos, p.pos);
    const playerTargetable = p.respawnTicks <= 0;

    if (s.state === 'wander') {
      if (playerTargetable && distToPlayer <= detectR) {
        s.state = 'chase';
      } else {
        s.wanderTimer = (s.wanderTimer ?? 0) - 1;
        if (s.wanderTimer <= 0) {
          s.wanderAngle = world.rng() * Math.PI * 2;
          s.wanderTimer = 60 + Math.floor(world.rng() * 90);
        }
        const stepDist = speed * 0.45 * dt;
        const nx = s.pos[0] + Math.cos(s.wanderAngle) * stepDist;
        const nz = s.pos[2] + Math.sin(s.wanderAngle) * stepDist;
        const surf = getSurfaceHeight(world.level, nx, nz, s.pos[1] + 3);
        if (surf !== null) {
          const [cx, cz] = clampOutsideSafeZones(world, nx, nz, tuning);
          s.pos[0] = cx;
          s.pos[1] = surf;
          s.pos[2] = cz;
        } else {
          s.wanderAngle += Math.PI * 0.75;
        }
      }
      continue;
    }

    // state === 'chase'
    if (!playerTargetable || distToPlayer > leashR) {
      s.state = 'wander';
      continue;
    }

    let dx = p.pos[0] - s.pos[0];
    let dz = p.pos[2] - s.pos[2];
    const len = Math.hypot(dx, dz);
    if (len > 1e-6) {
      dx /= len;
      dz /= len;

      // Deterministic separation from nearby shades so they don't stack
      for (const other of world.shades) {
        if (other === s || other.state === 'spawning') continue;
        const ox = s.pos[0] - other.pos[0];
        const oz = s.pos[2] - other.pos[2];
        const od = Math.hypot(ox, oz);
        if (od > 1e-6 && od < 2.2) {
          const push = (2.2 - od) / 2.2;
          dx += (ox / od) * push * 2.2;
          dz += (oz / od) * push * 2.2;
        }
      }

      const fLen = Math.hypot(dx, dz) || 1;
      const stepDist = Math.min(len, speed * dt);
      const nx = s.pos[0] + (dx / fLen) * stepDist;
      const nz = s.pos[2] + (dz / fLen) * stepDist;
      const [cx, cz] = clampOutsideSafeZones(world, nx, nz, tuning);
      s.pos[0] = cx;
      s.pos[2] = cz;
      const surf = getSurfaceHeight(world.level, cx, cz, Math.max(s.pos[1], p.pos[1]) + 3);
      if (surf !== null) s.pos[1] = surf;
    }
  }
}
