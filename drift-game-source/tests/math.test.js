import { describe, it, expect } from "vitest";
import { clamp, lerp, smoothTowards, mulberry32 } from "../src/core/math.js";
import { ValidationError } from "../src/utils/errors.js";

describe("clamp", () => {
  it("returns the value when inside range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it("clamps to min when below range", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });
  it("clamps to max when above range", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
  it("handles min === max", () => {
    expect(clamp(99, 4, 4)).toBe(4);
  });
  it("throws when min > max", () => {
    expect(() => clamp(1, 10, 0)).toThrow(ValidationError);
  });
  it("throws on non-finite input", () => {
    expect(() => clamp(NaN, 0, 10)).toThrow(ValidationError);
    expect(() => clamp(1, -Infinity, 10)).toThrow(ValidationError);
  });
});

describe("lerp", () => {
  it("interpolates at t=0 and t=1", () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
  });
  it("interpolates at t=0.5", () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
  it("extrapolates beyond [0,1]", () => {
    expect(lerp(0, 10, 2)).toBe(20);
  });
  it("throws on non-numeric input", () => {
    expect(() => lerp("a", 1, 0.5)).toThrow(ValidationError);
  });
});

describe("smoothTowards", () => {
  it("moves current toward target", () => {
    const result = smoothTowards(0, 10, 0.01, 1);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(10);
  });
  it("returns current unchanged when delta is 0", () => {
    expect(smoothTowards(3, 10, 0.01, 0)).toBe(3);
  });
  it("converges closer to target as delta grows", () => {
    const near = smoothTowards(0, 10, 0.01, 0.1);
    const far = smoothTowards(0, 10, 0.01, 10);
    expect(far).toBeGreaterThan(near);
  });
  it("throws when rate is out of (0,1)", () => {
    expect(() => smoothTowards(0, 10, 0, 1)).toThrow(ValidationError);
    expect(() => smoothTowards(0, 10, 1, 1)).toThrow(ValidationError);
  });
  it("throws when delta is negative", () => {
    expect(() => smoothTowards(0, 10, 0.01, -1)).toThrow(ValidationError);
  });
});

describe("mulberry32", () => {
  it("produces values in [0, 1)", () => {
    const rand = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it("is deterministic for the same seed", () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });
  it("produces different sequences for different seeds", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });
  it("throws on non-finite seed", () => {
    expect(() => mulberry32(NaN)).toThrow(ValidationError);
  });
});
