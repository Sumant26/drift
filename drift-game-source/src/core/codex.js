import { ValidationError } from "../utils/errors.js";

const STORAGE_KEY = "drift_traveler_codex_v1";

export const DEFAULT_CODEX_DATA = Object.freeze({
  totalDistance: 0,
  maxStreak: 0,
  ringsCollected: 0,
  stargatesPassed: 0,
  hyperspaceJumps: 0,
  discoveredSectors: ["opal-nebula"],
  discoveredAnomalies: [],
  firstPlayed: Date.now(),
  lastPlayed: Date.now(),
});

/**
 * Loads traveler logbook data from storage (or fallback memory object).
 */
export function loadCodex(storage = (typeof localStorage !== "undefined" ? localStorage : null)) {
  if (!storage) return { ...DEFAULT_CODEX_DATA };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CODEX_DATA };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CODEX_DATA,
      ...parsed,
      discoveredSectors: Array.isArray(parsed.discoveredSectors) ? parsed.discoveredSectors : ["opal-nebula"],
      discoveredAnomalies: Array.isArray(parsed.discoveredAnomalies) ? parsed.discoveredAnomalies : [],
    };
  } catch (err) {
    console.warn("Could not load codex from storage:", err);
    return { ...DEFAULT_CODEX_DATA };
  }
}

/**
 * Saves traveler logbook data to storage.
 */
export function saveCodex(data, storage = (typeof localStorage !== "undefined" ? localStorage : null)) {
  if (!data || typeof data !== "object") {
    throw new ValidationError("data must be an object");
  }
  if (!storage) return;
  try {
    const toSave = {
      ...data,
      lastPlayed: Date.now(),
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (err) {
    console.warn("Could not save codex to storage:", err);
  }
}

/**
 * Pure helper to record a new discovered sector if not already recorded.
 */
export function recordSectorDiscovery(codex, sectorId) {
  if (!codex || typeof codex !== "object") throw new ValidationError("codex must be an object");
  if (typeof sectorId !== "string") throw new ValidationError("sectorId must be a string");

  if (!codex.discoveredSectors.includes(sectorId)) {
    return {
      ...codex,
      discoveredSectors: [...codex.discoveredSectors, sectorId],
    };
  }
  return codex;
}

/**
 * Pure helper to record a discovered celestial anomaly (e.g. "black-hole", "cosmic-whale", "stargate").
 */
export function recordAnomalyDiscovery(codex, anomalyId) {
  if (!codex || typeof codex !== "object") throw new ValidationError("codex must be an object");
  if (typeof anomalyId !== "string") throw new ValidationError("anomalyId must be a string");

  if (!codex.discoveredAnomalies.includes(anomalyId)) {
    return {
      ...codex,
      discoveredAnomalies: [...codex.discoveredAnomalies, anomalyId],
    };
  }
  return codex;
}
