import { readFileSync } from 'node:fs';
import { FormatError } from '../sim/stubWorld.js';

export function loadJsonFile(path, label) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    const e = new Error(`Cannot read ${label} file: ${path}`);
    e.exitCode = 1;
    e.cause = err;
    throw e;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new FormatError(`Invalid JSON in ${label}: ${err.message}`);
  }
  return data;
}

/**
 * Validate inputs file shape (Contract C / v1.1). Does not simulate.
 */
export function validateInputs(data) {
  if (data == null || typeof data !== 'object' || Array.isArray(data)) {
    throw new FormatError('inputs root must be an object');
  }
  if (!Array.isArray(data.frames)) {
    throw new FormatError('inputs.frames must be an array');
  }

  let lastTick = -Infinity;
  for (let i = 0; i < data.frames.length; i += 1) {
    const f = data.frames[i];
    if (!f || typeof f !== 'object') throw new FormatError(`frames[${i}] must be object`);
    if (!Number.isInteger(f.tick)) throw new FormatError(`frames[${i}].tick must be int`);
    if (f.tick <= lastTick) {
      throw new FormatError(`frames[].tick must strictly increase (at index ${i})`);
    }
    lastTick = f.tick;

    if (f.move !== undefined) {
      if (
        !Array.isArray(f.move) ||
        f.move.length !== 2 ||
        typeof f.move[0] !== 'number' ||
        typeof f.move[1] !== 'number'
      ) {
        throw new FormatError(`frames[${i}].move must be [x,z] numbers`);
      }
    }
    if (f.cam_yaw_deg !== undefined && typeof f.cam_yaw_deg !== 'number') {
      throw new FormatError(`frames[${i}].cam_yaw_deg must be number`);
    }
    for (const key of ['jump', 'interact', 'pulse', 'dash', 'pause']) {
      if (f[key] !== undefined && typeof f[key] !== 'boolean') {
        throw new FormatError(`frames[${i}].${key} must be boolean`);
      }
    }
  }

  return data;
}
