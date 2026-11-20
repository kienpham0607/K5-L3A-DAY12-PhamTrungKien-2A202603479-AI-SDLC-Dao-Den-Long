import { TUNING } from '../../shared/tuning.js';
import { distXZ } from '../math.js';

function spawnDroppedMotes(world, count, tuning) {
  const p = world.player.pos;
  const ttl = tuning.dropped_mote_ttl_ticks ?? 480;
  for (let i = 0; i < count; i += 1) {
    const id = `M${world._nextMoteId++}`;
    const angle = (i / Math.max(1, count)) * Math.PI * 2 + world.rng() * 0.35;
    const radius = 1.5 + world.rng() * 1.0; // Ring 1.5–2.5m around Mây
    world.motes.push({
      id,
      pos: [p[0] + Math.cos(angle) * radius, p[1], p[2] + Math.sin(angle) * radius],
      active: true,
      dropped: true,
      ttlTicks: ttl,
      spawnedTick: world.stepsDone, // Pickable from next tick
    });
  }
}

/**
 * Step 9: Shade contact collision (XZ <= 1m, |dy| <= 1.5m).
 * - Max 1 flame lost per tick.
 * - Drops floor(carried / 2) motes on ring 1.5–2.5m (TTL 480 ticks, pickable next tick).
 * - Player invuln = 90 ticks.
 * - Hitting shade recoils 2m over 60 ticks.
 * @returns {object[]} events without tick
 */
export function applyCombat(world, tuning = TUNING) {
  const events = [];
  if (world.state !== 'playing') return events;

  const p = world.player;
  if (p.invulnTicks > 0 || p.respawnTicks > 0) return events;

  const hitR = tuning.shade_hit_radius ?? 1.0;
  const hitH = tuning.shade_hit_height ?? 1.5;
  const recoilTicks = tuning.shade_recoil_ticks ?? 60;

  for (const shade of world.shades) {
    if (
      shade.state === 'stunned' ||
      shade.state === 'recoil' ||
      shade.state === 'spawning' ||
      shade.inSafePush
    ) {
      continue;
    }

    if (distXZ(p.pos, shade.pos) <= hitR && Math.abs(p.pos[1] - shade.pos[1]) <= hitH) {
      const dropped = Math.floor(p.carried * (tuning.hit_drop_ratio ?? 0.5));
      p.carried -= dropped;
      if (dropped > 0) spawnDroppedMotes(world, dropped, tuning);

      p.flames = Math.max(0, p.flames - 1);
      p.invulnTicks = tuning.invuln_ticks ?? 90;

      // Shade recoils 2m away from player over 60 ticks
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
      shade.state = 'recoil';
      shade.recoilTicks = recoilTicks;
      shade.recoilDir = [dx, dz];

      events.push({
        type: 'event',
        name: 'player_hit',
        data: {
          by: 'shade',
          flames: p.flames,
          dropped,
        },
      });
      break; // Max 1 flame lost per tick
    }
  }

  return events;
}
