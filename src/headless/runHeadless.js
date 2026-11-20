import {
  createDefaultWorld,
  applyScenario,
  serializeSnapshot,
  serializeEnd,
} from '../sim/stubWorld.js';
import { spawnDefaultsIfNeeded } from '../sim/spawn.js';
import { step } from '../sim/step.js';
import { TUNING } from '../shared/tuning.js';

/**
 * Resolve input state at tick k from frames (hold last values).
 */
export function buildInputTimeline(frames = []) {
  const byTick = new Map();
  for (const f of frames) byTick.set(f.tick, f);

  let cur = {
    move: [0, 0],
    cam_yaw_deg: 0,
    jump: false,
    interact: false,
    pulse: false,
    dash: false,
    pause: false,
  };

  return (tick) => {
    if (byTick.has(tick)) {
      const f = byTick.get(tick);
      cur = {
        move: f.move !== undefined ? [...f.move] : cur.move,
        cam_yaw_deg: f.cam_yaw_deg !== undefined ? f.cam_yaw_deg : cur.cam_yaw_deg,
        jump: f.jump !== undefined ? f.jump : cur.jump,
        interact: f.interact !== undefined ? f.interact : cur.interact,
        pulse: f.pulse !== undefined ? f.pulse : cur.pulse,
        dash: f.dash !== undefined ? f.dash : cur.dash,
        pause: f.pause !== undefined ? f.pause : cur.pause,
      };
    }
    return { ...cur, move: [...cur.move] };
  };
}

/**
 * Run simulation headlessly and return list of JSONL records (Contract v1.1).
 */
export function runHeadless({ seed, night, ticks, snapshotEvery, scenario, inputs }) {
  const world = createDefaultWorld(night, seed);
  applyScenario(world, scenario);
  spawnDefaultsIfNeeded(world, seed, TUNING);

  const getInput = buildInputTimeline(inputs?.frames || []);
  const lines = [];

  // Snapshot tick 0: after scenario, before inputs
  lines.push(serializeSnapshot(world, 0));
  lines.push({
    type: 'event',
    tick: 0,
    name: 'night_start',
    data: { night: world.night },
  });

  for (let k = 0; k < ticks; k += 1) {
    const input = getInput(k);
    const { events } = step(world, input, TUNING);
    for (const ev of events) lines.push(ev);

    const tick = world.tick;
    if (tick % snapshotEvery === 0) {
      lines.push(serializeSnapshot(world, tick));
    }

    if (world.state !== 'playing') break;
  }

  lines.push(serializeEnd(world));
  return lines;
}
