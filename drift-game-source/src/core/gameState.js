import { clamp, lerp, smoothTowards } from "./math.js";
import { pathX, pathY, pathDerivative } from "./path.js";
import { ValidationError } from "../utils/errors.js";

export const DEFAULT_FLIGHT_CONFIG = Object.freeze({
  maxOffset: 26,
  baseSpeed: 30,
  boostSpeed: 62,
  offsetSmoothRate: 0.0008,
  speedSmoothRate: 0.02,
  bankSmoothRate: 0.001,
});

/** Returns a fresh, valid initial game state. */
export function createInitialState(config = DEFAULT_FLIGHT_CONFIG) {
  const initZ = 0;
  const basePathX = pathX(initZ);
  const basePathY = pathY(initZ);
  return {
    shipZ: initZ,
    offsetX: 0,
    offsetY: 0,
    speed: config.baseSpeed,
    rotation: { x: 0, y: 0, z: 0 },
    position: { x: basePathX, y: basePathY, z: initZ },
    basePosition: { x: basePathX, y: basePathY, z: initZ },
    bob: 0,
    elapsed: 0,
  };
}

function assertValidState(state) {
  if (!state || typeof state !== "object") {
    throw new ValidationError("state must be an object");
  }
  for (const key of ["shipZ", "offsetX", "offsetY", "speed", "elapsed"]) {
    if (typeof state[key] !== "number" || !Number.isFinite(state[key])) {
      throw new ValidationError(`state.${key} must be a finite number`);
    }
  }
}

function assertValidInput(input) {
  if (!input || typeof input !== "object") {
    throw new ValidationError("input must be an object");
  }
  for (const key of ["left", "right", "up", "down", "boost"]) {
    if (typeof input[key] !== "boolean") {
      throw new ValidationError(`input.${key} must be a boolean`);
    }
  }
  if ("drift" in input && typeof input.drift !== "boolean") {
    throw new ValidationError("input.drift must be a boolean");
  }
}

/**
 * Advances the game state by `delta` seconds given the current input flags.
 * Pure function: does not mutate `state`, always returns a new object.
 * This is the single source of truth for flight physics/state transitions.
 */
export function updateFlightState(state, input, delta, config = DEFAULT_FLIGHT_CONFIG) {
  assertValidState(state);
  assertValidInput(input);
  if (typeof delta !== "number" || !Number.isFinite(delta) || delta < 0) {
    throw new ValidationError(`delta must be a non-negative finite number, got ${delta}`);
  }

  const isAutopilot = Boolean(input.autopilot);
  const isDrift = Boolean(input.drift);
  const rawInputX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const rawInputY = (input.up ? 1 : 0) - (input.down ? 1 : 0);

  // In autopilot, automatically center and gently glide
  const inputX = isAutopilot ? (state.offsetX > 0.5 ? -0.3 : state.offsetX < -0.5 ? 0.3 : 0) : rawInputX;
  const inputY = isAutopilot ? (state.offsetY > 0.5 ? -0.3 : state.offsetY < -0.5 ? 0.3 : 0) : rawInputY;

  const currentMaxOffset = isDrift ? config.maxOffset * 1.3 : config.maxOffset;
  const targetOffsetX = isAutopilot ? 0 : inputX * currentMaxOffset;
  const targetOffsetY = isAutopilot ? 0 : inputY * config.maxOffset;

  const offsetRate = isDrift ? config.offsetSmoothRate * 0.45 : config.offsetSmoothRate;

  const offsetX = clamp(
    smoothTowards(state.offsetX, targetOffsetX, offsetRate, delta),
    -currentMaxOffset,
    currentMaxOffset
  );
  const offsetY = clamp(
    smoothTowards(state.offsetY, targetOffsetY, config.offsetSmoothRate, delta),
    -config.maxOffset,
    config.maxOffset
  );

  const targetSpeed = input.boost ? config.boostSpeed : config.baseSpeed;
  const speed = smoothTowards(state.speed, targetSpeed, config.speedSmoothRate, delta);

  const shipZ = state.shipZ + speed * delta;
  const elapsed = state.elapsed + delta;

  // Gentle, harmonic floating bob
  const bob = Math.sin(elapsed * 0.9) * 0.5 + Math.sin(elapsed * 1.7 + 1.2) * 0.25;

  const baseX = pathX(shipZ) + offsetX;
  const baseY = pathY(shipZ) + offsetY;

  const basePosition = {
    x: baseX,
    y: baseY,
    z: shipZ,
  };

  const position = {
    x: baseX,
    y: baseY + bob,
    z: shipZ,
  };

  const { dx, dy } = pathDerivative(shipZ);
  const yawFactor = isDrift ? 0.42 : 0.12;
  const bankFactor = isDrift ? 0.92 : 0.55;

  const rotation = {
    x: lerp(state.rotation.x, inputY * 0.22 - dy * 0.02, 1 - Math.pow(config.bankSmoothRate, delta)),
    y: lerp(state.rotation.y, -inputX * yawFactor, 1 - Math.pow(config.bankSmoothRate, delta)),
    z: lerp(state.rotation.z, -inputX * bankFactor - dx * 0.01, 1 - Math.pow(config.bankSmoothRate, delta)),
  };

  const isDrifting = isDrift && Math.abs(rawInputX) > 0;

  return { shipZ, offsetX, offsetY, speed, rotation, position, basePosition, bob, elapsed, isDrifting };
}
