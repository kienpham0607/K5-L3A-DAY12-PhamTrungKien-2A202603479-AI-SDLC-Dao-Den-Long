export function createInput(initialSensitivity = 0.16) {
  let sensitivity = initialSensitivity;
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
    // Strafe is negated vs Contract +X: Three.js lookAt third-person camera
    // has view-right = -worldBasisX for our yaw placement, so A/D must flip
    // for camera-relative controls. Headless inputs are unchanged (sim math).
    if (state._keys.has('KeyD') || state._keys.has('ArrowRight')) x -= 1;
    if (state._keys.has('KeyA') || state._keys.has('ArrowLeft')) x += 1;
    if (state._keys.has('KeyW') || state._keys.has('ArrowUp')) z += 1;
    if (state._keys.has('KeyS') || state._keys.has('ArrowDown')) z -= 1;
    state.move = [x, z];
  };

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    state._keys.add(e.code);
    syncMove();
    if (e.code === 'Space') state._jumpDown = true;
    if (e.code === 'KeyE') state._interactDown = true;
    if (e.code === 'KeyQ') state._pulseDown = true;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') state._dashDown = true;
    if (e.code === 'KeyP' || e.code === 'Escape') state._pauseQueued = true;
  });

  window.addEventListener('keyup', (e) => {
    state._keys.delete(e.code);
    syncMove();
    if (e.code === 'Space') state._jumpDown = false;
    if (e.code === 'KeyE') state._interactDown = false;
    if (e.code === 'KeyQ') state._pulseDown = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') state._dashDown = false;
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
            // Ignore pointer lock rejection in restricted/embedded frames
          }
        }
      });
    },
  };
}
