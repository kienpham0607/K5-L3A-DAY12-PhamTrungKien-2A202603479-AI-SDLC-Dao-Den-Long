import { TUNING } from '../../shared/tuning.js';
import { TICK_HZ } from '../../shared/constants.js';
import { distXZ, worldMoveFromInput } from '../math.js';
import { getSurfaceHeight, resolveHorizontalWalls } from '../terrain.js';

function moveToward(current, target, maxDelta) {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}

/**
 * Step 3: Player movement, acceleration (<=0.1s), jump, gravity, dash, jump pads, wind push, fall & respawn.
 * @returns {object[]} events without tick
 */
export function applyMovement(world, input, prevInput, tuning = TUNING) {
  const events = [];
  const p = world.player;
  const dt = 1 / TICK_HZ;

  // Respawn countdown after falling
  if (p.respawnTicks > 0) {
    p.respawnTicks -= 1;
    if (p.respawnTicks === 0) {
      p.pos = [...world.level.spawn];
      p.vel = [0, 0, 0];
      p.grounded = true;
      p.launching = false;
      p.fallingHandled = false;
      p.dashTicks = 0;
      p.invulnTicks = tuning.invuln_ticks ?? 90;
    }
    return events;
  }

  const [xw, zw] = worldMoveFromInput(input?.move, input?.cam_yaw_deg);
  const moveLen = Math.hypot(xw, zw);
  if (moveLen > 1e-6) {
    p.facing = [xw / moveLen, zw / moveLen];
  }

  // Dash rising edge: allowed if not currently dashing AND (charm active OR dash off cooldown)
  const dashEdge = Boolean(input?.dash) && !Boolean(prevInput?.dash);
  if (dashEdge && p.dashTicks <= 0 && (p.charmTicks > 0 || p.dashCdTicks <= 0)) {
    const dashTicks = Math.max(1, Math.round((tuning.dash_duration_s ?? 0.2) * TICK_HZ));
    p.dashTicks = dashTicks;
    p.dashDir = moveLen > 1e-6 ? [xw / moveLen, zw / moveLen] : [...p.facing];
    p.dashCdTicks = p.charmTicks > 0 ? 0 : Math.round((tuning.dash_cooldown_s ?? 1.5) * TICK_HZ);
    p.launching = false;
    p.vel[1] = 0; // Dash in air preserves altitude
    events.push({
      type: 'event',
      name: 'dash',
      data: { dir: [Math.round(p.dashDir[0] * 1000) / 1000, Math.round(p.dashDir[1] * 1000) / 1000] },
    });
  }

  const maxSpeed = p.charmTicks > 0 ? (tuning.charm_speed ?? 7.2) : (tuning.player_speed ?? 6);

  if (p.dashTicks > 0) {
    const dashSpeed = tuning.dash_speed ?? 14;
    p.vel[0] = p.dashDir[0] * dashSpeed;
    p.vel[1] = 0;
    p.vel[2] = p.dashDir[1] * dashSpeed;
    p.dashTicks -= 1;
  } else {
    // Jump pad launch preserves horizontal launch velocity until landing
    if (!p.launching) {
      const accelTime = Math.max(dt, tuning.player_accel_s ?? 0.1);
      const maxDelta = (maxSpeed / accelTime) * dt;
      const targetVx = xw * maxSpeed;
      const targetVz = zw * maxSpeed;
      p.vel[0] = moveToward(p.vel[0], targetVx, maxDelta);
      p.vel[2] = moveToward(p.vel[2], targetVz, maxDelta);
    }

    // Jump edge: only when grounded
    const jumpEdge = Boolean(input?.jump) && !Boolean(prevInput?.jump);
    if (jumpEdge && p.grounded) {
      p.vel[1] = tuning.jump_speed ?? 7;
      p.grounded = false;
    }

    // Gravity
    if (!p.grounded) {
      p.vel[1] += (tuning.gravity ?? -20) * dt;
    }
  }

  // Wind push (Night 3)
  let windVx = 0;
  let windVz = 0;
  if (world.wind?.active) {
    const wRad = (world.wind.dir_deg * Math.PI) / 180;
    const wSpd = tuning.wind_push_speed ?? 2.0;
    windVx = Math.cos(wRad) * wSpd;
    windVz = Math.sin(wRad) * wSpd;
  }

  const prevX = p.pos[0];
  const prevY = p.pos[1];
  const prevZ = p.pos[2];

  const rawNextX = prevX + (p.vel[0] + windVx) * dt;
  const rawNextZ = prevZ + (p.vel[2] + windVz) * dt;

  // Horizontal collision against vertical tier cliffs & solid obstacles
  const [nextX, nextZ] = resolveHorizontalWalls(
    world.level,
    prevX,
    prevZ,
    rawNextX,
    rawNextZ,
    prevY,
  );

  let nextY = prevY + p.vel[1] * dt;
  const surfaceY = getSurfaceHeight(world.level, nextX, nextZ, Math.max(prevY, nextY));

  if (p.dashTicks > 0 && !p.grounded) {
    // Mid-air dash holds altitude (unless colliding downward with a higher surface)
    if (surfaceY !== null && nextY <= surfaceY) {
      nextY = surfaceY;
      p.grounded = true;
    }
  } else if (surfaceY !== null) {
    if (p.grounded && p.vel[1] <= 0 && prevY - surfaceY <= 0.65) {
      // Walking smoothly across flat ground or down/up a ramp
      nextY = surfaceY;
      p.vel[1] = 0;
      p.grounded = true;
      p.launching = false;
    } else if (nextY <= surfaceY && p.vel[1] <= 0) {
      // Landed from air
      nextY = surfaceY;
      p.vel[1] = 0;
      p.grounded = true;
      p.launching = false;
    } else if (nextY > surfaceY + 0.05) {
      p.grounded = false;
    }
  } else {
    // Over void
    p.grounded = false;
  }

  p.pos[0] = nextX;
  p.pos[1] = nextY;
  p.pos[2] = nextZ;

  // Check Jump Pads
  if (!p.launching && world.level.jumpPads.length > 0) {
    for (const pad of world.level.jumpPads) {
      if (distXZ(p.pos, pad.pos) <= pad.r && Math.abs(p.pos[1] - pad.pos[1]) <= 1.0) {
        let dx = 0;
        let dz = 1;
        if (pad.target) {
          dx = pad.target[0] - pad.pos[0];
          dz = pad.target[2] - pad.pos[2];
          const len = Math.hypot(dx, dz) || 1;
          dx /= len;
          dz /= len;
        } else if (pad.dir) {
          const len = Math.hypot(pad.dir[0], pad.dir[1]) || 1;
          dx = pad.dir[0] / len;
          dz = pad.dir[1] / len;
        }
        p.vel[0] = dx * pad.vh;
        p.vel[1] = pad.vy;
        p.vel[2] = dz * pad.vh;
        p.grounded = false;
        p.launching = true;
        p.dashTicks = 0;
        break;
      }
    }
  }

  // Fall off island (Y < -10): handled once per fall, ignores invulnerability
  const fallY = tuning.fall_y ?? -10;
  if (tuning.fall_enabled && p.pos[1] < fallY && !p.fallingHandled) {
    p.fallingHandled = true;
    const lost = p.carried;
    p.carried = 0;
    p.flames = Math.max(0, p.flames - 1);
    events.push({
      type: 'event',
      name: 'player_hit',
      data: {
        by: 'fall',
        flames: p.flames,
        lost,
      },
    });
    if (p.flames > 0) {
      p.respawnTicks = tuning.respawn_ticks ?? 60;
    }
  }

  return events;
}
