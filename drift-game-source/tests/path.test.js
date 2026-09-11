import { describe, it, expect } from "vitest";
import { pathX, pathY, pathDerivative } from "../src/core/path.js";
import { ValidationError } from "../src/utils/errors.js";

describe("pathX / pathY", () => {
  it("are deterministic for the same z", () => {
    expect(pathX(123.4)).toBe(pathX(123.4));
    expect(pathY(123.4)).toBe(pathY(123.4));
  });
  it("return finite numbers across a wide range of z", () => {
    for (const z of [0, 1, -1, 1000, -5000, 987654.321]) {
      expect(Number.isFinite(pathX(z))).toBe(true);
      expect(Number.isFinite(pathY(z))).toBe(true);
    }
  });
  it("stay within a bounded corridor (sum of sine amplitudes)", () => {
    for (let z = 0; z < 5000; z += 37) {
      expect(Math.abs(pathX(z))).toBeLessThanOrEqual(42 + 16 + 1e-9);
      expect(Math.abs(pathY(z))).toBeLessThanOrEqual(22 + 11 + 1e-9);
    }
  });
  it("throws on non-finite z", () => {
    expect(() => pathX(NaN)).toThrow(ValidationError);
    expect(() => pathY(Infinity)).toThrow(ValidationError);
  });
});

describe("pathDerivative", () => {
  it("returns zero-ish delta on a flat lookahead of 0-length path (same point)", () => {
    const { dx, dy } = pathDerivative(0, 0.0001);
    expect(Math.abs(dx)).toBeLessThan(0.1);
    expect(Math.abs(dy)).toBeLessThan(0.1);
  });
  it("matches manual difference calculation", () => {
    const z = 200;
    const lookAhead = 6;
    const expectedDx = pathX(z + lookAhead) - pathX(z);
    const expectedDy = pathY(z + lookAhead) - pathY(z);
    const { dx, dy } = pathDerivative(z, lookAhead);
    expect(dx).toBeCloseTo(expectedDx, 10);
    expect(dy).toBeCloseTo(expectedDy, 10);
  });
  it("uses a default lookAhead when not provided", () => {
    const result = pathDerivative(50);
    expect(typeof result.dx).toBe("number");
    expect(typeof result.dy).toBe("number");
  });
  it("throws when lookAhead is not positive", () => {
    expect(() => pathDerivative(0, 0)).toThrow(ValidationError);
    expect(() => pathDerivative(0, -5)).toThrow(ValidationError);
  });
  it("throws on non-finite z", () => {
    expect(() => pathDerivative(NaN)).toThrow(ValidationError);
  });
});
