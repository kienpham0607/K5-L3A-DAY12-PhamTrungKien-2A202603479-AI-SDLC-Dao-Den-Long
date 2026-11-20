/** Deterministic mulberry32 PRNG from integer seed. */
export function createRng(seed) {
  let t = (Number(seed) >>> 0) + 0x6d2b79f5;
  return function next() {
    t |= 0;
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
