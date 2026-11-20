/**
 * World state creation, scenario override application, and Contract v1.1 serialization.
 * Pure JS — no Three.js / DOM dependencies.
 */
import { TUNING } from '../shared/tuning.js';
import { TICK_HZ } from '../shared/constants.js';
import { getLevel } from '../shared/levels.js';
import { round3, round3Vec3 } from './math.js';
import { createRng } from './rng.js';

export class FormatError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FormatError';
    this.exitCode = 2;
  }
}

function assertVec3(name, v) {
  if (!Array.isArray(v) || v.length !== 3 || v.some((n) => typeof n !== 'number' || Number.isNaN(n))) {
    throw new FormatError(`${name} must be [x,y,z] numbers`);
  }
}

export function createDefaultWorld(night = 1, seed = 0) {
  const level = getLevel(night);
  return {
    seed,
    night: level.night,
    level,
    state: 'playing',
    paused: false,
    score: 0,
    tick: 0,
    stepsDone: 0,
    duration_s: level.duration_s,
    rng: createRng(seed * 997 + level.night * 31 + 1),
    wind: {
      active: false,
      warning: false,
      dir_deg: 0,
      cycleTick: 0,
    },
    player: {
      pos: [...level.spawn],
      vel: [0, 0, 0],
      facing: [0, 1],
      grounded: true,
      carried: 0,
      flames: TUNING.flames,
      invulnTicks: 0,
      dashTicks: 0,
      dashDir: [0, 1],
      dashCdTicks: 0,
      pulseCdTicks: 0,
      charmTicks: 0,
      launching: false,
      fallingHandled: false,
      respawnTicks: 0,
    },
    lanterns: level.lanterns.map((l) => ({
      id: l.id,
      pos: [...l.pos],
      lit: false,
      deposited: 0,
    })),
    motes: [],
    shades: [],
    drifters: [],
    charms: level.charms.map((c) => ({
      id: c.id,
      pos: [...c.pos],
      active: true,
      respawnTicks: 0,
    })),
    random_motes: true,
    random_shades: true,
    random_drifters: true,
    _nextMoteId: 1,
    _nextShadeId: 1,
    _nextDrifterId: 1,
    _nextShadeSpawnTick: TUNING.shade_first_spawn_tick,
    _shadeFirstDone: false,
  };
}

/**
 * Re-seed world RNG deterministically (call after changing seed).
 */
export function reseedWorld(world, seed) {
  world.seed = seed;
  world.rng = createRng(seed * 997 + world.night * 31 + 1);
}

/**
 * Apply scenario overrides without emitting events or scoring (Contract D / v1.1).
 */
