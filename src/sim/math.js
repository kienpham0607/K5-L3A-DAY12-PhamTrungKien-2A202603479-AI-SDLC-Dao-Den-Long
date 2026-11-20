/** Round to 3 decimal places (Test Contract). */
export function round3(n) {
  return Math.round(Number(n) * 1000) / 1000;
}

export function round3Vec3(v) {
  return [round3(v[0]), round3(v[1]), round3(v[2])];
}

/** Horizontal XZ distance (Contract: no character size). */
export function distXZ(a, b) {
  const dx = a[0] - b[0];
  const dz = a[2] - b[2];
  return Math.hypot(dx, dz);
}

/**
 * Contract C move basis:
 * θ = cam_yaw_deg in radians
 * x' = x·cosθ + z·sinθ
 * z' = −x·sinθ + z·cosθ
 * Vector longer than 1 is normalized to length 1.
 */
export function worldMoveFromInput(moveXZ, camYawDeg) {
  let x = Number(moveXZ?.[0] ?? 0);
  let z = Number(moveXZ?.[1] ?? 0);
  const len = Math.hypot(x, z);
  if (len > 1) {
    x /= len;
    z /= len;
  }
  if (len === 0) return [0, 0];

  const theta = (Number(camYawDeg) || 0) * (Math.PI / 180);
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const xw = x * c + z * s;
  const zw = -x * s + z * c;
  return [xw, zw];
}
