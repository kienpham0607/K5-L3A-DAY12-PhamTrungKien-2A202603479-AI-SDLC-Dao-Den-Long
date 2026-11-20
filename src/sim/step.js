import { TUNING } from '../shared/tuning.js';
import { applyMovement } from './systems/movement.js';
import { applyPickup } from './systems/pickup.js';
import { applyDeposit } from './systems/deposit.js';
import { applySafeZones } from './systems/safeZones.js';
import { applyPulse } from './systems/pulse.js';
import { updateShades } from './systems/shades.js';
import { updateDrifters } from './systems/drifters.js';
import { applyCombat } from './systems/combat.js';
import { updateWind } from './systems/wind.js';
import { applySpawns } from './spawn.js';
import { checkWinLose } from './systems/winlose.js';

function defaultPrevInput() {
  return {
    move: [0, 0],
    cam_yaw_deg: 0,
    jump: false,
    interact: false,
    pulse: false,
    dash: false,
    pause: false,
  };
}

function advanceTimers(world, tuning) {
  const p = world.player;
  if (p.invulnTicks > 0) p.invulnTicks -= 1;
  if (p.dashCdTicks > 0) p.dashCdTicks -= 1;
  if (p.pulseCdTicks > 0) p.pulseCdTicks -= 1;
  if (p.charmTicks > 0) p.charmTicks -= 1;

  // Dropped mote TTL expiration (480 ticks)
  for (const m of world.motes) {
    if (!m.active || m.ttlTicks == null) continue;
    m.ttlTicks -= 1;
    if (m.ttlTicks <= 0) m.active = false;
  }

  // Wind Charm respawn timers (2700 ticks)
  for (const c of world.charms) {
    if (c.active) continue;
    if (c.respawnTicks > 0) {
      c.respawnTicks -= 1;
      if (c.respawnTicks === 0) c.active = true;
    }
  }

  // Night 3 Wind cycle
  updateWind(world, tuning);
}

/**
 * Exact 12-step tick order (TICKET-02):
 * 1. Pause toggle (if paused: tick advances, sim_tick & timers freeze)
 * 2. Countdown & timers (sim_tick advances)
 * 3. Movement (walk, accel, jump, dash, jump pads, wind, fall/respawn)
 * 4. Pickup (motes & wind charms)
 * 5. Deposit (lanterns)
 * 6. Safe zones (push shades out of lit lanterns <= 30 ticks)
 * 7. Pulse (stun/push shades, repel/drop drifters)
 * 8. Enemy AI (shades + drifters)
 * 9. Collision (shade hit)
 * 10. Spawn (motes, shades, drifters)
 * 11. Win/Lose (no_flames > all_lit > dawn)
 * 12. Snapshot (handled by caller/runner)
 */
export function step(world, input, tuning = TUNING) {
  const events = [];
  if (!world._prevInput) world._prevInput = defaultPrevInput();
  const prevInput = world._prevInput;

  // External tick always advances
  world.tick += 1;

  // Step 1: Pause edge
  const pauseEdge = Boolean(input?.pause) && !Boolean(prevInput?.pause);
  if (pauseEdge && world.state === 'playing') {
    world.paused = !world.paused;
    events.push({
      type: 'event',
      name: world.paused ? 'paused' : 'resumed',
      data: {},
    });
  }

  // Save input for next tick's edge detection
  world._prevInput = {
    move: input?.move ? [...input.move] : [0, 0],
    cam_yaw_deg: input?.cam_yaw_deg ?? 0,
    jump: Boolean(input?.jump),
    interact: Boolean(input?.interact),
    pulse: Boolean(input?.pulse),
    dash: Boolean(input?.dash),
    pause: Boolean(input?.pause),
  };

  if (world.paused || world.state !== 'playing') {
    for (const ev of events) ev.tick = world.tick;
    return { events };
  }

  // Step 2: Countdown & timers
  world.stepsDone += 1;
  advanceTimers(world, tuning);

  // Step 3: Movement
  events.push(...applyMovement(world, input, prevInput, tuning));

  // Step 4: Pickup
  events.push(...applyPickup(world, tuning));

  // Step 5: Deposit
  events.push(...applyDeposit(world, input, prevInput, tuning));

  // Step 6: Safe zones
  applySafeZones(world, tuning);

  // Step 7: Pulse
  events.push(...applyPulse(world, input, prevInput, tuning));

  // Step 8: Enemy AI
  updateShades(world, tuning);
  events.push(...updateDrifters(world, tuning));

  // Step 9: Collision
  events.push(...applyCombat(world, tuning));

  // Step 10: Spawn
  events.push(...applySpawns(world, tuning));

  // Step 11: Win/Lose
  events.push(...checkWinLose(world, tuning));

  for (const ev of events) {
    ev.tick = world.tick;
  }
  return { events };
}
