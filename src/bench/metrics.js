/**
 * Compute Contract v1.3 FPS metrics from frame dt samples (ms).
 * @param {number[]} dts frame durations in milliseconds (measure window only)
 */
export function computeFpsMetrics(dts) {
  const N = dts.length;
  if (N <= 0) {
    return { frames: 0, avg_fps: 0, p1_low_fps: 0, frame_ms_p95: 0 };
  }
  const sum = dts.reduce((a, b) => a + b, 0);
  const avg_fps = (1000 * N) / sum;

  const sortedDesc = [...dts].sort((a, b) => b - a);
  const k = Math.max(1, Math.ceil(0.01 * N));
  const worst = sortedDesc.slice(0, k);
  const worstAvg = worst.reduce((a, b) => a + b, 0) / worst.length;
  const p1_low_fps = 1000 / worstAvg;

  const sortedAsc = [...dts].sort((a, b) => a - b);
  const p95Index = Math.min(N - 1, Math.max(0, Math.ceil(0.95 * N) - 1));
  const frame_ms_p95 = sortedAsc[p95Index];

  return {
    frames: N,
    avg_fps: round1(avg_fps),
    p1_low_fps: round1(p1_low_fps),
    frame_ms_p95: round1(frame_ms_p95),
  };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
