import { DEFAULT_KEYBINDS } from './settings.js';

export function createInput(initialSensitivity = 0.16, initialKeybinds = DEFAULT_KEYBINDS) {
  let sensitivity = initialSensitivity;
  let keybinds = { ...DEFAULT_KEYBINDS, ...initialKeybinds };
  const state = {
    move: [0, 0],
    cam_yaw_deg: 0,
    _keys: new Set(),
    _jumpDown: false,
    _interactDown: false,
    _pulseDown: false,
    _dashDown: false,
    _pauseQueued: false,
  };

  const syncMove = () => {
    let x = 0;
    let z = 0;
    // Strafe negated vs Contract for Three.js camera-relative controls
    if (state._keys.has(keybinds.moveRight) || state._keys.has('ArrowRight')) x -= 1;
    if (state._keys.has(keybinds.moveLeft) || state._keys.has('ArrowLeft')) x += 1;
    if (state._keys.has(keybinds.moveUp) || state._keys.has('ArrowUp')) z += 1;
    if (state._keys.has(keybinds.moveDown) || state._keys.has('ArrowDown')) z -= 1;
    state.move = [x, z];
  };

  const isDash = (code) => code === keybinds.dash || code === 'ShiftRight';

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    state._keys.add(e.code);
    syncMove();
    if (e.code === keybinds.jump) state._jumpDown = true;
    if (e.code === keybinds.interact) state._interactDown = true;
    if (e.code === keybinds.pulse) state._pulseDown = true;
    if (isDash(e.code)) state._dashDown = true;
    if (e.code === keybinds.pause || e.code === 'Escape') state._pauseQueued = true;
  });

  window.addEventListener('keyup', (e) => {
    state._keys.delete(e.code);
    syncMove();
    if (e.code === keybinds.jump) state._jumpDown = false;
    if (e.code === keybinds.interact) state._interactDown = false;
    if (e.code === keybinds.pulse) state._pulseDown = false;
    if (isDash(e.code)) state._dashDown = false;
  });

  window.addEventListener('blur', () => {
    state._keys.clear();
    state.move = [0, 0];
    state._jumpDown = false;
    state._interactDown = false;
    state._pulseDown = false;
    state._dashDown = false;
  });

  window.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement) {
      state.cam_yaw_deg -= e.movementX * sensitivity;
    }
  });

  return {
    state,
    setSensitivity(val) {
      sensitivity = val;
    },
    setKeybinds(next) {
      keybinds = { ...DEFAULT_KEYBINDS, ...next };
      syncMove();
    },
    resetYaw(deg = 0) {
      state.cam_yaw_deg = deg;
    },
    consumePause() {
      const p = state._pauseQueued;
      state._pauseQueued = false;
      return p;
    },
    sample() {
      return {
        move: [...state.move],
        cam_yaw_deg: state.cam_yaw_deg,
        jump: state._jumpDown,
        interact: state._interactDown,
        pulse: state._pulseDown,
        dash: state._dashDown,
        pause: false,
      };
    },
    requestPointerLock(el, canLock = () => true) {
      el.addEventListener('click', () => {
        if (canLock() && !document.pointerLockElement) {
          try {
            Promise.resolve(el.requestPointerLock?.()).catch(() => {});
          } catch {
            // ignore
          }
        }
      });
    },
  };
}
