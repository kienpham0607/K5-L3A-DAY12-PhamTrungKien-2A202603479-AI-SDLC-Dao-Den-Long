import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { emptyLeaderboard, toExportJson, upsertEntry } from '../shared/leaderboard.js';

export function leaderboardPath() {
  return join(homedir(), '.dao-den-long', 'leaderboard.json');
}

export function projectLeaderboardPath(root = process.cwd()) {
  return join(root, 'leaderboard.json');
}

export function loadLeaderboardFile(path = leaderboardPath()) {
  try {
    if (!existsSync(path)) return emptyLeaderboard();
    const raw = JSON.parse(readFileSync(path, 'utf8'));
    return { entries: Array.isArray(raw.entries) ? raw.entries : [] };
  } catch {
    return emptyLeaderboard();
  }
}

export function saveLeaderboardFile(board, path = leaderboardPath()) {
  mkdirSync(dirname(path), { recursive: true });
  const payload = toExportJson(board);
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  // Mirror into project for export convenience when cwd is repo
  try {
    writeFileSync(projectLeaderboardPath(), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  } catch {
    // ignore
  }
  return payload;
}

export function addScore(entry, path = leaderboardPath()) {
  const board = loadLeaderboardFile(path);
  const next = upsertEntry(board, entry);
  saveLeaderboardFile({ entries: next.entries }, path);
  return next;
}

export function exportLeaderboard(outPath, path = leaderboardPath()) {
  // Prefer project mirror, then home
  let board = emptyLeaderboard();
  if (existsSync(projectLeaderboardPath())) board = loadLeaderboardFile(projectLeaderboardPath());
  else board = loadLeaderboardFile(path);
  const payload = toExportJson(board);
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return payload;
}
