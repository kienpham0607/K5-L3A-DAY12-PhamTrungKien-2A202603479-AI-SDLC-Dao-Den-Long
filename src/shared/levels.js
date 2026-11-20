import { TUNING } from './tuning.js';

function ringPoints(cx, cz, radius, count, startDeg = 0, y = 0) {
  const pts = [];
  for (let i = 0; i < count; i += 1) {
    const rad = ((startDeg + (i * 360) / count) * Math.PI) / 180;
    pts.push([
      Math.round((cx + Math.cos(rad) * radius) * 1000) / 1000,
      y,
      Math.round((cz + Math.sin(rad) * radius) * 1000) / 1000,
    ]);
  }
  return pts;
}

function buildNight3MoteSpawns() {
  const pts = [];
  // Tier 0 (Y=0): 18 points across outer ring (r=38), mid-south (r=28), and inner-south (r=16)
  const outerAngles = [0, 45, 75, 105, 135, 180, 210, 240, 270, 300, 330, 355];
  for (const deg of outerAngles) {
    const rad = (deg * Math.PI) / 180;
    pts.push([
      Math.round(Math.cos(rad) * 38 * 1000) / 1000,
      0,
      Math.round(Math.sin(rad) * 38 * 1000) / 1000,
    ]);
  }
  const southAngles = [200, 230, 260, 280, 310, 340];
  for (const deg of southAngles) {
    const rad = (deg * Math.PI) / 180;
    pts.push([
      Math.round(Math.cos(rad) * 18 * 1000) / 1000,
      0,
      Math.round(Math.sin(rad) * 18 * 1000) / 1000,
    ]);
  }
  // Tier 1 (Y=3, annulus r=12..24, z>0): 8 points along r=18
  const tier1Angles = [18, 38, 58, 78, 102, 122, 142, 162];
  for (const deg of tier1Angles) {
    const rad = (deg * Math.PI) / 180;
    pts.push([
      Math.round(Math.cos(rad) * 18 * 1000) / 1000,
      3,
      Math.round(Math.sin(rad) * 18 * 1000) / 1000,
    ]);
  }
  // Tier 2 (Y=6, disc r=8 around bell tower r=2): 4 points on r=5.5
  const tier2Angles = [45, 135, 225, 315];
  for (const deg of tier2Angles) {
    const rad = (deg * Math.PI) / 180;
    pts.push([
      Math.round(Math.cos(rad) * 5.5 * 1000) / 1000,
      6,
      Math.round(Math.sin(rad) * 5.5 * 1000) / 1000,
    ]);
  }
  return pts;
}

