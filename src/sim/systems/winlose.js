import { TUNING } from '../../shared/tuning.js';
import { timeLeft } from '../stubWorld.js';

function applyWinBonuses(world, tuning) {
  const left = Math.max(0, timeLeft(world));
  const seconds = Math.floor(left);
  world.score += seconds * (tuning.score?.per_second_left ?? 2);
  world.score += world.player.flames * (tuning.score?.per_flame_left ?? 50);
}

/**
 * Step 11: Win/Lose evaluation in exact priority order:
 * 1. flames <= 0 -> lost (no_flames)
 * 2. flames > 0 && all lanterns lit -> won (all_lit) + win bonus
 * 3. timeLeft <= 0 -> lost (dawn)
 * @returns {object[]} events without tick
 */
export function checkWinLose(world, tuning = TUNING) {
  const events = [];
  if (world.state !== 'playing') return events;

  // Priority 1: No flames -> immediate defeat
  if (world.player.flames <= 0) {
    world.state = 'lost';
    events.push({
      type: 'event',
      name: 'game_over',
      data: { result: 'lost', reason: 'no_flames' },
    });
    return events;
  }

  // Priority 2: Alive and all lanterns lit -> victory
  const allLit = world.lanterns.length > 0 && world.lanterns.every((l) => l.lit);
  if (allLit) {
    world.state = 'won';
    applyWinBonuses(world, tuning);
    events.push({
      type: 'event',
      name: 'game_over',
      data: { result: 'won', reason: 'all_lit' },
    });
    return events;
  }

  // Priority 3: Time ran out -> dawn defeat
  if (timeLeft(world) <= 0) {
    world.state = 'lost';
    events.push({
      type: 'event',
      name: 'game_over',
      data: { result: 'lost', reason: 'dawn' },
    });
  }

  return events;
}

// Keep legacy exports for compatibility if referenced
export const checkOutcome = checkWinLose;
export const checkDawn = () => [];
