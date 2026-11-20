/**
 * Browser benchmark runner (Contract v1.3).
 * Full Night-1 lighting mood + 200 shades + 100 motes (instanced for draw-call sanity).
 * Query: ?seed=42&duration=30&warmup=3
 */
import * as THREE from 'three';
import { createBenchWorld } from '../sim/benchWorld.js';
import { step } from '../sim/step.js';
import { TUNING } from '../shared/tuning.js';
import { TICK_HZ } from '../shared/constants.js';
import { computeFpsMetrics } from './metrics.js';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || 42);
const duration = Number(params.get('duration') || 30);
const warmup = Number(params.get('warmup') || 3);

const procStart = performance.now();
window.__BENCH_RESULT__ = null;
window.__BENCH_DONE__ = false;
window.__BENCH_ERROR__ = null;

try {
  const canvas = document.createElement('canvas');
  canvas.id = 'game';
  document.body.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
    desynchronized: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(1280, 720, false);
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  canvas.width = 1280;
  canvas.height = 720;
  canvas.style.width = '1280px';
  canvas.style.height = '720px';

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e1430);
  scene.fog = new THREE.FogExp2(0x1b2350, 0.0115);

  const camera = new THREE.PerspectiveCamera(56, 1280 / 720, 0.1, 320);

  // Full lighting mood (Night 1 style)
  scene.add(new THREE.AmbientLight(0xdce6ff, 0.15 + 0.55 * (3 / 5)));
  scene.add(new THREE.HemisphereLight(0xffe9b0, 0x12384a, 0.42));
  const moon = new THREE.DirectionalLight(0xc8d4ff, 0.55);
  moon.position.set(-30, 48, 22);
  moon.castShadow = true;
  scene.add(moon);

  // Island disc
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(40, 64),
    new THREE.MeshStandardMaterial({ color: 0x2f5d50, roughness: 0.9 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const world = createBenchWorld(seed);

  // Lanterns L1–L3 lit with point lights (full VFX)
  for (const l of world.lanterns) {
    const g = new THREE.Group();
    g.position.set(l.pos[0], l.pos[1], l.pos[2]);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, 3.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x6b4a2f }),
    );
    pole.position.y = 2;
    const bulb = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.34, 0.92, 8),
      new THREE.MeshStandardMaterial({
        color: l.lit ? 0xffe9b0 : 0x5b5f6e,
        emissive: 0xffb347,
        emissiveIntensity: l.lit ? 1.8 : 0.05,
      }),
    );
    bulb.position.y = 3.18;
    g.add(pole, bulb);
    if (l.lit) {
      const light = new THREE.PointLight(0xffb347, 3.0, 22, 1.4);
      light.position.y = 3.2;
      g.add(light);
    }
    scene.add(g);
  }

  // 200 shades — InstancedMesh (same count, one draw call)
  const shadeGeo = new THREE.DodecahedronGeometry(0.56, 0);
  const shadeMat = new THREE.MeshStandardMaterial({
    color: 0x120a1a,
    emissive: 0x7a3cff,
    emissiveIntensity: 0.55,
    flatShading: true,
  });
  const shadeMesh = new THREE.InstancedMesh(shadeGeo, shadeMat, world.shades.length);
  shadeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(shadeMesh);
  const dummy = new THREE.Object3D();

  // 100 motes — points
  const motePositions = new Float32Array(world.motes.length * 3);
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
  const motePoints = new THREE.Points(
    moteGeo,
    new THREE.PointsMaterial({ color: 0xfff6c2, size: 0.45, sizeAttenuation: true }),
  );
  scene.add(motePoints);

  const idle = {
    move: [0, 0],
    cam_yaw_deg: 0,
    jump: false,
    interact: false,
    pulse: false,
    dash: false,
    pause: false,
  };

  let loadMs = null;
  let measuring = false;
  let measureStart = null;
  const dts = [];
  let last = null;
  let simAcc = 0;
  let orbitT = 0;
  const hud = document.getElementById('hud');

  function orbitCamera(tSec) {
    const theta = (tSec / 15) * Math.PI * 2;
    camera.position.set(30 * Math.cos(theta), 15, 30 * Math.sin(theta));
    camera.lookAt(0, 0, 0);
  }

  function syncVisuals() {
    for (let i = 0; i < world.shades.length; i += 1) {
      const s = world.shades[i];
      dummy.position.set(s.pos[0], s.pos[1] + 0.85, s.pos[2]);
      dummy.rotation.y = s.wanderAngle || 0;
      dummy.updateMatrix();
      shadeMesh.setMatrixAt(i, dummy.matrix);
    }
    shadeMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < world.motes.length; i += 1) {
      const m = world.motes[i];
      motePositions[i * 3] = m.pos[0];
      motePositions[i * 3 + 1] = m.pos[1] + 0.7;
      motePositions[i * 3 + 2] = m.pos[2];
    }
    moteGeo.attributes.position.needsUpdate = true;
  }

  function finish() {
    const metrics = computeFpsMetrics(dts);
    let peakMem = null;
    let memNote = null;
    if (performance.memory?.usedJSHeapSize) {
      peakMem = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
      memNote = 'Chrome performance.memory (JS heap), not full process RSS';
    } else {
      memNote = 'Web build: process RSS unavailable; peak_mem_mb is null';
    }

    const result = {
      contract_version: '1.3',
      avg_fps: metrics.avg_fps,
      p1_low_fps: metrics.p1_low_fps,
      frame_ms_p95: metrics.frame_ms_p95,
      frames: metrics.frames,
      load_ms: Math.round(loadMs ?? 0),
      peak_mem_mb: peakMem,
      peak_mem_note: memNote,
      vsync_off: true,
      renderer: `Three.js r${THREE.REVISION} WebGLRenderer (bench instanced shades)`,
      os: navigator.userAgent,
      seed,
      duration_s: duration,
      entities: { shades: world.shades.length, motes: world.motes.filter((m) => m.active).length },
    };
    window.__BENCH_RESULT__ = result;
    window.__BENCH_DONE__ = true;
    if (hud) hud.textContent = `DONE avg=${result.avg_fps} p1=${result.p1_low_fps} frames=${result.frames}`;
  }

  function frame(now) {
    if (loadMs == null) loadMs = now - procStart;
    if (last == null) last = now;
    const dtMs = Math.min(100, now - last);
    last = now;
    const dt = dtMs / 1000;

    orbitT += dt;
    orbitCamera(orbitT);

    simAcc += dt;
    while (simAcc >= 1 / TICK_HZ) {
      step(world, idle, TUNING);
      simAcc -= 1 / TICK_HZ;
    }
    syncVisuals();
    renderer.render(scene, camera);

    const elapsed = (now - procStart) / 1000;
    if (!measuring && elapsed >= warmup) {
      measuring = true;
      measureStart = now;
    }
    if (measuring) {
      dts.push(dtMs);
      const mEl = (now - measureStart) / 1000;
      if (hud) hud.textContent = `Measuring ${mEl.toFixed(1)}/${duration}s · frames ${dts.length}`;
      if (mEl >= duration) {
        finish();
        return;
      }
    } else if (hud) {
      hud.textContent = `Warmup ${(warmup - elapsed).toFixed(1)}s…`;
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
} catch (err) {
  window.__BENCH_ERROR__ = String(err?.stack || err);
  window.__BENCH_DONE__ = true;
  window.__BENCH_RESULT__ = null;
  const hud = document.getElementById('hud');
  if (hud) hud.textContent = `ERROR: ${err?.message || err}`;
}