export const LEVELS = {
  1: {
    night: 1,
    name: 'Đảo Bến',
    subtitle: 'Đêm 1 · Đảo Bến',
    intro: 'Hòn đảo bến cảng yên bình giữa biển mây. Hãy thu thập đom đóm và thắp sáng 5 Đèn Lồng Lớn trước bình minh.',
    duration_s: TUNING.night1_duration_s,
    spawn: [0, 0, 0],
    spawnYawDeg: 0,
    islands: [{ id: 'A', cx: 0, cz: 0, r: 40, y: 0 }],
    bridges: [],
    tiers: [],
    ramps: [],
    obstacles: [],
    jumpPads: [],
    lanterns: [
      { id: 'L1', pos: [0, 0, 25] },
      { id: 'L2', pos: [23.8, 0, 7.7] },
      { id: 'L3', pos: [14.7, 0, -20.2] },
      { id: 'L4', pos: [-14.7, 0, -20.2] },
      { id: 'L5', pos: [-23.8, 0, 7.7] },
    ],
    moteSpawns: [
      ...ringPoints(0, 0, 8, 8, 0, 0),
      ...ringPoints(0, 0, 16, 12, 15, 0),
      ...ringPoints(0, 0, 24, 12, 0, 0),
      ...ringPoints(0, 0, 32, 14, 10, 0),
      ...ringPoints(0, 0, 37, 10, 5, 0),
    ],
    shadeSpawns: ringPoints(0, 0, 34, 12, 15, 0),
    shadeSpeed: TUNING.shade_speed,
    shadeIntervalTicks: 8 * 60,
    maxShades: 6,
    hasDrifters: false,
    drifterSpawns: [],
    charms: [],
    hasWind: false,
  },

  2: {
    night: 2,
    name: 'Đảo Cau',
    subtitle: 'Đêm 2 · Đảo Cau',
    intro: 'Hai hòn đảo nối nhau bằng cầu tre chênh vênh và hai bục gió phóng. Cẩn thận Gió Lạc rình rập cướp đom đóm!',
    duration_s: TUNING.night2_duration_s,
    spawn: [0, 0, 0],
    spawnYawDeg: 0,
    islands: [
      { id: 'A', cx: 0, cz: 0, r: 28, y: 0 },
      { id: 'B', cx: 70, cz: 0, r: 28, y: 0 },
    ],
    bridges: [{ id: 'BR1', xMin: 26, xMax: 44, zMin: -2, zMax: 2, y: 0 }],
    tiers: [],
    ramps: [],
    obstacles: [],
    jumpPads: [
      { id: 'JP1', pos: [20, 0, 18], r: 1, vy: 14, vh: 24, target: [70, 0, 0] },
      { id: 'JP2', pos: [50, 0, -18], r: 1, vy: 14, vh: 24, target: [0, 0, 0] },
    ],
    lanterns: [
      { id: 'L1', pos: [0, 0, 20] },
      { id: 'L2', pos: [17, 0, -10] },
      { id: 'L3', pos: [-17, 0, -10] },
      { id: 'L4', pos: [70, 0, 20] },
      { id: 'L5', pos: [87, 0, -10] },
      { id: 'L6', pos: [53, 0, -10] },
    ],
    moteSpawns: [
      ...ringPoints(0, 0, 8, 6, 30, 0),
      ...ringPoints(0, 0, 14, 8, 0, 0),
      ...ringPoints(0, 0, 22, 10, 18, 0),
      ...ringPoints(70, 0, 8, 6, 30, 0),
      ...ringPoints(70, 0, 14, 8, 0, 0),
      ...ringPoints(70, 0, 22, 10, 18, 0),
    ],
    shadeSpawns: [
      ...ringPoints(0, 0, 26, 8, 0, 0),
      ...ringPoints(70, 0, 26, 8, 0, 0),
    ],
    shadeSpeed: TUNING.shade_speed,
    shadeIntervalTicks: 7 * 60,
    maxShades: 8,
    hasDrifters: true,
    drifterSpawns: [
      [15, 0, 15],
      [55, 0, -15],
      [70, 0, 12],
      [-15, 0, -15],
    ],
    charms: [{ id: 'C1', pos: [35, 0, 0] }],
    hasWind: false,
  },

  3: {
    night: 3,
    name: 'Đảo Chuông',
    subtitle: 'Đêm 3 · Đảo Chuông',
    intro: 'Hòn đảo ba tầng với Tháp Chuông cổ kính và những cơn gió đêm dữ dội. Thắp sáng 7 Đèn Lồng Lớn để đón Bình Minh!',
    duration_s: TUNING.night3_duration_s,
    spawn: [0, 0, -14],
    spawnYawDeg: 0,
    islands: [{ id: 'A', cx: 0, cz: 0, r: 45, y: 0 }],
    bridges: [],
    tiers: [
      { id: 'T1', type: 'annulus', cx: 0, cz: 0, rMin: 12, rMax: 24, zPositiveOnly: true, y: 3 },
      { id: 'T2', type: 'disc', cx: 0, cz: 0, rMax: 8, y: 6 },
    ],
    ramps: [
      { id: 'R1', angleDeg: 30, rStart: 30, rEnd: 24, yStart: 0, yEnd: 3, width: 3 },
      { id: 'R2', angleDeg: 150, rStart: 30, rEnd: 24, yStart: 0, yEnd: 3, width: 3 },
    ],
    obstacles: [
      { id: 'BELL', type: 'cylinder', cx: 0, cz: 0, r: 2, yMin: 6, yMax: 14 },
    ],
    jumpPads: [
      { id: 'JP1', pos: [0, 3, 13], r: 1, vy: 12, vh: 8, dir: [0, -1] },
    ],
    lanterns: [
      { id: 'L1', pos: [0, 6, 6] },
      { id: 'L2', pos: [18, 3, 10] },
      { id: 'L3', pos: [-18, 3, 10] },
      { id: 'L4', pos: [35, 0, -10] },
      { id: 'L5', pos: [-35, 0, -10] },
      { id: 'L6', pos: [20, 0, -35] },
      { id: 'L7', pos: [-20, 0, -35] },
    ],
    moteSpawns: buildNight3MoteSpawns(),
    shadeSpawns: ringPoints(0, 0, 43, 16, 0, 0),
    shadeSpeed: TUNING.shade_speed_night3,
    shadeIntervalTicks: 6 * 60,
    maxShades: 10,
    hasDrifters: true,
    drifterSpawns: [
      [25, 0, -20],
      [-25, 0, -20],
      [30, 0, 15],
      [-30, 0, 15],
    ],
    charms: [
      { id: 'C1', pos: [30, 0, 25] },
      { id: 'C2', pos: [-30, 0, 25] },
    ],
    hasWind: true,
  },
};

export function getLevel(night = 1) {
  const key = Number(night);
  if (!LEVELS[key]) {
    throw new Error(`Unsupported night: ${night} (expected 1, 2, or 3)`);
  }
  return LEVELS[key];
}
