import { describe, it, expect, beforeEach } from "vitest";
import { loadCodex, saveCodex, recordSectorDiscovery, recordAnomalyDiscovery, DEFAULT_CODEX_DATA } from "../src/core/codex.js";
import { ValidationError } from "../src/utils/errors.js";

describe("codex", () => {
  let mockStorage;

  beforeEach(() => {
    const store = {};
    mockStorage = {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = v; },
      clear: () => { for (const k in store) delete store[k]; },
    };
  });

  it("loads default data when storage is empty", () => {
    const data = loadCodex(mockStorage);
    expect(data.totalDistance).toBe(0);
    expect(data.discoveredSectors).toContain("opal-nebula");
  });

  it("saves and reloads data properly", () => {
    const data = loadCodex(mockStorage);
    data.totalDistance = 1250;
    data.ringsCollected = 15;
    saveCodex(data, mockStorage);

    const reloaded = loadCodex(mockStorage);
    expect(reloaded.totalDistance).toBe(1250);
    expect(reloaded.ringsCollected).toBe(15);
  });

  it("records new sector discoveries without duplicates (pure)", () => {
    let codex = loadCodex(mockStorage);
    codex = recordSectorDiscovery(codex, "solar-expanse");
    expect(codex.discoveredSectors).toContain("solar-expanse");

    const countBefore = codex.discoveredSectors.length;
    codex = recordSectorDiscovery(codex, "solar-expanse");
    expect(codex.discoveredSectors.length).toBe(countBefore);
  });

  it("records new anomaly discoveries without duplicates (pure)", () => {
    let codex = loadCodex(mockStorage);
    codex = recordAnomalyDiscovery(codex, "black-hole");
    expect(codex.discoveredAnomalies).toContain("black-hole");
  });

  it("throws ValidationError for invalid arguments", () => {
    expect(() => saveCodex(null, mockStorage)).toThrow(ValidationError);
    expect(() => recordSectorDiscovery(null, "test")).toThrow(ValidationError);
    expect(() => recordAnomalyDiscovery({}, 123)).toThrow(ValidationError);
  });
});
