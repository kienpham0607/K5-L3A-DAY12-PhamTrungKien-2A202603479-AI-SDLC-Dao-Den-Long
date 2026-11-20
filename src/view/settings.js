const STORAGE_KEY = 'dao_den_long_settings_v3';

const DEFAULTS = {
  masterVolume: 0.65,
  musicVolume: 0.4,
  sfxVolume: 0.8,
  mouseSensitivity: 0.16,
  colorblindPalette: false,
};

export function loadSettings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    // Migrate from v2 if present
    if (!raw) {
      const legacy = window.localStorage.getItem('dao_den_long_settings_v2');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        return {
          masterVolume: clampNum(parsed.masterVolume, 0, 1, DEFAULTS.masterVolume),
          musicVolume: clampNum(parsed.musicVolume, 0, 1, DEFAULTS.musicVolume),
          sfxVolume: clampNum(parsed.sfxVolume, 0, 1, DEFAULTS.sfxVolume),
          mouseSensitivity: clampNum(parsed.mouseSensitivity, 0.04, 0.5, DEFAULTS.mouseSensitivity),
          colorblindPalette: Boolean(parsed.colorblindPalette),
        };
      }
      return { ...DEFAULTS };
    }
    const parsed = JSON.parse(raw);
    return {
      masterVolume: clampNum(parsed.masterVolume, 0, 1, DEFAULTS.masterVolume),
      musicVolume: clampNum(parsed.musicVolume, 0, 1, DEFAULTS.musicVolume),
      sfxVolume: clampNum(parsed.sfxVolume, 0, 1, DEFAULTS.sfxVolume),
      mouseSensitivity: clampNum(parsed.mouseSensitivity, 0.04, 0.5, DEFAULTS.mouseSensitivity),
      colorblindPalette: Boolean(parsed.colorblindPalette),
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
