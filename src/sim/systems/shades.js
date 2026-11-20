import { TUNING } from '../../shared/tuning.js';
import { TICK_HZ } from '../../shared/constants.js';
import { distXZ } from '../math.js';
import { getSurfaceHeight } from '../terrain.js';
import { clampOutsideSafeZones } from './safeZones.js';
import { isWeakLit, lowFuelUnits } from './fuel.js';

function pickWanderTarget(world, shadePos, tuning = TUNING) {
  let bestWeak = null;
  let bestWeakDist = Infinity;
  for (const l of world.lanterns) {
    if (!isWeakLit(l, tuning)) continue;
    const d = distXZ(shadePos, l.pos);
    if (d < bestWeakDist || (d === bestWeakDist && (!bestWeak || l.id < bestWeak.id))) {
      bestWeak = l;
      bestWeakDist = d;
    }
  }
  if (bestWeak) return bestWeak;

  // Fallback: nearest unlit lantern
  let bestUnlit = null;
  let bestUnlitDist = Infinity;
  for (const l of world.lanterns) {
    if (l.lit) continue;
    const d = distXZ(shadePos, l.pos);
    if (d < bestUnlitDist || (d === bestUnlitDist && (!bestUnlit || l.id < bestUnlit.id))) {
      bestUnlit = l;
      bestUnlitDist = d;
    }
  }
  return bestUnlit;
}

/**
 * Step 8a: Shade AI — spawning, wander, chase, drain, recoil, stunned.
 * Wander may target weak lit lanterns (fuel < 30) or nearest unlit.
 * Enter drain within 2m of weak target. Drain fuel applied in step 2 (fuel.js).
 */
export function updateShades(world, tuning = TUNING) {
  const dt = 1 / TICK_HZ;
  const speed = world.level?.shadeSpeed ?? tuning.shade_speed ?? 4.0;
  const detectR = tuning.shade_detect_radius ?? 12;
  const leashR = tuning.shade_leash_radius ?? 18;
  const drainEnterR = tuning.drain_enter_radius ?? 2.0;
  const drainChaseR = tuning.drain_chase_radius ?? 6.0;
  const pushPerTick = (tuning.pulse_push_m ?? 4) / (tuning.pulse_push_ticks ?? 15);
  const recoilPerTick = (tuning.shade_recoil_m ?? 2) / (tuning.shade_recoil_ticks ?? 60);
  const thresholdUnits = lowFuelUnits(tuning);

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
        s.targetLanternId = null;
        s.drainEmitTicks = 0;
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

    if (s.inSafePush) continue;

    const distToPlayer = distXZ(s.pos, p.pos);
    const playerTargetable = p.respawnTicks <= 0;

    // --- drain ---
    if (s.state === 'drain') {
      const lantern = world.lanterns.find((l) => l.id === s.targetLanternId);
      const distLantern = lantern ? distXZ(s.pos, lantern.pos) : Infinity;

      if (playerTargetable && distToPlayer <= drainChaseR) {
        s.state = 'chase';
        s.wasDraining = true;
        s.drainEmitTicks = 0;
        continue;
      }
      if (!lantern || !lantern.lit) {
        s.state = 'wander';
        s.targetLanternId = null;
        s.drainEmitTicks = 0;
        continue;
      }
      if (lantern.fuelUnits >= thresholdUnits) {
        s.state = 'wander';
        s.targetLanternId = null;
        s.drainEmitTicks = 0;
        continue;
      }
      if (distLantern > drainEnterR) {
        s.state = 'wander';
        s.targetLanternId = null;
        s.drainEmitTicks = 0;
        continue;
      }
      // Stay still while draining (fuel applied in step 2)
      continue;
    }

    // --- wander ---
    if (s.state === 'wander') {
      if (playerTargetable && distToPlayer <= detectR) {
        s.state = 'chase';
        s.targetLanternId = null;
        continue;
      }

      const target = pickWanderTarget(world, s.pos, tuning);
      if (target) {
        s.targetLanternId = target.id;
        const d = distXZ(s.pos, target.pos);
        if (isWeakLit(target, tuning) && d <= drainEnterR) {
          s.state = 'drain';
          s.drainEmitTicks = 0;
          continue;
        }
        // Move toward selected lantern
        let dx = target.pos[0] - s.pos[0];
        let dz = target.pos[2] - s.pos[2];
        const len = Math.hypot(dx, dz);
        if (len > 1e-6) {
          const stepDist = Math.min(len, speed * 0.85 * dt);
          const nx = s.pos[0] + (dx / len) * stepDist;
          const nz = s.pos[2] + (dz / len) * stepDist;
          const surf = getSurfaceHeight(world.level, nx, nz, s.pos[1] + 3);
          if (surf !== null) {
            const [cx, cz] = clampOutsideSafeZones(world, nx, nz, tuning);
            // Weak lanterns have no safety — allow approach; safe clamp only for fuel>=30
            s.pos[0] = cx;
            s.pos[1] = surf;
            s.pos[2] = cz;
          }
        }
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

    // --- chase ---
    if (!playerTargetable || distToPlayer > leashR) {
      s.state = 'wander';
      s.wasDraining = false;
      continue;
    }

    let dx = p.pos[0] - s.pos[0];
    let dz = p.pos[2] - s.pos[2];
    const len = Math.hypot(dx, dz);
    if (len > 1e-6) {
      dx /= len;
      dz /= len;

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
