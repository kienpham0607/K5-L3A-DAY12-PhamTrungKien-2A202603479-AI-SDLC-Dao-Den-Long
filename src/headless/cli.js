#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { parseArgs, ArgError } from './parseArgs.js';
import { loadJsonFile, validateInputs } from './loadJson.js';
import { runHeadless } from './runHeadless.js';
import { FormatError } from '../sim/stubWorld.js';

function writeJsonl(path, records) {
  const text = `${records.map((r) => JSON.stringify(r)).join('\n')}\n`;
  writeFileSync(path, text, 'utf8');
}

function main() {
  try {
    const opts = parseArgs(process.argv);

    let scenario = null;
    if (opts.scenario) {
      scenario = loadJsonFile(opts.scenario, 'scenario');
      // Structural validation happens inside applyScenario
    }

    let inputs = null;
    if (opts.inputs) {
      inputs = validateInputs(loadJsonFile(opts.inputs, 'inputs'));
    }

    const records = runHeadless({
      seed: opts.seed,
      night: opts.night,
      ticks: opts.ticks,
      snapshotEvery: opts.snapshotEvery,
      scenario,
      inputs,
    });

    writeJsonl(opts.out, records);
    process.exitCode = 0;
  } catch (err) {
    const code = err?.exitCode ?? 1;
    const msg = err?.message || String(err);
    process.stderr.write(`${msg}\n`);
    process.exitCode = code;
  }
}

main();

export { ArgError, FormatError };
