import { ValidationError } from "../utils/errors.js";

function assertFiniteNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ValidationError(`${name} must be a finite number, got ${value}`);
  }
}

/** Horizontal (X) centerline of the flight corridor at distance z. */
export function pathX(z) {
  assertFiniteNumber(z, "z");
  return Math.sin(z * 0.0075) * 42 + Math.sin(z * 0.021 + 1.4) * 16;
}

/** Vertical (Y) centerline of the flight corridor at distance z. */
export function pathY(z) {
  assertFiniteNumber(z, "z");
  return Math.sin(z * 0.0058 + 2.1) * 22 + Math.cos(z * 0.014) * 11;
}

/**
 * Estimates the corridor's local direction at z by sampling a short distance
 * ahead. Used to bank/pitch the ship naturally with the curve of the path.
 */
export function pathDerivative(z, lookAhead = 6) {
  assertFiniteNumber(z, "z");
  assertFiniteNumber(lookAhead, "lookAhead");
  if (lookAhead <= 0) {
    throw new ValidationError(`lookAhead must be positive, got ${lookAhead}`);
  }
  const dx = pathX(z + lookAhead) - pathX(z);
  const dy = pathY(z + lookAhead) - pathY(z);
  return { dx, dy };
}
