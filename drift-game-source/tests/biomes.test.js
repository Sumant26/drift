import { describe, it, expect } from "vitest";
import { BIOMES, getBiomeForZ, SECTOR_LENGTH } from "../src/core/biomes.js";
import { ValidationError } from "../src/utils/errors.js";

describe("biomes", () => {
  it("defines at least 4 diverse biomes", () => {
    expect(BIOMES.length).toBeGreaterThanOrEqual(4);
    for (const b of BIOMES) {
      expect(typeof b.name).toBe("string");
      expect(typeof b.baseHue).toBe("number");
      expect(typeof b.ambientColor).toBe("number");
    }
  });

  it("determines correct initial biome at start (z=0)", () => {
    const res = getBiomeForZ(0);
    expect(res.sectorIndex).toBe(1);
    expect(res.biome.id).toBe(BIOMES[0].id);
    expect(res.progress).toBe(0);
  });

  it("progresses to next biome as Z increases", () => {
    const sector1 = getBiomeForZ(100);
    expect(sector1.sectorIndex).toBe(1);
    expect(sector1.biome.id).toBe(BIOMES[0].id);
    expect(sector1.progress).toBeCloseTo(100 / SECTOR_LENGTH, 4);

    const sector2 = getBiomeForZ(SECTOR_LENGTH + 10);
    expect(sector2.sectorIndex).toBe(2);
    expect(sector2.biome.id).toBe(BIOMES[1].id);
  });

  it("cycles predictably across all biomes without exploding", () => {
    const farZ = SECTOR_LENGTH * (BIOMES.length * 3 + 2);
    const res = getBiomeForZ(farZ);
    expect(res.biome.id).toBe(BIOMES[2].id);
  });

  it("throws ValidationError for non-finite inputs", () => {
    expect(() => getBiomeForZ(NaN)).toThrow(ValidationError);
    expect(() => getBiomeForZ("100")).toThrow(ValidationError);
    expect(() => getBiomeForZ(100, -5)).toThrow(ValidationError);
  });
});
