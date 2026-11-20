import * as THREE from 'three';
import { TUNING } from '../shared/tuning.js';
import { getSurfaceHeight } from '../sim/terrain.js';

// Mandatory Phase 2 Color Palette (exact hex values)
export const PALETTE = {
  sky: 0x0e1430,
  fog: 0x1b2350,
  grass: 0x2f5d50,
  sand: 0xc9b48a,
  wood: 0x6b4a2f,
  cloudSea: 0x12384a,
  lanternLit: 0xffb347,
  lanternCore: 0xffe9b0,
  lanternOff: 0x5b5f6e,
  moteLight: 0xfff6c2,
  moteWarm: 0xffe58a,
  shadeCore: 0x120a1a,
  shadeGlow: 0x7a3cff,
  shadeMist: 0x3a3450,
  mayRobe: 0xe8e2d0,
  mayScarf: 0xc8102e,
  gold: 0xf2c14e,
  drifter: 0x8fa3b8,
  danger: 0xff5a5f,
};

function createGlowTexture(innerColor, midColor, outerColor = 'rgba(0,0,0,0)') {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  grad.addColorStop(0, innerColor);
  grad.addColorStop(0.35, midColor);
  grad.addColorStop(1, outerColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createRingTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  const grad = ctx.createRadialGradient(cx, cy, size * 0.36, cx, cy, size * 0.5);
  grad.addColorStop(0, 'rgba(255, 179, 71, 0)');
  grad.addColorStop(0.74, 'rgba(255, 179, 71, 0.08)');
  grad.addColorStop(0.89, 'rgba(255, 179, 71, 0.38)');
  grad.addColorStop(0.96, 'rgba(255, 233, 176, 0.62)');
  grad.addColorStop(1, 'rgba(255, 179, 71, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.FogExp2(PALETTE.fog, 0.0115);

  const camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.1, 320);
  camera.position.set(0, 7, -10);

  // Ambient light obeys mandatory formula: 0.15 + 0.55 * (lit / total)
  const ambientLight = new THREE.AmbientLight(0xdce6ff, 0.15);
  scene.add(ambientLight);

  const hemi = new THREE.HemisphereLight(0xffe9b0, PALETTE.cloudSea, 0.42);
  scene.add(hemi);

  const moonLight = new THREE.DirectionalLight(0xc8d4ff, 0.55);
  moonLight.position.set(-30, 48, 22);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(1024, 1024);
  moonLight.shadow.camera.near = 10;
  moonLight.shadow.camera.far = 160;
  const sBound = 65;
  moonLight.shadow.camera.left = -sBound;
  moonLight.shadow.camera.right = sBound;
  moonLight.shadow.camera.top = sBound;
  moonLight.shadow.camera.bottom = -sBound;
  moonLight.shadow.bias = -0.0005;
  scene.add(moonLight);

  // Shared procedural textures
  const warmGlowTex = createGlowTexture('rgba(255,246,194,1)', 'rgba(255,179,71,0.55)');
  const violetGlowTex = createGlowTexture('rgba(165,112,255,0.9)', 'rgba(122,60,255,0.35)');
  const drifterGlowTex = createGlowTexture('rgba(215,232,248,0.95)', 'rgba(143,163,184,0.42)');
  const crimsonGlowTex = createGlowTexture('rgba(255,170,180,0.95)', 'rgba(200,16,46,0.45)');
  const moonGlowTex = createGlowTexture('rgba(255,248,232,0.95)', 'rgba(180,198,255,0.3)');
  const safeRingTex = createRingTexture();

  // Starfield sky dome
  {
    const starCount = 480;
    const positions = new Float32Array(starCount * 3);
    let seed = 42;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < starCount; i += 1) {
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(0.15 + rand() * 0.85);
      const r = 155 + rand() * 45;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        size: 1.5,
        color: PALETTE.moteLight,
        transparent: true,
        opacity: 0.85,
        fog: false,
        depthWrite: false,
      }),
    );
    scene.add(stars);
  }

  // Moon
  {
    const moonGroup = new THREE.Group();
    moonGroup.position.set(-70, 68, 52);
    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(5.5, 20, 20),
      new THREE.MeshBasicMaterial({ color: PALETTE.lanternCore, fog: false }),
    );
    const moonHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: moonGlowTex,
        color: 0xd8e2ff,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        fog: false,
        depthWrite: false,
      }),
    );
    moonHalo.scale.set(36, 36, 1);
    moonGroup.add(moonMesh, moonHalo);
    scene.add(moonGroup);
  }

  // Cloud Sea below
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 500),
    new THREE.MeshStandardMaterial({
      color: PALETTE.cloudSea,
      roughness: 0.55,
      metalness: 0.15,
      transparent: true,
      opacity: 0.94,
    }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -3.2;
  scene.add(sea);

  // Drifting cloud puffs around the archipelago
  const cloudRing = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0x1d475c,
    emissive: PALETTE.cloudSea,
    emissiveIntensity: 0.25,
    roughness: 1.0,
    transparent: true,
    opacity: 0.58,
    flatShading: true,
  });
  for (let i = 0; i < 36; i += 1) {
    const a = (i / 36) * Math.PI * 2;
    const dist = 56 + (i % 4) * 14;
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(4.2 + (i % 3) * 1.8, 1), cloudMat);
    puff.scale.set(1.7, 0.5, 1.3);
    puff.position.set(Math.cos(a) * dist + 15, -2.6 + (i % 3) * 0.7, Math.sin(a) * dist);
    cloudRing.add(puff);
  }
  scene.add(cloudRing);

  // --- Dynamic Level Geometry Root (rebuilt from world.level on night change) ---
  let levelGroup = new THREE.Group();
  let currentLevelNight = null;
  let jumpPadRings = [];
  scene.add(levelGroup);

  function buildLevelGeometry(level) {
    scene.remove(levelGroup);
    levelGroup = new THREE.Group();
    jumpPadRings = [];

    const grassMat = new THREE.MeshStandardMaterial({ color: PALETTE.grass, roughness: 0.9 });
    const sandMat = new THREE.MeshStandardMaterial({ color: PALETTE.sand, roughness: 0.88 });
    const woodMat = new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.85 });
    const cliffMat = new THREE.MeshStandardMaterial({ color: 0x22363a, roughness: 0.95, flatShading: true });
    const goldMat = new THREE.MeshStandardMaterial({
      color: PALETTE.gold,
      emissive: PALETTE.lanternLit,
      emissiveIntensity: 0.45,
      roughness: 0.4,
    });

    // 1. Islands
    for (const isl of level.islands) {
      const top = new THREE.Mesh(
        new THREE.CylinderGeometry(isl.r, isl.r * 0.99, 1.2, 64),
        grassMat,
      );
      top.position.set(isl.cx, (isl.y ?? 0) - 0.6, isl.cz);
      top.receiveShadow = true;
      levelGroup.add(top);

      // Sandy rim ring
      const sandRim = new THREE.Mesh(
        new THREE.RingGeometry(isl.r - 1.8, isl.r, 64),
        sandMat,
      );
      sandRim.rotation.x = -Math.PI / 2;
      sandRim.position.set(isl.cx, (isl.y ?? 0) + 0.015, isl.cz);
      sandRim.receiveShadow = true;
      levelGroup.add(sandRim);

      // Cliff underside
      const cliff = new THREE.Mesh(
        new THREE.CylinderGeometry(isl.r * 0.98, isl.r * 0.82, 5.2, 48),
        cliffMat,
      );
      cliff.position.set(isl.cx, (isl.y ?? 0) - 3.8, isl.cz);
      levelGroup.add(cliff);

      // Edge warning posts
      const posts = Math.max(16, Math.round(isl.r * 0.75));
      for (let i = 0; i < posts; i += 1) {
        const a = (i / posts) * Math.PI * 2;
        const px = isl.cx + Math.cos(a) * (isl.r - 0.5);
        const pz = isl.cz + Math.sin(a) * (isl.r - 0.5);
        // Leave gap at bamboo bridge entrance on Night 2
        if (level.night === 2 && Math.abs(pz) < 2.6 && px > 24 && px < 46) continue;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.75, 6), woodMat);
        post.position.set(px, (isl.y ?? 0) + 0.37, pz);
        levelGroup.add(post);
      }
    }

    // 2. Bridges (Night 2 bamboo bridge, no railings)
    for (const br of level.bridges) {
      const lenX = br.xMax - br.xMin;
      const lenZ = br.zMax - br.zMin;
      const cx = (br.xMin + br.xMax) / 2;
      const cz = (br.zMin + br.zMax) / 2;
      const deck = new THREE.Mesh(new THREE.BoxGeometry(lenX, 0.22, lenZ), woodMat);
      deck.position.set(cx, (br.y ?? 0) - 0.11, cz);
      deck.receiveShadow = true;
      levelGroup.add(deck);

      // Bamboo plank slats
      const slatCount = Math.floor(lenX * 1.4);
      for (let i = 0; i < slatCount; i += 1) {
        const sx = br.xMin + (i + 0.5) * (lenX / slatCount);
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, lenZ - 0.1), sandMat);
        slat.position.set(sx, (br.y ?? 0) + 0.02, cz);
        slat.receiveShadow = true;
        levelGroup.add(slat);
      }
    }

    // 3. Multi-level Tiers (Night 3: Tier 1 annulus Y=3, Tier 2 disc Y=6)
    for (const tier of level.tiers) {
      if (tier.type === 'disc') {
        const mesh = new THREE.Mesh(
          new THREE.CylinderGeometry(tier.rMax, tier.rMax, tier.y, 48),
          grassMat,
        );
        mesh.position.set(tier.cx, tier.y / 2, tier.cz);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        levelGroup.add(mesh);

        const rim = new THREE.Mesh(new THREE.RingGeometry(tier.rMax - 0.7, tier.rMax, 48), sandMat);
        rim.rotation.x = -Math.PI / 2;
        rim.position.set(tier.cx, tier.y + 0.02, tier.cz);
        levelGroup.add(rim);
      } else if (tier.type === 'annulus') {
        // Extrude semicircular annulus (z > 0) from Y=0 to Y=tier.y
        const shape = new THREE.Shape();
        const startA = 0;
        const endA = tier.zPositiveOnly ? Math.PI : Math.PI * 2;
        // Note: Shape is in XY; when rotated X by +PI/2, shape (x, y) -> world (x, 0, y)
        shape.absarc(0, 0, tier.rMax, startA, endA, false);
        shape.lineTo(Math.cos(endA) * tier.rMin, Math.sin(endA) * tier.rMin);
        shape.absarc(0, 0, tier.rMin, endA, startA, true);
        shape.closePath();

        const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
          depth: tier.y,
          bevelEnabled: false,
          curveSegments: 40,
        });
        // Rotate so depth goes along +Y and shape Y goes along +Z
        extrudeGeo.rotateX(Math.PI / 2);
        // After rotateX(+PI/2): (x, y, z) -> (x, -z, y), so translate Y up by tier.y
        extrudeGeo.translate(tier.cx, tier.y, tier.cz);
        const mesh = new THREE.Mesh(extrudeGeo, grassMat);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        levelGroup.add(mesh);
      }
    }

    // 4. Ramps (Night 3: 30° and 150°, width 3m, r=30..24, y=0..3)
    for (const ramp of level.ramps) {
      const rad = (ramp.angleDeg * Math.PI) / 180;
      const ux = Math.cos(rad);
      const uz = Math.sin(rad);
      const horizLen = ramp.rStart - ramp.rEnd;
      const dy = ramp.yEnd - ramp.yStart;
      const slopeLen = Math.hypot(horizLen, dy);
      const pitch = Math.atan2(dy, horizLen);
      const midR = (ramp.rStart + ramp.rEnd) / 2;
      const midY = (ramp.yStart + ramp.yEnd) / 2;

      const rampGroup = new THREE.Group();
      rampGroup.position.set(ux * midR, midY, uz * midR);
      // Orient local -Z or +X along inward direction (-ux, -uz)
      rampGroup.rotation.y = Math.atan2(-ux, -uz);

      const deck = new THREE.Mesh(new THREE.BoxGeometry(ramp.width, 0.25, slopeLen), woodMat);
      deck.rotation.x = -pitch;
      deck.position.y = -0.12;
      deck.receiveShadow = true;
      rampGroup.add(deck);

      levelGroup.add(rampGroup);
    }

    // 5. Obstacles (Night 3 Bell Tower at Tier 2, r=2, h=8)
    for (const obs of level.obstacles) {
      if (obs.type === 'cylinder') {
        const h = obs.yMax - obs.yMin;
        const towerGroup = new THREE.Group();
        towerGroup.position.set(obs.cx, obs.yMin, obs.cz);

        const base = new THREE.Mesh(
          new THREE.CylinderGeometry(obs.r, obs.r * 1.05, h * 0.72, 16),
          woodMat,
        );
        base.position.y = h * 0.36;
        base.castShadow = true;
        base.receiveShadow = true;

        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(obs.r * 1.55, h * 0.35, 8),
          new THREE.MeshStandardMaterial({ color: PALETTE.mayScarf, roughness: 0.7 }),
        );
        roof.position.y = h * 0.85;
        roof.castShadow = true;

        const bell = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.0, 12), goldMat);
        bell.position.y = h * 0.56;

        towerGroup.add(base, roof, bell);
        levelGroup.add(towerGroup);
      }
    }

    // 6. Jump Pads
    for (const pad of level.jumpPads) {
      const pg = new THREE.Group();
      pg.position.set(pad.pos[0], pad.pos[1] + 0.06, pad.pos[2]);

      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(pad.r, pad.r * 1.12, 0.14, 20),
        goldMat,
      );
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(pad.r * 0.85, 0.06, 8, 24),
        new THREE.MeshBasicMaterial({ color: PALETTE.lanternCore, transparent: true, opacity: 0.85 }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.25;
      pg.add(disc, ring);
      levelGroup.add(pg);
      jumpPadRings.push(ring);
    }

    scene.add(levelGroup);
    currentLevelNight = level.night;
  }

  // --- Player: Mây (Áo #E8E2D0, Khăn #C8102E, Nón lá, Handheld Lantern, Orbiting Motes) ---
  const player = new THREE.Group();
  const playerVisual = new THREE.Group();
  player.add(playerVisual);

  const cloak = new THREE.Mesh(
    new THREE.ConeGeometry(0.45, 1.12, 12),
    new THREE.MeshStandardMaterial({ color: PALETTE.mayRobe, roughness: 0.72 }),
  );
  cloak.position.y = 0.6;
  cloak.castShadow = true;

  const scarf = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.08, 8, 16),
    new THREE.MeshStandardMaterial({ color: PALETTE.mayScarf, roughness: 0.6 }),
  );
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.14;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.23, 14, 14),
    new THREE.MeshStandardMaterial({ color: 0xfbe5c8, roughness: 0.6 }),
  );
  head.position.y = 1.32;

  const hatCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.65, 0.4, 20),
    new THREE.MeshStandardMaterial({ color: PALETTE.sand, roughness: 0.78 }),
  );
  hatCone.position.y = 1.62;
  hatCone.castShadow = true;

  const staff = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.03, 1.25, 6),
    new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.85 }),
  );
  staff.position.set(0.45, 0.85, 0.16);
  staff.rotation.z = -0.1;

  const handLamp = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.14, 1),
    new THREE.MeshStandardMaterial({
      color: PALETTE.lanternCore,
      emissive: PALETTE.lanternLit,
      emissiveIntensity: 1.6,
      roughness: 0.3,
    }),
  );
  handLamp.position.set(0.52, 1.38, 0.22);

  const handLampHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: warmGlowTex,
      color: PALETTE.lanternLit,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  handLampHalo.scale.set(0.95, 0.95, 1);
  handLamp.add(handLampHalo);

  // Wind Charm crimson aura around Mây when active
  const charmAura = new THREE.Mesh(
    new THREE.TorusGeometry(0.68, 0.05, 8, 24),
    new THREE.MeshBasicMaterial({ color: PALETTE.mayScarf, transparent: true, opacity: 0.85 }),
  );
  charmAura.rotation.x = Math.PI / 2;
  charmAura.position.y = 0.22;
  charmAura.visible = false;

  playerVisual.add(cloak, scarf, head, hatCone, staff, handLamp);
  player.add(charmAura);

  const playerLight = new THREE.PointLight(PALETTE.lanternLit, 2.0, 14, 1.5);
  playerLight.position.set(0.35, 1.6, 0.2);
  player.add(playerLight);

  // Orbiting carried fireflies (up to 10)
  const carriedOrbs = [];
  for (let i = 0; i < (TUNING.carry_capacity ?? 10); i += 1) {
    const orb = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: warmGlowTex,
        color: PALETTE.moteWarm,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    orb.scale.set(0.32, 0.32, 1);
    orb.visible = false;
    player.add(orb);
    carriedOrbs.push(orb);
  }
  scene.add(player);

  // --- Night 3 Wind Leaf / Streak Particles ---
  const windCount = 90;
  const windPositions = new Float32Array(windCount * 3);
  for (let i = 0; i < windCount; i += 1) {
    windPositions[i * 3] = (Math.random() - 0.5) * 60;
    windPositions[i * 3 + 1] = 0.5 + Math.random() * 10;
    windPositions[i * 3 + 2] = (Math.random() - 0.5) * 60;
  }
  const windGeo = new THREE.BufferGeometry();
  windGeo.setAttribute('position', new THREE.BufferAttribute(windPositions, 3));
  const windMat = new THREE.PointsMaterial({
    color: PALETTE.sand,
    size: 0.35,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const windParticles = new THREE.Points(windGeo, windMat);
  scene.add(windParticles);

  // --- Entity Pools ---
  const lanternMeshes = new Map();
  const moteMeshes = new Map();
  const shadeMeshes = new Map();
  const drifterMeshes = new Map();
  const charmMeshes = new Map();
  const vfxList = [];

  function clearEntityPools() {
    for (const m of lanternMeshes.values()) scene.remove(m);
    for (const m of moteMeshes.values()) scene.remove(m);
    for (const m of shadeMeshes.values()) scene.remove(m);
    for (const m of drifterMeshes.values()) scene.remove(m);
    for (const m of charmMeshes.values()) scene.remove(m);
    lanternMeshes.clear();
    moteMeshes.clear();
    shadeMeshes.clear();
    drifterMeshes.clear();
    charmMeshes.clear();
  }

  function ensureLantern(id) {
    if (lanternMeshes.has(id)) return lanternMeshes.get(id);
    const g = new THREE.Group();

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.72, 0.45, 8),
      new THREE.MeshStandardMaterial({ color: PALETTE.lanternOff, roughness: 0.9 }),
    );
    pedestal.position.y = 0.22;

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.14, 3.6, 8),
      new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.85 }),
    );
    pole.position.y = 2.0;
    pole.castShadow = true;

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(0.95, 0.48, 8),
      new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.78 }),
    );
    roof.position.y = 3.92;

    const bulbMat = new THREE.MeshStandardMaterial({
      color: PALETTE.lanternOff,
      emissive: PALETTE.lanternLit,
      emissiveIntensity: 0,
      roughness: 0.4,
    });
    const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.34, 0.92, 8), bulbMat);
    bulb.position.y = 3.18;

    const haloMat = new THREE.SpriteMaterial({
      map: warmGlowTex,
      color: PALETTE.lanternLit,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const halo = new THREE.Sprite(haloMat);
    halo.position.y = 3.18;
    halo.scale.set(2.4, 2.4, 1);

    const safeR = TUNING.safe_radius ?? 6;
    const safeRingMat = new THREE.MeshBasicMaterial({
      map: safeRingTex,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const safeRing = new THREE.Mesh(new THREE.PlaneGeometry(safeR * 2, safeR * 2), safeRingMat);
    safeRing.rotation.x = -Math.PI / 2;
    safeRing.position.y = 0.08;

    const light = new THREE.PointLight(PALETTE.lanternLit, 0, 22, 1.4);
    light.position.y = 3.2;

    g.add(pedestal, pole, roof, bulb, halo, safeRing, light);
    g.userData = { bulbMat, halo, haloMat, safeRingMat, light };
    scene.add(g);
    lanternMeshes.set(id, g);
    return g;
  }

  function createMoteMesh() {
    const g = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 10),
      new THREE.MeshBasicMaterial({ color: PALETTE.moteLight }),
    );
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: warmGlowTex,
        color: PALETTE.moteWarm,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    halo.scale.set(0.95, 0.95, 1);
    g.add(core, halo);
    return g;
  }

  function createShadeMesh() {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: PALETTE.shadeCore,
      emissive: PALETTE.shadeGlow,
      emissiveIntensity: 0.55,
      roughness: 0.7,
      flatShading: true,
    });
    const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.56, 0), bodyMat);
    body.position.y = 0.85;
    body.castShadow = true;

    const skirt = new THREE.Mesh(
      new THREE.ConeGeometry(0.62, 0.85, 7),
      new THREE.MeshStandardMaterial({
        color: PALETTE.shadeMist,
        emissive: PALETTE.shadeCore,
        transparent: true,
        opacity: 0.85,
        flatShading: true,
      }),
    );
    skirt.position.y = 0.42;

    const eyeMat = new THREE.MeshBasicMaterial({ color: PALETTE.shadeGlow });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeMat);
    leftEye.position.set(-0.18, 0.96, 0.46);
    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeMat);
    rightEye.position.set(0.18, 0.96, 0.46);

    const aura = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: violetGlowTex,
        color: PALETTE.shadeGlow,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    aura.position.y = 0.85;
    aura.scale.set(2.0, 2.0, 1);

    const stunRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.04, 6, 16),
      new THREE.MeshBasicMaterial({ color: PALETTE.gold }),
    );
    stunRing.rotation.x = Math.PI / 2;
    stunRing.position.y = 1.65;
    stunRing.visible = false;

    g.add(body, skirt, leftEye, rightEye, aura, stunRing);
    g.userData = { body, bodyMat, eyeMat, aura, stunRing };
    return g;
  }

  function createDrifterMesh() {
    // Sleek pale-blue wind spirit (#8FA3B8) — visually distinct from Shades
    const g = new THREE.Group();
    const coreMat = new THREE.MeshStandardMaterial({
      color: PALETTE.drifter,
      emissive: PALETTE.drifter,
      emissiveIntensity: 0.45,
      roughness: 0.35,
      flatShading: true,
    });
    const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), coreMat);
    body.scale.set(0.8, 1.45, 0.8);
    body.position.y = 1.05;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.05, 6, 18),
      new THREE.MeshBasicMaterial({ color: PALETTE.drifter, transparent: true, opacity: 0.7 }),
    );
    ring.rotation.x = Math.PI / 2.4;
    ring.position.y = 0.95;

    const aura = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: drifterGlowTex,
        color: PALETTE.drifter,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    aura.position.y = 1.0;
    aura.scale.set(2.0, 2.0, 1);

    g.add(body, ring, aura);
    g.userData = { body, ring };
    return g;
  }

  function createCharmMesh() {
    // Crimson Wind Charm (#C8102E) + Gold trim (#F2C14E)
    const g = new THREE.Group();
    const ribbon = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.72, 0.08),
      new THREE.MeshStandardMaterial({
        color: PALETTE.mayScarf,
        emissive: PALETTE.mayScarf,
        emissiveIntensity: 0.65,
        roughness: 0.4,
      }),
    );
    ribbon.position.y = 0.95;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.04, 8, 20),
      new THREE.MeshBasicMaterial({ color: PALETTE.gold }),
    );
    ring.position.y = 0.95;

    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: crimsonGlowTex,
        color: PALETTE.mayScarf,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    halo.position.y = 0.95;
    halo.scale.set(1.8, 1.8, 1);

    g.add(ribbon, ring, halo);
    g.userData = { ribbon, ring };
    return g;
  }

  // --- VFX Spawners ---
  function spawnPulseVfx(pos) {
    const maxR = TUNING.pulse_radius ?? 5;
    const ringGeo = new THREE.RingGeometry(0.35, 0.75, 40);
    const ringMat = new THREE.MeshBasicMaterial({
      color: PALETTE.lanternCore,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos[0], pos[1] + 0.8, pos[2]);
    scene.add(ring);

    const flash = new THREE.PointLight(PALETTE.lanternLit, 7, maxR * 2.2);
    flash.position.set(pos[0], pos[1] + 1.2, pos[2]);
    scene.add(flash);

    vfxList.push({
      age: 0,
      duration: 0.48,
      update(t) {
        const ease = 1 - (1 - t) * (1 - t);
        const s = 0.4 + ease * maxR;
        ring.scale.set(s, s, 1);
        ringMat.opacity = (1 - t) * 0.88;
        flash.intensity = (1 - t) * 7;
      },
      dispose() {
        scene.remove(ring, flash);
        ringGeo.dispose();
        ringMat.dispose();
      },
    });
  }

  function spawnDashVfx(pos) {
    const spMat = new THREE.SpriteMaterial({
      map: warmGlowTex,
      color: PALETTE.gold,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sp = new THREE.Sprite(spMat);
    sp.position.set(pos[0], pos[1] + 0.9, pos[2]);
    sp.scale.set(1.5, 1.5, 1);
    scene.add(sp);
    vfxList.push({
      age: 0,
      duration: 0.3,
      update(t) {
        spMat.opacity = (1 - t) * 0.75;
        sp.scale.setScalar(1.5 + t * 0.9);
      },
      dispose() {
        scene.remove(sp);
        spMat.dispose();
      },
    });
  }

  function spawnLanternLitVfx(pos) {
    const pillarGeo = new THREE.CylinderGeometry(0.25, 1.4, 16, 16, 1, true);
    const pillarMat = new THREE.MeshBasicMaterial({
      color: PALETTE.lanternCore,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(pos[0], pos[1] + 8, pos[2]);
    scene.add(pillar);
    vfxList.push({
      age: 0,
      duration: 1.25,
      update(t) {
        pillar.scale.set(1 + t * 0.8, 1 + t * 0.2, 1 + t * 0.8);
        pillarMat.opacity = (1 - t) * 0.65;
      },
      dispose() {
        scene.remove(pillar);
        pillarGeo.dispose();
        pillarMat.dispose();
      },
    });
  }

  let playerFacing = 0;
  let walkCycle = 0;
  let shakeTime = 0;
  const camDesired = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const projVec = new THREE.Vector3();

  function handleEvents(events, world) {
    for (const ev of events) {
      if (ev.name === 'pulse') {
        spawnPulseVfx(world.player.pos);
      } else if (ev.name === 'dash') {
        spawnDashVfx(world.player.pos);
      } else if (ev.name === 'lantern_lit') {
        const l = world.lanterns.find((item) => item.id === ev.data.lantern_id);
        if (l) spawnLanternLitVfx(l.pos);
      } else if (ev.name === 'player_hit') {
        shakeTime = 0.35;
      }
    }
  }

  function sync(world, dt = 0.016) {
    if (currentLevelNight !== world.night) {
      clearEntityPools();
      buildLevelGeometry(world.level);
    }

    const t = performance.now() * 0.001;
    const p = world.player;

    // Gentle cloud drift
    cloudRing.rotation.y = t * 0.015;

    // Jump pad ring pulse
    for (const ring of jumpPadRings) {
      ring.position.y = 0.25 + ((t * 1.4) % 1) * 0.8;
      ring.material.opacity = 1 - ((t * 1.4) % 1);
    }

    // Mandatory Ambient Light formula: 0.15 + 0.55 * (lit / total)
    const litCount = world.lanterns.filter((l) => l.lit).length;
    const litRatio = world.lanterns.length > 0 ? litCount / world.lanterns.length : 0;
    ambientLight.intensity = 0.15 + 0.55 * litRatio;

    // Player transform & animation
    player.position.set(p.pos[0], p.pos[1], p.pos[2]);
    const hSpeed = Math.hypot(p.vel[0], p.vel[2]);
    if (hSpeed > 0.2) {
      const targetYaw = Math.atan2(p.vel[0], p.vel[2]);
      let diff = targetYaw - playerFacing;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      playerFacing += diff * Math.min(1, dt * 14);
      walkCycle += dt * 11;
    } else {
      walkCycle += dt * 2.2;
    }
    playerVisual.rotation.y = playerFacing;
    playerVisual.position.y = p.grounded && hSpeed > 0.2 ? Math.abs(Math.sin(walkCycle)) * 0.08 : 0;

    // Hide during respawn or blink during invulnerability
    if (p.respawnTicks > 0) {
      playerVisual.visible = false;
    } else {
      playerVisual.visible = p.invulnTicks <= 0 || Math.floor(t * 16) % 2 === 0;
    }

    charmAura.visible = p.charmTicks > 0;
    if (charmAura.visible) charmAura.rotation.z = t * 4;

    const flameFactor = Math.max(0.2, p.flames / (TUNING.flames || 3));
    playerLight.intensity = (1.6 + Math.sin(t * 6) * 0.15) * flameFactor;

    // Orbiting carried fireflies
    for (let i = 0; i < carriedOrbs.length; i += 1) {
      const orb = carriedOrbs[i];
      if (i < p.carried) {
        orb.visible = true;
        const a = t * 2.4 + (i * Math.PI * 2) / Math.max(1, p.carried);
        orb.position.set(
          Math.cos(a) * 0.92,
          1.1 + Math.sin(t * 3.5 + i * 1.2) * 0.2,
          Math.sin(a) * 0.92,
        );
      } else {
        orb.visible = false;
      }
    }

    // Lanterns
    const cost = TUNING.lantern_cost || 10;
    for (const l of world.lanterns) {
      const m = ensureLantern(l.id);
      m.position.set(l.pos[0], l.pos[1], l.pos[2]);
      const lit = Boolean(l.lit);
      const progress = lit ? 1 : Math.min(1, (l.deposited || 0) / cost);
      const pulse = Math.sin(t * 3.2 + l.pos[0]) * 0.1;

      if (lit) {
        m.userData.bulbMat.color.setHex(PALETTE.lanternCore);
        m.userData.bulbMat.emissive.setHex(PALETTE.lanternLit);
        m.userData.bulbMat.emissiveIntensity = 1.85 + pulse;
        m.userData.light.intensity = 3.0 + pulse;
        m.userData.haloMat.opacity = 0.85;
        m.userData.halo.scale.setScalar(3.5 + pulse * 0.5);
        m.userData.safeRingMat.opacity = 0.52 + Math.sin(t * 2) * 0.08;
      } else if (progress > 0) {
        m.userData.bulbMat.color.setHex(PALETTE.sand);
        m.userData.bulbMat.emissive.setHex(PALETTE.lanternLit);
        m.userData.bulbMat.emissiveIntensity = 0.35 + progress * 0.8;
        m.userData.light.intensity = 0.4 + progress * 1.0;
        m.userData.haloMat.opacity = 0.3 + progress * 0.3;
        m.userData.halo.scale.setScalar(2.0 + progress * 0.7);
        m.userData.safeRingMat.opacity = 0;
      } else {
        m.userData.bulbMat.color.setHex(PALETTE.lanternOff);
        m.userData.bulbMat.emissive.setHex(PALETTE.lanternLit);
        m.userData.bulbMat.emissiveIntensity = 0.06;
        m.userData.light.intensity = 0.1;
        m.userData.haloMat.opacity = 0.14;
        m.userData.halo.scale.setScalar(1.5);
        m.userData.safeRingMat.opacity = 0;
      }
    }

    // Motes
    const activeMoteIds = new Set();
    for (const mote of world.motes) {
      if (!mote.active) continue;
      activeMoteIds.add(mote.id);
      let mesh = moteMeshes.get(mote.id);
      if (!mesh) {
        mesh = createMoteMesh();
        scene.add(mesh);
        moteMeshes.set(mote.id, mesh);
      }
      const phase = mote.pos[0] * 0.7 + mote.pos[2] * 0.5;
      mesh.position.set(
        mote.pos[0] + Math.sin(t * 1.8 + phase) * 0.12,
        mote.pos[1] + 0.68 + Math.sin(t * 3.1 + phase) * 0.18,
        mote.pos[2] + Math.cos(t * 1.6 + phase) * 0.12,
      );
      mesh.visible = true;
    }
    for (const [id, mesh] of moteMeshes) {
      if (!activeMoteIds.has(id)) mesh.visible = false;
    }

    // Shades
    const shadeIds = new Set();
    for (const s of world.shades) {
      shadeIds.add(s.id);
      let mesh = shadeMeshes.get(s.id);
      if (!mesh) {
        mesh = createShadeMesh();
        scene.add(mesh);
        shadeMeshes.set(s.id, mesh);
      }
      const stunned = s.state === 'stunned';
      mesh.position.set(s.pos[0], s.pos[1] + Math.sin(t * 4.2 + s.pos[0]) * 0.1, s.pos[2]);
      mesh.visible = true;
      mesh.rotation.y = Math.atan2(p.pos[0] - s.pos[0], p.pos[2] - s.pos[2]);
      mesh.userData.body.rotation.y = t * (stunned ? 0.5 : 2.2);
      mesh.userData.bodyMat.emissiveIntensity = stunned ? 0.15 : 0.62;
      mesh.userData.eyeMat.color.setHex(stunned ? PALETTE.lanternOff : PALETTE.shadeGlow);
      mesh.userData.stunRing.visible = stunned;
      if (stunned) mesh.userData.stunRing.rotation.z = t * 5;
    }
    for (const [id, mesh] of shadeMeshes) {
      if (!shadeIds.has(id)) mesh.visible = false;
    }

    // Drifters (Gió Lạc)
    const drifterIds = new Set();
    for (const d of world.drifters) {
      if (d.state === 'removed') continue;
      drifterIds.add(d.id);
      let mesh = drifterMeshes.get(d.id);
      if (!mesh) {
        mesh = createDrifterMesh();
        scene.add(mesh);
        drifterMeshes.set(d.id, mesh);
      }
      mesh.position.set(d.pos[0], d.pos[1] + Math.sin(t * 5 + d.pos[0]) * 0.18, d.pos[2]);
      mesh.userData.body.rotation.y = t * 3.2;
      mesh.userData.ring.rotation.z = t * 4.5;
      mesh.visible = true;
    }
    for (const [id, mesh] of drifterMeshes) {
      if (!drifterIds.has(id)) mesh.visible = false;
    }

    // Wind Charms
    const charmIds = new Set();
    for (const c of world.charms) {
      if (!c.active) continue;
      charmIds.add(c.id);
      let mesh = charmMeshes.get(c.id);
      if (!mesh) {
        mesh = createCharmMesh();
        scene.add(mesh);
        charmMeshes.set(c.id, mesh);
      }
      mesh.position.set(c.pos[0], c.pos[1] + Math.sin(t * 3) * 0.14, c.pos[2]);
      mesh.userData.ribbon.rotation.y = t * 2.5;
      mesh.userData.ring.rotation.y = -t * 2.0;
      mesh.visible = true;
    }
    for (const [id, mesh] of charmMeshes) {
      if (!charmIds.has(id)) mesh.visible = false;
    }

    // Night 3 Wind particle streaks (during warning or active gust)
    const showWind = world.wind?.active || world.wind?.warning;
    windMat.opacity = world.wind?.active ? 0.78 : world.wind?.warning ? 0.38 : 0;
    if (showWind) {
      const wRad = ((world.wind.dir_deg || 0) * Math.PI) / 180;
      const spd = world.wind.active ? 22 : 9;
      const vx = Math.cos(wRad) * spd * dt;
      const vz = Math.sin(wRad) * spd * dt;
      const arr = windGeo.attributes.position.array;
      for (let i = 0; i < windCount; i += 1) {
        arr[i * 3] += vx;
        arr[i * 3 + 2] += vz;
        if (Math.abs(arr[i * 3] - p.pos[0]) > 34) arr[i * 3] = p.pos[0] + (Math.random() - 0.5) * 60;
        if (Math.abs(arr[i * 3 + 2] - p.pos[2]) > 34) arr[i * 3 + 2] = p.pos[2] + (Math.random() - 0.5) * 60;
      }
      windGeo.attributes.position.needsUpdate = true;
    }

    // Update transient VFX
    for (let i = vfxList.length - 1; i >= 0; i -= 1) {
      const fx = vfxList[i];
      fx.age += dt;
      fx.update(Math.min(1, fx.age / fx.duration), dt);
      if (fx.age >= fx.duration) {
        fx.dispose();
        vfxList.splice(i, 1);
      }
    }

    if (shakeTime > 0) shakeTime = Math.max(0, shakeTime - dt);
  }

  function updateCamera(world, yawDeg, dt = 0.016) {
    const yaw = (yawDeg * Math.PI) / 180;
    const p = world.player.pos;
    const dist = 8.8;
    const camX = p[0] - Math.sin(yaw) * dist;
    const camZ = p[2] - Math.cos(yaw) * dist;
    let camY = Math.max(p[1], 0) + 4.8;

    // Prevent camera from clipping into elevated tiers/terrain
    const terrainAtCam = getSurfaceHeight(world.level, camX, camZ, camY + 6);
    if (terrainAtCam !== null && camY < terrainAtCam + 1.8) {
      camY = terrainAtCam + 1.8;
    }

    camDesired.set(camX, camY, camZ);
    camera.position.lerp(camDesired, Math.min(1, dt * 10));

    if (shakeTime > 0) {
      const amp = shakeTime * 0.5;
      camera.position.x += (Math.random() - 0.5) * amp;
      camera.position.y += (Math.random() - 0.5) * amp;
    }

    camTarget.set(p[0], Math.max(p[1], -2) + 1.45, p[2]);
    camera.lookAt(camTarget);
  }

  /**
   * Compute screen-edge arrow angle for nearest unlit lantern when it is off-screen.
   */
  function getOffscreenLanternIndicator(world) {
    const p = world.player.pos;
    let best = null;
    let bestD = Infinity;
    for (const l of world.lanterns) {
      if (l.lit) continue;
      const d = Math.hypot(l.pos[0] - p[0], l.pos[2] - p[2]);
      if (d < bestD) {
        bestD = d;
        best = l;
      }
    }
    if (!best) return null;

    projVec.set(best.pos[0], best.pos[1] + 2.8, best.pos[2]);
    projVec.project(camera);

    const inFront = projVec.z < 1;
    const onScreen = inFront && Math.abs(projVec.x) <= 0.92 && Math.abs(projVec.y) <= 0.88;
    if (onScreen) return null;

    let sx = projVec.x;
    let sy = projVec.y;
    if (!inFront) {
      sx = -sx;
      sy = -sy;
    }
    const angleRad = Math.atan2(-sy, sx);
    return {
      id: best.id,
      dist: Math.round(bestD),
      angleDeg: (angleRad * 180) / Math.PI,
      nx: Math.cos(angleRad),
      ny: Math.sin(angleRad),
    };
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return {
    renderer,
    scene,
    camera,
    sync,
    updateCamera,
    handleEvents,
    getOffscreenLanternIndicator,
    player,
  };
}
