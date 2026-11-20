import './styles.css';
import { TUNING } from '../shared/tuning.js';
import { TICK_HZ } from '../shared/constants.js';
import { getLevel } from '../shared/levels.js';
import { createDefaultWorld, timeLeft } from '../sim/stubWorld.js';
import { spawnDefaultsIfNeeded } from '../sim/spawn.js';
import { step } from '../sim/step.js';
import { createScene } from './scene.js';
import { createInput } from './input.js';
import { createHud } from './hud.js';
import { loadSettings, saveSettings } from './settings.js';
import { createAudio } from './audio.js';

function bootWorld(night = 1, seed = 1) {
  const world = createDefaultWorld(night, seed);
  spawnDefaultsIfNeeded(world, seed, TUNING);
  return world;
}

document.body.innerHTML = '';
const canvas = document.createElement('canvas');
canvas.id = 'game';
document.body.appendChild(canvas);

let settings = loadSettings();
const audio = createAudio(settings);
const sceneView = createScene(canvas);
const input = createInput(settings.mouseSensitivity, settings.keybinds);

let screen = 'menu';
let settingsReturnTo = 'menu';
let currentNight = 1;
let totalScore = 0;
let nightsWon = 0;
let runSeed = 1;
let world = bootWorld(1, 1);
let acc = 0;
let last = performance.now();
let lastCountdownSec = 11;
let prevWindWarn = false;
let lastGameOverReason = null;

function applySettings(next) {
  settings = next;
  saveSettings(settings);
  audio.updateSettings(settings);
  input.setSensitivity(settings.mouseSensitivity);
  input.setKeybinds(settings.keybinds || {});
  sceneView.setColorblind(settings.colorblindPalette);
  sceneView.setReduceMotion?.(settings.reduceMotion);
}

function safePointerLock() {
  try {
    Promise.resolve(canvas.requestPointerLock?.()).catch(() => {});
  } catch {
    // ignore
  }
}

function showResultScreen() {
  if (document.pointerLockElement) document.exitPointerLock();
  screen = 'result';
  hud.setScreen('result', {
    world,
    totalScore,
    reason: lastGameOverReason,
    nightsWon,
  });
}

const hud = createHud(settings, {
  onSelectNight(night) {
    audio.unlock();
    currentNight = night;
    if (night === 1) {
      totalScore = 0;
      nightsWon = 0;
    }
    runSeed = (Date.now() % 100000) + night;
    world = bootWorld(night, runSeed);
    input.resetYaw(world.level.spawnYawDeg ?? 0);
    hud.reset();
    lastCountdownSec = 11;
    prevWindWarn = false;
    lastGameOverReason = null;
    screen = 'intro';
    hud.setScreen('intro', { level: getLevel(night), totalScore });
  },
  onStartPlaying() {
    audio.unlock();
    world.paused = false;
    screen = 'playing';
    hud.setScreen('playing');
    safePointerLock();
  },
  onResume() {
    audio.unlock();
    if (world.paused) world.paused = false;
    screen = 'playing';
    hud.setScreen('playing');
    safePointerLock();
  },
  onRestartNight() {
    audio.unlock();
    runSeed = (Date.now() % 100000) + currentNight;
    world = bootWorld(currentNight, runSeed);
    input.resetYaw(world.level.spawnYawDeg ?? 0);
    hud.reset();
    acc = 0;
    lastCountdownSec = 11;
    prevWindWarn = false;
    lastGameOverReason = null;
    screen = 'playing';
    hud.setScreen('playing');
    safePointerLock();
  },
  onNextNight() {
    audio.unlock();
    const next = Math.min(3, currentNight + 1);
    currentNight = next;
    runSeed = (Date.now() % 100000) + next;
    world = bootWorld(next, runSeed);
    input.resetYaw(world.level.spawnYawDeg ?? 0);
    hud.reset();
    acc = 0;
    lastCountdownSec = 11;
    prevWindWarn = false;
    lastGameOverReason = null;
    screen = 'intro';
    hud.setScreen('intro', { level: getLevel(next), totalScore });
  },
  onOpenSettings(from) {
    settingsReturnTo = from;
    screen = 'settings';
    hud.setScreen('settings');
  },
  onCloseSettings() {
    screen = settingsReturnTo;
    hud.setScreen(screen);
  },
  onSettingsChange(next) {
    applySettings(next);
  },
  onOpenLeaderboard() {
    screen = 'leaderboard';
    hud.setScreen('leaderboard');
  },
  onMainMenu() {
    if (document.pointerLockElement) document.exitPointerLock();
    screen = 'menu';
    hud.setScreen('menu');
  },
});

