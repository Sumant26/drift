import { describe, it, expect } from "vitest";
import { chunkIndexForZ, getChunksToLoad, getChunksToUnload, DEFAULT_CHUNK_WINDOW } from "../src/core/chunkManager.js";
import { ValidationError } from "../src/utils/errors.js";

describe("chunkIndexForZ", () => {
  it("computes the correct floor index", () => {
    expect(chunkIndexForZ(0, 100)).toBe(0);
    expect(chunkIndexForZ(99, 100)).toBe(0);
    expect(chunkIndexForZ(100, 100)).toBe(1);
    expect(chunkIndexForZ(-1, 100)).toBe(-1);
  });
  it("throws on non-positive chunkLength", () => {
    expect(() => chunkIndexForZ(0, 0)).toThrow(ValidationError);
    expect(() => chunkIndexForZ(0, -5)).toThrow(ValidationError);
  });
  it("throws on non-finite z", () => {
    expect(() => chunkIndexForZ(NaN, 100)).toThrow(ValidationError);
  });
});

describe("getChunksToLoad", () => {
  it("returns the full window when nothing is loaded", () => {
    const result = getChunksToLoad(0, new Set());
    // window: current-1 .. current+ahead(4) inclusive = 6 entries
    expect(result).toEqual([-1, 0, 1, 2, 3, 4]);
  });
  it("excludes already-loaded indices", () => {
    const loaded = new Set([0, 1, 2]);
    const result = getChunksToLoad(0, loaded);
    expect(result).toEqual([-1, 3, 4]);
  });
  it("returns an empty array when the whole window is loaded", () => {
    const loaded = new Set([-1, 0, 1, 2, 3, 4]);
    expect(getChunksToLoad(0, loaded)).toEqual([]);
  });
  it("respects a custom window size", () => {
    const result = getChunksToLoad(10, new Set(), { behind: 0, ahead: 1 });
    expect(result).toEqual([9, 10, 11]);
  });
  it("throws when currentIndex is not an integer", () => {
    expect(() => getChunksToLoad(1.5, new Set())).toThrow(ValidationError);
  });
  it("throws when loadedIndices is not a Set", () => {
    expect(() => getChunksToLoad(0, [])).toThrow(ValidationError);
  });
});

describe("getChunksToUnload", () => {
  it("unloads indices beyond the behind window", () => {
    const loaded = new Set([0, 1, 2, 3, 4, 5]);
    const result = getChunksToUnload(5, loaded, { behind: 2, ahead: 4 });
    expect(result.sort()).toEqual([0, 1, 2]);
  });
  it("keeps indices within the behind window", () => {
    const loaded = new Set([4, 5]);
    const result = getChunksToUnload(5, loaded, DEFAULT_CHUNK_WINDOW);
    expect(result).toEqual([]);
  });
  it("returns an empty array for an empty loaded set", () => {
    expect(getChunksToUnload(5, new Set())).toEqual([]);
  });
  it("throws when currentIndex is not an integer", () => {
    expect(() => getChunksToUnload(1.5, new Set())).toThrow(ValidationError);
  });
  it("throws when loadedIndices is not a Set", () => {
    expect(() => getChunksToUnload(0, [1, 2])).toThrow(ValidationError);
  });
});
