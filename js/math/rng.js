/**
 * Random Number Generator matching IRng interface from simulation engine.
 * Supports standard uniform randoms and seeded Mulberry32 PRNG.
 */
export class Rng {
  constructor(seed = null) {
    if (seed !== null) {
      this._seed = seed >>> 0;
      this._useSeed = true;
    } else {
      this._useSeed = false;
    }
  }

  // Returns integer in [0, max)
  next(max) {
    if (max <= 0) return 0;
    if (this._useSeed) {
      let t = (this._seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      const val = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      return Math.floor(val * max);
    }
    return Math.floor(Math.random() * max);
  }

  // Returns float in [0, 1)
  nextDouble() {
    if (this._useSeed) {
      let t = (this._seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    return Math.random();
  }
}
