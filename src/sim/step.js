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
import { applyFuelTick } from './systems/fuel.js';

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

  for (const m of world.motes) {
    if (!m.active || m.ttlTicks == null) continue;
    m.ttlTicks -= 1;
    if (m.ttlTicks <= 0) m.active = false;
  }

  for (const c of world.charms) {
    if (c.active) continue;
    if (c.respawnTicks > 0) {
      c.respawnTicks -= 1;
      if (c.respawnTicks === 0) c.active = true;
    }
  }

  updateWind(world, tuning);
}

/**
 * Exact tick order (TICKET-02 + Phase 3 fuel):
 * 1. Pause toggle
 * 2. Countdown & timers + fuel decay + shade drain + extinguish
 * 3. Movement
 * 4. Pickup
 * 5. Deposit / refuel / relight
 * 6. Safe zones (fuel >= 30)
 * 7. Pulse
 * 8. Enemy AI (shades + drain transitions + drifters)
 * 9. Collision
 * 10. Spawn
 * 11. Win/Lose (no_flames > dawn_survived/dawn)
 * 12. Snapshot (caller)
 */
export function step(world, input, tuning = TUNING) {
  const events = [];
  if (!world._prevInput) world._prevInput = defaultPrevInput();
  const prevInput = world._prevInput;

  world.tick += 1;

  const pauseEdge = Boolean(input?.pause) && !Boolean(prevInput?.pause);
  if (pauseEdge && world.state === 'playing') {
    world.paused = !world.paused;
    events.push({
      type: 'event',
      name: world.paused ? 'paused' : 'resumed',
      data: {},
    });
  }

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

  // Step 2: Countdown & timers + fuel
  world.stepsDone += 1;
  advanceTimers(world, tuning);
  events.push(...applyFuelTick(world, tuning));

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