export function applyScenario(world, scenario) {
  if (scenario == null) return world;
  if (typeof scenario !== 'object' || Array.isArray(scenario)) {
    throw new FormatError('scenario root must be an object');
  }

  if (scenario.paused !== undefined) {
    world.paused = Boolean(scenario.paused);
  }

  if (scenario.player) {
    if (typeof scenario.player !== 'object') throw new FormatError('player must be object');
    const sp = scenario.player;
    if (sp.pos !== undefined) {
      assertVec3('player.pos', sp.pos);
      world.player.pos = [...sp.pos];
    }
    if (sp.vel !== undefined) {
      assertVec3('player.vel', sp.vel);
      world.player.vel = [...sp.vel];
    }
    if (sp.grounded !== undefined) {
      world.player.grounded = Boolean(sp.grounded);
    }
    if (sp.carried !== undefined) {
      if (typeof sp.carried !== 'number') throw new FormatError('player.carried must be number');
      world.player.carried = sp.carried;
    }
    if (sp.flames !== undefined) {
      if (typeof sp.flames !== 'number') throw new FormatError('player.flames must be number');
      world.player.flames = sp.flames;
    }
    if (sp.invuln !== undefined) {
      world.player.invulnTicks = sp.invuln ? TUNING.invuln_ticks : 0;
    }
    if (sp.invuln_ticks !== undefined) {
      world.player.invulnTicks = Math.max(0, Math.round(sp.invuln_ticks));
    }
    if (sp.dash_cd_s !== undefined) {
      world.player.dashCdTicks = Math.max(0, Math.round(sp.dash_cd_s * TICK_HZ));
    }
    if (sp.pulse_cd_s !== undefined) {
      world.player.pulseCdTicks = Math.max(0, Math.round(sp.pulse_cd_s * TICK_HZ));
    }
    if (sp.charm_s !== undefined) {
      world.player.charmTicks = Math.max(0, Math.round(sp.charm_s * TICK_HZ));
    }
  }

  if (scenario.random_motes !== undefined) world.random_motes = Boolean(scenario.random_motes);
  if (scenario.random_shades !== undefined) world.random_shades = Boolean(scenario.random_shades);
  if (scenario.random_drifters !== undefined) world.random_drifters = Boolean(scenario.random_drifters);

  if (scenario.motes !== undefined) {
    if (!Array.isArray(scenario.motes)) throw new FormatError('motes must be array');
    world.motes = scenario.motes.map((m, i) => {
      if (Array.isArray(m)) {
        assertVec3(`motes[${i}]`, m);
        return {
          id: `M${i + 1}`,
          pos: [...m],
          active: true,
          dropped: false,
          ttlTicks: null,
          spawnedTick: -1,
        };
      }
      if (m && typeof m === 'object' && Array.isArray(m.pos)) {
        assertVec3(`motes[${i}].pos`, m.pos);
        return {
          id: m.id || `M${i + 1}`,
          pos: [...m.pos],
          active: m.active !== undefined ? Boolean(m.active) : true,
          dropped: Boolean(m.dropped),
          ttlTicks: m.ttl_ticks ?? null,
          spawnedTick: -1,
        };
      }
      throw new FormatError(`motes[${i}] invalid`);
    });
    world._nextMoteId = world.motes.length + 1;
  }

  if (scenario.shades !== undefined) {
    if (!Array.isArray(scenario.shades)) throw new FormatError('shades must be array');
    world.shades = scenario.shades.map((s, i) => {
      if (!s || typeof s !== 'object') throw new FormatError(`shades[${i}] must be object`);
      assertVec3(`shades[${i}].pos`, s.pos);
      return {
        id: s.id || `S${i + 1}`,
        pos: [...s.pos],
        state: s.state || 'chase',
        spawnTicks: s.state === 'spawning' ? 30 : 0,
        stunTicks: s.state === 'stunned' ? (s.stun_ticks ?? TUNING.pulse_stun_ticks) : 0,
        pushTicks: 0,
        pushDir: [0, 0],
        recoilTicks: 0,
        recoilDir: [0, 0],
        safePushTicks: 0,
        inSafePush: false,
        wanderAngle: 0,
        wanderTimer: 0,
      };
    });
    world._nextShadeId = world.shades.length + 1;
  }

  if (scenario.drifters !== undefined) {
    if (!Array.isArray(scenario.drifters)) throw new FormatError('drifters must be array');
    world.drifters = scenario.drifters.map((d, i) => {
      if (!d || typeof d !== 'object') throw new FormatError(`drifters[${i}] must be object`);
      assertVec3(`drifters[${i}].pos`, d.pos);
      return {
        id: d.id || `D${i + 1}`,
        pos: [...d.pos],
        state: d.state || 'idle',
        stolen: d.stolen ?? 0,
        hasStolen: Boolean(d.has_stolen || (d.stolen ?? 0) > 0),
        fleeTicks: d.flee_ticks ?? (d.state === 'flee' ? TUNING.drifter_flee_ticks : 0),
        idleAngle: 0,
        idleTimer: 0,
      };
    });
    world._nextDrifterId = world.drifters.length + 1;
  }

  if (scenario.charms !== undefined) {
    if (!Array.isArray(scenario.charms)) throw new FormatError('charms must be array');
    world.charms = scenario.charms.map((c, i) => {
      if (!c || typeof c !== 'object') throw new FormatError(`charms[${i}] must be object`);
      assertVec3(`charms[${i}].pos`, c.pos);
      return {
        id: c.id || `C${i + 1}`,
        pos: [...c.pos],
        active: c.active !== undefined ? Boolean(c.active) : true,
        respawnTicks: c.respawn_ticks ?? 0,
      };
    });
  }

  if (scenario.lanterns !== undefined) {
    if (!Array.isArray(scenario.lanterns)) throw new FormatError('lanterns must be array');
    for (const patch of scenario.lanterns) {
      if (!patch || typeof patch !== 'object' || !patch.id) {
        throw new FormatError('each lantern patch needs id');
      }
      let lantern = world.lanterns.find((l) => l.id === patch.id);
      if (!lantern) {
        lantern = { id: patch.id, pos: [0, 0, 0], lit: false, deposited: 0 };
        world.lanterns.push(lantern);
      }
      if (patch.pos !== undefined) {
        assertVec3(`lantern ${patch.id}.pos`, patch.pos);
        lantern.pos = [...patch.pos];
      }
      if (patch.deposited !== undefined) {
        if (typeof patch.deposited !== 'number') throw new FormatError('deposited must be number');
        lantern.deposited = patch.deposited;
      }
      if (patch.lit !== undefined) lantern.lit = Boolean(patch.lit);
    }
  }

  if (scenario.wind !== undefined) {
    if (typeof scenario.wind !== 'object') throw new FormatError('wind must be object');
    if (scenario.wind.active !== undefined) world.wind.active = Boolean(scenario.wind.active);
    if (scenario.wind.dir_deg !== undefined) world.wind.dir_deg = Number(scenario.wind.dir_deg);
    if (scenario.wind.cycle_tick !== undefined) world.wind.cycleTick = Number(scenario.wind.cycle_tick);
  }

  if (scenario.time_left_s !== undefined) {
    if (typeof scenario.time_left_s !== 'number') throw new FormatError('time_left_s must be number');
    world.duration_s = scenario.time_left_s;
  }

  return world;
}