input.requestPointerLock(canvas, () => screen === 'playing');
applySettings(settings);
hud.setScreen('menu');

window.addEventListener('pointerdown', () => audio.unlock(), { once: true });

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (input.consumePause()) {
    if (screen === 'playing' && world.state === 'playing') {
      world.paused = true;
      screen = 'pause';
      if (document.pointerLockElement) document.exitPointerLock();
      hud.setScreen('pause');
    } else if (screen === 'pause') {
      world.paused = false;
      screen = 'playing';
      hud.setScreen('playing');
      safePointerLock();
    } else if (screen === 'settings') {
      screen = settingsReturnTo;
      hud.setScreen(screen);
    } else if (screen === 'leaderboard') {
      screen = 'menu';
      hud.setScreen('menu');
    }
  }

  const sample = input.sample();

  if (screen === 'playing' && world.state === 'playing') {
    acc += dt;
    const frameEvents = [];
    const wasGrounded = world.player.grounded;

    while (acc >= 1 / TICK_HZ) {
      if (world.state === 'playing' && !world.paused) {
        const { events } = step(world, sample, TUNING);
        if (events.length > 0) frameEvents.push(...events);
      }
      acc -= 1 / TICK_HZ;
    }

    if (wasGrounded && !world.player.grounded && world.player.vel[1] > 4) {
      audio.play('jump');
    }

    if (world.wind?.warning && !prevWindWarn) {
      audio.play('wind_warn');
    }
    prevWindWarn = Boolean(world.wind?.warning);

    const remS = Math.ceil(Math.max(0, timeLeft(world)));
    if (remS <= 10 && remS > 0 && remS < lastCountdownSec) {
      audio.play('countdown');
      lastCountdownSec = remS;
    }

    if (frameEvents.length > 0) {
      sceneView.handleEvents(frameEvents, world);
      hud.handleEvents(frameEvents);
      for (const ev of frameEvents) {
        if (ev.name === 'mote_picked') audio.play('mote_picked');
        else if (ev.name === 'deposit') audio.play('deposit');
        else if (ev.name === 'lantern_lit') audio.play('lantern_lit');
        else if (ev.name === 'pulse') audio.play('pulse');
        else if (ev.name === 'dash') audio.play('dash');
        else if (ev.name === 'player_hit') audio.play('player_hit');
        else if (ev.name === 'shade_spawned') audio.play('shade_spawned');
        else if (ev.name === 'charm_picked') audio.play('charm_picked');
        else if (ev.name === 'drifter_steal') audio.play('drifter_steal');
        else if (ev.name === 'game_over') {
          lastGameOverReason = ev.data.reason;
          if (ev.data.result === 'won') {
            totalScore += world.score;
            nightsWon = Math.max(nightsWon, world.night);
            audio.play('won');
          } else {
            audio.play('lost');
          }
        }
      }
    }
  }

  if (
    (world.state === 'won' || world.state === 'lost') &&
    screen !== 'result' &&
    screen !== 'menu' &&
    screen !== 'leaderboard'
  ) {
    showResultScreen();
  }

  sceneView.sync(world, dt);
  if (screen === 'menu' || screen === 'intro' || screen === 'leaderboard') {
    const orbitYaw = (now * 0.008) % 360;
    sceneView.updateCamera(world, orbitYaw, dt);
  } else {
    sceneView.updateCamera(world, sample.cam_yaw_deg, dt);
  }

  if (screen === 'playing' || screen === 'pause') {
    let offscreen = null;
    if (screen === 'playing') {
      offscreen = sceneView.getOffscreenShadeIndicator(world)
        || sceneView.getOffscreenLanternIndicator(world);
    }
    hud.update(world, timeLeft(world), sample.cam_yaw_deg, dt, offscreen);
  }

  sceneView.renderer.render(sceneView.scene, sceneView.camera);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
