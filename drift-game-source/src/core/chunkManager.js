import { ValidationError } from "../utils/errors.js";

export const DEFAULT_CHUNK_WINDOW = Object.freeze({
  behind: 2,   // how many chunks behind current may remain loaded before eviction
  ahead: 4,    // how many chunks ahead of current should be pre-loaded
});

function assertFiniteNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ValidationError(`${name} must be a finite number, got ${value}`);
  }
}

/** Returns the chunk index that a given z distance falls into. */
export function chunkIndexForZ(z, chunkLength) {
  assertFiniteNumber(z, "z");
  assertFiniteNumber(chunkLength, "chunkLength");
  if (chunkLength <= 0) {
    throw new ValidationError(`chunkLength must be positive, got ${chunkLength}`);
  }
  return Math.floor(z / chunkLength);
}

/**
 * Given the ship's current chunk index and the set of already-loaded indices,
 * returns the list of new indices that should be generated this frame.
 */
export function getChunksToLoad(currentIndex, loadedIndices, window = DEFAULT_CHUNK_WINDOW) {
  if (!Number.isInteger(currentIndex)) {
    throw new ValidationError(`currentIndex must be an integer, got ${currentIndex}`);
  }
  if (!(loadedIndices instanceof Set)) {
    throw new ValidationError("loadedIndices must be a Set");
  }
  const toLoad = [];
  for (let i = currentIndex - 1; i <= currentIndex + window.ahead; i++) {
    if (!loadedIndices.has(i)) toLoad.push(i);
  }
  return toLoad;
}

/**
 * Given the ship's current chunk index and the set of loaded indices,
 * returns the list of indices that have fallen far enough behind to unload.
 */
export function getChunksToUnload(currentIndex, loadedIndices, window = DEFAULT_CHUNK_WINDOW) {
  if (!Number.isInteger(currentIndex)) {
    throw new ValidationError(`currentIndex must be an integer, got ${currentIndex}`);
  }
  if (!(loadedIndices instanceof Set)) {
    throw new ValidationError("loadedIndices must be a Set");
  }
  const toUnload = [];
  for (const idx of loadedIndices) {
    if (idx < currentIndex - window.behind) toUnload.push(idx);
  }
  return toUnload;
}