export function timeLeft(world) {
  return world.duration_s - world.stepsDone / TICK_HZ;
}

export function serializeSnapshot(world, tick) {
  const p = world.player;
  return {
    type: 'snapshot',
    tick,
    sim_tick: world.stepsDone,
    night: world.night,
    state: world.state,
    paused: Boolean(world.paused),
    time_left_s: round3(Math.max(0, timeLeft(world))),
    score: world.score,
    wind: {
      active: Boolean(world.wind.active),
      dir_deg: round3(world.wind.dir_deg),
    },
    player: {
      pos: round3Vec3(p.pos),
      vel: round3Vec3(p.vel),
      grounded: Boolean(p.grounded),
      flames: p.flames,
      carried: p.carried,
      invuln: p.invulnTicks > 0,
      dash_cd_s: round3(p.dashCdTicks / TICK_HZ),
      pulse_cd_s: round3(p.pulseCdTicks / TICK_HZ),
      charm_s: round3(p.charmTicks / TICK_HZ),
    },
    lanterns: world.lanterns.map((l) => ({
      id: l.id,
      pos: round3Vec3(l.pos),
      lit: Boolean(l.lit),
      deposited: l.deposited,
    })),
    motes: world.motes
      .filter((m) => m.active)
      .map((m) => ({
        id: m.id,
        pos: round3Vec3(m.pos),
        active: true,
      })),
    shades: world.shades.map((s) => ({
      id: s.id,
      pos: round3Vec3(s.pos),
      state: s.state,
    })),
    drifters: world.drifters
      .filter((d) => d.state !== 'removed')
      .map((d) => ({
        id: d.id,
        pos: round3Vec3(d.pos),
        state: d.state,
        stolen: d.stolen,
      })),
    charms: world.charms.map((c) => ({
      id: c.id,
      pos: round3Vec3(c.pos),
      active: Boolean(c.active),
    })),
    motes_active: world.motes.filter((m) => m.active).length,
  };
}

export function serializeEnd(world) {
  return {
    type: 'end',
    ticks: world.tick,
    sim_ticks: world.stepsDone,
    night: world.night,
    state: world.state,
    score: world.score,
  };
}

export { TICK_HZ };
