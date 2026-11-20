#!/usr/bin/env node
/**
 * Phase 4 soak test: 10 nights in one process with seeded random inputs.
 * Usage: node src/soak/cli.js --seed 7 --nights 10 --out soak.json
 */
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { createDefaultWorld } from '../sim/stubWorld.js';
import { spawnDefaultsIfNeeded } from '../sim/spawn.js';
import { step } from '../sim/step.js';
import { TUNING } from '../shared/tuning.js';
import { TICK_HZ } from '../shared/constants.js';
import { createRng } from '../sim/rng.js';

function parseSoakArgs(argv) {
  const out = { seed: 7, nights: 10, out: 'soak.json' };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--seed') out.seed = Number(argv[++i]);
    else if (a === '--nights') out.nights = Number(argv[++i]);
    else if (a === '--out') out.out = argv[++i];
    else if (a === '--help' || a === '-h') out.help = true;
  }
  if (!Number.isInteger(out.seed)) throw Object.assign(new Error('--seed must be int'), { exitCode: 2 });
  if (!Number.isInteger(out.nights) || out.nights < 1) {
    throw Object.assign(new Error('--nights must be positive int'), { exitCode: 2 });
  }
  if (!out.out) throw Object.assign(new Error('--out required'), { exitCode: 2 });
  return out;
}

function rssMb() {
  return Math.round((process.memoryUsage().rss / (1024 * 1024)) * 10) / 10;
}

function makeRandomInputSampler(seed) {
  const rng = createRng(seed * 7919 + 13);
  let move = [0, 0];
  let nextDirTick = 0;

  return (tick) => {
    if (tick >= nextDirTick) {
      const angle = rng() * Math.PI * 2;
      move = [Math.cos(angle), Math.sin(angle)];
      // Renormalize to grid-ish: pick cardinal-ish
      const ax = Math.abs(move[0]);
      const az = Math.abs(move[1]);
      if (ax > az) move = [Math.sign(move[0]) || 1, 0];
      else move = [0, Math.sign(move[1]) || 1];
      nextDirTick = tick + 30;
    }
    return {
      move: [...move],
      cam_yaw_deg: (tick % 360),
      jump: rng() < 0.05,
      dash: rng() < 0.03,
      pulse: rng() < 0.02,
      interact: rng() < 0.1,
      pause: false,
    };
  };
}

function runOneNight(baseSeed, nightIndex) {
  const night = ((nightIndex - 1) % 3) + 1;
  const seed = baseSeed + nightIndex;
  const world = createDefaultWorld(night, seed);
  spawnDefaultsIfNeeded(world, seed, TUNING);
  const sample = makeRandomInputSampler(seed);
  const maxTicks = Math.ceil(world.duration_s * TICK_HZ) + 5;

  for (let i = 0; i < maxTicks; i += 1) {
    step(world, sample(i), TUNING);
    if (world.state !== 'playing') break;
  }
  // Force dawn resolution if somehow still playing
  if (world.state === 'playing') {
    world.stepsDone = Math.ceil(world.duration_s * TICK_HZ);
    step(world, sample(maxTicks), TUNING);
  }
  return world.state === 'won' ? 'won' : 'lost';
}

function main() {
  try {
    const opts = parseSoakArgs(process.argv);
    if (opts.help) {
      process.stdout.write('Usage: node src/soak/cli.js --seed 7 --nights 10 --out soak.json\n');
      process.exitCode = 0;
      return;
    }

    const t0 = performance.now();
    let crashes = 0;
    const results = [];
    let memStart = null;
    let memEnd = null;

    for (let i = 1; i <= opts.nights; i += 1) {
      try {
        if (i === 1) {
          // Load first night then sample mem_start after load
          const night = 1;
          const seed = opts.seed + i;
          const w = createDefaultWorld(night, seed);
          spawnDefaultsIfNeeded(w, seed, TUNING);
          memStart = rssMb();
          // Run the night properly
          results.push(runOneNight(opts.seed, i));
        } else {
          results.push(runOneNight(opts.seed, i));
        }
      } catch (err) {
        crashes += 1;
        results.push('crash');
        process.stderr.write(`soak night ${i} crash: ${err?.message || err}\n`);
      }
      if (global.gc) global.gc();
    }

    memEnd = rssMb();
    const duration_s = Math.round(((performance.now() - t0) / 1000) * 10) / 10;

    const report = {
      nights: opts.nights,
      crashes,
      results,
      mem_start_mb: memStart,
      mem_end_mb: memEnd,
      duration_s,
    };
    writeFileSync(opts.out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    process.stdout.write(`Soak written → ${opts.out} (crashes=${crashes})\n`);
    process.exitCode = crashes === 0 ? 0 : 1;
  } catch (err) {
    process.stderr.write(`${err?.message || err}\n`);
    process.exitCode = err?.exitCode ?? 1;
  }
}

main();
