import { emptyLeaderboard, upsertEntry, validateName, toExportJson } from '../shared/leaderboard.js';

const STORAGE_KEY = 'dao_den_long_leaderboard_v1';

export function loadLocalLeaderboard() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyLeaderboard();
    const parsed = JSON.parse(raw);
    return { entries: Array.isArray(parsed.entries) ? parsed.entries : [] };
  } catch {
    return emptyLeaderboard();
  }
}

function saveLocal(board) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toExportJson(board)));
}

async function syncToServer(board) {
  try {
    await fetch('/api/leaderboard', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toExportJson(board)),
    });
  } catch {
    // preview/static without middleware
  }
}

export async function submitScore({ name, score, nights_won, seed }) {
  if (!validateName(name)) return { ok: false, reason: 'invalid_name' };
  const board = loadLocalLeaderboard();
  const next = upsertEntry(board, {
    name,
    score,
    nights_won,
    seed,
    achieved_at: new Date().toISOString(),
  });
  if (!next.accepted) return { ok: false, reason: 'invalid_name' };
  saveLocal({ entries: next.entries });
  await syncToServer({ entries: next.entries });
  return { ok: true, entries: next.entries };
}

export async function fetchLeaderboard() {
  try {
    const res = await fetch('/api/leaderboard');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.entries)) {
        saveLocal(data);
        return data;
      }
    }
  } catch {
    // fall through
  }
  return loadLocalLeaderboard();
}

export { validateName };
