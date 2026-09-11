import { ValidationError } from "../utils/errors.js";

function assertFiniteNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ValidationError(`${name} must be a finite number, got ${value}`);
  }
}

/** Clamp a value into [min, max]. Throws if min > max or inputs aren't finite. */
export function clamp(value, min, max) {
  assertFiniteNumber(value, "value");
  assertFiniteNumber(min, "min");
  assertFiniteNumber(max, "max");
  if (min > max) {
    throw new ValidationError(`min (${min}) cannot be greater than max (${max})`);
  }
  return Math.min(Math.max(value, min), max);
}

/** Linear interpolation between a and b by t (t is not clamped, matching THREE.MathUtils.lerp). */
export function lerp(a, b, t) {
  assertFiniteNumber(a, "a");
  assertFiniteNumber(b, "b");
  assertFiniteNumber(t, "t");
  return a + (b - a) * t;
}

/**
 * Frame-rate independent smoothing: moves `current` toward `target` by a
 * fraction that depends on elapsed time (delta) and a smoothing rate.
 * rate should be in (0, 1) — smaller = snappier, closer to 1 = slower.
 */
export function smoothTowards(current, target, rate, delta) {
  assertFiniteNumber(current, "current");
  assertFiniteNumber(target, "target");
  assertFiniteNumber(rate, "rate");
  assertFiniteNumber(delta, "delta");
  if (rate <= 0 || rate >= 1) {
    throw new ValidationError(`rate must be between 0 and 1 (exclusive), got ${rate}`);
  }
  if (delta < 0) {
    throw new ValidationError(`delta cannot be negative, got ${delta}`);
  }
  const factor = 1 - Math.pow(rate, delta);
  return lerp(current, target, factor);
}

/**
 * Deterministic seeded pseudo-random number generator (mulberry32).
 * Returns a function that yields floats in [0, 1) on each call.
 */
export function mulberry32(seed) {
  assertFiniteNumber(seed, "seed");
  let state = seed | 0;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
