/**
 * Single source of tuning values for Phase 2 (TICKET-02 + Test Contract v1.1).
 * Must stay in sync with game.contract.json (verified by unit tests).
 */
export const TUNING = {
  // Movement & physics
  player_speed: 6,
  player_accel_s: 0.1,
  jump_speed: 7,
  gravity: -20,
  dash_speed: 14,
  dash_duration_s: 0.2,
  dash_cooldown_s: 1.5,

  // Fireflies & Lanterns
  carry_capacity: 10,
  lantern_cost: 10,
  lantern_count_night1: 5,
  lantern_count_night2: 6,
  lantern_count_night3: 7,
  pickup_radius: 1.0,
  pickup_height: 1.5,
  interact_radius: 2.0,
  initial_motes: 40,
  max_motes: 55,
  mote_spawn_interval_ticks: 120,
  dropped_mote_ttl_ticks: 480,

  // Pulse
  pulse_cost: 3,
  pulse_radius: 5,
  pulse_y_offset: 0.8,
  pulse_stun_s: 2.0,
  pulse_stun_ticks: 120,
  pulse_push_m: 4,
  pulse_push_ticks: 15,
  pulse_cooldown_s: 3.0,

  // Nights & health
  night1_duration_s: 300,
  night2_duration_s: 330,
  night3_duration_s: 360,
  flames: 3,
  invuln_s: 1.5,
  invuln_ticks: 90,
  hit_drop_ratio: 0.5,
  fall_enabled: true,
  fall_y: -10,
  respawn_ticks: 60,

  // Shades
  safe_radius: 6,
  safe_push_max_ticks: 30,
  shade_speed: 4.0,
  shade_speed_night3: 4.5,
  // Detect/leash lớn hơn để đuổi từ xa (không cần lại gần mới chase)
  shade_detect_radius: 35,
  shade_leash_radius: 55,
  shade_hit_radius: 1.0,
  shade_hit_height: 1.5,
  shade_recoil_m: 2.0,
  shade_recoil_ticks: 60,
  shade_min_spawn_dist: 12,
  shade_first_spawn_tick: 120,

  // Drifters (Night 2 & 3)
  drifter_speed: 7.0,
  drifter_idle_speed: 2.0,
  drifter_max: 2,
  drifter_spawn_interval_ticks: 1200,
  drifter_detect_radius: 15,
  drifter_steal_radius: 1.2,
  drifter_steal_max: 3,
  drifter_min_carried: 5,
  drifter_flee_ticks: 240,
  drifter_drop_flee_ticks: 120,

  // Wind Charm (Night 2 & 3)
  charm_speed: 7.2,
  charm_duration_ticks: 600,
  charm_respawn_ticks: 2700,

  // Wind (Night 3)
  wind_interval_ticks: 1800,
  wind_duration_ticks: 300,
  wind_warn_ticks: 120,
  wind_push_speed: 2.0,

  // Default island radius (Night 1)
  island_radius: 40,

  score: {
    per_mote: 10,
    per_lantern: 100,
    per_stun: 5,
    per_second_left: 2,
    per_flame_left: 50,
  },
};

/** Contract-facing subset matching game.contract.json tuning object. */
export function contractTuning() {
  return {
    player_speed: TUNING.player_speed,
    jump_speed: TUNING.jump_speed,
    gravity: TUNING.gravity,
    dash_speed: TUNING.dash_speed,
    dash_duration_s: TUNING.dash_duration_s,
    dash_cooldown_s: TUNING.dash_cooldown_s,
    carry_capacity: TUNING.carry_capacity,
    lantern_cost: TUNING.lantern_cost,
    lantern_count_night1: TUNING.lantern_count_night1,
    lantern_count_night2: TUNING.lantern_count_night2,
    lantern_count_night3: TUNING.lantern_count_night3,
    pickup_radius: TUNING.pickup_radius,
    interact_radius: TUNING.interact_radius,
    pulse_cost: TUNING.pulse_cost,
    pulse_radius: TUNING.pulse_radius,
    night1_duration_s: TUNING.night1_duration_s,
    night2_duration_s: TUNING.night2_duration_s,
    night3_duration_s: TUNING.night3_duration_s,
    flames: TUNING.flames,
    invuln_s: TUNING.invuln_s,
    hit_drop_ratio: TUNING.hit_drop_ratio,
    pulse_stun_s: TUNING.pulse_stun_s,
    pulse_push_m: TUNING.pulse_push_m,
    pulse_cooldown_s: TUNING.pulse_cooldown_s,
    safe_radius: TUNING.safe_radius,
    shade_speed: TUNING.shade_speed,
    shade_speed_night3: TUNING.shade_speed_night3,
    shade_hit_radius: TUNING.shade_hit_radius,
    fall_enabled: TUNING.fall_enabled,
    score: { ...TUNING.score },
  };
}
