import { TUNING } from '../../shared/tuning.js';
import { timeLeft } from '../stubWorld.js';
import { floorFuel } from './fuel.js';

function requiredLit(total, tuning = TUNING) {
  const ratio = tuning.win_ratio ?? 0.6;
  return Math.ceil(ratio * total);
}

function applyDawnVictoryBonuses(world, tuning) {
  for (const lantern of world.lanterns) {
    if (!lantern.lit) continue;
    world.score += (tuning.score?.per_dawn_lantern ?? 50) + floorFuel(lantern);
  }
  world.score += world.player.flames * (tuning.score?.per_flame_left ?? 50);
}

/**
 * Step 11 (Phase 3): Win/Lose after all tick updates.
 * 1. flames <= 0 → lost (no_flames) — precedence even on final tick
 * 2. timeLeft <= 0 → if lit >= ceil(0.6*N) → won (dawn_survived), else lost (dawn)
 * No early victory when all lanterns lit.
 * @returns {object[]} events without tick
 */
export function checkWinLose(world, tuning = TUNING) {
  const events = [];
  if (world.state !== 'playing') return events;

  if (world.player.flames <= 0) {
    world.state = 'lost';
    events.push({
      type: 'event',
      name: 'game_over',
      data: { result: 'lost', reason: 'no_flames' },
    });
    return events;
  }

  if (timeLeft(world) > 0) return events;

  const litCount = world.lanterns.filter((l) => l.lit).length;
  const need = requiredLit(world.lanterns.length, tuning);

  if (litCount >= need) {
    world.state = 'won';
    applyDawnVictoryBonuses(world, tuning);
    events.push({
      type: 'event',
      name: 'game_over',
      data: { result: 'won', reason: 'dawn_survived' },
    });
    return events;
  }

  world.state = 'lost';
  events.push({
    type: 'event',
    name: 'game_over',
    data: { result: 'lost', reason: 'dawn' },
  });
  return events;
}

export const checkOutcome = checkWinLose;
export const checkDawn = () => [];
export { requiredLit };
