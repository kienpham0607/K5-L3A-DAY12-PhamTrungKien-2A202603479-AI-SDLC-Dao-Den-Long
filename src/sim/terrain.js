/**
 * Pure JS deterministic terrain & collision queries shared by all simulation systems.
 * Uses the exact level definitions from src/shared/levels.js.
 */

const STEP_UP_EPS = 0.48;

export function sampleRampHeight(ramp, x, z) {
  const rad = (ramp.angleDeg * Math.PI) / 180;
  const ux = Math.cos(rad);
  const uz = Math.sin(rad);
  const vx = -uz;
  const vz = ux;

  const projR = x * ux + z * uz;
  const perp = x * vx + z * vz;

  if (Math.abs(perp) > ramp.width * 0.5) return null;
  if (projR < ramp.rEnd - 0.25 || projR > ramp.rStart + 0.25) return null;

  const t = Math.max(0, Math.min(1, (ramp.rStart - projR) / (ramp.rStart - ramp.rEnd)));
  return ramp.yStart + t * (ramp.yEnd - ramp.yStart);
}

export function isInsideTierXZ(tier, x, z) {
  const dx = x - tier.cx;
  const dz = z - tier.cz;
  const r = Math.hypot(dx, dz);
  if (tier.type === 'disc') {
    return r <= tier.rMax;
  }
  if (tier.type === 'annulus') {
    if (tier.zPositiveOnly && z < 0) return false;
    return r >= tier.rMin && r <= tier.rMax;
  }
  return false;
}

/**
 * Return the highest walkable ground surface Y at (x, z) reachable from currentY.
 * Returns null if (x, z) is over the void (off all islands/bridges).
 */
export function getSurfaceHeight(level, x, z, currentY = 0) {
  let bestY = null;
  const consider = (y) => {
    if (y <= currentY + STEP_UP_EPS) {
      if (bestY === null || y > bestY) bestY = y;
    }
  };

  // Base islands (Y=0)
  for (const isl of level.islands) {
    if (Math.hypot(x - isl.cx, z - isl.cz) <= isl.r) {
      consider(isl.y ?? 0);
    }
  }

  // Bridges (Y=0)
  for (const br of level.bridges) {
    if (x >= br.xMin && x <= br.xMax && z >= br.zMin && z <= br.zMax) {
      consider(br.y ?? 0);
    }
  }

  // Ramps
  for (const ramp of level.ramps) {
    const ry = sampleRampHeight(ramp, x, z);
    if (ry !== null) consider(ry);
  }

  // Tiers (Tier 1 Y=3, Tier 2 Y=6)
  for (const tier of level.tiers) {
    if (isInsideTierXZ(tier, x, z)) {
      consider(tier.y);
    }
  }

  return bestY;
}

/**
 * Check if (x, z) is over any solid ground (ignoring height), useful for shade/drifter containment.
 */
export function isOverGround(level, x, z) {
  for (const isl of level.islands) {
    if (Math.hypot(x - isl.cx, z - isl.cz) <= isl.r) return true;
  }
  for (const br of level.bridges) {
    if (x >= br.xMin && x <= br.xMax && z >= br.zMin && z <= br.zMax) return true;
  }
  return false;
}

/**
 * Resolve horizontal movement against vertical tier cliffs and solid obstacles (e.g. Bell Tower).
 * Returns [resolvedX, resolvedZ].
 */
export function resolveHorizontalWalls(level, prevX, prevZ, nextX, nextZ, currentY) {
  let rx = nextX;
  let rz = nextZ;

  // Check if moving along a ramp (ramps allow smooth transition up to Tier 1)
  let onRamp = false;
  for (const ramp of level.ramps) {
    if (sampleRampHeight(ramp, rx, rz) !== null || sampleRampHeight(ramp, prevX, prevZ) !== null) {
      onRamp = true;
      break;
    }
  }

  // 1. Vertical tier walls (cannot walk through a tier higher than currentY + STEP_UP_EPS)
  for (const tier of level.tiers) {
    if (tier.y <= currentY + STEP_UP_EPS) continue;
    if (!isInsideTierXZ(tier, rx, rz)) continue;

    // Allow smooth entry onto Tier 1 if coming from a ramp near the top of the ramp
    if (onRamp && tier.y - currentY <= 0.75) continue;

    // Push back out of the tier wall
    if (tier.type === 'disc') {
      const dx = rx - tier.cx;
      const dz = rz - tier.cz;
      const dist = Math.hypot(dx, dz);
      if (dist < 1e-6) {
        rx = prevX;
        rz = prevZ;
      } else {
        const outR = tier.rMax + 0.02;
        rx = tier.cx + (dx / dist) * outR;
        rz = tier.cz + (dz / dist) * outR;
      }
    } else if (tier.type === 'annulus') {
      // Determine nearest boundary of the annulus (inner ring, outer ring, or z=0 cut)
      const prevIn = isInsideTierXZ(tier, prevX, prevZ);
      if (prevIn) {
        // Already somehow inside horizontally (e.g. fell beside it), revert
        rx = prevX;
        rz = prevZ;
      } else {
        const prevR = Math.hypot(prevX - tier.cx, prevZ - tier.cz);
        const curR = Math.hypot(rx - tier.cx, rz - tier.cz);
        if (tier.zPositiveOnly && prevZ < 0) {
          rz = -0.02;
        } else if (prevR > tier.rMax) {
          const outR = tier.rMax + 0.02;
          const s = curR > 1e-6 ? outR / curR : 1;
          rx = tier.cx + (rx - tier.cx) * s;
          rz = tier.cz + (rz - tier.cz) * s;
        } else if (prevR < tier.rMin) {
          const inR = tier.rMin - 0.02;
          const s = curR > 1e-6 ? inR / curR : 1;
          rx = tier.cx + (rx - tier.cx) * s;
          rz = tier.cz + (rz - tier.cz) * s;
        } else {
          rx = prevX;
          rz = prevZ;
        }
      }
    }
  }

  // 2. Solid cylinder obstacles (e.g. Bell Tower at Tier 2, cannot walk through or climb)
  for (const obs of level.obstacles) {
    if (obs.type === 'cylinder') {
      if (currentY >= obs.yMin - 0.5 && currentY < obs.yMax) {
        const dx = rx - obs.cx;
        const dz = rz - obs.cz;
        const dist = Math.hypot(dx, dz);
        if (dist < obs.r) {
          if (dist < 1e-6) {
            rx = prevX;
            rz = prevZ;
          } else {
            const outR = obs.r + 0.02;
            rx = obs.cx + (dx / dist) * outR;
            rz = obs.cz + (dz / dist) * outR;
          }
        }
      }
    }
  }

  return [rx, rz];
}
