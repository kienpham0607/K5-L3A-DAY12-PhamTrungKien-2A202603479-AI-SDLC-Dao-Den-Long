export class ArgError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ArgError';
    this.exitCode = 1;
  }
}

/**
 * Parse Test Contract v1.1 headless argv.
 * <cmd> --seed <int> --night <1|2|3> [--scenario <file>] [--inputs <file>]
 *       --ticks <int> --out <file.jsonl> [--snapshot-every <int>]
 */
export function parseArgs(argv) {
  const args = argv.slice(2);
  const out = {
    seed: undefined,
    night: undefined,
    scenario: null,
    inputs: null,
    ticks: undefined,
    out: undefined,
    snapshotEvery: 10,
  };

  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    const need = (name) => {
      if (i + 1 >= args.length) throw new ArgError(`Missing value for ${name}`);
      i += 1;
      return args[i];
    };

    switch (a) {
      case '--seed':
        out.seed = Number(need('--seed'));
        break;
      case '--night':
        out.night = Number(need('--night'));
        break;
      case '--scenario':
        out.scenario = need('--scenario');
        break;
      case '--inputs':
        out.inputs = need('--inputs');
        break;
      case '--ticks':
        out.ticks = Number(need('--ticks'));
        break;
      case '--out':
        out.out = need('--out');
        break;
      case '--snapshot-every':
        out.snapshotEvery = Number(need('--snapshot-every'));
        break;
      default:
        throw new ArgError(`Unknown argument: ${a}`);
    }
  }

  if (!Number.isInteger(out.seed)) throw new ArgError('--seed <int> is required');
  if (![1, 2, 3].includes(out.night)) {
    throw new ArgError('--night must be 1, 2, or 3');
  }
  if (!Number.isInteger(out.ticks) || out.ticks < 0) {
    throw new ArgError('--ticks <int> is required (non-negative integer)');
  }
  if (!out.out || typeof out.out !== 'string') throw new ArgError('--out <file.jsonl> is required');
  if (!Number.isInteger(out.snapshotEvery) || out.snapshotEvery < 1) {
    throw new ArgError('--snapshot-every must be a positive integer');
  }

  return out;
}
