/** Leaderboard schema (Phase 4). Shared by browser + Node export. */

export const LEADERBOARD_MAX = 10;
export const NAME_RE = /^[A-Za-z0-9_]{3,12}$/;

export function emptyLeaderboard() {
  return { entries: [] };
}

export function validateName(name) {
  if (typeof name !== 'string') return false;
  return NAME_RE.test(name);
}

/**
 * Insert score; keep top 10 by score desc, then earlier achieved_at first.
 * @returns {{ entries: object[], accepted: boolean }}
 */
export function upsertEntry(board, entry) {
  const entries = [...(board?.entries || [])];
  if (!validateName(entry.name)) return { entries, accepted: false };
  entries.push({
    name: entry.name,
    score: Math.max(0, Math.round(Number(entry.score) || 0)),
    nights_won: Math.max(0, Math.min(3, Math.round(Number(entry.nights_won) || 0))),
    achieved_at: entry.achieved_at || new Date().toISOString(),
    seed: Number(entry.seed) || 0,
  });
  entries.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return String(a.achieved_at).localeCompare(String(b.achieved_at));
  });
  return { entries: entries.slice(0, LEADERBOARD_MAX), accepted: true };
}

export function toExportJson(board) {
  return { entries: [...(board?.entries || [])] };
}
