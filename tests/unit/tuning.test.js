import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { contractTuning } from '../../src/shared/tuning.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('tuning sync with game.contract.json (Contract v1.1)', () => {
  it('matches contract tuning object and v1.1 version', () => {
    const contract = JSON.parse(readFileSync(join(root, 'game.contract.json'), 'utf8'));
    assert.equal(contract.contract_version, '1.1');
    assert.equal(contract.tuning.lantern_count_night1, 5);
    assert.equal(contract.tuning.lantern_count_night2, 6);
    assert.equal(contract.tuning.lantern_count_night3, 7);
    assert.deepEqual(contract.tuning, contractTuning());
  });
});
