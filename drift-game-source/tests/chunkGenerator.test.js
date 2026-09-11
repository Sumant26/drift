import { describe, it, expect } from "vitest";
import { generateChunkData, DEFAULT_CHUNK_CONFIG } from "../src/core/chunkGenerator.js";
import { ValidationError } from "../src/utils/errors.js";

describe("generateChunkData", () => {
  it("is deterministic for the same index and config", () => {
    const a = generateChunkData(5);
    const b = generateChunkData(5);
    expect(a).toEqual(b);
  });
  it("produces different crystal layouts for different indices", () => {
    const a = generateChunkData(1);
    const b = generateChunkData(2);
    expect(a.crystals).not.toEqual(b.crystals);
  });
  it("respects chunkLength for zStart/zEnd", () => {
    const data = generateChunkData(3, { ...DEFAULT_CHUNK_CONFIG, chunkLength: 100 });
    expect(data.zStart).toBe(300);
    expect(data.zEnd).toBe(400);
  });
  it("produces at least minCrystals crystals", () => {
    const data = generateChunkData(0, { ...DEFAULT_CHUNK_CONFIG, minCrystals: 5, maxCrystalBonus: 0 });
    expect(data.crystals.length).toBe(5);
  });
  it("places a planet only on multiples of planetEvery", () => {
    const nonMultiple = generateChunkData(1, { ...DEFAULT_CHUNK_CONFIG, planetEvery: 6 });
    expect(nonMultiple.planet).toBeNull();
  });
  it("every crystal has a valid geometryVariant index (0-2)", () => {
    const data = generateChunkData(10);
    for (const c of data.crystals) {
      expect(c.geometryVariant).toBeGreaterThanOrEqual(0);
      expect(c.geometryVariant).toBeLessThanOrEqual(2);
    }
  });
  it("throws on non-integer index", () => {
    expect(() => generateChunkData(1.5)).toThrow(ValidationError);
  });
  it("throws on invalid config", () => {
    expect(() => generateChunkData(0, null)).toThrow(ValidationError);
    expect(() => generateChunkData(0, { chunkLength: -10 })).toThrow(ValidationError);
  });
  it("accepts negative indices (behind the starting point)", () => {
    expect(() => generateChunkData(-3)).not.toThrow();
  });
});
