import { TUNING } from '../../shared/tuning.js';

/**
 * Night 3 wind cycle:
 * Every 30s (1800 ticks), blows for 5s (300 ticks), with 2s (120 ticks) warning beforehand.
 * Deterministic direction chosen via world.rng().
 */
export function updateWind(world, tuning = TUNING) {
  if (!world.level?.hasWind) return;

  const interval = tuning.wind_interval_ticks ?? 1800;
  const duration = tuning.wind_duration_ticks ?? 300;
  const warn = tuning.wind_warn_ticks ?? 120;

  world.wind.cycleTick += 1;
  const c = world.wind.cycleTick;
  const mod = c % interval;

  // Enter warning window 2s before the next gust (and pick deterministic direction)
  if (mod === interval - warn) {
    world.wind.warning = true;
    world.wind.dir_deg = Math.round(world.rng() * 360 * 1000) / 1000;
  }

  // Start gust at exact multiple of interval (ticks 1800, 3600, ...)
  if (c >= interval && mod === 0) {
    world.wind.warning = false;
    world.wind.active = true;
  } else if (c >= interval && mod === duration) {
    world.wind.active = false;
  }
}
