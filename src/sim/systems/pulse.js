import { TUNING } from '../../shared/tuning.js';
import { TICK_HZ } from '../../shared/constants.js';

function dist3D(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/**
 * Step 7: Pulse edge — costs 3 carried motes, 3D radius 5m from player foot + 0.8m Y, cooldown 3s.
 * - Shades in range: stunned 120 ticks, pushed 4m over first 15 ticks (refreshed on re-hit), +5 score each.
 * - Drifters in range:
 *     - chase -> flee (240 ticks) without stealing
 *     - flee with stolen > 0 -> drop all stolen motes at drifter pos, flee 120 ticks
 * @returns {object[]} events without tick
 */
export function applyPulse(world, input, prevInput, tuning = TUNING) {
  const events = [];
  const p = world.player;
  if (p.respawnTicks > 0) return events;

  const edge = Boolean(input?.pulse) && !Boolean(prevInput?.pulse);
  if (!edge) return events;

  const cost = tuning.pulse_cost ?? 3;
  if (p.carried < cost) return events;
  if (p.pulseCdTicks > 0) return events;

  p.carried -= cost;
  p.pulseCdTicks = Math.round((tuning.pulse_cooldown_s ?? 3.0) * TICK_HZ);

  const radius = tuning.pulse_radius ?? 5;
  const center = [p.pos[0], p.pos[1] + (tuning.pulse_y_offset ?? 0.8), p.pos[2]];
  const stunTicks = tuning.pulse_stun_ticks ?? 120;
  const pushTicks = tuning.pulse_push_ticks ?? 15;
  const stunnedIds = [];

  // 1. Shades
  for (const shade of world.shades) {
    const shadeCenter = [shade.pos[0], shade.pos[1] + 0.8, shade.pos[2]];
    if (dist3D(center, shadeCenter) > radius) continue;

    shade.state = 'stunned';
    shade.stunTicks = stunTicks;
    shade.pushTicks = pushTicks;
    shade.recoilTicks = 0;

    let dx = shade.pos[0] - p.pos[0];
    let dz = shade.pos[2] - p.pos[2];
    const len = Math.hypot(dx, dz);
    if (len < 1e-6) {
      dx = 1;
      dz = 0;
    } else {
      dx /= len;
      dz /= len;
    }
    shade.pushDir = [dx, dz];
    stunnedIds.push(shade.id);
    world.score += tuning.score?.per_stun ?? 5;
  }

  // 2. Drifters
  const drifterHitIds = [];
  for (const d of world.drifters) {
    if (d.state === 'removed') continue;
    const dCenter = [d.pos[0], d.pos[1] + 0.8, d.pos[2]];
    if (dist3D(center, dCenter) > radius) continue;

    drifterHitIds.push(d.id);
    if (d.state === 'chase') {
      d.state = 'flee';
      d.fleeTicks = tuning.drifter_flee_ticks ?? 240;
    } else if (d.state === 'flee' && d.stolen > 0) {
      const dropCount = d.stolen;
      d.stolen = 0;
      d.fleeTicks = tuning.drifter_drop_flee_ticks ?? 120;
      for (let i = 0; i < dropCount; i += 1) {
        const angle = (i / Math.max(1, dropCount)) * Math.PI * 2;
        const offset = dropCount > 1 ? 0.5 : 0;
        world.motes.push({
          id: `M${world._nextMoteId++}`,
          pos: [d.pos[0] + Math.cos(angle) * offset, d.pos[1], d.pos[2] + Math.sin(angle) * offset],
          active: true,
          dropped: true,
          ttlTicks: tuning.dropped_mote_ttl_ticks ?? 480,
          spawnedTick: world.stepsDone,
        });
      }
      events.push({
        type: 'event',
        name: 'drifter_drop',
        data: { drifter_id: d.id, dropped: dropCount },
      });
    }
  }

  events.push({
    type: 'event',
    name: 'pulse',
    data: { stunned_ids: stunnedIds, drifter_ids: drifterHitIds },
  });

  return events;
}
