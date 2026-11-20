/**
 * Procedural Web Audio API synthesizer for Đảo Đèn Lồng (zero external copyright assets).
 * Respects browser autoplay policy by lazily initializing/resuming on user interaction.
 */
export function createAudio(initialSettings) {
  let ctx = null;
  let masterGain = null;
  let musicGain = null;
  let sfxGain = null;
  let musicInterval = null;
  let settings = { ...initialSettings };
  let musicPlaying = false;

  const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
  let noteIndex = 0;

  function ensureContext() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
    masterGain = ctx.createGain();
    musicGain = ctx.createGain();
    sfxGain = ctx.createGain();

    musicGain.connect(masterGain);
    sfxGain.connect(masterGain);
    masterGain.connect(ctx.destination);
    applyVolumes();
    return ctx;
  }

  function applyVolumes() {
    if (!masterGain) return;
    const now = ctx.currentTime;
    masterGain.gain.setTargetAtTime(settings.masterVolume, now, 0.03);
    musicGain.gain.setTargetAtTime(settings.musicVolume * 0.25, now, 0.05);
    sfxGain.gain.setTargetAtTime(settings.sfxVolume * 0.55, now, 0.03);
  }

  function playTone(freq, duration, type = 'sine', gainVal = 0.25, slideTo = null, dest = null) {
    const c = ensureContext();
    if (!c) return;
    const target = dest || sfxGain;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gainVal), now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(g);
    g.connect(target);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function playNoise(duration, filterFreq = 800, gainVal = 0.18) {
    const c = ensureContext();
    if (!c) return;
    const bufferSize = Math.floor(c.sampleRate * duration);
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) data[i] = Math.random() * 2 - 1;

    const src = c.createBufferSource();
    src.buffer = buffer;

    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 1.2;

    const g = c.createGain();
    const now = c.currentTime;
    g.gain.setValueAtTime(0.001, now);
    g.gain.exponentialRampToValueAtTime(gainVal, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);

    src.connect(filter);
    filter.connect(g);
    g.connect(sfxGain);
    src.start(now);
  }

  function startMusic() {
    if (musicPlaying) return;
    const c = ensureContext();
    if (!c) return;
    musicPlaying = true;
    musicInterval = window.setInterval(() => {
      if (!ctx || ctx.state !== 'running') return;
      const pattern = [0, 2, 4, 5, 4, 2, 3, 1];
      const freq = PENTATONIC[pattern[noteIndex % pattern.length]];
      noteIndex += 1;
      playTone(freq, 1.4, 'sine', 0.22, null, musicGain);
      if (noteIndex % 4 === 0) {
        playTone(freq * 0.5, 2.2, 'triangle', 0.14, null, musicGain);
      }
    }, 950);
  }

  function stopMusic() {
    musicPlaying = false;
    if (musicInterval) {
      clearInterval(musicInterval);
      musicInterval = null;
    }
  }

  return {
    unlock() {
      ensureContext();
      startMusic();
    },
    updateSettings(next) {
      settings = { ...next };
      applyVolumes();
    },
    stopMusic,
    play(name) {
      if (!ctx || ctx.state !== 'running') return;
      switch (name) {
        case 'mote_picked':
          playTone(660, 0.16, 'sine', 0.22, 990);
          break;
        case 'deposit':
          playTone(440, 0.22, 'triangle', 0.24, 660);
          break;
        case 'lantern_lit':
          playTone(523.25, 0.4, 'triangle', 0.28);
          setTimeout(() => playTone(659.25, 0.45, 'sine', 0.26), 90);
          setTimeout(() => playTone(783.99, 0.65, 'sine', 0.28), 180);
          break;
        case 'pulse':
          playTone(280, 0.45, 'sine', 0.35, 760);
          playNoise(0.28, 1200, 0.16);
          break;
        case 'jump':
          playTone(240, 0.16, 'sine', 0.18, 420);
          break;
        case 'dash':
          playNoise(0.2, 1600, 0.22);
          playTone(420, 0.18, 'triangle', 0.18, 220);
          break;
        case 'player_hit':
          playTone(170, 0.32, 'sawtooth', 0.24, 72);
          playNoise(0.18, 400, 0.2);
          break;
        case 'shade_spawned':
          playTone(145, 0.55, 'triangle', 0.22, 95);
          break;
        case 'charm_picked':
          playTone(587.33, 0.25, 'sine', 0.26, 880);
          setTimeout(() => playTone(1046.5, 0.35, 'sine', 0.22), 80);
          break;
        case 'drifter_steal':
          playTone(520, 0.22, 'sawtooth', 0.16, 260);
          break;
        case 'wind_warn':
          playNoise(0.85, 650, 0.18);
          break;
        case 'countdown':
          playTone(880, 0.09, 'square', 0.12);
          break;
        case 'won':
          [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
            setTimeout(() => playTone(f, 0.5, 'triangle', 0.25), i * 110);
          });
          break;
        case 'lost':
          [329.63, 293.66, 246.94, 196.0].forEach((f, i) => {
            setTimeout(() => playTone(f, 0.45, 'sine', 0.22), i * 140);
          });
          break;
        default:
          break;
      }
    },
  };
}
