const STORAGE_KEY = 'dao_den_long_settings_v2';

const DEFAULTS = {
  masterVolume: 0.65,
  musicVolume: 0.4,
  sfxVolume: 0.8,
  mouseSensitivity: 0.16,
};

export function loadSettings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      masterVolume: clampNum(parsed.masterVolume, 0, 1, DEFAULTS.masterVolume),
      musicVolume: clampNum(parsed.musicVolume, 0, 1, DEFAULTS.musicVolume),
      sfxVolume: clampNum(parsed.sfxVolume, 0, 1, DEFAULTS.sfxVolume),
      mouseSensitivity: clampNum(parsed.mouseSensitivity, 0.04, 0.5, DEFAULTS.mouseSensitivity),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota / private mode errors
  }
}

function clampNum(val, min, max, fallback) {
  if (typeof val !== 'number' || Number.isNaN(val)) return fallback;
  return Math.max(min, Math.min(max, val));
}
