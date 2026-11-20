import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { contractTuning, TUNING } from '../../src/shared/tuning.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('tuning sync with game.contract.json (Contract v1.2)', () => {
  it('matches contract tuning object and v1.2 version', () => {
    const contract = JSON.parse(readFileSync(join(root, 'game.contract.json'), 'utf8'));
    assert.equal(contract.contract_version, '1.2');
    assert.equal(contract.tuning.fuel_max, 100);
    assert.equal(contract.tuning.fuel_decay_per_s, 1.0);
    assert.equal(contract.tuning.fuel_per_mote, 10);
    assert.equal(contract.tuning.relight_cost, 5);
    assert.equal(contract.tuning.win_ratio, 0.6);
    assert.equal(contract.tuning.drain_per_s, 5);
    assert.equal(contract.tuning.low_fuel_threshold, 30);
    assert.equal(contract.tuning.capacity_max, 20);
    assert.equal(contract.tuning.night1_duration_s, 240);
    assert.equal(contract.tuning.night2_duration_s, 270);
    assert.equal(contract.tuning.night3_duration_s, 300);
    assert.equal(TUNING.score.per_mote, 5);
    assert.deepEqual(contract.tuning, contractTuning());
  });
});
