const STORAGE_KEY = 'dao_den_long_settings_v4';

export const DEFAULT_KEYBINDS = {
  moveUp: 'KeyW',
  moveDown: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  jump: 'Space',
  dash: 'ShiftLeft',
  interact: 'KeyE',
  pulse: 'KeyQ',
  pause: 'KeyP',
};

const DEFAULTS = {
  masterVolume: 0.65,
  musicVolume: 0.4,
  sfxVolume: 0.8,
  mouseSensitivity: 0.16,
  colorblindPalette: false,
  reduceMotion: false,
  largeText: false,
  keybinds: { ...DEFAULT_KEYBINDS },
};

function mergeKeybinds(raw) {
  return { ...DEFAULT_KEYBINDS, ...(raw && typeof raw === 'object' ? raw : {}) };
}

export function loadSettings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
      || window.localStorage.getItem('dao_den_long_settings_v3')
      || window.localStorage.getItem('dao_den_long_settings_v2');
    if (!raw) return structuredClone(DEFAULTS);
    const parsed = JSON.parse(raw);
    return {
      masterVolume: clampNum(parsed.masterVolume, 0, 1, DEFAULTS.masterVolume),
      musicVolume: clampNum(parsed.musicVolume, 0, 1, DEFAULTS.musicVolume),
      sfxVolume: clampNum(parsed.sfxVolume, 0, 1, DEFAULTS.sfxVolume),
      mouseSensitivity: clampNum(parsed.mouseSensitivity, 0.04, 0.5, DEFAULTS.mouseSensitivity),
      colorblindPalette: Boolean(parsed.colorblindPalette),
      reduceMotion: Boolean(parsed.reduceMotion),
      largeText: Boolean(parsed.largeText),
      keybinds: mergeKeybinds(parsed.keybinds),
    };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export function saveSettings(settings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function findKeybindConflicts(keybinds) {
  const seen = new Map();
  const conflicts = [];
  for (const [action, code] of Object.entries(keybinds || {})) {
    if (!code) continue;
    if (seen.has(code)) conflicts.push({ code, actions: [seen.get(code), action] });
    else seen.set(code, action);
  }
  return conflicts;
}

function clampNum(val, min, max, fallback) {
  if (typeof val !== 'number' || Number.isNaN(val)) return fallback;
  return Math.max(min, Math.min(max, val));
}

export { DEFAULTS as SETTINGS_DEFAULTS };
